import { getTranslations } from "next-intl/server";
import { getPathname, Link } from "@/i18n/navigation";
import { SectionLabel } from "@/components/brand/section-label";
import { ModuleCard } from "@/components/brand/module-card";
import type { getCiclosConModulos } from "@/lib/catalog";
import type { Modulo } from "@/lib/db-types";
import { cn } from "@/lib/utils";
import { temasDe } from "@/lib/temas";

type Ciclos = Awaited<ReturnType<typeof getCiclosConModulos>>;

// Cabecera del catálogo (maqueta Modulos.html): buscador por código/nombre/código
// catalán, atajo al test y filtro por ciclo (enlaces: funciona sin JS y es compartible).
export async function CatalogoHero({
  locale,
  ciclos,
  q = "",
  ciclo,
}: {
  locale: string;
  ciclos: Ciclos;
  q?: string;
  ciclo?: string;
}) {
  const t = await getTranslations("catalog");
  const filtro = (code?: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (code) p.set("ciclo", code);
    const s = p.toString();
    return s ? `/modulos?${s}` : "/modulos";
  };

  return (
    <section className="hud-grid border-b border-divider">
      <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6">
        <SectionLabel>{t("eyebrow")}</SectionLabel>
        <h1 className="mt-4 font-heading text-[40px] leading-[1.05] font-bold tracking-tight sm:text-[54px]">
          {t("heroTitle")}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{t("heroText")}</p>

        <form
          action={getPathname({ href: "/modulos", locale })}
          role="search"
          className="mt-7 flex max-w-3xl flex-col gap-2.5 sm:flex-row"
        >
          {ciclo && <input type="hidden" name="ciclo" value={ciclo} />}
          <label htmlFor="catalogo-q" className="sr-only">
            {t("searchLabel")}
          </label>
          <input
            id="catalogo-q"
            type="search"
            name="q"
            defaultValue={q}
            placeholder={t("searchPlaceholder")}
            className="min-h-12 flex-1 rounded-xl border border-border bg-card px-4 text-[15px] outline-none placeholder:text-[#6b7190] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-5 font-bold whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary/85"
          >
            {t("searchCta")}
          </button>
          <Link
            href="/diagnostico"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#3a3f5c] px-5 font-medium whitespace-nowrap transition-colors hover:border-primary"
          >
            {t("notSure")}
          </Link>
        </form>

        <nav aria-label={t("filterAria")} className="mt-6 flex flex-wrap gap-2">
          {[{ code: undefined, label: t("filterAll") }, ...ciclos.map((c) => ({ code: c.code, label: c.code }))].map(
            (f) => {
              const activo = (f.code ?? "") === (ciclo ?? "");
              return (
                <Link
                  key={f.label}
                  href={filtro(f.code)}
                  aria-current={activo ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-10 items-center rounded-[10px] border px-4 font-mono text-sm transition-colors",
                    activo
                      ? "border-primary bg-tint-primary text-primary"
                      : "border-border text-muted-foreground hover:border-primary/60 hover:text-foreground",
                  )}
                >
                  {f.label}
                </Link>
              );
            },
          )}
        </nav>
        <p className="mt-4 text-sm text-label">{t("catHint")}</p>
      </div>
    </section>
  );
}

// Módulos agrupados por ciclo y ordenados por curso.
export async function CatalogoGrupos({ ciclos }: { ciclos: Ciclos }) {
  const t = await getTranslations("catalog");
  const c = await getTranslations("common");
  const tt = await getTranslations("temas");
  if (ciclos.length === 0) return <p className="text-muted-foreground">{t("empty")}</p>;
  return (
    <div className="space-y-14">
      {ciclos.map((ciclo) => {
        const modulos = ciclo.ciclo_modulo
          .map((cm) => ({ curso: cm.curso, ...cm.modulo }))
          .sort((a, b) => (a.curso ?? 0) - (b.curso ?? 0) || a.code.localeCompare(b.code));
        return (
          <section key={ciclo.id} aria-labelledby={`ciclo-${ciclo.code}`}>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h2 id={`ciclo-${ciclo.code}`} className="font-heading text-2xl font-bold sm:text-3xl">
                <span className="font-mono text-primary">{ciclo.code}</span> {ciclo.name}
              </h2>
              <span className="text-sm text-label">
                {ciclo.grade === "medio" ? t("gradeMedio") : t("gradeSuperior")} ·{" "}
                {t("modulesCount", { n: modulos.length })}
              </span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {modulos.map((m) => (
                <ModuleCard
                  key={m.id}
                  modulo={m}
                  cursoLabel={m.curso != null ? t("course", { n: m.curso }) : undefined}
                  killerLabel={c("killerShort")}
                  viewLabel={c("viewModule")}
                  temas={temasDe(tt, m.code)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export async function CatalogoResultados({ modulos }: { modulos: Pick<Modulo, "id" | "code" | "name" | "killer">[] }) {
  const c = await getTranslations("common");
  const tt = await getTranslations("temas");
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {modulos.map((m) => (
        <ModuleCard
          key={m.id}
          modulo={m}
          killerLabel={c("killerShort")}
          viewLabel={c("viewModule")}
          temas={temasDe(tt, m.code)}
        />
      ))}
    </div>
  );
}

export async function CatalogoCta() {
  const t = await getTranslations("catalog");
  return (
    <section className="mx-auto max-w-[1200px] px-4 pb-16 sm:px-6">
      <div className="glow flex flex-col items-start gap-5 rounded-3xl border border-tint-primary-border bg-tint-primary p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <p className="max-w-2xl text-lg">{t("finalText")}</p>
        <Link
          href="/diagnostico"
          className="inline-flex min-h-12 shrink-0 items-center rounded-xl bg-primary px-5 font-bold text-primary-foreground transition-colors hover:bg-primary/85"
        >
          {t("finalCta")}
        </Link>
      </div>
    </section>
  );
}
