import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check } from "lucide-react";
import { getPathname, Link } from "@/i18n/navigation";
import { SectionLabel } from "@/components/brand/section-label";
import { ComingSoon } from "@/components/brand/coming-soon";
import { MentorCard } from "@/components/brand/mentor-card";
import { getModuloByCode, getAllModuloCodes, getMentoresByModulo } from "@/lib/catalog";
import type { ProductKind } from "@/lib/db-types";
import { temaRa, temasDe } from "@/lib/temas";

// Ficha de módulo = landing de venta del módulo (docs §8; maqueta Modulo.html).
// Datos de BD (RA, ciclos, equivalencia catalana, mentores). El bloque «5 errores que
// suspenden» del mockup queda fuera hasta decidir dónde se guarda (dato por módulo).

// Cómo prepararlo. `soon` = aún no se puede contratar; `href` = dónde se contrata.
const PREPARAR: { kind: ProductKind; soon?: boolean; href: string }[] = [
  { kind: "plan_modulo", soon: true, href: "/precios#productos" },
  { kind: "rescate_48h", soon: true, href: "/precios#productos" },
  { kind: "ticket_express", href: "/panel/tickets" },
  { kind: "simulacro", soon: true, href: "/precios#productos" },
];

// Pre-genera una página por módulo (SEO / casi estática).
export async function generateStaticParams() {
  const codes = await getAllModuloCodes();
  return codes.map((code) => ({ code }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/modulos/[code]">) {
  const { code, locale } = await params;
  const modulo = await getModuloByCode(code);
  if (!modulo) return {};
  const t = await getTranslations({ locale, namespace: "module" });
  const vars = { code: modulo.code, name: modulo.name };
  return {
    title: t("metaTitle", vars),
    description: modulo.description ?? t("metaDescription", vars),
  };
}

export default async function ModuloPage({ params }: PageProps<"/[locale]/modulos/[code]">) {
  const { locale, code } = await params;
  setRequestLocale(locale);
  const modulo = await getModuloByCode(code);
  if (!modulo) notFound();

  const t = await getTranslations("module");
  const c = await getTranslations("common");
  const tp = await getTranslations("products");
  const tm = await getTranslations("mentors");
  const tt = await getTranslations("temas");
  const tr = await getTranslations("temasRa");
  const temas = temasDe(tt, modulo.code);
  const te = await getTranslations("errores");
  const errores = (["e1", "e2", "e3", "e4", "e5"] as const)
    .filter((k) => te.has(`${modulo.code}.${k}.codigo`))
    .map((k) => ({ codigo: te(`${modulo.code}.${k}.codigo`), texto: te(`${modulo.code}.${k}.texto`) }));
  const diagnosticable = modulo.ra.length > 0;
  const mentores = await getMentoresByModulo(modulo.id);
  const ciclosTxt = modulo.ciclo_modulo
    .map((cm) => `${cm.ciclo.code}${cm.curso ? ` · ${cm.curso}.º` : ""}`)
    .join(" / ");
  const equiv = modulo.modulo_equiv_cat.map((e) => e.codigo_cat + (e.uf ? ` ${e.uf}` : "")).join(", ");

  return (
    <main className="flex-1">
      {/* ─────────────────────────── Cabecera ─────────────────────────── */}
      <section className="hud-grid border-b border-divider">
        <div className="mx-auto max-w-[1200px] px-4 pt-8 pb-14 sm:px-6">
          <nav aria-label={t("breadcrumbAria")} className="font-mono text-xs text-label">
            <Link href="/modulos" className="hover:text-foreground">
              {t("breadcrumb")}
            </Link>{" "}
            / {modulo.ciclo_modulo.map((cm) => cm.ciclo.code).join(" · ")} /{" "}
            <span className="text-foreground" aria-current="page">
              {modulo.code}
            </span>
          </nav>

          <div className="mt-8 grid grid-cols-1 items-start gap-10 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <div className="flex flex-wrap items-center gap-2 font-mono text-sm">
                <span className="rounded-md border border-tint-primary-border bg-tint-primary px-2 py-0.5 font-semibold text-primary">
                  {modulo.code}
                </span>
                {ciclosTxt && <span className="text-muted-foreground">{ciclosTxt}</span>}
                {equiv && <span className="text-label">· {t("catEquiv", { codes: equiv })}</span>}
              </div>
              <h1 className="mt-4 font-heading text-[40px] leading-[1.05] font-bold tracking-tight sm:text-[54px]">
                {modulo.name}
              </h1>
              {modulo.description && <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{modulo.description}</p>}
              {temas.length > 0 && (
                <div className="mt-5">
                  <p className="text-sm text-label">{t("temasTitle")}</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {temas.map((x) => (
                      <li
                        key={x}
                        className="rounded-[10px] border border-tint-primary-border bg-tint-primary px-3 py-1.5 text-[15px] font-medium"
                      >
                        {x}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href={diagnosticable ? `/diagnostico?m=${modulo.code}` : "/diagnostico"}
                  className="glow inline-flex min-h-12 items-center rounded-xl bg-primary px-5 font-bold text-primary-foreground transition-colors hover:bg-primary/85"
                >
                  {diagnosticable ? t("ctaDiagnosticCode", { code: modulo.code }) : t("ctaDiagnostic")}
                </Link>
                <a
                  href="#preparar"
                  className="inline-flex min-h-12 items-center rounded-xl border border-[#3a3f5c] px-5 font-medium transition-colors hover:border-primary"
                >
                  {t("ctaPrepare")}
                </a>
                <Link
                  href={`/pregunta?m=${modulo.code}`}
                  className="inline-flex min-h-12 items-center rounded-xl px-3 font-medium text-primary underline-offset-4 hover:underline"
                >
                  {t("ctaFreeQuestion")} →
                </Link>
              </div>
              <p className="mt-3 text-sm text-label">{t("ctaNote")}</p>

              <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
                {modulo.hours != null && (
                  <div>
                    <dt className="text-xs text-label">{t("statHours")}</dt>
                    <dd className="font-mono text-2xl font-semibold text-primary">{modulo.hours}</dd>
                  </div>
                )}
                {modulo.killer && (
                  <div>
                    <dt className="sr-only">{c("killer")}</dt>
                    <dd className="flex items-center gap-2 pt-4 font-mono text-sm font-semibold text-sos-text uppercase">
                      <span aria-hidden className="size-2 rounded-full bg-sos" />
                      {t("statKiller")}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Plan inverso: alimenta el diagnóstico con la fecha y las horas (?x=&h=). */}
            <div className="glow rounded-3xl border border-tint-primary-border bg-card p-6">
              <SectionLabel>{t("planTag")}</SectionLabel>
              <h2 className="mt-2 font-heading text-2xl font-bold">{t("planTitle")}</h2>
              {diagnosticable ? (
                <form action={getPathname({ href: "/diagnostico", locale })} className="mt-5 space-y-4">
                  <input type="hidden" name="m" value={modulo.code} />
                  <div>
                    <label htmlFor="plan-x" className="text-sm font-medium">
                      {t("planDate")}
                    </label>
                    <input
                      id="plan-x"
                      type="date"
                      name="x"
                      required
                      className="mt-1.5 min-h-12 w-full rounded-xl border border-border bg-background px-4 text-[15px] outline-none [color-scheme:dark] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div>
                    <label htmlFor="plan-h" className="text-sm font-medium">
                      {t("planHours")}
                    </label>
                    <input
                      id="plan-h"
                      type="number"
                      name="h"
                      min={1}
                      max={40}
                      defaultValue={5}
                      required
                      className="mt-1.5 min-h-12 w-full rounded-xl border border-border bg-background px-4 font-mono text-[15px] outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 font-bold text-primary-foreground transition-colors hover:bg-primary/85"
                  >
                    {t("planCta")}
                  </button>
                  <p className="text-sm text-muted-foreground">{t("planNote")}</p>
                </form>
              ) : (
                <p className="mt-4 text-muted-foreground">{t("planSoon")}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────── Resultados de aprendizaje ─────────────────────── */}
      {modulo.ra.length > 0 && (
        <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
          <SectionLabel>01 — {t("raLabel")}</SectionLabel>
          <h2 className="mt-3 font-heading text-[32px] leading-tight font-bold tracking-tight sm:text-[42px]">
            {t("raTitle")}
          </h2>
          <p className="mt-3 text-muted-foreground">{t("raText", { n: modulo.ra.length })}</p>
          <ol className="mt-8 grid gap-3 md:grid-cols-2">
            {modulo.ra.map((ra) => (
              <li key={ra.id} className="rounded-2xl border bg-card p-5">
                <p className="flex items-baseline justify-between gap-3">
                  <span className="font-heading text-lg font-semibold">
                    {temaRa(tr, modulo.code, ra.code) ?? ra.description}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-label">{ra.code}</span>
                </p>
                {temaRa(tr, modulo.code, ra.code) && (
                  <p className="mt-1.5 text-sm text-muted-foreground">{ra.description}</p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ───────────────── Los 5 errores que suspenden (i18n `errores`) ───────────────── */}
      {errores.length > 0 && (
        <section className="mx-auto max-w-[1200px] px-4 pb-16 sm:px-6">
          <div className="rounded-3xl border border-tint-sos-border bg-tint-sos p-6 sm:p-8">
            <h2 className="font-mono text-sm font-bold tracking-[0.15em] text-sos-text uppercase">
              {t("errorsTitle", { code: modulo.code })}
            </h2>
            <p className="mt-2 text-muted-foreground">{t("errorsText")}</p>
            <ol className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
              {errores.map((er, i) => (
                <li key={er.codigo} className="flex flex-col rounded-2xl border bg-card p-4">
                  <span className="font-mono text-xs text-label">0{i + 1}</span>
                  <code className="mt-2 w-fit rounded-md bg-surface-2 px-2 py-1 font-mono text-sm text-sos-text [font-variant-ligatures:none]">
                    {er.codigo}
                  </code>
                  <p className="mt-3 text-sm [overflow-wrap:anywhere]">{er.texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* ─────────────────────────── Cómo prepararlo ─────────────────────────── */}
      <section id="preparar" className="scroll-mt-24 border-y border-divider bg-card/40">
        <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
          <SectionLabel>02 — {t("prepLabel")}</SectionLabel>
          <h2 className="mt-3 font-heading text-[32px] leading-tight font-bold tracking-tight sm:text-[42px]">
            {t("prepTitle", { code: modulo.code })}
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PREPARAR.map((p) => (
              <Link
                key={p.kind}
                href={p.href}
                className={`card-interactive flex flex-col rounded-2xl border p-5 ${
                  p.kind === "plan_modulo" ? "glow border-tint-primary-border bg-tint-primary" : "bg-card"
                }`}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="font-heading text-lg font-semibold">{tp(`${p.kind}.name`)}</span>
                  {p.soon && <ComingSoon />}
                </span>
                <span className="mt-2 flex-1 text-sm text-muted-foreground">{tp(`${p.kind}.desc`)}</span>
              </Link>
            ))}
          </div>

            <Link
              href="/precios"
              className="mt-5 inline-flex min-h-11 items-center text-[15px] font-semibold text-primary underline-offset-4 hover:underline"
            >
              {t("seePlans")} →
            </Link>
          <ul className="mt-6 space-y-2 text-sm">
            {(["promiseGuarantee", "promiseEthics"] as const).map((k) => (
              <li key={k} className="flex gap-2.5">
                <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-accent-pass" strokeWidth={3} />
                {t(k)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─────────────────────────────── Mentores ─────────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionLabel>03 — {t("mentorsLabel", { code: modulo.code })}</SectionLabel>
            <h2 className="mt-3 font-heading text-[32px] leading-tight font-bold tracking-tight sm:text-[42px]">
              {t("mentorsTitle")}
            </h2>
          </div>
          {mentores.length > 0 && (
            <Link
              href={`/mentores?modulo=${modulo.code}`}
              className="inline-flex min-h-11 items-center text-[15px] font-semibold text-primary underline-offset-4 hover:underline"
            >
              {t("mentorsAll")} →
            </Link>
          )}
        </div>
        {mentores.length === 0 ? (
          <p className="mt-6 text-muted-foreground">
            {t("noMentors")}{" "}
            <Link href="/hazte-mentor" className="text-primary underline-offset-4 hover:underline">
              {t("becomeMentor")}
            </Link>
          </p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mentores.map((m) => (
              <MentorCard
                key={m.profile_id}
                id={m.profile_id}
                name={m.full_name}
                level={m.level}
                levelLabel={tm(`level.${m.level}`)}
                headline={m.headline}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
