import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { hasSession } from "@/lib/auth";

// Botón de cuenta del header: "Mi panel" con sesión, "Entrar" sin ella. Lee cookies,
// así que va dentro de <Suspense> en SiteHeader: el resto de la página sigue
// prerenderizada (PPR) y solo este hueco se resuelve por petición.
export async function HeaderSession() {
  const t = await getTranslations("nav");
  const logged = await hasSession();

  return (
    <Button
      size="sm"
      variant={logged ? "default" : "outline"}
      nativeButton={false}
      render={<Link href={logged ? "/panel" : "/entrar"} />}
    >
      {logged ? t("panel") : t("login")}
    </Button>
  );
}

// Hueco del mismo tamaño mientras llega la sesión (evita salto de layout y no
// muestra "Entrar" a quien ya ha iniciado sesión).
export function HeaderSessionFallback() {
  return (
    <span
      aria-hidden
      className="inline-block h-7 w-20 animate-pulse rounded-md border border-border/60 bg-muted/30"
    />
  );
}
