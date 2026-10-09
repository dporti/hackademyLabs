// Conversación de ejemplo con Bit (la IA). Enseña las reglas de oro de
// docs/capa-ia-v1.md §6: se presenta como IA, no hace prácticas (reconduce a
// aprender con preguntas) y escala a una persona (tutor o mentor) cuando hace falta.
// Estática: es un ejemplo, no un chat real.

export interface BitMensaje {
  de: "alumno" | "bit" | "tutor" | "sistema";
  texto: string;
  // Etiqueta corta sobre la burbuja (p. ej. «BIT · IA», «TU TUTOR»).
  autor?: string;
}

const BURBUJA: Record<Exclude<BitMensaje["de"], "sistema">, string> = {
  alumno: "rounded-br-sm bg-primary text-primary-foreground",
  // Neutra: en la zona Tutor247 el primario es magenta y se confundiría con el tutor.
  bit: "rounded-bl-sm border border-border bg-surface-2",
  tutor: "rounded-bl-sm border border-tint-secondary-border bg-tint-secondary",
};
const AUTOR: Record<Exclude<BitMensaje["de"], "sistema">, string> = {
  alumno: "text-primary-foreground/70",
  bit: "text-primary",
  tutor: "text-secondary-text",
};

export function BitChatDemo({
  titulo,
  subtitulo,
  ejemplo,
  mensajes,
  pie,
}: {
  titulo: string;
  subtitulo: string;
  ejemplo: string;
  mensajes: BitMensaje[];
  pie?: string;
}) {
  return (
    <figure className="rounded-3xl border bg-card" aria-label={titulo}>
      <figcaption className="flex items-center justify-between gap-3 border-b border-divider px-5 py-3.5">
        <span className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid size-9 place-items-center rounded-[10px] bg-primary font-mono text-sm font-bold text-primary-foreground"
          >
            B
          </span>
          <span>
            <span className="block text-sm font-semibold">{titulo}</span>
            <span className="block text-xs text-muted-foreground">{subtitulo}</span>
          </span>
        </span>
        <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-muted-foreground">{ejemplo}</span>
      </figcaption>
      <ol className="space-y-3 p-5">
        {mensajes.map((m, i) =>
          m.de === "sistema" ? (
            <li
              key={i}
              className="mx-auto w-fit rounded-md border border-dashed px-3 py-1.5 text-center text-xs text-muted-foreground"
            >
              {m.texto}
            </li>
          ) : (
            <li key={i} className={`flex ${m.de === "alumno" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${BURBUJA[m.de]}`}>
                {m.autor && (
                  <p className={`mb-0.5 font-mono text-[10px] tracking-wider ${AUTOR[m.de]}`}>{m.autor}</p>
                )}
                <p>{m.texto}</p>
              </div>
            </li>
          ),
        )}
      </ol>
      {pie && <p className="border-t border-divider px-5 py-3 text-xs text-label">{pie}</p>}
    </figure>
  );
}
