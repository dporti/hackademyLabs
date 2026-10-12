import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/legal/legal-page";

// Página legal (estática). Textos en i18n: legal.condiciones.
export async function generateMetadata({ params }: PageProps<"/[locale]/condiciones">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return { title: t("condiciones.title"), description: t("condiciones.intro") };
}

export default async function Page({ params }: PageProps<"/[locale]/condiciones">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalPage page="condiciones" />;
}
