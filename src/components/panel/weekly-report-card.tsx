import { getTranslations } from "next-intl/server";
import { InformeSemanal } from "@/components/brand/informe-semanal";
import { addDays, type WeeklyReport } from "@/lib/report";

// Informe semanal real (familia y alumno). Misma pieza visual que el ejemplo de
// la landing de familias, alimentada con el payload guardado.
export async function WeeklyReportCard({
  report,
  studentName,
  locale,
}: {
  report: WeeklyReport;
  studentName: string;
  locale: string;
}) {
  const t = await getTranslations("report");
  const tf = await getTranslations("family");
  const p = report.payload;
  // Fechas `date` sin hora: en UTC para no desplazar el día.
  const dia = (d: string, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...opts, timeZone: "UTC" }).format(new Date(d));

  return (
    <InformeSemanal
      d={{
        title: tf("report.title"),
        exampleLabel: "",
        student: studentName,
        week: t("week", {
          from: dia(report.week_start, { day: "numeric", month: "short" }),
          to: dia(addDays(report.week_start, 6), { day: "numeric", month: "short" }),
        }),
        overallLabel: tf("report.overallLabel"),
        overall: { status: p.overall, label: p.overall_note },
        consistencyLabel: tf("report.consistencyLabel"),
        consistencyDays: p.active_days,
        consistencyText: t("days", { n: p.active_days }),
        workedLabel: tf("report.workedLabel"),
        worked: p.worked.map((w) => ({
          code: w.code,
          text: w.text,
          status: w.status,
          statusLabel: tf(`status.${w.status}`),
        })),
        upcomingLabel: tf("report.upcomingLabel"),
        upcoming: p.upcoming.map((u) => ({
          date: dia(u.date, { day: "numeric", month: "short" }),
          text: u.text,
        })),
        tipLabel: tf("report.tipLabel"),
        tip: p.tip,
      }}
    />
  );
}
