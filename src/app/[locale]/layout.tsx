import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BitChat } from "@/components/bit/bit-chat";
import { PwaRegister } from "@/components/pwa-register";
import { INDEXABLE, SITE_NAME, SITE_URL } from "@/lib/seo";
import "../globals.css";

// Títulos: Space Grotesk.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

// Texto y paneles: Inter.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Códigos de módulo, RA, cifras y etiquetas: JetBrains Mono.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

// Metadatos por idioma; las páginas ponen su título y la plantilla añade la marca.
export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });
  return {
    // Base de las URLs relativas (canonical, hreflang, Open Graph).
    metadataBase: new URL(SITE_URL),
    title: { default: t("metaTitle"), template: `%s · ${t("appName")}` },
    description: t("metaDescription"),
    applicationName: t("appName"),
    // Valores por defecto; cada página pública pone los suyos con lib/seo.ts.
    openGraph: { type: "website", siteName: SITE_NAME, title: t("metaTitle"), description: t("metaDescription") },
    twitter: { card: "summary_large_image" },
    robots: INDEXABLE ? { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } : { index: false, follow: false },
    // Search Console (opcional): código de verificación por variable de entorno.
    ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
    // PWA (fase 9): instalable en el móvil (manifest en app/manifest.ts).
    appleWebApp: { capable: true, title: "Checkpoint", statusBarStyle: "black-translucent" },
    icons: { icon: "/icons/icon.svg", apple: "/icons/apple-touch-icon.png" },
  };
}

export const viewport: Viewport = { themeColor: "#07080f" };

// Pre-genera las rutas estáticas por idioma (SEO).
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body data-theme="student" className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          <SiteHeader />
          {children}
          <SiteFooter />
          <BitChat />
          <PwaRegister />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
