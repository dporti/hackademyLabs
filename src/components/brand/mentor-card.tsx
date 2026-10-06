import { Link } from "@/i18n/navigation";
import type { MentorLevel } from "@/lib/db-types";

const LEVEL_LABEL: Record<MentorLevel, string> = {
  mentor: "Mentor",
  pro: "Mentor Pro",
  experto: "Mentor Experto",
};

// Tarjeta de mentor. Nivel como insignia, módulos en mono. Glow al hover.
export function MentorCard({
  id,
  name,
  level,
  levelLabel,
  headline,
  moduleCodes = [],
  responseMinutes,
}: {
  id: string;
  name: string | null;
  level: MentorLevel;
  levelLabel?: string;
  headline?: string | null;
  moduleCodes?: string[];
  responseMinutes?: number | null;
}) {
  return (
    <Link
      href={`/mentores/${id}`}
      className="card-interactive flex flex-col rounded-xl border bg-card p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">{name}</span>
        <span
          className="rounded-md border px-2 py-0.5 text-xs font-medium"
          style={{
            color: "var(--secondary)",
            borderColor: "color-mix(in oklab, var(--secondary) 40%, transparent)",
            backgroundColor: "color-mix(in oklab, var(--secondary) 12%, transparent)",
          }}
        >
          {levelLabel ?? LEVEL_LABEL[level]}
        </span>
      </div>
      {headline && (
        <p className="mt-1 text-sm text-muted-foreground">{headline}</p>
      )}
      {moduleCodes.length > 0 && (
        <p className="mt-3 font-mono text-xs text-muted-foreground">
          {moduleCodes.join(" · ")}
        </p>
      )}
      {responseMinutes != null && (
        <p className="mt-auto pt-2 font-mono text-[11px] text-muted-foreground">
          ~{responseMinutes} min respuesta
        </p>
      )}
    </Link>
  );
}
