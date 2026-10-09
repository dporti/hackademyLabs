import { useTranslations } from "next-intl";
import type { RaStatus } from "@/lib/db-types";
import { NIVEL_META, type NivelDominio } from "@/lib/dominio";

// Badge de estado. Dos usos:
// - `nivel`: nivel del Mapa de Dominio (4 niveles: Aún no / Con ayuda / Casi / Lo domino).
// - `status`: semáforo genérico verde/ámbar/rojo (estados de tickets, mentores, informes…).
// El estado se transmite con texto + forma + color (nunca solo color).
const STATUS_META: Record<RaStatus, { color: string; glyph: string }> = {
  verde: { color: "var(--ra-verde)", glyph: "●" },
  ambar: { color: "var(--ra-ambar)", glyph: "◐" },
  rojo: { color: "var(--ra-rojo)", glyph: "○" },
};

type Props = { label?: string } & (
  | { nivel: NivelDominio; status?: never }
  | { status: RaStatus; nivel?: never }
);

export function RaBadge({ status, nivel, label }: Props) {
  const t = useTranslations("dominio");
  const m = nivel ? NIVEL_META[nivel] : STATUS_META[status!];
  const texto = label ?? (nivel ? t(`nivel.${nivel}`) : t(`status.${status!}`));
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
      {texto}
    </span>
  );
}
