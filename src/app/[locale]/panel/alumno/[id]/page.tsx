import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSessionUser, localePath } from "@/lib/auth";
import { evaluarAlumno, getTutorStudent } from "@/lib/tutor";
import { getMapaAlumno } from "@/lib/mapa";
import { addDays, mondayOf } from "@/lib/report";
import { Link } from "@/i18n/navigation";
import { MapaModuloView } from "@/components/mapa/mapa-modulo";
import { EstadoBadge, alertaTexto } from "@/components/panel/tutor-panel";
import { CheckinForm } from "@/components/panel/checkin-form";
import { AdminReportForm } from "@/components/panel/admin-report-form";
import { WeeklyReportCard } from "@/components/panel/weekly-report-card";
import { completeCheckinAction, deleteCheckinAction } from "@/app/actions/mapa";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Ficha de un alumno de la cartera del tutor (fase 7): estado y alertas, actividad de
// las últimas 4 semanas, check-ins, Mapa de Dominio (el tutor valora RA y pone sellos)
// e informe semanal para la familia. Solo alumnos asignados (RLS + my_tutor_students).
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/panel/alumno/[id]">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tutorPanel" });
  return { title: t("studentTitle"), robots: { index: false } };
}

export default async function TutorAlumnoPage({ params, searchParams }: PageProps<"/[locale]/panel/alumno/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await getSessionUser();
  if (!session) redirect(localePath(locale, "/entrar"));
  if (session!.profile?.role !== "tutor_referencia") redirect(localePath(locale, "/panel"));

  const detalle = await getTutorStudent(id);
  if (!detalle) notFound();
  const { row, checkins, reports, activity } = detalle;

  const t = await getTranslations("tutorPanel");
  const sp = await searchParams;
  const modulos = await getMapaAlumno(id);
  const actual = modulos.find((m) => m.code === sp.m) ?? modulos[0];

  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
  const lunes = mondayOf(hoy);
  const { estado, alertas } = evaluarAlumno(row, hoy, lunes);
  const textos = await Promise.all(alertas.map(alertaTexto));
  const activos = new Set(activity);
  const dias = Array.from({ length: 28 }, (_, i) => addDays(hoy, i - 27));
  const ahoraLocal = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(new Date())
    .replace(" ", "T");
  const cuando = (iso: string) =>
    new Intl.DateTimeFormat(locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Madrid",
    }).format(new Date(iso));
  const pendientes = checkins.filter((c) => !c.done_at).reverse();
  const hechos = checkins.filter((c) => c.done_at);

  return (
    <div data-accent="tutor" className="w-full space-y-12">
      <header>
        <Link href="/panel" className="text-sm text-label hover:text-foreground">
          ← {t("back")}
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-[32px] leading-tight font-bold tracking-tight sm:text-[40px]">
            {row.full_name || "—"}
          </h1>
          <EstadoBadge estado={estado} />
        </div>
        <p className="mt-2 text-muted-foreground">
          {t(`mode.${row.mode}`)}
          {row.is_minor && ` · ${t("minor")}`}
          {` · ${row.has_family ? t("withFamily") : t("noFamily")}`}
        </p>
        {textos.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {textos.map((x) => (
              <li key={x} className="rounded-[10px] border border-tint-warning-border bg-tint-warning px-3 py-1.5 text-sm">
                {x}
              </li>
            ))}
          </ul>
        )}
      </header>

      {/* ───────────────────────── Actividad ───────────────────────── */}
      <section aria-labelledby="actividad">
        <h2 id="actividad" className="font-heading text-2xl font-bold">
          {t("activityTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("activityHelp", { n: activos.size })}</p>
        <ol className="mt-4 grid max-w-md grid-cols-7 gap-1.5" aria-label={t("activityAria")}>
          {dias.map((d) => (
            <li
              key={d}
              title={d}
              className={cn(
                "grid aspect-square place-items-center rounded-md border font-mono text-[10px]",
                activos.has(d) ? "border-tint-pass-border bg-tint-pass text-accent-pass" : "text-label",
              )}
            >
              <span aria-hidden>{activos.has(d) ? "●" : "·"}</span>
              <span className="sr-only">
                {d}: {activos.has(d) ? t("active") : t("inactive")}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* ───────────────────────── Check-ins ───────────────────────── */}
      <section aria-labelledby="checkins" className="rounded-3xl border bg-card p-5 sm:p-7">
        <h2 id="checkins" className="font-heading text-2xl font-bold">
          {t("checkinsTitle")}
        </h2>
        <div className="mt-5">
          <CheckinForm locale={locale} studentId={id} hasFamily={row.has_family} minDate={ahoraLocal} />
        </div>
        {pendientes.length > 0 && (
          <ul className="mt-6 space-y-3">
            {pendientes.map((c) => (
              <li key={c.id} className="rounded-2xl border bg-background p-4">
                <p className="font-semibold first-letter:uppercase">
                  {cuando(c.scheduled_at)} · {t(`kind.${c.kind}`)}
                </p>
                {c.topic && <p className="text-sm text-muted-foreground">{c.topic}</p>}
                <form action={completeCheckinAction} className="mt-3 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="checkin_id" value={c.id} />
                  <label className="min-w-0 flex-1">
                    <span className="sr-only">{t("ciNotes")}</span>
                    <textarea
                      name="notes"
                      rows={2}
                      maxLength={2000}
                      placeholder={t("ciNotes")}
                      className="w-full rounded-[10px] border border-border bg-background px-3 py-2 text-sm"
                    />
                  </label>
                  <Button type="submit" size="sm" className="h-10 rounded-[10px] px-4">
                    {t("ciDone")}
                  </Button>
                </form>
                <form action={deleteCheckinAction} className="mt-2">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="checkin_id" value={c.id} />
                  <button type="submit" className="min-h-10 text-sm text-label hover:text-foreground">
                    {t("ciDelete")}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        {hechos.length > 0 && (
          <details className="mt-6">
            <summary className="min-h-10 cursor-pointer text-sm font-semibold text-primary">
              {t("ciHistory", { n: hechos.length })}
            </summary>
            <ul className="mt-3 space-y-2">
              {hechos.map((c) => (
                <li key={c.id} className="border-b border-divider pb-2 text-sm last:border-0">
                  <span className="text-label first-letter:uppercase">
                    {cuando(c.scheduled_at)} · {t(`kind.${c.kind}`)}
                  </span>
                  {c.notes && <p className="whitespace-pre-wrap">{c.notes}</p>}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {/* ───────────────────────── Mapa de Dominio ───────────────────────── */}
      <section aria-labelledby="mapa" className="space-y-6">
        <h2 id="mapa" className="font-heading text-2xl font-bold">
          {t("mapTitle")}
        </h2>
        {!actual ? (
          <p className="text-muted-foreground">{t("noModules")}</p>
        ) : (
          <>
            <nav aria-label={t("mapTitle")} className="flex flex-wrap gap-2">
              {modulos.map((m) => (
                <Link
                  key={m.code}
                  href={`/panel/alumno/${id}?m=${m.code}`}
                  aria-current={m.code === actual.code ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-[10px] border px-4 text-sm",
                    m.code === actual.code ? "border-tint-primary-border bg-tint-primary text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="font-mono font-semibold">{m.code}</span>
                  <span className="max-w-48 truncate">{m.name}</span>
                </Link>
              ))}
            </nav>
            <MapaModuloView locale={locale} modulo={actual} hoy={hoy} viewer="tutor" studentId={id} />
          </>
        )}
      </section>

      {/* ───────────────────────── Informe semanal ───────────────────────── */}
      {row.has_family && (
        <section aria-labelledby="informe" className="rounded-3xl border bg-card p-5 sm:p-7">
          <h2 id="informe" className="font-heading text-2xl font-bold">
            {t("reportTitle")}
          </h2>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">{t("reportHelp")}</p>
          <AdminReportForm
            locale={locale}
            students={[{ id, name: row.full_name ?? "—", modulos: modulos.map((m) => ({ code: m.code, name: m.name })) }]}
            defaultWeek={lunes}
          />
          {reports.length > 0 && (
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {reports.slice(0, 2).map((r) => (
                <WeeklyReportCard key={r.id} report={r} studentName={row.full_name ?? ""} locale={locale} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
