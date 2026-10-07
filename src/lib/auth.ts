import "server-only";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/db-types";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  email: string | null;
  locale: string;
  avatar_url: string | null;
}

// Usuario autenticado + su profile (o null si no hay sesión).
export async function getSessionUser() {
  // supabase-js usa Date.now() al validar la sesión; sin esto, el prerender en
  // runtime (con cookies) de Next 16 da "unstable value Date.now()". Solo request.
  await connection();
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data: profile } = await sb
    .from("profile")
    .select("id, role, full_name, email, locale, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  return { user, profile: profile as Profile | null };
}

// Construye una ruta con el prefijo de locale correcto ("as-needed": es sin prefijo).
export function localePath(locale: string, path: string) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return locale === "es" ? clean : `/${locale}${clean}`;
}
