"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { summarizeSessionAction, type AulaState } from "@/app/actions/aula";
import { Button } from "@/components/ui/button";

// El mentor escribe sus notas y Bit redacta el resumen para el alumno.
export function SummaryForm({ locale, bookingId }: { locale: string; bookingId: string }) {
  const t = useTranslations("aula");
  const [state, action, pending] = useActionState<AulaState, FormData>(summarizeSessionAction, {});
  const [notas, setNotas] = useState("");
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="booking" value={bookingId} />
      <label className="block space-y-1">
        <span className="text-sm font-medium">{t("notesLabel")}</span>
        <textarea
          name="notes"
          rows={4}
          maxLength={3000}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder={t("notesPlaceholder")}
          className="w-full rounded-[10px] border border-border bg-background px-3 py-2 text-sm"
        />
      </label>
      <Button type="submit" disabled={pending} className="h-11 w-full rounded-[10px] font-semibold">
        {pending ? t("summarizing") : t("summarize")}
      </Button>
      <p aria-live="polite" className="text-sm">
        {state.ok && <span className="text-accent-pass">{t("summarySaved")}</span>}
        {state.error && <span className="text-sos-text">{t(`errors.${state.error}`)}</span>}
      </p>
    </form>
  );
}
