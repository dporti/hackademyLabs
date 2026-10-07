"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { localePath } from "@/lib/auth";

// Acciones del panel de familia.

// Genera un código de invitación nuevo (sustituye al pendiente). La RPC comprueba
// que el usuario es dueño de una familia.
export async function createFamilyInviteAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "es");
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect(localePath(locale, "/entrar"));

  await sb.rpc("create_family_invite");
  refresh();
}
