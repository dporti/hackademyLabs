import { cn } from "@/lib/utils";

// Etiqueta de sección en mono: «01 — TEXTO». Cian (Aprueba tu módulo) o magenta (Tutor247).
export function SectionLabel({
  index,
  children,
  tone = "primary",
  className,
}: {
  index?: string;
  children: React.ReactNode;
  tone?: "primary" | "secondary";
  className?: string;
}) {
  return (
    <p
      className={cn(
        "font-mono text-xs font-semibold tracking-[0.2em] uppercase",
        tone === "primary" ? "text-primary" : "text-secondary-text",
        className,
      )}
    >
      {index && <span>{index} — </span>}
      {children}
    </p>
  );
}
