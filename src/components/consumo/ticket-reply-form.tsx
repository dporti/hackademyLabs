"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { postTicketMessageAction, type ConsumoState } from "@/app/actions/consumo";
import { Button } from "@/components/ui/button";
import { INPUT_CLASS } from "@/components/ui/field";

// Respuesta en el hilo del ticket (alumno o mentor asignado).
export function TicketReplyForm({
  locale,
  ticketId,
  placeholder,
}: {
  locale: string;
  ticketId: string;
  placeholder: string;
}) {
  const t = useTranslations("consumo");
  // Controlado: si falla no se pierde el texto; si va bien, se vacía.
  const [body, setBody] = useState("");
  const [state, action, pending] = useActionState<ConsumoState, FormData>(async (prev, fd) => {
    const r = await postTicketMessageAction(prev, fd);
    if (r.ok) setBody("");
    return r;
  }, {});

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="ticket" value={ticketId} />
      <textarea
        name="body"
        required
        maxLength={5000}
        rows={5}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`${INPUT_CLASS} font-mono`}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || !body.trim()}>
          {pending ? t("working") : t("send")}
        </Button>
        <p aria-live="polite" className="text-xs">
          {state.ok && (
            <span className="text-primary">
              {t("ok.messageSent")}
              {state.redacted && ` ${t("redactedNotice")}`}
            </span>
          )}
          {state.error && <span className="text-destructive">{t(`errors.${state.error}`)}</span>}
        </p>
      </div>
    </form>
  );
}
