import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/locale-switcher";

export function SiteHeader() {
  const t = useTranslations("nav");
  const c = useTranslations("common");

  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="font-bold tracking-tight">
          {c("appName")}
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-muted-foreground sm:flex">
          <Link href="/ciclos" className="hover:text-foreground">
            {t("cycles")}
          </Link>
          <Link href="/modulos" className="hover:text-foreground">
            {t("modules")}
          </Link>
          <Link href="/mentores" className="hover:text-foreground">
            {t("mentors")}
          </Link>
          <Link href="/precios" className="hover:text-foreground">
            {t("pricing")}
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <LocaleSwitcher />
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href="/entrar" />}
          >
            {t("login")}
          </Button>
        </div>
      </div>
    </header>
  );
}
