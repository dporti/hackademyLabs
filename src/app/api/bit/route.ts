import Anthropic from "@anthropic-ai/sdk";
import { BIT_SYSTEM } from "@/lib/bit/prompt";
import { permitirMensaje } from "@/lib/bit/rate-limit";

// Bit, el asistente con IA (Claude). Recibe la conversación del widget y devuelve la
// respuesta en streaming como texto plano. Sin cuenta: limitado por IP. La clave
// ANTHROPIC_API_KEY vive solo en el servidor (.env.local / Vercel), nunca en el cliente.

const MAX_TURNOS = 12; // últimos mensajes que se envían al modelo
const MAX_CHARS = 2000; // por mensaje

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
  // La conversación debe empezar por el usuario y terminar con su pregunta.
  while (limpios.length && limpios[0].role !== "user") limpios.shift();
  if (!limpios.length || limpios[limpios.length - 1].role !== "user") return null;
  return limpios;
}

const texto = (s: string, status = 200) =>
  new Response(s, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return texto("noKey", 503);

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  if (!permitirMensaje(ip)) return texto("rateLimited", 429);

  let messages: Entrada[] | null = null;
  try {
    messages = validar(await req.json());
  } catch {
    messages = null;
  }
  if (!messages) return texto("badRequest", 400);

  const client = new Anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const respuesta = client.beta.messages.stream({
          model: "claude-opus-5-5",
          max_tokens: 4096,
          // Chat: respuestas rápidas y cortas. Fallbacks por si el modelo declina.
          output_config: { effort: "low" },
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          system: [{ type: "text", text: BIT_SYSTEM, cache_control: { type: "ephemeral" } }],
          messages,
        });
        for await (const event of respuesta) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
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
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
