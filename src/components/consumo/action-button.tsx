"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import type { ConsumoState } from "@/app/actions/consumo";
import { Button } from "@/components/ui/button";

// Botón de una sola acción de consumo (coger ticket, cancelar, confirmar sesión…).
// Envía campos ocultos y muestra el resultado traducido debajo (sin diálogos).
export function ActionButton({
  action,
  fields,
  label,
  variant = "secondary",
  size = "sm",
  className,
}: {
  action: (prev: ConsumoState, fd: FormData) => Promise<ConsumoState>;
  fields: Record<string, string>;
  label: string;
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "default";
  className?: string;
}) {
  const t = useTranslations("consumo");
  const [state, formAction, pending] = useActionState<ConsumoState, FormData>(action, {});

  return (
    <form action={formAction} className={className}>
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <Button
        type="submit"
        variant={variant}
        size={size}
        disabled={pending}
        className={size === "sm" ? "h-10 rounded-[10px] px-4 text-sm font-semibold" : "h-11 rounded-[10px] px-5 font-semibold"}
      >
        {pending ? t("working") : label}
      </Button>
      {(state.ok || state.error) && (
        <p aria-live="polite" className="mt-1 text-xs">
          {state.ok && <span className="text-primary">{t(`ok.${state.ok}`)}</span>}
          {state.error && <span className="text-destructive">{t(`errors.${state.error}`)}</span>}
        </p>
      )}
    </form>
  );
}
