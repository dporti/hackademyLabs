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
