-- Tutor247 — Ledger de créditos. REGLA CLAVE DEL NEGOCIO:
-- el saldo NO se guarda; se calcula sumando movimientos. El ledger es inmutable
-- (append-only): nada de UPDATE/DELETE. Las correcciones se hacen con un nuevo
-- movimiento ('ajuste' o 'devolucion').

create table credit_ledger (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references student_profile (profile_id) on delete cascade,
  type         ledger_type not null,
  -- Entero con signo: + ingreso (compra/bonus/devolución), − gasto/caducidad.
  amount       integer not null,
  product_kind product_kind,                               -- si type = 'gasto'
  mentor_id    uuid references mentor_profile (profile_id), -- atribución del consumo
  pack_id      uuid references pack (id),                   -- si procede de un pack
  -- Caducidad por lote de ingreso (12 meses). Metadato para el job de caducidad,
  -- que insertará movimientos 'caducidad' negativos cuando corresponda.
  expires_at   timestamptz,
  note         text,
  created_at   timestamptz not null default now()
);

create index credit_ledger_student_idx on credit_ledger (student_id, created_at);

-- Inmutabilidad dura: bloquea UPDATE y DELETE para TODOS (incluido service role).
create or replace function public.block_ledger_mutation()
returns trigger language plpgsql as $$
begin
  raise exception
    'credit_ledger es inmutable: corrige con un nuevo movimiento (ajuste/devolucion), no con UPDATE/DELETE';
end;
$$;

create trigger ledger_no_update
  before update on credit_ledger
  for each row execute function public.block_ledger_mutation();
create trigger ledger_no_delete
  before delete on credit_ledger
  for each row execute function public.block_ledger_mutation();

-- Saldo = suma de TODOS los movimientos del alumno (la caducidad se refleja como
-- movimientos negativos, no excluyendo filas).
create or replace function public.credit_balance(p_student uuid)
returns integer
language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount), 0)::int
  from public.credit_ledger
  where student_id = p_student
$$;

-- Atajo para el alumno autenticado (lo llama el panel vía RPC).
create or replace function public.my_credit_balance()
returns integer
language sql stable security definer set search_path = public as $$
  select public.credit_balance(auth.uid())
$$;

alter table credit_ledger enable row level security;
-- El alumno (y admin) LEE sus movimientos. No hay policy de insert/update/delete:
-- el cliente nunca escribe. Los ingresos/gastos los crea el servidor con service
-- role (compra de packs, consumo de productos), que salta RLS.
create policy cl_select_own on credit_ledger
  for select using (auth.uid() = student_id or public.is_admin());

-- Defensa en profundidad: ni anon ni authenticated pueden mutar la tabla.
revoke insert, update, delete on credit_ledger from anon, authenticated;
