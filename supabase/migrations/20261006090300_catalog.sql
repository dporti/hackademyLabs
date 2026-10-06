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
