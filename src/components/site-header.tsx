import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Logo } from "@/components/brand/logo";
import { MobileMenu } from "@/components/mobile-menu";
import {
  HeaderSession,
  HeaderSessionFallback,
} from "@/components/header-session";

// Enlaces principales (mockup Main.html).
export const NAV_LINKS = [
  { href: "/modulos", key: "approve" },
  { href: "/tutor247", key: "tutor247" },
  { href: "/mentores", key: "mentors" },
  { href: "/precios", key: "tariffs" },
] as const;

// Sin display: cada botón decide cuándo se muestra (hidden + sm:/md:inline-flex).
const BTN =
  "min-h-11 items-center justify-center rounded-[10px] px-4 text-[15px] transition-colors";

export function SiteHeader() {
  const t = useTranslations("nav");

  return (
    <header className="sticky top-0 z-20 border-b border-divider bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1200px] items-center gap-6 px-4 py-3 sm:px-6">
        <Link href="/" className="shrink-0 rounded-[10px]">
          <Logo responsive />
        </Link>

        <nav
          aria-label={t("mainNav")}
          className="hidden items-center gap-6 text-[15px] text-[#c5c9da] lg:flex"
        >
          {NAV_LINKS.map((l) => (
            <Link
              key={l.key}
              href={l.href}
              className="border-b-2 border-transparent py-1.5 transition-colors hover:border-primary hover:text-foreground"
            >
              {t(l.key)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          <span className="hidden sm:block">
            <LocaleSwitcher />
          </span>
          <Link
            href="/panel/tickets"
            aria-label={t("sosAria")}
            className={`${BTN} hidden border border-sos font-mono font-bold text-sos-text hover:bg-tint-sos md:inline-flex`}
          >
            <span aria-hidden className="mr-1.5">●</span>
            {t("sos")}
          </Link>
          <Link
            href="/diagnostico"
            className={`${BTN} hidden border border-[#3a3f5c] font-medium text-foreground hover:border-primary sm:inline-flex`}
          >
            {t("freeTest")}
          </Link>
          <Suspense fallback={<HeaderSessionFallback />}>
            <HeaderSession />
          </Suspense>
          <MobileMenu
            label={t("menu")}
            navLabel={t("mainNav")}
            links={[
              ...NAV_LINKS.map((l) => ({ href: l.href, label: t(l.key) })),
              { href: "/diagnostico", label: t("freeTest") },
              { href: "/panel/tickets", label: t("sosAria") },
            ]}
          >
            <LocaleSwitcher />
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}
