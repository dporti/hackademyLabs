import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { MapaDominio, type RaProgress } from "@/components/brand/mapa-dominio";
import { ModuleCard } from "@/components/brand/module-card";
import { getModulosKiller } from "@/lib/catalog";

const HERO_RA: RaProgress[] = [
  { code: "RA1", label: "Estructura de un programa", status: "verde", progress: 100 },
  { code: "RA2", label: "Programación estructurada", status: "verde", progress: 100 },
  { code: "RA3", label: "Estructuras de control", status: "ambar", progress: 60 },
  { code: "RA4", label: "Programación modular", status: "rojo", progress: 20 },
];

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const c = await getTranslations("common");
  const killer = await getModulosKiller();

  return (
    <main className="flex-1">
      {/* ───────────────────────────── Hero ───────────────────────────── */}
      <section className="hud-grid border-b border-border/60">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div>
            <h1 className="font-display text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl lg:text-6xl">
              {c("tagline")}
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              {t("heroSubtitle")}
            </p>

            <form
              action="/modulos"
              className="mt-7 flex max-w-md items-center gap-2"
            >
              <input
                type="search"
                name="q"
                aria-label={t("searchLabel")}
                placeholder={t("searchPlaceholder")}
                className="h-11 flex-1 rounded-md border border-input bg-card px-4 text-sm outline-none transition focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button type="submit" size="lg" className="glow">
                {t("searchLabel")}
              </Button>
            </form>

            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                variant="secondary"
                nativeButton={false}
                render={<Link href="/registro?rol=alumno" />}
              >
                {t("studentCta")}
              </Button>
              <Button
                variant="ghost"
                nativeButton={false}
                render={<Link href="/registro?rol=familia" />}
              >
                {t("familyCta")}
              </Button>
            </div>
          </div>

          {/* Visual característico: el Mapa de Dominio */}
          <div>
            <MapaDominio code="0485" name="Programación" ras={HERO_RA} />
            <p className="mt-2 text-center font-mono text-xs text-muted-foreground">
              {t("mapaCaption")}
            </p>
          </div>
        </div>
      </section>

      {/* ──────────────────────────── Proceso ─────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="font-display text-2xl font-bold tracking-tight">
          {t("processTitle")}
        </h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { n: 1, t: t("s1t"), d: t("s1d") },
            { n: 2, t: t("s2t"), d: t("s2d") },
            { n: 3, t: t("s3t"), d: t("s3d") },
          ].map((step) => (
            <li key={step.n} className="rounded-lg border bg-card p-5">
              <span className="font-mono text-sm text-primary">
                0{step.n}
              </span>
              <h3 className="mt-2 font-semibold">{step.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ───────────────────────── Módulos killer ─────────────────────── */}
      {killer.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-14">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight">
                {t("killerTitle")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("killerSubtitle")}
              </p>
            </div>
            <Link
              href="/modulos"
              className="shrink-0 text-sm text-primary hover:underline"
            >
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
          <Button
            size="lg"
            nativeButton={false}
            render={<Link href="/registro?rol=familia" />}
          >
            {t("familyCta2")}
          </Button>
        </div>
      </section>
    </main>
  );
}
