import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check, Minus, Siren } from "lucide-react";
import { getPathname, Link } from "@/i18n/navigation";
import { SectionLabel } from "@/components/brand/section-label";
import { ComingSoon } from "@/components/brand/coming-soon";
import { CodeDemo } from "@/components/brand/code-demo";
import { ModelCard } from "@/components/brand/model-card";
import { Ticker, TrustStrip } from "@/components/brand/trust-strip";
import { BeforeAfter } from "@/components/brand/before-after";
import { PathFinder } from "@/components/brand/path-finder";
import { MapaDominio, type RaProgress } from "@/components/brand/mapa-dominio";
import { ModuleCard } from "@/components/brand/module-card";
import { MentorCard } from "@/components/brand/mentor-card";
import { BitChatDemo, type BitMensaje } from "@/components/brand/bit-chat-demo";
import { ComparisonTable } from "@/components/brand/comparison-table";
import { FounderBlock } from "@/components/brand/founder-block";
import { Testimonials, TESTIMONIOS } from "@/components/brand/testimonials";
import { Faq } from "@/components/brand/faq";
import {
  getCiclosConModulos,
  getMentores,
  getModulosDiagnosticables,
  getModulosKiller,
} from "@/lib/catalog";
import { creditRange, product } from "@/lib/products";
import type { ProductKind } from "@/lib/db-types";

// Portada (DISENO.md §6, orden de secciones; maqueta docs/diseno/pantallas/Main.html).
// Dos modelos: Aprueba tu módulo (cian) y Tutor247 (magenta, data-accent="tutor").
// Módulos, mentores y cifras del catálogo salen de BD; lo no construido lleva
// «Próximamente»; sin testimonios ni estadísticas inventadas.

// Mapa de ejemplo de la sección «La fórmula» (4 niveles).
const MAPA_EJEMPLO: RaProgress[] = [
  { code: "UF1", label: "", status: "verde", progress: 100 },
  { code: "UF2", label: "", status: "ambar", progress: 75 },
  { code: "UF3", label: "", status: "ambar", progress: 40 },
  { code: "UF4", label: "", status: "rojo", progress: 12 },
];

// Cómo preparar el módulo: productos con créditos. `soon` = aún no se puede comprar.
const PREPARAR: { kind: ProductKind; desde?: boolean; soon?: boolean }[] = [
  { kind: "plan_modulo", desde: true, soon: true },
  { kind: "rescate_48h", desde: true, soon: true },
  { kind: "ticket_express" },
  { kind: "simulacro", soon: true },
];

const FAQS = ["q1", "q2", "q3", "q4", "q5", "q6", "q7"] as const;
const SEMANA = ["d1", "d2", "d3", "d4", "d5", "d6"] as const;
// Días de la semana tipo que dependen de Bit (aún no construido).
const SEMANA_BIT = new Set(["d1", "d2"]);

const btnPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-5 font-bold text-primary-foreground transition-colors hover:bg-primary/85";
const btnOutline =
  "inline-flex min-h-12 items-center justify-center rounded-xl border border-[#3a3f5c] px-5 font-medium transition-colors hover:border-primary";

function Titulo({ label, title, text, tone }: { label: string; title: React.ReactNode; text?: string; tone?: "primary" | "secondary" }) {
  return (
    <div className="max-w-3xl">
      <SectionLabel tone={tone}>{label}</SectionLabel>
      <h2 className="mt-3 font-heading text-[32px] leading-[1.1] font-bold tracking-tight sm:text-[42px]">{title}</h2>
      {text && <p className="mt-3 text-lg text-muted-foreground">{text}</p>}
    </div>
  );
}

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const c = await getTranslations("common");
  const tp = await getTranslations("products");
  const tm = await getTranslations("mentors");
  const [ciclos, killer, diagnosticables, mentores] = await Promise.all([
    getCiclosConModulos(),
    getModulosKiller(),
    getModulosDiagnosticables(),
    getMentores(),
  ]);
  const nModulos = new Set(ciclos.flatMap((ci) => ci.ciclo_modulo.map((cm) => cm.modulo.code))).size;

  const chat: BitMensaje[] = [
    { de: "bit", autor: t("tutor.bitLabel"), texto: t("tutor.m1") },
    { de: "alumno", autor: t("tutor.youLabel"), texto: t("tutor.m2") },
    { de: "bit", autor: t("tutor.bitLabel"), texto: t("tutor.m3") },
    { de: "tutor", autor: t("tutor.tutorLabel"), texto: t("tutor.m4") },
  ];
  const stats = [
    { v: String(ciclos.length), l: t("hero.statCycles") },
    { v: String(nModulos), l: t("hero.statModules") },
    { v: "24/7", l: t("hero.statBit"), soon: true },
    { v: "1:1", l: t("hero.statMentor") },
  ];

  return (
    <main className="flex-1">
      {/* 1 ─────────────────────────────── Hero ─────────────────────────────── */}
      <section className="hud-grid border-b border-divider">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div>
            <SectionLabel>{t("hero.eyebrow")}</SectionLabel>
            <h1 className="mt-4 font-heading text-[40px] leading-[1.02] font-bold tracking-tight sm:text-6xl">
              {t("hero.title")}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">{t("hero.text")}</p>

            {/* El módulo que te preocupa → su diagnóstico (GET ?m=código). */}
            <form
              action={getPathname({ href: "/diagnostico", locale })}
              className="mt-7 flex max-w-xl flex-col gap-2.5 sm:flex-row"
            >
              <label htmlFor="hero-modulo" className="sr-only">
                {t("hero.searchLabel")}
              </label>
              <select
                id="hero-modulo"
                name="m"
                defaultValue=""
                className="min-h-12 flex-1 rounded-xl border border-border bg-card px-4 text-[15px] outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">{t("hero.searchLabel")}</option>
                {diagnosticables.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.code} · {m.name}
                  </option>
                ))}
              </select>
              <button type="submit" className={`${btnPrimary} glow whitespace-nowrap`}>
                {t("hero.searchCta")}
              </button>
            </form>
            <p className="mt-3 text-sm text-label">{t("hero.note")}</p>

            <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.l}>
                  <dt className="sr-only">{s.l}</dt>
                  <dd>
                    <span className="block font-mono text-2xl font-semibold text-primary">{s.v}</span>
                    <span className="mt-1 block text-xs leading-snug text-muted-foreground">{s.l}</span>
                    {s.soon && <ComingSoon className="mt-1" />}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <CodeDemo
            aria={t("demo.aria")}
            file={t("demo.file")}
            comment={t("demo.comment")}
            example={c("example")}
            bit={{ label: t("demo.bitLabel"), text: t("demo.bitMsg") }}
            mentor={{ label: t("demo.mentorLabel"), text: t("demo.mentorMsg") }}
          />
        </div>
      </section>

      {/* 2 ──────────────────────────── Dos modelos ──────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
        <p className="text-center font-mono text-xs font-semibold tracking-[0.2em] text-label uppercase">
          {t("models.label")}
        </p>
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <ModelCard
            tone="aprueba"
            d={{
              tag: t("models.aprueba.tag"),
              audience: t("models.aprueba.audience"),
              title1: t("models.aprueba.title1"),
              title2: t("models.aprueba.title2"),
              text: t("models.aprueba.text"),
              bullets: [
                { text: t("models.aprueba.b1") },
                { text: t("models.aprueba.b2") },
                { text: t("models.aprueba.b3") },
                { text: t("models.aprueba.b4"), soon: true },
              ],
              primary: { href: "/modulos", label: t("models.aprueba.cta1") },
              secondary: { href: "/diagnostico", label: t("models.aprueba.cta2") },
            }}
          />
          <ModelCard
            tone="tutor"
            d={{
              tag: t("models.tutor.tag"),
              audience: t("models.tutor.audience"),
              title1: t("models.tutor.title1"),
              title2: t("models.tutor.title2"),
              text: t("models.tutor.text"),
              bullets: [
                { text: t("models.tutor.b1") },
                { text: t("models.tutor.b2"), soon: true },
                { text: t("models.tutor.b3") },
                { text: t("models.tutor.b4") },
              ],
              primary: { href: "/tutor247", label: t("models.tutor.cta1") },
              secondary: { href: "/tutor247#familias", label: t("models.tutor.cta2") },
            }}
          />
        </div>
      </section>

      {/* 3 ────────────────────────── Ticker + confianza ────────────────────────── */}
      <Ticker phrases={(["p1", "p2", "p3", "p4", "p5"] as const).map((p) => t(`ticker.${p}`))} />
      <TrustStrip
        label={t("trust.aria")}
        items={(["t1", "t2", "t3", "t4"] as const).map((k) => t(`trust.${k}`))}
      />

      {/* 4 ──────────────────────────── El problema ──────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
        <Titulo
          label={`01 — ${t("problem.label")}`}
          title={
            <>
              {t("problem.title1")}
              <br />
              <span className="text-primary">{t("problem.title2")}</span>
            </>
          }
          text={t("problem.text")}
        />
        <div className="mt-10">
          <BeforeAfter
            withoutLabel={t("problem.without")}
            withLabel={t("problem.with")}
            without={(["w1", "w2", "w3", "w4"] as const).map((k) => t(`problem.${k}`))}
            withItems={(["c1", "c2", "c3", "c4"] as const).map((k) => t(`problem.${k}`))}
          />
        </div>
      </section>

      {/* 5 ─────────────────────────── ¿Cómo estudias? ─────────────────────────── */}
      <section className="border-y border-divider bg-card/40">
        <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
          <Titulo label={`02 — ${t("modes.label")}`} title={t("modes.title")} text={t("modes.text")} />
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {(["presencial", "online"] as const).map((m) => (
              <article
                key={m}
                data-accent={m === "online" ? "tutor" : undefined}
                className="flex flex-col rounded-3xl border bg-card p-6 sm:p-8"
              >
                <p className="font-mono text-xs font-semibold tracking-[0.2em] text-primary uppercase">
                  {t(`modes.${m}.tag`)}
                </p>
                <h3 className="mt-3 font-heading text-2xl leading-tight font-bold">{t(`modes.${m}.title`)}</h3>
                <blockquote className="mt-4 border-l-2 border-primary pl-4 text-muted-foreground italic">
                  «{t(`modes.${m}.quote`)}»
                </blockquote>
                <div className="mt-6 grid flex-1 gap-6 sm:grid-cols-2">
                  <div>
                    <p className="text-sm font-semibold text-label">{t("modes.problems")}</p>
                    <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                      {(["p1", "p2", "p3"] as const).map((k) => (
                        <li key={k} className="flex gap-2">
                          <Minus aria-hidden className="mt-0.5 size-4 shrink-0" />
                          {t(`modes.${m}.${k}`)}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-label">{t("modes.doing")}</p>
                    <ul className="mt-2 space-y-2 text-sm">
                      {(["d1", "d2", "d3"] as const).map((k) => (
                        <li key={k} className="flex gap-2">
                          <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={3} />
                          <span>
                            {t(`modes.${m}.${k}`)}
                            {m === "online" && k === "d2" && <ComingSoon className="ml-1.5 align-middle" />}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <Link
                  href={m === "online" ? "/tutor247" : "/modulos"}
                  className="mt-7 inline-flex min-h-11 items-center text-[15px] font-semibold text-primary underline-offset-4 hover:underline"
                >
                  {t(`modes.${m}.cta`)} →
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 6 ───────────────────────── Encuentra tu camino ───────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
        <Titulo label={`03 — ${t("path.label")}`} title={t("path.title")} text={t("path.text")} />
        <div className="mt-10">
          <PathFinder />
        </div>
      </section>

      {/* 7 ───────────────────────── Aprueba tu módulo ───────────────────────── */}
      <section className="border-y border-divider bg-card/40">
        <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <Titulo
              label={`04 — ${t("approve.label")}`}
              title={
                <>
                  {t("approve.title1")}
                  <br />
                  <span className="text-primary">{t("approve.title2")}</span>
                </>
              }
              text={t("approve.text")}
            />
            <Link href="/diagnostico" className={btnPrimary}>
              {t("approve.cta")}
            </Link>
          </div>

          <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {(["s1", "s2", "s3", "s4", "s5"] as const).map((s, i) => (
              <li
                key={s}
                className={`rounded-2xl border p-5 ${
                  s === "s5" ? "border-tint-pass-border bg-tint-pass" : "bg-card"
                }`}
              >
                <span className={`font-mono text-sm ${s === "s5" ? "text-accent-pass" : "text-primary"}`}>
                  0{i + 1}
                </span>
                <h3 className="mt-2 font-heading text-lg font-semibold">{t(`approve.${s}.t`)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t(`approve.${s}.d`)}</p>
              </li>
            ))}
          </ol>

          {killer.length > 0 && (
            <div className="mt-12">
              <h3 className="font-heading text-xl font-semibold">{t("approve.killerTitle")}</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {killer.map((m) => (
                  <ModuleCard key={m.code} modulo={m} killerLabel={c("killer")} />
                ))}
              </div>
              <Link
                href="/modulos"
                className="mt-4 inline-flex min-h-11 items-center text-[15px] font-semibold text-primary underline-offset-4 hover:underline"
              >
                {t("approve.killerAll")} →
              </Link>
            </div>
          )}

          <div className="mt-10">
            <h3 className="font-heading text-xl font-semibold">{t("approve.prepTitle")}</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {PREPARAR.map((p) => (
                <div
                  key={p.kind}
                  className={`flex flex-col rounded-2xl border p-5 ${
                    p.kind === "plan_modulo" ? "glow border-tint-primary-border bg-tint-primary" : "bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-heading text-lg font-semibold">{tp(`${p.kind}.name`)}</h4>
                    {p.soon && <ComingSoon />}
                  </div>
                  <p className="mt-2 flex-1 text-sm text-muted-foreground">{tp(`${p.kind}.desc`)}</p>
                  <p className="mt-4 font-mono text-lg font-semibold text-primary">
                    {p.desde
                      ? t("approve.creditsFrom", { n: product(p.kind).min })
                      : t("approve.creditsRange", { range: creditRange(p.kind) })}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-5 rounded-2xl border border-tint-pass-border bg-tint-pass p-4 text-sm">
              <Check aria-hidden className="mr-2 inline size-4 text-accent-pass" strokeWidth={3} />
              {t("approve.guarantee")}
            </p>
          </div>
        </div>
      </section>

      {/* 8 ───────────────────────────── La fórmula ───────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
        <Titulo label={`05 — ${t("formula.label")}`} title={t("formula.title")} text={t("formula.text")} />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {(["f1", "f2", "f3"] as const).map((f) => (
            <div key={f} className="rounded-2xl border bg-card p-6">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-mono text-sm font-semibold tracking-[0.15em] text-primary uppercase">
                  {t(`formula.${f}.t`)}
                </h3>
                {f !== "f2" && <ComingSoon />}
              </div>
              <p className="mt-3 text-muted-foreground">{t(`formula.${f}.d`)}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid items-center gap-8 rounded-3xl border border-tint-primary-border bg-tint-primary p-6 sm:p-8 lg:grid-cols-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <SectionLabel>{t("formula.examTag")}</SectionLabel>
              <ComingSoon />
            </div>
            <h3 className="mt-3 font-heading text-2xl leading-tight font-bold sm:text-3xl">{t("formula.examTitle")}</h3>
            <p className="mt-3 text-muted-foreground">{t("formula.examText")}</p>
          </div>
          <div>
            <MapaDominio code="0485" name={t("formula.mapName")} ras={MAPA_EJEMPLO} />
            <p className="mt-2 text-center text-xs text-label">{t("formula.mapCaption")}</p>
          </div>
        </div>
      </section>

      {/* 9 ─────────────────────────────── Tutor247 ─────────────────────────────── */}
      <section data-accent="tutor" className="border-y border-tint-secondary-border bg-tint-secondary/60">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-start gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <Titulo label={`06 — ${t("tutor.label")}`} title={t("tutor.title")} text={t("tutor.text")} />
            <ol aria-label={t("tutor.weekAria")} className="mt-8 space-y-2.5">
              {SEMANA.map((d) => (
                <li key={d} className="flex items-start gap-4 rounded-xl border bg-card px-4 py-3">
                  <span className="w-10 shrink-0 font-mono text-sm font-semibold text-primary">
                    {t(`tutor.${d}.day`)}
                  </span>
                  <span className="text-[15px]">
                    {t(`tutor.${d}.text`)}
                    {SEMANA_BIT.has(d) && <ComingSoon className="ml-2 align-middle" />}
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/tutor247" className={btnPrimary}>
                {t("tutor.cta1")}
              </Link>
              <Link href="/tutor247#familias" className={btnOutline}>
                {t("tutor.cta2")}
              </Link>
            </div>
          </div>
          <BitChatDemo
            titulo={t("tutor.chatTitle")}
            subtitulo={t("tutor.chatSubtitle")}
            ejemplo={c("example")}
            mensajes={chat}
            pie={t("tutor.chatNote")}
          />
        </div>
      </section>

      {/* 10 ──────────────────────────── ¿Cuál es el mío? ──────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
        <Titulo label={`07 — ${t("compare.label")}`} title={t("compare.title")} />
        <div className="mt-10">
          <ComparisonTable
            caption={t("compare.caption")}
            heads={{ aprueba: t("models.aprueba.tag"), tutor: t("models.tutor.tag") }}
            rows={(["r1", "r2", "r3", "r4", "r5", "r6"] as const).map((r) => ({
              k: t(`compare.${r}.k`),
              a: t(`compare.${r}.a`),
              t: t(`compare.${r}.t`),
            }))}
            ctas={{
              aprueba: { href: "/modulos", label: t("models.aprueba.cta1") },
              tutor: { href: "/tutor247", label: t("models.tutor.cta1") },
            }}
          />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {t("compare.combine")} {t("compare.aiSoon")}
        </p>
      </section>

      {/* 11 ──────────────────────────── Mentores + SOS ──────────────────────────── */}
      <section className="border-y border-divider bg-card/40">
        <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
          {mentores.length > 0 && (
            <>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <Titulo label={`08 — ${t("mentors.label")}`} title={t("mentors.title")} />
                <Link
                  href="/mentores"
                  className="inline-flex min-h-11 items-center text-[15px] font-semibold text-primary underline-offset-4 hover:underline"
                >
                  {t("mentors.all")} →
                </Link>
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {mentores.slice(0, 4).map((m) => (
                  <MentorCard
                    key={m.profile_id}
                    id={m.profile_id}
                    name={m.full_name}
                    level={m.level}
                    levelLabel={tm(`level.${m.level}`)}
                    headline={m.headline}
                    moduleCodes={m.modulos.map((mo) => mo.code)}
                  />
                ))}
              </div>
            </>
          )}
          <p className="mt-6 text-sm text-muted-foreground">
            {t("mentors.join")}{" "}
            <Link href="/hazte-mentor" className="text-primary underline-offset-4 hover:underline">
              {t("mentors.joinLink")}
            </Link>
          </p>

          <div className="mt-10 grid items-center gap-6 rounded-3xl border border-tint-sos-border bg-tint-sos p-6 sm:p-8 md:grid-cols-[1fr_auto]">
            <div>
              <p className="flex flex-wrap items-center gap-2 font-mono text-sm font-bold tracking-[0.15em] text-sos-text uppercase">
                <Siren aria-hidden className="size-4" />
                {t("sos.tag")}
                <ComingSoon />
              </p>
              <p className="mt-3 text-lg">{t("sos.text")}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("sos.now")}</p>
            </div>
            <Link
              href="/panel/tickets"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-sos px-5 font-mono font-bold text-sos-text transition-colors hover:bg-sos/10"
            >
              {t("sos.cta")}
            </Link>
          </div>
        </div>
      </section>

      {/* 12 ─────────────────────────────── Fundador ─────────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
        <FounderBlock
          label={`09 — ${t("founder.label")}`}
          title={t("founder.title")}
          quote={t("founder.quote")}
          name={t("founder.name")}
          role={t("founder.role")}
        />
      </section>

      {/* 13 ─────────── Testimonios: ocultos hasta tener reales con permiso ─────────── */}
      <Testimonials label={`10 — ${t("testimonials.label")}`} title={t("testimonials.title")} />

      {/* 14 ─────────────────────────────── FAQ ─────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Titulo label={`${TESTIMONIOS.length > 0 ? "11" : "10"} — ${t("faq.label")}`} title={t("faq.title")} />
        <div className="mt-8">
          <Faq items={FAQS.map((q) => ({ q: t(`faq.${q}.q`), a: t(`faq.${q}.a`) }))} />
        </div>
      </section>

      {/* 15 ──────────────────────────── CTA final ──────────────────────────── */}
      <section className="hud-grid border-t border-divider">
        <div className="mx-auto max-w-[1200px] px-4 py-20 text-center sm:px-6">
          <p className="font-mono text-xs font-semibold tracking-[0.2em] text-warning uppercase">{t("final.tag")}</p>
          <h2 className="mx-auto mt-4 max-w-3xl font-heading text-[34px] leading-[1.1] font-bold tracking-tight sm:text-5xl">
            {t("final.title")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">{t("final.text")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/diagnostico" className={`${btnPrimary} glow`}>
              {t("final.cta1")}
            </Link>
            <span data-accent="tutor">
              <Link href="/tutor247" className={btnOutline}>
                {t("final.cta2")}
              </Link>
            </span>
          </div>
          <p className="mt-4 text-sm text-label">{t("final.note")}</p>
        </div>
      </section>
    </main>
  );
}
