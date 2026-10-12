-- Fase C (avisos): notificaciones en la web, «Avísame cuando haya mentor» (con o sin
-- cuenta) y demanda de módulos para los mentores. RE-EJECUTABLE.
--
-- 1) notification: bandeja por usuario (campana del header, Realtime). Solo la lee su
--    dueño; se escribe SOLO desde funciones del servidor (triggers / SECURITY DEFINER).
-- 2) module_alert: un alumno (con cuenta) o un email (sin cuenta, con consentimiento)
--    pide aviso para un módulo. Cuando aparece un mentor verificado que encaja (se
--    verifica, añade el módulo o abre franjas que coinciden) → aviso al alumno. Al crear
--    la alerta → aviso a los mentores del módulo («demanda»), agrupado por módulo.
--    Los avisos por email se guardan y se enviarán cuando haya proveedor (fase E).
-- 3) Avisos de reservas y tickets (deuda «sin notificaciones»).
-- 4) Demanda: perfil anónimo para el mentor y cifras agregadas para la web pública.

-- ───────────────────────────── 1) notification ─────────────────────────────
create table if not exists public.notification (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profile(id) on delete cascade,
  kind        text not null check (kind in (
                'mentor_available', 'demand_new', 'booking_requested', 'booking_confirmed',
                'booking_rejected', 'booking_cancelled', 'ticket_reply')),
  payload     jsonb not null default '{}'::jsonb,
  link        text check (link is null or link like '/%'),
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists notification_user_idx on public.notification (user_id, created_at desc);

alter table public.notification enable row level security;
drop policy if exists notif_own_select on public.notification;
create policy notif_own_select on public.notification for select using (user_id = auth.uid());

do $$ begin
  alter publication supabase_realtime add table public.notification;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- Inserta un aviso. Con p_group, si ya hay uno SIN LEER del mismo tipo y grupo en las
-- últimas 12 h, se actualiza (n + 1) en vez de crear otro: no saturar a nadie.
create or replace function public.notify(
  p_user uuid, p_kind text, p_payload jsonb, p_link text, p_group text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if p_user is null then return; end if;
  if p_group is not null then
    select id into v_id from notification
    where user_id = p_user and kind = p_kind and read_at is null
      and payload ->> 'group' = p_group and created_at > now() - interval '12 hours'
    order by created_at desc limit 1;
    if v_id is not null then
      update notification
         set payload = payload || p_payload
                       || jsonb_build_object('n', coalesce((payload ->> 'n')::int, 1) + 1, 'group', p_group),
             created_at = now()
       where id = v_id;
      return;
    end if;
  end if;
  insert into notification (user_id, kind, payload, link)
  values (p_user, p_kind,
          p_payload || case when p_group is null then '{}'::jsonb
                            else jsonb_build_object('n', 1, 'group', p_group) end,
          p_link);
end;
$$;

-- Marcar como leídos (todos o los indicados). Solo los propios.
create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns void
language sql volatile security definer set search_path = public as $$
  update notification set read_at = now()
  where user_id = auth.uid() and read_at is null and (p_ids is null or id = any (p_ids));
$$;

-- ───────────────────────────── 2) module_alert ─────────────────────────────
create table if not exists public.module_alert (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid references public.profile(id) on delete cascade,
  email               text,
  modulo_id           uuid not null references public.modulo(id) on delete cascade,
  language            text check (language in ('es', 'ca', 'en')),
  fit_schedule        boolean not null default false,
  status              text not null default 'open' check (status in ('open', 'notified', 'closed')),
  locale              text not null default 'es' check (locale in ('es', 'ca')),
  consent_at          timestamptz,
  notified_mentor_id  uuid references public.profile(id) on delete set null,
  notified_at         timestamptz,
  email_sent_at       timestamptz, -- fase E (proveedor de email)
  created_at          timestamptz not null default now(),
  constraint module_alert_owner check ((student_id is null) <> (email is null)),
  constraint module_alert_consent check (email is null or (consent_at is not null and not fit_schedule)),
  constraint module_alert_email check (email is null or (char_length(email) <= 120 and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$'))
);
create unique index if not exists module_alert_student_open
  on public.module_alert (student_id, modulo_id) where status = 'open' and student_id is not null;
create unique index if not exists module_alert_email_open
  on public.module_alert (lower(email), modulo_id) where status = 'open' and email is not null;
create index if not exists module_alert_modulo_idx on public.module_alert (modulo_id) where status = 'open';

alter table public.module_alert enable row level security;
drop policy if exists ma_own_select on public.module_alert;
create policy ma_own_select on public.module_alert for select
  using (student_id = auth.uid() or public.is_admin());

-- ¿Este mentor cubre esta alerta? Verificado, imparte el módulo, idioma pedido y, si el
-- alumno lo pidió, horas en común con su disponibilidad.
create or replace function public.alert_matches(p_alert public.module_alert, p_mentor uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from mentor_profile mp
    join mentor_modulo mm on mm.mentor_id = mp.profile_id and mm.modulo_id = p_alert.modulo_id
    where mp.profile_id = p_mentor and mp.status = 'verificado'
      and mp.profile_id is distinct from p_alert.student_id
      and (p_alert.language is null or p_alert.language = any (mp.languages))
      and (not p_alert.fit_schedule or public.agenda_overlap(p_alert.student_id, p_mentor) > 0)
  );
$$;

-- Marca la alerta como cubierta por el mentor y avisa al alumno (con cuenta).
create or replace function public.close_alert_with(p_alert public.module_alert, p_mentor uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_code text; v_name text;
begin
  update module_alert set status = 'notified', notified_mentor_id = p_mentor, notified_at = now()
  where id = p_alert.id and status = 'open';
  if not found or p_alert.student_id is null then return; end if;
  select code into v_code from modulo where id = p_alert.modulo_id;
  select full_name into v_name from profile where id = p_mentor;
  perform public.notify(p_alert.student_id, 'mentor_available',
    jsonb_build_object('modulo', v_code, 'mentor', v_name),
    '/panel/sesiones?mentor=' || p_mentor || '&modulo=' || v_code);
end;
$$;

-- Revisa las alertas abiertas de los módulos de un mentor (al verificarse, añadir un
-- módulo o abrir franjas).
create or replace function public.process_alerts_for_mentor(p_mentor uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare a module_alert;
begin
  if not exists (select 1 from mentor_profile where profile_id = p_mentor and status = 'verificado') then
    return;
  end if;
  for a in
    select ma.* from module_alert ma
    join mentor_modulo mm on mm.modulo_id = ma.modulo_id and mm.mentor_id = p_mentor
    where ma.status = 'open'
  loop
    if public.alert_matches(a, p_mentor) then
      perform public.close_alert_with(a, p_mentor);
    end if;
  end loop;
end;
$$;

create or replace function public.trg_alerts_mentor_modulo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.process_alerts_for_mentor(new.mentor_id);
  return null;
end;
$$;
drop trigger if exists mentor_modulo_alerts on public.mentor_modulo;
create trigger mentor_modulo_alerts after insert on public.mentor_modulo
  for each row execute function public.trg_alerts_mentor_modulo();

create or replace function public.trg_alerts_mentor_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'verificado' and old.status is distinct from 'verificado' then
    perform public.process_alerts_for_mentor(new.profile_id);
  end if;
  return null;
end;
$$;
drop trigger if exists mentor_profile_alerts on public.mentor_profile;
create trigger mentor_profile_alerts after update of status on public.mentor_profile
  for each row execute function public.trg_alerts_mentor_status();

create or replace function public.trg_alerts_availability()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Solo importa a alertas «que encaje con mi horario»; process_alerts_for_mentor
  -- ignora a quien no sea mentor verificado.
  perform public.process_alerts_for_mentor(new.profile_id);
  return null;
end;
$$;
drop trigger if exists availability_alerts on public.availability;
create trigger availability_alerts after insert on public.availability
  for each row execute function public.trg_alerts_availability();

-- Al crear una alerta: si ya hay un mentor que encaja, se cubre al momento; si no, se
-- avisa a los mentores verificados del módulo (agrupado por módulo).
create or replace function public.trg_alert_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_mentor uuid; v_code text; m record;
begin
  select mp.profile_id into v_mentor
  from mentor_profile mp
  join mentor_modulo mm on mm.mentor_id = mp.profile_id and mm.modulo_id = new.modulo_id
  where mp.status = 'verificado' and public.alert_matches(new, mp.profile_id)
  order by case when new.student_id is null then 0 else public.agenda_overlap(new.student_id, mp.profile_id) end desc
  limit 1;
  if v_mentor is not null then
    perform public.close_alert_with(new, v_mentor);
    return null;
  end if;

  select code into v_code from modulo where id = new.modulo_id;
  for m in
    select mp.profile_id from mentor_profile mp
    join mentor_modulo mm on mm.mentor_id = mp.profile_id and mm.modulo_id = new.modulo_id
    where mp.status = 'verificado' and mp.profile_id is distinct from new.student_id
  loop
    perform public.notify(m.profile_id, 'demand_new', jsonb_build_object('modulo', v_code),
                          '/panel/demanda', 'demanda:' || v_code);
  end loop;
  return null;
end;
$$;
drop trigger if exists module_alert_created on public.module_alert;
create trigger module_alert_created after insert on public.module_alert
  for each row execute function public.trg_alert_created();

-- Alumno con cuenta: pedir aviso para un módulo. Devuelve el id (o el de la ya abierta).
create or replace function public.create_module_alert(p_modulo_code text, p_language text, p_fit boolean)
returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_mod uuid; v_id uuid; v_locale text;
begin
  if v_me is null or not exists (select 1 from student_profile where profile_id = v_me) then
    raise exception 'noProfile';
  end if;
  select id into v_mod from modulo where code = p_modulo_code;
  if v_mod is null then raise exception 'moduloNotFound'; end if;
  if (select count(*) from module_alert where student_id = v_me and status = 'open') >= 20 then
    raise exception 'tooMany';
  end if;
  select id into v_id from module_alert where student_id = v_me and modulo_id = v_mod and status = 'open';
  if v_id is not null then return v_id; end if;
  select case when locale = 'ca' then 'ca' else 'es' end into v_locale from profile where id = v_me;
  insert into module_alert (student_id, modulo_id, language, fit_schedule, locale)
  values (v_me, v_mod, case when p_language in ('es', 'ca', 'en') then p_language end,
          coalesce(p_fit, false), v_locale)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.cancel_module_alert(p_alert uuid)
returns void
language sql volatile security definer set search_path = public as $$
  update module_alert set status = 'closed'
  where id = p_alert and student_id = auth.uid() and status = 'open';
$$;

-- ─────────────────────── 3) Avisos de reservas y tickets ───────────────────────
create or replace function public.trg_booking_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_code text; v_p jsonb;
begin
  select code into v_code from modulo where id = new.modulo_id;
  v_p := jsonb_build_object('modulo', v_code, 'starts_at', new.starts_at, 'kind', new.product_kind);
  if tg_op = 'INSERT' then
    if new.status = 'solicitada' then
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
drop trigger if exists booking_notify on public.booking;
create trigger booking_notify after insert or update of status on public.booking
  for each row execute function public.trg_booking_notify();

create or replace function public.trg_ticket_message_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare t ticket; v_to uuid; v_code text;
begin
  select * into t from ticket where id = new.ticket_id;
  if t.id is null then return null; end if;
  if new.author_id = t.mentor_id then v_to := t.student_id;
  elsif new.author_id = t.student_id then v_to := t.mentor_id;
  end if;
  select code into v_code from modulo where id = t.modulo_id;
  perform public.notify(v_to, 'ticket_reply', jsonb_build_object('modulo', v_code, 'subject', left(t.subject, 80)),
                        '/panel/tickets/' || t.id, 'ticket:' || t.id);
  return null;
end;
$$;
drop trigger if exists ticket_message_notify on public.ticket_message;
create trigger ticket_message_notify after insert on public.ticket_message
  for each row execute function public.trg_ticket_message_notify();

-- ─────────────────────────────── 4) Demanda ───────────────────────────────
-- Para el mentor (auth.uid()): por cada módulo que imparte, alumnos esperando mentor.
-- Perfil ANÓNIMO: sin nombre ni contacto; solo fecha de examen, franjas (día + mañana/
-- tarde/noche) y si coincide con su agenda. Los avisos por email solo cuentan.
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

-- Web pública: módulos con alumnos esperando mentor (solo cifras agregadas).
create or replace function public.public_demand()
returns table (modulo_code text, modulo_name text, waiting int)
language sql stable security definer set search_path = public as $$
  select m.code, m.name, count(*)::int
  from module_alert ma join modulo m on m.id = ma.modulo_id
  where ma.status = 'open'
  group by m.code, m.name
  order by count(*) desc, m.code
  limit 30;
$$;

-- ─────────────────────────────── Permisos ───────────────────────────────
revoke execute on function public.notify(uuid, text, jsonb, text, text) from public, anon, authenticated;
revoke execute on function public.alert_matches(public.module_alert, uuid) from public, anon, authenticated;
revoke execute on function public.close_alert_with(public.module_alert, uuid) from public, anon, authenticated;
revoke execute on function public.process_alerts_for_mentor(uuid) from public, anon, authenticated;
revoke execute on function public.trg_alerts_mentor_modulo() from public, anon, authenticated;
revoke execute on function public.trg_alerts_mentor_status() from public, anon, authenticated;
revoke execute on function public.trg_alerts_availability() from public, anon, authenticated;
revoke execute on function public.trg_alert_created() from public, anon, authenticated;
revoke execute on function public.trg_booking_notify() from public, anon, authenticated;
revoke execute on function public.trg_ticket_message_notify() from public, anon, authenticated;
grant execute on function public.notify(uuid, text, jsonb, text, text) to service_role;

revoke execute on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
revoke execute on function public.create_module_alert(text, text, boolean) from public, anon;
grant execute on function public.create_module_alert(text, text, boolean) to authenticated;
revoke execute on function public.cancel_module_alert(uuid) from public, anon;
grant execute on function public.cancel_module_alert(uuid) to authenticated;
revoke execute on function public.my_module_demand() from public, anon;
grant execute on function public.my_module_demand() to authenticated;
revoke execute on function public.public_demand() from public;
grant execute on function public.public_demand() to anon, authenticated, service_role;
