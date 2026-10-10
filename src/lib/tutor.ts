import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Checkin, TutorStudentRow } from "@/lib/db-types";
import { toWeeklyReport, type WeeklyReport } from "@/lib/report";

// Panel del tutor de referencia (fase 7, maqueta PanelTutor.html). Todo con la sesión
// del tutor: la RLS (is_tutor_of) limita a los alumnos que le asignó el admin.

export type EstadoAlumno = "va_bien" | "atencion" | "riesgo";

// Señal que explica el estado (clave i18n tutorPanel.alert.* + datos).
export type Alerta =
  | { kind: "sinActividad"; days: number }
  | { kind: "nuncaActivo" }
  | { kind: "examenCerca"; code: string; days: number; flojos: number }
  | { kind: "informeRojo" }
  | { kind: "informePendiente" };

const DIA = 86_400_000;
const diasEntre = (a: string, b: string) =>
  Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / DIA);

// Reglas orientativas (a validar con David): riesgo si lleva ≥ 5 días sin actividad,
// examen en ≤ 14 días con ≥ 2 RA flojos o último informe en rojo; atención con
// ≥ 3 días sin actividad, examen en ≤ 30 días con algún RA flojo o informe en ámbar.
export function evaluarAlumno(r: TutorStudentRow, hoy: string, lunes: string) {
  const alertas: Alerta[] = [];
  let estado: EstadoAlumno = "va_bien";
  const sube = (e: EstadoAlumno) => {
    if (e === "riesgo" || (e === "atencion" && estado === "va_bien")) estado = e;
  };

  if (!r.last_active) {
    alertas.push({ kind: "nuncaActivo" });
    sube("atencion");
  } else {
    const d = diasEntre(r.last_active, hoy);
    if (d >= 3) {
      alertas.push({ kind: "sinActividad", days: d });
      sube(d >= 5 ? "riesgo" : "atencion");
    }
  }
  if (r.next_exam && r.next_exam_code) {
    const d = diasEntre(hoy, r.next_exam);
    if (d <= 30 && r.ra_rojos > 0) {
      alertas.push({ kind: "examenCerca", code: r.next_exam_code, days: d, flojos: r.ra_rojos });
      sube(d <= 14 && r.ra_rojos >= 2 ? "riesgo" : "atencion");
    }
  }
  if (r.last_overall === "rojo") {
    alertas.push({ kind: "informeRojo" });
    sube("riesgo");
  } else if (r.last_overall === "ambar") sube("atencion");
  // Informe del domingo: solo para alumnos con familia vinculada.
  if (r.has_family && (!r.last_report || r.last_report < lunes)) alertas.push({ kind: "informePendiente" });

  return { estado: estado as EstadoAlumno, alertas };
}

export async function getTutorCartera(): Promise<TutorStudentRow[]> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("my_tutor_students");
  if (error) throw error;
  return (data ?? []) as TutorStudentRow[];
}

// Check-ins pendientes del tutor (desde hace 12 h, para no perder los de hoy).
export async function getTutorCheckins(tutorId: string): Promise<Checkin[]> {
  const sb = await createClient();
  const desde = new Date(Date.now() - 12 * 3_600_000).toISOString();
  const { data, error } = await sb
    .from("checkin")
    .select("*")
    .eq("tutor_id", tutorId)
    .is("done_at", null)
    .gte("scheduled_at", desde)
    .order("scheduled_at")
    .limit(50);
  if (error) throw error;
  return (data ?? []) as Checkin[];
}

export interface TutorStudentDetail {
  row: TutorStudentRow;
  checkins: Checkin[];
  reports: WeeklyReport[];
  // Días con actividad en las últimas 4 semanas (AAAA-MM-DD).
  activity: string[];
}

export async function getTutorStudent(studentId: string): Promise<TutorStudentDetail | null> {
  const cartera = await getTutorCartera();
  const row = cartera.find((r) => r.student_id === studentId);
  if (!row) return null;
  const sb = await createClient();
  const desde = new Date(Date.now() - 28 * DIA).toISOString().slice(0, 10);
  const [ci, wr, act] = await Promise.all([
    sb.from("checkin").select("*").eq("student_id", studentId).order("scheduled_at", { ascending: false }).limit(20),
    sb
      .from("weekly_report")
      .select("id, student_id, week_start, payload")
      .eq("student_id", studentId)
      .order("week_start", { ascending: false })
      .limit(4),
    sb.from("student_activity").select("day").eq("student_id", studentId).gte("day", desde),
  ]);
  if (ci.error) throw ci.error;
  if (wr.error) throw wr.error;
  if (act.error) throw act.error;
  return {
    row,
    checkins: (ci.data ?? []) as Checkin[],
    reports: (wr.data ?? []).map(toWeeklyReport),
    activity: (act.data ?? []).map((a) => a.day as string),
  };
}

// Tutores activos (para el selector del admin) y alumnos con su tutor actual.
export interface AdminTutorData {
  tutors: { id: string; name: string; email: string | null; students: number }[];
  students: { id: string; name: string; tutor_id: string | null }[];
}

export async function getAdminTutorData(): Promise<AdminTutorData> {
  const sb = await createClient();
  const [rt, sp, ta] = await Promise.all([
    sb.from("reference_tutor").select("profile_id, active, profile(full_name, email)").eq("active", true),
    sb.from("student_profile").select("profile_id, profile(full_name, email)"),
    sb.from("tutor_assignment").select("student_id, tutor_id"),
  ]);
  if (rt.error) throw rt.error;
  if (sp.error) throw sp.error;
  if (ta.error) throw ta.error;
  type P = { full_name: string | null; email: string | null } | null;
  const asign = new Map((ta.data ?? []).map((a) => [a.student_id as string, a.tutor_id as string]));
  const cuenta = new Map<string, number>();
  for (const t of asign.values()) cuenta.set(t, (cuenta.get(t) ?? 0) + 1);
  return {
    tutors: ((rt.data ?? []) as unknown as { profile_id: string; profile: P }[])
      .map((r) => ({
        id: r.profile_id,
        name: r.profile?.full_name || r.profile?.email || r.profile_id,
        email: r.profile?.email ?? null,
        students: cuenta.get(r.profile_id) ?? 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    students: ((sp.data ?? []) as unknown as { profile_id: string; profile: P }[])
      .map((r) => ({
        id: r.profile_id,
        name: r.profile?.full_name || r.profile?.email || r.profile_id,
        tutor_id: asign.get(r.profile_id) ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}
