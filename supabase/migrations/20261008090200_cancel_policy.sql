-- Tutor247 — Política de cancelación (F2.1b). Ver /cancelacion.
-- Cambio: el alumno también puede cancelar (con devolución íntegra) un ticket que un
-- mentor cogió pero NO respondió dentro del plazo (due_at). Antes solo podía
-- cancelarlo si nadie lo había cogido, y un mentor que lo cogía y no contestaba lo
-- dejaba sin créditos y sin salida.
-- RE-EJECUTABLE (create or replace).

create or replace function public.cancel_ticket(p_student uuid, p_ticket uuid)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare v ticket;
begin
  select * into v from ticket where id = p_ticket for update;
  if v.id is null or v.student_id <> p_student then
    raise exception 'notFound';
  end if;
  -- Cancelable: abierto, sin respuesta del mentor y (libre o con el plazo vencido).
  if v.status <> 'abierto' or v.answered_at is not null
     or (v.mentor_id is not null and (v.due_at is null or v.due_at > now())) then
    raise exception 'cannotCancel';
  end if;
  update ticket set status = 'cancelado', closed_at = now(), updated_at = now()
  where id = p_ticket;
  insert into credit_ledger (student_id, type, amount, product_kind, ticket_id, note)
  values (p_student, 'devolucion', v.credits, v.kind, p_ticket,
          case when v.mentor_id is null then 'Ticket cancelado'
               else 'Ticket cancelado: sin respuesta en plazo' end);
end;
$$;

revoke execute on function public.cancel_ticket(uuid, uuid) from public, anon, authenticated;
grant execute on function public.cancel_ticket(uuid, uuid) to service_role;
