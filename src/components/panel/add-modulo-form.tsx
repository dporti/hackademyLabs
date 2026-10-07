"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { addModuloAction, type StudentActionState } from "@/app/actions/student";
import { Button } from "@/components/ui/button";
import type { Modulo } from "@/lib/db-types";

// Añade (o actualiza la fecha de examen de) un módulo que prepara el alumno.
export function AddModuloForm({
  locale,
  modulos,
}: {
  locale: string;
  modulos: Pick<Modulo, "code" | "name">[];
}) {
  const t = useTranslations("panel");
  const [state, action, pending] = useActionState<StudentActionState, FormData>(
    addModuloAction,
    {},
  );

  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="locale" value={locale} />
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <label className="block space-y-1">
          <span className="text-sm font-medium">{t("moduleLabel")}</span>
          <select
            name="modulo"
            required
            defaultValue=""
            className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
          >
            <option value="" disabled>
              {t("modulePlaceholder")}
            </option>
            {modulos.map((m) => (
              <option key={m.code} value={m.code}>
                {m.code} · {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">{t("examDate")}</span>
          <input
            name="exam_date"
            type="date"
            className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
          />
        </label>
        <Button type="submit" disabled={pending}>
          {t("addModule")}
        </Button>
      </div>
      <p aria-live="polite" className="min-h-4 text-xs">
        {state.ok && <span className="text-primary">{t(`ok.${state.ok}`)}</span>}
        {state.error && (
          <span className="text-destructive">{t(`errors.${state.error}`)}</span>
        )}
      </p>
    </form>
  );
}
