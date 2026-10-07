import { getTranslations } from "next-intl/server";
import { reviewMentorAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { MentorStatusBadge } from "@/components/panel/mentor-status-badge";
import type { MentorAdminRow } from "@/lib/mentor";
import type { ReportableStudent } from "@/lib/report-admin";
import { AdminReportForm } from "@/components/panel/admin-report-form";
import type { MentorLevel, MentorStatus } from "@/lib/db-types";

const LEVELS: MentorLevel[] = ["mentor", "pro", "experto"];

// Admin mínimo (F1.5): revisión de mentores. Verificar / rechazar / devolver a
// pendiente y fijar nivel. El email se muestra solo aquí (uso interno de admin).
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
  const pendientes = mentores.filter((m) => m.status === "pendiente").length;

  // Botones de cambio de estado según el estado actual.
  const acciones = (s: MentorStatus): MentorStatus[] =>
    s === "pendiente"
      ? ["verificado", "rechazado"]
      : s === "verificado"
        ? ["pendiente", "rechazado"]
        : ["pendiente", "verificado"];

  return (
    <div className="mt-8 space-y-6">
      {/* Informes semanales: el admin hace de tutor de referencia hasta que exista su panel. */}
      <section aria-labelledby="informes" className="rounded-xl border bg-card p-6">
        <h2 id="informes" className="font-display text-xl font-semibold">
          {tr("title")}
        </h2>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">{tr("help")}</p>
        <AdminReportForm locale={locale} students={reportStudents} defaultWeek={defaultWeek} />
      </section>

      <div>
        <h2 className="font-display text-xl font-semibold">{t("mentorsTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("pendingCount", { n: pendientes })}
        </p>
      </div>

      {mentores.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="space-y-3">
          {mentores.map((m) => (
            <li key={m.profile_id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {m.profile.full_name ?? t("noName")}
                  </p>
                  <p className="font-mono text-xs break-all text-muted-foreground">
                    {m.profile.email}
                  </p>
                  {m.headline && <p className="mt-1 text-sm">{m.headline}</p>}
                  <p className="mt-2 flex flex-wrap gap-1.5">
                    {m.mentor_modulo.length === 0 ? (
                      <span className="text-xs text-muted-foreground">
                        {t("noModules")}
                      </span>
                    ) : (
                      m.mentor_modulo.map((mm) => (
                        <span
                          key={mm.modulo.code}
                          title={mm.modulo.name}
                          className="rounded border px-1.5 py-0.5 font-mono text-xs text-primary"
                        >
                          {mm.modulo.code}
                        </span>
                      ))
                    )}
                  </p>
                </div>
                <MentorStatusBadge
                  status={m.status}
                  label={tm(`status.${m.status}`)}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
                {acciones(m.status).map((s) => (
                  <form key={s} action={reviewMentorAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="mentor_id" value={m.profile_id} />
                    <input type="hidden" name="status" value={s} />
                    <Button
                      type="submit"
                      size="sm"
                      variant={s === "verificado" ? "default" : "outline"}
                    >
                      {t(`action.${s}`)}
                    </Button>
                  </form>
                ))}

                <form
                  action={reviewMentorAction}
                  className="ml-auto flex items-center gap-2"
                >
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="mentor_id" value={m.profile_id} />
                  <label className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{tm("levelLabel")}</span>
                    <select
                      name="level"
                      defaultValue={m.level}
                      className="h-8 rounded-md border border-input bg-card px-2 text-sm"
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
    </div>
  );
}
