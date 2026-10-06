import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-muted-foreground">{modulo.code}</span>
        {modulo.killer && (
          <Badge variant="destructive" title={c("killer")}>
            🔥 {c("killer")}
          </Badge>
        )}
      </div>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{modulo.name}</h1>
      {modulo.description && (
        <p className="mt-3 text-muted-foreground">{modulo.description}</p>
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
        <Button render={<Link href="/registro?rol=alumno" />}>
          {t("ctaPlan")}
        </Button>
        <Button variant="outline" render={<Link href="/registro?rol=alumno" />}>
          {t("ctaDiagnostic")}
        </Button>
      </div>

      {/* Resultados de Aprendizaje */}
      {modulo.ra.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold">{t("learningResults")}</h2>
          <ol className="mt-4 space-y-3">
            {modulo.ra.map((ra) => (
              <li key={ra.id} className="rounded-lg border p-4">
                <span className="font-mono text-sm text-muted-foreground">
                  {ra.code}
                </span>
                <p className="mt-1">{ra.description}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Mentores del módulo */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold">{t("mentors")}</h2>
        {mentores.length === 0 ? (
          <p className="mt-3 text-muted-foreground">{t("noMentors")}</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {mentores.map((m) => (
              <Link
                key={m.profile_id}
                href={`/mentores/${m.profile_id}`}
                className="rounded-lg border p-4 hover:bg-muted/40"
              >
                <p className="font-medium">{m.full_name}</p>
                {m.headline && (
                  <p className="text-sm text-muted-foreground">{m.headline}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
