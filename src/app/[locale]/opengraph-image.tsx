import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { OgCard, OG_SIZE } from "@/components/seo/og-card";

// Imagen al compartir cualquier página (WhatsApp, redes, Slack…) salvo las que traen
// la suya (fichas de módulo). Textos por idioma.
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Checkpoint Academy — FP de Informática";

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo.og" });
  return new ImageResponse(<OgCard eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} footer={t("ciclos")} />, OG_SIZE);
}
