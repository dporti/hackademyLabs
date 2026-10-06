import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPacks, getPlanes } from "@/lib/catalog";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/precios">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing" });
  return { title: `${t("title")} · Tutor247`, description: t("subtitle") };
}

export default async function PreciosPage({
  params,
}: PageProps<"/[locale]/precios">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pricing");
  const [packs, planes] = await Promise.all([getPacks(), getPlanes()]);
  const eur = (n: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(n);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>

      {/* Packs de créditos */}
      <h2 className="mt-10 text-xl font-semibold">{t("packsTitle")}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {packs.map((p) => (
          <div key={p.id} className="flex flex-col rounded-xl border p-5">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{p.name}</span>
              {p.bonus_pct > 0 && (
                <Badge variant="secondary">{t("bonus", { pct: p.bonus_pct })}</Badge>
              )}
            </div>
            <p className="mt-3 text-3xl font-bold">{eur(p.price_eur)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("credits", { n: p.credits })}
            </p>
            <Button
              className="mt-4"
              render={<Link href={`/registro?rol=alumno&pack=${p.slug}`} />}
            >
              {t("buy")}
            </Button>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{t("creditsNote")}</p>

      {/* Suscripciones */}
      <h2 className="mt-12 text-xl font-semibold">{t("plansTitle")}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {planes.map((pl) => (
          <div key={pl.id} className="flex flex-col rounded-xl border p-5">
            <span className="font-semibold">{pl.name}</span>
            <p className="mt-3 text-3xl font-bold">
              {pl.price_eur_month > 0 ? eur(pl.price_eur_month) : t("free")}
              {pl.price_eur_month > 0 && (
                <span className="text-base font-normal text-muted-foreground">
                  {t("perMonth")}
                </span>
              )}
            </p>
            <ul className="mt-4 flex-1 space-y-1 text-sm text-muted-foreground">
              {pl.features.map((f, i) => (
                <li key={i}>· {f}</li>
              ))}
            </ul>
            {pl.price_eur_month > 0 && (
              <Button
                variant="outline"
                className="mt-4"
                render={<Link href={`/registro?plan=${pl.kind}`} />}
              >
                {t("subscribe")}
              </Button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
