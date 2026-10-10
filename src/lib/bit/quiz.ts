import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { materialRelevante } from "@/lib/bit/contexto";
import type { NivelDominio } from "@/lib/dominio";

// Quiz relámpago de Bit (docs/capa-ia-v1.md §2): 3 preguntas de opción múltiple sobre
// un RA, generadas con Claude (salida estructurada) a partir del material revisado
// del módulo. Las respuestas correctas se guardan en BD y NUNCA viajan al cliente;
// el servidor corrige y deja la evidencia en el Mapa y el XP.

export const PREGUNTAS = 3;
export const APROBADO = 2; // aciertos para «superado» (XP)

export interface PreguntaQuiz {
  pregunta: string;
  opciones: string[]; // 4
  correcta: number; // índice (solo servidor)
  explicacion: string; // se muestra tras corregir
}

const SCHEMA = {
  type: "object",
  properties: {
    preguntas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          pregunta: { type: "string" },
          opciones: { type: "array", items: { type: "string" } },
          correcta: { type: "integer" },
          explicacion: { type: "string" },
        },
        required: ["pregunta", "opciones", "correcta", "explicacion"],
        additionalProperties: false,
      },
    },
  },
  required: ["preguntas"],
  additionalProperties: false,
} as const;

function valida(p: unknown): p is PreguntaQuiz {
  const x = p as PreguntaQuiz;
  return (
    !!x &&
    typeof x.pregunta === "string" &&
    x.pregunta.length > 3 &&
    Array.isArray(x.opciones) &&
    x.opciones.length === 4 &&
    x.opciones.every((o) => typeof o === "string" && o.trim()) &&
    Number.isInteger(x.correcta) &&
    x.correcta >= 0 &&
    x.correcta < 4 &&
    typeof x.explicacion === "string"
  );
}

export type QuizError = "noKey" | "raNotFound" | "notYours" | "busy" | "error";

// Crea un quiz para el alumno sobre un RA de uno de SUS módulos.
export async function crearQuiz(
  studentId: string,
  raId: string,
  locale: string,
): Promise<{ id: string; preguntas: { pregunta: string; opciones: string[] }[]; ra: string } | { error: QuizError }> {
  if (!process.env.ANTHROPIC_API_KEY) return { error: "noKey" };
  const admin = createAdminClient();
  const { data: ra } = await admin
    .from("ra")
    .select("id, code, description, modulo_id, modulo(code, name)")
    .eq("id", raId)
    .maybeSingle();
  if (!ra) return { error: "raNotFound" };
  const { data: suyo } = await admin
    .from("student_modulo")
    .select("modulo_id")
    .eq("student_id", studentId)
    .eq("modulo_id", ra.modulo_id)
    .maybeSingle();
  if (!suyo) return { error: "notYours" };
  const modulo = ra.modulo as unknown as { code: string; name: string };
  const material = await materialRelevante(ra.modulo_id, ra.description, [ra.id]);

  const idioma = locale === "ca" ? "catalán" : "castellano";
  const prompt = `Crea un quiz de ${PREGUNTAS} preguntas de opción múltiple (4 opciones, una sola correcta) para un alumno de FP de informática.
Módulo: ${modulo.code} ${modulo.name}. Resultado de aprendizaje ${ra.code}: ${ra.description}.
Reglas: preguntas de comprensión (no de memoria literal), cortas, con código breve si ayuda; distractores creíbles; "correcta" es el índice 0-3; "explicacion" en 1-2 frases dice por qué la correcta lo es. Escribe en ${idioma}.
${material.length ? `Básate en este material revisado por mentores:\n${material.map((m) => `<material titulo="${m.title.replace(/"/g, "'")}">\n${m.body.slice(0, 2000)}\n</material>`).join("\n")}` : "No hay material revisado: usa los contenidos habituales de este RA en el currículo oficial."}`;

  const client = new Anthropic();
  let preguntas: PreguntaQuiz[];
  try {
    const res = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4096,
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [{ role: "user", content: prompt }],
    });
    if (res.stop_reason === "refusal") return { error: "error" };
    const txt = res.content.find((c) => c.type === "text");
    const parsed = JSON.parse(txt && txt.type === "text" ? txt.text : "{}") as { preguntas?: unknown[] };
    preguntas = (parsed.preguntas ?? []).filter(valida).slice(0, PREGUNTAS) as PreguntaQuiz[];
  } catch (e) {
    console.error("[quiz]", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
    if (e instanceof Anthropic.RateLimitError) return { error: "busy" };
    if (e instanceof Anthropic.AuthenticationError) return { error: "noKey" };
    return { error: "error" };
  }
  if (preguntas.length < PREGUNTAS) return { error: "error" };

  const { data: q, error } = await admin
    .from("quiz")
    .insert({ student_id: studentId, ra_id: ra.id, questions: preguntas, total: preguntas.length })
    .select("id")
    .single();
  if (error) return { error: "error" };
  return {
    id: q.id as string,
    ra: ra.code,
    preguntas: preguntas.map(({ pregunta, opciones }) => ({ pregunta, opciones })),
  };
}

const ORDEN: NivelDominio[] = ["aun_no", "con_ayuda", "casi", "domino"];

// Corrige (una sola vez). Un quiz superado sube el RA como mucho hasta «Casi» y nunca
// lo baja: «Lo domino» lo dan el alumno o una persona (orientativo, no nota oficial).
export type ResultadoQuiz =
  | { error: "notFound" | "alreadyAnswered" }
  | { score: number; total: number; correccion: { correcta: number; elegida: number; explicacion: string }[] };

export async function corregirQuiz(studentId: string, quizId: string, respuestas: number[]): Promise<ResultadoQuiz> {
  const admin = createAdminClient();
  const { data: q } = await admin
    .from("quiz")
    .select("id, ra_id, questions, answered_at, total")
    .eq("id", quizId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (!q) return { error: "notFound" };
  const preguntas = q.questions as PreguntaQuiz[];
  if (q.answered_at) return { error: "alreadyAnswered" };
  const score = preguntas.reduce((s, p, i) => s + (respuestas[i] === p.correcta ? 1 : 0), 0);

  const { data: upd } = await admin
    .from("quiz")
    .update({ answers: respuestas, score, answered_at: new Date().toISOString() })
    .eq("id", quizId)
    .is("answered_at", null)
    .select("id");
  if (!upd?.length) return { error: "alreadyAnswered" };

  const { data: actual } = await admin
    .from("ra_progress")
    .select("nivel")
    .eq("student_id", studentId)
    .eq("ra_id", q.ra_id)
    .maybeSingle();
  const previo = (actual?.nivel as NivelDominio | undefined) ?? "aun_no";
  const sugerido: NivelDominio = score >= q.total ? "casi" : score >= APROBADO ? "con_ayuda" : "aun_no";
  const nivel = ORDEN.indexOf(sugerido) > ORDEN.indexOf(previo) ? sugerido : previo;
  await admin.rpc("apply_ra_evidence", {
    p_student: studentId,
    p_ra: q.ra_id,
    p_kind: "quiz",
    p_nivel: nivel,
    p_seal: null,
    p_note: `Quiz ${score}/${q.total}`,
    p_author: null,
    p_booking: null,
  });
  if (score >= APROBADO) await admin.rpc("grant_xp", { p_student: studentId, p_kind: "quiz", p_points: 20, p_ref: quizId });

  return {
    score,
    total: q.total as number,
    correccion: preguntas.map((p, i) => ({ correcta: p.correcta, elegida: respuestas[i] ?? -1, explicacion: p.explicacion })),
  };
}
