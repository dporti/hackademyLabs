"use client";

import { startTransition, useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { createTicketAction, type ConsumoState } from "@/app/actions/consumo";
import { Button } from "@/components/ui/button";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field";
import type { Modulo, TicketKind } from "@/lib/db-types";

// Alta de ticket. Solo envía módulo, tipo y texto: el precio lo pone la BD. Si el
// saldo no llega, se avisa antes de enviar (la RPC lo vuelve a comprobar).
export function NewTicketForm({
  locale,
  modulos,
  prices,
  balance,
  defaultModulo,
}: {
  locale: string;
  modulos: Pick<Modulo, "code" | "name">[];
  prices: Record<TicketKind, number>;
  balance: number;
  defaultModulo?: string;
}) {
  const t = useTranslations("consumo");
  const [state, action, pending] = useActionState<ConsumoState, FormData>(createTicketAction, {});
  const [kind, setKind] = useState<TicketKind>("ticket_normal");
  // Controlados: React 19 resetea el formulario tras la acción y, si falla, el
  // alumno no debe perder la pregunta escrita.
  const [modulo, setModulo] = useState(defaultModulo ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const sinSaldo = balance < prices[kind];

  return (
    <form
      onSubmit={(e) => {
        // Sin <form action>: React 19 resetea el formulario tras la acción y los
        // radios controlados quedan desmarcados aunque el estado siga elegido.
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="space-y-4"
    >
      <input type="hidden" name="locale" value={locale} />

      <label className="block space-y-1">
        <span className={LABEL_CLASS}>{t("moduleLabel")}</span>
        <select
          name="modulo"
          required
          value={modulo}
          onChange={(e) => setModulo(e.target.value)}
          className={INPUT_CLASS}
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

      <fieldset className="space-y-2">
        <legend className={LABEL_CLASS}>{t("ticketKindLabel")}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["ticket_normal", "ticket_express"] as const).map((k) => (
            <label
              key={k}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-4 transition ${
                kind === k ? "border-primary/60 glow" : ""
              }`}
            >
              <input
                type="radio"
                name="kind"
                value={k}
                checked={kind === k}
                onChange={() => setKind(k)}
                className="mt-1 accent-[var(--primary)]"
              />
              <span>
                <span className="block font-medium">{t(`kind.${k}`)}</span>
                <span className="block text-xs text-muted-foreground">{t(`kindHelp.${k}`)}</span>
                <span className="mt-1 block font-mono text-sm text-primary">
                  {t("creditsN", { n: prices[k] })}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block space-y-1">
        <span className={LABEL_CLASS}>{t("subjectLabel")}</span>
        <input
          name="subject"
          required
          minLength={3}
          maxLength={140}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block space-y-1">
        <span className={LABEL_CLASS}>{t("bodyLabel")}</span>
        <textarea
          name="body"
          required
          minLength={10}
          maxLength={5000}
          rows={8}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("bodyPlaceholder")}
          className={`${INPUT_CLASS} font-mono`}
        />
      </label>

      <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        {t("integrityNotice")} {t("contactNotice")}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || sinSaldo} className="glow">
          {pending ? t("working") : t("sendTicket", { n: prices[kind] })}
        </Button>
        <span className="font-mono text-xs text-muted-foreground">
          {t("balanceShort", { n: balance })}
        </span>
      </div>
      <p aria-live="polite" className="min-h-4 text-xs">
        {sinSaldo && !state.error && <span className="text-destructive">{t("errors.insufficientCredits")}</span>}
        {state.error && <span className="text-destructive">{t(`errors.${state.error}`)}</span>}
      </p>
    </form>
  );
}
