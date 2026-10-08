import { RaBadge } from "@/components/brand/ra-badge";
import type { BookingStatus, RaStatus, TicketStatus } from "@/lib/db-types";

// Estado de ticket/reserva con el semáforo accesible (texto + forma + color).
// Estados finales (cerrado, cancelado, hecha) en neutro: ya no piden acción.
const TICKET: Record<TicketStatus, RaStatus | null> = {
  abierto: "ambar",
  respondido: "verde",
  cerrado: null,
  cancelado: null,
};

const BOOKING: Record<BookingStatus, RaStatus | null> = {
  solicitada: "ambar",
  confirmada: "verde",
  hecha: null,
  rechazada: "rojo",
  cancelada: null,
};

function Neutro({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <span aria-hidden>■</span>
      {label}
    </span>
  );
}

export function TicketStatusBadge({ status, label }: { status: TicketStatus; label: string }) {
  const s = TICKET[status];
  return s ? <RaBadge status={s} label={label} /> : <Neutro label={label} />;
}

export function BookingStatusBadge({ status, label }: { status: BookingStatus; label: string }) {
  const s = BOOKING[status];
  return s ? <RaBadge status={s} label={label} /> : <Neutro label={label} />;
}
