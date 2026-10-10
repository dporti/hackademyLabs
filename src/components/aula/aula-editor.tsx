"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const LENGUAJES = ["java", "python", "sql", "javascript", "html", "bash", "texto"] as const;
type Doc = { code: string; language: string; exam_mode: boolean; updated_by: string | null };

// Editor de código compartido del aula (fase 9). Guarda en `aula_doc` (RLS: solo las
// partes) con un pequeño retardo y recibe los cambios del otro por Supabase Realtime.
// Última escritura gana (1:1). En Modo Examen se bloquea pegar y soltar texto.
export function AulaEditor({ bookingId, userId, isMentor }: { bookingId: string; userId: string; isMentor: boolean }) {
  const t = useTranslations("aula");
  const sb = useMemo(() => createClient(), []);
  const [doc, setDoc] = useState<Doc>({ code: "", language: "java", exam_mode: false, updated_by: null });
  const [cargado, setCargado] = useState(false);
  const [estado, setEstado] = useState<"ok" | "guardando" | "error">("ok");
  const [aviso, setAviso] = useState<string | null>(null);
  const tecleando = useRef(0);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data } = await sb.from("aula_doc").select("code, language, exam_mode, updated_by").eq("booking_id", bookingId).maybeSingle();
      if (!vivo) return;
      if (data) setDoc(data as Doc);
      else await sb.from("aula_doc").insert({ booking_id: bookingId });
      setCargado(true);
    })();
    const canal = sb
      .channel(`aula-doc-${bookingId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "aula_doc", filter: `booking_id=eq.${bookingId}` },
        (payload) => {
          const nuevo = payload.new as Doc | undefined;
          if (!nuevo || !("code" in nuevo)) return;
          // Nuestro propio eco, o estamos escribiendo ahora mismo: solo el modo examen.
          if (nuevo.updated_by === userId || Date.now() - tecleando.current < 1200) {
            setDoc((d) => ({ ...d, exam_mode: nuevo.exam_mode }));
            return;
          }
          setDoc(nuevo);
        },
      )
      .subscribe();
    return () => {
      vivo = false;
      sb.removeChannel(canal);
    };
  }, [sb, bookingId, userId]);

  function guardar(patch: Partial<Doc>) {
    setEstado("guardando");
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(async () => {
      const { error } = await sb.from("aula_doc").update(patch).eq("booking_id", bookingId);
      setEstado(error ? "error" : "ok");
    }, 350);
  }

  async function cambiarExamen() {
    const exam_mode = !doc.exam_mode;
    setDoc((d) => ({ ...d, exam_mode }));
    const { error } = await sb.from("aula_doc").update({ exam_mode }).eq("booking_id", bookingId);
    if (error) setDoc((d) => ({ ...d, exam_mode: !exam_mode }));
  }

  const bloquear = (e: React.ClipboardEvent | React.DragEvent) => {
    if (!doc.exam_mode) return;
    e.preventDefault();
    setAviso(t("pasteBlocked"));
    setTimeout(() => setAviso(null), 3000);
  };
  const lineas = doc.code.split("\n").length;

  return (
    <section aria-labelledby="editor-t" className="flex flex-col rounded-2xl border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-divider px-4 py-2.5">
        <h2 id="editor-t" className="font-mono text-sm font-semibold">
          {t("editorTitle")}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {doc.exam_mode && (
            <span className="inline-flex items-center gap-1 rounded-md border border-tint-sos-border bg-tint-sos px-2 py-0.5 font-mono text-xs text-sos-text">
              <ShieldAlert aria-hidden className="size-3.5" />
              {t("examOn")}
            </span>
          )}
          <label className="sr-only" htmlFor={`lang-${bookingId}`}>
            {t("language")}
          </label>
          <select
            id={`lang-${bookingId}`}
            value={doc.language}
            onChange={(e) => {
              setDoc((d) => ({ ...d, language: e.target.value }));
              guardar({ language: e.target.value });
            }}
            className="h-9 rounded-[8px] border border-border bg-background px-2 font-mono text-xs [color-scheme:dark]"
          >
            {LENGUAJES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          {isMentor && (
            <button
              type="button"
              onClick={cambiarExamen}
              aria-pressed={doc.exam_mode}
              className={cn(
                "h-9 rounded-[8px] border px-3 text-xs font-semibold",
                doc.exam_mode ? "border-tint-sos-border text-sos-text" : "border-border hover:border-primary",
              )}
            >
              {doc.exam_mode ? t("examOff") : t("examStart")}
            </button>
          )}
        </div>
      </header>
      <div className="relative flex min-h-[320px] flex-1 font-mono text-sm">
        <pre aria-hidden className="select-none border-r border-divider px-3 py-3 text-right text-label">
          {Array.from({ length: lineas }, (_, i) => i + 1).join("\n")}
        </pre>
        <label className="sr-only" htmlFor={`code-${bookingId}`}>
          {t("editorTitle")}
        </label>
        <textarea
          id={`code-${bookingId}`}
          value={doc.code}
          disabled={!cargado}
          spellCheck={false}
          onChange={(e) => {
            tecleando.current = Date.now();
            setDoc((d) => ({ ...d, code: e.target.value }));
            guardar({ code: e.target.value });
          }}
          onKeyDown={(e) => {
            // Tab inserta dos espacios (Escape + Tab para salir del editor).
            if (e.key === "Tab" && !e.shiftKey && !e.altKey) {
              e.preventDefault();
              const el = e.currentTarget;
              const { selectionStart: s, selectionEnd: f } = el;
              const code = `${doc.code.slice(0, s)}  ${doc.code.slice(f)}`;
              tecleando.current = Date.now();
              setDoc((d) => ({ ...d, code }));
              guardar({ code });
              requestAnimationFrame(() => el.setSelectionRange(s + 2, s + 2));
            }
          }}
          onPaste={bloquear}
          onDrop={bloquear}
          className="min-h-[320px] flex-1 resize-y bg-background px-3 py-3 leading-[1.5] outline-none [tab-size:2] focus-visible:ring-2 focus-visible:ring-ring"
          style={{ lineHeight: "1.5" }}
        />
      </div>
      <footer className="flex items-center justify-between gap-2 border-t border-divider px-4 py-2 text-xs text-label" aria-live="polite">
        <span>{aviso ?? (doc.exam_mode ? t("examHelp") : t("editorHelp"))}</span>
        <span className={estado === "error" ? "text-sos-text" : undefined}>{t(`save.${estado}`)}</span>
      </footer>
    </section>
  );
}
