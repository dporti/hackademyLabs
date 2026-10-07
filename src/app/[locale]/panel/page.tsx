import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSessionUser, localePath } from "@/lib/auth";
import { getStudentDashboard } from "@/lib/student";
import { getMentorSelf, getMentoresAdmin } from "@/lib/mentor";
import { buscarModulos, getPacks } from "@/lib/catalog";
import { signOutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { StudentPanel } from "@/components/panel/student-panel";
import { MentorPanel } from "@/components/panel/mentor-panel";
import { AdminPanel } from "@/components/panel/admin-panel";
import { OnboardingContent } from "@/components/auth/onboarding-content";

// Panel autenticado, según rol: alumno (F1.4), mentor y admin (F1.5).
// Familia y tutor de referencia: stub hasta sus fases.
export const instant = false;

export default async function PanelPage({
  params,
}: PageProps<"/[locale]/panel">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSessionUser();
  if (!session) redirect(localePath(locale, "/entrar"));
  const { user, profile } = session!;

  const t = await getTranslations("panel");
  const ta = await getTranslations("auth");
  const name = profile?.full_name ?? profile?.email ?? "";

  let contenido: React.ReactNode = null;
  if (profile?.role === "alumno") {
    const [dashboard, packs, catalogo] = await Promise.all([
      getStudentDashboard(user.id),
      getPacks(),
      buscarModulos(""),
    ]);
    // Sin student_profile no puede tener ledger ni módulos: primero onboarding
    // (renderizado aquí, no redirect: ver OnboardingContent).
    if (!dashboard.hasProfile)
      return <OnboardingContent locale={locale} role="alumno" />;
    contenido = (
      <StudentPanel
        locale={locale}
        dashboard={dashboard}
        packs={packs}
        catalogo={catalogo.map((m) => ({ code: m.code, name: m.name }))}
      />
    );
  } else if (profile?.role === "mentor") {
    const [mentor, catalogo] = await Promise.all([
      getMentorSelf(user.id),
      buscarModulos(""),
    ]);
    if (!mentor) return <OnboardingContent locale={locale} role="mentor" />;
    contenido = (
      <MentorPanel
        locale={locale}
        mentor={mentor}
        catalogo={catalogo.map((m) => ({ code: m.code, name: m.name }))}
      />
    );
  } else if (profile?.role === "admin") {
    contenido = <AdminPanel locale={locale} mentores={await getMentoresAdmin()} />;
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {t("greeting", { name })}
        </h1>
        <form action={signOutAction}>
          <input type="hidden" name="locale" value={locale} />
          <Button type="submit" variant="outline" size="sm">
            {ta("logout")}
          </Button>
        </form>
      </div>
      {contenido ?? (
        <p className="mt-4 text-muted-foreground">
          {t("roleLabel")}: <span className="font-medium">{profile?.role}</span>
        </p>
      )}
    </main>
  );
}
