"use server";

import Anthropic from "@anthropic-ai/sdk";
import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { permitirMensaje } from "@/lib/bit/rate-limit";

// Resumen de la sesión con Bit (fase 9, docs/capa-ia-v1.md §3 «resumen post-sesión»).
// Lo pide el MENTOR de la reserva con sus notas; Bit lo redacta con el código del aula
// y lo valorado en el Mapa en esa sesión. Sin grabación: solo lo que el mentor escribe.
// Lo ve el alumno (y su familia/tutor no: queda en la reserva).

export interface AulaState {
  error?: string;
  ok?: string;
  summary?: string;
}

const MAX_NOTAS = 3000;

export async function summarizeSessionAction(_prev: AulaState, formData: FormData): Promise<AulaState> {
  const bookingId = String(formData.get("booking") ?? "");
  const notas = String(formData.get("notes") ?? "").trim().slice(0, MAX_NOTAS);
  const locale = String(formData.get("locale") ?? "es");
  if (notas.length < 10) return { error: "notesShort" };

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: "needLogin" };
  const { data: b } = await sb
    .from("booking")
    .select("id, mentor_id, student_id, status, modulo(code, name)")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b || b.mentor_id !== user.id || (b.status !== "confirmada" && b.status !== "hecha")) return { error: "notAllowed" };
  if (!process.env.ANTHROPIC_API_KEY) return { error: "noKey" };
  if (!permitirMensaje(`resumen:${user.id}`, 20)) return { error: "rateLimited" };

  const admin = createAdminClient();
  const [{ data: doc }, { data: evid }] = await Promise.all([
    admin.from("aula_doc").select("code, language").eq("booking_id", bookingId).maybeSingle(),
    admin.from("ra_evidence").select("nivel, sealed, note, ra(code, description)").eq("booking_id", bookingId),
  ]);
  const modulo = b.modulo as unknown as { code: string; name: string } | null;
  const ras = ((evid ?? []) as unknown as { nivel: string; sealed: boolean; note: string | null; ra: { code: string; description: string } }[])
    .map((e) => `${e.ra.code} (${e.ra.description.slice(0, 80)}): ${e.nivel}${e.sealed ? ", sello «Lo entiendo»" : ""}${e.note ? ` — ${e.note}` : ""}`)
    .join("\n");

  const idioma = locale === "ca" ? "catalán" : "castellano";
  const prompt = `Redacta el resumen de una sesión de mentoría de FP de informática para el ALUMNO, en ${idioma}, en segunda persona y con tono cercano.
Formato: tres apartados cortos con estos títulos exactos en negrita markdown: «Qué hemos visto», «Tus tareas», «Próximo paso». Máximo 150 palabras en total. Sin inventar nada que no esté en los datos. No incluyas soluciones completas de prácticas evaluables.

Módulo: ${modulo ? `${modulo.code} ${modulo.name}` : "no indicado"}
<notas_del_mentor>
${notas}
</notas_del_mentor>
<valoraciones_del_mapa_en_esta_sesion>
${ras || "(ninguna)"}
</valoraciones_del_mapa_en_esta_sesion>
<codigo_del_aula lenguaje="${doc?.language ?? "texto"}">
${(doc?.code ?? "").slice(0, 4000) || "(vacío)"}
</codigo_del_aula>`;

  let resumen = "";
  try {
    const res = await new Anthropic().beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 2048,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [{ role: "user", content: prompt }],
    });
    if (res.stop_reason === "refusal") return { error: "generic" };
    resumen = res.content.map((c) => (c.type === "text" ? c.text : "")).join("").trim();
  } catch (e) {
    console.error("[resumen]", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
    return { error: e instanceof Anthropic.RateLimitError ? "busy" : "generic" };
  }
  if (!resumen) return { error: "generic" };

  await admin.from("booking").update({ summary: resumen.slice(0, 4000), summary_at: new Date().toISOString() }).eq("id", bookingId);
  refresh();
  return { ok: "summarySaved", summary: resumen };
}
