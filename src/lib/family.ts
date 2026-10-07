import "server-only";
import { createClient } from "@/lib/supabase/server";
import { toWeeklyReport, type WeeklyReport } from "@/lib/report";

// Capa de datos del panel de familia. Los datos de cada hijo llegan por la RPC
// my_family_students, que ya aplica la regla de consentimiento (menor de edad o
// consentimiento explícito); sin él, solo nombre y estado.

export interface FamilyStudent {
  student_id: string;
  full_name: string | null;
  is_minor: boolean;
  shared: boolean;
  modulos: { code: string; name: string; exam_date: string | null }[] | null;
  balance: number | null;
}

export interface FamilyDashboard {
  family: { id: string; name: string | null } | null;
  students: FamilyStudent[];
  invite: { code: string; expires_at: string } | null;
  reports: WeeklyReport[];
}

export async function getFamilyDashboard(ownerId: string): Promise<FamilyDashboard> {
  const sb = await createClient();
  const { data: family, error } = await sb
    .from("family")
    .select("id, name")
    .eq("owner_profile_id", ownerId)
    .maybeSingle();
  if (error) throw error;
  if (!family) return { family: null, students: [], invite: null, reports: [] };

  const [studentsRes, inviteRes, reportsRes] = await Promise.all([
    sb.rpc("my_family_students"),
    sb
      .from("family_invite")
      .select("code, expires_at")
      .eq("family_id", family.id)
      .is("used_by", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // La RLS (wr_family) ya filtra por consentimiento.
    sb
      .from("weekly_report")
      .select("id, student_id, week_start, payload")
      .eq("family_id", family.id)
      .order("week_start", { ascending: false })
      .limit(20),
  ]);
  if (studentsRes.error) throw studentsRes.error;

  return {
    family,
    students: (studentsRes.data ?? []) as FamilyStudent[],
    invite: inviteRes.data ?? null,
    reports: (reportsRes.data ?? []).map(toWeeklyReport),
  };
}

// Código de invitación legible: ABCDE-12345.
export function formatInviteCode(code: string) {
  return code.length === 10 ? `${code.slice(0, 5)}-${code.slice(5)}` : code;
}
