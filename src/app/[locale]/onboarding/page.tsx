import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSessionUser, localePath } from "@/lib/auth";
import { buscarModulos } from "@/lib/catalog";
import { OnboardingForm } from "@/components/auth/onboarding-form";

// Requiere sesión (lee cookies) → siempre dinámica.
export const instant = false;

export default async function OnboardingPage({
  params,
}: PageProps<"/[locale]/onboarding">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSessionUser();
  if (!session) redirect(localePath(locale, "/entrar"));
  const role = session!.profile?.role ?? "alumno";

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
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{subtitle}</p>
      <div className="mt-6">
        <OnboardingForm locale={locale} role={role} modulos={modulos} />
      </div>
    </main>
  );
}
