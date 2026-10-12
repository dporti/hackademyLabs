import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getAllModuloCodes, getMentorIds } from "@/lib/catalog";
import { idiomas, urlAbs } from "@/lib/seo";

// sitemap.xml: páginas públicas indexables en cada idioma, con sus alternativas
// hreflang. Sin lastModified ni prioridades inventadas (Google las ignora o desconfía).
const ESTATICAS = [
  "/",
  "/ciclos",
  "/modulos",
  "/mentores",
  "/precios",
  "/tutor247",
  "/diagnostico",
  "/pregunta",
  "/hazte-mentor",
  "/cancelacion",
  "/aviso-legal",
  "/privacidad",
  "/cookies",
  "/condiciones",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [codes, mentores] = await Promise.all([getAllModuloCodes(), getMentorIds()]);
  const rutas = [
    ...ESTATICAS,
    ...[...codes].sort().map((c) => `/modulos/${c}`),
    ...mentores.map((id) => `/mentores/${id}`),
  ];
  return rutas.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: urlAbs(locale, path),
      alternates: { languages: idiomas(path, true) },
    })),
  );
}
