import { getTranslations } from "next-intl/server";
import { buscarModulos } from "@/lib/catalog";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { AuthShell } from "@/components/auth/auth-shell";
import type { UserRole } from "@/lib/db-types";

// Pantalla de onboarding reutilizable: la usa /onboarding y también /panel cuando
// al usuario le falta su subperfil. El panel la RENDERIZA en vez de redirigir a
// /onboarding: el router del cliente cachea las redirecciones de un Server
// Component y, tras completar el onboarding, volvía a mandar a /onboarding.
export async function OnboardingContent({
  locale,
  role,
  embedded = false,
}: {
  locale: string;
  role: UserRole;
  // true dentro de /panel (el AppShell ya da el marco).
  embedded?: boolean;
}) {
  const t = await getTranslations("onboarding");
  const subtitle =
    role === "familia"
      ? t("familiaSubtitle")
      : role === "mentor"
        ? t("mentorSubtitle")
        : t("alumnoSubtitle");

  // Lista de módulos solo si es mentor (para el selector).
  const modulos =
    role === "mentor"
      ? (await buscarModulos("")).map((m) => ({ code: m.code, name: m.name }))
      : [];

  return (
    <AuthShell title={t("title")} subtitle={subtitle} width="lg" embedded={embedded}>
      <OnboardingForm locale={locale} role={role} modulos={modulos} />
    </AuthShell>
  );
}
