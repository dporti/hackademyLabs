"use server";

import { redirect } from "next/navigation";
import { refresh, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { localePath } from "@/lib/auth";
import { MENTORES_TAG } from "@/lib/catalog";
import type { MentorLevel, MentorStatus } from "@/lib/db-types";
import { MAX_WORKED, addDays, mondayOf, parseReportPayload } from "@/lib/report";

// Acciones de admin (F1.5). Se ejecutan con la sesión del ADMIN, no con service
// role: la RLS (mp_admin_all) y el trigger guard_mentor_status vuelven a comprobar
// en BD que quien actúa es admin (defensa en profundidad).

const STATUSES: MentorStatus[] = ["pendiente", "verificado", "rechazado"];
const LEVELS: MentorLevel[] = ["mentor", "pro", "experto"];

export async function reviewMentorAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "es");
  const mentorId = String(formData.get("mentor_id") ?? "");
  const status = String(formData.get("status") ?? "") as MentorStatus;
  const level = String(formData.get("level") ?? "") as MentorLevel;

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect(localePath(locale, "/entrar"));
  const { data: me } = await sb
    .from("profile")
    .select("role")
    .eq("id", user!.id)
    .maybeSingle();
  if (me?.role !== "admin") return;

  const patch: Record<string, unknown> = {};
  if (STATUSES.includes(status)) {
    patch.status = status;
    // verified_at solo tiene sentido mientras está verificado.
    patch.verified_at = status === "verificado" ? new Date().toISOString() : null;
  }
  if (LEVELS.includes(level)) patch.level = level;
  if (!Object.keys(patch).length) return;

  await sb.from("mentor_profile").update(patch).eq("profile_id", mentorId);

  // Verificar/rechazar cambia qué mentores salen en la web pública.
  updateTag(MENTORES_TAG);
  refresh();
}

// ─────────────────────────── Informes semanales ───────────────────────────
// Hoy los redacta el admin haciendo de tutor de referencia (no hay panel de
// tutor). "Próximas fechas" se calcula de los exámenes del alumno.

export interface ReportActionState {
  error?: string;
  ok?: string;
}

const UPCOMING_DAYS = 45;

export async function saveWeeklyReportAction(
  _prev: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  const locale = String(formData.get("locale") ?? "es");
  const studentId = String(formData.get("student_id") ?? "");
  const weekRaw = String(formData.get("week_start") ?? "");

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect(localePath(locale, "/entrar"));
  const { data: me } = await sb.from("profile").select("role").eq("id", user!.id).maybeSingle();
  if (me?.role !== "admin") return { error: "notAdmin" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekRaw)) return { error: "badWeek" };
  const weekStart = mondayOf(weekRaw);

  // El informe va a la familia ACTUAL del alumno; sin familia, no hay informe.
  const { data: sp } = await sb
    .from("student_profile")
    .select("family_id, student_modulo(exam_date, modulo(code, name))")
    .eq("profile_id", studentId)
    .maybeSingle();
  if (!sp?.family_id) return { error: "noFamily" };

  const examenes = (sp.student_modulo ?? []) as unknown as {
    exam_date: string | null;
    modulo: { code: string; name: string };
  }[];
  const hasta = addDays(weekStart, UPCOMING_DAYS);
  const upcoming = examenes
    .filter((e) => e.exam_date && e.exam_date >= weekStart && e.exam_date <= hasta)
    .sort((a, b) => a.exam_date!.localeCompare(b.exam_date!))
    // "Examen" es igual en es y ca; el nombre del módulo es dato del catálogo.
    .map((e) => ({ date: e.exam_date!, text: `Examen ${e.modulo.code} · ${e.modulo.name}` }));

  const worked = Array.from({ length: MAX_WORKED }, (_, i) => ({
    code: formData.get(`worked_code_${i}`),
    text: formData.get(`worked_text_${i}`),
    status: formData.get(`worked_status_${i}`),
  }));

  const payload = parseReportPayload({
    overall: formData.get("overall"),
    overall_note: formData.get("overall_note"),
    active_days: formData.get("active_days"),
    worked,
    upcoming,
    tip: formData.get("tip"),
  });
  if (!payload.overall_note || !payload.tip) return { error: "required" };

  // Un informe por alumno y semana: si ya existe, se corrige.
  const { data: prev } = await sb
    .from("weekly_report")
    .select("id")
    .eq("student_id", studentId)
    .eq("week_start", weekStart)
    .maybeSingle();
  const { error } = prev
    ? await sb.from("weekly_report").update({ payload, family_id: sp.family_id }).eq("id", prev.id)
    : await sb
        .from("weekly_report")
        .insert({ student_id: studentId, family_id: sp.family_id, week_start: weekStart, payload });
  if (error) return { error: "generic" };

  refresh();
  return { ok: prev ? "reportUpdated" : "reportSaved" };
}
