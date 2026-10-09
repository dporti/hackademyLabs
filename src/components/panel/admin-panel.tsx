import { getTranslations } from "next-intl/server";
import { reviewMentorAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { MentorStatusBadge } from "@/components/panel/mentor-status-badge";
import { iniciales } from "@/components/brand/mentor-card";
import type { MentorAdminRow } from "@/lib/mentor";
import type { ReportableStudent } from "@/lib/report-admin";
import { AdminReportForm } from "@/components/panel/admin-report-form";
import type { MentorLevel, MentorStatus } from "@/lib/db-types";

const LEVELS: MentorLevel[] = ["mentor", "pro", "experto"];

// Admin (maqueta Admin.html) con lo que existe: cifras de mentores, verificación
// (verificar / rechazar / devolver a pendiente y nivel) e informes semanales (el admin
// hace de tutor de referencia). Métricas de negocio, incidencias y demanda del mockup
// necesitan datos que aún no se guardan: no se muestran. El email solo aquí (uso interno).
export async function AdminPanel({
  locale,
  mentores,
  reportStudents,
  defaultWeek,
}: {
  locale: string;
  mentores: MentorAdminRow[];
  reportStudents: ReportableStudent[];
  defaultWeek: string;
}) {
  const tr = await getTranslations("adminReport");
  const t = await getTranslations("adminPanel");
  const tm = await getTranslations("mentorPanel");
  const cuenta = (s: MentorStatus) => mentores.filter((m) => m.status === s).length;

  // Botones de cambio de estado según el estado actual.
  const acciones = (s: MentorStatus): MentorStatus[] =>
    s === "pendiente" ? ["verificado", "rechazado"] : s === "verificado" ? ["pendiente", "rechazado"] : ["pendiente", "verificado"];

  const cifras = [
    { label: t("statPending"), value: cuenta("pendiente"), destacada: cuenta("pendiente") > 0 },
    { label: t("statVerified"), value: cuenta("verificado") },
    { label: t("statRejected"), value: cuenta("rechazado") },
    { label: t("statReportable"), value: reportStudents.length },
  ];

  return (
    <div className="mt-8 space-y-12">
      <section aria-label={t("statsAria")} className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cifras.map((c) => (
          <div
            key={c.label}
            className={`rounded-2xl border p-5 ${c.destacada ? "glow border-tint-warning-border bg-tint-warning" : "bg-card"}`}
          >
            <p className="text-sm text-label">{c.label}</p>
            <p className={`mt-2 font-mono text-3xl font-semibold ${c.destacada ? "text-warning" : "text-primary"}`}>
              {c.value}
            </p>
          </div>
        ))}
      </section>

      {/* ─────────────────────── Verificación de mentores ─────────────────────── */}
      <section aria-labelledby="mentores">
        <h2 id="mentores" className="font-heading text-2xl font-bold">
          {t("mentorsTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("pendingCount", { n: cuenta("pendiente") })}</p>

        {mentores.length === 0 ? (
          <p className="mt-4 text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="mt-5 space-y-3">
            {mentores.map((m) => (
              <li
                key={m.profile_id}
                className={`rounded-2xl border p-5 ${m.status === "pendiente" ? "border-tint-warning-border bg-card" : "bg-card"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <span
                      aria-hidden
                      className="grid size-11 shrink-0 place-items-center rounded-xl border border-tint-primary-border bg-tint-primary font-heading font-bold text-primary"
                    >
                      {iniciales(m.profile.full_name)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold">{m.profile.full_name ?? t("noName")}</p>
                      <p className="font-mono text-xs break-all text-label">{m.profile.email}</p>
                      {m.headline && <p className="mt-1 text-sm text-muted-foreground">{m.headline}</p>}
                      <p className="mt-2 flex flex-wrap gap-1.5">
                        {m.mentor_modulo.length === 0 ? (
                          <span className="text-xs text-muted-foreground">{t("noModules")}</span>
                        ) : (
                          m.mentor_modulo.map((mm) => (
                            <span
                              key={mm.modulo.code}
                              title={mm.modulo.name}
                              className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-xs"
                            >
                              {mm.modulo.code}
                            </span>
                          ))
                        )}
                      </p>
                    </div>
                  </div>
                  <MentorStatusBadge status={m.status} label={tm(`status.${m.status}`)} />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-divider pt-4">
                  {acciones(m.status).map((s) => (
                    <form key={s} action={reviewMentorAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="mentor_id" value={m.profile_id} />
                      <input type="hidden" name="status" value={s} />
                      <Button type="submit" size="sm" variant={s === "verificado" ? "default" : "outline"}>
                        {t(`action.${s}`)}
                      </Button>
                    </form>
                  ))}

                  <form action={reviewMentorAction} className="ml-auto flex items-center gap-2">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="mentor_id" value={m.profile_id} />
                    <label className="flex items-center gap-2 text-sm">
                      <span className="text-label">{tm("levelLabel")}</span>
                      <select
                        name="level"
                        defaultValue={m.level}
                        className="h-10 rounded-[10px] border border-border bg-background px-3 text-sm"
                      >
                        {LEVELS.map((l) => (
                          <option key={l} value={l}>
                            {tm(`level.${l}`)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Button type="submit" size="sm" variant="secondary">
                      {t("setLevel")}
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Informes semanales: el admin hace de tutor de referencia hasta que exista su panel. */}
      <section aria-labelledby="informes" data-accent="tutor" className="rounded-3xl border bg-card p-5 sm:p-7">
        <h2 id="informes" className="font-heading text-2xl font-bold">
          {tr("title")}
        </h2>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">{tr("help")}</p>
        <AdminReportForm locale={locale} students={reportStudents} defaultWeek={defaultWeek} />
      </section>
    </div>
  );
}
