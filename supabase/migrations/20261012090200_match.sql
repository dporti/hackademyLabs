-- Fase B (emparejamiento): el alumno guarda sus franjas preferidas en `availability`
-- (misma tabla que la agenda del mentor, fase A) y la plataforma ordena los mentores
-- verificados de un módulo por encaje: horas/semana en común, primer hueco libre que cae
-- en sus franjas, idioma y si el precio cabe en su saldo. Además, la web pública puede
-- filtrar mentores con hueco libre en los próximos días. RE-EJECUTABLE.

-- Minutos por semana en que coinciden las franjas de dos perfiles. Las franjas de un
-- mismo perfil nunca se solapan (el trigger las fusiona), así que no hay doble conteo.
create or replace function public.agenda_overlap(p_a uuid, p_b uuid)
returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(extract(epoch from (least(a.end_time, b.end_time) - greatest(a.start_time, b.start_time))) / 60), 0)::int
  from availability a
  join availability b on b.profile_id = p_b and b.weekday = a.weekday
  where a.profile_id = p_a
    and least(a.end_time, b.end_time) > greatest(a.start_time, b.start_time);
$$;

-- Mentores para el alumno que llama (auth.uid()) en un módulo, mejor encaje primero.
-- Solo datos públicos del mentor (los de mentor_public): nunca email ni teléfono.
-- next_slot = primer hueco libre (1:1); next_fit = primer hueco libre dentro de las
-- franjas del alumno. Puntuación (0–185): horas en común (hasta 100, a partir de 10 h)
-- + hueco que encaja 40 + algún hueco 20 + idioma 15 + saldo suficiente 10.
create or replace function public.match_mentors(p_modulo_code text, p_limit int default 6)
returns table (
  mentor_id   uuid,
  full_name   text,
  level       mentor_level,
  headline    text,
  overlap_min int,
  next_slot   text,
  next_fit    text,
  price       int,
  same_lang   boolean,
  score       int
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_me   uuid := auth.uid();
  v_mod  uuid;
  v_lang text;
  v_has  boolean;
  v_bal  int;
begin
  if v_me is null or not exists (select 1 from student_profile sp where sp.profile_id = v_me) then
    raise exception 'noProfile';
  end if;
  select m.id into v_mod from modulo m where m.code = p_modulo_code;
  if v_mod is null then
    raise exception 'moduloNotFound';
  end if;
  select p.locale into v_lang from profile p where p.id = v_me;
  v_has := exists (select 1 from availability a where a.profile_id = v_me);
  v_bal := public.credit_balance(v_me);

  return query
  with m as (
    select mp.profile_id, p.full_name, mp.level, mp.headline, mp.languages,
           public.mentor_slots(mp.profile_id, 'sesion_1a1', 28) as s
    from mentor_profile mp
    join profile p on p.id = mp.profile_id
    join mentor_modulo mm on mm.mentor_id = mp.profile_id and mm.modulo_id = v_mod
    where mp.status = 'verificado' and mp.profile_id <> v_me
  ), x as (
    select m.profile_id, m.full_name, m.level, m.headline,
           case when v_has then public.agenda_overlap(v_me, m.profile_id) else 0 end as ov,
           (m.s -> 'slots' ->> 0) as first_slot,
           (select e.v from jsonb_array_elements_text(m.s -> 'slots') e(v)
            where exists (
              select 1 from availability a
              where a.profile_id = v_me
                and a.weekday = extract(isodow from e.v::timestamp)
                and a.start_time <= e.v::timestamp::time
                and (e.v::timestamp::date + a.end_time) >= e.v::timestamp + interval '60 minutes')
            order by e.v limit 1) as fit,
           public.product_credits('sesion_1a1', m.level) as pr,
           coalesce(v_lang = any (m.languages), false) as sl
    from m
  )
  select x.profile_id, x.full_name, x.level, x.headline, x.ov, x.first_slot, x.fit, x.pr, x.sl,
         (least(x.ov, 600) / 6
          + case when x.fit is not null then 40 else 0 end
          + case when x.first_slot is not null then 20 else 0 end
          + case when x.sl then 15 else 0 end
          + case when x.pr is not null and x.pr <= v_bal then 10 else 0 end)::int as sc
  from x
  order by sc desc, x.first_slot asc nulls last, x.full_name
  limit least(greatest(coalesce(p_limit, 6), 1), 20);
end;
$$;

-- Mentores verificados con al menos un hueco libre (flash) en los próximos p_days días.
-- Para el filtro «con hueco esta semana» de /mentores. Solo ids (público).
create or replace function public.mentors_with_slots(p_days int default 7)
returns setof uuid
language sql stable security definer set search_path = public as $$
  select mp.profile_id
  from mentor_profile mp
  where mp.status = 'verificado'
    and exists (select 1 from availability a where a.profile_id = mp.profile_id)
    and jsonb_array_length(public.mentor_slots(mp.profile_id, 'sesion_flash', least(greatest(coalesce(p_days, 7), 1), 14)) -> 'slots') > 0;
$$;

revoke execute on function public.agenda_overlap(uuid, uuid) from public, anon, authenticated;
grant execute on function public.agenda_overlap(uuid, uuid) to service_role;
revoke execute on function public.match_mentors(text, int) from public, anon;
grant execute on function public.match_mentors(text, int) to authenticated;
revoke execute on function public.mentors_with_slots(int) from public;
grant execute on function public.mentors_with_slots(int) to anon, authenticated, service_role;
