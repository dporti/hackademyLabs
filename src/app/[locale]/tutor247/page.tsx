import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check, ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SectionLabel } from "@/components/brand/section-label";
import { ComingSoon } from "@/components/brand/coming-soon";
import { InformeSemanal } from "@/components/brand/informe-semanal";
import { Faq } from "@/components/brand/faq";
import { getPlanes } from "@/lib/catalog";
import type { PlanKind } from "@/lib/db-types";

// Landing de Tutor247 (DISENO.md §2.5 y §6; maqueta docs/diseno/pantallas/Tutor247.html).
// Toda la página en acento magenta (data-accent="tutor"). Absorbe la antigua /familias
// (sección #familias; /familias redirige aquí con 308). Planes y precios desde BD.

export async function generateMetadata({ params }: PageProps<"/[locale]/tutor247">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tutor247" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

// Planes de familia en BD → nombre comercial de Tutor247 (i18n).
const PLAN_FAMILIA: Partial<Record<PlanKind, "familia" | "familiaPlus">> = {
  acompana: "familia",
  acompana_plus: "familiaPlus",
};

const btnPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-5 font-bold text-primary-foreground transition-colors hover:bg-primary/85";
const btnOutline =
  "inline-flex min-h-12 items-center justify-center rounded-xl border border-[#3a3f5c] px-5 font-medium transition-colors hover:border-primary";

export default async function Tutor247Page({ params }: PageProps<"/[locale]/tutor247">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("tutor247");
  const tf = await getTranslations("family");
  const planes = (await getPlanes()).filter((p) => PLAN_FAMILIA[p.kind]);
  const eur = (n: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(n);

  return (
    <main data-accent="tutor" className="flex-1">
      {/* ───────────────────────────── Hero ───────────────────────────── */}
      <section className="hud-grid border-b border-divider">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div>
            <SectionLabel>{t("hero.tag")}</SectionLabel>
            <h1 className="mt-4 font-heading text-[40px] leading-[1.04] font-bold tracking-tight sm:text-6xl">
              {t("hero.title")}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">{t("hero.text")}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/registro?rol=familia" className={`${btnPrimary} glow`}>
                {t("hero.cta1")}
              </Link>
              <a href="#planes" className={btnOutline}>
                {t("hero.cta2")}
              </a>
            </div>
            <p className="mt-4 text-sm text-label">{t("hero.note")}</p>
          </div>

          <InformeSemanal
            d={{
              title: tf("report.title"),
              exampleLabel: tf("report.example"),
              student: tf("report.student"),
              week: tf("report.week"),
              overallLabel: tf("report.overallLabel"),
              overall: { status: "ambar", label: tf("report.overall") },
              consistencyLabel: tf("report.consistencyLabel"),
              consistencyDays: 5,
              consistencyText: tf("report.consistency"),
              workedLabel: tf("report.workedLabel"),
              worked: [
                { code: "0225", text: tf("report.w1"), status: "verde", statusLabel: tf("status.verde") },
                { code: "0221", text: tf("report.w2"), status: "ambar", statusLabel: tf("status.ambar") },
              ],
              upcomingLabel: tf("report.upcomingLabel"),
              upcoming: [
                { date: tf("report.u1date"), text: tf("report.u1") },
                { date: tf("report.u2date"), text: tf("report.u2") },
              ],
              tipLabel: tf("report.tipLabel"),
              tip: tf("report.tip"),
            }}
          />
        </div>
      </section>

      {/* ─────────────────────────── ¿Es para ti? ─────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
        <SectionLabel>01 — {t("forYou.label")}</SectionLabel>
        <h2 className="mt-3 max-w-3xl font-heading text-[32px] leading-[1.1] font-bold tracking-tight sm:text-[42px]">
          {t("forYou.title")}
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(["a", "b", "c", "d"] as const).map((k) => (
            <figure key={k} className="rounded-2xl border bg-card p-5">
              <figcaption className="font-mono text-xs font-semibold tracking-[0.15em] text-primary uppercase">
                {t(`forYou.${k}.tag`)}
              </figcaption>
              <blockquote className="mt-3 text-muted-foreground">«{t(`forYou.${k}.quote`)}»</blockquote>
            </figure>
          ))}
        </div>
      </section>

      {/* ─────────────────────────── Qué incluye ─────────────────────────── */}
      <section className="border-y border-divider bg-card/40">
        <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
          <SectionLabel>02 — {t("includes.label")}</SectionLabel>
          <h2 className="mt-3 max-w-3xl font-heading text-[32px] leading-[1.1] font-bold tracking-tight sm:text-[42px]">
            {t("includes.title")}
          </h2>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(["i1", "i2", "i3", "i4"] as const).map((k, i) => (
              <li
                key={k}
                className={`rounded-2xl border p-5 ${k === "i1" ? "glow border-tint-primary-border bg-tint-primary" : "bg-card"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-2xl font-semibold text-primary">{i + 1}</span>
                  {k === "i2" && <ComingSoon />}
                </div>
                <h3 className="mt-2 font-heading text-lg font-semibold">{t(`includes.${k}.t`)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t(`includes.${k}.d`)}</p>
              </li>
            ))}
          </ol>

          <div className="mt-6 rounded-2xl border bg-card p-6 sm:p-8">
            <p className="font-mono text-xs font-semibold tracking-[0.2em] text-primary uppercase">
              {t("modes.tag")}
            </p>
            <h3 className="mt-3 max-w-2xl font-heading text-2xl leading-tight font-bold">{t("modes.title")}</h3>
            <ul className="mt-5 grid gap-3 md:grid-cols-3">
              {(["b1", "b2", "b3"] as const).map((k) => (
                <li key={k} className="flex gap-2.5 text-[15px]">
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={3} />
                  {t(`modes.${k}`)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ─────────────────────────── Para familias ─────────────────────────── */}
      <section id="familias" className="mx-auto max-w-[1200px] scroll-mt-24 px-4 py-16 sm:px-6">
        <SectionLabel>03 — {t("families.tag")}</SectionLabel>
        <h2 className="mt-3 max-w-3xl font-heading text-[32px] leading-[1.1] font-bold tracking-tight sm:text-[42px]">
          {t("families.title")}
        </h2>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{t("families.text")}</p>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(["s1", "s2", "s3", "s4", "s5"] as const).map((k) => (
            <li key={k} className="rounded-2xl border bg-card p-5">
              <h3 className="flex items-start gap-2.5 font-semibold">
                <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
                {t(`families.${k}.t`)}
              </h3>
              <p className="mt-1.5 pl-7.5 text-sm text-muted-foreground">{t(`families.${k}.d`)}</p>
            </li>
          ))}
        </ul>

        <h3 className="mt-14 font-heading text-2xl font-bold">{t("families.howTitle")}</h3>
        <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(["s1", "s2", "s3", "s4"] as const).map((s, i) => (
            <li key={s} className="rounded-2xl border bg-card p-5">
              <span className="font-mono text-sm text-primary">0{i + 1}</span>
              <h4 className="mt-2 font-semibold">{tf(`how.${s}.title`)}</h4>
              <p className="mt-1 text-sm text-muted-foreground">{tf(`how.${s}.text`)}</p>
            </li>
          ))}
        </ol>

        <h3 className="mt-14 font-heading text-2xl font-bold">{t("families.faqTitle")}</h3>
        <div className="mt-5 max-w-3xl">
          <Faq
            defaultOpen={-1}
            items={(["q1", "q2", "q3", "q4"] as const).map((q) => ({ q: tf(`faq.${q}.q`), a: tf(`faq.${q}.a`) }))}
          />
        </div>
      </section>

      {/* ────────────────────────────── Planes ────────────────────────────── */}
      <section id="planes" className="scroll-mt-24 border-y border-divider bg-card/40">
        <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
          <SectionLabel>04 — {t("plans.label")}</SectionLabel>
          <h2 className="mt-3 font-heading text-[32px] leading-[1.1] font-bold tracking-tight sm:text-[42px]">
            {t("plans.title")}
          </h2>
          <p className="mt-3 text-muted-foreground">{t("plans.note")}</p>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {/* Autónomo: aún sin plan en BD ni precio decidido. */}
            <article className="flex flex-col rounded-3xl border bg-card p-6 sm:p-7">
              <div className="flex items-start justify-between gap-2">
                <p className="font-mono text-xs font-semibold tracking-[0.2em] text-primary uppercase">
                  {t("plans.autonomo.tag")}
                </p>
                <ComingSoon />
              </div>
              <h3 className="mt-3 font-heading text-2xl font-bold">{t("plans.autonomo.name")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t("plans.autonomo.audience")}</p>
              <p className="mt-5 font-heading text-2xl font-bold text-label">{t("plans.autonomo.price")}</p>
              <ul className="mt-5 flex-1 space-y-2 text-[15px]">
                {(["f1", "f2", "f3", "f4"] as const).map((k) => (
                  <li key={k} className="flex gap-2.5">
                    <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={3} />
                    {t(`plans.autonomo.${k}`)}
                  </li>
                ))}
              </ul>
            </article>

            {planes.map((pl) => {
              const key = PLAN_FAMILIA[pl.kind]!;
              const destacado = key === "familia";
              return (
                <article
                  key={pl.id}
                  className={`flex flex-col rounded-3xl border p-6 sm:p-7 ${
                    destacado ? "glow border-tint-primary-border bg-tint-primary" : "bg-card"
                  }`}
                >
                  <p className="font-mono text-xs font-semibold tracking-[0.2em] text-primary uppercase">
                    {t(`plans.${key}.tag`)}
                  </p>
                  <h3 className="mt-3 font-heading text-2xl font-bold">{t(`plans.${key}.name`)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t(`plans.${key}.audience`)}</p>
                  <p className="mt-5 font-heading text-4xl font-bold">
                    {eur(pl.price_eur_month)}
                    <span className="text-base font-normal text-muted-foreground">{t("plans.perMonth")}</span>
                  </p>
                  <ul className="mt-5 flex-1 space-y-2 text-[15px]">
                    {pl.features.map((f) => (
                      <li key={f} className="flex gap-2.5">
                        <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={3} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/registro?rol=familia&plan=${pl.kind}`}
                    className={`mt-7 ${destacado ? btnPrimary : btnOutline}`}
                  >
                    {t("plans.cta")}
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ──────────────────────────── CTA final ──────────────────────────── */}
      <section className="hud-grid">
        <div className="mx-auto max-w-[1200px] px-4 py-20 text-center sm:px-6">
          <h2 className="mx-auto max-w-3xl font-heading text-[34px] leading-[1.1] font-bold tracking-tight sm:text-5xl">
            {t("final.title")}
          </h2>
          <Link href="/registro?rol=familia" className={`${btnPrimary} glow mt-8`}>
            {t("final.cta")}
          </Link>
        </div>
      </section>
    </main>
  );
}
