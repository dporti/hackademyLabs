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
