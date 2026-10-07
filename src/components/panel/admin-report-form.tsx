"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { saveWeeklyReportAction, type ReportActionState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field";
import type { ReportableStudent } from "@/lib/report-admin";
import type { RaStatus } from "@/lib/db-types";

const STATUSES: RaStatus[] = ["verde", "ambar", "rojo"];
const FILAS = 4; // = MAX_WORKED

// Redacción del informe semanal (admin haciendo de tutor de referencia).
// Campos CONTROLADOS: React 19 resetea los formularios tras la acción y así no se
// pierde lo escrito si hay un error. "Próximas fechas" lo calcula el servidor.
export function AdminReportForm({
  locale,
  students,
  defaultWeek,
}: {
  locale: string;
  students: ReportableStudent[];
  defaultWeek: string;
}) {
  const t = useTranslations("adminReport");
  const tf = useTranslations("family");
  const [state, action, pending] = useActionState<ReportActionState, FormData>(
    saveWeeklyReportAction,
    {},
  );
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [week, setWeek] = useState(defaultWeek);
  const [overall, setOverall] = useState<RaStatus>("verde");
  const [note, setNote] = useState("");
  const [days, setDays] = useState(5);
  const [tip, setTip] = useState("");
  const [rows, setRows] = useState(
    Array.from({ length: FILAS }, () => ({ code: "", text: "", status: "verde" as RaStatus })),
  );
  const modulos = students.find((s) => s.id === studentId)?.modulos ?? [];
  const setRow = (i: number, patch: Partial<(typeof rows)[number]>) =>
    setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  if (!students.length) return <p className="text-sm text-muted-foreground">{t("noStudents")}</p>;

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className={LABEL_CLASS}>{t("student")}</span>
          <select
            name="student_id"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className={INPUT_CLASS}
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className={LABEL_CLASS}>{t("week")}</span>
          <input
            type="date"
            name="week_start"
            required
            value={week}
            onChange={(e) => setWeek(e.target.value)}
            className={INPUT_CLASS}
          />
          <span className="block text-xs text-muted-foreground">{t("weekHint")}</span>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-[auto_1fr_auto]">
        <label className="block space-y-1">
          <span className={LABEL_CLASS}>{t("overall")}</span>
          <select
            name="overall"
            value={overall}
            onChange={(e) => setOverall(e.target.value as RaStatus)}
            className={INPUT_CLASS}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {tf(`status.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className={LABEL_CLASS}>{t("overallNote")}</span>
          <input
            name="overall_note"
            required
            maxLength={160}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("overallNotePh")}
            className={INPUT_CLASS}
          />
        </label>
        <label className="block space-y-1">
          <span className={LABEL_CLASS}>{t("activeDays")}</span>
          <input
            type="number"
            name="active_days"
            min={0}
            max={7}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className={`${INPUT_CLASS} w-24`}
          />
        </label>
      </div>

      <fieldset className="space-y-2">
        <legend className={LABEL_CLASS}>{t("worked")}</legend>
        {rows.map((row, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[10rem_1fr_9rem]">
            <select
              name={`worked_code_${i}`}
              aria-label={t("module")}
              value={row.code}
              onChange={(e) => setRow(i, { code: e.target.value })}
              className={INPUT_CLASS}
            >
              <option value="">—</option>
              {modulos.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.code} · {m.name}
                </option>
              ))}
            </select>
            <input
              name={`worked_text_${i}`}
              aria-label={t("workedText")}
              maxLength={160}
              value={row.text}
              onChange={(e) => setRow(i, { text: e.target.value })}
              placeholder={t("workedTextPh")}
              className={INPUT_CLASS}
            />
            <select
              name={`worked_status_${i}`}
              aria-label={t("overall")}
              value={row.status}
              onChange={(e) => setRow(i, { status: e.target.value as RaStatus })}
              className={INPUT_CLASS}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {tf(`status.${s}`)}
                </option>
              ))}
            </select>
          </div>
        ))}
        {!modulos.length && (
          <p className="text-xs text-muted-foreground">{t("noModules")}</p>
        )}
      </fieldset>

      <label className="block space-y-1">
        <span className={LABEL_CLASS}>{tf("report.tipLabel")}</span>
        <input
          name="tip"
          required
          maxLength={240}
          value={tip}
          onChange={(e) => setTip(e.target.value)}
          placeholder={t("tipPh")}
          className={INPUT_CLASS}
        />
      </label>

      <p className="text-xs text-muted-foreground">{t("upcomingAuto")}</p>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending}>
          {t("save")}
        </Button>
        <p aria-live="polite" className="text-sm">
          {state.ok && <span className="text-primary">{t(`ok.${state.ok}`)}</span>}
          {state.error && (
            <span className="text-destructive">{t(`errors.${state.error}`)}</span>
          )}
        </p>
      </div>
    </form>
  );
}
