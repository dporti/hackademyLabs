import { Check } from "lucide-react";

// Franja de frases en movimiento (decorativa: aria-hidden, la duplicamos para el
// bucle) + franja de garantías. Sin movimiento con prefers-reduced-motion.
export function Ticker({ phrases }: { phrases: string[] }) {
  const fila = (
    <span className="flex shrink-0 items-center gap-8 pr-8">
      {phrases.map((p) => (
        <span key={p} className="whitespace-nowrap">
          <span className="text-primary">{"//"}</span> {p}
        </span>
      ))}
    </span>
  );
  return (
    <div aria-hidden className="overflow-hidden border-y border-divider bg-card py-3 font-mono text-sm text-muted-foreground">
      <div className="animate-ticker flex w-max">
        {fila}
        {fila}
      </div>
    </div>
  );
}

export function TrustStrip({ items, label }: { items: string[]; label: string }) {
  return (
    <ul
      aria-label={label}
      className="mx-auto flex max-w-[1200px] flex-wrap justify-center gap-x-8 gap-y-3 px-4 py-6 text-sm text-muted-foreground sm:px-6"
    >
      {items.map((i) => (
        <li key={i} className="flex items-center gap-2">
          <Check aria-hidden className="size-4 text-accent-pass" strokeWidth={3} />
          {i}
        </li>
      ))}
    </ul>
  );
}
