-- Fase D (ofertas): el mentor ofrece un hueco de SU agenda a un alumno que espera mentor
-- (alerta abierta con cuenta). El alumno no se identifica: el mentor solo ve la referencia
-- de la alerta y el perfil anónimo. Si el alumno acepta, se reserva y se cobra con la RPC
-- de siempre (create_booking) y queda CONFIRMADA al momento (el hueco lo propuso el
-- mentor). Caduca a las 48 h o 3 h antes del hueco. RE-EJECUTABLE.

create table if not exists public.slot_offer (
  id            uuid primary key default gen_random_uuid(),
  alert_id      uuid not null references public.module_alert(id) on delete cascade,
  mentor_id     uuid not null references public.profile(id) on delete cascade,
  student_id    uuid not null references public.profile(id) on delete cascade,
  modulo_id     uuid not null references public.modulo(id) on delete cascade,
  product_kind  product_kind not null check (product_kind in ('sesion_1a1', 'sesion_flash')),
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  credits       int not null,
  note          text check (note is null or char_length(note) <= 500),
  status        text not null default 'pendiente'
                check (status in ('pendiente', 'aceptada', 'rechazada', 'retirada')),
  expires_at    timestamptz not null,
  booking_id    uuid references public.booking(id) on delete set null,
  created_at    timestamptz not null default now(),
  responded_at  timestamptz
);
create index if not exists slot_offer_student_idx on public.slot_offer (student_id, status);
create index if not exists slot_offer_mentor_idx on public.slot_offer (mentor_id, status);
create unique index if not exists slot_offer_one_pending
  on public.slot_offer (alert_id, mentor_id) where status = 'pendiente';

alter table public.slot_offer enable row level security;
drop policy if exists so_party_select on public.slot_offer;
create policy so_party_select on public.slot_offer for select
  using (mentor_id = auth.uid() or student_id = auth.uid() or public.is_admin());

-- Nuevos tipos de aviso.
alter table public.notification drop constraint if exists notification_kind_check;
alter table public.notification add constraint notification_kind_check check (kind in (
  'mentor_available', 'demand_new', 'booking_requested', 'booking_confirmed',
  'booking_rejected', 'booking_cancelled', 'ticket_reply',
  'slot_offer', 'offer_accepted', 'offer_declined'));

-- Reservas que nacen de una oferta aceptada: no avisar al mentor de «nueva solicitud»
-- (ya recibe «oferta aceptada»). Marca local a la transacción.
create or replace function public.trg_booking_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_code text; v_p jsonb;
begin
  select code into v_code from modulo where id = new.modulo_id;
  v_p := jsonb_build_object('modulo', v_code, 'starts_at', new.starts_at, 'kind', new.product_kind);
  if tg_op = 'INSERT' then
    if new.status = 'solicitada' and coalesce(current_setting('app.from_offer', true), '') <> '1' then
      perform public.notify(new.mentor_id, 'booking_requested', v_p, '/panel/sesiones');
    end if;
  elsif new.status is distinct from old.status then
    if new.status = 'confirmada' then
      perform public.notify(new.student_id, 'booking_confirmed', v_p, '/panel/sesiones');
    elsif new.status = 'rechazada' then
      perform public.notify(new.student_id, 'booking_rejected', v_p, '/panel/sesiones');
    elsif new.status = 'cancelada' then
      perform public.notify(
        case when new.cancelled_by = new.student_id then new.mentor_id else new.student_id end,
        'booking_cancelled', v_p, '/panel/sesiones');
    end if;
  end if;
  return null;
end;
$$;

-- El mentor (auth.uid()) ofrece un hueco libre de su agenda a una alerta abierta.
create or replace function public.offer_slot(
  p_alert uuid, p_kind product_kind, p_starts_local timestamp, p_note text
) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  v_me    uuid := auth.uid();
  a       module_alert;
  v_start timestamptz;
  v_end   timestamptz;
  v_level mentor_level;
  v_price int;
  v_id    uuid;
  v_code  text;
  v_name  text;
begin
  if p_kind not in ('sesion_1a1', 'sesion_flash') then raise exception 'invalidKind'; end if;
  select * into a from module_alert where id = p_alert for update;
  if a.id is null or a.status <> 'open' or a.student_id is null then raise exception 'alertClosed'; end if;
  if not public.is_verified_mentor_of(v_me, a.modulo_id) then raise exception 'notMentor'; end if;
  if char_length(coalesce(p_note, '')) > 500 then raise exception 'invalidText'; end if;
  if (select count(*) from slot_offer where mentor_id = v_me and status = 'pendiente' and expires_at > now()) >= 10 then
    raise exception 'tooMany';
  end if;
  if exists (select 1 from slot_offer where alert_id = p_alert and mentor_id = v_me
             and status = 'pendiente' and expires_at > now()) then
    raise exception 'alreadyOffered';
  end if;
  -- Una oferta caducada que siga «pendiente» no debe bloquear el índice único.
  update slot_offer set status = 'retirada'
  where alert_id = p_alert and mentor_id = v_me and status = 'pendiente' and expires_at <= now();

  v_start := p_starts_local at time zone 'Europe/Madrid';
  v_end := v_start + case when p_kind = 'sesion_1a1' then interval '60 minutes' else interval '25 minutes' end;
  if v_start < now() + interval '3 hours' then raise exception 'tooSoon'; end if;
  if v_start > now() + interval '60 days' then raise exception 'tooFar'; end if;
  if not public.fits_agenda(v_me, v_start, v_end) then raise exception 'outsideAgenda'; end if;
  if exists (select 1 from booking where mentor_id = v_me and status in ('solicitada', 'confirmada')
             and tstzrange(starts_at, ends_at) && tstzrange(v_start, v_end)) then
    raise exception 'slotTaken';
  end if;

  select level into v_level from mentor_profile where profile_id = v_me;
  v_price := public.product_credits(p_kind, v_level);
  if v_price is null then raise exception 'noPrice'; end if;

  insert into slot_offer (alert_id, mentor_id, student_id, modulo_id, product_kind, starts_at, ends_at,
                          credits, note, expires_at)
  values (p_alert, v_me, a.student_id, a.modulo_id, p_kind, v_start, v_end, v_price,
          nullif(trim(coalesce(p_note, '')), ''),
          least(now() + interval '48 hours', v_start - interval '3 hours'))
  returning id into v_id;

  select code into v_code from modulo where id = a.modulo_id;
  select full_name into v_name from profile where id = v_me;
  perform public.notify(a.student_id, 'slot_offer',
    jsonb_build_object('modulo', v_code, 'mentor', v_name, 'starts_at', v_start, 'kind', p_kind),
    '/panel/sesiones#ofertas');
  return v_id;
end;
$$;

create or replace function public.withdraw_slot_offer(p_offer uuid)
returns void
language sql volatile security definer set search_path = public as $$
  update slot_offer set status = 'retirada', responded_at = now()
  where id = p_offer and mentor_id = auth.uid() and status = 'pendiente';
$$;

-- El alumno acepta (servidor, service role: cobra con create_booking) o rechaza.
create or replace function public.respond_slot_offer(p_student uuid, p_offer uuid, p_accept boolean)
returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  o       slot_offer;
  v_code  text;
  v_bk    uuid;
begin
  select * into o from slot_offer where id = p_offer for update;
  if o.id is null or o.student_id <> p_student then raise exception 'notFound'; end if;
  if o.status <> 'pendiente' then raise exception 'notPending'; end if;
  if o.expires_at <= now() then raise exception 'expired'; end if;
  select code into v_code from modulo where id = o.modulo_id;

  if not p_accept then
    update slot_offer set status = 'rechazada', responded_at = now() where id = p_offer;
    perform public.notify(o.mentor_id, 'offer_declined',
      jsonb_build_object('modulo', v_code, 'starts_at', o.starts_at), '/panel/demanda');
    return null;
  end if;

  perform set_config('app.from_offer', '1', true);
  v_bk := public.create_booking(p_student, o.mentor_id, v_code, o.product_kind,
                                o.starts_at at time zone 'Europe/Madrid', 'Hueco ofrecido por el mentor');
  perform public.respond_booking(o.mentor_id, v_bk, true);
  perform set_config('app.from_offer', '', true);

  update slot_offer set status = 'aceptada', responded_at = now(), booking_id = v_bk where id = p_offer;
  -- Otras ofertas pendientes para la misma alerta quedan retiradas; la alerta, cubierta.
  update slot_offer set status = 'retirada', responded_at = now()
  where alert_id = o.alert_id and id <> p_offer and status = 'pendiente';
  update module_alert set status = 'notified', notified_mentor_id = o.mentor_id, notified_at = now()
  where id = o.alert_id and status = 'open';
  perform public.notify(o.mentor_id, 'offer_accepted',
    jsonb_build_object('modulo', v_code, 'starts_at', o.starts_at), '/panel/sesiones');
  return v_bk;
end;
$$;

-- my_module_demand: igual que en la fase C + `ref` (id de la alerta, sin datos del
-- alumno) para poder ofrecerle un hueco.
create or replace function public.my_module_demand()
returns table (modulo_code text, modulo_name text, waiting int, fits int, profiles jsonb)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare v_me uuid := auth.uid();
begin
  if v_me is null or not exists (select 1 from mentor_profile where profile_id = v_me) then
    raise exception 'notMentor';
  end if;
  return query
  select m.code, m.name,
         count(ma.id)::int,
         count(ma.id) filter (where ma.student_id is not null and public.agenda_overlap(ma.student_id, v_me) > 0)::int,
         coalesce(jsonb_agg(jsonb_build_object(
           'ref', ma.id,
           'exam', (select sm.exam_date from student_modulo sm where sm.student_id = ma.student_id and sm.modulo_id = ma.modulo_id),
           'since', ma.created_at::date,
           'fit_only', ma.fit_schedule,
           'fits', public.agenda_overlap(ma.student_id, v_me) > 0,
           'franjas', (select coalesce(jsonb_agg(distinct jsonb_build_object(
                         'd', a.weekday,
                         'p', case when a.start_time < '14:00' then 'manana'
                                   when a.start_time < '20:00' then 'tarde' else 'noche' end)), '[]'::jsonb)
                       from availability a where a.profile_id = ma.student_id)
         ) order by ma.created_at) filter (where ma.student_id is not null), '[]'::jsonb)
  from mentor_modulo mm
  join modulo m on m.id = mm.modulo_id
  left join module_alert ma on ma.modulo_id = mm.modulo_id and ma.status = 'open'
  where mm.mentor_id = v_me
  group by m.code, m.name
  order by count(ma.id) desc, m.code;
end;
$$;

revoke execute on function public.offer_slot(uuid, product_kind, timestamp, text) from public, anon;
grant execute on function public.offer_slot(uuid, product_kind, timestamp, text) to authenticated;
revoke execute on function public.withdraw_slot_offer(uuid) from public, anon;
grant execute on function public.withdraw_slot_offer(uuid) to authenticated;
revoke execute on function public.respond_slot_offer(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.respond_slot_offer(uuid, uuid, boolean) to service_role;
revoke execute on function public.trg_booking_notify() from public, anon, authenticated;
revoke execute on function public.my_module_demand() from public, anon;
grant execute on function public.my_module_demand() to authenticated;
