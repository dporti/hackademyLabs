import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { ModuleCard } from "@/components/brand/module-card";
import { buscarModulos } from "@/lib/catalog";

// Ruta de búsqueda: depende de searchParams → se renderiza en cada petición
// (no estática). cacheComponents exige declararlo explícitamente.
export const instant = false;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/modulos">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "search" });
  return { title: t("title"), description: t("placeholder") };
}

export default async function ModulosPage({
  params,
  searchParams,
}: PageProps<"/[locale]/modulos">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";

  const t = await getTranslations("search");
  const c = await getTranslations("common");
  const modulos = await buscarModulos(q);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>

      <form action="/modulos" className="mt-6 flex max-w-md items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={t("placeholder")}
          aria-label={t("title")}
          className="flex-1 rounded-md border border-input bg-background px-4 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit">{t("title")}</Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        {q ? t("resultsFor", { q }) : t("all")}
      </p>

      {modulos.length === 0 ? (
        <p className="mt-4 text-muted-foreground">{t("noResults")}</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modulos.map((m) => (
            <ModuleCard key={m.id} modulo={m} killerLabel={c("killer")} />
          ))}
        </div>
      )}
    </main>
  );
}
