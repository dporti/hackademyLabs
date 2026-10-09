import { useTranslations } from "next-intl";
import type { RaStatus } from "@/lib/db-types";
import { NIVEL_META, nivelDesdeEstado, type NivelDominio } from "@/lib/dominio";

export interface RaProgress {
  code: string;
  label: string;
  status: RaStatus;
  progress: number; // 0–100
  // Nivel explícito; si falta se deduce de status + progress.
  nivel?: NivelDominio;
  // Aún sin evaluar (p. ej. en el diagnóstico antes de responder).
  pendiente?: boolean;
}

// Panel HUD con el Mapa de Dominio de un módulo: cada RA con su barra de progreso y
// su nivel (Aún no / Con ayuda / Casi / Lo domino) en texto + forma + color.
// Es orientativo, no una nota oficial: se dice en el pie (`nota`).
export function MapaDominio({
  code,
  name,
  ras,
  nota = true,
}: {
  code: string;
  name: string;
  ras: RaProgress[];
  nota?: boolean;
}) {
  const t = useTranslations("dominio");
  const niveles = ras.map((r) => r.nivel ?? nivelDesdeEstado(r.status, r.progress));
  const dominados = niveles.filter((n, i) => n === "domino" && !ras[i].pendiente).length;

  return (
    <section
      className="animate-hud-in rounded-2xl border bg-card p-4 sm:p-5"
      aria-label={t("mapaAria", { code, name })}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-divider pb-3">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-sm text-primary">{code}</span>
          <h3 className="text-sm font-semibold tracking-wide uppercase">{name}</h3>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          [ {dominados} / {ras.length} RA ]
        </span>
      </header>

      <ul className="mt-3 space-y-2.5">
        {ras.map((ra, i) => {
          const nivel = niveles[i];
          const { color, glyph } = ra.pendiente
            ? { color: "var(--label)", glyph: "·" }
            : NIVEL_META[nivel];
          const texto = ra.pendiente ? t("pendiente") : t(`nivel.${nivel}`);
          return (
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
                aria-label={`${ra.code} ${texto}`}
              >
                <span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${ra.progress}%`, backgroundColor: color }}
                />
              </div>
              <span
                className="flex w-24 shrink-0 items-center justify-end gap-1 font-mono text-[11px] tracking-wide"
                style={{ color }}
              >
                <span aria-hidden>{glyph}</span>
                {texto}
              </span>
            </li>
          );
        })}
      </ul>

      {nota && <p className="mt-3 text-xs text-label">{t("nota")}</p>}
    </section>
  );
}
