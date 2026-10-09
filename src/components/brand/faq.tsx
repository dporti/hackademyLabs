"use client";

import { useId, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

// Acordeón accesible: botón con aria-expanded/aria-controls y panel con role="region".
// Varias preguntas pueden estar abiertas a la vez; la primera empieza abierta.
export function Faq({ items, defaultOpen = 0 }: { items: { q: string; a: string }[]; defaultOpen?: number }) {
  const base = useId();
  const [abiertas, setAbiertas] = useState<Set<number>>(() => new Set(defaultOpen >= 0 ? [defaultOpen] : []));

  const alternar = (i: number) =>
    setAbiertas((prev) => {
      const s = new Set(prev);
      if (s.has(i)) s.delete(i);
      else s.add(i);
      return s;
    });

  return (
    <div className="divide-y divide-divider rounded-2xl border bg-card">
      {items.map((it, i) => {
        const open = abiertas.has(i);
        const btn = `${base}-b${i}`;
        const panel = `${base}-p${i}`;
        return (
          <div key={it.q}>
            <h3>
              <button
                id={btn}
                type="button"
                aria-expanded={open}
                aria-controls={panel}
                onClick={() => alternar(i)}
                className="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium transition-colors hover:text-primary"
              >
                {it.q}
                <Plus
                  aria-hidden
                  className={cn("size-5 shrink-0 text-primary transition-transform", open && "rotate-45")}
                />
              </button>
            </h3>
            <div id={panel} role="region" aria-labelledby={btn} hidden={!open} className="px-5 pb-5 text-muted-foreground">
              {it.a}
            </div>
          </div>
        );
      })}
    </div>
  );
}
