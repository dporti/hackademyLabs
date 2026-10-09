import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Logo de Checkpoint Academy: ✓ en cuadrado cian + «Checkpoint» con punto magenta
// + «ACADEMY» en mono. El nombre es la marca: no se traduce.
// `responsive`: en pantallas muy estrechas (< 380 px) solo se ve el icono.
export function Logo({
  className,
  compact = false,
  responsive = false,
}: {
  className?: string;
  compact?: boolean;
  responsive?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-foreground", className)}>
      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-[10px] border-2 border-[#2ef2ff] text-[#2ef2ff]"
      >
        <Check className="size-5" strokeWidth={3} />
      </span>
      {!compact && (
        <span className={cn("flex-col leading-none", responsive ? "hidden min-[380px]:flex" : "flex")}>
          <span className="font-heading text-[22px] font-bold tracking-[-0.5px]">
            Checkpoint<span className="text-[#ff3dcb]">.</span>
          </span>
          <span className="mt-1 font-mono text-[10px] tracking-[3px] text-label">ACADEMY</span>
        </span>
      )}
      {(compact || responsive) && (
        <span className={cn("sr-only", responsive && "min-[380px]:hidden")}>Checkpoint Academy</span>
      )}
    </span>
  );
}
