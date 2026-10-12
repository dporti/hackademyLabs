import { getTranslations, setRequestLocale } from "next-intl/server";
import { seo } from "@/lib/seo";
import { LegalPage } from "@/components/legal/legal-page";

// Página legal (estática). Textos en i18n: legal.avisoLegal.
export async function generateMetadata({ params }: PageProps<"/[locale]/aviso-legal">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return seo({ locale, path: "/aviso-legal", title: t("avisoLegal.title"), description: t("avisoLegal.intro") });
}

export default async function Page({ params }: PageProps<"/[locale]/aviso-legal">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalPage page="avisoLegal" />;
}
