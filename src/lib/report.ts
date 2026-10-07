import type { RaStatus } from "@/lib/db-types";

// Contenido (payload jsonb) de un informe semanal. Lo redacta el tutor de
// referencia (hoy: admin); "próximas fechas" se calcula de los exámenes del alumno.
// Se valida al escribir y al leer: el jsonb no tiene esquema en BD.
export interface ReportPayload {
  overall: RaStatus;
  overall_note: string; // "Va bien, un punto a vigilar"
  active_days: number; // 0–7
  worked: { code: string; text: string; status: RaStatus }[];
  upcoming: { date: string; text: string }[]; // date = AAAA-MM-DD
  tip: string; // "qué podéis hacer esta semana" (1 frase)
}

const STATUSES: RaStatus[] = ["verde", "ambar", "rojo"];
export const MAX_WORKED = 4;
const MAX_TEXT = 160;

const str = (v: unknown, max = MAX_TEXT) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
const status = (v: unknown): RaStatus =>
  STATUSES.includes(v as RaStatus) ? (v as RaStatus) : "ambar";
const isDate = (v: unknown): v is string =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

// Normaliza cualquier valor a un payload válido (descarta lo que no encaje).
export function parseReportPayload(raw: unknown): ReportPayload {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const days = Number(o.active_days);
  return {
    overall: status(o.overall),
    overall_note: str(o.overall_note),
    active_days: Number.isFinite(days) ? Math.min(7, Math.max(0, Math.round(days))) : 0,
    worked: (Array.isArray(o.worked) ? o.worked : [])
      .map((w) => {
        const x = (w ?? {}) as Record<string, unknown>;
        return { code: str(x.code, 8), text: str(x.text), status: status(x.status) };
      })
      .filter((w) => w.code && w.text)
      .slice(0, MAX_WORKED),
    upcoming: (Array.isArray(o.upcoming) ? o.upcoming : [])
      .map((u) => {
        const x = (u ?? {}) as Record<string, unknown>;
        return { date: isDate(x.date) ? x.date : "", text: str(x.text) };
      })
      .filter((u) => u.date && u.text)
      .slice(0, 6),
    tip: str(o.tip, 240),
  };
}

// Lunes (UTC) de la semana de una fecha AAAA-MM-DD.
export function mondayOf(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = lunes
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export function addDays(date: string, n: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Informe tal como lo consume la UI.
export interface WeeklyReport {
  id: string;
  student_id: string;
  week_start: string;
  payload: ReportPayload;
}

export function toWeeklyReport(row: {
  id: string;
  student_id: string;
  week_start: string;
  payload: unknown;
}): WeeklyReport {
  return { ...row, payload: parseReportPayload(row.payload) };
}
