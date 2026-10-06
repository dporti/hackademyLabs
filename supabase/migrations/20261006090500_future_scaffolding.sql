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
