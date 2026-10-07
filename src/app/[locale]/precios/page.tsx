import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPacks, getPlanes } from "@/lib/catalog";
import { PRODUCTS, product } from "@/lib/products";
import type { ProductKind } from "@/lib/db-types";

// Precios que venden: primero "¿cuánto me cuesta aprobar?" con casos reales,
// luego qué compras con créditos, packs y suscripciones. Créditos de docs §5.

// Escenarios típicos: combinación de productos → rango de créditos.
const ESCENARIOS: { k: string; items: [ProductKind, number][] }[] = [
  { k: "e1", items: [["simulacro", 1], ["ticket_express", 2]] },
  { k: "e2", items: [["sesion_1a1", 2], ["simulacro", 1]] },
  { k: "e3", items: [["rescate_48h", 1]] },
  { k: "e4", items: [["plan_modulo", 1]] },
];

const rango = (items: [ProductKind, number][]) =>
  items.reduce(
    (acc, [k, n]) => ({ min: acc.min + product(k).min * n, max: acc.max + product(k).max * n }),
    { min: 0, max: 0 },
  );

export async function generateMetadata({ params }: PageProps<"/[locale]/precios">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing" });
  return { title: `${t("title")} · Tutor247`, description: t("subtitle") };
}

export default async function PreciosPage({ params }: PageProps<"/[locale]/precios">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pricing");
  const tp = await getTranslations("products");
  const [packs, planes] = await Promise.all([getPacks(), getPlanes()]);
  const eur = (n: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(n);

  return (
    <main className="flex-1">
      {/* ───────────────────────────── Cabecera ───────────────────────────── */}
      <section className="hud-grid border-b border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h1 className="max-w-3xl font-display text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
            {t("heroTitle")}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{t("subtitle")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" className="glow" nativeButton={false} render={<Link href="/diagnostico" />}>
              {t("ctaCalc")}
            </Button>
          </div>
        </div>
      </section>

      {/* ──────────────────── ¿Cuánto me cuesta aprobar? ──────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-3xl font-bold tracking-tight">{t("scenariosTitle")}</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("scenariosSubtitle")}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ESCENARIOS.map((e) => {
            const r = rango(e.items);
            return (
              <div
                key={e.k}
                className={`flex flex-col rounded-xl border bg-card p-5 ${
                  e.k === "e4" ? "glow border-primary/40" : ""
                }`}
              >
                <p className="font-display text-lg font-semibold">“{t(`scenarios.${e.k}.quote`)}”</p>
                <ul className="mt-3 flex-1 space-y-1 text-sm text-muted-foreground">
                  {e.items.map(([k, n]) => (
                    <li key={k}>
                      {n > 1 ? `${n} × ` : ""}
                      {tp(`${k}.name`)}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 font-mono text-2xl font-bold text-primary">
                  {t("creditsRange", { min: r.min, max: r.max })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("approxEur", { min: eur(r.min), max: eur(r.max) })}
                </p>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {t("scenariosNote")}{" "}
          <Link href="/diagnostico" className="text-primary underline-offset-4 hover:underline">
            {t("scenariosLink")}
          </Link>
        </p>
      </section>

      {/* ─────────────────────── Qué compras con créditos ─────────────────────── */}
      <section id="productos" className="scroll-mt-20 border-y border-border/60 bg-[var(--surface-2)]">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-3xl font-bold tracking-tight">{t("productsTitle")}</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">{t("productsSubtitle")}</p>
          <div className="mt-8 overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th scope="col" className="px-5 py-3 font-medium">{t("colProduct")}</th>
                  <th scope="col" className="px-5 py-3 font-medium">{t("colWhat")}</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">{t("colCredits")}</th>
                </tr>
              </thead>
              <tbody>
                {PRODUCTS.map((p) => (
                  <tr key={p.kind} className="border-b last:border-0">
                    <th scope="row" className="px-5 py-3 text-left font-semibold whitespace-nowrap">
                      {tp(`${p.kind}.name`)}
                      {p.highlight && (
                        <span className="ml-2 align-middle text-[11px] font-medium text-primary">
                          {t("popular")}
                        </span>
                      )}
                    </th>
                    <td className="px-5 py-3 text-muted-foreground">{tp(`${p.kind}.desc`)}</td>
                    <td className="px-5 py-3 text-right font-mono whitespace-nowrap text-primary">
                      {p.max === 0 ? t("free") : `${p.min}–${p.max}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t("productsNote")}</p>
        </div>
      </section>

      {/* ────────────────────────────── Packs ────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-3xl font-bold tracking-tight">{t("packsTitle")}</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("packsSubtitle")}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {packs.map((p) => {
            const featured = p.slug === "modulo";
            return (
              <div
                key={p.id}
                className={`card-interactive flex flex-col rounded-xl border bg-card p-5 ${
                  featured ? "glow border-primary/40" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{p.name}</span>
                  {p.bonus_pct > 0 && (
                    <Badge variant="secondary">{t("bonus", { pct: p.bonus_pct })}</Badge>
                  )}
                </div>
                <p className="mt-3 font-display text-3xl font-bold">{eur(p.price_eur)}</p>
                <p className="mt-1 font-mono text-sm text-primary">{t("credits", { n: p.credits })}</p>
                <Button
                  className={`mt-4 ${featured ? "glow" : ""}`}
                  variant={featured ? "default" : "secondary"}
                  nativeButton={false}
                  render={<Link href={`/registro?rol=alumno&pack=${p.slug}`} />}
                >
                  {t("buy")}
                </Button>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t("creditsNote")}</p>
      </section>

      {/* ─────────────────────────── Suscripciones ─────────────────────────── */}
      <section className="border-t border-border/60 bg-[var(--surface-2)]">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-3xl font-bold tracking-tight">{t("plansTitle")}</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">{t("plansSubtitle")}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {planes.map((pl) => {
              const familia = pl.kind === "acompana" || pl.kind === "acompana_plus";
              return (
                <div
                  key={pl.id}
                  className={`card-interactive flex flex-col rounded-xl border bg-card p-5 ${
                    pl.kind === "companero" ? "glow border-primary/40" : ""
                  }`}
                >
                  <span className="font-semibold">{pl.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {familia ? t("forFamilies") : t("forStudents")}
                  </span>
                  <p className="mt-3 font-display text-3xl font-bold">
                    {pl.price_eur_month > 0 ? eur(pl.price_eur_month) : t("free")}
                    {pl.price_eur_month > 0 && (
                      <span className="text-base font-normal text-muted-foreground">{t("perMonth")}</span>
                    )}
                  </p>
                  <ul className="mt-4 flex-1 space-y-1 text-sm text-muted-foreground">
                    {pl.features.map((f, i) => (
                      <li key={i}>· {f}</li>
                    ))}
                  </ul>
                  {pl.kind === "gratis" ? (
                    <Button variant="outline" className="mt-4" nativeButton={false} render={<Link href="/diagnostico" />}>
                      {t("startFree")}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="mt-4"
                      nativeButton={false}
                      render={<Link href={familia ? "/familias#planes" : `/registro?plan=${pl.kind}`} />}
                    >
                      {familia ? t("seeFamilies") : t("subscribe")}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────────────────────────── Garantía ───────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div
          className="rounded-2xl border p-8 sm:p-10"
          style={{
            borderColor: "color-mix(in oklab, var(--secondary) 50%, transparent)",
            background: "color-mix(in oklab, var(--secondary) 8%, var(--card))",
          }}
        >
          <h2 className="font-display text-3xl font-bold tracking-tight">{t("guaranteeTitle")}</h2>
          <p className="mt-3 max-w-3xl text-lg">{t("guaranteeText")}</p>
        </div>

        <h2 className="mt-16 font-display text-3xl font-bold tracking-tight">{t("faqTitle")}</h2>
        <div className="mt-6 max-w-3xl divide-y rounded-xl border bg-card">
          {(["q1", "q2", "q3", "q4"] as const).map((q) => (
            <details key={q} className="group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {t(`faq.${q}.q`)}
                <span aria-hidden className="text-primary transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{t(`faq.${q}.a`)}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
