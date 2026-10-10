-- Tutor247 — Fase 7: Mapa de Dominio guardado (progreso por RA) y rol tutor con cartera.
-- Reglas (CLAUDE.md, docs/capa-ia-v1.md §6, docs/segmentos-tutor247-v1.md):
--   · El Mapa es ORIENTATIVO (no es nota oficial). Cuatro niveles guardados tal cual.
--   · Cada cambio de nivel deja una EVIDENCIA inmutable (append-only) con su origen:
--     autoevaluación del alumno, sesión con mentor, valoración del tutor…
--   · El sello «Lo entiendo» solo lo pone una persona (mentor de una sesión con el
--     alumno, su tutor o admin): el alumno lo ha explicado él mismo (integridad).
--   · Escritura solo vía RPC (SECURITY DEFINER, auth.uid()); el cliente solo lee.
--   · Tutor de referencia: ve SOLO a los alumnos que le asigna el admin.
-- RE-EJECUTABLE (if not exists / drop ... if exists / create or replace).

-- ─────────────────────────────── Enums ───────────────────────────────
do $$ begin
  create type nivel_dominio as enum ('aun_no', 'con_ayuda', 'casi', 'domino');
exception when duplicate_object then null; end $$;

do $$ begin
  create type evidencia_kind as enum (
    'autoevaluacion', -- el alumno, desde el diagnóstico
    'sesion',         -- mentor tras una sesión
    'ticket',         -- mentor tras resolver un ticket
    'tutor',          -- tutor de referencia (check-in)
    'quiz',           -- quiz (Bit, fase 8)
    'simulacro',      -- simulacro corregido
    'ajuste'          -- admin
  );
exception when duplicate_object then null; end $$;

-- Horas por semana del plan inverso (por módulo que prepara el alumno).
alter table student_modulo add column if not exists hours_week int;
alter table student_modulo drop constraint if exists student_modulo_hours_chk;
alter table student_modulo add constraint student_modulo_hours_chk
  check (hours_week is null or hours_week between 1 and 40);

-- ───────────────────────── Progreso por RA ─────────────────────────
-- Estado actual (una fila por alumno y RA). Se recalcula con cada evidencia.
create table if not exists ra_progress (
  student_id uuid not null references student_profile (profile_id) on delete cascade,
  ra_id      uuid not null references ra (id) on delete cascade,
  nivel      nivel_dominio not null,
  progress   int not null check (progress between 0 and 100),
  sealed     boolean not null default false, -- sello «Lo entiendo»
  sealed_by  uuid references profile (id) on delete set null,
  sealed_at  timestamptz,
  updated_at timestamptz not null default now(),
  primary key (student_id, ra_id)
);
create index if not exists ra_progress_ra_idx on ra_progress (ra_id);

-- Historial inmutable de evidencias.
create table if not exists ra_evidence (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references student_profile (profile_id) on delete cascade,
  ra_id      uuid not null references ra (id) on delete cascade,
  kind       evidencia_kind not null,
  nivel      nivel_dominio not null,
  sealed     boolean not null default false,
  note       text check (note is null or char_length(note) <= 280),
  author_id  uuid references profile (id) on delete set null,
  booking_id uuid references booking (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists ra_evidence_student_idx on ra_evidence (student_id, ra_id, created_at desc);

create or replace function public.block_evidence_mutation()
returns trigger language plpgsql as $$
begin
  -- Se permite el borrado en cascada del alumno (baja) pero no editar.
  if tg_op = 'UPDATE' then
    raise exception 'ra_evidence es inmutable';
  end if;
  return old;
end;
$$;
drop trigger if exists ra_evidence_immutable on ra_evidence;
create trigger ra_evidence_immutable
  before update on ra_evidence
  for each row execute function public.block_evidence_mutation();

-- ─────────────────────── Tutor de referencia ───────────────────────
-- Un tutor por alumno (asignado por admin).
create table if not exists tutor_assignment (
  student_id uuid primary key references student_profile (profile_id) on delete cascade,
  tutor_id   uuid not null references reference_tutor (profile_id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists tutor_assignment_tutor_idx on tutor_assignment (tutor_id);

create or replace function public.is_tutor_of(p_student uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from tutor_assignment ta
    join reference_tutor rt on rt.profile_id = ta.tutor_id and rt.active
    where ta.student_id = p_student and ta.tutor_id = auth.uid()
  )
$$;

-- Check-ins (y llamadas a la familia) que agenda el tutor.
create table if not exists checkin (
  id           uuid primary key default gen_random_uuid(),
  tutor_id     uuid not null references reference_tutor (profile_id) on delete cascade,
  student_id   uuid not null references student_profile (profile_id) on delete cascade,
  kind         text not null default 'checkin' check (kind in ('checkin', 'llamada_familia')),
  scheduled_at timestamptz not null,
  topic        text check (topic is null or char_length(topic) <= 200),
  notes        text check (notes is null or char_length(notes) <= 2000),
  done_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists checkin_tutor_idx on checkin (tutor_id, scheduled_at);

-- Días con actividad del alumno (alimenta «días/semana», alertas y la racha).
create table if not exists student_activity (
  student_id uuid not null references student_profile (profile_id) on delete cascade,
  day        date not null,
  primary key (student_id, day)
);

-- ─────────────────────────────── RLS ───────────────────────────────
alter table ra_progress enable row level security;
alter table ra_evidence enable row level security;
alter table tutor_assignment enable row level security;
alter table checkin enable row level security;
alter table student_activity enable row level security;

-- Lectura: el alumno, su tutor, la familia (con la regla de consentimiento) y admin.
drop policy if exists rap_read on ra_progress;
create policy rap_read on ra_progress for select using (
  student_id = auth.uid() or public.is_tutor_of(student_id)
  or public.family_can_see(student_id) or public.is_admin()
);
drop policy if exists rae_read on ra_evidence;
create policy rae_read on ra_evidence for select using (
  student_id = auth.uid() or public.is_tutor_of(student_id)
  or public.family_can_see(student_id) or public.is_admin()
);
drop policy if exists ta_read on tutor_assignment;
create policy ta_read on tutor_assignment for select using (
  student_id = auth.uid() or tutor_id = auth.uid() or public.is_admin()
);
drop policy if exists ta_admin on tutor_assignment;
create policy ta_admin on tutor_assignment for all
  using (public.is_admin()) with check (public.is_admin());

-- El tutor gestiona sus check-ins de alumnos asignados; el alumno ve los suyos.
drop policy if exists ci_tutor on checkin;
create policy ci_tutor on checkin for all
  using (tutor_id = auth.uid() and public.is_tutor_of(student_id))
  with check (tutor_id = auth.uid() and public.is_tutor_of(student_id));
drop policy if exists ci_student on checkin;
create policy ci_student on checkin for select using (student_id = auth.uid());
drop policy if exists ci_admin on checkin;
create policy ci_admin on checkin for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists sa_read on student_activity;
create policy sa_read on student_activity for select using (
  student_id = auth.uid() or public.is_tutor_of(student_id)
  or public.family_can_see(student_id) or public.is_admin()
);

-- El tutor lee el perfil de alumno y los módulos de sus asignados.
drop policy if exists sp_tutor_read on student_profile;
create policy sp_tutor_read on student_profile for select using (public.is_tutor_of(profile_id));
drop policy if exists sm_tutor_read on student_modulo;
create policy sm_tutor_read on student_modulo for select using (public.is_tutor_of(student_id));

-- La familia ve los módulos del hijo (mapa en su panel) con la misma regla.
drop policy if exists sm_family_read on student_modulo;
create policy sm_family_read on student_modulo for select using (public.family_can_see(student_id));

-- Informes semanales: el tutor los redacta para sus alumnos asignados.
drop policy if exists wr_tutor on weekly_report;
create policy wr_tutor on weekly_report for all
  using (public.is_tutor_of(student_id)) with check (public.is_tutor_of(student_id));

-- Tutor: antes cualquiera podía crearse su fila en reference_tutor (rt_own era FOR
-- ALL). Ahora solo la lee; la crea admin_make_tutor (admin todo, rt_admin).
drop policy if exists rt_own on reference_tutor;
create policy rt_own on reference_tutor for select using (auth.uid() = profile_id);

-- Nadie escribe directamente progreso, evidencias ni actividad.
revoke insert, update, delete on ra_progress, ra_evidence, student_activity from anon, authenticated;

-- ─────────────────────────────── RPC ───────────────────────────────
-- Progreso orientativo por nivel (para la barra del Mapa).
create or replace function public.nivel_progress(p nivel_dominio)
returns int language sql immutable as $$
  select case p when 'domino' then 100 when 'casi' then 75 when 'con_ayuda' then 45 else 15 end
$$;

-- Núcleo: guarda una evidencia y actualiza el estado. Sin comprobación de permisos
-- (la hacen las RPC públicas de abajo). No ejecutable desde el cliente.
create or replace function public.apply_ra_evidence(
  p_student uuid, p_ra uuid, p_kind evidencia_kind, p_nivel nivel_dominio,
  p_seal boolean, p_note text, p_author uuid, p_booking uuid
) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  insert into ra_evidence (student_id, ra_id, kind, nivel, sealed, note, author_id, booking_id)
  values (p_student, p_ra, p_kind, p_nivel, coalesce(p_seal, false),
          nullif(left(trim(coalesce(p_note, '')), 280), ''), p_author, p_booking);

  insert into ra_progress (student_id, ra_id, nivel, progress, sealed, sealed_by, sealed_at, updated_at)
  values (p_student, p_ra, p_nivel, public.nivel_progress(p_nivel),
          coalesce(p_seal, false),
          case when p_seal then p_author end,
          case when p_seal then now() end, now())
  on conflict (student_id, ra_id) do update set
    nivel      = excluded.nivel,
    progress   = excluded.progress,
    -- p_seal null = no tocar el sello; true/false = ponerlo/quitarlo.
    sealed     = coalesce(p_seal, ra_progress.sealed),
    sealed_by  = case when p_seal is null then ra_progress.sealed_by
                      when p_seal then p_author end,
    sealed_at  = case when p_seal is null then ra_progress.sealed_at
                      when p_seal then now() end,
    updated_at = now();
end;
$$;

-- Registra actividad del día (idempotente). La llama el servidor con la sesión.
create or replace function public.touch_activity()
returns void
language sql volatile security definer set search_path = public as $$
  insert into student_activity (student_id, day)
  select auth.uid(), (now() at time zone 'Europe/Madrid')::date
  where exists (select 1 from student_profile where profile_id = auth.uid())
  on conflict do nothing
$$;

-- El alumno guarda su autoevaluación (diagnóstico) de un módulo.
-- p_niveles = {"RA1":"casi","RA2":"aun_no",…}. Nunca toca el sello.
create or replace function public.save_self_assessment(p_modulo_code text, p_niveles jsonb)
returns int
language plpgsql volatile security definer set search_path = public as $$
declare
  v_mod uuid;
  r     record;
  n     int := 0;
begin
  if not exists (select 1 from student_profile where profile_id = auth.uid()) then
    raise exception 'noProfile';
  end if;
  select id into v_mod from modulo where code = p_modulo_code;
  if v_mod is null then raise exception 'moduloNotFound'; end if;

  for r in
    select ra.id, (p_niveles ->> ra.code) as nivel
    from ra where ra.modulo_id = v_mod
  loop
    if r.nivel in ('aun_no', 'con_ayuda', 'casi', 'domino') then
      perform public.apply_ra_evidence(auth.uid(), r.id, 'autoevaluacion',
                                       r.nivel::nivel_dominio, null, null, auth.uid(), null);
      n := n + 1;
    end if;
  end loop;
  if n = 0 then raise exception 'nothingToSave'; end if;

  -- Guardar el diagnóstico añade el módulo a "mis módulos" si no estaba.
  insert into student_modulo (student_id, modulo_id) values (auth.uid(), v_mod)
  on conflict do nothing;
  perform public.touch_activity();
  return n;
end;
$$;

-- Mentor / tutor / admin valoran un RA del alumno (con sello opcional).
--   · Mentor: necesita una reserva confirmada o hecha con el alumno en ese módulo,
--     o un ticket suyo respondido de ese módulo.
--   · Tutor: alumno asignado.
create or replace function public.assess_ra(
  p_student uuid, p_ra uuid, p_nivel nivel_dominio, p_seal boolean, p_note text
) returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  v_mod     uuid;
  v_booking uuid;
  v_kind    evidencia_kind;
begin
  select modulo_id into v_mod from ra where id = p_ra;
  if v_mod is null then raise exception 'raNotFound'; end if;

  if public.is_admin() then
    v_kind := 'ajuste';
  elsif public.is_tutor_of(p_student) then
    v_kind := 'tutor';
  else
    select b.id into v_booking from booking b
    where b.mentor_id = auth.uid() and b.student_id = p_student
      and b.modulo_id = v_mod and b.status in ('confirmada', 'hecha')
    order by b.starts_at desc limit 1;
    if v_booking is not null then
      v_kind := 'sesion';
    elsif exists (select 1 from ticket t
                  where t.mentor_id = auth.uid() and t.student_id = p_student
                    and t.modulo_id = v_mod and t.status in ('respondido', 'cerrado')) then
      v_kind := 'ticket';
    else
      raise exception 'notAllowed';
    end if;
  end if;

  perform public.apply_ra_evidence(p_student, p_ra, v_kind, p_nivel, p_seal, p_note,
                                   auth.uid(), v_booking);
end;
$$;

-- Lo que un mentor necesita para valorar tras una sesión: RA del módulo de la reserva
-- y el nivel actual del alumno (solo de esa reserva y solo si es suya).
create or replace function public.booking_ra_map(p_booking uuid)
returns table (ra_id uuid, code text, description text, nivel nivel_dominio, sealed boolean)
language sql stable security definer set search_path = public as $$
  select ra.id, ra.code, ra.description, rp.nivel, coalesce(rp.sealed, false)
  from booking b
  join ra on ra.modulo_id = b.modulo_id
  left join ra_progress rp on rp.ra_id = ra.id and rp.student_id = b.student_id
  where b.id = p_booking and b.mentor_id = auth.uid()
    and b.status in ('confirmada', 'hecha')
  order by ra.sort_order
$$;

-- Cartera del tutor: datos curados (sin email ni teléfono) + señales para alertas.
create or replace function public.my_tutor_students()
returns table (
  student_id     uuid,
  full_name      text,
  mode           student_mode,
  is_minor       boolean,
  has_family     boolean,
  active_days_7  int,
  last_active    date,
  next_checkin   timestamptz,
  next_exam      date,
  next_exam_code text,
  ra_rojos       int,
  ra_total       int,
  last_overall   text,
  last_report    date
)
language sql stable security definer set search_path = public as $$
  select sp.profile_id,
         p.full_name,
         sp.mode,
         coalesce(sp.birthdate > (current_date - interval '18 years'), false),
         sp.family_id is not null,
         (select count(*)::int from student_activity a
           where a.student_id = sp.profile_id and a.day > current_date - 7),
         (select max(a.day) from student_activity a where a.student_id = sp.profile_id),
         (select min(c.scheduled_at) from checkin c
           where c.student_id = sp.profile_id and c.tutor_id = auth.uid()
             and c.done_at is null and c.scheduled_at > now() - interval '12 hours'),
         x.exam_date, x.code,
         (select count(*)::int from ra_progress rp
           where rp.student_id = sp.profile_id and rp.nivel in ('aun_no', 'con_ayuda')),
         (select count(*)::int from ra_progress rp where rp.student_id = sp.profile_id),
         (select wr.payload ->> 'overall' from weekly_report wr
           where wr.student_id = sp.profile_id order by wr.week_start desc limit 1),
         (select max(wr.week_start) from weekly_report wr where wr.student_id = sp.profile_id)
  from tutor_assignment ta
  join student_profile sp on sp.profile_id = ta.student_id
  join profile p on p.id = sp.profile_id
  left join lateral (
    select sm.exam_date, m.code from student_modulo sm join modulo m on m.id = sm.modulo_id
    where sm.student_id = sp.profile_id and sm.exam_date >= current_date
    order by sm.exam_date limit 1
  ) x on true
  where ta.tutor_id = auth.uid()
    and exists (select 1 from reference_tutor rt where rt.profile_id = auth.uid() and rt.active)
  order by p.full_name
$$;

-- Nombre del tutor del alumno actual (el alumno no lee profile ajeno).
create or replace function public.my_tutor_name()
returns text
language sql stable security definer set search_path = public as $$
  select split_part(coalesce(p.full_name, ''), ' ', 1)
  from tutor_assignment ta join profile p on p.id = ta.tutor_id
  where ta.student_id = auth.uid()
$$;

-- Admin: convertir un usuario en tutor de referencia (por email) y asignar alumnos.
create or replace function public.admin_make_tutor(p_email text)
returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_admin_or_server() then raise exception 'notAdmin'; end if;
  select id into v_id from profile where lower(email) = lower(trim(p_email));
  if v_id is null then raise exception 'userNotFound'; end if;
  if (select role from profile where id = v_id) in ('admin', 'alumno') then
    -- Un alumno no puede ser tutor (perdería su student_profile); admin ya lo ve todo.
    raise exception 'badRole';
  end if;
  update profile set role = 'tutor_referencia' where id = v_id;
  insert into reference_tutor (profile_id) values (v_id)
  on conflict (profile_id) do update set active = true;
  return v_id;
end;
$$;

create or replace function public.admin_assign_tutor(p_student uuid, p_tutor uuid)
returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.is_admin_or_server() then raise exception 'notAdmin'; end if;
  if p_tutor is null then
    delete from tutor_assignment where student_id = p_student;
    return;
  end if;
  if not exists (select 1 from reference_tutor where profile_id = p_tutor and active) then
    raise exception 'notTutor';
  end if;
  insert into tutor_assignment (student_id, tutor_id) values (p_student, p_tutor)
  on conflict (student_id) do update set tutor_id = excluded.tutor_id, created_at = now();
end;
$$;

-- ─────────────────────────── Permisos de RPC ───────────────────────────
revoke execute on function public.apply_ra_evidence(uuid, uuid, evidencia_kind, nivel_dominio, boolean, text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.apply_ra_evidence(uuid, uuid, evidencia_kind, nivel_dominio, boolean, text, uuid, uuid) to service_role;

revoke execute on function public.touch_activity() from public, anon;
revoke execute on function public.save_self_assessment(text, jsonb) from public, anon;
revoke execute on function public.assess_ra(uuid, uuid, nivel_dominio, boolean, text) from public, anon;
revoke execute on function public.booking_ra_map(uuid) from public, anon;
revoke execute on function public.my_tutor_students() from public, anon;
revoke execute on function public.my_tutor_name() from public, anon;
revoke execute on function public.admin_make_tutor(text) from public, anon;
revoke execute on function public.admin_assign_tutor(uuid, uuid) from public, anon;
grant execute on function public.touch_activity() to authenticated;
grant execute on function public.save_self_assessment(text, jsonb) to authenticated;
grant execute on function public.assess_ra(uuid, uuid, nivel_dominio, boolean, text) to authenticated;
grant execute on function public.booking_ra_map(uuid) to authenticated;
grant execute on function public.my_tutor_students() to authenticated;
grant execute on function public.my_tutor_name() to authenticated;
grant execute on function public.admin_make_tutor(text) to authenticated;
grant execute on function public.admin_assign_tutor(uuid, uuid) to authenticated;
