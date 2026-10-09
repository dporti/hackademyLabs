import "server-only";
import { cache } from "react";
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
// cache(): layout y página del panel la piden en la misma petición → una sola lectura.
export const getSessionUser = cache(async function getSessionUser() {
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
});

// ¿Hay sesión válida? Como getSessionUser pero sin leer profile. Usa getUser (no
// getClaims) a propósito: debe coincidir con el criterio del panel. getClaims da
// por buena la cookie de un usuario borrado o con sesión revocada (JWT aún no
// caducado) y /entrar → /panel → /entrar entraría en bucle.
export async function hasSession() {
  await connection();
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return !!user;
}

// Construye una ruta con el prefijo de locale correcto ("as-needed": es sin prefijo).
export function localePath(locale: string, path: string) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return locale === "es" ? clean : `/${locale}${clean}`;
}
