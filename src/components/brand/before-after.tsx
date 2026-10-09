import { Check, X } from "lucide-react";

// Antes / después: lo que pasa sin Checkpoint (✕, SOS) frente a con Checkpoint (✓, cian).
export function BeforeAfter({
  withoutLabel,
  withLabel,
  without,
  withItems,
}: {
  withoutLabel: string;
  withLabel: string;
  without: string[];
  withItems: string[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-tint-sos-border bg-tint-sos p-6">
        <p className="font-mono text-xs font-semibold tracking-[0.2em] text-sos-text uppercase">
          {withoutLabel}
        </p>
        <ul className="mt-4 space-y-3">
          {without.map((w) => (
            <li key={w} className="flex gap-3 text-muted-foreground">
              <X aria-hidden className="mt-0.5 size-4 shrink-0 text-sos-text" strokeWidth={3} />
              {w}
            </li>
          ))}
        </ul>
      </div>
      <div className="glow rounded-2xl border border-tint-primary-border bg-tint-primary p-6">
        <p className="font-mono text-xs font-semibold tracking-[0.2em] text-primary uppercase">
          {withLabel}
        </p>
        <ul className="mt-4 space-y-3">
          {withItems.map((w) => (
            <li key={w} className="flex gap-3">
              <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={3} />
              {w}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
