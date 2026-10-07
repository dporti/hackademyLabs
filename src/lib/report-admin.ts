import "server-only";
import { createClient } from "@/lib/supabase/server";

// Alumnos sobre los que se puede redactar informe (vinculados a una familia), con
// sus módulos para el formulario. Lectura con la sesión del admin (RLS sp_admin).
export interface ReportableStudent {
  id: string;
  name: string;
  modulos: { code: string; name: string }[];
}

export async function getReportableStudents(): Promise<ReportableStudent[]> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("student_profile")
    .select("profile_id, profile(full_name, email), student_modulo(modulo(code, name))")
    .not("family_id", "is", null);
  if (error) throw error;
  type Row = {
    profile_id: string;
    profile: { full_name: string | null; email: string | null } | null;
    student_modulo: { modulo: { code: string; name: string } }[];
  };
  return ((data ?? []) as unknown as Row[])
    .map((r) => ({
      id: r.profile_id,
      name: r.profile?.full_name || r.profile?.email || r.profile_id,
      modulos: r.student_modulo.map((sm) => sm.modulo).sort((a, b) => a.code.localeCompare(b.code)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
