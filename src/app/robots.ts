import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { INDEXABLE, SITE_URL } from "@/lib/seo";

// robots.txt. Fuera de producción (previews de Vercel) no se indexa nada.
// Zonas privadas bloqueadas: panel, onboarding, API y la guía de estilo interna.
// Entrar/registro no se bloquean: llevan noindex y Google tiene que poder leerlo.
const PRIVADAS = ["/panel", "/onboarding", "/styleguide"];

export default function robots(): MetadataRoute.Robots {
  if (!INDEXABLE) return { rules: { userAgent: "*", disallow: "/" } };
  const prefijos = ["", ...routing.locales.filter((l) => l !== routing.defaultLocale).map((l) => `/${l}`)];
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", ...prefijos.flatMap((p) => PRIVADAS.map((r) => `${p}${r}`))],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
