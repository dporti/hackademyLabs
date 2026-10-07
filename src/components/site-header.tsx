import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import {
  HeaderSession,
  HeaderSessionFallback,
} from "@/components/header-session";

export function SiteHeader() {
  const t = useTranslations("nav");
  const c = useTranslations("common");

  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2">
          {/* Logomark HUD */}
          <span
            aria-hidden
            className="grid size-6 place-items-center rounded-[5px] font-mono text-[11px] font-bold text-primary-foreground"
            style={{
              backgroundColor: "var(--primary)",
              boxShadow: "var(--glow-primary)",
            }}
          >
            T
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            {c("appName")}
          </span>
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-muted-foreground sm:flex">
          <Link href="/ciclos" className="transition-colors hover:text-foreground">
            {t("cycles")}
          </Link>
          <Link href="/modulos" className="transition-colors hover:text-foreground">
            {t("modules")}
          </Link>
          <Link href="/mentores" className="transition-colors hover:text-foreground">
            {t("mentors")}
          </Link>
          <Link href="/precios" className="transition-colors hover:text-foreground">
            {t("pricing")}
          </Link>
          <Link href="/familias" className="transition-colors hover:text-foreground">
            {t("families")}
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <LocaleSwitcher />
          <Suspense fallback={<HeaderSessionFallback />}>
            <HeaderSession />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
