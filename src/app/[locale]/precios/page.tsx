import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SectionLabel } from "@/components/brand/section-label";
import { ComingSoon } from "@/components/brand/coming-soon";
import { Faq } from "@/components/brand/faq";
import { getPacks, getPlanes } from "@/lib/catalog";
import { PRODUCTS } from "@/lib/products";
import type { PlanKind, ProductKind } from "@/lib/db-types";

// Planes y precios (maqueta Precios.html, en tono suave): primero lo gratis; luego lo
// humano con créditos (productos y packs), Tutor247 y la suscripción IA. Packs, planes y precios desde BD; lo no
// construido lleva «Próximamente». Créditos orientativos de docs §5.

// Productos que ya se pueden contratar en la plataforma (el resto: Próximamente).
const DISPONIBLES = new Set<ProductKind>(["diagnostico", "ticket_normal", "ticket_express", "sesion_flash", "sesion_1a1"]);

// Planes de familia en BD → nombre comercial de Tutor247 (i18n en tutor247.plans).
const PLAN_TUTOR: Partial<Record<PlanKind, "familia" | "familiaPlus">> = {
  acompana: "familia",
  acompana_plus: "familiaPlus",
};

const btnPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-5 font-bold text-primary-foreground transition-colors hover:bg-primary/85";
const btnOutline =
  "inline-flex min-h-12 items-center justify-center rounded-xl border border-[#3a3f5c] px-5 font-medium transition-colors hover:border-primary";
const h2 = "mt-3 font-heading text-[32px] leading-tight font-bold tracking-tight sm:text-[42px]";

export async function generateMetadata({ params }: PageProps<"/[locale]/precios">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function PreciosPage({ params }: PageProps<"/[locale]/precios">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pricing");
  const tp = await getTranslations("products");
  const tt = await getTranslations("tutor247");
  const [packs, planes] = await Promise.all([getPacks(), getPlanes()]);
  const eur = (n: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(n);
  const planesIA = planes.filter((p) => p.kind === "gratis" || p.kind === "companero");
  const planesTutor = planes.filter((p) => PLAN_TUTOR[p.kind]);

  return (
    <main className="flex-1">
      {/* ───────────────────────────── Cabecera ───────────────────────────── */}
      <section className="hud-grid border-b border-divider">
        <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6">
          <SectionLabel>{t("eyebrow")}</SectionLabel>
          <h1 className="mt-4 max-w-4xl font-heading text-[40px] leading-[1.05] font-bold tracking-tight sm:text-[54px]">
            {t("heroTitle")}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{t("heroText")}</p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/diagnostico" className={`${btnPrimary} glow`}>
              {t("freeCta")}
            </Link>
            <a href="#aprueba" className={btnOutline}>
              {t("anchorAprueba")}
            </a>
            <span data-accent="tutor">
              <a href="#tutor247" className={btnOutline}>
                {t("anchorTutor")}
              </a>
            </span>
          </div>
        </div>
      </section>

      {/* ─────────────────────────── 01 — Empieza gratis ─────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
        <div className="glow grid gap-8 rounded-3xl border border-tint-primary-border bg-tint-primary p-6 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <SectionLabel>01 — {t("freeLabel")}</SectionLabel>
            <h2 className={h2}>{t("freeTitle")}</h2>
            <p className="mt-3 text-muted-foreground">{t("freeText")}</p>
          </div>
          <div>
            <ul className="space-y-3 text-[15px]">
              {(["free1", "free2", "free3", "free4"] as const).map((k) => (
                <li key={k} className="flex gap-2.5">
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-accent-pass" strokeWidth={3} />
                  {t(k)}
                </li>
              ))}
            </ul>
            <Link href="/diagnostico" className={`mt-6 ${btnPrimary}`}>
              {t("freeCta")}
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────── 02 — Cuando necesites a una persona ─────────────────── */}
      <section id="aprueba" className="mx-auto max-w-[1200px] scroll-mt-24 px-4 pb-16 sm:px-6">
        <SectionLabel>02 — {t("humanLabel")}</SectionLabel>
        <h2 className={h2}>{t("humanTitle")}</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">{t("humanText")}</p>

        {/* Productos */}
        <div id="productos" className="scroll-mt-24">
          <h3 className="mt-10 font-heading text-2xl font-bold">{t("productsTitle")}</h3>
          <p className="mt-2 max-w-2xl text-muted-foreground">{t("productsSubtitle")}</p>
          <div className="mt-6 overflow-x-auto rounded-2xl border bg-card">
            <table className="w-full min-w-[620px] text-left text-[15px]">
              <thead className="font-mono text-xs tracking-[0.15em] text-label uppercase">
                <tr className="border-b border-divider">
                  <th scope="col" className="px-5 py-3 font-semibold">{t("colProduct")}</th>
                  <th scope="col" className="px-5 py-3 font-semibold">{t("colWhat")}</th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">{t("colCredits")}</th>
                </tr>
              </thead>
              <tbody>
                {PRODUCTS.map((p) => (
                  <tr key={p.kind} className="border-b border-divider last:border-0">
                    <th scope="row" className="px-5 py-3.5 font-semibold">
                      <span className="flex flex-wrap items-center gap-2">
                        {tp(`${p.kind}.name`)}
                        {!DISPONIBLES.has(p.kind) && <ComingSoon />}
                      </span>
                    </th>
                    <td className="px-5 py-3.5 text-muted-foreground">{tp(`${p.kind}.desc`)}</td>
                    <td className="px-5 py-3.5 text-right font-mono whitespace-nowrap text-primary">
                      {p.max === 0 ? t("free") : `${p.min}–${p.max} cr`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-label">{t("productsNote")}</p>
        </div>

        {/* Packs */}
        <h3 className="mt-14 font-heading text-2xl font-bold">{t("packsTitle")}</h3>
        <p className="mt-2 text-muted-foreground">{t("packsSubtitle")}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {packs.map((p) => {
            const featured = p.slug === "modulo";
            return (
              <div
                key={p.id}
                className={`flex flex-col rounded-2xl border p-5 ${
                  featured ? "glow border-tint-primary-border bg-tint-primary" : "bg-card"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-heading text-lg font-semibold">{p.name}</span>
                  {p.bonus_pct > 0 && (
                    <span className="rounded-md border border-tint-pass-border bg-tint-pass px-2 py-0.5 font-mono text-xs text-accent-pass">
                      {t("bonus", { pct: p.bonus_pct })}
                    </span>
                  )}
                </div>
                <p className="mt-4 font-mono text-3xl font-semibold text-primary">{t("credits", { n: p.credits })}</p>
                <p className="mt-1 text-sm text-muted-foreground">{eur(p.price_eur)}</p>
                <Link
                  href={`/registro?rol=alumno&pack=${p.slug}`}
                  className={`mt-5 ${featured ? btnPrimary : btnOutline}`}
                >
                  {t("buy")}
                </Link>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-label">
          {t("creditsNote")}{" "}
          <Link href="/cancelacion" className="text-primary underline-offset-4 hover:underline">
            {t("cancelLink")}
          </Link>
        </p>

        {/* Garantía */}
        <div className="mt-10 flex gap-4 rounded-3xl border border-tint-pass-border bg-tint-pass p-6 sm:p-8">
          <Check aria-hidden className="mt-1 size-6 shrink-0 text-accent-pass" strokeWidth={3} />
          <div>
            <p className="flex flex-wrap items-center gap-2 font-mono text-xs font-semibold tracking-[0.2em] text-accent-pass uppercase">
              {t("guaranteeTitle")}
              <ComingSoon />
            </p>
            <p className="mt-2 text-lg">{t("guaranteeText")}</p>
          </div>
        </div>
      </section>

      {/* ──────────────────────────── 03 — Tutor247 ──────────────────────────── */}
      <section id="tutor247" data-accent="tutor" className="mx-auto max-w-[1200px] scroll-mt-24 px-4 py-16 sm:px-6">
        <SectionLabel>03 — {t("tutorLabel")}</SectionLabel>
        <h2 className={h2}>{t("tutorTitle")}</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">{t("tutorText")}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col rounded-2xl border bg-card p-6">
            <div className="flex items-start justify-between gap-2">
              <span className="font-heading text-xl font-semibold">{tt("plans.autonomo.name")}</span>
              <ComingSoon />
            </div>
            <p className="mt-3 font-heading text-2xl font-bold text-label">{tt("plans.autonomo.price")}</p>
            <ul className="mt-4 flex-1 space-y-2 text-[15px]">
              {(["f1", "f2", "f3", "f4"] as const).map((k) => (
                <li key={k} className="flex gap-2.5">
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={3} />
                  {tt(`plans.autonomo.${k}`)}
                </li>
              ))}
            </ul>
          </div>
          {planesTutor.map((pl) => {
            const key = PLAN_TUTOR[pl.kind]!;
            return (
              <div
                key={pl.id}
                className={`flex flex-col rounded-2xl border p-6 ${
                  key === "familia" ? "glow border-tint-primary-border bg-tint-primary" : "bg-card"
                }`}
              >
                <span className="font-heading text-xl font-semibold">{tt(`plans.${key}.name`)}</span>
                <p className="mt-3 font-heading text-3xl font-bold">
                  {eur(pl.price_eur_month)}
                  <span className="text-base font-normal text-muted-foreground">{t("perMonth")}</span>
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-[15px]">
                  {pl.features.map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={3} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/tutor247#planes" className={`mt-5 ${key === "familia" ? btnPrimary : btnOutline}`}>
                  {t("tutorMore")}
                </Link>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-sm text-label">{t("tutorNote")}</p>
      </section>

      {/* ────────────────────────── 04 — Suscripción IA ────────────────────────── */}
      <section className="border-y border-divider bg-card/40">
        <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
          <SectionLabel>04 — {t("aiLabel")}</SectionLabel>
          <h2 className={h2}>{t("aiTitle")}</h2>
          <p className="mt-3 text-muted-foreground">{t("aiText")}</p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {planesIA.map((pl) => (
              <div
                key={pl.id}
                className={`flex flex-col rounded-2xl border p-6 ${
                  pl.kind === "companero" ? "border-tint-primary-border bg-tint-primary" : "bg-card"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-heading text-xl font-semibold">{pl.name}</span>
                  <ComingSoon />
                </div>
                <p className="mt-3 font-heading text-3xl font-bold">
                  {eur(pl.price_eur_month)}
                  <span className="text-base font-normal text-muted-foreground">{t("perMonth")}</span>
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-[15px]">
                  {pl.features.map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={3} />
                      {f}
                    </li>
                  ))}
                </ul>
                {pl.kind === "gratis" && (
                  <Link href="/diagnostico" className={`mt-5 ${btnOutline}`}>
                    {t("startFree")}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────── FAQ ─────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <h2 className="font-heading text-3xl font-bold tracking-tight">{t("faqTitle")}</h2>
        <div className="mt-6">
          <Faq
            defaultOpen={-1}
            items={(["q1", "q2", "q3", "q4"] as const).map((q) => ({ q: t(`faq.${q}.q`), a: t(`faq.${q}.a`) }))}
          />
        </div>
      </section>
    </main>
  );
}
