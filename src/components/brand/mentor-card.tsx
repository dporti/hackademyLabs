import { Link } from "@/i18n/navigation";
import type { MentorLevel } from "@/lib/db-types";

// Iniciales para el avatar (sin foto todavía).
export function iniciales(name: string | null) {
  return (name ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

// Tarjeta de mentor (maqueta Mentores.html). Datos públicos de la vista
// mentor_public (sin contacto). Las filas opcionales solo salen si llegan datos.
export function MentorCard({
  id,
  name,
  level,
  levelLabel,
  headline,
  moduleCodes = [],
  languages,
  session,
  bookLabel,
  viewLabel,
}: {
  id: string;
  name: string | null;
  level: MentorLevel;
  levelLabel: string;
  headline?: string | null;
  moduleCodes?: string[];
  languages?: { label: string; value: string };
  session?: { label: string; value: string };
  bookLabel?: string;
  viewLabel?: string;
}) {
  return (
    <article className="card-interactive relative flex flex-col rounded-2xl border bg-card p-5">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid size-12 shrink-0 place-items-center rounded-xl border border-tint-primary-border bg-tint-primary font-heading font-bold text-primary"
        >
          {iniciales(name)}
        </span>
        <div className="min-w-0">
          <h3 className="font-heading text-lg leading-tight font-semibold">
            {/* Toda la tarjeta enlaza a la ficha; el botón de reservar queda por encima. */}
            <Link href={`/mentores/${id}`} className="after:absolute after:inset-0 after:rounded-2xl">
              {name}
            </Link>
          </h3>
          <p
            className={`mt-1 font-mono text-[11px] font-semibold tracking-[0.15em] uppercase ${
              level === "experto" ? "text-primary" : "text-label"
            }`}
          >
            {levelLabel}
          </p>
        </div>
      </div>
      {headline && <p className="mt-3 text-sm text-muted-foreground">{headline}</p>}
      {moduleCodes.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {moduleCodes.map((c) => (
            <li key={c} className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-xs text-foreground">
              {c}
            </li>
          ))}
        </ul>
      )}
      {(languages || session) && (
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-divider pt-3 text-xs">
          {languages && (
            <div>
              <dt className="text-label">{languages.label}</dt>
              <dd className="mt-0.5 text-foreground">{languages.value}</dd>
            </div>
          )}
          {session && (
            <div>
              <dt className="text-label">{session.label}</dt>
              <dd className="mt-0.5 font-mono text-foreground">{session.value}</dd>
            </div>
          )}
        </dl>
      )}
      {(viewLabel || bookLabel) && (
        <div className="mt-auto flex gap-2 pt-4">
          {viewLabel && (
            <span className="inline-flex min-h-10 flex-1 items-center justify-center rounded-[10px] border border-[#3a3f5c] text-sm font-medium">
              {viewLabel}
            </span>
          )}
          {bookLabel && (
            <Link
              href={`/panel/sesiones?mentor=${id}`}
              className="relative z-10 inline-flex min-h-10 flex-1 items-center justify-center rounded-[10px] bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/85"
            >
              {bookLabel}
            </Link>
          )}
        </div>
      )}
    </article>
  );
}
