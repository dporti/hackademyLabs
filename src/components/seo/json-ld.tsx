import { SITE_NAME, SITE_URL, urlAbs } from "@/lib/seo";
import { CONTACTO } from "@/lib/contacto";

// Datos estructurados (schema.org) en JSON-LD. Se escapa `<` para que ningún texto
// de BD o i18n pueda cerrar la etiqueta <script>.
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

// Organización: la misma @id en todas las páginas para que Google la enlace.
export const ORG_ID = `${SITE_URL}/#organizacion`;

export function organizacion(description: string) {
  return {
    "@type": "EducationalOrganization",
    "@id": ORG_ID,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/icons/icon-512.png`,
    description,
    areaServed: { "@type": "Country", name: "España" },
    telephone: CONTACTO.telefonoHref.replace("tel:", ""),
    ...(CONTACTO.email ? { email: CONTACTO.email } : {}),
  };
}

export function faqPage(items: { q: string; a: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}

// Migas: [{ name, path }] con rutas sin prefijo de idioma.
export function migas(locale: string, items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: urlAbs(locale, it.path),
    })),
  };
}

export const grafo = (...nodos: Record<string, unknown>[]) => ({ "@context": "https://schema.org", "@graph": nodos });
