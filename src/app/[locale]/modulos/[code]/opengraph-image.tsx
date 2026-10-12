import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { OgCard, OG_SIZE } from "@/components/seo/og-card";
import { getModuloByCode } from "@/lib/catalog";

// Imagen al compartir una ficha de módulo: código grande + nombre + ciclos.
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Checkpoint Academy — módulo de FP de Informática";

export default async function Image({ params }: { params: Promise<{ locale: string; code: string }> }) {
  const { locale, code } = await params;
  const [modulo, t] = await Promise.all([getModuloByCode(code), getTranslations({ locale, namespace: "seo.og" })]);
  if (!modulo) {
    return new ImageResponse(<OgCard eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} footer={t("ciclos")} />, OG_SIZE);
  }
  const ciclos = [...new Set(modulo.ciclo_modulo.map((cm) => cm.ciclo.code))].sort().join(" · ");
  return new ImageResponse(
    <OgCard
      eyebrow={ciclos ? t("moduleEyebrow", { ciclos }) : t("eyebrow")}
      code={modulo.code}
      title={modulo.name}
      subtitle={t("moduleSubtitle")}
      footer={t("ciclos")}
    />,
    OG_SIZE,
  );
}
