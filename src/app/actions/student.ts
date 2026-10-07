"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { localePath } from "@/lib/auth";

// Acciones del panel del alumno (F1.4). Los errores se devuelven como CÓDIGOS
// (claves i18n de `panel.errors`), la UI los traduce.

export interface StudentActionState {
  error?: string;
  ok?: string;
  // Para mensajes con datos (p. ej. créditos añadidos).
  credits?: number;
}

// Caducidad de los créditos comprados: 12 meses (docs/modelo-negocio-v1.md §5).
const CADUCIDAD_MESES = 12;

// Devuelve el alumno autenticado con student_profile, o un código de error.
async function requireStudent(locale: string) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect(localePath(locale, "/entrar"));

  const { data: profile } = await sb
    .from("profile")
    .select("role")
    .eq("id", user!.id)
    .maybeSingle();
  if (profile?.role !== "alumno") return { sb, error: "notStudent" as const };

  const { data: sp } = await sb
    .from("student_profile")
    .select("profile_id")
    .eq("profile_id", user!.id)
    .maybeSingle();
  if (!sp) return { sb, error: "noProfile" as const };

  return { sb, userId: user!.id };
}

// ───────────────────────── Compra de pack (MOCK) ─────────────────────────
// Fase 1: sin cobro real. El servidor (service role) añade un movimiento
// 'compra_pack' al ledger. En la fase de Stripe real, este insert pasará al
// webhook de pago confirmado; esta acción solo creará la sesión de checkout.
export async function buyPackAction(
  _prev: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  const locale = String(formData.get("locale") ?? "es");
  const slug = String(formData.get("pack") ?? "");

  const ctx = await requireStudent(locale);
  if (ctx.error) return { error: ctx.error };

  // El precio y los créditos salen SIEMPRE de la BD, nunca del formulario.
  const { data: pack } = await ctx.sb
    .from("pack")
    .select("id, credits")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (!pack) return { error: "packNotFound" };

  const expires = new Date();
  expires.setMonth(expires.getMonth() + CADUCIDAD_MESES);

  const { error } = await createAdminClient()
    .from("credit_ledger")
    .insert({
      student_id: ctx.userId,
      type: "compra_pack",
      amount: pack.credits,
      pack_id: pack.id,
      expires_at: expires.toISOString(),
      note: "Compra simulada (Fase 1, sin cobro real)",
    });
  if (error) return { error: "generic" };

  refresh();
  return { ok: "packBought", credits: pack.credits };
}

// ───────────────────────── Módulos que prepara ─────────────────────────
// Escritura con el cliente del alumno: la RLS (sm_own) limita a sus filas.
export async function addModuloAction(
  _prev: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  const locale = String(formData.get("locale") ?? "es");
  const code = String(formData.get("modulo") ?? "").trim();
  const examDate = String(formData.get("exam_date") ?? "") || null;

  const ctx = await requireStudent(locale);
  if (ctx.error) return { error: ctx.error };

  const { data: modulo } = await ctx.sb
    .from("modulo")
    .select("id")
    .eq("code", code)
    .maybeSingle();
  if (!modulo) return { error: "moduloNotFound" };

  // Upsert: añadir de nuevo un módulo existente actualiza su fecha de examen.
  const { error } = await ctx.sb.from("student_modulo").upsert(
    { student_id: ctx.userId, modulo_id: modulo.id, exam_date: examDate },
    { onConflict: "student_id,modulo_id" },
  );
  if (error) return { error: "generic" };

  refresh();
  return { ok: "moduloAdded" };
}

export async function removeModuloAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "es");
  const moduloId = String(formData.get("modulo_id") ?? "");

  const ctx = await requireStudent(locale);
  if (ctx.error) return;

  await ctx.sb
    .from("student_modulo")
    .delete()
    .eq("student_id", ctx.userId)
    .eq("modulo_id", moduloId);

  refresh();
}
