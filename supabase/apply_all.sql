-- Tutor247 — aplicar todo (RE-EJECUTABLE: limpia y recrea). Pegar en SQL Editor.

-- ========================= _reset_preamble.sql =========================
-- Preámbulo de limpieza: hace apply_all.sql re-ejecutable desde cualquier estado
-- parcial. SOLO toca objetos propios de Tutor247. No forma parte de las migraciones
-- versionadas (que se aplican una vez cada una vía CLI/MCP).

drop view if exists public.mentor_public;

drop table if exists
  public.mentor_earning, public.ticket_message, public.product_price,
  public.mentor_payout, public.mentor_badge, public.badge, public.referral,
  public.weekly_report, public.message, public.conversation, public.ticket,
  public.booking, public.ra_assessment, public.diagnostic, public.study_plan,
  public.consent, public.family_invite, public.student_modulo, public.credit_ledger, public.mentor_modulo, public.plan,
  public.pack, public.modulo_equiv_cat, public.ra, public.ciclo_modulo,
  public.modulo, public.ciclo, public.reference_tutor, public.mentor_profile,
  public.student_profile, public.family, public.profile
  cascade;

drop function if exists public.current_user_role() cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.guard_mentor_status() cascade;
drop function if exists public.guard_profile_role() cascade;
drop function if exists public.is_admin_or_server() cascade;
drop function if exists public.family_can_see(uuid) cascade;
drop function if exists public.guard_student_family() cascade;
drop function if exists public.create_family_invite() cascade;
drop function if exists public.accept_family_invite(text, boolean) cascade;
drop function if exists public.set_family_share(boolean) cascade;
drop function if exists public.leave_family() cascade;
drop function if exists public.my_linked_family() cascade;
drop function if exists public.my_family_students() cascade;
drop function if exists public.block_ledger_mutation() cascade;
drop function if exists public.credit_balance(uuid) cascade;
drop function if exists public.my_credit_balance() cascade;
drop function if exists public.product_credits(product_kind, mentor_level) cascade;
drop function if exists public.block_earning_mutation() cascade;
drop function if exists public.mentor_teaches(uuid) cascade;
drop function if exists public.my_student_names(uuid[]) cascade;
drop function if exists public.lock_student_credits(uuid) cascade;
drop function if exists public.is_verified_mentor_of(uuid, uuid) cascade;
drop function if exists public.create_ticket(uuid, text, product_kind, text, text) cascade;
drop function if exists public.cancel_ticket(uuid, uuid) cascade;
drop function if exists public.claim_ticket(uuid, uuid) cascade;
drop function if exists public.release_ticket(uuid, uuid) cascade;
drop function if exists public.post_ticket_message(uuid, uuid, text) cascade;
drop function if exists public.close_ticket(uuid, uuid) cascade;
drop function if exists public.create_booking(uuid, uuid, text, product_kind, timestamp, text) cascade;
drop function if exists public.respond_booking(uuid, uuid, boolean) cascade;
drop function if exists public.cancel_booking(uuid, uuid) cascade;
drop function if exists public.complete_booking(uuid, uuid) cascade;

drop type if exists
  consent_type, plan_kind, product_kind, ledger_type, ra_status,
  mentor_status, mentor_level, student_mode, user_role, grade_level
  cascade;

-- Borra los usuarios de prueba para que el seed los recree y dispare el trigger.
-- Va DESPUÉS de los drops: con credit_ledger aún presente, el borrado en cascada
-- chocaría con el trigger de inmutabilidad del ledger.
delete from auth.users where email like '%@tutor247.dev';


-- ========================= migrations/20261006090100_enums.sql =========================
-- Tutor247 — Enums base del dominio.
-- Fuente: docs/modelo-negocio-v1.md, docs/capa-ia-v1.md, docs/segmentos-tutor247-v1.md

-- Nivel del ciclo formativo.
create type grade_level as enum ('medio', 'superior');

-- Roles de usuario. Un usuario tiene un rol principal en profile; puede tener
-- subperfiles adicionales (p. ej. mentor + tutor_referencia) vía sus tablas.
create type user_role as enum (
  'alumno', 'familia', 'mentor', 'tutor_referencia', 'admin'
);

-- Modo del alumno: autónomo (mayor, paga él) vs familia (padres pagan).
create type student_mode as enum ('autonomo', 'familia');

-- Niveles de mentor (precio y % de reparto suben con el nivel).
create type mentor_level as enum ('mentor', 'pro', 'experto');

-- Estado de verificación del mentor (solo admin lo cambia).
create type mentor_status as enum ('pendiente', 'verificado', 'rechazado');

-- Semáforo del Mapa de Dominio por RA (orientativo, no nota oficial).
create type ra_status as enum ('verde', 'ambar', 'rojo');

-- Tipos de movimiento del ledger de créditos (inmutable).
create type ledger_type as enum (
  'compra_pack',  -- ingreso por comprar un pack
  'bonus',        -- créditos extra (bonus de pack, referidos)
  'gasto',        -- consumo en un producto
  'caducidad',    -- baja de créditos caducados (12 meses)
  'ajuste',       -- corrección manual (admin)
  'devolucion'    -- reembolso (p. ej. garantía "Seguimos contigo")
);

-- Productos que consumen créditos.
create type product_kind as enum (
  'diagnostico', 'sesion_1a1', 'sesion_flash', 'ticket_express', 'ticket_normal',
  'revision', 'simulacro', 'rescate_48h', 'plan_modulo', 'defensa_proyecto',
  'grupo_reducido'
);

-- Planes de suscripción.
create type plan_kind as enum ('gratis', 'companero', 'acompana', 'acompana_plus');

-- Tipos de consentimiento (RGPD / menores).
create type consent_type as enum (
  'compartir_familia',  -- alumno mayor autoriza compartir informes con familia
  'grabacion',          -- grabación de sesiones
  'whatsapp_menor'      -- tutor legal autoriza WhatsApp para un menor
);


-- ========================= migrations/20261006090200_profiles_roles.sql =========================
-- Tutor247 — Perfiles, roles, familias y helpers de autorización.

-- ───────────────────────────────── profile ─────────────────────────────────
-- 1:1 con auth.users. Datos mínimos; los subperfiles viven en tablas aparte.
create table profile (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       user_role not null default 'alumno',
  full_name  text,
  email      text,
  locale     text not null default 'es',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Helpers (SECURITY DEFINER) ─────────────────────────
-- Se usan en políticas RLS. SECURITY DEFINER + search_path fijo evita recursión
-- de RLS (la función lee profile sin reactivar las políticas de quien consulta).

create or replace function public.current_user_role()
returns user_role
language sql stable security definer set search_path = public as $$
  select role from public.profile where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profile where id = auth.uid() and role = 'admin'
  )
$$;

-- Crea el profile automáticamente al registrarse un usuario en auth.users.
-- El rol y el nombre llegan en raw_user_meta_data desde el formulario de registro.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profile (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'alumno')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table profile enable row level security;

create policy profile_select_own on profile
  for select using (auth.uid() = id or public.is_admin());
create policy profile_update_own on profile
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy profile_admin_all on profile
  for all using (public.is_admin()) with check (public.is_admin());
-- INSERT lo hace el trigger (security definer); el cliente no inserta profiles.

-- ───────────────────────────────── family ─────────────────────────────────
create table family (
  id               uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references profile (id) on delete cascade,
  name             text,
  created_at       timestamptz not null default now()
);

alter table family enable row level security;
create policy family_owner on family
  for all using (owner_profile_id = auth.uid()) with check (owner_profile_id = auth.uid());
create policy family_admin on family
  for all using (public.is_admin()) with check (public.is_admin());

-- ──────────────────────────── student_profile ────────────────────────────
create table student_profile (
  profile_id           uuid primary key references profile (id) on delete cascade,
  mode                 student_mode not null default 'autonomo',
  family_id            uuid references family (id) on delete set null,
  birthdate            date,
  -- Si el alumno es mayor de edad, compartir informes con la familia exige
  -- su consentimiento explícito (por defecto, nada).
  consent_share_family boolean not null default false,
  created_at           timestamptz not null default now()
);

alter table student_profile enable row level security;
create policy sp_own on student_profile
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
-- La familia dueña puede LEER al alumno vinculado solo si hay consentimiento
-- o el alumno es menor de edad.
create policy sp_family_read on student_profile
  for select using (
    exists (
      select 1 from family f
      where f.id = student_profile.family_id
        and f.owner_profile_id = auth.uid()
        and (
          student_profile.consent_share_family = true
          or student_profile.birthdate > (current_date - interval '18 years')
        )
    )
  );
create policy sp_admin on student_profile
  for all using (public.is_admin()) with check (public.is_admin());

-- ───────────────────────────── mentor_profile ─────────────────────────────
create table mentor_profile (
  profile_id             uuid primary key references profile (id) on delete cascade,
  level                  mentor_level not null default 'mentor',
  status                 mentor_status not null default 'pendiente',
  headline               text,           -- titular corto (p. ej. "Especialista 0485")
  bio                    text,
  video_url              text,           -- presentación de 60 s
  languages              text[] not null default '{es}',
  response_time_minutes  int,            -- tiempo medio de respuesta
  verified_at            timestamptz,
  created_at             timestamptz not null default now()
);

-- Impide que un mentor se autoverifique: status/verified_at solo los cambia un admin.
create or replace function public.guard_mentor_status()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.status is distinct from old.status
      or new.verified_at is distinct from old.verified_at)
     and not public.is_admin() then
    raise exception 'Solo un admin puede cambiar el estado de verificación del mentor';
  end if;
  return new;
end;
$$;

create trigger mentor_status_guard
  before update on mentor_profile
  for each row execute function public.guard_mentor_status();

alter table mentor_profile enable row level security;
create policy mp_select_own on mentor_profile
  for select using (auth.uid() = profile_id or public.is_admin());
create policy mp_insert_own on mentor_profile
  for insert with check (auth.uid() = profile_id);
create policy mp_update_own on mentor_profile
  for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy mp_admin_all on mentor_profile
  for all using (public.is_admin()) with check (public.is_admin());

-- Vista pública de mentores: SOLO verificados y SOLO columnas sin PII de contacto
-- (anti-bypass: nunca exponemos email/teléfono). security_invoker=false → la vista
-- expone este subconjunto curado saltando la RLS de las tablas base.
create view mentor_public
with (security_invoker = false) as
select
  mp.profile_id,
  p.full_name,
  p.avatar_url,
  mp.level,
  mp.headline,
  mp.bio,
  mp.video_url,
  mp.languages,
  mp.response_time_minutes
from mentor_profile mp
join profile p on p.id = mp.profile_id
where mp.status = 'verificado';

grant select on mentor_public to anon, authenticated;

-- ──────────────────────────── reference_tutor ────────────────────────────
-- Tutor de referencia (modo Familia). Rol distinto del mentor por módulo;
-- una misma persona podría tener ambos subperfiles.
create table reference_tutor (
  profile_id uuid primary key references profile (id) on delete cascade,
  bio        text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

alter table reference_tutor enable row level security;
create policy rt_own on reference_tutor
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy rt_admin on reference_tutor
  for all using (public.is_admin()) with check (public.is_admin());


-- ========================= migrations/20261006090300_catalog.sql =========================
-- Tutor247 — Catálogo académico: ciclos, módulos, RA, equivalencias, packs, planes.
-- Lectura pública (SEO + navegación). Escritura solo admin.

-- ───────────────────────────────── ciclo ─────────────────────────────────
create table ciclo (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,       -- SMX, ASIR, DAM, DAW
  name       text not null,
  grade      grade_level not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ───────────────────────────────── modulo ─────────────────────────────────
-- Código estatal único y global. Un módulo puede pertenecer a varios ciclos.
create table modulo (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,      -- 0485, 0484, 0373...
  name        text not null,
  description text,
  hours       int,
  killer      boolean not null default false,  -- "módulo killer" (más suspensos)
  created_at  timestamptz not null default now()
);

-- Relación N:M ciclo ↔ módulo (p. ej. 0373 está en DAM/DAW y ASIR).
create table ciclo_modulo (
  ciclo_id    uuid not null references ciclo (id) on delete cascade,
  modulo_id   uuid not null references modulo (id) on delete cascade,
  curso       smallint,                  -- 1 o 2
  transversal boolean not null default false,
  primary key (ciclo_id, modulo_id)
);

-- ─────────────────────────────────── ra ───────────────────────────────────
-- Resultados de Aprendizaje por módulo (base del Mapa de Dominio y plan inverso).
create table ra (
  id          uuid primary key default gen_random_uuid(),
  modulo_id   uuid not null references modulo (id) on delete cascade,
  code        text not null,             -- RA1, RA2...
  description text not null,
  weight      int,                       -- peso orientativo en el examen
  sort_order  int not null default 0,
  unique (modulo_id, code)
);

-- Equivalencias con la numeración catalana (código estatal ↔ M/UF).
-- Preparado para más comunidades vía columna "comunidad".
create table modulo_equiv_cat (
  id         uuid primary key default gen_random_uuid(),
  modulo_id  uuid not null references modulo (id) on delete cascade,
  codigo_cat text not null,              -- M01..M16
  uf         text,                       -- UF1, UF2... (opcional)
  comunidad  text not null default 'catalunya'
);

-- ──────────────────────────────── mentor_modulo ───────────────────────────
-- Qué módulos imparte cada mentor (N:M). Lectura pública (sin PII).
create table mentor_modulo (
  mentor_id uuid not null references mentor_profile (profile_id) on delete cascade,
  modulo_id uuid not null references modulo (id) on delete cascade,
  primary key (mentor_id, modulo_id)
);

-- ──────────────────────────────────── pack ────────────────────────────────
create table pack (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  price_eur  numeric(10, 2) not null,
  credits    int not null,
  bonus_pct  int not null default 0,
  active     boolean not null default true,
  sort_order int not null default 0
);

-- ──────────────────────────────────── plan ────────────────────────────────
create table plan (
  id              uuid primary key default gen_random_uuid(),
  kind            plan_kind not null unique,
  name            text not null,
  price_eur_month numeric(10, 2) not null,
  features        jsonb not null default '[]'::jsonb,
  active          boolean not null default true,
  sort_order      int not null default 0
);

-- ─────────────────────────────────── RLS ──────────────────────────────────
-- Patrón del catálogo: lectura pública, escritura solo admin.
do $$
declare t text;
begin
  foreach t in array array[
    'ciclo','modulo','ciclo_modulo','ra','modulo_equiv_cat','pack','plan'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy %I on %I for select using (true)', t || '_read', t);
    execute format(
      'create policy %I on %I for all using (public.is_admin()) with check (public.is_admin())',
      t || '_admin', t);
  end loop;
end $$;

-- mentor_modulo: lectura pública (qué imparte cada mentor), escritura del propio
-- mentor o admin.
alter table mentor_modulo enable row level security;
create policy mm_read on mentor_modulo for select using (true);
create policy mm_own_write on mentor_modulo
  for all using (auth.uid() = mentor_id) with check (auth.uid() = mentor_id);
create policy mm_admin on mentor_modulo
  for all using (public.is_admin()) with check (public.is_admin());


-- ========================= migrations/20261006090400_credit_ledger.sql =========================
-- Tutor247 — Ledger de créditos. REGLA CLAVE DEL NEGOCIO:
-- el saldo NO se guarda; se calcula sumando movimientos. El ledger es inmutable
-- (append-only): nada de UPDATE/DELETE. Las correcciones se hacen con un nuevo
-- movimiento ('ajuste' o 'devolucion').

create table credit_ledger (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references student_profile (profile_id) on delete cascade,
  type         ledger_type not null,
  -- Entero con signo: + ingreso (compra/bonus/devolución), − gasto/caducidad.
  amount       integer not null,
  product_kind product_kind,                               -- si type = 'gasto'
  mentor_id    uuid references mentor_profile (profile_id), -- atribución del consumo
  pack_id      uuid references pack (id),                   -- si procede de un pack
  -- Caducidad por lote de ingreso (12 meses). Metadato para el job de caducidad,
  -- que insertará movimientos 'caducidad' negativos cuando corresponda.
  expires_at   timestamptz,
  note         text,
  created_at   timestamptz not null default now()
);

create index credit_ledger_student_idx on credit_ledger (student_id, created_at);

-- Inmutabilidad dura: bloquea UPDATE y DELETE para TODOS (incluido service role).
create or replace function public.block_ledger_mutation()
returns trigger language plpgsql as $$
begin
  raise exception
    'credit_ledger es inmutable: corrige con un nuevo movimiento (ajuste/devolucion), no con UPDATE/DELETE';
end;
$$;

create trigger ledger_no_update
  before update on credit_ledger
  for each row execute function public.block_ledger_mutation();
create trigger ledger_no_delete
  before delete on credit_ledger
  for each row execute function public.block_ledger_mutation();

-- Saldo = suma de TODOS los movimientos del alumno (la caducidad se refleja como
-- movimientos negativos, no excluyendo filas).
create or replace function public.credit_balance(p_student uuid)
returns integer
language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount), 0)::int
  from public.credit_ledger
  where student_id = p_student
$$;

-- Atajo para el alumno autenticado (lo llama el panel vía RPC).
create or replace function public.my_credit_balance()
returns integer
language sql stable security definer set search_path = public as $$
  select public.credit_balance(auth.uid())
$$;

alter table credit_ledger enable row level security;
-- El alumno (y admin) LEE sus movimientos. No hay policy de insert/update/delete:
-- el cliente nunca escribe. Los ingresos/gastos los crea el servidor con service
-- role (compra de packs, consumo de productos), que salta RLS.
create policy cl_select_own on credit_ledger
  for select using (auth.uid() = student_id or public.is_admin());

-- Defensa en profundidad: ni anon ni authenticated pueden mutar la tabla.
revoke insert, update, delete on credit_ledger from anon, authenticated;


-- ========================= migrations/20261006090500_future_scaffolding.sql =========================
-- Tutor247 — Tablas de fases posteriores (reservas, tickets, diagnóstico/Mapa,
-- plan inverso, Bit/IA, informes, consentimientos, referidos, insignias, payouts).
-- Se crean ahora para que el modelo de datos las soporte desde el inicio; su UI
-- llega en fases posteriores. RLS base: el alumno es dueño de sus filas; el mentor
-- ve lo asignado; admin todo. Las políticas se afinarán al construir cada feature.

-- ──────────────────────────────── consent ─────────────────────────────────
create table consent (
  id               uuid primary key default gen_random_uuid(),
  subject_profile  uuid not null references profile (id) on delete cascade, -- a quién afecta
  granted_by       uuid not null references profile (id) on delete cascade, -- quién lo otorga
  type             consent_type not null,
  granted          boolean not null default true,
  created_at       timestamptz not null default now()
);
alter table consent enable row level security;
create policy consent_own on consent for select
  using (subject_profile = auth.uid() or granted_by = auth.uid() or public.is_admin());
create policy consent_admin on consent for all
  using (public.is_admin()) with check (public.is_admin());

-- ─────────────────────────────── study_plan ───────────────────────────────
-- Plan inverso: fecha de examen → calendario por RA y créditos estimados.
create table study_plan (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references student_profile (profile_id) on delete cascade,
  modulo_id     uuid not null references modulo (id) on delete cascade,
  exam_date     date,
  hours_week    int,
  plan          jsonb not null default '{}'::jsonb,  -- semanas/RA/tareas
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);
alter table study_plan enable row level security;
create policy study_plan_own on study_plan for all
  using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy study_plan_admin on study_plan for all
  using (public.is_admin()) with check (public.is_admin());

-- ──────────────── diagnostic + ra_assessment (Mapa de Dominio) ─────────────
create table diagnostic (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references student_profile (profile_id) on delete cascade,
  modulo_id   uuid not null references modulo (id) on delete cascade,
  created_at  timestamptz not null default now()
);
create table ra_assessment (
  id            uuid primary key default gen_random_uuid(),
  diagnostic_id uuid not null references diagnostic (id) on delete cascade,
  ra_id         uuid not null references ra (id) on delete cascade,
  status        ra_status not null,         -- verde/ámbar/rojo (orientativo)
  score         numeric(5, 2),
  created_at    timestamptz not null default now()
);
alter table diagnostic enable row level security;
alter table ra_assessment enable row level security;
create policy diag_own on diagnostic for all
  using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy diag_admin on diagnostic for all
  using (public.is_admin()) with check (public.is_admin());
create policy raa_own on ra_assessment for select using (
  exists (select 1 from diagnostic d
          where d.id = ra_assessment.diagnostic_id and d.student_id = auth.uid())
  or public.is_admin()
);
create policy raa_admin on ra_assessment for all
  using (public.is_admin()) with check (public.is_admin());

-- ──────────────────────────────── booking ─────────────────────────────────
-- Reserva de sesión (1:1, flash, grupo) con videollamada en fases posteriores.
create table booking (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references student_profile (profile_id) on delete cascade,
  mentor_id    uuid not null references mentor_profile (profile_id) on delete cascade,
  modulo_id    uuid references modulo (id) on delete set null,
  product_kind product_kind not null,
  starts_at    timestamptz,
  ends_at      timestamptz,
  status       text not null default 'solicitada',  -- solicitada/confirmada/hecha/cancelada
  created_at   timestamptz not null default now()
);
alter table booking enable row level security;
create policy booking_party on booking for select
  using (student_id = auth.uid() or mentor_id = auth.uid() or public.is_admin());
create policy booking_student_write on booking for all
  using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy booking_admin on booking for all
  using (public.is_admin()) with check (public.is_admin());

-- ──────────────────────────────── ticket ──────────────────────────────────
-- Ticket Express/Normal. La IA filtra/resume y puede escalar a un humano.
create table ticket (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references student_profile (profile_id) on delete cascade,
  mentor_id     uuid references mentor_profile (profile_id) on delete set null,
  modulo_id     uuid references modulo (id) on delete set null,
  kind          product_kind not null,         -- ticket_express | ticket_normal
  subject       text,
  body          text,
  escalated     boolean not null default false, -- escalado de IA a humano
  status        text not null default 'abierto', -- abierto/respondido/cerrado
  created_at    timestamptz not null default now()
);
alter table ticket enable row level security;
create policy ticket_party on ticket for select
  using (student_id = auth.uid() or mentor_id = auth.uid() or public.is_admin());
create policy ticket_student_write on ticket for all
  using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy ticket_admin on ticket for all
  using (public.is_admin()) with check (public.is_admin());

-- ─────────────────────── conversation + message (Bit) ─────────────────────
create table conversation (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references student_profile (profile_id) on delete cascade,
  channel     text not null default 'web',   -- web | whatsapp
  modulo_id   uuid references modulo (id) on delete set null,
  created_at  timestamptz not null default now()
);
create table message (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversation (id) on delete cascade,
  sender          text not null,            -- alumno | bit | mentor | sistema
  body            text,
  escalated       boolean not null default false,
  created_at      timestamptz not null default now()
);
alter table conversation enable row level security;
alter table message enable row level security;
create policy conv_own on conversation for all
  using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy conv_admin on conversation for all
  using (public.is_admin()) with check (public.is_admin());
create policy msg_own on message for select using (
  exists (select 1 from conversation c
          where c.id = message.conversation_id and c.student_id = auth.uid())
  or public.is_admin()
);
create policy msg_admin on message for all
  using (public.is_admin()) with check (public.is_admin());

-- ───────────────────────────── weekly_report ──────────────────────────────
-- Informe semanal a la familia (modo Familia o alumno que lo autoriza).
create table weekly_report (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references student_profile (profile_id) on delete cascade,
  family_id   uuid references family (id) on delete set null,
  week_start  date not null,
  payload     jsonb not null default '{}'::jsonb,  -- semáforo, constancia, próximas fechas
  created_at  timestamptz not null default now()
);
alter table weekly_report enable row level security;
create policy wr_student on weekly_report for select
  using (student_id = auth.uid() or public.is_admin());
create policy wr_family on weekly_report for select using (
  exists (select 1 from family f
          where f.id = weekly_report.family_id and f.owner_profile_id = auth.uid())
);
create policy wr_admin on weekly_report for all
  using (public.is_admin()) with check (public.is_admin());

-- ──────────────────────────────── referral ────────────────────────────────
create table referral (
  id             uuid primary key default gen_random_uuid(),
  referrer_id    uuid not null references profile (id) on delete cascade,
  invited_email  text,
  invited_id     uuid references profile (id) on delete set null,
  rewarded       boolean not null default false,  -- al comprar el invitado su 1er pack
  created_at     timestamptz not null default now()
);
alter table referral enable row level security;
create policy ref_own on referral for all
  using (referrer_id = auth.uid()) with check (referrer_id = auth.uid());
create policy ref_admin on referral for all
  using (public.is_admin()) with check (public.is_admin());

-- ─────────────────────────── badge + mentor_badge ─────────────────────────
create table badge (
  id    uuid primary key default gen_random_uuid(),
  slug  text not null unique,
  name  text not null
);
create table mentor_badge (
  mentor_id uuid not null references mentor_profile (profile_id) on delete cascade,
  badge_id  uuid not null references badge (id) on delete cascade,
  primary key (mentor_id, badge_id)
);
alter table badge enable row level security;
alter table mentor_badge enable row level security;
create policy badge_read on badge for select using (true);
create policy badge_admin on badge for all
  using (public.is_admin()) with check (public.is_admin());
create policy mbadge_read on mentor_badge for select using (true);
create policy mbadge_admin on mentor_badge for all
  using (public.is_admin()) with check (public.is_admin());

-- ──────────────────────────────── mentor_payout ───────────────────────────
-- Liquidación mensual al mentor (60–70 % de créditos consumidos, según nivel).
create table mentor_payout (
  id            uuid primary key default gen_random_uuid(),
  mentor_id     uuid not null references mentor_profile (profile_id) on delete cascade,
  period_month  date not null,              -- primer día del mes liquidado
  credits       int not null default 0,
  amount_eur    numeric(10, 2) not null default 0,
  status        text not null default 'pendiente', -- pendiente/pagado
  created_at    timestamptz not null default now()
);
alter table mentor_payout enable row level security;
create policy payout_own on mentor_payout for select
  using (mentor_id = auth.uid() or public.is_admin());
create policy payout_admin on mentor_payout for all
  using (public.is_admin()) with check (public.is_admin());


-- ========================= migrations/20261007090100_student_modulo.sql =========================
-- Tutor247 — Módulos que prepara el alumno (F1.4).
-- Relación N:M alumno ↔ módulo con fecha de examen opcional. Es la base del panel
-- del alumno ("mis módulos") y, más adelante, del plan inverso (study_plan).

create table student_modulo (
  student_id uuid not null references student_profile (profile_id) on delete cascade,
  modulo_id  uuid not null references modulo (id) on delete cascade,
  exam_date  date,
  created_at timestamptz not null default now(),
  primary key (student_id, modulo_id)
);

create index student_modulo_modulo_idx on student_modulo (modulo_id);

alter table student_modulo enable row level security;
-- El alumno gestiona sus propios módulos; admin todo.
create policy sm_own on student_modulo
  for all using (auth.uid() = student_id) with check (auth.uid() = student_id);
create policy sm_admin on student_modulo
  for all using (public.is_admin()) with check (public.is_admin());


-- ========================= migrations/20261007090200_role_guards.sql =========================
-- Tutor247 — Guardas de rol y verificación (F1.5). Cierra tres escaladas de
-- privilegios del esquema inicial:
--   1. profile_update_own dejaba a un usuario cambiarse su propio `role` (→ admin).
--   2. handle_new_user aceptaba cualquier rol de raw_user_meta_data (signUp directo
--      con role 'admin' creaba un admin).
--   3. mentor_profile no tenía guarda en INSERT (alta directa como 'verificado' /
--      'experto') y `level` era editable por el propio mentor.
-- Regla: estos campos solo los cambia un admin o el servidor (service role /
-- SQL Editor, donde auth.uid() es null).

-- ¿Quien ejecuta es admin o el servidor? (service role y SQL Editor no llevan uid)
create or replace function public.is_admin_or_server()
returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is null or public.is_admin()
$$;

-- ───────────────────────────── 1. profile.role ─────────────────────────────
create or replace function public.guard_profile_role()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not public.is_admin_or_server() then
    raise exception 'Solo un admin puede cambiar el rol de un usuario';
  end if;
  return new;
end;
$$;

create trigger profile_role_guard
  before update on profile
  for each row execute function public.guard_profile_role();

-- ──────────────────────── 2. Rol en el registro ────────────────────────
-- Solo roles auto-asignables; cualquier otro valor (admin, tutor_referencia o
-- basura) cae a 'alumno'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  requested text := new.raw_user_meta_data ->> 'role';
begin
  insert into public.profile (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    case
      when requested in ('alumno', 'familia', 'mentor') then requested::user_role
      else 'alumno'
    end
  );
  return new;
end;
$$;

-- ─────────────────── 3. Verificación y nivel del mentor ───────────────────
-- INSERT de un no-admin: se fuerza pendiente / sin verificar / nivel base.
-- UPDATE de un no-admin: status, verified_at y level son intocables.
create or replace function public.guard_mentor_status()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin_or_server() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'pendiente';
    new.verified_at := null;
    new.level := 'mentor';
  elsif new.status is distinct from old.status
     or new.verified_at is distinct from old.verified_at
     or new.level is distinct from old.level then
    raise exception 'Solo un admin puede cambiar la verificación o el nivel del mentor';
  end if;
  return new;
end;
$$;

create trigger mentor_status_guard_insert
  before insert on mentor_profile
  for each row execute function public.guard_mentor_status();

-- Solo quien tiene rol mentor puede crearse un mentor_profile.
drop policy mp_insert_own on mentor_profile;
create policy mp_insert_own on mentor_profile
  for insert with check (
    auth.uid() = profile_id and public.current_user_role() = 'mentor'
  );


-- ========================= migrations/20261007090300_family_link.sql =========================
-- Tutor247 — Vinculación familia ↔ alumno (panel de familia).
-- Reglas (CLAUDE.md, docs/segmentos §3):
--   · El vínculo lo decide el ALUMNO introduciendo un código de invitación de su
--     familia; la familia no puede "apropiarse" de un alumno.
--   · Alumno menor de edad → la familia ve sus datos. Mayor de edad (o edad no
--     indicada) → solo si da su consentimiento explícito (y puede retirarlo).
--   · Cada cambio de consentimiento queda registrado en `consent`.
-- RE-EJECUTABLE: se puede pegar entera en el SQL Editor aunque una ejecución
-- anterior se quedara a medias (if not exists / drop ... if exists).

-- Una familia por cuenta (el onboarding pasa a upsert).
create unique index if not exists family_owner_unique on family (owner_profile_id);

-- ¿El usuario actual (dueño de familia) puede ver datos de este alumno?
create or replace function public.family_can_see(p_student uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from student_profile sp
    join family f on f.id = sp.family_id
    where sp.profile_id = p_student
      and f.owner_profile_id = auth.uid()
      and (sp.consent_share_family
           or coalesce(sp.birthdate > (current_date - interval '18 years'), false))
  )
$$;

-- Los informes semanales también respetan el consentimiento (antes bastaba con
-- ser dueño de la familia).
drop policy if exists wr_family on weekly_report;
create policy wr_family on weekly_report for select using (
  public.family_can_see(student_id)
  and exists (select 1 from family f
              where f.id = weekly_report.family_id and f.owner_profile_id = auth.uid())
);

-- ───────────────────── family_id solo por invitación ─────────────────────
-- INSERT de un no-admin: sin familia. UPDATE: vincular (family_id no nulo) solo
-- desde accept_family_invite (marca de sesión) o admin/servidor. Desvincular sí.
create or replace function public.guard_student_family()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin_or_server()
     or coalesce(current_setting('tutor247.family_link', true), '') = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.family_id := null;
  elsif new.family_id is distinct from old.family_id and new.family_id is not null then
    raise exception 'Solo se puede vincular una familia con su código de invitación';
  end if;
  return new;
end;
$$;

drop trigger if exists student_family_guard on student_profile;
create trigger student_family_guard
  before insert or update on student_profile
  for each row execute function public.guard_student_family();

-- ───────────────────────────── Invitaciones ─────────────────────────────
create table if not exists family_invite (
  code       text primary key,              -- 10 caracteres hex en mayúsculas, sin guion
  family_id  uuid not null references family (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  used_by    uuid references student_profile (profile_id) on delete set null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
alter table family_invite enable row level security;
-- La familia ve sus invitaciones; nadie escribe directamente (solo vía RPC).
drop policy if exists fi_owner_read on family_invite;
create policy fi_owner_read on family_invite for select using (
  exists (select 1 from family f
          where f.id = family_invite.family_id and f.owner_profile_id = auth.uid())
  or public.is_admin()
);

-- Genera (y sustituye la pendiente) una invitación para la familia del usuario.
create or replace function public.create_family_invite()
returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  v_family uuid;
  v_code   text;
begin
  select id into v_family from family where owner_profile_id = auth.uid();
  if v_family is null then
    raise exception 'noFamily';
  end if;
  delete from family_invite where family_id = v_family and used_by is null;
  loop
    -- gen_random_uuid es aleatorio criptográfico (v4): 40 bits de entropía.
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    begin
      insert into family_invite (code, family_id) values (v_code, v_family);
      exit;
    exception when unique_violation then
      -- colisión improbable: reintenta
    end;
  end loop;
  return v_code;
end;
$$;

-- El alumno acepta la invitación. p_share = consentimiento a compartir (relevante
-- si es mayor de edad o no consta su edad). Devuelve el nombre de la familia.
create or replace function public.accept_family_invite(p_code text, p_share boolean)
returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  v_inv  family_invite;
  v_name text;
begin
  if public.current_user_role() is distinct from 'alumno' then
    raise exception 'notStudent';
  end if;
  if not exists (select 1 from student_profile where profile_id = auth.uid()) then
    raise exception 'noProfile';
  end if;

  select * into v_inv
  from family_invite
  where code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'))
  for update;
  if v_inv.code is null or v_inv.used_by is not null or v_inv.expires_at < now() then
    raise exception 'invalidCode';
  end if;

  perform set_config('tutor247.family_link', 'on', true);
  update student_profile
     set family_id = v_inv.family_id,
         mode = 'familia',
         consent_share_family = coalesce(p_share, false)
   where profile_id = auth.uid();
  perform set_config('tutor247.family_link', 'off', true);

  update family_invite set used_by = auth.uid(), used_at = now() where code = v_inv.code;
  insert into consent (subject_profile, granted_by, type, granted)
  values (auth.uid(), auth.uid(), 'compartir_familia', coalesce(p_share, false));

  select name into v_name from family where id = v_inv.family_id;
  return coalesce(v_name, '');
end;
$$;

-- El alumno da o retira su consentimiento (queda registrado).
create or replace function public.set_family_share(p_share boolean)
returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  update student_profile set consent_share_family = p_share
   where profile_id = auth.uid() and family_id is not null;
  if not found then
    raise exception 'noFamilyLink';
  end if;
  insert into consent (subject_profile, granted_by, type, granted)
  values (auth.uid(), auth.uid(), 'compartir_familia', p_share);
end;
$$;

-- El alumno se desvincula de su familia (retira también el consentimiento).
create or replace function public.leave_family()
returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  update student_profile
     set family_id = null, consent_share_family = false, mode = 'autonomo'
   where profile_id = auth.uid() and family_id is not null;
  if found then
    insert into consent (subject_profile, granted_by, type, granted)
    values (auth.uid(), auth.uid(), 'compartir_familia', false);
  end if;
end;
$$;

-- Nombre de la familia a la que está vinculado el alumno actual (el alumno no
-- puede leer la tabla family: es del dueño).
create or replace function public.my_linked_family()
returns text
language sql stable security definer set search_path = public as $$
  select f.name
  from student_profile sp join family f on f.id = sp.family_id
  where sp.profile_id = auth.uid()
$$;

-- Hijos vinculados a la familia del usuario actual. Sin consentimiento (alumno
-- mayor de edad), solo nombre y estado: módulos y saldo van a null.
create or replace function public.my_family_students()
returns table (
  student_id uuid,
  full_name  text,
  is_minor   boolean,
  shared     boolean,
  modulos    jsonb,
  balance    integer
)
language sql stable security definer set search_path = public as $$
  with hijos as (
    select sp.profile_id,
           p.full_name,
           coalesce(sp.birthdate > (current_date - interval '18 years'), false) as is_minor,
           sp.consent_share_family
    from student_profile sp
    join family f on f.id = sp.family_id
    join profile p on p.id = sp.profile_id
    where f.owner_profile_id = auth.uid()
  )
  select h.profile_id,
         h.full_name,
         h.is_minor,
         (h.is_minor or h.consent_share_family),
         case when h.is_minor or h.consent_share_family then (
           select coalesce(jsonb_agg(jsonb_build_object(
                    'code', m.code, 'name', m.name, 'exam_date', sm.exam_date)
                    order by sm.exam_date nulls last, m.code), '[]'::jsonb)
           from student_modulo sm join modulo m on m.id = sm.modulo_id
           where sm.student_id = h.profile_id
         ) end,
         case when h.is_minor or h.consent_share_family
              then public.credit_balance(h.profile_id) end
  from hijos h
  order by h.full_name
$$;

-- RPCs solo para usuarios autenticados.
revoke execute on function public.create_family_invite() from public, anon;
revoke execute on function public.accept_family_invite(text, boolean) from public, anon;
revoke execute on function public.set_family_share(boolean) from public, anon;
revoke execute on function public.leave_family() from public, anon;
revoke execute on function public.my_linked_family() from public, anon;
revoke execute on function public.my_family_students() from public, anon;
grant execute on function public.create_family_invite() to authenticated;
grant execute on function public.accept_family_invite(text, boolean) to authenticated;
grant execute on function public.set_family_share(boolean) to authenticated;
grant execute on function public.leave_family() to authenticated;
grant execute on function public.my_linked_family() to authenticated;
grant execute on function public.my_family_students() to authenticated;


-- ========================= migrations/20261008090100_tickets_bookings.sql =========================
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


-- ========================= migrations/20261008090200_cancel_policy.sql =========================
-- Tutor247 — Política de cancelación (F2.1b). Ver /cancelacion.
-- Cambio: el alumno también puede cancelar (con devolución íntegra) un ticket que un
-- mentor cogió pero NO respondió dentro del plazo (due_at). Antes solo podía
-- cancelarlo si nadie lo había cogido, y un mentor que lo cogía y no contestaba lo
-- dejaba sin créditos y sin salida.
-- RE-EJECUTABLE (create or replace).

create or replace function public.cancel_ticket(p_student uuid, p_ticket uuid)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare v ticket;
begin
  select * into v from ticket where id = p_ticket for update;
  if v.id is null or v.student_id <> p_student then
    raise exception 'notFound';
  end if;
  -- Cancelable: abierto, sin respuesta del mentor y (libre o con el plazo vencido).
  if v.status <> 'abierto' or v.answered_at is not null
     or (v.mentor_id is not null and (v.due_at is null or v.due_at > now())) then
    raise exception 'cannotCancel';
  end if;
  update ticket set status = 'cancelado', closed_at = now(), updated_at = now()
  where id = p_ticket;
  insert into credit_ledger (student_id, type, amount, product_kind, ticket_id, note)
  values (p_student, 'devolucion', v.credits, v.kind, p_ticket,
          case when v.mentor_id is null then 'Ticket cancelado'
               else 'Ticket cancelado: sin respuesta en plazo' end);
end;
$$;

revoke execute on function public.cancel_ticket(uuid, uuid) from public, anon, authenticated;
grant execute on function public.cancel_ticket(uuid, uuid) to service_role;


-- ========================= seed.sql =========================
-- Tutor247 — Seed de datos iniciales (Fase 1).
-- Catálogo de ciclos/módulos (docs/modelo-negocio-v1.md), RA de ejemplo (0485, 0484),
-- equivalencias catalanas de ejemplo, packs, planes y 3 mentores de prueba.
-- Idempotente: usa ON CONFLICT para poder re-ejecutarse.

-- ═══════════════════════════════ CICLOS ═══════════════════════════════
insert into ciclo (code, name, grade, sort_order) values
  ('SMX',  'Sistemas Microinformáticos y Redes',            'medio',    1),
  ('ASIR', 'Administración de Sistemas Informáticos en Red', 'superior', 2),
  ('DAM',  'Desarrollo de Aplicaciones Multiplataforma',     'superior', 3),
  ('DAW',  'Desarrollo de Aplicaciones Web',                 'superior', 4)
on conflict (code) do nothing;

-- ═══════════════════════════════ MÓDULOS ══════════════════════════════
-- killer = true en los de más suspensos (docs §3).
insert into modulo (code, name, killer) values
  -- Tronco común DAM + DAW (1.º)
  ('0483', 'Sistemas informáticos',                                   false),
  ('0484', 'Bases de datos',                                          true),
  ('0485', 'Programación',                                            true),
  ('0373', 'Lenguajes de marcas y sistemas de gestión de información', true),
  ('0487', 'Entornos de desarrollo',                                  false),
  -- DAM (2.º)
  ('0486', 'Acceso a datos',                                          true),
  ('0488', 'Desarrollo de interfaces',                                false),
  ('0489', 'Programación multimedia y dispositivos móviles',          false),
  ('0490', 'Programación de servicios y procesos',                    false),
  ('0491', 'Sistemas de gestión empresarial',                         false),
  -- DAW (2.º)
  ('0612', 'Desarrollo web en entorno cliente',                       false),
  ('0613', 'Desarrollo web en entorno servidor',                      true),
  ('0614', 'Despliegue de aplicaciones web',                          false),
  ('0615', 'Diseño de interfaces web',                                false),
  -- ASIR
  ('0369', 'Implantación de sistemas operativos',                     false),
  ('0370', 'Planificación y administración de redes',                 true),
  ('0371', 'Fundamentos de hardware',                                 false),
  ('0372', 'Gestión de bases de datos',                               false),
  ('0374', 'Administración de sistemas operativos',                   false),
  ('0375', 'Servicios de red e Internet',                             false),
  ('0376', 'Implantación de aplicaciones web',                        false),
  ('0377', 'Administración de sistemas gestores de bases de datos',   false),
  ('0378', 'Seguridad y alta disponibilidad',                         false),
  -- SMX
  ('0221', 'Montaje y mantenimiento de equipos',                      false),
  ('0222', 'Sistemas operativos monopuesto',                          false),
  ('0223', 'Aplicaciones ofimáticas',                                 false),
  ('0224', 'Sistemas operativos en red',                              false),
  ('0225', 'Redes locales',                                           true),
  ('0226', 'Seguridad informática',                                   false),
  ('0227', 'Servicios en red',                                        false),
  ('0228', 'Aplicaciones web',                                        false)
on conflict (code) do nothing;

-- ═══════════════════════════ CICLO ↔ MÓDULO ═══════════════════════════
-- Helper inline: resuelve ids por código. curso 1/2, 0373 compartido DAM/DAW/ASIR.
insert into ciclo_modulo (ciclo_id, modulo_id, curso)
select c.id, m.id, v.curso
from (values
  -- DAM
  ('DAM','0483',1),('DAM','0484',1),('DAM','0485',1),('DAM','0373',1),('DAM','0487',1),
  ('DAM','0486',2),('DAM','0488',2),('DAM','0489',2),('DAM','0490',2),('DAM','0491',2),
  -- DAW
  ('DAW','0483',1),('DAW','0484',1),('DAW','0485',1),('DAW','0373',1),('DAW','0487',1),
  ('DAW','0612',2),('DAW','0613',2),('DAW','0614',2),('DAW','0615',2),
  -- ASIR
  ('ASIR','0369',1),('ASIR','0370',1),('ASIR','0371',1),('ASIR','0372',1),('ASIR','0373',1),
  ('ASIR','0374',2),('ASIR','0375',2),('ASIR','0376',2),('ASIR','0377',2),('ASIR','0378',2),
  -- SMX
  ('SMX','0221',1),('SMX','0222',1),('SMX','0223',1),('SMX','0225',1),('SMX','0226',1),
  ('SMX','0224',2),('SMX','0227',2),('SMX','0228',2)
) as v(ciclo_code, modulo_code, curso)
join ciclo c on c.code = v.ciclo_code
join modulo m on m.code = v.modulo_code
on conflict (ciclo_id, modulo_id) do nothing;

-- ══════════════════════ RA DE EJEMPLO (0485 y 0484) ═══════════════════
-- Resultados de Aprendizaje orientativos (LOE). A validar/completar con el BOE
-- y el decreto autonómico correspondiente.
insert into ra (modulo_id, code, description, sort_order)
select m.id, v.code, v.descr, v.ord
from (values
  ('0485','RA1','Reconoce la estructura de un programa informático, identificando los elementos del lenguaje.',1),
  ('0485','RA2','Escribe y prueba programas sencillos aplicando los fundamentos de la programación estructurada.',2),
  ('0485','RA3','Escribe y depura código usando las estructuras de control del lenguaje.',3),
  ('0485','RA4','Desarrolla programas organizados en funciones/métodos aplicando programación modular.',4),
  ('0485','RA5','Escribe programas que manipulan información con tipos de datos compuestos (arrays, cadenas, colecciones).',5),
  ('0485','RA6','Desarrolla programas aplicando los principios de la programación orientada a objetos.',6),
  ('0485','RA7','Realiza operaciones de entrada/salida y manejo de ficheros y excepciones.',7),
  ('0484','RA1','Reconoce los elementos de las bases de datos y la utilidad de los sistemas gestores.',1),
  ('0484','RA2','Diseña modelos lógicos normalizados interpretando diagramas entidad-relación.',2),
  ('0484','RA3','Realiza el diseño físico con el lenguaje de definición de datos (DDL).',3),
  ('0484','RA4','Consulta información almacenada usando el lenguaje de manipulación de datos (DML).',4),
  ('0484','RA5','Modifica la información almacenada mediante sentencias DML.',5),
  ('0484','RA6','Asegura la información analizando usuarios, privilegios y copias de seguridad.',6),
  ('0484','RA7','Desarrolla procedimientos almacenados y disparadores con el lenguaje del SGBD.',7)
) as v(modulo_code, code, descr, ord)
join modulo m on m.code = v.modulo_code
on conflict (modulo_id, code) do nothing;

-- RA de los demás módulos killer (orientativos, a validar). Misma fuente que
-- supabase/data/ra-killer.json (cargable con scripts/seed-ra.mjs).
insert into ra (modulo_id, code, description, sort_order)
select m.id, v.code, v.descr, v.ord
from (values
  ('0373','RA1','Reconoce las características de los lenguajes de marcas analizando e interpretando fragmentos de código.',1),
  ('0373','RA2','Utiliza lenguajes de marcas para la transmisión de información a través de la web, analizando la estructura de los documentos.',2),
  ('0373','RA3','Genera canales de contenidos analizando y utilizando tecnologías de sindicación.',3),
  ('0373','RA4','Establece mecanismos de validación para documentos XML definiendo su sintaxis y estructura.',4),
  ('0373','RA5','Realiza conversiones sobre documentos XML utilizando técnicas y herramientas de procesamiento.',5),
  ('0373','RA6','Gestiona información en formato XML usando tecnologías de almacenamiento y lenguajes de consulta.',6),
  ('0373','RA7','Trabaja con sistemas empresariales de gestión de información: importación, integración, aseguramiento y extracción.',7),
  ('0613','RA1','Selecciona las arquitecturas y tecnologías de programación web en entorno servidor, analizando sus capacidades.',1),
  ('0613','RA2','Escribe sentencias ejecutables por un servidor web integrando el código en lenguajes de marcas.',2),
  ('0613','RA3','Escribe bloques de sentencias embebidos en lenguajes de marcas usando las estructuras de programación.',3),
  ('0613','RA4','Desarrolla aplicaciones web embebidas en lenguajes de marcas incorporando funcionalidades según especificaciones.',4),
  ('0613','RA5','Desarrolla aplicaciones web separando el código de presentación de la lógica de negocio.',5),
  ('0613','RA6','Desarrolla aplicaciones de acceso a almacenes de datos manteniendo la seguridad y la integridad de la información.',6),
  ('0613','RA7','Desarrolla servicios web reutilizables y accesibles mediante protocolos web, verificando su funcionamiento.',7),
  ('0613','RA8','Genera páginas web dinámicas usando tecnologías del servidor que añaden código al lenguaje de marcas.',8),
  ('0613','RA9','Desarrolla aplicaciones web híbridas usando frameworks de servidor y repositorios heterogéneos de información.',9),
  ('0486','RA1','Desarrolla aplicaciones que gestionan información almacenada en ficheros usando clases específicas.',1),
  ('0486','RA2','Desarrolla aplicaciones que gestionan información en bases de datos relacionales usando mecanismos de conexión.',2),
  ('0486','RA3','Gestiona la persistencia de los datos con herramientas de mapeo objeto-relacional (ORM).',3),
  ('0486','RA4','Desarrolla aplicaciones sobre bases de datos objeto-relacionales y orientadas a objetos.',4),
  ('0486','RA5','Desarrolla aplicaciones que gestionan información en bases de datos nativas XML.',5),
  ('0486','RA6','Programa componentes de acceso a datos usando herramientas de desarrollo.',6),
  ('0370','RA1','Reconoce la estructura de las redes de datos identificando sus elementos y principios de funcionamiento.',1),
  ('0370','RA2','Integra ordenadores y periféricos en redes cableadas e inalámbricas, evaluando su funcionamiento.',2),
  ('0370','RA3','Administra conmutadores estableciendo opciones de configuración para su integración en la red.',3),
  ('0370','RA4','Administra las funciones básicas de un router estableciendo opciones de configuración.',4),
  ('0370','RA5','Configura redes locales virtuales (VLAN) identificando su campo de aplicación.',5),
  ('0370','RA6','Realiza tareas avanzadas de administración de red usando protocolos dinámicos de encaminamiento.',6),
  ('0370','RA7','Conecta redes privadas a redes públicas identificando y aplicando diferentes tecnologías.',7),
  ('0225','RA1','Reconoce la estructura de redes locales cableadas describiendo la funcionalidad de sus componentes.',1),
  ('0225','RA2','Despliega el cableado de una red local interpretando especificaciones y aplicando técnicas de montaje.',2),
  ('0225','RA3','Interconecta equipos en redes locales cableadas aplicando estándares de cableado y montaje de conectores.',3),
  ('0225','RA4','Instala equipos en red describiendo sus prestaciones y aplicando técnicas de montaje.',4),
  ('0225','RA5','Mantiene una red local relacionando disfunciones con sus causas.',5),
  ('0225','RA6','Cumple las normas de prevención de riesgos laborales y de protección ambiental.',6)
) as v(modulo_code, code, descr, ord)
join modulo m on m.code = v.modulo_code
on conflict (modulo_id, code) do nothing;

-- ════════════════ EQUIVALENCIAS CATALANAS (EJEMPLO, A VALIDAR) ═════════
-- Mapeo orientativo código estatal ↔ M catalán. Completar con la numeración real.
insert into modulo_equiv_cat (modulo_id, codigo_cat, comunidad)
select m.id, v.codigo_cat, 'catalunya'
from (values
  ('0485','M03'),
  ('0484','M02'),
  ('0373','M05')
) as v(modulo_code, codigo_cat)
join modulo m on m.code = v.modulo_code;

-- ═══════════════════════════════ PACKS ════════════════════════════════
insert into pack (slug, name, price_eur, credits, bonus_pct, sort_order) values
  ('arranque', 'Arranque', 30,  30,  0,  1),
  ('estandar', 'Estándar', 100, 110, 10, 2),
  ('modulo',   'Módulo',   200, 230, 15, 3),
  ('curso',    'Curso',    400, 480, 20, 4)
on conflict (slug) do nothing;

-- ═══════════════════════════════ PLANES ═══════════════════════════════
-- Precios de Fase 1 = extremo bajo de los rangos de los docs (a validar).
insert into plan (kind, name, price_eur_month, features, sort_order) values
  ('gratis', 'Gratis', 0,
    '["Diagnóstico + Mapa de Dominio","10 consultas IA/semana"]'::jsonb, 1),
  ('companero', 'Compañero', 9.90,
    '["Bit ilimitado","Plan inverso vivo","Empujón diario","Quizzes","Modo examen"]'::jsonb, 2),
  ('acompana', 'Acompaña', 79,
    '["Tutor de referencia (check-in semanal)","Bit","Informes a la familia","1 sesión técnica/mes"]'::jsonb, 3),
  ('acompana_plus', 'Acompaña+', 149,
    '["Todo lo de Acompaña","4 sesiones técnicas/mes","Tickets Express incluidos","Simulacros"]'::jsonb, 4)
on conflict (kind) do nothing;

-- ══════════════════════════ MENTORES DE PRUEBA ════════════════════════
-- Crea usuarios en auth.users (el trigger crea su profile con rol 'mentor') y
-- luego su mentor_profile (verificado) y los módulos que imparten.
-- Contraseña dev para los tres: Tutor247Dev!  — SOLO para desarrollo local.
do $$
declare
  m record;
begin
  for m in
    select * from (values
      ('11111111-1111-1111-1111-111111111111'::uuid, 'laura.gomez@tutor247.dev', 'Laura Gómez',
       'experto', 'Especialista en 0485 Programación y 0486 Acceso a datos', array['es'],
       array['0485','0486','0484']),
      ('22222222-2222-2222-2222-222222222222'::uuid, 'marc.soler@tutor247.dev', 'Marc Soler',
       'pro', 'Full-stack · desarrollo web servidor y cliente (DAW)', array['es','ca'],
       array['0613','0612','0373']),
      ('33333333-3333-3333-3333-333333333333'::uuid, 'david.porti@tutor247.dev', 'David Porti',
       'mentor', 'Sysadmin y redes · ASIR/SMX', array['es','ca'],
       array['0370','0225','0372'])
    ) as t(id, email, full_name, lvl, headline, langs, modules)
  loop
    -- auth.users (dispara handle_new_user → crea profile rol mentor)
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous,
      -- Columnas de token: GoTrue las lee como string NO nullable; deben ser ''
      -- (si quedan NULL, el login falla con "Database error querying schema").
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token,
      reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', m.id, 'authenticated', 'authenticated',
      m.email, extensions.crypt('Tutor247Dev!', extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', m.full_name, 'role', 'mentor'),
      false, false,
      '', '', '', '', '', '', '', ''
    ) on conflict (id) do nothing;

    -- identidad email (permite login en local)
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), m.id,
      jsonb_build_object('sub', m.id::text, 'email', m.email),
      'email', m.id::text, now(), now(), now()
    ) on conflict do nothing;

    -- mentor_profile verificado
    insert into mentor_profile (
      profile_id, level, status, headline, languages, response_time_minutes, verified_at
    ) values (
      m.id, m.lvl::mentor_level, 'verificado', m.headline, m.langs, 120, now()
    ) on conflict (profile_id) do nothing;

    -- módulos que imparte
    insert into mentor_modulo (mentor_id, modulo_id)
    select m.id, mo.id from modulo mo where mo.code = any (m.modules)
    on conflict do nothing;
  end loop;
end $$;
