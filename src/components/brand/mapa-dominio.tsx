import type { RaStatus } from "@/lib/db-types";

export interface RaProgress {
  code: string;
  label: string;
  status: RaStatus;
  progress: number; // 0–100
}

const COLOR: Record<RaStatus, string> = {
  verde: "var(--ra-verde)",
  ambar: "var(--ra-ambar)",
  rojo: "var(--ra-rojo)",
};
const LABEL: Record<RaStatus, string> = {
  verde: "DOMINADO",
  ambar: "EN CURSO",
  rojo: "FLOJO",
};

// Panel tipo HUD con el Mapa de Dominio de un módulo: cada RA con su barra de
// progreso y estado verde/ámbar/rojo. Pensado para la zona de estudiantes.
export function MapaDominio({
  code,
  name,
  ras,
  statusLabels = LABEL,
}: {
  code: string;
  name: string;
  ras: RaProgress[];
  // Etiquetas traducidas del semáforo (por defecto, en español).
  statusLabels?: Record<RaStatus, string>;
}) {
  const dominados = ras.filter((r) => r.status === "verde").length;

  return (
    <section
      className="animate-hud-in rounded-lg border bg-card p-4 sm:p-5"
      aria-label={`Mapa de Dominio de ${code} ${name}`}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/70 pb-3">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-sm text-primary">{code}</span>
          <h3 className="text-sm font-semibold tracking-wide uppercase">
            {name}
          </h3>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          [ {dominados} / {ras.length} RA ]
        </span>
      </header>

      <ul className="mt-3 space-y-2.5">
        {ras.map((ra) => (
          <li key={ra.code} className="flex items-center gap-3">
            <span className="w-10 shrink-0 font-mono text-xs text-muted-foreground">
              {ra.code}
            </span>
            <div
              className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={ra.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${ra.code} ${statusLabels[ra.status]}`}
            >
              <span
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${ra.progress}%`,
                  backgroundColor: COLOR[ra.status],
                  boxShadow: `0 0 10px -1px color-mix(in oklab, ${COLOR[ra.status]} 60%, transparent)`,
                }}
              />
            </div>
            <span
              className="w-20 shrink-0 text-right font-mono text-[10px] tracking-wider"
              style={{ color: COLOR[ra.status] }}
            >
              {statusLabels[ra.status]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
