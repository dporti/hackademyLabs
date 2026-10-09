import { getTranslations } from "next-intl/server";
import { CalendarClock, MessageSquareText, Video, Wallet } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { removeModuloAction } from "@/app/actions/student";
import { AddModuloForm } from "@/components/panel/add-modulo-form";
import { StudentFamily } from "@/components/panel/student-family";
import { WeeklyReportCard } from "@/components/panel/weekly-report-card";
import { LedgerTable } from "@/components/panel/ledger-table";
import { temasDe } from "@/lib/temas";
import type { StudentDashboard } from "@/lib/student";
import type { getPendientesAlumno } from "@/lib/consumo";
import type { Modulo } from "@/lib/db-types";

// Panel del alumno (fase 4 de la fusión del diseño): resumen, módulos que prepara con
// fecha de examen y temas, pedir ayuda, familia, informes y últimos movimientos.
// Solo datos que existen: sin racha, XP ni plan inverso guardado todavía.

const DIA = 86_400_000;

export async function StudentPanel({
  locale,
  dashboard,
  pendientes,
  catalogo,
}: {
  locale: string;
  dashboard: StudentDashboard;
  pendientes: Awaited<ReturnType<typeof getPendientesAlumno>>;
  catalogo: Pick<Modulo, "code" | "name">[];
}) {
  const t = await getTranslations("panel");
  const tc = await getTranslations("consumo");
  const tk = await getTranslations("creditos");
  const tt = await getTranslations("temas");
  const { balance, ledger, modulos } = dashboard;

  // Las fechas de examen son `date` (sin hora): formatear en UTC evita el desfase de día.
  const fechaDia = (d: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(d));
  const hoy = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
  const diasHasta = (d: string) => Math.round((new Date(`${d}T00:00:00Z`).getTime() - hoy) / DIA);

  const proximo = modulos
    .filter((m) => m.exam_date && diasHasta(m.exam_date) >= 0)
    .sort((a, b) => a.exam_date!.localeCompare(b.exam_date!))[0];

  const resumen = [
    {
      icon: Wallet,
      label: t("balanceTitle"),
      value: `${balance}`,
      unit: t("creditsUnit"),
      href: "/panel/creditos",
    },
    {
      icon: CalendarClock,
      label: t("nextExam"),
      value: proximo ? t("daysLeft", { n: diasHasta(proximo.exam_date!) }) : "—",
      unit: proximo ? proximo.modulo.code : t("noExamYet"),
      href: proximo ? `/modulos/${proximo.modulo.code}` : "#mis-modulos",
    },
    {
      icon: MessageSquareText,
      label: tc("ticketsTitle"),
      value: `${pendientes.ticketsRespondidos}`,
      unit: t("answered"),
      href: "/panel/tickets",
    },
    {
      icon: Video,
      label: tc("sessionsTitle"),
      value: `${pendientes.sesionesProximas}`,
      unit: t("upcoming"),
      href: "/panel/sesiones",
    },
  ];

  return (
    <div className="mt-8 space-y-12">
      {/* ───────────────────────────── Resumen ───────────────────────────── */}
      <section aria-label={t("summaryAria")} className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {resumen.map((r, i) => (
          <Link
            key={r.label}
            href={r.href}
            className={`card-interactive rounded-2xl border p-5 ${
              i === 0 ? "glow border-tint-primary-border bg-tint-primary" : "bg-card"
            }`}
          >
            <p className="flex items-center gap-2 text-sm text-label">
              <r.icon aria-hidden className="size-4" />
              {r.label}
            </p>
            <p className="mt-2 font-mono text-3xl font-semibold text-primary">{r.value}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{r.unit}</p>
          </Link>
        ))}
      </section>

      {/* ─────────────────────────── Mis módulos ─────────────────────────── */}
      <section id="mis-modulos" aria-labelledby="mis-modulos-t" className="scroll-mt-24">
        <h2 id="mis-modulos-t" className="font-heading text-2xl font-bold">
          {t("modulesTitle")}
        </h2>
        {modulos.length === 0 ? (
          <p className="mt-2 text-muted-foreground">{t("modulesEmpty")}</p>
        ) : (
          <ul className="mt-5 grid gap-4 md:grid-cols-2">
            {modulos.map((sm) => {
              const dias = sm.exam_date ? diasHasta(sm.exam_date) : null;
              const temas = temasDe(tt, sm.modulo.code).slice(0, 4);
              return (
                <li key={sm.modulo_id} className="flex flex-col rounded-2xl border bg-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/modulos/${sm.modulo.code}`}
                        className="font-mono text-sm font-semibold text-primary hover:underline"
                      >
                        {sm.modulo.code}
                      </Link>
                      <p className="mt-1 font-heading text-lg leading-snug font-semibold">{sm.modulo.name}</p>
                    </div>
                    {dias != null && dias >= 0 && (
                      <span
                        className={`shrink-0 rounded-md border px-2 py-0.5 font-mono text-xs ${
                          dias <= 7
                            ? "border-tint-sos-border bg-tint-sos text-sos-text"
                            : dias <= 21
                              ? "border-tint-warning-border bg-tint-warning text-warning"
                              : "border-border text-muted-foreground"
                        }`}
                      >
                        {t("daysLeft", { n: dias })}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 font-mono text-xs text-label">
                    {sm.exam_date ? t("examOn", { date: fechaDia(sm.exam_date) }) : t("noExamDate")}
                  </p>
                  {temas.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {temas.map((x) => (
                        <li key={x} className="rounded-md bg-surface-2 px-2 py-0.5 text-xs text-muted-foreground">
                          {x}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                    <Link
                      href={`/diagnostico?m=${sm.modulo.code}${sm.exam_date ? `&x=${sm.exam_date}` : ""}`}
                      className="inline-flex min-h-10 items-center rounded-[10px] bg-primary px-3 text-sm font-bold text-primary-foreground hover:bg-primary/85"
                    >
                      {t("doDiagnostic")}
                    </Link>
                    <Link
                      href={`/panel/tickets?modulo=${sm.modulo.code}`}
                      className="inline-flex min-h-10 items-center rounded-[10px] border border-[#3a3f5c] px-3 text-sm font-medium hover:border-primary"
                    >
                      {t("askDoubt")}
                    </Link>
                    <form action={removeModuloAction} className="ml-auto">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="modulo_id" value={sm.modulo_id} />
                      <button
                        type="submit"
                        aria-label={t("removeModuleAria", { code: sm.modulo.code })}
                        className="min-h-10 rounded-[10px] px-2 text-sm text-label hover:text-foreground"
                      >
                        {t("removeModule")}
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-5 rounded-2xl border border-dashed p-5">
          <AddModuloForm locale={locale} modulos={catalogo} />
        </div>
      </section>

      {/* ─────────────────────────── Pedir ayuda ─────────────────────────── */}
      <section aria-labelledby="ayuda">
        <h2 id="ayuda" className="font-heading text-2xl font-bold">
          {tc("helpTitle")}
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Link href="/panel/tickets" className="card-interactive rounded-2xl border bg-card p-5">
            <span className="flex items-center gap-2 font-heading text-lg font-semibold">
              <MessageSquareText aria-hidden className="size-5 text-primary" />
              {tc("ticketsTitle")}
            </span>
            <p className="mt-1.5 text-sm text-muted-foreground">{tc("ticketsCardHelp")}</p>
          </Link>
          <Link href="/panel/sesiones" className="card-interactive rounded-2xl border bg-card p-5">
            <span className="flex items-center gap-2 font-heading text-lg font-semibold">
              <Video aria-hidden className="size-5 text-primary" />
              {tc("sessionsTitle")}
            </span>
            <p className="mt-1.5 text-sm text-muted-foreground">{tc("sessionsCardHelp")}</p>
          </Link>
        </div>
      </section>

      {/* ───────────────────────────── Familia ───────────────────────────── */}
      <StudentFamily locale={locale} family={dashboard.family} />

      {/* ─────────────────────── Informes semanales ─────────────────────── */}
      {dashboard.reports.length > 0 && (
        <section
          aria-labelledby="informes"
          data-accent="tutor"
          className="rounded-3xl border border-tint-secondary-border bg-tint-secondary p-6"
        >
          <h2 id="informes" className="font-heading text-2xl font-bold">
            {t("reportsTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("reportsHelp")}</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {dashboard.reports.slice(0, 2).map((r) => (
              <WeeklyReportCard key={r.id} report={r} studentName={t("you")} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {/* ─────────────────────── Últimos movimientos ─────────────────────── */}
      <section aria-labelledby="movimientos">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="movimientos" className="font-heading text-2xl font-bold">
            {tk("lastMoves")}
          </h2>
          <Link href="/panel/creditos" className="text-sm font-semibold text-primary hover:underline">
            {tk("seeAll")} →
          </Link>
        </div>
        <div className="mt-5">
          <LedgerTable locale={locale} ledger={ledger.slice(0, 5)} empty={tk("historyEmpty")} />
        </div>
      </section>
    </div>
  );
}
