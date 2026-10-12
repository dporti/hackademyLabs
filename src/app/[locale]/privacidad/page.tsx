import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/legal/legal-page";

// Página legal (estática). Textos en i18n: legal.privacidad.
export async function generateMetadata({ params }: PageProps<"/[locale]/privacidad">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return { title: t("privacidad.title"), description: t("privacidad.intro") };
}

export default async function Page({ params }: PageProps<"/[locale]/privacidad">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalPage page="privacidad" />;
}
