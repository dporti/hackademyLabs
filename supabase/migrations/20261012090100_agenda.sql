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
