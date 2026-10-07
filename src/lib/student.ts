import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  CreditLedgerEntry,
  Modulo,
  Pack,
  StudentModulo,
} from "@/lib/db-types";

// Capa de datos del panel del alumno. Todo se lee con el cliente SSR (sesión del
// alumno): la RLS garantiza que solo ve SUS movimientos y SUS módulos.

export type LedgerEntryConPack = CreditLedgerEntry & {
  pack: Pick<Pack, "name"> | null;
};

export type StudentModuloConModulo = StudentModulo & {
  modulo: Pick<Modulo, "id" | "code" | "name" | "killer">;
};

export interface StudentDashboard {
  // false si el alumno aún no ha hecho onboarding (no existe student_profile).
  hasProfile: boolean;
  balance: number;
  ledger: LedgerEntryConPack[];
  modulos: StudentModuloConModulo[];
  family: StudentFamily;
}

// Vínculo con la familia visto por el alumno.
export interface StudentFamily {
  linked: boolean;
  name: string | null;
  shared: boolean;
  // Menor de edad: la familia ve sus datos sin consentimiento (regla de negocio).
  // Sin fecha de nacimiento se trata como mayor (se pide consentimiento).
  isMinor: boolean;
}

// Misma regla que la BD: nacido hace menos de 18 años.
function esMenor(birthdate: string | null) {
  if (!birthdate) return false;
  const limite = new Date();
  limite.setUTCFullYear(limite.getUTCFullYear() - 18);
  return new Date(birthdate) > limite;
}

const LEDGER_LIMIT = 50;

export async function getStudentDashboard(
  studentId: string,
): Promise<StudentDashboard> {
  const sb = await createClient();

  const [profileRes, balanceRes, ledgerRes, modulosRes] = await Promise.all([
    sb
      .from("student_profile")
      .select("profile_id, family_id, consent_share_family, birthdate")
      .eq("profile_id", studentId)
      .maybeSingle(),
    // Saldo CALCULADO en BD (suma del ledger), nunca un campo guardado.
    sb.rpc("my_credit_balance"),
    sb
      .from("credit_ledger")
      .select("*, pack(name)")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(LEDGER_LIMIT),
    sb
      .from("student_modulo")
      .select("*, modulo(id, code, name, killer)")
      .eq("student_id", studentId)
      .order("created_at"),
  ]);

  if (balanceRes.error) throw balanceRes.error;
  if (ledgerRes.error) throw ledgerRes.error;
  if (modulosRes.error) throw modulosRes.error;

  const sp = profileRes.data;
  // El alumno no puede leer la tabla family (es del dueño): nombre vía RPC.
  const familyName = sp?.family_id
    ? (((await sb.rpc("my_linked_family")).data as string | null) ?? null)
    : null;

  return {
    hasProfile: !!sp,
    family: {
      linked: !!sp?.family_id,
      name: familyName,
      shared: !!sp?.consent_share_family,
      isMinor: esMenor(sp?.birthdate ?? null),
    },
    balance: (balanceRes.data as number | null) ?? 0,
    ledger: (ledgerRes.data ?? []) as unknown as LedgerEntryConPack[],
    modulos: (modulosRes.data ?? []) as unknown as StudentModuloConModulo[],
  };
}
