-- Tutor247 — Tickets y reservas = consumo de créditos (F2.1).
-- Reglas (CLAUDE.md, docs/modelo-negocio-v1.md §5–6):
--   · Cobro y alta van JUNTOS en una transacción (RPC): nunca un ticket/reserva sin
--     su 'gasto' en el ledger, ni un gasto sin su ticket/reserva. Bloqueo por alumno
--     para que dos peticiones simultáneas no dejen el saldo en negativo.
--   · El precio sale de la BD (`product_price`), nunca del formulario.
--   · Las RPC reciben el id del actor y SOLO las puede ejecutar el service role: el
--     servidor autentica al usuario y las llama (el ledger se escribe solo desde
--     servidor). El cliente solo LEE tickets/reservas/mensajes vía RLS.
--   · Devoluciones = nuevo movimiento 'devolucion' (ledger inmutable). Índices únicos
--     impiden cobrar o devolver dos veces el mismo ticket/reserva.
--   · Atribución al mentor: `mentor_earning` (inmutable) al responder un ticket o
--     completar una sesión. La liquidación (60–70 % según nivel) se calcula después.
-- RE-EJECUTABLE: se puede pegar entera en el SQL Editor aunque una ejecución
-- anterior se quedara a medias.

-- ─────────────────────────────── Tarifas ────────────────────────────────
-- Créditos por producto y nivel de mentor. Fase 1 = extremo bajo de los rangos de
-- los docs (sesiones suben con el nivel; tickets mismo precio para todos).
create table if not exists product_price (
  kind     product_kind not null,
  level    mentor_level not null,
  credits  int not null check (credits >= 0),
  primary key (kind, level)
);
alter table product_price enable row level security;
drop policy if exists pp_read on product_price;
create policy pp_read on product_price for select using (true);
drop policy if exists pp_admin on product_price;
create policy pp_admin on product_price for all
  using (public.is_admin()) with check (public.is_admin());

-- "do nothing": re-ejecutar no pisa precios cambiados después a mano.
insert into product_price (kind, level, credits) values
  ('ticket_normal',  'mentor', 3),  ('ticket_normal',  'pro', 3),  ('ticket_normal',  'experto', 3),
  ('ticket_express', 'mentor', 6),  ('ticket_express', 'pro', 6),  ('ticket_express', 'experto', 6),
  ('sesion_flash',   'mentor', 12), ('sesion_flash',   'pro', 13), ('sesion_flash',   'experto', 15),
  ('sesion_1a1',     'mentor', 25), ('sesion_1a1',     'pro', 30), ('sesion_1a1',     'experto', 35)
on conflict (kind, level) do nothing;

create or replace function public.product_credits(p_kind product_kind, p_level mentor_level)
returns int
language plpgsql stable security definer set search_path = public as $$
declare v int;
begin
  select credits into v from product_price where kind = p_kind and level = p_level;
  if v is null then
    raise exception 'noPrice';
  end if;
  return v;
end;
$$;

-- ─────────────────────────────── ticket ─────────────────────────────────
alter table ticket add column if not exists credits     int;
alter table ticket add column if not exists due_at      timestamptz;  -- SLA (2 h / 24 h)
alter table ticket add column if not exists answered_at timestamptz;  -- 1.ª respuesta del mentor
alter table ticket add column if not exists closed_at   timestamptz;
alter table ticket add column if not exists updated_at  timestamptz not null default now();

alter table ticket drop constraint if exists ticket_status_chk;
alter table ticket add constraint ticket_status_chk
  check (status in ('abierto', 'respondido', 'cerrado', 'cancelado'));
alter table ticket drop constraint if exists ticket_kind_chk;
alter table ticket add constraint ticket_kind_chk
  check (kind in ('ticket_normal', 'ticket_express'));

create index if not exists ticket_student_idx on ticket (student_id, created_at desc);
create index if not exists ticket_pool_idx on ticket (modulo_id) where mentor_id is null;

-- ─────────────────────────────── booking ────────────────────────────────
alter table booking add column if not exists credits      int;
alter table booking add column if not exists note         text;   -- de qué quiere hablar el alumno
alter table booking add column if not exists meeting_url  text;   -- sala (solo las partes la ven)
alter table booking add column if not exists cancelled_by uuid references profile (id) on delete set null;
alter table booking add column if not exists updated_at   timestamptz not null default now();

alter table booking drop constraint if exists booking_status_chk;
alter table booking add constraint booking_status_chk
  check (status in ('solicitada', 'confirmada', 'hecha', 'rechazada', 'cancelada'));
alter table booking drop constraint if exists booking_kind_chk;
alter table booking add constraint booking_kind_chk
  check (product_kind in ('sesion_1a1', 'sesion_flash'));

create index if not exists booking_student_idx on booking (student_id, starts_at);
create index if not exists booking_mentor_idx on booking (mentor_id, starts_at);

-- ──────────────────────── Ledger ↔ ticket/reserva ───────────────────────
alter table credit_ledger add column if not exists ticket_id  uuid references ticket (id);
alter table credit_ledger add column if not exists booking_id uuid references booking (id);
-- Como mucho un 'gasto' y una 'devolucion' por ticket/reserva.
create unique index if not exists cl_ticket_once on credit_ledger (ticket_id, type)
  where ticket_id is not null;
create unique index if not exists cl_booking_once on credit_ledger (booking_id, type)
  where booking_id is not null;

-- ─────────────────────────── ticket_message ─────────────────────────────
-- Hilo del ticket (la pregunta inicial está en ticket.body).
create table if not exists ticket_message (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references ticket (id) on delete cascade,
  author_id  uuid not null references profile (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index if not exists ticket_message_idx on ticket_message (ticket_id, created_at);
alter table ticket_message enable row level security;

-- ─────────────────────────── mentor_earning ─────────────────────────────
-- Créditos generados por cada mentor (base de la liquidación mensual). Inmutable.
create table if not exists mentor_earning (
  id           uuid primary key default gen_random_uuid(),
  mentor_id    uuid not null references mentor_profile (profile_id),
  product_kind product_kind not null,
  credits      int not null check (credits >= 0),
  ticket_id    uuid unique references ticket (id),
  booking_id   uuid unique references booking (id),
  created_at   timestamptz not null default now(),
  check ((ticket_id is null) <> (booking_id is null))
);
create index if not exists mentor_earning_idx on mentor_earning (mentor_id, created_at);

create or replace function public.block_earning_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'mentor_earning es inmutable';
end;
$$;
drop trigger if exists earning_no_update on mentor_earning;
create trigger earning_no_update before update on mentor_earning
  for each row execute function public.block_earning_mutation();
drop trigger if exists earning_no_delete on mentor_earning;
create trigger earning_no_delete before delete on mentor_earning
  for each row execute function public.block_earning_mutation();

alter table mentor_earning enable row level security;
drop policy if exists me_own on mentor_earning;
create policy me_own on mentor_earning for select
  using (mentor_id = auth.uid() or public.is_admin());
revoke insert, update, delete on mentor_earning from anon, authenticated;

-- ─────────────────────────────── RLS ────────────────────────────────────
-- ¿El usuario actual es mentor VERIFICADO que imparte este módulo?
create or replace function public.mentor_teaches(p_modulo uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from mentor_profile mp
    join mentor_modulo mm on mm.mentor_id = mp.profile_id
    where mp.profile_id = auth.uid() and mp.status = 'verificado'
      and mm.modulo_id = p_modulo
  )
$$;

-- Antes el alumno podía INSERT/UPDATE directo (crear tickets o reservas sin pagar,
-- cambiarse el estado). Ahora solo lee; toda escritura pasa por las RPC.
drop policy if exists ticket_student_write on ticket;
drop policy if exists booking_student_write on booking;
revoke insert, update, delete on ticket, booking, ticket_message from anon, authenticated;

-- Bolsa: tickets abiertos sin asignar de los módulos que imparte el mentor.
drop policy if exists ticket_mentor_pool on ticket;
create policy ticket_mentor_pool on ticket for select using (
  mentor_id is null and status = 'abierto' and public.mentor_teaches(modulo_id)
);

drop policy if exists tm_party on ticket_message;
create policy tm_party on ticket_message for select using (
  exists (select 1 from ticket t
          where t.id = ticket_message.ticket_id
            and (t.student_id = auth.uid() or t.mentor_id = auth.uid()))
  or public.is_admin()
);

-- El mentor ve el NOMBRE DE PILA (nada más: ni email ni apellidos) de los alumnos con
-- los que tiene un ticket o una reserva asignados.
create or replace function public.my_student_names(p_ids uuid[])
returns table (id uuid, first_name text)
language sql stable security definer set search_path = public as $$
  select p.id, split_part(coalesce(p.full_name, ''), ' ', 1)
  from profile p
  where p.id = any(p_ids)
    and (exists (select 1 from ticket t where t.student_id = p.id and t.mentor_id = auth.uid())
         or exists (select 1 from booking b where b.student_id = p.id and b.mentor_id = auth.uid()))
$$;

-- ─────────────────────────────── Helpers ────────────────────────────────
-- Serializa las operaciones de créditos de un alumno (evita saldo negativo por carrera).
create or replace function public.lock_student_credits(p_student uuid)
returns void language sql volatile as $$
  select pg_advisory_xact_lock(hashtextextended('credits:' || p_student::text, 0))
$$;

create or replace function public.is_verified_mentor_of(p_mentor uuid, p_modulo uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from mentor_profile mp
    join mentor_modulo mm on mm.mentor_id = mp.profile_id
    where mp.profile_id = p_mentor and mp.status = 'verificado' and mm.modulo_id = p_modulo
  )
$$;

-- ─────────────────────────────── Tickets ────────────────────────────────
create or replace function public.create_ticket(
  p_student uuid, p_modulo_code text, p_kind product_kind, p_subject text, p_body text
) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  v_modulo uuid;
  v_price  int;
  v_id     uuid;
begin
  if p_kind not in ('ticket_normal', 'ticket_express') then
    raise exception 'invalidKind';
  end if;
  if not exists (select 1 from student_profile where profile_id = p_student) then
    raise exception 'noProfile';
  end if;
  select id into v_modulo from modulo where code = p_modulo_code;
  if v_modulo is null then
    raise exception 'moduloNotFound';
  end if;
  if char_length(trim(coalesce(p_subject, ''))) not between 3 and 140
     or char_length(trim(coalesce(p_body, ''))) not between 10 and 5000 then
    raise exception 'invalidText';
  end if;
  -- Sin mentores verificados del módulo nadie lo respondería: no se cobra.
  if not exists (select 1 from mentor_modulo mm
                 join mentor_profile mp on mp.profile_id = mm.mentor_id
                 where mm.modulo_id = v_modulo and mp.status = 'verificado') then
    raise exception 'noMentorForModulo';
  end if;

  perform public.lock_student_credits(p_student);
  v_price := public.product_credits(p_kind, 'mentor');
  if public.credit_balance(p_student) < v_price then
    raise exception 'insufficientCredits';
  end if;

  insert into ticket (student_id, modulo_id, kind, subject, body, credits, due_at)
  values (p_student, v_modulo, p_kind, trim(p_subject), trim(p_body), v_price,
          now() + case when p_kind = 'ticket_express' then interval '2 hours'
                       else interval '24 hours' end)
  returning id into v_id;

  insert into credit_ledger (student_id, type, amount, product_kind, ticket_id, note)
  values (p_student, 'gasto', -v_price, p_kind, v_id, 'Ticket');
  return v_id;
end;
$$;

-- El alumno cancela un ticket que ningún mentor ha cogido → devolución íntegra.
create or replace function public.cancel_ticket(p_student uuid, p_ticket uuid)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare v ticket;
begin
  select * into v from ticket where id = p_ticket for update;
  if v.id is null or v.student_id <> p_student then
    raise exception 'notFound';
  end if;
  if v.status <> 'abierto' or v.mentor_id is not null then
    raise exception 'cannotCancel';
  end if;
  update ticket set status = 'cancelado', closed_at = now(), updated_at = now()
  where id = p_ticket;
  insert into credit_ledger (student_id, type, amount, product_kind, ticket_id, note)
  values (p_student, 'devolucion', v.credits, v.kind, p_ticket, 'Ticket cancelado');
end;
$$;

-- Un mentor verificado del módulo se asigna un ticket libre.
create or replace function public.claim_ticket(p_mentor uuid, p_ticket uuid)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare v ticket;
begin
  select * into v from ticket where id = p_ticket for update;
  if v.id is null or not public.is_verified_mentor_of(p_mentor, v.modulo_id) then
    raise exception 'notFound';
  end if;
  if v.mentor_id is not null or v.status <> 'abierto' then
    raise exception 'alreadyClaimed';
  end if;
  update ticket set mentor_id = p_mentor, updated_at = now() where id = p_ticket;
end;
$$;

-- El mentor suelta un ticket que cogió y aún no ha respondido (vuelve a la bolsa).
create or replace function public.release_ticket(p_mentor uuid, p_ticket uuid)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare v ticket;
begin
  select * into v from ticket where id = p_ticket for update;
  if v.id is null or v.mentor_id is distinct from p_mentor then
    raise exception 'notFound';
  end if;
  if v.answered_at is not null or v.status <> 'abierto' then
    raise exception 'cannotRelease';
  end if;
  update ticket set mentor_id = null, updated_at = now() where id = p_ticket;
end;
$$;

-- Mensaje en el hilo. La 1.ª respuesta del mentor asignado genera su ganancia.
create or replace function public.post_ticket_message(p_author uuid, p_ticket uuid, p_body text)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare v ticket;
begin
  if char_length(trim(coalesce(p_body, ''))) not between 1 and 5000 then
    raise exception 'invalidText';
  end if;
  select * into v from ticket where id = p_ticket for update;
  if v.id is null then
    raise exception 'notFound';
  end if;
  if v.status in ('cerrado', 'cancelado') then
    raise exception 'ticketClosed';
  end if;

  if p_author = v.mentor_id then
    insert into ticket_message (ticket_id, author_id, body) values (p_ticket, p_author, trim(p_body));
    if v.answered_at is null then
      insert into mentor_earning (mentor_id, product_kind, credits, ticket_id)
      values (p_author, v.kind, v.credits, p_ticket)
      on conflict (ticket_id) do nothing;
    end if;
    update ticket set status = 'respondido', answered_at = coalesce(answered_at, now()),
                      updated_at = now()
    where id = p_ticket;
  elsif p_author = v.student_id then
    insert into ticket_message (ticket_id, author_id, body) values (p_ticket, p_author, trim(p_body));
    -- Repregunta: vuelve a estar pendiente del mentor (sin nuevo cobro).
    update ticket set status = 'abierto', updated_at = now() where id = p_ticket;
  else
    raise exception 'notFound';
  end if;
end;
$$;

-- El alumno da por resuelto un ticket ya respondido.
create or replace function public.close_ticket(p_student uuid, p_ticket uuid)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare v ticket;
begin
  select * into v from ticket where id = p_ticket for update;
  if v.id is null or v.student_id <> p_student then
    raise exception 'notFound';
  end if;
  if v.answered_at is null or v.status in ('cerrado', 'cancelado') then
    raise exception 'cannotClose';
  end if;
  update ticket set status = 'cerrado', closed_at = now(), updated_at = now()
  where id = p_ticket;
end;
$$;

-- ─────────────────────────────── Reservas ───────────────────────────────
-- p_starts_local = fecha/hora de pared en Europe/Madrid (lo que elige el alumno).
create or replace function public.create_booking(
  p_student uuid, p_mentor uuid, p_modulo_code text, p_kind product_kind,
  p_starts_local timestamp, p_note text
) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  v_modulo uuid;
  v_level  mentor_level;
  v_start  timestamptz;
  v_end    timestamptz;
  v_price  int;
  v_id     uuid;
begin
  if p_kind not in ('sesion_1a1', 'sesion_flash') then
    raise exception 'invalidKind';
  end if;
  if not exists (select 1 from student_profile where profile_id = p_student) then
    raise exception 'noProfile';
  end if;
  select id into v_modulo from modulo where code = p_modulo_code;
  if v_modulo is null then
    raise exception 'moduloNotFound';
  end if;
  if not public.is_verified_mentor_of(p_mentor, v_modulo) then
    raise exception 'mentorNotAvailable';
  end if;
  if char_length(coalesce(p_note, '')) > 1000 then
    raise exception 'invalidText';
  end if;

  v_start := p_starts_local at time zone 'Europe/Madrid';
  v_end := v_start + case when p_kind = 'sesion_1a1' then interval '60 minutes'
                          else interval '25 minutes' end;
  if v_start < now() + interval '3 hours' then
    raise exception 'tooSoon';
  end if;
  if v_start > now() + interval '90 days' then
    raise exception 'tooFar';
  end if;

  -- Bloqueos: alumno (saldo) y mentor (agenda), siempre en el mismo orden.
  perform public.lock_student_credits(p_student);
  perform pg_advisory_xact_lock(hashtextextended('agenda:' || p_mentor::text, 0));

  if exists (select 1 from booking
             where status in ('solicitada', 'confirmada')
               and (mentor_id = p_mentor or student_id = p_student)
               and tstzrange(starts_at, ends_at) && tstzrange(v_start, v_end)) then
    raise exception 'slotTaken';
  end if;

  select level into v_level from mentor_profile where profile_id = p_mentor;
  v_price := public.product_credits(p_kind, v_level);
  if public.credit_balance(p_student) < v_price then
    raise exception 'insufficientCredits';
  end if;

  insert into booking (student_id, mentor_id, modulo_id, product_kind, starts_at, ends_at,
                       credits, note)
  values (p_student, p_mentor, v_modulo, p_kind, v_start, v_end, v_price,
          nullif(trim(coalesce(p_note, '')), ''))
  returning id into v_id;

  insert into credit_ledger (student_id, type, amount, product_kind, mentor_id, booking_id, note)
  values (p_student, 'gasto', -v_price, p_kind, p_mentor, v_id, 'Reserva de sesión');
  return v_id;
end;
$$;

-- El mentor acepta (sala de videollamada) o rechaza (devolución íntegra).
create or replace function public.respond_booking(p_mentor uuid, p_booking uuid, p_accept boolean)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare v booking;
begin
  select * into v from booking where id = p_booking for update;
  if v.id is null or v.mentor_id <> p_mentor then
    raise exception 'notFound';
  end if;
  if v.status <> 'solicitada' then
    raise exception 'notPending';
  end if;
  if p_accept then
    if v.starts_at <= now() then
      raise exception 'expired';
    end if;
    -- Sala provisional (Jitsi) hasta tener aula integrada. Nombre no adivinable.
    update booking set status = 'confirmada', updated_at = now(),
           meeting_url = 'https://meet.jit.si/Tutor247-' || replace(gen_random_uuid()::text, '-', '')
    where id = p_booking;
  else
    update booking set status = 'rechazada', updated_at = now() where id = p_booking;
    insert into credit_ledger (student_id, type, amount, product_kind, mentor_id, booking_id, note)
    values (v.student_id, 'devolucion', v.credits, v.product_kind, v.mentor_id, p_booking,
            'Reserva rechazada por el mentor');
  end if;
end;
$$;

-- Cancelar. Alumno: solicitada → siempre devuelve; confirmada → solo con ≥ 24 h de
-- antelación. Mentor: siempre devuelve al alumno.
create or replace function public.cancel_booking(p_actor uuid, p_booking uuid)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare v booking;
begin
  select * into v from booking where id = p_booking for update;
  if v.id is null or p_actor not in (v.student_id, v.mentor_id) then
    raise exception 'notFound';
  end if;
  if v.status not in ('solicitada', 'confirmada') then
    raise exception 'cannotCancel';
  end if;
  if p_actor = v.student_id and v.status = 'confirmada'
     and v.starts_at < now() + interval '24 hours' then
    raise exception 'tooLateToCancel';
  end if;
  update booking set status = 'cancelada', cancelled_by = p_actor, updated_at = now()
  where id = p_booking;
  insert into credit_ledger (student_id, type, amount, product_kind, mentor_id, booking_id, note)
  values (v.student_id, 'devolucion', v.credits, v.product_kind, v.mentor_id, p_booking,
          case when p_actor = v.mentor_id then 'Sesión cancelada por el mentor'
               else 'Sesión cancelada' end);
end;
$$;

-- El mentor marca la sesión como hecha (desde su hora de inicio) → ganancia.
create or replace function public.complete_booking(p_mentor uuid, p_booking uuid)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare v booking;
begin
  select * into v from booking where id = p_booking for update;
  if v.id is null or v.mentor_id <> p_mentor then
    raise exception 'notFound';
  end if;
  if v.status <> 'confirmada' then
    raise exception 'notConfirmed';
  end if;
  if v.starts_at > now() then
    raise exception 'notStarted';
  end if;
  update booking set status = 'hecha', updated_at = now() where id = p_booking;
  insert into mentor_earning (mentor_id, product_kind, credits, booking_id)
  values (p_mentor, v.product_kind, v.credits, p_booking)
  on conflict (booking_id) do nothing;
end;
$$;

-- ─────────────────────── Solo el servidor ejecuta ───────────────────────
-- Supabase da EXECUTE a anon/authenticated por defecto: se retira explícitamente.
revoke execute on function public.lock_student_credits(uuid) from public, anon, authenticated;
revoke execute on function public.create_ticket(uuid, text, product_kind, text, text) from public, anon, authenticated;
revoke execute on function public.cancel_ticket(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.claim_ticket(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.release_ticket(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.post_ticket_message(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.close_ticket(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.create_booking(uuid, uuid, text, product_kind, timestamp, text) from public, anon, authenticated;
revoke execute on function public.respond_booking(uuid, uuid, boolean) from public, anon, authenticated;
revoke execute on function public.cancel_booking(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.complete_booking(uuid, uuid) from public, anon, authenticated;

grant execute on function public.lock_student_credits(uuid) to service_role;
grant execute on function public.create_ticket(uuid, text, product_kind, text, text) to service_role;
grant execute on function public.cancel_ticket(uuid, uuid) to service_role;
grant execute on function public.claim_ticket(uuid, uuid) to service_role;
grant execute on function public.release_ticket(uuid, uuid) to service_role;
grant execute on function public.post_ticket_message(uuid, uuid, text) to service_role;
grant execute on function public.close_ticket(uuid, uuid) to service_role;
grant execute on function public.create_booking(uuid, uuid, text, product_kind, timestamp, text) to service_role;
grant execute on function public.respond_booking(uuid, uuid, boolean) to service_role;
grant execute on function public.cancel_booking(uuid, uuid) to service_role;
grant execute on function public.complete_booking(uuid, uuid) to service_role;
