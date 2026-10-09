import { Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { ComingSoon } from "@/components/brand/coming-soon";

export interface ModelCardData {
  tag: string;
  audience: string;
  title1: string;
  title2: string;
  text: string;
  bullets: { text: string; soon?: boolean }[];
  primary: { href: string; label: string };
  secondary: { href: string; label: string };
}

// Tarjeta de uno de los dos modelos de negocio: cian (Aprueba tu módulo) o
// magenta (Tutor247, vía data-accent="tutor": todo su --primary pasa a magenta).
export function ModelCard({ tone, d }: { tone: "aprueba" | "tutor"; d: ModelCardData }) {
  return (
    <article
      data-accent={tone === "tutor" ? "tutor" : undefined}
      className="glow flex flex-col rounded-3xl border border-tint-primary-border bg-tint-primary p-6 sm:p-8"
    >
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-sm font-semibold tracking-[0.15em] text-primary uppercase">
          {d.tag}
        </span>
        <span className="text-sm text-label">{d.audience}</span>
      </p>
      <h3 className="mt-4 font-heading text-3xl leading-tight font-bold tracking-tight sm:text-[34px]">
        {d.title1}
        <br />
        <span className="text-primary">{d.title2}</span>
      </h3>
      <p className="mt-4 text-muted-foreground">{d.text}</p>
      <ul className="mt-5 flex-1 space-y-2.5">
        {d.bullets.map((b) => (
          <li key={b.text} className="flex items-start gap-2.5 text-[15px]">
            <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={3} />
            <span>
              {b.text} {b.soon && <ComingSoon className="ml-1 align-middle" />}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link
          href={d.primary.href}
          className="inline-flex min-h-12 items-center rounded-xl bg-primary px-5 font-bold text-primary-foreground transition-colors hover:bg-primary/85"
        >
          {d.primary.label}
        </Link>
        <Link
          href={d.secondary.href}
          className={cn(
            "inline-flex min-h-12 items-center rounded-xl border border-[#3a3f5c] px-5 font-medium",
            "transition-colors hover:border-primary",
          )}
        >
          {d.secondary.label}
        </Link>
      </div>
    </article>
  );
}
