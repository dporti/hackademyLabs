import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { hasSession } from "@/lib/auth";

// Botón de cuenta del header: "Mi panel" con sesión, "Entrar" sin ella. Lee cookies,
// así que va dentro de <Suspense> en SiteHeader: el resto de la página sigue
// prerenderizada (PPR) y solo este hueco se resuelve por petición.
export async function HeaderSession() {
  const t = await getTranslations("nav");
  const logged = await hasSession();

  return (
    <Link
      href={logged ? "/panel" : "/entrar"}
      className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-primary px-4 text-[15px] font-bold whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary/85"
    >
      {logged ? t("panel") : t("login")}
    </Link>
  );
}

// Hueco del mismo tamaño mientras llega la sesión (evita salto de layout y no
// muestra "Entrar" a quien ya ha iniciado sesión).
export function HeaderSessionFallback() {
  return (
    <span
      aria-hidden
      className="inline-block h-11 w-24 animate-pulse rounded-[10px] border border-border/60 bg-muted/30"
    />
  );
}
