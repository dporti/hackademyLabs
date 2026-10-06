import { Link } from "@/i18n/navigation";
import type { Modulo } from "@/lib/db-types";

// Tarjeta de módulo para catálogo y listados. Código en mono/cian (HUD),
// badge killer, glow al hover.
export function ModuleCard({
  modulo,
  cursoLabel,
  killerLabel,
}: {
  modulo: Pick<Modulo, "code" | "name" | "killer">;
  cursoLabel?: string;
  killerLabel: string;
}) {
  return (
    <Link
      href={`/modulos/${modulo.code}`}
      className="card-interactive group flex flex-col rounded-lg border bg-card p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm text-primary">{modulo.code}</span>
        {modulo.killer && (
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide"
            style={{
              color: "var(--ra-rojo)",
              backgroundColor: "color-mix(in oklab, var(--ra-rojo) 14%, transparent)",
            }}
            title={killerLabel}
          >
            KILLER
          </span>
        )}
      </div>
      <p className="mt-1.5 font-medium group-hover:text-foreground">
        {modulo.name}
      </p>
      {cursoLabel && (
        <p className="mt-auto pt-2 font-mono text-xs text-muted-foreground">
          {cursoLabel}
        </p>
      )}
    </Link>
  );
}
