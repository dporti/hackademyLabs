// Demo de la portada: un ejercicio con un error típico (<= en vez de <) y cómo
// ayudan Bit (pregunta, no da la solución) y el mentor. Ilustración estática.
// El código es universal (no se traduce); los textos llegan por props (i18n).
export function CodeDemo({
  aria,
  file,
  comment,
  example,
  bit,
  mentor,
}: {
  aria: string;
  file: string;
  comment: string;
  example: string;
  bit: { label: string; text: string };
  mentor: { label: string; text: string };
}) {
  const kw = "text-[#ff8be0]";
  const ty = "text-[#7fd8e0]";
  return (
    <figure aria-label={aria} className="glow overflow-hidden rounded-3xl border border-tint-primary-border bg-card">
      <figcaption className="flex items-center justify-between gap-3 border-b border-divider px-5 py-3">
        <span className="flex items-center gap-2">
          <span aria-hidden className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-sos" />
            <span className="size-2.5 rounded-full bg-warning" />
            <span className="size-2.5 rounded-full bg-accent-pass" />
          </span>
          <span className="ml-2 font-mono text-xs text-label">{file}</span>
        </span>
        <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-muted-foreground">{example}</span>
      </figcaption>
      <pre className="overflow-x-auto px-5 py-4 font-mono [font-variant-ligatures:none] text-[13px] leading-relaxed text-foreground">
        <code>
          <span className={kw}>public static int</span> buscar(<span className={ty}>int</span>[] v,{" "}
          <span className={ty}>int</span> x) {"{"}
          {"\n  "}
          <span className={kw}>for</span> (<span className={ty}>int</span> i = 0; i{" "}
          <span className="rounded bg-tint-sos px-0.5 text-sos-text underline decoration-wavy">&lt;=</span> v.length;
          i++) {"{"}
          {"\n    "}
          <span className="text-label">{comment}</span>
          {"\n    "}
          <span className={kw}>if</span> (v[i] == x) <span className={kw}>return</span> i;
          {"\n  }\n  "}
          <span className={kw}>return</span> -1;{"\n}"}
        </code>
      </pre>
      <div className="space-y-3 border-t border-divider p-5">
        <div className="rounded-2xl rounded-tl-sm border border-tint-primary-border bg-tint-primary p-3.5">
          <p className="font-mono text-[11px] tracking-wider text-primary">{bit.label}</p>
          <p className="mt-1 text-sm">{bit.text}</p>
        </div>
        <div className="rounded-2xl rounded-tl-sm border border-tint-secondary-border bg-tint-secondary p-3.5">
          <p className="font-mono text-[11px] tracking-wider text-secondary-text">{mentor.label}</p>
          <p className="mt-1 text-sm">{mentor.text}</p>
        </div>
      </div>
    </figure>
  );
}
