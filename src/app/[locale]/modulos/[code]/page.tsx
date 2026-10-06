import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { MentorCard } from "@/components/brand/mentor-card";
import {
  getModuloByCode,
  getAllModuloCodes,
  getMentoresByModulo,
} from "@/lib/catalog";

// Pre-genera una página por módulo (SEO / casi estática).
export async function generateStaticParams() {
  const codes = await getAllModuloCodes();
  return codes.map((code) => ({ code }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/modulos/[code]">) {
  const { code } = await params;
  const modulo = await getModuloByCode(code);
  if (!modulo) return {};
  const title = `${modulo.code} ${modulo.name} — cómo aprobarlo · Tutor247`;
  const description =
    modulo.description ??
    `Resultados de aprendizaje, mentores y plan para aprobar ${modulo.code} ${modulo.name} en FP de informática.`;
  return { title, description };
}

export default async function ModuloPage({
  params,
}: PageProps<"/[locale]/modulos/[code]">) {
  const { locale, code } = await params;
  setRequestLocale(locale);
  const modulo = await getModuloByCode(code);
  if (!modulo) notFound();

  const t = await getTranslations("module");
  const c = await getTranslations("common");
  const mentores = await getMentoresByModulo(modulo.id);

  return (
    <main className="flex-1">
      {/* Cabecera del módulo (panel HUD) */}
      <div className="hud-grid border-b border-border/60">
        <div className="mx-auto w-full max-w-4xl px-4 py-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-primary">{modulo.code}</span>
            {modulo.killer && (
              <span
                className="rounded px-1.5 py-0.5 text-[11px] font-semibold tracking-wide"
                style={{
                  color: "var(--ra-rojo)",
                  backgroundColor:
                    "color-mix(in oklab, var(--ra-rojo) 14%, transparent)",
                }}
                title={c("killer")}
              >
                KILLER
              </span>
            )}
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {modulo.name}
          </h1>
          {modulo.description && (
            <p className="mt-3 max-w-2xl text-muted-foreground">
              {modulo.description}
            </p>
          )}

      {/* Ciclos donde aparece */}
      {modulo.ciclo_modulo.length > 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          {t("cycles")}:{" "}
          {modulo.ciclo_modulo
            .map((cm) => `${cm.ciclo.code}${cm.curso ? ` (${cm.curso}º)` : ""}`)
            .join(" · ")}
        </p>
      )}

      {/* Equivalencia catalana */}
      {modulo.modulo_equiv_cat.length > 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          {t("equivCat")}:{" "}
          {modulo.modulo_equiv_cat
            .map((e) => e.codigo_cat + (e.uf ? ` / ${e.uf}` : ""))
            .join(", ")}
        </p>
      )}

      {/* CTAs */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          nativeButton={false}
          render={<Link href="/registro?rol=alumno" />}
        >
          {t("ctaPlan")}
        </Button>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/registro?rol=alumno" />}
        >
          {t("ctaDiagnostic")}
        </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl px-4 py-10">
      {/* Resultados de Aprendizaje */}
      {modulo.ra.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-semibold">
            {t("learningResults")}
          </h2>
          <ol className="mt-4 space-y-2.5">
            {modulo.ra.map((ra) => (
              <li
                key={ra.id}
                className="flex gap-3 rounded-lg border bg-card p-4"
              >
                <span className="shrink-0 font-mono text-sm text-primary">
                  {ra.code}
                </span>
                <p className="text-sm text-card-foreground">{ra.description}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Mentores del módulo */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">{t("mentors")}</h2>
        {mentores.length === 0 ? (
          <p className="mt-3 text-muted-foreground">{t("noMentors")}</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {mentores.map((m) => (
              <MentorCard
                key={m.profile_id}
                id={m.profile_id}
                name={m.full_name}
                level={m.level}
                headline={m.headline}
                responseMinutes={m.response_time_minutes}
              />
            ))}
          </div>
        )}
      </section>
      </div>
    </main>
  );
}
