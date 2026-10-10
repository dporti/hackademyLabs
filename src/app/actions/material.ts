"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { localePath } from "@/lib/auth";

// Banco de material por RA que alimenta a Bit (fase 8). Escriben mentores verificados
// de ese módulo (queda sin revisar) y admin; solo el admin lo marca como revisado.
// La RLS (mat_*) lo vuelve a comprobar en BD.

export interface MaterialState {
  error?: string;
  ok?: string;
}

async function sesion(locale: string) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect(localePath(locale, "/entrar"));
  const { data: me } = await sb.from("profile").select("role").eq("id", user!.id).maybeSingle();
  return { sb, userId: user!.id, role: me?.role as string | undefined };
}

export async function createMaterialAction(_prev: MaterialState, formData: FormData): Promise<MaterialState> {
  const locale = String(formData.get("locale") ?? "es");
  const code = String(formData.get("modulo") ?? "");
  const raCode = String(formData.get("ra") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (title.length < 3 || body.length < 20) return { error: "tooShort" };
  if (title.length > 140 || body.length > 8000) return { error: "tooLong" };

  const { sb, userId, role } = await sesion(locale);
  if (role !== "mentor" && role !== "admin") return { error: "notAllowed" };
  const { data: mod } = await sb.from("modulo").select("id").eq("code", code).maybeSingle();
  if (!mod) return { error: "moduloNotFound" };
  let raId: string | null = null;
  if (raCode) {
    const { data: ra } = await sb.from("ra").select("id").eq("modulo_id", mod.id).eq("code", raCode).maybeSingle();
    raId = ra?.id ?? null;
  }
  const { error } = await sb.from("material").insert({
    modulo_id: mod.id,
    ra_id: raId,
    title,
    body,
    author_id: userId,
    reviewed: role === "admin",
  });
  if (error) return { error: "notAllowed" };
  refresh();
  return { ok: role === "admin" ? "savedReviewed" : "savedPending" };
}

export async function reviewMaterialAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "es");
  const { sb, role } = await sesion(locale);
  if (role !== "admin") return;
  await sb
    .from("material")
    .update({ reviewed: formData.get("reviewed") === "true" })
    .eq("id", String(formData.get("id") ?? ""));
  refresh();
}

export async function deleteMaterialAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "es");
  const { sb } = await sesion(locale);
  await sb.from("material").delete().eq("id", String(formData.get("id") ?? ""));
  refresh();
}
