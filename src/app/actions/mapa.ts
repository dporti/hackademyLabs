"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { localePath } from "@/lib/auth";
import { NIVELES, type NivelDominio } from "@/lib/dominio";

// Acciones del Mapa de Dominio guardado y del panel del tutor (fase 7). Todas con la
// sesión del usuario: las RPC (SECURITY DEFINER) y la RLS comprueban permisos en BD.
// Errores como CÓDIGOS (claves i18n de `mapa.errors`).

export interface MapaActionState {
  error?: string;
  ok?: string;
  n?: number;
}

const ERRORES = ["noProfile", "moduloNotFound", "nothingToSave", "notAllowed", "raNotFound", "notAdmin", "userNotFound", "badRole", "notTutor"];
const codigo = (m: string) => ERRORES.find((c) => m.includes(c)) ?? "generic";

async function usuario(locale: string) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect(localePath(locale, "/entrar"));
  return { sb, userId: user!.id };
}

// Diagnóstico → Mapa. `e` es la codificación de la URL del diagnóstico: un carácter
// por RA en el orden del módulo (v domino · c casi · a con ayuda · r aún no · - nada).
const DEC: Record<string, NivelDominio> = { v: "domino", c: "casi", a: "con_ayuda", r: "aun_no" };

export async function saveDiagnosticoAction(
  _prev: MapaActionState,
  formData: FormData,
): Promise<MapaActionState> {
  const code = String(formData.get("modulo") ?? "");
  const enc = String(formData.get("e") ?? "").slice(0, 20);

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: "needLogin" };

  const { data: ras } = await sb
    .from("ra")
    .select("code, sort_order, modulo!inner(code)")
    .eq("modulo.code", code)
    .order("sort_order");
  if (!ras?.length) return { error: "moduloNotFound" };
  const niveles: Record<string, NivelDominio> = {};
  ras.forEach((r, i) => {
    const n = DEC[enc[i] ?? ""];
    if (n) niveles[r.code] = n;
  });

  const { data, error } = await sb.rpc("save_self_assessment", { p_modulo_code: code, p_niveles: niveles });
  if (error) return { error: codigo(error.message) };
  refresh();
  return { ok: "saved", n: data as number };
}

// Fecha de examen y horas/semana del plan inverso (RLS sm_own: solo sus filas).
export async function updatePlanAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "es");
  const moduloId = String(formData.get("modulo_id") ?? "");
  const exam = String(formData.get("exam_date") ?? "");
  const horas = Number(formData.get("hours_week"));
  const { sb, userId } = await usuario(locale);
  await sb
    .from("student_modulo")
    .update({
      exam_date: /^\d{4}-\d{2}-\d{2}$/.test(exam) ? exam : null,
      hours_week: Number.isInteger(horas) && horas >= 1 && horas <= 40 ? horas : null,
    })
    .eq("student_id", userId)
    .eq("modulo_id", moduloId);
  refresh();
}

// Mentor (tras sesión o ticket), tutor o admin valoran un RA. El sello «Lo entiendo»
// significa que el alumno lo ha explicado él mismo a una persona.
export async function assessRaAction(
  _prev: MapaActionState,
  formData: FormData,
): Promise<MapaActionState> {
  const locale = String(formData.get("locale") ?? "es");
  const nivel = String(formData.get("nivel") ?? "") as NivelDominio;
  if (!NIVELES.includes(nivel)) return { error: "generic" };
  const { sb } = await usuario(locale);
  const { error } = await sb.rpc("assess_ra", {
    p_student: String(formData.get("student_id") ?? ""),
    p_ra: String(formData.get("ra_id") ?? ""),
    p_nivel: nivel,
    p_seal: formData.get("seal") === "on",
    p_note: String(formData.get("note") ?? "").slice(0, 280) || null,
  });
  if (error) return { error: codigo(error.message) };
  refresh();
  return { ok: "assessed" };
}

// ───────────────────────────── Check-ins (tutor) ─────────────────────────────
export async function createCheckinAction(
  _prev: MapaActionState,
  formData: FormData,
): Promise<MapaActionState> {
  const locale = String(formData.get("locale") ?? "es");
  const when = String(formData.get("scheduled_at") ?? ""); // datetime-local (Madrid)
  const kind = formData.get("kind") === "llamada_familia" ? "llamada_familia" : "checkin";
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(when)) return { error: "badDate" };
  const { sb, userId } = await usuario(locale);
  const { error } = await sb.from("checkin").insert({
    tutor_id: userId,
    student_id: String(formData.get("student_id") ?? ""),
    kind,
    scheduled_at: madridAUtc(when),
    topic: String(formData.get("topic") ?? "").trim().slice(0, 200) || null,
  });
  if (error) return { error: "notAllowed" };
  refresh();
  return { ok: "checkinCreated" };
}

export async function completeCheckinAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "es");
  const { sb } = await usuario(locale);
  await sb
    .from("checkin")
    .update({
      done_at: new Date().toISOString(),
      notes: String(formData.get("notes") ?? "").trim().slice(0, 2000) || null,
    })
    .eq("id", String(formData.get("checkin_id") ?? ""));
  refresh();
}

export async function deleteCheckinAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "es");
  const { sb } = await usuario(locale);
  await sb.from("checkin").delete().eq("id", String(formData.get("checkin_id") ?? "")).is("done_at", null);
  refresh();
}

// "2026-10-12T18:30" en hora de Madrid → ISO UTC (sin dependencias: prueba el desfase).
function madridAUtc(local: string) {
  const comoUtc = new Date(`${local}:00Z`);
  const enMadrid = new Date(comoUtc.toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
  const enUtc = new Date(comoUtc.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(comoUtc.getTime() - (enMadrid.getTime() - enUtc.getTime())).toISOString();
}

// ───────────────────────────── Admin: tutores ─────────────────────────────
export async function makeTutorAction(
  _prev: MapaActionState,
  formData: FormData,
): Promise<MapaActionState> {
  const locale = String(formData.get("locale") ?? "es");
  const { sb } = await usuario(locale);
  const { error } = await sb.rpc("admin_make_tutor", { p_email: String(formData.get("email") ?? "") });
  if (error) return { error: codigo(error.message) };
  refresh();
  return { ok: "tutorCreated" };
}

export async function assignTutorAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "es");
  const tutor = String(formData.get("tutor_id") ?? "");
  const { sb } = await usuario(locale);
  await sb.rpc("admin_assign_tutor", {
    p_student: String(formData.get("student_id") ?? ""),
    p_tutor: tutor || null,
  });
  refresh();
}
