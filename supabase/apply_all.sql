-- Tutor247 — aplicar todo (RE-EJECUTABLE: limpia y recrea). Pegar en SQL Editor.

-- ========================= _reset_preamble.sql =========================
-- Preámbulo de limpieza: hace apply_all.sql re-ejecutable desde cualquier estado
-- parcial. SOLO toca objetos propios de Tutor247. No forma parte de las migraciones
-- versionadas (que se aplican una vez cada una vía CLI/MCP).

drop view if exists public.mentor_public;

drop table if exists
  public.slot_offer, public.notification, public.module_alert, public.availability_off, public.availability, public.aula_stroke, public.aula_doc, public.xp_event, public.quiz, public.material, public.referral_code,
  public.student_activity, public.checkin, public.tutor_assignment, public.ra_evidence,
  public.ra_progress, public.lead, public.mentor_earning, public.ticket_message, public.product_price,
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
drop function if exists public.grant_welcome_credits() cascade;
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
drop function if exists public.block_evidence_mutation() cascade;
drop function if exists public.is_tutor_of(uuid) cascade;
drop function if exists public.nivel_progress(nivel_dominio) cascade;
drop function if exists public.apply_ra_evidence(uuid, uuid, evidencia_kind, nivel_dominio, boolean, text, uuid, uuid) cascade;
drop function if exists public.touch_activity() cascade;
drop function if exists public.save_self_assessment(text, jsonb) cascade;
drop function if exists public.assess_ra(uuid, uuid, nivel_dominio, boolean, text) cascade;
drop function if exists public.booking_ra_map(uuid) cascade;
drop function if exists public.my_tutor_students() cascade;
drop function if exists public.my_tutor_name() cascade;
drop function if exists public.admin_make_tutor(text) cascade;
drop function if exists public.admin_assign_tutor(uuid, uuid) cascade;
drop function if exists public.block_xp_mutation() cascade;
drop function if exists public.grant_xp(uuid, text, int, text) cascade;
drop function if exists public.xp_from_evidence() cascade;
drop function if exists public.xp_from_booking() cascade;
drop function if exists public.search_material(uuid, text, uuid[], int) cascade;
drop function if exists public.my_referral_code() cascade;
drop function if exists public.my_referrals() cascade;
drop function if exists public.reward_referral(uuid) cascade;
drop function if exists public.is_booking_party(uuid) cascade;
drop function if exists public.is_booking_party_path(text) cascade;
drop function if exists public.guard_aula_doc() cascade;
drop function if exists public.guard_availability() cascade;
drop function if exists public.fits_agenda(uuid, timestamptz, timestamptz) cascade;
drop function if exists public.mentor_slots(uuid, product_kind, int) cascade;
drop function if exists public.agenda_overlap(uuid, uuid) cascade;
drop function if exists public.match_mentors(text, int) cascade;
drop function if exists public.mentors_with_slots(int) cascade;
drop function if exists public.notify(uuid, text, jsonb, text, text) cascade;
drop function if exists public.mark_notifications_read(uuid[]) cascade;
drop function if exists public.alert_matches(public.module_alert, uuid) cascade;
drop function if exists public.close_alert_with(public.module_alert, uuid) cascade;
drop function if exists public.process_alerts_for_mentor(uuid) cascade;
drop function if exists public.trg_alerts_mentor_modulo() cascade;
drop function if exists public.trg_alerts_mentor_status() cascade;
drop function if exists public.trg_alerts_availability() cascade;
drop function if exists public.trg_alert_created() cascade;
drop function if exists public.create_module_alert(text, text, boolean) cascade;
drop function if exists public.cancel_module_alert(uuid) cascade;
drop function if exists public.trg_booking_notify() cascade;
drop function if exists public.trg_ticket_message_notify() cascade;
drop function if exists public.my_module_demand() cascade;
drop function if exists public.public_demand() cascade;
drop function if exists public.offer_slot(uuid, product_kind, timestamp, text) cascade;
drop function if exists public.withdraw_slot_offer(uuid) cascade;
drop function if exists public.respond_slot_offer(uuid, uuid, boolean) cascade;

drop type if exists
  consent_type, plan_kind, product_kind, ledger_type, ra_status,
  mentor_status, mentor_level, student_mode, user_role, grade_level,
  lead_kind, lead_status, nivel_dominio, evidencia_kind
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


-- ========================= migrations/20261009090100_leads_welcome.sql =========================
-- Checkpoint Academy — Contactos sin cuenta (leads) y créditos de bienvenida.
-- RE-EJECUTABLE (if not exists / drop ... if exists / create or replace).
--
-- 1) lead: "Pregunta gratis" (duda de un alumno sin cuenta) y "Quiero que me llaméis"
--    (familias). Se insertan SOLO desde el servidor con service role (la web pública no
--    tiene permiso de escritura); los lee y gestiona el admin.
-- 2) Bienvenida: al crear el perfil de alumno se le regalan 3 créditos (una duda por
--    ticket normal) con caducidad de 12 meses. Un solo bonus de bienvenida por alumno.

-- ───────────────────────────── 1) Leads ─────────────────────────────
do $$ begin
  create type lead_kind as enum ('pregunta', 'llamada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lead_status as enum ('nuevo', 'contactado', 'cerrado');
exception when duplicate_object then null; end $$;

create table if not exists lead (
  id             uuid primary key default gen_random_uuid(),
  kind           lead_kind not null,
  status         lead_status not null default 'nuevo',
  name           text,
  contact        text not null,               -- email o teléfono
  quien          text check (quien in ('alumno', 'familia')),
  modulo_code    text,                        -- referencia informativa (sin FK)
  message        text,
  preferred_time text,
  consent        boolean not null check (consent),
  locale         text not null default 'es',
  admin_note     text,
  created_at     timestamptz not null default now(),
  handled_at     timestamptz
);

create index if not exists lead_status_idx on lead (status, created_at desc);

alter table lead enable row level security;
-- Sin políticas para anon/authenticated: nadie lee ni escribe desde el cliente.
-- Solo el admin (con su sesión) puede consultarlos y actualizar el estado.
drop policy if exists lead_admin on lead;
create policy lead_admin on lead
  for all using (public.is_admin()) with check (public.is_admin());

-- ─────────────────────── 2) Créditos de bienvenida ───────────────────────
-- Un bonus de bienvenida por alumno (marca: note = 'bienvenida').
create unique index if not exists cl_bienvenida_once
  on credit_ledger (student_id) where type = 'bonus' and note = 'bienvenida';

create or replace function public.grant_welcome_credits()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into credit_ledger (student_id, type, amount, expires_at, note)
  values (new.profile_id, 'bonus', 3, now() + interval '12 months', 'bienvenida')
  on conflict do nothing;
  return new;
end;
$$;

revoke execute on function public.grant_welcome_credits() from public, anon, authenticated;

drop trigger if exists student_profile_welcome on student_profile;
create trigger student_profile_welcome
  after insert on student_profile
  for each row execute function public.grant_welcome_credits();


-- ========================= migrations/20261010090100_mapa_tutor.sql =========================
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


-- ========================= migrations/20261010090200_logros_bit_referidos.sql =========================
-- Tutor247 — Fase 8: logros (XP inmutable), quizzes de Bit, Bit en el panel (conversaciones
-- guardadas + banco de materiales por RA para RAG) y referidos.
-- Reglas (docs/modelo-negocio-v1.md §8, docs/capa-ia-v1.md §1-§6, CLAUDE.md):
--   · XP «por demostrar que sabes, no por horas conectado»: solo evidencias, quizzes
--     superados, sellos y sesiones hechas. Ledger de XP append-only, una vez por hecho.
--   · Racha semanal e insignias se CALCULAN (no se guardan).
--   · Quiz: las respuestas correctas nunca llegan al cliente (solo servidor).
--   · Bit responde con el banco de material revisado por mentores (RAG por módulo/RA).
--   · Referidos: 20 cr para quien invita y 20 para el invitado cuando este compra su
--     primer pack; máximo 200 cr por referidos al trimestre (por quien invita).
-- RE-EJECUTABLE.

-- ─────────────────────────────── XP ───────────────────────────────
create table if not exists xp_event (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references student_profile (profile_id) on delete cascade,
  kind       text not null check (kind in ('autoevaluacion', 'sello', 'dominio', 'quiz', 'sesion')),
  points     int not null check (points > 0),
  ref        text not null, -- id del hecho (RA, quiz, reserva): evita duplicados
  created_at timestamptz not null default now(),
  unique (student_id, kind, ref)
);
create index if not exists xp_event_student_idx on xp_event (student_id, created_at desc);

create or replace function public.block_xp_mutation()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' then raise exception 'xp_event es inmutable'; end if;
  return old;
end;
$$;
drop trigger if exists xp_event_immutable on xp_event;
create trigger xp_event_immutable before update on xp_event
  for each row execute function public.block_xp_mutation();

alter table xp_event enable row level security;
drop policy if exists xp_read on xp_event;
create policy xp_read on xp_event for select using (
  student_id = auth.uid() or public.is_tutor_of(student_id)
  or public.family_can_see(student_id) or public.is_admin()
);
revoke insert, update, delete on xp_event from anon, authenticated;

create or replace function public.grant_xp(p_student uuid, p_kind text, p_points int, p_ref text)
returns void language sql volatile security definer set search_path = public as $$
  insert into xp_event (student_id, kind, points, ref) values (p_student, p_kind, p_points, p_ref)
  on conflict do nothing
$$;

-- XP desde las evidencias del Mapa: 5 por RA autoevaluado (la primera vez), 50 por
-- sello «Lo entiendo» y 30 cuando una persona confirma «Lo domino».
create or replace function public.xp_from_evidence()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'autoevaluacion' then
    perform public.grant_xp(new.student_id, 'autoevaluacion', 5, new.ra_id::text);
  end if;
  if new.sealed then
    perform public.grant_xp(new.student_id, 'sello', 50, new.ra_id::text);
  end if;
  if new.nivel = 'domino' and new.kind in ('sesion', 'ticket', 'tutor', 'ajuste') then
    perform public.grant_xp(new.student_id, 'dominio', 30, new.ra_id::text);
  end if;
  return new;
end;
$$;
drop trigger if exists ra_evidence_xp on ra_evidence;
create trigger ra_evidence_xp after insert on ra_evidence
  for each row execute function public.xp_from_evidence();

-- 25 XP por sesión hecha.
create or replace function public.xp_from_booking()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'hecha' and old.status is distinct from 'hecha' then
    perform public.grant_xp(new.student_id, 'sesion', 25, new.id::text);
  end if;
  return new;
end;
$$;
drop trigger if exists booking_xp on booking;
create trigger booking_xp after update on booking
  for each row execute function public.xp_from_booking();

-- ─────────────────────────────── Quiz ───────────────────────────────
-- Lo genera Bit (servidor) para un RA. `questions` lleva las respuestas: el cliente
-- no lee la tabla; el servidor (service role) entrega las preguntas sin respuesta y
-- corrige.
create table if not exists quiz (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references student_profile (profile_id) on delete cascade,
  ra_id       uuid not null references ra (id) on delete cascade,
  questions   jsonb not null,
  answers     jsonb,
  score       int,
  total       int not null,
  created_at  timestamptz not null default now(),
  answered_at timestamptz
);
create index if not exists quiz_student_idx on quiz (student_id, created_at desc);
alter table quiz enable row level security;
-- Sin políticas para authenticated: solo service role (servidor).
revoke all on quiz from anon, authenticated;

-- ─────────────────── Bit: conversaciones guardadas ───────────────────
alter table conversation add column if not exists title      text;
alter table conversation add column if not exists updated_at timestamptz not null default now();
create index if not exists conversation_student_idx on conversation (student_id, updated_at desc);
-- Las escribe el servidor (service role) tras autenticar; el alumno solo lee.
drop policy if exists conv_own on conversation;
create policy conv_own on conversation for select using (student_id = auth.uid());
revoke insert, update, delete on conversation, message from anon, authenticated;
alter table message drop constraint if exists message_sender_chk;
alter table message add constraint message_sender_chk check (sender in ('alumno', 'bit', 'mentor', 'sistema'));

-- ──────────────────── Banco de material por RA (RAG) ────────────────────
create table if not exists material (
  id         uuid primary key default gen_random_uuid(),
  modulo_id  uuid not null references modulo (id) on delete cascade,
  ra_id      uuid references ra (id) on delete set null,
  title      text not null check (char_length(title) between 3 and 140),
  body       text not null check (char_length(body) between 20 and 8000),
  author_id  uuid references profile (id) on delete set null,
  reviewed   boolean not null default false, -- solo lo revisado alimenta a Bit
  created_at timestamptz not null default now(),
  tsv        tsvector generated always as (
               to_tsvector('spanish', coalesce(title, '') || ' ' || coalesce(body, ''))
             ) stored
);
create index if not exists material_tsv_idx on material using gin (tsv);
create index if not exists material_modulo_idx on material (modulo_id);
alter table material enable row level security;

-- Leer: lo revisado, cualquiera con sesión; el autor ve lo suyo; admin todo.
drop policy if exists mat_read on material;
create policy mat_read on material for select using (
  reviewed or author_id = auth.uid() or public.is_admin()
);
-- Escribir: mentor verificado que imparte el módulo (queda sin revisar) o admin.
drop policy if exists mat_mentor_insert on material;
create policy mat_mentor_insert on material for insert with check (
  author_id = auth.uid() and reviewed = false and public.mentor_teaches(modulo_id)
);
drop policy if exists mat_mentor_update on material;
create policy mat_mentor_update on material for update
  using (author_id = auth.uid() and reviewed = false)
  with check (author_id = auth.uid() and reviewed = false);
drop policy if exists mat_mentor_delete on material;
create policy mat_mentor_delete on material for delete using (author_id = auth.uid() and reviewed = false);
drop policy if exists mat_admin on material;
create policy mat_admin on material for all using (public.is_admin()) with check (public.is_admin());

-- Búsqueda para Bit: material revisado del módulo, priorizando los RA indicados.
create or replace function public.search_material(p_modulo uuid, p_query text, p_ras uuid[], p_limit int)
returns table (id uuid, ra_code text, title text, body text, rank real)
language sql stable security definer set search_path = public as $$
  with q as (select websearch_to_tsquery('spanish', coalesce(p_query, '')) as tq)
  select m.id, r.code, m.title, m.body,
         (ts_rank(m.tsv, q.tq) + case when m.ra_id = any(coalesce(p_ras, '{}')) then 0.2 else 0 end)::real
  from material m cross join q
  left join ra r on r.id = m.ra_id
  where m.reviewed and m.modulo_id = p_modulo
    and (m.tsv @@ q.tq or m.ra_id = any(coalesce(p_ras, '{}')))
  order by 5 desc, m.created_at desc
  limit least(greatest(coalesce(p_limit, 4), 1), 8)
$$;

-- ─────────────────────────────── Referidos ───────────────────────────────
create table if not exists referral_code (
  profile_id uuid primary key references student_profile (profile_id) on delete cascade,
  code       text not null unique check (code ~ '^[A-Z0-9]{6,12}$'),
  created_at timestamptz not null default now()
);
alter table referral_code enable row level security;
drop policy if exists rc_own on referral_code;
create policy rc_own on referral_code for select using (profile_id = auth.uid() or public.is_admin());
revoke insert, update, delete on referral_code from anon, authenticated;

-- Un invitado solo cuenta una vez y nadie se invita a sí mismo.
create unique index if not exists referral_invited_unique on referral (invited_id) where invited_id is not null;
alter table referral drop constraint if exists referral_self_chk;
alter table referral add constraint referral_self_chk check (invited_id is null or invited_id <> referrer_id);
alter table referral add column if not exists rewarded_at timestamptz;
-- Solo el servidor (trigger de registro y recompensa) escribe referidos.
drop policy if exists ref_own on referral;
create policy ref_own on referral for select using (referrer_id = auth.uid());
revoke insert, update, delete on referral from anon, authenticated;

-- Código del alumno actual (lo crea la primera vez).
create or replace function public.my_referral_code()
returns text
language plpgsql volatile security definer set search_path = public as $$
declare v text;
begin
  if not exists (select 1 from student_profile where profile_id = auth.uid()) then
    raise exception 'noProfile';
  end if;
  select code into v from referral_code where profile_id = auth.uid();
  if v is not null then return v; end if;
  loop
    v := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    begin
      insert into referral_code (profile_id, code) values (auth.uid(), v);
      return v;
    exception when unique_violation then
      if exists (select 1 from referral_code where profile_id = auth.uid()) then
        select code into v from referral_code where profile_id = auth.uid();
        return v;
      end if;
    end;
  end loop;
end;
$$;

-- Mis invitados: nombre de pila y estado (sin email: anti-bypass/privacidad).
create or replace function public.my_referrals()
returns table (first_name text, rewarded boolean, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select split_part(coalesce(p.full_name, ''), ' ', 1), r.rewarded, r.created_at
  from referral r left join profile p on p.id = r.invited_id
  where r.referrer_id = auth.uid()
  order by r.created_at desc
$$;

-- Registro: si raw_user_meta_data.ref es un código válido, se apunta el referido.
-- (Mantiene la regla de role_guards: solo alumno/familia/mentor auto-asignables.)
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  requested text := new.raw_user_meta_data ->> 'role';
  v_ref     uuid;
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
  select profile_id into v_ref from public.referral_code
  where code = upper(coalesce(new.raw_user_meta_data ->> 'ref', ''));
  if v_ref is not null and v_ref <> new.id then
    insert into public.referral (referrer_id, invited_email, invited_id)
    values (v_ref, null, new.id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

-- Recompensa al comprar el invitado su PRIMER pack. La llama el servidor tras la
-- compra (mock hoy; webhook de Stripe después). Devuelve los créditos dados a cada uno.
create or replace function public.reward_referral(p_invited uuid)
returns int
language plpgsql volatile security definer set search_path = public as $$
declare
  v       referral;
  v_bonus constant int := 20;
  v_tope  constant int := 200;
  v_dado  int;
  v_exp   timestamptz := now() + interval '12 months';
begin
  select * into v from referral where invited_id = p_invited and not rewarded for update;
  if v.id is null then return 0; end if;
  -- Solo el primer pack del invitado.
  if (select count(*) from credit_ledger where student_id = p_invited and type = 'compra_pack') <> 1 then
    return 0;
  end if;
  -- El invitado debe ser alumno; quien invita, también (tiene saldo).
  if not exists (select 1 from student_profile where profile_id = v.referrer_id) then return 0; end if;

  select coalesce(sum(amount), 0) into v_dado from credit_ledger
  where student_id = v.referrer_id and type = 'bonus' and note = 'referido'
    and created_at > now() - interval '3 months';

  perform public.lock_student_credits(p_invited);
  insert into credit_ledger (student_id, type, amount, expires_at, note)
  values (p_invited, 'bonus', v_bonus, v_exp, 'referido_invitado');
  if v_dado + v_bonus <= v_tope then
    perform public.lock_student_credits(v.referrer_id);
    insert into credit_ledger (student_id, type, amount, expires_at, note)
    values (v.referrer_id, 'bonus', v_bonus, v_exp, 'referido');
  end if;
  update referral set rewarded = true, rewarded_at = now() where id = v.id;
  return v_bonus;
end;
$$;

-- ─────────────────────────── Permisos de RPC ───────────────────────────
revoke execute on function public.grant_xp(uuid, text, int, text) from public, anon, authenticated;
revoke execute on function public.reward_referral(uuid) from public, anon, authenticated;
grant execute on function public.grant_xp(uuid, text, int, text) to service_role;
grant execute on function public.reward_referral(uuid) to service_role;

revoke execute on function public.search_material(uuid, text, uuid[], int) from public, anon;
revoke execute on function public.my_referral_code() from public, anon;
revoke execute on function public.my_referrals() from public, anon;
grant execute on function public.search_material(uuid, text, uuid[], int) to authenticated, service_role;
grant execute on function public.my_referral_code() to authenticated;
grant execute on function public.my_referrals() to authenticated;


-- ========================= migrations/20261010090300_aula.sql =========================
-- Tutor247 — Fase 9: aula integrada (sustituye a la sala pública de Jitsi).
-- Reglas (CLAUDE.md, docs/capa-ia-v1.md §6, DISENO.md §8):
--   · Solo entran el alumno y el mentor de la reserva, y solo cerca de la hora.
--   · Editor de código compartido y pizarra en tiempo real (Supabase Realtime: las
--     postgres_changes respetan la RLS de cada tabla).
--   · Ficheros en Storage privado (bucket `aula`, carpeta = id de la reserva).
--   · Modo Examen: lo activa SOLO el mentor (sin pegar en el editor, sin Bit).
--   · Grabación: no se hace (pendiente de decisión y consentimiento de menores).
--   · El resumen de la sesión lo genera Bit a petición del mentor (servidor).
-- RE-EJECUTABLE.

-- ¿El usuario actual es alumno o mentor de la reserva (confirmada o hecha)?
create or replace function public.is_booking_party(p_booking uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from booking b
    where b.id = p_booking
      and (b.student_id = auth.uid() or b.mentor_id = auth.uid())
      and b.status in ('confirmada', 'hecha')
  )
$$;

-- Variante para rutas de Storage ("<uuid>/fichero"): no revienta con texto no-uuid.
create or replace function public.is_booking_party_path(p_folder text)
returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  if p_folder !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return public.is_booking_party(p_folder::uuid);
end;
$$;

-- Datos de la sala y resumen de la sesión.
alter table booking add column if not exists aula_room  text;        -- sala de Daily (si se usa)
alter table booking add column if not exists summary    text;        -- resumen (Bit + mentor)
alter table booking add column if not exists summary_at timestamptz;

-- ─────────────────────────── Editor compartido ───────────────────────────
create table if not exists aula_doc (
  booking_id uuid primary key references booking (id) on delete cascade,
  code       text not null default '' check (char_length(code) <= 50000),
  language   text not null default 'java' check (language in ('java', 'python', 'sql', 'javascript', 'html', 'bash', 'texto')),
  exam_mode  boolean not null default false,
  updated_by uuid references profile (id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table aula_doc enable row level security;
drop policy if exists ad_party on aula_doc;
create policy ad_party on aula_doc for all
  using (public.is_booking_party(booking_id))
  with check (public.is_booking_party(booking_id));

-- El Modo Examen solo lo cambia el mentor de la reserva; updated_by = quien escribe.
create or replace function public.guard_aula_doc()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    new.updated_by := auth.uid();
    new.updated_at := now();
    if (tg_op = 'INSERT' and new.exam_mode)
       or (tg_op = 'UPDATE' and new.exam_mode is distinct from old.exam_mode) then
      if not exists (select 1 from booking where id = new.booking_id and mentor_id = auth.uid()) then
        raise exception 'onlyMentor';
      end if;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists aula_doc_guard on aula_doc;
create trigger aula_doc_guard before insert or update on aula_doc
  for each row execute function public.guard_aula_doc();

-- ──────────────────────────────── Pizarra ────────────────────────────────
create table if not exists aula_stroke (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid not null references booking (id) on delete cascade,
  author_id  uuid not null default auth.uid() references profile (id) on delete cascade,
  points     jsonb not null, -- [[x,y],…] normalizados 0–1
  color      text not null default '#2EF2FF' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  width      int not null default 3 check (width between 1 and 24),
  created_at timestamptz not null default now(),
  check (jsonb_typeof(points) = 'array' and jsonb_array_length(points) between 1 and 2000)
);
create index if not exists aula_stroke_booking_idx on aula_stroke (booking_id, created_at);
alter table aula_stroke enable row level security;
drop policy if exists as_read on aula_stroke;
create policy as_read on aula_stroke for select using (public.is_booking_party(booking_id));
drop policy if exists as_insert on aula_stroke;
create policy as_insert on aula_stroke for insert
  with check (author_id = auth.uid() and public.is_booking_party(booking_id));
drop policy if exists as_delete on aula_stroke;
create policy as_delete on aula_stroke for delete using (public.is_booking_party(booking_id));

-- Tiempo real: las dos tablas en la publicación de Supabase Realtime.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and tablename = 'aula_doc') then
      alter publication supabase_realtime add table public.aula_doc;
    end if;
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and tablename = 'aula_stroke') then
      alter publication supabase_realtime add table public.aula_stroke;
    end if;
  end if;
end $$;
-- Los DELETE de la pizarra (borrar todo) necesitan la fila completa en el evento.
alter table aula_stroke replica identity full;

-- ─────────────────────────────── Ficheros ───────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('aula', 'aula', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = 10485760;

drop policy if exists aula_files_read on storage.objects;
create policy aula_files_read on storage.objects for select to authenticated
  using (bucket_id = 'aula' and public.is_booking_party_path((storage.foldername(name))[1]));
drop policy if exists aula_files_insert on storage.objects;
create policy aula_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'aula' and public.is_booking_party_path((storage.foldername(name))[1]));
drop policy if exists aula_files_delete on storage.objects;
create policy aula_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'aula' and public.is_booking_party_path((storage.foldername(name))[1]));

revoke execute on function public.is_booking_party(uuid) from public, anon;
revoke execute on function public.is_booking_party_path(text) from public, anon;
grant execute on function public.is_booking_party(uuid) to authenticated;
grant execute on function public.is_booking_party_path(text) to authenticated;


-- ========================= migrations/20261012090100_agenda.sql =========================
-- Fase A (agenda): disponibilidad semanal recurrente en hora de Madrid + días bloqueados.
-- El mentor publica franjas (lun 18:00–21:00…); el alumno reserva solo huecos libres
-- (franja − reservas activas − bloqueos, ≥ 3 h de antelación). Huecos en rejilla de
-- 30 min: flash ocupa un hueco de 30 (sesión de 25), 1:1 ocupa 60.
-- Mentor sin agenda publicada → se mantiene el flujo antiguo (el alumno propone hora).
-- La tabla es por perfil: el alumno guardará aquí sus franjas preferidas (fase B).
-- RE-EJECUTABLE.

create table if not exists public.availability (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profile(id) on delete cascade,
  weekday     smallint not null check (weekday between 1 and 7), -- ISO: 1 = lunes
  start_time  time not null,
  end_time    time not null, -- '24:00' = medianoche
  created_at  timestamptz not null default now(),
  constraint availability_range check (end_time > start_time),
  constraint availability_grid check (
    extract(second from start_time) = 0 and extract(minute from start_time) in (0, 30)
    and extract(second from end_time) = 0 and extract(minute from end_time) in (0, 30)
  )
);
create index if not exists availability_profile_idx on public.availability (profile_id, weekday);

create table if not exists public.availability_off (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profile(id) on delete cascade,
  from_day    date not null,
  to_day      date not null,
  created_at  timestamptz not null default now(),
  constraint availability_off_range check (to_day >= from_day and to_day - from_day <= 120)
);
create index if not exists availability_off_profile_idx on public.availability_off (profile_id, to_day);

-- Al añadir una franja se fusiona con las que se solapan o tocan el mismo día
-- (18–19 + 19–20 → 18–20), para que una sesión de 18:30 quepa. Límite: 40 franjas.
create or replace function public.guard_availability()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_start time;
  v_end   time;
begin
  if (select count(*) from availability where profile_id = new.profile_id) >= 40 then
    raise exception 'tooMany';
  end if;
  select least(new.start_time, min(start_time)), greatest(new.end_time, max(end_time))
    into v_start, v_end
  from availability
  where profile_id = new.profile_id and weekday = new.weekday
    and start_time <= new.end_time and end_time >= new.start_time;
  if v_start is not null then
    delete from availability
    where profile_id = new.profile_id and weekday = new.weekday
      and start_time <= new.end_time and end_time >= new.start_time;
    new.start_time := v_start;
    new.end_time := v_end;
  end if;
  return new;
end;
$$;

drop trigger if exists availability_merge on public.availability;
create trigger availability_merge before insert on public.availability
  for each row execute function public.guard_availability();

-- Sin edición: se borra y se vuelve a crear.
alter table public.availability enable row level security;
alter table public.availability_off enable row level security;

drop policy if exists av_own_select on public.availability;
create policy av_own_select on public.availability for select
  using (profile_id = auth.uid() or public.is_admin());
drop policy if exists av_own_insert on public.availability;
create policy av_own_insert on public.availability for insert
  with check (profile_id = auth.uid());
drop policy if exists av_own_delete on public.availability;
create policy av_own_delete on public.availability for delete
  using (profile_id = auth.uid());

drop policy if exists avo_own_select on public.availability_off;
create policy avo_own_select on public.availability_off for select
  using (profile_id = auth.uid() or public.is_admin());
drop policy if exists avo_own_insert on public.availability_off;
create policy avo_own_insert on public.availability_off for insert
  with check (profile_id = auth.uid() and to_day >= (now() at time zone 'Europe/Madrid')::date);
drop policy if exists avo_own_delete on public.availability_off;
create policy avo_own_delete on public.availability_off for delete
  using (profile_id = auth.uid());

-- ¿La sesión [p_start, p_end) cabe entera en una franja del mentor y no cae en un día
-- bloqueado? (Hora local de Madrid.)
create or replace function public.fits_agenda(p_mentor uuid, p_start timestamptz, p_end timestamptz)
returns boolean
language sql stable security definer set search_path = public as $$
  with l as (
    select (p_start at time zone 'Europe/Madrid') as s, (p_end at time zone 'Europe/Madrid') as e
  )
  select exists (
           select 1 from availability a, l
           where a.profile_id = p_mentor
             and a.weekday = extract(isodow from l.s)
             and a.start_time <= l.s::time
             and (l.s::date + a.end_time) >= l.e
         )
     and not exists (
           select 1 from availability_off o, l
           where o.profile_id = p_mentor and l.s::date between o.from_day and o.to_day
         );
$$;

-- Huecos libres de un mentor verificado para los próximos p_days días (máx. 60), como
-- horas locales 'AAAA-MM-DDTHH:MI'. Solo devuelve horas (no quién reserva).
-- {"agenda": false} si el mentor no ha publicado agenda (flujo de hora propuesta).
create or replace function public.mentor_slots(p_mentor uuid, p_kind product_kind, p_days int default 21)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_dur   interval;
  v_hoy   date := (now() at time zone 'Europe/Madrid')::date;
  v_slots jsonb;
begin
  if p_kind not in ('sesion_1a1', 'sesion_flash') then
    raise exception 'invalidKind';
  end if;
  v_dur := case when p_kind = 'sesion_1a1' then interval '60 minutes' else interval '25 minutes' end;
  if not exists (select 1 from mentor_profile where profile_id = p_mentor and status = 'verificado')
     or not exists (select 1 from availability where profile_id = p_mentor) then
    return jsonb_build_object('agenda', false, 'slots', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(to_char(t.s, 'YYYY-MM-DD"T"HH24:MI') order by t.s), '[]'::jsonb)
    into v_slots
  from (
    select distinct d.dia + a.start_time + n * interval '30 minutes' as s
    from generate_series(v_hoy, v_hoy + least(greatest(coalesce(p_days, 21), 1), 60), interval '1 day') g(x)
    cross join lateral (select g.x::date as dia) d
    join availability a on a.profile_id = p_mentor and a.weekday = extract(isodow from d.dia)
    cross join lateral generate_series(
      0, floor((extract(epoch from (a.end_time - a.start_time)) - extract(epoch from v_dur)) / 1800)::int
    ) n
    where not exists (select 1 from availability_off o
                      where o.profile_id = p_mentor and d.dia between o.from_day and o.to_day)
  ) t
  where (t.s at time zone 'Europe/Madrid') >= now() + interval '3 hours'
    and (t.s at time zone 'Europe/Madrid') <= now() + interval '90 days'
    and not exists (
      select 1 from booking b
      where b.mentor_id = p_mentor and b.status in ('solicitada', 'confirmada')
        and tstzrange(b.starts_at, b.ends_at)
            && tstzrange(t.s at time zone 'Europe/Madrid', (t.s at time zone 'Europe/Madrid') + v_dur)
    );

  return jsonb_build_object('agenda', true, 'slots', v_slots);
end;
$$;

-- create_booking: igual que antes + si el mentor tiene agenda, la sesión debe caber en ella.
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
  if exists (select 1 from availability where profile_id = p_mentor)
     and not public.fits_agenda(p_mentor, v_start, v_end) then
    raise exception 'outsideAgenda';
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

revoke execute on function public.guard_availability() from public, anon, authenticated;
revoke execute on function public.fits_agenda(uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.mentor_slots(uuid, product_kind, int) from public;
grant execute on function public.mentor_slots(uuid, product_kind, int) to anon, authenticated, service_role;
grant execute on function public.fits_agenda(uuid, timestamptz, timestamptz) to service_role;
revoke execute on function public.create_booking(uuid, uuid, text, product_kind, timestamp, text) from public, anon, authenticated;
grant execute on function public.create_booking(uuid, uuid, text, product_kind, timestamp, text) to service_role;


-- ========================= migrations/20261012090200_match.sql =========================
-- Fase B (emparejamiento): el alumno guarda sus franjas preferidas en `availability`
-- (misma tabla que la agenda del mentor, fase A) y la plataforma ordena los mentores
-- verificados de un módulo por encaje: horas/semana en común, primer hueco libre que cae
-- en sus franjas, idioma y si el precio cabe en su saldo. Además, la web pública puede
-- filtrar mentores con hueco libre en los próximos días. RE-EJECUTABLE.

-- Minutos por semana en que coinciden las franjas de dos perfiles. Las franjas de un
-- mismo perfil nunca se solapan (el trigger las fusiona), así que no hay doble conteo.
create or replace function public.agenda_overlap(p_a uuid, p_b uuid)
returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(extract(epoch from (least(a.end_time, b.end_time) - greatest(a.start_time, b.start_time))) / 60), 0)::int
  from availability a
  join availability b on b.profile_id = p_b and b.weekday = a.weekday
  where a.profile_id = p_a
    and least(a.end_time, b.end_time) > greatest(a.start_time, b.start_time);
$$;

-- Mentores para el alumno que llama (auth.uid()) en un módulo, mejor encaje primero.
-- Solo datos públicos del mentor (los de mentor_public): nunca email ni teléfono.
-- next_slot = primer hueco libre (1:1); next_fit = primer hueco libre dentro de las
-- franjas del alumno. Puntuación (0–185): horas en común (hasta 100, a partir de 10 h)
-- + hueco que encaja 40 + algún hueco 20 + idioma 15 + saldo suficiente 10.
create or replace function public.match_mentors(p_modulo_code text, p_limit int default 6)
returns table (
  mentor_id   uuid,
  full_name   text,
  level       mentor_level,
  headline    text,
  overlap_min int,
  next_slot   text,
  next_fit    text,
  price       int,
  same_lang   boolean,
  score       int
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_me   uuid := auth.uid();
  v_mod  uuid;
  v_lang text;
  v_has  boolean;
  v_bal  int;
begin
  if v_me is null or not exists (select 1 from student_profile sp where sp.profile_id = v_me) then
    raise exception 'noProfile';
  end if;
  select m.id into v_mod from modulo m where m.code = p_modulo_code;
  if v_mod is null then
    raise exception 'moduloNotFound';
  end if;
  select p.locale into v_lang from profile p where p.id = v_me;
  v_has := exists (select 1 from availability a where a.profile_id = v_me);
  v_bal := public.credit_balance(v_me);

  return query
  with m as (
    select mp.profile_id, p.full_name, mp.level, mp.headline, mp.languages,
           public.mentor_slots(mp.profile_id, 'sesion_1a1', 28) as s
    from mentor_profile mp
    join profile p on p.id = mp.profile_id
    join mentor_modulo mm on mm.mentor_id = mp.profile_id and mm.modulo_id = v_mod
    where mp.status = 'verificado' and mp.profile_id <> v_me
  ), x as (
    select m.profile_id, m.full_name, m.level, m.headline,
           case when v_has then public.agenda_overlap(v_me, m.profile_id) else 0 end as ov,
           (m.s -> 'slots' ->> 0) as first_slot,
           (select e.v from jsonb_array_elements_text(m.s -> 'slots') e(v)
            where exists (
              select 1 from availability a
              where a.profile_id = v_me
                and a.weekday = extract(isodow from e.v::timestamp)
                and a.start_time <= e.v::timestamp::time
                and (e.v::timestamp::date + a.end_time) >= e.v::timestamp + interval '60 minutes')
            order by e.v limit 1) as fit,
           public.product_credits('sesion_1a1', m.level) as pr,
           coalesce(v_lang = any (m.languages), false) as sl
    from m
  )
  select x.profile_id, x.full_name, x.level, x.headline, x.ov, x.first_slot, x.fit, x.pr, x.sl,
         (least(x.ov, 600) / 6
          + case when x.fit is not null then 40 else 0 end
          + case when x.first_slot is not null then 20 else 0 end
          + case when x.sl then 15 else 0 end
          + case when x.pr is not null and x.pr <= v_bal then 10 else 0 end)::int as sc
  from x
  order by sc desc, x.first_slot asc nulls last, x.full_name
  limit least(greatest(coalesce(p_limit, 6), 1), 20);
end;
$$;

-- Mentores verificados con al menos un hueco libre (flash) en los próximos p_days días.
-- Para el filtro «con hueco esta semana» de /mentores. Solo ids (público).
create or replace function public.mentors_with_slots(p_days int default 7)
returns setof uuid
language sql stable security definer set search_path = public as $$
  select mp.profile_id
  from mentor_profile mp
  where mp.status = 'verificado'
    and exists (select 1 from availability a where a.profile_id = mp.profile_id)
    and jsonb_array_length(public.mentor_slots(mp.profile_id, 'sesion_flash', least(greatest(coalesce(p_days, 7), 1), 14)) -> 'slots') > 0;
$$;

revoke execute on function public.agenda_overlap(uuid, uuid) from public, anon, authenticated;
grant execute on function public.agenda_overlap(uuid, uuid) to service_role;
revoke execute on function public.match_mentors(text, int) from public, anon;
grant execute on function public.match_mentors(text, int) to authenticated;
revoke execute on function public.mentors_with_slots(int) from public;
grant execute on function public.mentors_with_slots(int) to anon, authenticated, service_role;


-- ========================= migrations/20261012090300_avisos.sql =========================
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


-- ========================= migrations/20261012090400_ofertas.sql =========================
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
