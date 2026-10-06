import { defineRouting } from "next-intl/routing";

// Idiomas de la plataforma. 'es' por defecto; 'ca' (catalán) se activa en fases
// posteriores pero la infraestructura i18n queda lista desde el inicio.
export const routing = defineRouting({
  locales: ["es", "ca"],
  defaultLocale: "es",
  // Prefijo siempre visible en la URL salvo el idioma por defecto (/sobre vs /ca/sobre).
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
