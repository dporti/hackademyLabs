import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { getCiclosConModulos } from "@/lib/catalog";

export async function generateMetadata({ params }: PageProps<"/[locale]/ciclos">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "catalog" });
  return { title: `${t("title")} · Tutor247`, description: t("subtitle") };
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
                  <Link
                    key={m.id}
                    href={`/modulos/${m.code}`}
                    className="group rounded-lg border p-4 transition-colors hover:border-foreground/30 hover:bg-muted/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm text-muted-foreground">
                        {m.code}
                      </span>
                      {m.killer && (
                        <Badge variant="destructive" title={c("killer")}>
                          🔥
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 font-medium group-hover:underline">
                      {m.name}
                    </p>
                    {m.curso != null && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("course", { n: m.curso })}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
