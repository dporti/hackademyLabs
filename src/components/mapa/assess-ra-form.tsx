"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { assessRaAction, type MapaActionState } from "@/app/actions/mapa";
import { NIVELES, type NivelDominio } from "@/lib/dominio";
import { Button } from "@/components/ui/button";

// Valoración de un RA por una persona (mentor tras sesión/ticket, tutor o admin).
// Campos controlados: React 19 resetea el formulario tras la acción.
export function AssessRaForm({
  locale,
  studentId,
  raId,
  nivel,
  sealed,
}: {
  locale: string;
  studentId: string;
  raId: string;
  nivel: NivelDominio | null;
  sealed: boolean;
}) {
  const t = useTranslations("mapa");
  const td = useTranslations("dominio");
  const [state, action, pending] = useActionState<MapaActionState, FormData>(assessRaAction, {});
  const [valor, setValor] = useState<NivelDominio>(nivel ?? "con_ayuda");
  const [sello, setSello] = useState(sealed);
  const [nota, setNota] = useState("");

  return (
    <form action={action} className="mt-3 space-y-2 border-t border-divider pt-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="student_id" value={studentId} />
      <input type="hidden" name="ra_id" value={raId} />
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`n-${raId}`}>
          {t("assessLevel")}
        </label>
        <select
          id={`n-${raId}`}
          name="nivel"
          value={valor}
          onChange={(e) => setValor(e.target.value as NivelDominio)}
          className="h-10 rounded-[10px] border border-border bg-background px-3 text-sm [color-scheme:dark]"
        >
          {NIVELES.map((n) => (
            <option key={n} value={n}>
              {td(`nivel.${n}`)}
            </option>
          ))}
        </select>
        <label className="flex min-h-10 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="seal"
            checked={sello}
            onChange={(e) => setSello(e.target.checked)}
            className="size-4 accent-[var(--accent-pass)]"
          />
          {t("sealLabel")}
        </label>
        <input
          name="note"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          maxLength={280}
          placeholder={t("notePlaceholder")}
          aria-label={t("notePlaceholder")}
          className="h-10 min-w-0 flex-1 rounded-[10px] border border-border bg-background px-3 text-sm"
        />
        <Button type="submit" size="sm" disabled={pending} className="h-10 rounded-[10px] px-4">
          {pending ? t("saving") : t("assessSave")}
        </Button>
      </div>
      <p aria-live="polite" className="text-xs">
        {state.ok && <span className="text-accent-pass">{t("assessed")}</span>}
        {state.error && <span className="text-sos-text">{t(`errors.${state.error}`)}</span>}
      </p>
    </form>
  );
}
