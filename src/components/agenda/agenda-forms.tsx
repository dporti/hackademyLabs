"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { addOffAction, addSlotAction, type AgendaState } from "@/app/actions/agenda";
import { Button } from "@/components/ui/button";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field";
import { cn } from "@/lib/utils";

// Horas en rejilla de 30 min (07:00 … 24:00).
export const HORAS = Array.from({ length: 35 }, (_, i) => {
  const m = 7 * 60 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${m % 60 === 0 ? "00" : "30"}`;
});

// Añadir una franja a uno o varios días a la vez (lun–jue 18:00–21:00).
export function SlotForm({ locale }: { locale: string }) {
  const t = useTranslations("agenda");
  const [state, action, pending] = useActionState<AgendaState, FormData>(addSlotAction, {});
  const [dias, setDias] = useState<number[]>([]);
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("20:00");

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <fieldset>
        <legend className={LABEL_CLASS}>{t("days")}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => {
            const on = dias.includes(d);
            return (
              <label
                key={d}
                className={cn(
                  "inline-flex min-h-11 min-w-14 cursor-pointer items-center justify-center rounded-[10px] border px-3 text-sm font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                  on ? "border-primary bg-tint-primary text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <input
                  type="checkbox"
                  name="weekday"
                  value={d}
                  checked={on}
                  onChange={() => setDias(on ? dias.filter((x) => x !== d) : [...dias, d])}
                  className="sr-only"
                />
                {t(`wd.${d}`)}
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block space-y-1">
          <span className={LABEL_CLASS}>{t("from")}</span>
          <select name="start" value={start} onChange={(e) => setStart(e.target.value)} className={`${INPUT_CLASS} font-mono`}>
            {HORAS.slice(0, -1).map((h) => (
              <option key={h}>{h}</option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className={LABEL_CLASS}>{t("to")}</span>
          <select name="end" value={end} onChange={(e) => setEnd(e.target.value)} className={`${INPUT_CLASS} font-mono`}>
            {HORAS.slice(1).map((h) => (
              <option key={h}>{h}</option>
            ))}
          </select>
        </label>
        <Button type="submit" disabled={pending || dias.length === 0} className="h-11 rounded-[10px] px-5 font-semibold">
          {t("addSlot")}
        </Button>
      </div>
      <p aria-live="polite" className="min-h-5 text-sm">
        {state.ok && <span className="text-accent-pass">{t(`ok.${state.ok}`)}</span>}
        {state.error && <span className="text-sos-text">{t(`errors.${state.error}`)}</span>}
      </p>
    </form>
  );
}

// Bloquear días (vacaciones, exámenes propios…).
export function OffForm({ locale, minDate }: { locale: string; minDate: string }) {
  const t = useTranslations("agenda");
  const [state, action, pending] = useActionState<AgendaState, FormData>(addOffAction, {});
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="locale" value={locale} />
      <div className="flex flex-wrap items-end gap-3">
        <label className="block space-y-1">
          <span className={LABEL_CLASS}>{t("offFrom")}</span>
          <input
            type="date"
            name="from"
            required
            min={minDate}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={`${INPUT_CLASS} font-mono`}
          />
        </label>
        <label className="block space-y-1">
          <span className={LABEL_CLASS}>{t("offTo")}</span>
          <input
            type="date"
            name="to"
            min={from || minDate}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={`${INPUT_CLASS} font-mono`}
          />
        </label>
        <Button type="submit" variant="outline" disabled={pending || !from} className="h-11 rounded-[10px] px-5 font-semibold">
          {t("addOff")}
        </Button>
      </div>
      <p aria-live="polite" className="min-h-5 text-sm">
        {state.ok && <span className="text-accent-pass">{t(`ok.${state.ok}`)}</span>}
        {state.error && <span className="text-sos-text">{t(`errors.${state.error}`)}</span>}
      </p>
    </form>
  );
}
