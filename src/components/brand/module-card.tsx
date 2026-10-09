import { Link } from "@/i18n/navigation";
import type { Modulo } from "@/lib/db-types";

// Tarjeta de módulo para catálogo y listados (maqueta Modulos.html): código en mono,
// marca «más suspendido» (texto + punto, nunca solo color) y enlace a la ficha.
export function ModuleCard({
  modulo,
  cursoLabel,
  killerLabel,
  viewLabel,
}: {
  modulo: Pick<Modulo, "code" | "name" | "killer">;
  cursoLabel?: string;
  killerLabel: string;
  viewLabel?: string;
}) {
  return (
    <Link
      href={`/modulos/${modulo.code}`}
      className="card-interactive group flex min-h-32 flex-col rounded-2xl border bg-card p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm font-semibold text-primary">{modulo.code}</span>
        {cursoLabel && <span className="font-mono text-xs text-label">{cursoLabel}</span>}
      </div>
      <p className="mt-2 font-heading text-lg leading-snug font-semibold">{modulo.name}</p>
      <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs">
        {modulo.killer ? (
          <span className="flex items-center gap-1.5 font-mono font-semibold tracking-wide text-sos-text uppercase">
            <span aria-hidden className="size-1.5 rounded-full bg-sos" />
            {killerLabel}
          </span>
        ) : (
          <span />
        )}
        {viewLabel && (
          <span className="font-medium text-primary group-hover:underline">{viewLabel} →</span>
        )}
      </div>
    </Link>
  );
}
