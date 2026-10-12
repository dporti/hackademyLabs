"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { replyReviewAction, reportReviewAction, type ResenaState } from "@/app/actions/resenas";

// Mentor: responder (una respuesta pública, editable; vacía = quitarla) y denunciar.
export function MentorReviewActions({ reviewId, reply, reported }: { reviewId: string; reply: string | null; reported: boolean }) {
  const t = useTranslations("resenas");
  const [st, replyAction, replying] = useActionState<ResenaState, FormData>(replyReviewAction, {});
  const [rs, reportAction, reporting] = useActionState<ResenaState, FormData>(reportReviewAction, {});
  const [texto, setTexto] = useState(reply ?? "");
  const [motivo, setMotivo] = useState("");

  return (
    <div className="mt-4 space-y-3 border-t border-divider pt-4">
      <form action={replyAction} className="space-y-2">
        <input type="hidden" name="review" value={reviewId} />
        <label htmlFor={`r-${reviewId}`} className="text-sm font-medium">
          {reply ? t("editReply") : t("replyLabel")}
        </label>
        <textarea
          id={`r-${reviewId}`}
          name="reply"
          rows={2}
          maxLength={1000}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={replying}
            className="inline-flex min-h-10 items-center rounded-[10px] bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/85 disabled:opacity-50"
          >
            {t("replySubmit")}
          </button>
          <p aria-live="polite" className="text-sm">
            {st.ok && <span className="text-accent-pass">{t("ok.replied")}</span>}
            {st.redacted && <span className="ml-1 text-muted-foreground">{t("redacted")}</span>}
            {st.error && <span className="text-sos-text">{t(`errors.${st.error}` as "errors.generic")}</span>}
          </p>
        </div>
      </form>

      {reported || rs.ok === "reported" ? (
        <p className="text-xs text-label">{t("reportedNote")}</p>
      ) : (
        <details>
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">{t("report")}</summary>
          <form action={reportAction} className="mt-2 space-y-2">
            <input type="hidden" name="review" value={reviewId} />
            <label htmlFor={`m-${reviewId}`} className="text-sm">
              {t("reportReason")}
            </label>
            <input
              id={`m-${reviewId}`}
              name="reason"
              maxLength={300}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={reporting}
              className="inline-flex min-h-10 items-center rounded-[10px] border border-[#3a3f5c] px-4 text-sm font-medium hover:border-primary disabled:opacity-50"
            >
              {t("reportSubmit")}
            </button>
            {rs.error && <p className="text-sm text-sos-text">{t(`errors.${rs.error}` as "errors.generic")}</p>}
          </form>
        </details>
      )}
    </div>
  );
}
