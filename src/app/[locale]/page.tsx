import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { MapaDominio, type RaProgress } from "@/components/brand/mapa-dominio";
import { ModuleCard } from "@/components/brand/module-card";
import { MentorCard } from "@/components/brand/mentor-card";
import { BitChatDemo, type BitMensaje } from "@/components/brand/bit-chat-demo";
import { getMentores, getModulosDiagnosticables, getModulosKiller } from "@/lib/catalog";
import { creditRange } from "@/lib/products";
import type { ProductKind } from "@/lib/db-types";

// Home = página de venta (docs/modelo-negocio §2, §5, §10; capa-ia §1, §6).
// Todo lo que el producto promete se puede ver y probar sin cuenta; el gancho es
// el diagnóstico gratis. Sin testimonios ni cifras inventadas.

const HERO_RA: RaProgress[] = [
  { code: "RA1", label: "", status: "verde", progress: 100 },
  { code: "RA2", label: "", status: "verde", progress: 100 },
  { code: "RA3", label: "", status: "ambar", progress: 60 },
  { code: "RA4", label: "", status: "rojo", progress: 20 },
  { code: "RA5", label: "", status: "rojo", progress: 15 },
  { code: "RA6", label: "", status: "ambar", progress: 45 },
  { code: "RA7", label: "", status: "verde", progress: 100 },
];

const DOLORES = [
  { k: "d1", href: "/diagnostico?m=0485" },
  { k: "d2", href: "/diagnostico" },
  { k: "d3", href: "/precios#productos" },
  { k: "d4", href: "/precios#productos" },
] as const;

const DIFERENCIAS = ["catalogo", "mapa", "plan", "urgencia", "mentores", "etica"] as const;

const PRODUCTOS: ProductKind[] = ["ticket_express", "simulacro", "rescate_48h", "plan_modulo"];

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const c = await getTranslations("common");
  const tp = await getTranslations("products");
  const tm = await getTranslations("mentors");
  const td = await getTranslations("diagnostico");
  const [killer, diagnosticables, mentores] = await Promise.all([
    getModulosKiller(),
    getModulosDiagnosticables(),
    getMentores(),
  ]);

  const chat: BitMensaje[] = (["m1", "m2", "m3", "m4", "m5", "m6"] as const).map((k) => ({
    de: k === "m6" ? "sistema" : k === "m1" || k === "m3" ? "alumno" : "bit",
    texto: t(`bit.chat.${k}`),
  }));

  return (
    <main className="flex-1">
      {/* ───────────────────────────── Hero ───────────────────────────── */}
      <section className="hud-grid border-b border-border/60">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div>
            <h1 className="font-display text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl lg:text-6xl">
              {c("tagline")}
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">{t("heroSubtitle")}</p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                size="lg"
                className="glow"
                nativeButton={false}
                render={<Link href="/diagnostico" />}
              >
                {t("ctaDiagnostic")}
              </Button>
              <Button
                size="lg"
                variant="ghost"
                nativeButton={false}
                render={<Link href="/familias" />}
              >
                {t("familyCta")}
              </Button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{t("ctaNote")}</p>

            {/* Atajo: el módulo que te preocupa → su diagnóstico. */}
            <div className="mt-8">
              <p className="text-sm font-medium">{t("worryTitle")}</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {diagnosticables.map((m) => (
                  <li key={m.code}>
                    <Link
                      href={`/diagnostico?m=${m.code}`}
                      title={m.name}
                      className="inline-flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 text-sm transition-colors hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <span className="font-mono text-primary">{m.code}</span>
                      <span className="max-w-[11rem] truncate text-muted-foreground">{m.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <form action="/modulos" className="mt-3 flex max-w-md items-center gap-2">
                <input
                  type="search"
                  name="q"
                  aria-label={t("searchLabel")}
                  placeholder={t("searchPlaceholder")}
                  className="h-10 flex-1 rounded-md border border-input bg-card px-3 text-sm outline-none transition focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button type="submit" variant="secondary">
                  {t("searchLabel")}
                </Button>
              </form>
            </div>
          </div>

          <div>
            <MapaDominio
              code="0485"
              name="Programación"
              ras={HERO_RA}
              statusLabels={{
                verde: td("map.verde"),
                ambar: td("map.ambar"),
                rojo: td("map.rojo"),
              }}
            />
            <p className="mt-2 text-center text-xs text-muted-foreground">{t("mapaCaption")}</p>
          </div>
        </div>
      </section>

      {/* ──────────────────────────── ¿Te suena? ──────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-3xl font-bold tracking-tight">{t("painTitle")}</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {DOLORES.map((d) => (
            <Link
              key={d.k}
              href={d.href}
              className="card-interactive group flex flex-col rounded-xl border bg-card p-6"
            >
              <p className="font-display text-lg font-semibold">“{t(`pain.${d.k}.quote`)}”</p>
              <p className="mt-2 text-sm text-muted-foreground">{t(`pain.${d.k}.answer`)}</p>
              <span className="mt-4 text-sm font-medium text-primary group-hover:underline">
                {t(`pain.${d.k}.cta`)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ─────────────────────────── Cómo funciona ─────────────────────────── */}
      <section className="border-y border-border/60 bg-[var(--surface-2)]">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-3xl font-bold tracking-tight">{t("processTitle")}</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {(["s1", "s2", "s3"] as const).map((s, i) => (
              <li key={s} className="rounded-xl border bg-card p-6">
                <span className="font-mono text-sm text-primary">0{i + 1}</span>
                <h3 className="mt-2 font-display text-lg font-semibold">{t(`${s}t`)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t(`${s}d`)}</p>
              </li>
            ))}
          </ol>
          <Button className="mt-8" nativeButton={false} render={<Link href="/diagnostico" />}>
            {t("ctaDiagnostic")}
          </Button>
        </div>
      </section>

      {/* ───────────────────────── Lo que nadie más hace ───────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="max-w-3xl font-display text-3xl font-bold tracking-tight">{t("diffTitle")}</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("diffSubtitle")}</p>
        <dl className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
          {DIFERENCIAS.map((k) => (
            <div key={k} className="border-l-2 border-primary/50 pl-4">
              <dt className="font-display text-lg font-semibold">{t(`diff.${k}.title`)}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{t(`diff.${k}.text`)}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ──────────────────────────────── Bit ──────────────────────────────── */}
      <section className="border-y border-border/60 bg-[var(--surface-2)]">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight">{t("bit.title")}</h2>
            <p className="mt-3 text-muted-foreground">{t("bit.subtitle")}</p>
            <ul className="mt-6 space-y-3 text-sm">
              {(["p1", "p2", "p3", "p4"] as const).map((p) => (
                <li key={p} className="flex gap-3">
                  <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-secondary" />
                  <span>
                    <span className="font-medium">{t(`bit.points.${p}.title`)}</span>{" "}
                    <span className="text-muted-foreground">{t(`bit.points.${p}.text`)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <BitChatDemo
            titulo={t("bit.chatTitle")}
            subtitulo={t("bit.chatSubtitle")}
            ejemplo={t("bit.example")}
            mensajes={chat}
          />
        </div>
      </section>

      {/* ───────────────────────────── Productos ───────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-3xl font-bold tracking-tight">{t("productsTitle")}</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("productsSubtitle")}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRODUCTOS.map((k) => (
            <div
              key={k}
              className={`flex flex-col rounded-xl border bg-card p-5 ${
                k === "plan_modulo" ? "glow border-primary/40" : ""
              }`}
            >
              <h3 className="font-display text-lg font-semibold">{tp(`${k}.name`)}</h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{tp(`${k}.desc`)}</p>
              <p className="mt-4 font-mono text-xl font-bold text-primary">
                {t("creditsRange", { range: creditRange(k) })}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button variant="secondary" nativeButton={false} render={<Link href="/precios" />}>
            {t("productsCta")}
          </Button>
          <p className="text-sm text-muted-foreground">{t("productsNote")}</p>
        </div>
      </section>

      {/* ─────────────────────────── Garantía ─────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div
          className="rounded-2xl border p-8 sm:p-10"
          style={{
            borderColor: "color-mix(in oklab, var(--secondary) 50%, transparent)",
            background: "color-mix(in oklab, var(--secondary) 8%, var(--card))",
          }}
        >
          <h2 className="font-display text-3xl font-bold tracking-tight">{t("guaranteeTitle")}</h2>
          <p className="mt-3 max-w-3xl text-lg">{t("guaranteeText")}</p>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">{t("guaranteeSmall")}</p>
        </div>
      </section>

      {/* ───────────────────────────── Mentores ───────────────────────────── */}
      {mentores.length > 0 && (
        <section className="border-y border-border/60 bg-[var(--surface-2)]">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-bold tracking-tight">{t("mentorsTitle")}</h2>
                <p className="mt-2 max-w-2xl text-muted-foreground">{t("mentorsSubtitle")}</p>
              </div>
              <Link href="/mentores" className="text-sm text-primary hover:underline">
                {t("mentorsAll")}
              </Link>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mentores.slice(0, 3).map((m) => (
                <MentorCard
                  key={m.profile_id}
                  id={m.profile_id}
                  name={m.full_name}
                  level={m.level}
                  levelLabel={tm(`level.${m.level}`)}
                  headline={m.headline}
                  moduleCodes={m.modulos.map((mo) => mo.code)}
                  responseMinutes={m.response_time_minutes}
                />
              ))}
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              {t("mentorJoin")}{" "}
              <Link href="/hazte-mentor" className="text-primary underline-offset-4 hover:underline">
                {t("mentorJoinLink")}
              </Link>
            </p>
          </div>
        </section>
      )}

      {/* ───────────────────────── Módulos killer ─────────────────────── */}
      {killer.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight">{t("killerTitle")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("killerSubtitle")}</p>
            </div>
            <Link href="/modulos" className="shrink-0 text-sm text-primary hover:underline">
              {c("viewModule")}
            </Link>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {killer.map((m) => (
              <ModuleCard key={m.code} modulo={m} killerLabel={c("killer")} />
            ))}
          </div>
        </section>
      )}

      {/* ─────────────────── Franja familias (tema claro) ─────────────── */}
      <section data-theme="family" className="bg-background">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 px-4 py-14 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
              {t("familyTitle")}
            </h2>
            <p className="mt-2 text-muted-foreground">{t("familyText")}</p>
          </div>
          <Button size="lg" nativeButton={false} render={<Link href="/familias" />}>
            {t("familyCta2")}
          </Button>
        </div>
      </section>

      {/* ─────────────────────────────── FAQ ─────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="font-display text-3xl font-bold tracking-tight">{t("faqTitle")}</h2>
        <div className="mt-6 divide-y rounded-xl border bg-card">
          {(["q1", "q2", "q3", "q4", "q5", "q6"] as const).map((q) => (
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

      {/* ──────────────────────────── CTA final ──────────────────────────── */}
      <section className="hud-grid border-t border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t("finalTitle")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{t("finalText")}</p>
          <Button
            size="lg"
            className="glow mt-7"
            nativeButton={false}
            render={<Link href="/diagnostico" />}
          >
            {t("ctaDiagnostic")}
          </Button>
        </div>
      </section>
    </main>
  );
}
