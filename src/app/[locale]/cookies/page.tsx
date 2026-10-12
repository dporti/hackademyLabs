import { getTranslations, setRequestLocale } from "next-intl/server";
import { seo } from "@/lib/seo";
import { LegalPage } from "@/components/legal/legal-page";

// Página legal (estática). Textos en i18n: legal.cookies.
export async function generateMetadata({ params }: PageProps<"/[locale]/cookies">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return seo({ locale, path: "/cookies", title: t("cookies.title"), description: t("cookies.intro") });
}

export default async function Page({ params }: PageProps<"/[locale]/cookies">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalPage page="cookies" />;
}
