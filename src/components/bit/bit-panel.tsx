"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Mensaje = { role: "user" | "assistant"; content: string };
const SEPARADOR = "\u0000";

// Chat con Bit dentro del panel del alumno (fase 8, maqueta Bit.html). La conversación
// la guarda el servidor; aquí solo se pinta y se envía la nueva pregunta.
export function BitPanelChat({
  conversationId,
  inicial,
  modulo,
  sugerencias,
}: {
  conversationId: string | null;
  inicial: Mensaje[];
  modulo: string | null;
  sugerencias: string[];
}) {
  const t = useTranslations("bit");
  const tp = useTranslations("bitPanel");
  const router = useRouter();
  const [mensajes, setMensajes] = useState<Mensaje[]>(inicial);
  const [conv, setConv] = useState(conversationId);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const lista = useRef<HTMLDivElement>(null);
  const id = useId();

  // Al cambiar de conversación (enlace de la izquierda) se recarga el historial.
  const [prev, setPrev] = useState(conversationId);
  if (prev !== conversationId) {
    setPrev(conversationId);
    setConv(conversationId);
    setMensajes(inicial);
    setAviso(null);
  }
  useEffect(() => {
    lista.current?.scrollTo({ top: lista.current.scrollHeight });
  }, [mensajes]);

  async function enviar(contenido: string) {
    const pregunta = contenido.trim();
    if (!pregunta || enviando) return;
    const historial: Mensaje[] = [...mensajes, { role: "user", content: pregunta }];
    setMensajes([...historial, { role: "assistant", content: "" }]);
    setTexto("");
    setAviso(null);
    setEnviando(true);
    let nueva: string | null = null;
    try {
      const res = await fetch("/api/bit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: pregunta, conversation_id: conv, modulo }),
      });
      if (!res.ok || !res.body) throw new Error((await res.text().catch(() => "")) || "error");
      nueva = res.headers.get("X-Conversation-Id");
      if (nueva) setConv(nueva);
      const lector = res.body.getReader();
      const decoder = new TextDecoder();
      let acumulado = "";
      for (;;) {
        const { done, value } = await lector.read();
        if (done) break;
        acumulado += decoder.decode(value, { stream: true });
        setMensajes([...historial, { role: "assistant", content: acumulado.split(SEPARADOR)[0] }]);
      }
      const [respuesta, codigo] = acumulado.split(SEPARADOR);
      if (codigo) setAviso(t(`errors.${codigo}` as "errors.error"));
      if (!respuesta.trim()) setMensajes(historial);
    } catch (e) {
      const codigo = e instanceof Error ? e.message : "error";
      const conocido = ["noKey", "rateLimited", "badRequest", "busy", "refusal"].includes(codigo);
      setAviso(t(`errors.${conocido ? codigo : "error"}` as "errors.error"));
      setMensajes(historial);
    } finally {
      setEnviando(false);
      // Conversación nueva: a su URL (aparece en la lista de la izquierda).
      if (nueva && nueva !== conversationId) router.replace(`/panel/bit?c=${nueva}`, { scroll: false });
    }
  }

  return (
    <div className="flex min-h-[520px] flex-col rounded-3xl border bg-card">
      <div ref={lista} aria-live="polite" className="max-h-[60vh] flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
        {mensajes.length === 0 && (
          <div className="space-y-3">
            <p className="rounded-2xl rounded-tl-sm border border-border bg-surface-2 p-3 text-sm">{tp("welcome")}</p>
            <div className="flex flex-wrap gap-2">
              {sugerencias.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => enviar(s)}
                  className="min-h-10 rounded-[10px] border border-border px-3 text-left text-sm text-muted-foreground hover:border-primary/60 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {mensajes.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className="max-w-[88%]">
              {m.role === "assistant" && (
                <p className="mb-1 font-mono text-[10px] tracking-[0.2em] text-label uppercase">{tp("bitLabel")}</p>
              )}
              <p
                className={cn(
                  "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                  m.role === "user"
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-tl-sm border border-border bg-surface-2",
                )}
              >
                {m.content || (enviando && i === mensajes.length - 1 ? t("thinking") : "")}
              </p>
            </div>
          </div>
        ))}
        {aviso && <p className="rounded-xl border border-tint-warning-border bg-tint-warning p-3 text-sm text-warning">{aviso}</p>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
        className="border-t border-divider p-3"
      >
        <div className="flex items-end gap-2">
          <label htmlFor={`${id}-q`} className="sr-only">
            {tp("placeholder")}
          </label>
          <textarea
            id={`${id}-q`}
            rows={2}
            maxLength={2000}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviar(texto);
              }
            }}
            placeholder={tp("placeholder")}
            className="max-h-40 min-h-11 flex-1 resize-y rounded-[10px] border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            disabled={enviando || !texto.trim()}
            aria-label={t("send")}
            className="grid size-11 shrink-0 place-items-center rounded-[10px] bg-primary text-primary-foreground hover:bg-primary/85 disabled:opacity-50"
          >
            <Send aria-hidden className="size-5" />
          </button>
        </div>
        <p className="mt-2 text-[11px] text-label">{t("disclaimer")}</p>
      </form>
    </div>
  );
}
