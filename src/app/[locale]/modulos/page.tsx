import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  CatalogoCta,
  CatalogoGrupos,
  CatalogoHero,
  CatalogoResultados,
} from "@/components/catalog/catalogo";
import { buscarModulos, getCiclosConModulos } from "@/lib/catalog";

// Catálogo con búsqueda (?q=) y filtro por ciclo (?ciclo=). Depende de searchParams →
// se renderiza en cada petición (no estática). cacheComponents exige declararlo.
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/modulos">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "search" });
  return { title: t("title"), description: t("placeholder") };
}

export default async function ModulosPage({ params, searchParams }: PageProps<"/[locale]/modulos">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const cicloParam = typeof sp.ciclo === "string" ? sp.ciclo : undefined;

  const t = await getTranslations("search");
  const ciclos = await getCiclosConModulos();
  const ciclo = ciclos.some((c) => c.code === cicloParam) ? cicloParam : undefined;
  const visibles = ciclo ? ciclos.filter((c) => c.code === ciclo) : ciclos;

  // Con búsqueda: resultados planos (limitados al ciclo si hay filtro).
  let resultados = q ? await buscarModulos(q) : [];
  if (q && ciclo) {
    const codigos = new Set(visibles.flatMap((c) => c.ciclo_modulo.map((cm) => cm.modulo.code)));
    resultados = resultados.filter((m) => codigos.has(m.code));
  }

  return (
    <main className="flex-1">
      <CatalogoHero locale={locale} ciclos={ciclos} q={q} ciclo={ciclo} />
      <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6">
        {q ? (
          <>
            <p className="mb-5 text-sm text-muted-foreground" aria-live="polite">
              {t("resultsFor", { q })}
            </p>
            {resultados.length === 0 ? (
              <p className="text-muted-foreground">{t("noResults")}</p>
            ) : (
              <CatalogoResultados modulos={resultados} />
            )}
          </>
        ) : (
          <CatalogoGrupos ciclos={visibles} />
        )}
      </div>
      <CatalogoCta />
    </main>
  );
}
