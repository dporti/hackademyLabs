// Conversación de ejemplo con Bit (la IA). Enseña las reglas de oro de
// docs/capa-ia-v1.md §6: se presenta como IA, no hace prácticas (reconduce a
// aprender con preguntas) y escala a un mentor humano cuando hace falta.
// Estática: es un ejemplo, no un chat real.

export interface BitMensaje {
  de: "alumno" | "bit" | "sistema";
  texto: string;
}

export function BitChatDemo({
  titulo,
  subtitulo,
  ejemplo,
  mensajes,
}: {
  titulo: string;
  subtitulo: string;
  ejemplo: string;
  mensajes: BitMensaje[];
}) {
  return (
    <figure className="rounded-xl border bg-card" aria-label={titulo}>
      <figcaption className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <span className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded-md font-mono text-sm font-bold text-primary-foreground"
            style={{ backgroundColor: "var(--secondary)" }}
          >
            B
          </span>
          <span>
            <span className="block text-sm font-semibold">{titulo}</span>
            <span className="block text-xs text-muted-foreground">{subtitulo}</span>
          </span>
        </span>
        <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
          {ejemplo}
        </span>
      </figcaption>
      <ol className="space-y-3 p-4">
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
              <p
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.de === "alumno"
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm bg-muted"
                }`}
              >
                {m.texto}
              </p>
            </li>
          ),
        )}
      </ol>
    </figure>
  );
}
