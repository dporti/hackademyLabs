import { getTranslations } from "next-intl/server";
import { SectionLabel } from "@/components/brand/section-label";
import { TITULAR, titularCompleto } from "@/lib/legal";
import { CONTACTO } from "@/lib/contacto";

// Maqueta común de las páginas legales. Los textos viven en i18n como listas
// (`legal.<page>.sections` = [{ h, p: [...] }]); `{titular}`, `{nif}`, `{domicilio}` y
// `{email}`, `{telefono}` se sustituyen con lib/legal.ts (o «pendiente» si faltan).
type Seccion = { h: string; p: string[] };

export async function LegalPage({ page }: { page: "avisoLegal" | "privacidad" | "cookies" | "condiciones" }) {
  const t = await getTranslations("legal");
  const pend = t("pending");
  const datos: Record<string, string> = {
    titular: TITULAR.nombre ?? pend,
    nif: TITULAR.nif ?? pend,
    domicilio: TITULAR.domicilio ?? pend,
    email: TITULAR.email ?? pend,
    registro: TITULAR.registro ?? "—",
    telefono: CONTACTO.telefono,
  };
  const rellenar = (s: string) => s.replace(/\{(titular|nif|domicilio|email|registro|telefono)\}/g, (_, k: string) => datos[k]);
  const secciones = t.raw(`${page}.sections`) as Seccion[];

  return (
    <main className="flex-1">
      <section className="hud-grid border-b border-divider">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
          <SectionLabel>{t("eyebrow")}</SectionLabel>
          <h1 className="mt-4 font-heading text-[40px] leading-[1.05] font-bold tracking-tight sm:text-[54px]">
            {t(`${page}.title`)}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{t(`${page}.intro`)}</p>
          <p className="mt-4 font-mono text-xs text-muted-foreground">{t("updated")}</p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-10 px-4 py-14 sm:px-6">
        {!titularCompleto() && (
          <p role="note" className="rounded-2xl border border-tint-warning-border bg-tint-warning p-4 text-sm">
            {t("pendingNotice")}
          </p>
        )}
        {secciones.map((s, i) => (
          <section key={i} aria-labelledby={`s${i}`}>
            <h2 id={`s${i}`} className="font-heading text-2xl font-bold">
              {s.h}
            </h2>
            <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted-foreground">
              {s.p.map((p, j) => (
                <p key={j}>{rellenar(p)}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
