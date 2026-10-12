"use server";

import { headers } from "next/headers";
import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { permitirMensaje } from "@/lib/bit/rate-limit";

// «Avísame cuando haya mentor» (fase C). Con cuenta de alumno: RPC con su sesión.
// Sin cuenta: email + consentimiento, insertado con service role (la tabla no tiene
// permisos de escritura para el cliente). Antispam: campo trampa + 5 por hora por IP.
// El email de aviso se enviará cuando haya proveedor (fase E); hoy queda guardado.

export interface AvisoState {
  ok?: "created" | "cancelled";
  error?: "invalid" | "email" | "consent" | "age" | "rateLimited" | "tooMany" | "server";
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CODIGO = /^[0-9A-Za-z]{2,6}$/;

export async function createAlertAction(_prev: AvisoState, fd: FormData): Promise<AvisoState> {
  if (String(fd.get("website") ?? "").trim()) return { ok: "created" }; // campo trampa
  const modulo = String(fd.get("modulo") ?? "").trim();
  if (!CODIGO.test(modulo)) return { error: "invalid" };
  const idiomaRaw = String(fd.get("language") ?? "");
  const idioma = ["es", "ca", "en"].includes(idiomaRaw) ? idiomaRaw : null;

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (user) {
    const { error } = await sb.rpc("create_module_alert", {
      p_modulo_code: modulo,
      p_language: idioma,
      p_fit: fd.get("fit") === "on",
    });
    if (error) return { error: error.message.includes("tooMany") ? "tooMany" : "invalid" };
    refresh();
    return { ok: "created" };
  }

  const email = String(fd.get("email") ?? "").trim().toLowerCase().slice(0, 120);
  if (!EMAIL.test(email)) return { error: "email" };
  if (fd.get("consent") !== "on") return { error: "consent" };
  if (fd.get("age") !== "on") return { error: "age" };

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  if (!permitirMensaje(`alerta:${ip}`, 5)) return { error: "rateLimited" };

  const admin = createAdminClient();
  const { data: mod } = await admin.from("modulo").select("id").eq("code", modulo).maybeSingle();
  if (!mod) return { error: "invalid" };
  const { error } = await admin.from("module_alert").insert({
    email,
    modulo_id: mod.id,
    language: idioma,
    locale: String(fd.get("locale") ?? "es") === "ca" ? "ca" : "es",
    consent_at: new Date().toISOString(),
  });
  // Ya había una alerta abierta con ese email y módulo: para el usuario es lo mismo.
  if (error && error.code !== "23505") {
    console.error("[alerta]", error.message);
    return { error: "server" };
  }
  return { ok: "created" };
}

export async function cancelAlertAction(fd: FormData) {
  const sb = await createClient();
  await sb.rpc("cancel_module_alert", { p_alert: String(fd.get("alert") ?? "") });
  refresh();
}
