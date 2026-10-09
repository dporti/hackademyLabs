import { getTranslations } from "next-intl/server";
import { CalendarClock, EyeOff, ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createFamilyInviteAction } from "@/app/actions/family";
import { Button } from "@/components/ui/button";
import { RaBadge } from "@/components/brand/ra-badge";
import { formatInviteCode, type FamilyDashboard } from "@/lib/family";
import { WeeklyReportCard } from "@/components/panel/weekly-report-card";
import { temasDe } from "@/lib/temas";

// Panel de familia (maqueta Familia.html, tema oscuro con acento magenta). Por cada
// hijo, lo que el consentimiento permite ver: estado del último informe, próximas
// fechas, módulos con sus temas e informes. Vincular y aviso de privacidad al lado.
// Tutor de referencia y plan/pagos aún no tienen datos: no se muestran.
export async function FamilyPanel({ locale, dashboard }: { locale: string; dashboard: FamilyDashboard }) {
  const t = await getTranslations("familyPanel");
  const tt = await getTranslations("temas");
  const { students, invite, reports } = dashboard;
  // Fechas `date` (sin hora): formatear en UTC evita el desfase de día.
  const fechaDia = (d: string) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(d));
  const fecha = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso));

  return (
    <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
      {/* ─────────────────────────── Hijos ─────────────────────────── */}
      <section aria-labelledby="hijos" className="space-y-6">
        <h2 id="hijos" className="sr-only">
          {t("studentsTitle")}
        </h2>
        {students.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-6 text-muted-foreground">{t("studentsEmpty")}</p>
        ) : (
          students.map((s) => {
            const informes = reports.filter((r) => r.student_id === s.student_id);
            const ultimo = informes[0];
            const fechas = (s.modulos ?? [])
              .filter((m) => m.exam_date)
              .sort((a, b) => a.exam_date!.localeCompare(b.exam_date!));
            return (
              <article key={s.student_id} className="rounded-3xl border bg-card p-5 sm:p-7">
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs tracking-[0.2em] text-label uppercase">{t("following")}</p>
                    <h3 className="mt-1 font-heading text-2xl font-bold">{s.full_name ?? t("noName")}</h3>
                  </div>
                  {s.shared ? (
                    <RaBadge status="verde" label={t(s.is_minor ? "minor" : "sharing")} />
                  ) : (
                    <RaBadge status="ambar" label={t("notSharing")} />
                  )}
                </header>

                {!s.shared ? (
                  <p className="mt-5 flex gap-3 rounded-2xl border border-dashed p-4 text-muted-foreground">
                    <EyeOff aria-hidden className="mt-0.5 size-5 shrink-0" />
                    {t("notSharingHelp")}
                  </p>
                ) : (
                  <>
                    {/* Estado + próximas fechas */}
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-tint-primary-border bg-tint-primary p-5">
                        <p className="font-mono text-xs tracking-[0.2em] text-label uppercase">{t("status")}</p>
                        {ultimo ? (
                          <>
                            <div className="mt-2">
                              <RaBadge status={ultimo.payload.overall} label={t(`overall.${ultimo.payload.overall}`)} />
                            </div>
                            {ultimo.payload.overall_note && <p className="mt-3">{ultimo.payload.overall_note}</p>}
                            <p className="mt-2 font-mono text-xs text-label">
                              {t("weekOf", { date: fechaDia(ultimo.week_start) })}
                            </p>
                          </>
                        ) : (
                          <p className="mt-2 text-muted-foreground">{t("noReports")}</p>
                        )}
                      </div>
                      <div className="rounded-2xl border bg-surface-2/50 p-5">
                        <p className="flex items-center gap-2 font-mono text-xs tracking-[0.2em] text-label uppercase">
                          <CalendarClock aria-hidden className="size-4" />
                          {t("upcomingTitle")}
                        </p>
                        {fechas.length === 0 ? (
                          <p className="mt-2 text-muted-foreground">{t("noExamDates")}</p>
                        ) : (
                          <ul className="mt-3 space-y-2 text-sm">
                            {fechas.slice(0, 4).map((m) => (
                              <li key={m.code} className="flex gap-3">
                                <span className="w-14 shrink-0 font-mono text-primary">{fechaDia(m.exam_date!)}</span>
                                <span>{t("examOf", { code: m.code, name: m.name })}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* Módulos con temas */}
                    <p className="mt-6 text-sm text-label">{t("modules")}</p>
                    {s.modulos?.length ? (
                      <ul className="mt-2 grid gap-3 md:grid-cols-2">
                        {s.modulos.map((m) => (
                          <li key={m.code} className="rounded-2xl border bg-card p-4">
                            <p className="flex items-baseline justify-between gap-3">
                              <span className="font-semibold">
                                <span className="font-mono text-primary">{m.code}</span> {m.name}
                              </span>
                            </p>
                            <p className="mt-1 font-mono text-xs text-label">
                              {m.exam_date ? t("examOn", { date: fechaDia(m.exam_date) }) : t("noExamDate")}
                            </p>
                            {temasDe(tt, m.code).length > 0 && (
                              <p className="mt-2 text-xs text-muted-foreground">
                                {temasDe(tt, m.code).slice(0, 4).join(" · ")}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">{t("noModules")}</p>
                    )}
                    <p className="mt-3 text-sm text-muted-foreground">
                      {t("balance")}: <span className="font-mono text-foreground">{s.balance ?? 0}</span> {t("credits")}
                    </p>

                    {/* Informe más reciente completo; los anteriores, plegados. */}
                    {ultimo && (
                      <div className="mt-6 space-y-3">
                        <WeeklyReportCard report={ultimo} studentName={s.full_name ?? t("noName")} locale={locale} />
                        {informes.length > 1 && (
                          <details className="rounded-2xl border p-4">
                            <summary className="min-h-10 cursor-pointer content-center text-sm font-medium">
                              {t("olderReports", { n: informes.length - 1 })}
                            </summary>
                            <div className="mt-3 space-y-3">
                              {informes.slice(1).map((r) => (
                                <WeeklyReportCard
                                  key={r.id}
                                  report={r}
                                  studentName={s.full_name ?? t("noName")}
                                  locale={locale}
                                />
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    )}
                  </>
                )}
              </article>
            );
          })
        )}
      </section>

      {/* ─────────────────────── Columna lateral ─────────────────────── */}
      <aside className="space-y-4">
        <section aria-labelledby="vincular" className="rounded-3xl border bg-card p-5">
          <h2 id="vincular" className="font-heading text-xl font-bold">
            {t("linkTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("linkHelp")}</p>
          {invite && (
            <div className="mt-4">
              <p
                aria-label={t("codeAria")}
                className="rounded-xl border-2 border-dashed border-primary/50 bg-tint-primary px-4 py-3 text-center font-mono text-2xl font-bold tracking-widest select-all"
              >
                {formatInviteCode(invite.code)}
              </p>
              <p className="mt-2 text-xs text-label">{t("codeExpires", { date: fecha(invite.expires_at) })}</p>
            </div>
          )}
          <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>{t("step1")}</li>
            <li>{t("step2")}</li>
            <li>{t("step3")}</li>
          </ol>
          <form action={createFamilyInviteAction} className="mt-5">
            <input type="hidden" name="locale" value={locale} />
            <Button type="submit" variant={invite ? "outline" : "default"} className="w-full">
              {invite ? t("newCode") : t("createCode")}
            </Button>
          </form>
        </section>

        <p className="flex gap-3 rounded-2xl border border-tint-primary-border bg-tint-primary p-4 text-sm">
          <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
          {t("privacy")}
        </p>

        <p className="px-1 text-sm text-muted-foreground">
          {t("plansHint")}{" "}
          <Link href="/tutor247#planes" className="text-primary underline-offset-4 hover:underline">
            {t("plansLink")}
          </Link>
        </p>
      </aside>
    </div>
  );
}
