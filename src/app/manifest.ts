import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";

// PWA (fase 9): Checkpoint Academy instalable en el móvil. Arranca en el panel; el
// service worker (public/sw.js) solo da una página sin conexión, no cachea datos.
// Nombre de marca: no se traduce. El manifest es uno solo: textos en el idioma por defecto.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations({ locale: "es", namespace: "pwa" });
  return {
    name: "Checkpoint Academy",
    short_name: "Checkpoint",
    description: t("description"),
    start_url: "/panel",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#07080f",
    theme_color: "#07080f",
    lang: "es",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcuts: [
      { name: t("shortcutBit"), url: "/panel/bit" },
      { name: t("shortcutMapa"), url: "/panel/mapa" },
      { name: t("shortcutTickets"), url: "/panel/tickets" },
    ],
  };
}
