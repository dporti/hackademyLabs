import type { RaStatus } from "@/lib/db-types";

// Badge de estado de un RA. El estado se transmite con texto + forma + color
// (nunca solo color) para cumplir accesibilidad.
const META: Record<RaStatus, { color: string; label: string; glyph: string }> = {
  verde: { color: "var(--ra-verde)", label: "Dominado", glyph: "●" },
  ambar: { color: "var(--ra-ambar)", label: "En curso", glyph: "◐" },
  rojo: { color: "var(--ra-rojo)", label: "Flojo", glyph: "○" },
};

export function RaBadge({
  status,
  label,
}: {
  status: RaStatus;
  label?: string;
}) {
  const m = META[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
      style={{
        color: m.color,
        borderColor: `color-mix(in oklab, ${m.color} 40%, transparent)`,
        backgroundColor: `color-mix(in oklab, ${m.color} 12%, transparent)`,
      }}
    >
      <span aria-hidden>{m.glyph}</span>
      {label ?? m.label}
    </span>
  );
}
