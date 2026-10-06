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
