import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPathname, Link } from "@/i18n/navigation";
import { SectionLabel } from "@/components/brand/section-label";
import { MentorCard } from "@/components/brand/mentor-card";
import { getAllModulos, getMentores } from "@/lib/catalog";
import type { MentorLevel } from "@/lib/db-types";

// Listado de mentores (maqueta Mentores.html) con filtros por módulo, idioma y nivel
// (?modulo=&idioma=&nivel=): formulario GET, funciona sin JS y se puede compartir.
// Disponibilidad y perfil (docente/profesional) del mockup quedan para cuando haya datos.
export const instant = false;

const NIVELES: MentorLevel[] = ["mentor", "pro", "experto"];
const IDIOMAS = ["es", "ca", "en"] as const;

export async function generateMetadata({ params }: PageProps<"/[locale]/mentores">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "mentors" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function MentoresPage({ params, searchParams }: PageProps<"/[locale]/mentores">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);
  const t = await getTranslations("mentors");
  const [mentores, modulos] = await Promise.all([getMentores(), getAllModulos()]);

  const modulo = modulos.find((m) => m.code === str(sp.modulo));
  const idioma = IDIOMAS.find((i) => i === str(sp.idioma));
  const nivel = NIVELES.find((n) => n === str(sp.nivel));
  const visibles = mentores.filter(
    (m) =>
      (!modulo || m.modulos.some((mo) => mo.code === modulo.code)) &&
      (!idioma || m.languages?.includes(idioma)) &&
      (!nivel || m.level === nivel),
  );
  const nombreIdioma = (l: string) =>
    (IDIOMAS as readonly string[]).includes(l) ? t(`lang.${l as (typeof IDIOMAS)[number]}`) : l.toUpperCase();
  const selectCls =
    "mt-1.5 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-[15px] outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <main className="flex-1">
      <section className="hud-grid border-b border-divider">
        <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6">
          <SectionLabel>{t("eyebrow")}</SectionLabel>
          <h1 className="mt-4 font-heading text-[40px] leading-[1.05] font-bold tracking-tight sm:text-[54px]">
            {t("heroTitle")}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{t("heroText")}</p>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[260px_1fr]">
        <form
          action={getPathname({ href: "/mentores", locale })}
          aria-labelledby="filtrar"
          className="h-fit space-y-4 rounded-2xl border bg-card p-5 lg:sticky lg:top-24"
        >
          <h2 id="filtrar" className="font-mono text-xs font-semibold tracking-[0.2em] text-label uppercase">
            {t("filterTitle")}
          </h2>
          <div>
            <label htmlFor="f-modulo" className="text-sm font-medium">
              {t("filterModule")}
            </label>
            <select id="f-modulo" name="modulo" defaultValue={modulo?.code ?? ""} className={selectCls}>
              <option value="">{t("any")}</option>
              {modulos.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.code} · {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-idioma" className="text-sm font-medium">
              {t("filterLanguage")}
            </label>
            <select id="f-idioma" name="idioma" defaultValue={idioma ?? ""} className={selectCls}>
              <option value="">{t("any")}</option>
              {IDIOMAS.map((i) => (
                <option key={i} value={i}>
                  {t(`lang.${i}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-nivel" className="text-sm font-medium">
              {t("filterLevel")}
            </label>
            <select id="f-nivel" name="nivel" defaultValue={nivel ?? ""} className={selectCls}>
              <option value="">{t("any")}</option>
              {NIVELES.map((n) => (
                <option key={n} value={n}>
                  {t(`level.${n}`)}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground transition-colors hover:bg-primary/85"
          >
            {t("apply")}
          </button>
          {(modulo || idioma || nivel) && (
            <Link
              href="/mentores"
              className="flex min-h-10 items-center justify-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {t("clear")}
            </Link>
          )}
        </form>

        <div>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {modulo
              ? t("countFor", { n: visibles.length, modulo: `${modulo.code} ${modulo.name}` })
              : t("count", { n: visibles.length })}
          </p>
          {visibles.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed p-6 text-muted-foreground">{t("none")}</p>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibles.map((m) => {
                return (
                  <MentorCard
                    key={m.profile_id}
                    id={m.profile_id}
                    name={m.full_name}
                    level={m.level}
                    levelLabel={t(`level.${m.level}`)}
                    headline={m.headline}
                    moduleCodes={m.modulos.map((mo) => mo.code)}
                    languages={
                      m.languages?.length
                        ? { label: t("languages"), value: m.languages.map(nombreIdioma).join(" · ") }
                        : undefined
                    }
                    viewLabel={t("viewProfile")}
                    bookLabel={t("book")}
                  />
                );
              })}
            </div>
          )}

          <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-muted-foreground">{t("joinText")}</p>
            <Link
              href="/hazte-mentor"
              className="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-[#3a3f5c] px-5 font-medium transition-colors hover:border-primary"
            >
              {t("joinCta")}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
