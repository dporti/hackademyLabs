"use server";

import { headers } from "next/headers";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { localePath } from "@/lib/auth";
import { permitirMensaje } from "@/lib/bit/rate-limit";
import type { LeadKind, LeadStatus } from "@/lib/db-types";

// Contacto sin cuenta: "Pregunta gratis" (alumno) y "Quiero que me llaméis" (familia).
// La web pública no puede escribir en `lead` (RLS sin políticas): se inserta aquí con
// service role tras validar. Antispam: campo trampa + 5 envíos/hora por IP.

export interface LeadState {
  ok?: boolean;
  error?: "invalid" | "contact" | "consent" | "rateLimited" | "server";
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TELEFONO = /^\+?[\d\s().-]{9,20}$/;
const corto = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);

export async function createLeadAction(_prev: LeadState, formData: FormData): Promise<LeadState> {
  // Campo trampa: los humanos no lo ven; si viene relleno, fingimos éxito.
  if (corto(formData.get("website"), 200)) return { ok: true };

  const kind = String(formData.get("kind")) as LeadKind;
  if (kind !== "pregunta" && kind !== "llamada") return { error: "invalid" };

  const contact = corto(formData.get("contact"), 120);
  if (!EMAIL.test(contact) && !TELEFONO.test(contact)) return { error: "contact" };
  if (formData.get("consent") !== "on") return { error: "consent" };

  const message = corto(formData.get("message"), 3000);
  if (kind === "pregunta" && message.length < 10) return { error: "invalid" };

  const quienRaw = String(formData.get("quien") ?? "");
  const quien = quienRaw === "alumno" || quienRaw === "familia" ? quienRaw : null;
  const modulo = corto(formData.get("modulo"), 10);

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  if (!permitirMensaje(`lead:${ip}`, 5)) return { error: "rateLimited" };

  const { error } = await createAdminClient()
    .from("lead")
    .insert({
      kind,
      contact,
      consent: true,
      quien,
      name: corto(formData.get("name"), 80) || null,
      modulo_code: /^[0-9A-Za-z]{2,6}$/.test(modulo) ? modulo : null,
      message: message || null,
      preferred_time: corto(formData.get("preferred_time"), 80) || null,
      locale: String(formData.get("locale") ?? "es") === "ca" ? "ca" : "es",
    });
  if (error) {
    console.error("[lead]", error.message);
    return { error: "server" };
  }
  return { ok: true };
}

// Admin: cambiar el estado de un contacto. Con la sesión del admin (RLS lead_admin).
const ESTADOS: LeadStatus[] = ["nuevo", "contactado", "cerrado"];

export async function updateLeadStatusAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "es");
  const id = String(formData.get("lead") ?? "");
  const status = String(formData.get("status") ?? "") as LeadStatus;
  if (!ESTADOS.includes(status)) return;
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect(localePath(locale, "/entrar"));
  await sb
    .from("lead")
    .update({ status, handled_at: status === "nuevo" ? null : new Date().toISOString() })
    .eq("id", id);
  refresh();
}
