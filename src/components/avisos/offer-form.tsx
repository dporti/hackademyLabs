"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { offerSlotAction, type OfertaState } from "@/app/actions/avisos";
import { createClient } from "@/lib/supabase/client";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field";

// El mentor ofrece uno de SUS huecos libres a un alumno que espera (fase D). Los huecos
// salen de su agenda (mentor_slots); la RPC offer_slot vuelve a validarlo todo.
export function OfferForm({ locale, alertId, mentorId }: { locale: string; alertId: string; mentorId: string }) {
  const t = useTranslations("ofertas");
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"sesion_1a1" | "sesion_flash">("sesion_1a1");
  const [slot, setSlot] = useState("");
  const [note, setNote] = useState("");
  const [huecos, setHuecos] = useState<{ key: string; slots: string[] } | null>(null);
  const [state, action, pending] = useActionState<OfertaState, FormData>(offerSlotAction, {});

  const clave = open ? `${mentorId}|${kind}` : "";
  useEffect(() => {
    if (!clave) return;
    let vivo = true;
    createClient()
      .rpc("mentor_slots", { p_mentor: mentorId, p_kind: kind, p_days: 14 })
      .then(({ data }) => {
        if (vivo) setHuecos({ key: clave, slots: ((data ?? {}) as { slots?: string[] }).slots ?? [] });
      });
    return () => {
      vivo = false;
    };
  }, [clave, mentorId, kind]);
  const cargando = !!clave && huecos?.key !== clave;
  const lista = huecos?.key === clave ? huecos.slots : [];
  // Horas locales de Madrid: se formatean como UTC para no desplazarlas.
  const fmt = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex min-h-10 items-center rounded-[10px] bg-primary px-3 text-sm font-bold text-primary-foreground hover:bg-primary/85"
      >
        {t("offer")}
      </button>
    );
  }

  return (
    <form action={action} className="mt-3 space-y-3 border-t border-divider pt-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="alert" value={alertId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className={LABEL_CLASS}>{t("kind")}</span>
          <select
            name="kind"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as typeof kind);
              setSlot("");
            }}
            className={INPUT_CLASS}
          >
            <option value="sesion_1a1">{t("kind1a1")}</option>
            <option value="sesion_flash">{t("kindFlash")}</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className={LABEL_CLASS}>{t("slot")}</span>
          <select name="starts_at" required value={slot} onChange={(e) => setSlot(e.target.value)} className={`${INPUT_CLASS} font-mono`}>
            <option value="" disabled>
              {cargando ? t("loading") : lista.length === 0 ? t("noSlots") : t("pickSlot")}
            </option>
            {lista.map((s) => (
              <option key={s} value={s}>
                {fmt.format(new Date(`${s}:00Z`))}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block space-y-1">
        <span className={LABEL_CLASS}>{t("note")}</span>
        <textarea
          name="note"
          rows={2}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("notePlaceholder")}
          className={INPUT_CLASS}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending || !slot}
          className="inline-flex min-h-10 items-center rounded-[10px] bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/85 disabled:opacity-50"
        >
          {t("send")}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-10 text-sm text-label hover:text-foreground">
          {t("cancel")}
        </button>
      </div>
      <p aria-live="polite" className="min-h-4 text-sm">
        {state.ok && <span className="text-accent-pass">{t("sent")}{state.redacted && ` ${t("redacted")}`}</span>}
        {state.error && <span className="text-sos-text">{t(`errors.${state.error}`)}</span>}
      </p>
      <p className="text-xs text-label">{t("offerHelp")}</p>
    </form>
  );
}
