"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { respondOfferAction, type OfertaState } from "@/app/actions/avisos";

// Aceptar (reserva y cobra) o rechazar un hueco ofrecido por un mentor.
export function RespondOffer({ offerId, credits }: { offerId: string; credits: number }) {
  const t = useTranslations("ofertas");
  const [state, action, pending] = useActionState<OfertaState, FormData>(respondOfferAction, {});
  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <form action={action}>
          <input type="hidden" name="offer" value={offerId} />
          <input type="hidden" name="accept" value="true" />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-10 items-center rounded-[10px] bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/85 disabled:opacity-50"
          >
            {t("accept", { n: credits })}
          </button>
        </form>
        <form action={action}>
          <input type="hidden" name="offer" value={offerId} />
          <input type="hidden" name="accept" value="false" />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-10 items-center rounded-[10px] border border-[#3a3f5c] px-4 text-sm font-medium hover:border-primary disabled:opacity-50"
          >
            {t("decline")}
          </button>
        </form>
      </div>
      <p aria-live="polite" className="mt-2 min-h-4 text-sm">
        {state.ok && <span className="text-accent-pass">{t(`ok.${state.ok}`)}</span>}
        {state.error && <span className="text-sos-text">{t(`errors.${state.error}`)}</span>}
      </p>
    </div>
  );
}
