import { RaBadge } from "@/components/brand/ra-badge";
import type { MentorStatus, RaStatus } from "@/lib/db-types";

// Estado de verificación del mentor con el mismo semáforo accesible de los RA
// (texto + forma + color).
const SEMAFORO: Record<MentorStatus, RaStatus> = {
  verificado: "verde",
  pendiente: "ambar",
  rechazado: "rojo",
};

export function MentorStatusBadge({
  status,
  label,
}: {
  status: MentorStatus;
  label: string;
}) {
  return <RaBadge status={SEMAFORO[status]} label={label} />;
}
