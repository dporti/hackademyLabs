"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Bot, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Mensaje = { role: "user" | "assistant"; content: string };

const CLAVE = "bit-chat-v1";
// La ruta devuelve texto en streaming; un código de error llega al final tras \u0000.
const SEPARADOR = "\u0000";

// Bit flotante: botón abajo a la derecha que abre un chat con el asistente IA.
// La conversación se guarda en sessionStorage (solo en este navegador y pestaña).
export function BitChat() {
  const t = useTranslations("bit");
  const [abierto, setAbierto] = useState(false);
  // Conversación de la pestaña (el chat empieza cerrado, así que no afecta a la hidratación).
  const [mensajes, setMensajes] = useState<Mensaje[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(sessionStorage.getItem(CLAVE) ?? "[]") as Mensaje[];
    } catch {
      return [];
    }
  });
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const lista = useRef<HTMLDivElement>(null);
  const entrada = useRef<HTMLTextAreaElement>(null);
  const id = useId();

  useEffect(() => {
    try {
      sessionStorage.setItem(CLAVE, JSON.stringify(mensajes.slice(-20)));
    } catch {
      /* sin almacenamiento */
    }
    lista.current?.scrollTo({ top: lista.current.scrollHeight });
  }, [mensajes]);
  useEffect(() => {
    if (!abierto) return;
    entrada.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto]);

  async function enviar(contenido: string) {
    const pregunta = contenido.trim();
    if (!pregunta || enviando) return;
    const historial: Mensaje[] = [...mensajes, { role: "user", content: pregunta }];
    setMensajes([...historial, { role: "assistant", content: "" }]);
    setTexto("");
    setAviso(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/bit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historial }),
      });
      if (!res.ok || !res.body) {
        const codigo = (await res.text().catch(() => "")) || "error";
        throw new Error(codigo);
      }
      const lector = res.body.getReader();
      const decoder = new TextDecoder();
      let acumulado = "";
      for (;;) {
        const { done, value } = await lector.read();
        if (done) break;
        acumulado += decoder.decode(value, { stream: true });
        const [respuesta] = acumulado.split(SEPARADOR);
        setMensajes([...historial, { role: "assistant", content: respuesta }]);
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
    }
  }

  const sugerencias = ["s1", "s2", "s3"] as const;

  return (
    <>
      {!abierto && (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-haspopup="dialog"
          className="glow fixed right-4 bottom-4 z-40 inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-5 font-bold text-primary-foreground shadow-lg transition-colors hover:bg-primary/85 sm:right-6 sm:bottom-6"
        >
          <Bot aria-hidden className="size-5" />
          {t("open")}
        </button>
      )}

      {abierto && (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby={`${id}-t`}
          className="fixed inset-x-2 bottom-2 z-40 flex max-h-[min(640px,calc(100dvh-1rem))] flex-col overflow-hidden rounded-3xl border border-tint-primary-border bg-card shadow-2xl sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[400px]"
        >
          <header className="flex items-center justify-between gap-3 border-b border-divider px-4 py-3">
            <span className="flex items-center gap-3">
              <span
                aria-hidden
                className="grid size-9 place-items-center rounded-[10px] bg-primary font-mono font-bold text-primary-foreground"
              >
                B
              </span>
              <span>
                <span id={`${id}-t`} className="block font-semibold">
                  {t("title")}
                </span>
                <span className="block text-xs text-label">{t("subtitle")}</span>
              </span>
            </span>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label={t("close")}
              className="grid size-10 place-items-center rounded-[10px] text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            >
              <X aria-hidden className="size-5" />
            </button>
          </header>

          <div ref={lista} aria-live="polite" className="flex-1 space-y-3 overflow-y-auto p-4">
            {mensajes.length === 0 && (
              <div className="space-y-3">
                <p className="rounded-2xl rounded-tl-sm border border-border bg-surface-2 p-3 text-sm">{t("welcome")}</p>
                <div className="flex flex-wrap gap-2">
                  {sugerencias.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => enviar(t(`suggestions.${s}`))}
                      className="min-h-10 rounded-[10px] border border-border px-3 text-left text-sm text-muted-foreground hover:border-primary/60 hover:text-foreground"
                    >
                      {t(`suggestions.${s}`)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {mensajes.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <p
                  className={cn(
                    "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                    m.role === "user"
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-tl-sm border border-border bg-surface-2",
                  )}
                >
                  {m.content || (enviando && i === mensajes.length - 1 ? t("thinking") : "")}
                </p>
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
                {t("placeholder")}
              </label>
              <textarea
                id={`${id}-q`}
                ref={entrada}
                rows={1}
                maxLength={2000}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    enviar(texto);
                  }
                }}
                placeholder={t("placeholder")}
                className="max-h-32 min-h-11 flex-1 resize-none rounded-[10px] border border-border bg-background px-3 py-2.5 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
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
      )}
    </>
  );
}
