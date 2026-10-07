import { RaBadge } from "@/components/brand/ra-badge";
import type { RaStatus } from "@/lib/db-types";

export interface InformeSemanalData {
  title: string;
  exampleLabel: string;
  student: string;
  week: string;
  overallLabel: string;
  overall: { status: RaStatus; label: string };
  consistencyLabel: string;
  consistencyDays: number; // días con actividad de 7
  consistencyText: string;
  workedLabel: string;
  worked: { code: string; text: string; status: RaStatus; statusLabel: string }[];
  upcomingLabel: string;
  upcoming: { date: string; text: string }[];
  tipLabel: string;
  tip: string;
}

// Vista previa del informe semanal que recibe la familia (zona family: clara y
// sobria). Semáforo con texto + forma + color (nunca solo color).
export function InformeSemanal({ d }: { d: InformeSemanalData }) {
  return (
    <article
      aria-label={d.title}
      className="rounded-xl border bg-card p-5 shadow-[var(--glow-primary)] sm:p-6"
    >
      <header className="flex items-start justify-between gap-3 border-b pb-4">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {d.title}
          </p>
          <p className="mt-1 font-display text-lg font-semibold">{d.student}</p>
          <p className="font-mono text-xs text-muted-foreground">{d.week}</p>
        </div>
        <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {d.exampleLabel}
        </span>
      </header>

      <dl className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <dt className="text-xs text-muted-foreground">{d.overallLabel}</dt>
          <dd className="mt-1">
            <RaBadge status={d.overall.status} label={d.overall.label} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{d.consistencyLabel}</dt>
          <dd className="mt-1.5 flex items-center gap-1" aria-label={d.consistencyText}>
            {Array.from({ length: 7 }, (_, i) => (
              <span
                key={i}
                aria-hidden
                className={`size-2.5 rounded-sm ${
                  i < d.consistencyDays ? "bg-primary" : "bg-muted ring-1 ring-border"
                }`}
              />
            ))}
            <span className="ml-1.5 font-mono text-xs">{d.consistencyText}</span>
          </dd>
        </div>
      </dl>

      <div className="mt-5">
        <p className="text-xs text-muted-foreground">{d.workedLabel}</p>
        <ul className="mt-2 space-y-2">
          {d.worked.map((w) => (
            <li key={w.code + w.text} className="flex items-center justify-between gap-3 text-sm">
              <span>
                <span className="font-mono text-primary">{w.code}</span> {w.text}
              </span>
              <RaBadge status={w.status} label={w.statusLabel} />
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5">
        <p className="text-xs text-muted-foreground">{d.upcomingLabel}</p>
        <ul className="mt-2 space-y-1 text-sm">
          {d.upcoming.map((u) => (
            <li key={u.date + u.text}>
              <span className="font-mono text-xs text-muted-foreground">{u.date}</span>{" "}
              {u.text}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 rounded-lg bg-muted p-3">
        <p className="text-xs font-medium text-primary">{d.tipLabel}</p>
        <p className="mt-0.5 text-sm">{d.tip}</p>
      </div>
    </article>
  );
}
