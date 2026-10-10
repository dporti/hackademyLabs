"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { corregirQuiz, crearQuiz, type ResultadoQuiz } from "@/lib/bit/quiz";
import { permitirMensaje } from "@/lib/bit/rate-limit";

// Acciones de Bit en el panel del alumno (fase 8): quiz relámpago por RA.
// Se autentica con la sesión; la generación y la corrección van con service role
// (las respuestas correctas nunca salen del servidor).

async function alumno() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data: sp } = await sb.from("student_profile").select("profile_id").eq("profile_id", user.id).maybeSingle();
  return sp ? user.id : null;
}

export async function startQuizAction(raId: string, locale: string) {
  const id = await alumno();
  if (!id) return { error: "needLogin" as const };
  // Cada quiz es una llamada al modelo: freno de 10 por hora y alumno.
  if (!permitirMensaje(`quiz:${id}`, 10)) return { error: "rateLimited" as const };
  return crearQuiz(id, raId, locale === "ca" ? "ca" : "es");
}

export async function answerQuizAction(
  quizId: string,
  respuestas: number[],
): Promise<ResultadoQuiz | { error: "needLogin" }> {
  const id = await alumno();
  if (!id) return { error: "needLogin" };
  const limpias = Array.isArray(respuestas) ? respuestas.slice(0, 10).map((r) => (Number.isInteger(r) ? r : -1)) : [];
  const res = await corregirQuiz(id, quizId, limpias);
  refresh();
  return res;
}
