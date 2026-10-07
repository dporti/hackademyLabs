"use server";

import { redirect } from "next/navigation";
import { refresh, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { localePath } from "@/lib/auth";
import { MENTORES_TAG } from "@/lib/catalog";
import type { MentorLevel, MentorStatus } from "@/lib/db-types";

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
