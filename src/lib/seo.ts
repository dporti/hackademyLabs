import type { Metadata } from "next";
import { routing, type Locale } from "@/i18n/routing";

// SEO común: URL canónica, hreflang (es / ca / x-default), Open Graph y Twitter.
// Una sola fuente para que metadatos, sitemap y JSON-LD usen las mismas URLs.

// URL pública del sitio. En Vercel, si no hay NEXT_PUBLIC_SITE_URL, la de producción.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
  "http://localhost:3000"
).replace(/\/$/, "");

export const SITE_NAME = "Checkpoint Academy";

// Indexable solo en producción: los previews de Vercel no deben salir en Google.
// SITE_NOINDEX=1 bloquea también producción (antes del lanzamiento; quitarla ese día).
export const INDEXABLE =
  process.env.SITE_NOINDEX !== "1" && (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production");

const OG_LOCALE: Record<Locale, string> = { es: "es_ES", ca: "ca_ES" };

// Ruta con prefijo de idioma (es sin prefijo: localePrefix "as-needed").
export function rutaLocal(locale: string, path: string): string {
  const p = path === "/" ? "" : path;
  if (locale === routing.defaultLocale) return p || "/";
  return `/${locale}${p}`;
}

export const urlAbs = (locale: string, path: string) => `${SITE_URL}${rutaLocal(locale, path)}`;

// Alternativas por idioma de una ruta (para hreflang y el sitemap).
export function idiomas(path: string, abs = false): Record<string, string> {
  const f = abs ? urlAbs : rutaLocal;
  return {
    ...Object.fromEntries(routing.locales.map((l) => [l, f(l, path)])),
    "x-default": f(routing.defaultLocale, path),
  };
}

// Recorta una descripción a ~155 caracteres sin partir palabras (lo que muestra Google).
export function recorta(s: string, max = 155): string {
  const limpio = s.replace(/\s+/g, " ").trim();
  if (limpio.length <= max) return limpio;
  return `${limpio.slice(0, limpio.lastIndexOf(" ", max - 1)).replace(/[,.;:\s]+$/, "")}…`;
}

// Metadatos de una página pública. `title` sin marca: la plantilla del layout la añade
// (`absolute` = el título ya lleva la marca, p. ej. la portada).
export function seo({
  locale,
  path,
  title,
  description,
  noindex = false,
  absolute = false,
  image,
}: {
  locale: string;
  path: string;
  title?: string;
  description?: string;
  noindex?: boolean;
  absolute?: boolean;
  /** Ruta de una imagen Open Graph propia (1200×630). */
  image?: string;
}): Metadata {
  const desc = description ? recorta(description) : undefined;
  return {
    ...(title ? { title: absolute ? { absolute: title } : title } : {}),
    ...(desc ? { description: desc } : {}),
    alternates: { canonical: rutaLocal(locale, path), languages: idiomas(path) },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale as Locale] ?? OG_LOCALE.es,
      alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      url: rutaLocal(locale, path),
      // Imagen por idioma (app/[locale]/opengraph-image, o la propia de la ficha). Hay que
      // ponerla a mano: al definir openGraph en una página se pierde la del fichero.
      images: [{ url: image ?? `/${locale}/opengraph-image`, width: 1200, height: 630, alt: title ?? SITE_NAME }],
      ...(title ? { title } : {}),
      ...(desc ? { description: desc } : {}),
    },
    twitter: { card: "summary_large_image", ...(title ? { title } : {}), ...(desc ? { description: desc } : {}) },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
