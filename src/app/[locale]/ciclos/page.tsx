import { getTranslations, setRequestLocale } from "next-intl/server";
import { ModuleCard } from "@/components/brand/module-card";
import { getCiclosConModulos } from "@/lib/catalog";

export async function generateMetadata({ params }: PageProps<"/[locale]/ciclos">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "catalog" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function CiclosPage({
  params,
}: PageProps<"/[locale]/ciclos">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("catalog");
  const c = await getTranslations("common");
  const ciclos = await getCiclosConModulos();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>

      <div className="mt-8 space-y-10">
        {ciclos.map((ciclo) => {
          const modulos = ciclo.ciclo_modulo
            .map((cm) => ({ curso: cm.curso, ...cm.modulo }))
            .sort((a, b) => (a.curso ?? 0) - (b.curso ?? 0) || a.code.localeCompare(b.code));
          return (
            <section key={ciclo.id}>
              <div className="flex items-baseline gap-3">
                <h2 className="text-xl font-semibold">
                  {ciclo.code} · {ciclo.name}
                </h2>
                <span className="text-sm text-muted-foreground">
                  {ciclo.grade === "medio" ? t("gradeMedio") : t("gradeSuperior")}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {modulos.map((m) => (
                  <ModuleCard
                    key={m.id}
                    modulo={m}
                    cursoLabel={m.curso != null ? t("course", { n: m.curso }) : undefined}
                    killerLabel={c("killer")}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
