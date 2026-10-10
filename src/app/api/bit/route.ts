import Anthropic from "@anthropic-ai/sdk";
import { BIT_SYSTEM } from "@/lib/bit/prompt";
import { permitirMensaje } from "@/lib/bit/rate-limit";
import { bloqueContexto, contextoAlumno, materialRelevante } from "@/lib/bit/contexto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Bit, el asistente con IA (Claude). Dos modos:
//  · Widget público (body.messages): sin cuenta, historial del navegador, límite por IP.
//  · Panel del alumno (body.message + conversation_id): con sesión de alumno; la
//    conversación se guarda en BD (conversation/message) y Bit recibe el contexto del
//    alumno (Mapa, examen, sesiones) y material revisado del módulo (RAG).
// La clave ANTHROPIC_API_KEY vive solo en el servidor, nunca en el cliente.

const MAX_TURNOS = 12; // últimos mensajes que se envían al modelo
const MAX_CHARS = 2000; // por mensaje
const MAX_PANEL_HORA = 60; // mensajes por alumno y hora

type Entrada = { role: "user" | "assistant"; content: string };

function validar(body: unknown): Entrada[] | null {
  const msgs = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(msgs) || msgs.length === 0) return null;
  const limpios: Entrada[] = [];
  for (const m of msgs.slice(-MAX_TURNOS)) {
    const role = (m as Entrada)?.role;
    const content = (m as Entrada)?.content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    const texto = content.trim().slice(0, MAX_CHARS);
    if (texto) limpios.push({ role, content: texto });
  }
  return normalizar(limpios);
}

// La conversación debe empezar por el usuario, alternar y terminar con su pregunta.
function normalizar(msgs: Entrada[]): Entrada[] | null {
  const out: Entrada[] = [];
  for (const m of msgs) {
    if (!out.length && m.role !== "user") continue;
    const prev = out[out.length - 1];
    if (prev && prev.role === m.role) prev.content += `\n\n${m.content}`;
    else out.push({ ...m });
  }
  if (!out.length || out[out.length - 1].role !== "user") return null;
  return out;
}

const texto = (s: string, status = 200) =>
  new Response(s, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return texto("noKey", 503);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return texto("badRequest", 400);
  }
  const b = body as { message?: unknown; conversation_id?: unknown; modulo?: unknown };
  if (typeof b.message === "string") return panel(b);

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  if (!permitirMensaje(ip)) return texto("rateLimited", 429);
  const messages = validar(body);
  if (!messages) return texto("badRequest", 400);
  return responder([{ type: "text", text: BIT_SYSTEM, cache_control: { type: "ephemeral" } }], messages);
}

// ───────────────────────────── Modo panel ─────────────────────────────
async function panel(b: { message?: unknown; conversation_id?: unknown; modulo?: unknown }) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return texto("needLogin", 401);
  const { data: sp } = await sb.from("student_profile").select("profile_id").eq("profile_id", user.id).maybeSingle();
  if (!sp) return texto("notStudent", 403);
  if (!permitirMensaje(`u:${user.id}`, MAX_PANEL_HORA)) return texto("rateLimited", 429);
  await sb.rpc("touch_activity");

  const pregunta = String(b.message).trim().slice(0, MAX_CHARS);
  if (!pregunta) return texto("badRequest", 400);
  const admin = createAdminClient();

  // Conversación: la indicada (si es del alumno) o una nueva.
  let convId = typeof b.conversation_id === "string" ? b.conversation_id : null;
  if (convId) {
    const { data: c } = await admin.from("conversation").select("id").eq("id", convId).eq("student_id", user.id).maybeSingle();
    if (!c) convId = null;
  }
  const moduloCode = typeof b.modulo === "string" ? b.modulo : null;
  const ctx = await contextoAlumno(user.id, moduloCode);
  if (!convId) {
    const { data: nueva, error } = await admin
      .from("conversation")
      .insert({ student_id: user.id, channel: "web", modulo_id: ctx.moduloId, title: pregunta.slice(0, 80) })
      .select("id")
      .single();
    if (error) return texto("error", 500);
    convId = nueva.id as string;
  }

  const { data: previos } = await admin
    .from("message")
    .select("sender, body")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: false })
    .limit(MAX_TURNOS - 1);
  await admin.from("message").insert({ conversation_id: convId, sender: "alumno", body: pregunta });
  const historial = normalizar([
    ...(previos ?? [])
      .reverse()
      .filter((m) => m.body && (m.sender === "alumno" || m.sender === "bit"))
      .map((m) => ({ role: m.sender === "alumno" ? ("user" as const) : ("assistant" as const), content: String(m.body) })),
    { role: "user", content: pregunta },
  ]);
  if (!historial) return texto("badRequest", 400);

  const material = await materialRelevante(ctx.moduloId, pregunta, ctx.rasFlojos);
  // Bloque estable (cacheado) primero; el contexto del alumno va después del breakpoint.
  const system: Anthropic.Beta.BetaTextBlockParam[] = [
    { type: "text", text: BIT_SYSTEM, cache_control: { type: "ephemeral" } },
    { type: "text", text: bloqueContexto(ctx, material) },
  ];
  const id = convId;
  return responder(system, historial, {
    headers: { "X-Conversation-Id": id },
    alTerminar: async (respuesta) => {
      if (respuesta.trim())
        await admin.from("message").insert({ conversation_id: id, sender: "bit", body: respuesta });
      await admin.from("conversation").update({ updated_at: new Date().toISOString() }).eq("id", id);
    },
  });
}

// ───────────────────────────── Streaming ─────────────────────────────
function responder(
  system: Anthropic.Beta.BetaTextBlockParam[],
  messages: Entrada[],
  opts: { headers?: Record<string, string>; alTerminar?: (respuesta: string) => Promise<void> } = {},
) {
  const client = new Anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let acumulado = "";
      try {
        const respuesta = client.beta.messages.stream({
          model: "claude-opus-5-5",
          max_tokens: 4096,
          // Chat: respuestas rápidas y cortas. Fallbacks por si el modelo declina.
          output_config: { effort: "low" },
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          system,
          messages,
        });
        for await (const event of respuesta) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            acumulado += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await respuesta.finalMessage();
        // Toda la cadena (modelo + fallback) declinó: el widget muestra un aviso.
        if (final.stop_reason === "refusal") controller.enqueue(encoder.encode("\u0000refusal"));
      } catch (error) {
        const codigo =
          error instanceof Anthropic.RateLimitError
            ? "busy"
            : error instanceof Anthropic.AuthenticationError
              ? "noKey"
              : "error";
        console.error("[bit]", error instanceof Anthropic.APIError ? `${error.status} ${error.message}` : error);
        controller.enqueue(encoder.encode(`\u0000${codigo}`));
      } finally {
        try {
          await opts.alTerminar?.(acumulado);
        } catch (e) {
          console.error("[bit] guardar", e);
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", ...opts.headers },
  });
}
