-- Checkpoint Academy — Reseñas de mentores (verificadas).
-- Solo reseña quien ha tenido una sesión «hecha» o un ticket respondido con ese mentor,
-- una vez por sesión/ticket y en los 60 días siguientes. Se publica al momento (el
-- servidor tacha datos de contacto antes de guardar); el mentor puede responder una vez
-- (editable) y denunciarla; el admin la oculta o la restaura.
-- Nombre visible: «Nombre I.»; anónimo si el alumno lo pide, es menor o está en modo
-- Familia. La web pública lee SOLO las vistas (nunca student_id).
-- Re-ejecutable.

create table if not exists public.mentor_review (
  id            uuid primary key default gen_random_uuid(),
  mentor_id     uuid not null references public.mentor_profile (profile_id) on delete cascade,
  student_id    uuid not null references public.student_profile (profile_id) on delete cascade,
  booking_id    uuid unique references public.booking (id) on delete set null,
  ticket_id     uuid unique references public.ticket (id) on delete set null,
  source        text not null check (source in ('sesion', 'ticket')),
  modulo_id     uuid references public.modulo (id) on delete set null,
  rating        smallint not null check (rating between 1 and 5),
  comment       text check (char_length(comment) <= 1000),
  author_name   text,          -- «Marta G.» o null (anónimo); se fija al crear
  reply         text check (char_length(reply) <= 1000),
  reply_at      timestamptz,
  status        text not null default 'publicada' check (status in ('publicada', 'oculta')),
  reported_at   timestamptz,
  report_reason text check (char_length(report_reason) <= 300),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists mr_mentor_idx on public.mentor_review (mentor_id, created_at desc);
create index if not exists mr_reported_idx on public.mentor_review (reported_at) where reported_at is not null;

alter table public.mentor_review enable row level security;
-- Lectura: las partes y el admin. Escritura: solo por RPC (servidor) o el admin.
drop policy if exists mr_party_select on public.mentor_review;
create policy mr_party_select on public.mentor_review for select
  using (student_id = auth.uid() or mentor_id = auth.uid() or public.is_admin());
drop policy if exists mr_admin_all on public.mentor_review;
create policy mr_admin_all on public.mentor_review for all
  using (public.is_admin()) with check (public.is_admin());

-- ─────────────────────────── Vistas públicas ───────────────────────────
-- Solo publicadas y de mentores verificados. Sin student_id ni datos de denuncia.
create or replace view public.mentor_review_public
with (security_invoker = false) as
select r.id, r.mentor_id, m.code as modulo_code, r.source, r.rating, r.comment,
       r.author_name, r.reply, r.reply_at, r.created_at
from public.mentor_review r
join public.mentor_profile mp on mp.profile_id = r.mentor_id and mp.status = 'verificado'
left join public.modulo m on m.id = r.modulo_id
where r.status = 'publicada';

create or replace view public.mentor_rating
with (security_invoker = false) as
select mentor_id, count(*)::int as reviews, round(avg(rating)::numeric, 1) as rating
from public.mentor_review_public
group by mentor_id;

grant select on public.mentor_review_public, public.mentor_rating to anon, authenticated;

-- ─────────────────────────── Nuevos avisos ───────────────────────────
alter table public.notification drop constraint if exists notification_kind_check;
alter table public.notification add constraint notification_kind_check check (kind in (
  'mentor_available', 'demand_new', 'booking_requested', 'booking_confirmed',
  'booking_rejected', 'booking_cancelled', 'ticket_reply',
  'slot_offer', 'offer_accepted', 'offer_declined',
  'review_request', 'review_new', 'review_reply'));

-- Avisos de reserva + «¿Qué tal la sesión?» al alumno cuando el mentor la marca hecha.
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
    elsif new.status = 'hecha' then
      perform public.notify(new.student_id, 'review_request', v_p, '/panel/sesiones#resenas');
    end if;
  end if;
  return null;
end;
$$;

-- ─────────────────────────── Helpers ───────────────────────────
-- «Marta García López» → «Marta G.». Vacío → null.
create or replace function public.review_author_name(p_full text)
returns text language sql immutable set search_path = public as $$
  select case
    when coalesce(btrim(p_full), '') = '' then null
    when array_length(regexp_split_to_array(btrim(p_full), '\s+'), 1) = 1 then btrim(p_full)
    else (regexp_split_to_array(btrim(p_full), '\s+'))[1] || ' '
         || upper(left((regexp_split_to_array(btrim(p_full), '\s+'))[2], 1)) || '.'
  end
$$;

-- ─────────────────────────── RPC (solo servidor) ───────────────────────────
-- El alumno reseña una sesión hecha (p_booking) o un ticket respondido (p_ticket).
-- El comentario llega ya filtrado (datos de contacto tachados) desde la acción.
create or replace function public.create_review(
  p_student uuid, p_booking uuid, p_ticket uuid, p_rating int, p_comment text, p_anonymous boolean
) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  v_mentor uuid;
  v_modulo uuid;
  v_at     timestamptz;
  v_source text;
  v_anon   boolean := coalesce(p_anonymous, false);
  v_sp     student_profile;
  v_name   text;
  v_id     uuid;
  v_code   text;
begin
  if (p_booking is null) = (p_ticket is null) then raise exception 'invalid'; end if;
  if p_rating is null or p_rating not between 1 and 5 then raise exception 'invalidRating'; end if;
  if char_length(coalesce(p_comment, '')) > 1000 then raise exception 'invalidText'; end if;

  if p_booking is not null then
    select mentor_id, modulo_id, coalesce(ends_at, starts_at) into v_mentor, v_modulo, v_at
    from booking where id = p_booking and student_id = p_student and status = 'hecha';
    v_source := 'sesion';
  else
    select mentor_id, modulo_id, answered_at into v_mentor, v_modulo, v_at
    from ticket where id = p_ticket and student_id = p_student and mentor_id is not null
      and answered_at is not null and status in ('respondido', 'cerrado');
    v_source := 'ticket';
  end if;
  if v_mentor is null then raise exception 'notEligible'; end if;
  if v_at < now() - interval '60 days' then raise exception 'tooLate'; end if;
  if exists (select 1 from mentor_review
             where (p_booking is not null and booking_id = p_booking)
                or (p_ticket is not null and ticket_id = p_ticket)) then
    raise exception 'alreadyReviewed';
  end if;

  -- Menores y modo Familia: siempre anónimo.
  select * into v_sp from student_profile where profile_id = p_student;
  if v_sp.mode = 'familia' or (v_sp.birthdate is not null and v_sp.birthdate > current_date - interval '18 years') then
    v_anon := true;
  end if;
  if not v_anon then
    select public.review_author_name(full_name) into v_name from profile where id = p_student;
  end if;

  insert into mentor_review (mentor_id, student_id, booking_id, ticket_id, source, modulo_id,
                             rating, comment, author_name)
  values (v_mentor, p_student, p_booking, p_ticket, v_source, v_modulo,
          p_rating, nullif(btrim(coalesce(p_comment, '')), ''), v_name)
  returning id into v_id;

  select code into v_code from modulo where id = v_modulo;
  perform public.notify(v_mentor, 'review_new',
    jsonb_build_object('modulo', v_code, 'rating', p_rating), '/panel/resenas', 'resenas');
  return v_id;
end;
$$;

-- El alumno borra su reseña (RGPD: siempre puede retirarla).
create or replace function public.delete_review(p_student uuid, p_review uuid)
returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  delete from mentor_review where id = p_review and student_id = p_student;
  if not found then raise exception 'notFound'; end if;
end;
$$;

-- El mentor responde (o edita su respuesta). Vacío = quitar la respuesta.
create or replace function public.reply_review(p_mentor uuid, p_review uuid, p_reply text)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare v mentor_review; v_text text := nullif(btrim(coalesce(p_reply, '')), ''); v_code text;
begin
  if char_length(coalesce(v_text, '')) > 1000 then raise exception 'invalidText'; end if;
  select * into v from mentor_review where id = p_review and mentor_id = p_mentor for update;
  if v.id is null then raise exception 'notFound'; end if;
  update mentor_review
  set reply = v_text, reply_at = case when v_text is null then null else now() end, updated_at = now()
  where id = p_review;
  -- Avisar al alumno solo la primera vez que hay respuesta.
  if v_text is not null and v.reply is null then
    select code into v_code from modulo where id = v.modulo_id;
    perform public.notify(v.student_id, 'review_reply', jsonb_build_object('modulo', v_code),
      '/mentores/' || v.mentor_id || '#resenas');
  end if;
end;
$$;

-- El mentor denuncia una reseña (insultos, datos personales, no es su alumno…). Sigue
-- publicada hasta que el admin decida.
create or replace function public.report_review(p_mentor uuid, p_review uuid, p_reason text)
returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if char_length(coalesce(p_reason, '')) > 300 then raise exception 'invalidText'; end if;
  update mentor_review
  set reported_at = now(), report_reason = nullif(btrim(coalesce(p_reason, '')), ''), updated_at = now()
  where id = p_review and mentor_id = p_mentor;
  if not found then raise exception 'notFound'; end if;
end;
$$;

-- Lo que el alumno (auth.uid()) aún puede reseñar: sesiones hechas y tickets
-- respondidos de los últimos 60 días sin reseña.
create or replace function public.my_reviewable()
returns table (source text, ref uuid, mentor_id uuid, mentor_name text, modulo_code text, at timestamptz)
language sql stable security definer set search_path = public as $$
  select 'sesion', b.id, b.mentor_id, p.full_name, m.code, coalesce(b.ends_at, b.starts_at)
  from booking b
  join profile p on p.id = b.mentor_id
  left join modulo m on m.id = b.modulo_id
  where b.student_id = auth.uid() and b.status = 'hecha'
    and coalesce(b.ends_at, b.starts_at) >= now() - interval '60 days'
    and not exists (select 1 from mentor_review r where r.booking_id = b.id)
  union all
  select 'ticket', t.id, t.mentor_id, p.full_name, m.code, t.answered_at
  from ticket t
  join profile p on p.id = t.mentor_id
  left join modulo m on m.id = t.modulo_id
  where t.student_id = auth.uid() and t.mentor_id is not null and t.answered_at is not null
    and t.status in ('respondido', 'cerrado')
    and t.answered_at >= now() - interval '60 days'
    and not exists (select 1 from mentor_review r where r.ticket_id = t.id)
  order by 6 desc
$$;

-- ─────────────────────────── Permisos ───────────────────────────
revoke execute on function public.review_author_name(text) from public, anon, authenticated;
revoke execute on function public.create_review(uuid, uuid, uuid, int, text, boolean) from public, anon, authenticated;
revoke execute on function public.delete_review(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.reply_review(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.report_review(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.create_review(uuid, uuid, uuid, int, text, boolean) to service_role;
grant execute on function public.delete_review(uuid, uuid) to service_role;
grant execute on function public.reply_review(uuid, uuid, text) to service_role;
grant execute on function public.report_review(uuid, uuid, text) to service_role;
revoke execute on function public.my_reviewable() from public, anon;
grant execute on function public.my_reviewable() to authenticated;
revoke execute on function public.trg_booking_notify() from public, anon, authenticated;
