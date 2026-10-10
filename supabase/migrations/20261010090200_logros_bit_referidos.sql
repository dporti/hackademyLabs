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
