import { getTranslations, setRequestLocale } from "next-intl/server";
import { CatalogoCta, CatalogoGrupos, CatalogoHero } from "@/components/catalog/catalogo";
import { getCiclosConModulos } from "@/lib/catalog";

// Catálogo completo por ciclos (estático, SEO). Mismo diseño que /modulos sin búsqueda:
// el buscador y los filtros de la cabecera llevan a /modulos.
export async function generateMetadata({ params }: PageProps<"/[locale]/ciclos">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "catalog" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function CiclosPage({ params }: PageProps<"/[locale]/ciclos">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ciclos = await getCiclosConModulos();

  return (
    <main className="flex-1">
      <CatalogoHero locale={locale} ciclos={ciclos} />
      <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6">
        <CatalogoGrupos ciclos={ciclos} />
      </div>
      <CatalogoCta />
    </main>
  );
}
