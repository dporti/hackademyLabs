import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSessionUser, localePath } from "@/lib/auth";
import { getStudentDashboard } from "@/lib/student";
import { getMentorSelf, getMentoresAdmin } from "@/lib/mentor";
import { getFamilyDashboard } from "@/lib/family";
import { getMentorEarnings, getPendientesAlumno, getPendientesMentor } from "@/lib/consumo";
import { getReportableStudents } from "@/lib/report-admin";
import { mondayOf } from "@/lib/report";
import { buscarModulos, getPacks } from "@/lib/catalog";
import { signOutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { StudentPanel } from "@/components/panel/student-panel";
import { MentorPanel } from "@/components/panel/mentor-panel";
import { AdminPanel } from "@/components/panel/admin-panel";
import { FamilyPanel } from "@/components/panel/family-panel";
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
    const [dashboard, packs, catalogo, pendientes] = await Promise.all([
      getStudentDashboard(user.id),
      getPacks(),
      buscarModulos(""),
      getPendientesAlumno(user.id),
    ]);
    // Sin student_profile no puede tener ledger ni módulos: primero onboarding
    // (renderizado aquí, no redirect: ver OnboardingContent).
    if (!dashboard.hasProfile)
      return <OnboardingContent locale={locale} role="alumno" />;
    contenido = (
      <StudentPanel
        locale={locale}
        dashboard={dashboard}
        pendientes={pendientes}
        packs={packs}
        catalogo={catalogo.map((m) => ({ code: m.code, name: m.name }))}
      />
    );
  } else if (profile?.role === "mentor") {
    const [mentor, catalogo, pendientes, earnings] = await Promise.all([
      getMentorSelf(user.id),
      buscarModulos(""),
      getPendientesMentor(user.id),
      getMentorEarnings(user.id),
    ]);
    if (!mentor) return <OnboardingContent locale={locale} role="mentor" />;
    contenido = (
      <MentorPanel
        locale={locale}
        mentor={mentor}
        pendientes={pendientes}
        earnings={earnings}
        catalogo={catalogo.map((m) => ({ code: m.code, name: m.name }))}
      />
    );
  } else if (profile?.role === "familia") {
    const dashboard = await getFamilyDashboard(user.id);
    if (!dashboard.family) return <OnboardingContent locale={locale} role="familia" />;
    contenido = <FamilyPanel locale={locale} dashboard={dashboard} />;
  } else if (profile?.role === "admin") {
    const [mentores, reportStudents] = await Promise.all([
      getMentoresAdmin(),
      getReportableStudents(),
    ]);
    contenido = (
      <AdminPanel
        locale={locale}
        mentores={mentores}
        reportStudents={reportStudents}
        defaultWeek={mondayOf(new Date().toISOString().slice(0, 10))}
      />
    );
  }

  return (
    // La zona de familia usa el acento magenta de Tutor247 (data-accent="tutor").
    <main
      data-accent={profile?.role === "familia" ? "tutor" : undefined}
      className="w-full flex-1 bg-background text-foreground"
    >
      <div className="mx-auto w-full max-w-5xl px-4 py-12">
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
      </div>
    </main>
  );
}
