import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

// Etiqueta «Próximamente» para lo prometido que aún no está construido (DISENO.md §8).
export function ComingSoon({ className }: { className?: string }) {
  const t = useTranslations("common");
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md border border-tint-warning-border bg-tint-warning px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-warning uppercase",
        className,
      )}
    >
      {t("comingSoon")}
    </span>
  );
}
