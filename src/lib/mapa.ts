import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { EvidenciaKind, RaStatus } from "@/lib/db-types";
import type { NivelDominio } from "@/lib/dominio";

// Mapa de Dominio GUARDADO (fase 7): progreso por RA de un alumno, con su última
// evidencia y el sello «Lo entiendo». Lectura con la sesión: la RLS decide quién lo
// ve (el alumno, su tutor, su familia con consentimiento, admin).

export interface MapaRa {
  id: string;
  code: string;
  description: string;
  weight: number | null;
  nivel: NivelDominio | null; // null = sin evaluar
  progress: number;
  sealed: boolean;
  evidencia: { kind: EvidenciaKind; at: string } | null;
}

export interface MapaModulo {
  modulo_id: string;
  code: string;
  name: string;
  exam_date: string | null;
  hours_week: number | null;
  ras: MapaRa[];
}

// Nivel → semáforo, para el plan inverso (casi y con ayuda = ámbar, mismas horas).
export const NIVEL_A_ESTADO: Record<NivelDominio, RaStatus> = {
  domino: "verde",
  casi: "ambar",
  con_ayuda: "ambar",
  aun_no: "rojo",
};

// Módulos del alumno con su Mapa. Una sola ida a BD por tabla.
export async function getMapaAlumno(studentId: string): Promise<MapaModulo[]> {
  const sb = await createClient();
  const { data: mods, error } = await sb
    .from("student_modulo")
    .select("modulo_id, exam_date, hours_week, created_at, modulo(code, name, ra(id, code, description, weight, sort_order))")
    .eq("student_id", studentId)
    .order("created_at");
  if (error) throw error;
  type Row = {
    modulo_id: string;
    exam_date: string | null;
    hours_week: number | null;
    modulo: {
      code: string;
      name: string;
      ra: { id: string; code: string; description: string; weight: number | null; sort_order: number }[];
    };
  };
  const rows = (mods ?? []) as unknown as Row[];
  const raIds = rows.flatMap((r) => r.modulo.ra.map((x) => x.id));
  if (!raIds.length)
    return rows.map((r) => ({ ...base(r), ras: [] }));

  const [prog, evid] = await Promise.all([
    sb
      .from("ra_progress")
      .select("ra_id, nivel, progress, sealed")
      .eq("student_id", studentId)
      .in("ra_id", raIds),
    sb
      .from("ra_evidence")
      .select("ra_id, kind, created_at")
      .eq("student_id", studentId)
      .in("ra_id", raIds)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);
  if (prog.error) throw prog.error;
  if (evid.error) throw evid.error;

  const progreso = new Map(
    (prog.data ?? []).map((p) => [p.ra_id as string, p as { nivel: NivelDominio; progress: number; sealed: boolean }]),
  );
  const ultima = new Map<string, { kind: EvidenciaKind; at: string }>();
  for (const e of evid.data ?? [])
    if (!ultima.has(e.ra_id)) ultima.set(e.ra_id, { kind: e.kind as EvidenciaKind, at: e.created_at });

  return rows.map((r) => ({
    ...base(r),
    ras: [...r.modulo.ra]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((ra) => {
        const p = progreso.get(ra.id);
        return {
          id: ra.id,
          code: ra.code,
          description: ra.description,
          weight: ra.weight,
          nivel: p?.nivel ?? null,
          progress: p?.progress ?? 0,
          sealed: p?.sealed ?? false,
          evidencia: ultima.get(ra.id) ?? null,
        };
      }),
  }));

  function base(r: Row) {
    return {
      modulo_id: r.modulo_id,
      code: r.modulo.code,
      name: r.modulo.name,
      exam_date: r.exam_date,
      hours_week: r.hours_week,
    };
  }
}

// Resumen del Mapa de un módulo: preparación media, sellos y RA prioritarios.
export function resumenMapa(m: MapaModulo) {
  const evaluados = m.ras.filter((r) => r.nivel);
  const preparacion = m.ras.length
    ? Math.round(m.ras.reduce((s, r) => s + r.progress, 0) / m.ras.length)
    : 0;
  const sellos = m.ras.filter((r) => r.sealed).length;
  // Prioridad: lo más flojo primero y, a igualdad, lo que más pesa en el examen.
  const orden: Record<NivelDominio, number> = { aun_no: 0, con_ayuda: 1, casi: 2, domino: 3 };
  const prioridad = evaluados
    .filter((r) => r.nivel !== "domino")
    .sort((a, b) => orden[a.nivel!] - orden[b.nivel!] || (b.weight ?? 0) - (a.weight ?? 0))
    .slice(0, 2);
  return { evaluados: evaluados.length, preparacion, sellos, prioridad };
}
