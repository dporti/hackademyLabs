import { SectionLabel } from "@/components/brand/section-label";

// Bloque del fundador. Sin foto real todavía: iniciales en lugar de la imagen.
export function FounderBlock({
  label,
  title,
  quote,
  name,
  role,
}: {
  label: string;
  title: string;
  quote: string;
  name: string;
  role: string;
}) {
  const iniciales = name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
  return (
    <div className="grid items-center gap-8 rounded-3xl border bg-card p-6 sm:p-10 md:grid-cols-[200px_1fr]">
      <div
        aria-hidden
        className="glow grid aspect-square w-32 place-items-center rounded-2xl border border-tint-primary-border bg-tint-primary font-heading text-4xl font-bold text-primary md:w-full"
      >
        {iniciales}
      </div>
      <figure>
        <SectionLabel>{label}</SectionLabel>
        <h2 className="mt-3 font-heading text-3xl leading-tight font-bold tracking-tight sm:text-[38px]">{title}</h2>
        <blockquote className="mt-5 border-l-2 border-primary pl-5 text-lg text-muted-foreground">
          «{quote}»
        </blockquote>
        <figcaption className="mt-4 text-sm">
          <span className="font-semibold">{name}</span> <span className="text-label">· {role}</span>
        </figcaption>
      </figure>
    </div>
  );
}
