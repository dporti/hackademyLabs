import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { MentorLevel, MentorStatus, Modulo } from "@/lib/db-types";

// Capa de datos de los paneles de mentor y admin. Siempre con el cliente SSR (sesión
// del usuario): la RLS decide qué ve cada uno (mentor → lo suyo; admin → todo).

export interface MentorProfileRow {
  profile_id: string;
  level: MentorLevel;
  status: MentorStatus;
  headline: string | null;
  bio: string | null;
  video_url: string | null;
  languages: string[];
  response_time_minutes: number | null;
  verified_at: string | null;
  created_at: string;
}

type ModuloRef = { modulo: Pick<Modulo, "code" | "name"> };

export type MentorSelf = MentorProfileRow & { moduloCodes: string[] };

// Perfil del mentor autenticado (null si aún no hizo onboarding).
export async function getMentorSelf(mentorId: string): Promise<MentorSelf | null> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("mentor_profile")
    .select("*, mentor_modulo(modulo(code, name))")
    .eq("profile_id", mentorId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { mentor_modulo, ...row } = data as MentorProfileRow & {
    mentor_modulo: ModuloRef[];
  };
  return { ...row, moduloCodes: mentor_modulo.map((mm) => mm.modulo.code).sort() };
}

// Vista de admin: todos los mentores con nombre, email (uso interno, nunca
// público) y módulos. Pendientes primero, luego por antigüedad.
export type MentorAdminRow = MentorProfileRow & {
  profile: { full_name: string | null; email: string | null };
  mentor_modulo: ModuloRef[];
};

const STATUS_ORDER: Record<MentorStatus, number> = {
  pendiente: 0,
  rechazado: 1,
  verificado: 2,
};

export async function getMentoresAdmin(): Promise<MentorAdminRow[]> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("mentor_profile")
    .select("*, profile(full_name, email), mentor_modulo(modulo(code, name))")
    .order("created_at");
  if (error) throw error;
  const rows = (data ?? []) as unknown as MentorAdminRow[];
  return rows.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
}
