import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getMapaAlumno } from "@/lib/mapa";
import { addDays, mondayOf } from "@/lib/report";

// Logros del alumno (fase 8, maqueta Logros.html). «Puntos por demostrar que sabes, no
// por horas conectado»: el XP sale de xp_event (inmutable, lo escriben triggers de BD).
// Nivel, racha semanal e insignias se calculan aquí a partir de datos reales.

export type XpKind = "autoevaluacion" | "sello" | "dominio" | "quiz" | "sesion";

// XP acumulado para llegar al nivel n: 0, 100, 300, 600, 1000… (50·n·(n−1)).
const umbral = (n: number) => 50 * n * (n - 1);
export const NIVEL_MAX = 10;

export function nivelDesdeXp(xp: number) {
  let n = 1;
  while (n < NIVEL_MAX && xp >= umbral(n + 1)) n++;
  return { nivel: n, desde: umbral(n), hasta: n < NIVEL_MAX ? umbral(n + 1) : null };
}

// Una semana cuenta para la racha con ≥ 2 días de estudio (semanal, no diaria: sin agobios).
export const DIAS_SEMANA_RACHA = 2;
const SEMANAS = 8;

export type BadgeSlug =
  | "primer_mapa"
  | "primer_quiz"
  | "quiz_x5"
  | "primer_sello"
  | "feynman"
  | "constancia"
  | "primera_sesion"
  | "modulo_dominado";

export interface Logros {
  xp: number;
  nivel: ReturnType<typeof nivelDesdeXp>;
  racha: number; // semanas seguidas
  semanas: { inicio: string; dias: number }[]; // últimas 8, la última es la actual
  sellos: number;
  quizzes: number; // superados
  sesiones: number;
  badges: { slug: BadgeSlug; unlocked: boolean; detail?: string }[];
  recientes: { kind: XpKind; points: number; at: string }[];
}

export async function getLogros(studentId: string, hoy: string): Promise<Logros> {
  const sb = await createClient();
  const lunes = mondayOf(hoy);
  const desde = addDays(lunes, -7 * (SEMANAS - 1));
  const [xpRes, actRes, mapa] = await Promise.all([
    sb.from("xp_event").select("kind, points, created_at").eq("student_id", studentId).order("created_at", { ascending: false }),
    sb.from("student_activity").select("day").eq("student_id", studentId).gte("day", addDays(desde, -7 * 52)),
    getMapaAlumno(studentId),
  ]);
  if (xpRes.error) throw xpRes.error;
  if (actRes.error) throw actRes.error;
  const eventos = (xpRes.data ?? []) as { kind: XpKind; points: number; created_at: string }[];
  const xp = eventos.reduce((s, e) => s + e.points, 0);
  const cuenta = (k: XpKind) => eventos.filter((e) => e.kind === k).length;

  // Días activos por semana (lunes → nº de días).
  const porSemana = new Map<string, number>();
  for (const { day } of actRes.data ?? []) {
    const k = mondayOf(day as string);
    porSemana.set(k, (porSemana.get(k) ?? 0) + 1);
  }
  const semanas = Array.from({ length: SEMANAS }, (_, i) => {
    const inicio = addDays(desde, 7 * i);
    return { inicio, dias: porSemana.get(inicio) ?? 0 };
  });
  // Racha: semanas seguidas que cumplen, hacia atrás. La actual cuenta si ya cumple;
  // si aún no, no rompe la racha (la semana no ha terminado).
  let racha = 0;
  let w = (porSemana.get(lunes) ?? 0) >= DIAS_SEMANA_RACHA ? lunes : addDays(lunes, -7);
  while ((porSemana.get(w) ?? 0) >= DIAS_SEMANA_RACHA) {
    racha++;
    w = addDays(w, -7);
  }

  const sellos = cuenta("sello");
  const quizzes = cuenta("quiz");
  const sesiones = cuenta("sesion");
  const dominado = mapa.find((m) => m.ras.length > 0 && m.ras.every((r) => r.nivel === "domino"));

  return {
    xp,
    nivel: nivelDesdeXp(xp),
    racha,
    semanas,
    sellos,
    quizzes,
    sesiones,
    badges: [
      { slug: "primer_mapa", unlocked: cuenta("autoevaluacion") > 0 },
      { slug: "primer_quiz", unlocked: quizzes >= 1 },
      { slug: "quiz_x5", unlocked: quizzes >= 5, detail: `${Math.min(quizzes, 5)}/5` },
      { slug: "primer_sello", unlocked: sellos >= 1 },
      { slug: "feynman", unlocked: sellos >= 3, detail: `${Math.min(sellos, 3)}/3` },
      { slug: "constancia", unlocked: racha >= 4, detail: `${Math.min(racha, 4)}/4` },
      { slug: "primera_sesion", unlocked: sesiones >= 1 },
      { slug: "modulo_dominado", unlocked: !!dominado, detail: dominado?.code },
    ],
    recientes: eventos.slice(0, 8).map((e) => ({ kind: e.kind, points: e.points, at: e.created_at })),
  };
}
