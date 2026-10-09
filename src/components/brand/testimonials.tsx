import { SectionLabel } from "@/components/brand/section-label";

export interface Testimonio {
  quote: string;
  who: string;
  context: string;
}

// Testimonios reales con permiso (DISENO.md §6.13). Hasta tenerlos, la lista está vacía
// y la sección no se renderiza: nunca textos de ejemplo en producción.
export const TESTIMONIOS: Testimonio[] = [];

export function Testimonials({ label, title, items = TESTIMONIOS }: { label: string; title: string; items?: Testimonio[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
      <SectionLabel>{label}</SectionLabel>
      <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-[38px]">{title}</h2>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {items.map((t) => (
          <figure key={t.quote} className="rounded-2xl border bg-card p-6">
            <blockquote className="text-lg">«{t.quote}»</blockquote>
            <figcaption className="mt-4 text-sm text-muted-foreground">
              {t.who} · <span className="font-mono text-label">{t.context}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
