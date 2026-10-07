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
