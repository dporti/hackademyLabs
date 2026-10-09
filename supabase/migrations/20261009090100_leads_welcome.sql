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
