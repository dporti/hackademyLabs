import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { InformeSemanal } from "@/components/brand/informe-semanal";
import { getPlanes } from "@/lib/catalog";

// Landing de familias (Modo Familia). Zona "family": clara, sobria, confiable.
// Contenido: docs/segmentos-tutor247-v1.md §2–§4. Página estática (SEO).

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/familias">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "family" });
  return { title: `${t("metaTitle")} · Tutor247`, description: t("metaDescription") };
}

export default async function FamiliasPage({
  params,
}: PageProps<"/[locale]/familias">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("family");
  const tp = await getTranslations("pricing");
  // Planes Familia desde BD: misma fuente que /precios.
  const planes = (await getPlanes()).filter(
    (p) => p.kind === "acompana" || p.kind === "acompana_plus",
  );
  const eur = (n: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(n);

  const incluye = ["tutor", "bit", "family"] as const;
  const pasos = ["s1", "s2", "s3", "s4"] as const;
  const confianza = ["c1", "c2", "c3", "c4", "c5", "c6"] as const;
  const faqs = ["q1", "q2", "q3", "q4"] as const;

  return (
    <main data-theme="family" className="flex-1 bg-background text-foreground">
      {/* ───────────────────────────── Hero ───────────────────────────── */}
      <section className="border-b">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div>
            <p className="text-sm font-medium text-primary">{t("eyebrow")}</p>
            <h1 className="mt-3 font-display text-4xl leading-[1.08] font-bold tracking-tight sm:text-5xl">
              {t("heroTitle")}
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              {t("heroSubtitle")}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                size="lg"
                nativeButton={false}
                render={<Link href="/registro?rol=familia" />}
              >
                {t("ctaPrimary")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                nativeButton={false}
                render={<a href="#planes" />}
              >
                {t("ctaPlans")}
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{t("heroNote")}</p>
          </div>

          <InformeSemanal
            d={{
              title: t("report.title"),
              exampleLabel: t("report.example"),
              student: t("report.student"),
              week: t("report.week"),
              overallLabel: t("report.overallLabel"),
              overall: { status: "ambar", label: t("report.overall") },
              consistencyLabel: t("report.consistencyLabel"),
              consistencyDays: 5,
              consistencyText: t("report.consistency"),
              workedLabel: t("report.workedLabel"),
              worked: [
                { code: "0225", text: t("report.w1"), status: "verde", statusLabel: t("status.verde") },
                { code: "0221", text: t("report.w2"), status: "ambar", statusLabel: t("status.ambar") },
              ],
              upcomingLabel: t("report.upcomingLabel"),
              upcoming: [
                { date: t("report.u1date"), text: t("report.u1") },
                { date: t("report.u2date"), text: t("report.u2") },
              ],
              tipLabel: t("report.tipLabel"),
              tip: t("report.tip"),
            }}
          />
        </div>
      </section>

      {/* ─────────────────────────── Qué incluye ─────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-3xl font-bold tracking-tight">
          {t("includesTitle")}
        </h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("includesSubtitle")}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {incluye.map((k) => (
            <div key={k} className="rounded-xl border bg-card p-6">
              <h3 className="font-display text-lg font-semibold">{t(`inc.${k}.title`)}</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {(["a", "b", "c"] as const).map((i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    {t(`inc.${k}.${i}`)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────────── Cómo funciona ─────────────────────────── */}
      <section className="border-y bg-[var(--surface-2)]">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-3xl font-bold tracking-tight">{t("howTitle")}</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pasos.map((s, i) => (
              <li key={s} className="rounded-xl border bg-card p-5">
                <span className="font-mono text-sm text-primary">0{i + 1}</span>
                <h3 className="mt-2 font-semibold">{t(`how.${s}.title`)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t(`how.${s}.text`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ────────────────────────────── Planes ────────────────────────────── */}
      <section id="planes" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <h2 className="font-display text-3xl font-bold tracking-tight">{t("plansTitle")}</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("plansSubtitle")}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {planes.map((pl) => {
            const plus = pl.kind === "acompana_plus";
            return (
              <div
                key={pl.id}
                className={`flex flex-col rounded-xl border bg-card p-6 ${
                  plus ? "border-primary/50 shadow-[var(--glow-primary)]" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-xl font-semibold">{pl.name}</h3>
                  {plus && (
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {t("plusBadge")}
                    </span>
                  )}
                </div>
                <p className="mt-3 font-display text-4xl font-bold">
                  {eur(pl.price_eur_month)}
                  <span className="text-base font-normal text-muted-foreground">
                    {tp("perMonth")}
                  </span>
                </p>
                <ul className="mt-5 flex-1 space-y-2 text-sm">
                  {pl.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span aria-hidden className="text-primary">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-6"
                  variant={plus ? "default" : "outline"}
                  nativeButton={false}
                  render={<Link href={`/registro?rol=familia&plan=${pl.kind}`} />}
                >
                  {t("planCta")}
                </Button>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{t("plansNote")}</p>
      </section>

      {/* ────────────────────────── Confianza y límites ────────────────────────── */}
      <section className="border-t bg-[var(--surface-2)]">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-3xl font-bold tracking-tight">{t("trustTitle")}</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">{t("trustSubtitle")}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {confianza.map((c) => (
              <div key={c} className="rounded-xl border bg-card p-5">
                <h3 className="font-semibold">{t(`trust.${c}.title`)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t(`trust.${c}.text`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────── FAQ ─────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="font-display text-3xl font-bold tracking-tight">{t("faqTitle")}</h2>
        <div className="mt-6 divide-y rounded-xl border bg-card">
          {faqs.map((q) => (
            <details key={q} className="group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {t(`faq.${q}.q`)}
                <span
                  aria-hidden
                  className="text-primary transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{t(`faq.${q}.a`)}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ──────────────────────────── CTA final ──────────────────────────── */}
      <section className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 px-4 py-14 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl font-bold tracking-tight">{t("finalTitle")}</h2>
            <p className="mt-2 text-muted-foreground">{t("finalText")}</p>
          </div>
          <Button size="lg" nativeButton={false} render={<Link href="/registro?rol=familia" />}>
            {t("ctaPrimary")}
          </Button>
        </div>
      </section>
    </main>
  );
}
