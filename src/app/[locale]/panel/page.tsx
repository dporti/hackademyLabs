import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSessionUser, localePath } from "@/lib/auth";
import { getStudentDashboard } from "@/lib/student";
import { getMentorSelf, getMentoresAdmin } from "@/lib/mentor";
import { getFamilyDashboard } from "@/lib/family";
import {
  getMentorBookings,
  getMentorEarnings,
  getMentorTickets,
  getPendientesAlumno,
  getPendientesMentor,
} from "@/lib/consumo";
import { getReportableStudents } from "@/lib/report-admin";
import { mondayOf } from "@/lib/report";
import { getLeads } from "@/lib/leads";
import { buscarModulos } from "@/lib/catalog";
import { StudentPanel } from "@/components/panel/student-panel";
import { MentorPanel } from "@/components/panel/mentor-panel";
import { AdminPanel } from "@/components/panel/admin-panel";
import { FamilyPanel } from "@/components/panel/family-panel";
import { OnboardingContent } from "@/components/auth/onboarding-content";
import { TutorPanel, FILTROS, type FiltroCartera } from "@/components/panel/tutor-panel";
import { getAdminTutorData, getTutorCartera, getTutorCheckins } from "@/lib/tutor";

// Panel autenticado, según rol: alumno (F1.4), mentor y admin (F1.5).
// Familia (F6) y tutor de referencia (fase 7).
export const instant = false;

export default async function PanelPage({
  params,
  searchParams,
}: PageProps<"/[locale]/panel">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSessionUser();
  if (!session) redirect(localePath(locale, "/entrar"));
  const { user, profile } = session!;

  const t = await getTranslations("panel");
  const name = profile?.full_name ?? profile?.email ?? "";

  let contenido: React.ReactNode = null;
  if (profile?.role === "alumno") {
    const [dashboard, catalogo, pendientes] = await Promise.all([
      getStudentDashboard(user.id),
      buscarModulos(""),
      getPendientesAlumno(user.id),
    ]);
    // Sin student_profile no puede tener ledger ni módulos: primero onboarding
    // (renderizado aquí, no redirect: ver OnboardingContent).
    if (!dashboard.hasProfile)
      return <OnboardingContent embedded locale={locale} role="alumno" />;
    contenido = (
      <StudentPanel
        locale={locale}
        dashboard={dashboard}
        pendientes={pendientes}
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
    if (!mentor) return <OnboardingContent embedded locale={locale} role="mentor" />;
    // Agenda y bandeja solo para mentores verificados (los demás aún no reciben trabajo).
    const [agenda, bandeja] =
      mentor.status === "verificado"
        ? await Promise.all([getMentorBookings(user.id), getMentorTickets(user.id)])
        : [null, null];
    contenido = (
      <MentorPanel
        locale={locale}
        mentor={mentor}
        pendientes={pendientes}
        earnings={earnings}
        catalogo={catalogo.map((m) => ({ code: m.code, name: m.name }))}
        bookings={agenda?.bookings}
        tickets={bandeja?.mine}
        nombres={{ ...agenda?.nombres, ...bandeja?.nombres }}
      />
    );
  } else if (profile?.role === "familia") {
    const dashboard = await getFamilyDashboard(user.id);
    if (!dashboard.family) return <OnboardingContent embedded locale={locale} role="familia" />;
    contenido = <FamilyPanel locale={locale} dashboard={dashboard} />;
  } else if (profile?.role === "tutor_referencia") {
    const sp = await searchParams;
    const filtro = FILTROS.includes(sp.f as FiltroCartera) ? (sp.f as FiltroCartera) : "todos";
    const [cartera, checkins] = await Promise.all([getTutorCartera(), getTutorCheckins(user.id)]);
    const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
    contenido = (
      <TutorPanel locale={locale} cartera={cartera} checkins={checkins} filtro={filtro} hoy={hoy} lunes={mondayOf(hoy)} />
    );
  } else if (profile?.role === "admin") {
    const [mentores, reportStudents, leads, tutores] = await Promise.all([
      getMentoresAdmin(),
      getReportableStudents(),
      getLeads(),
      getAdminTutorData(),
    ]);
    contenido = (
      <AdminPanel
        locale={locale}
        mentores={mentores}
        reportStudents={reportStudents}
        leads={leads}
        tutores={tutores}
        defaultWeek={mondayOf(new Date().toISOString().slice(0, 10))}
      />
    );
  }

  return (
    // La zona de familia usa el acento magenta de Tutor247 (data-accent="tutor").
    <div
      data-accent={profile?.role === "familia" || profile?.role === "tutor_referencia" ? "tutor" : undefined}
      className="w-full"
    >
      <h1 className="font-heading text-[32px] leading-tight font-bold tracking-tight sm:text-[40px]">
        {t("greeting", { name })}
      </h1>
      {contenido ?? (
        <p className="mt-4 text-muted-foreground">
          {t("roleLabel")}: <span className="font-medium">{profile?.role}</span>
        </p>
      )}
    </div>
  );
}
