import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getSessionUser, localePath } from "@/lib/auth";
import { OnboardingContent } from "@/components/auth/onboarding-content";

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

  return <OnboardingContent locale={locale} role={role} />;
}
