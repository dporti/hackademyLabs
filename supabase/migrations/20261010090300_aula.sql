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
