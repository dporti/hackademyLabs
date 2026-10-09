"use client";

import { startTransition, useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createTicketAction, type ConsumoState } from "@/app/actions/consumo";
import { ComingSoon } from "@/components/brand/coming-soon";
import { cn } from "@/lib/utils";
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
          {(["ticket_express", "ticket_normal"] as const).map((k) => (
            <label
              key={k}
              className={cn(
                "flex cursor-pointer flex-col rounded-2xl border bg-card p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                kind === k ? "glow border-primary bg-tint-primary" : "hover:border-primary/40",
              )}
            >
              <input
                type="radio"
                name="kind"
                value={k}
                checked={kind === k}
                onChange={() => setKind(k)}
                className="sr-only"
              />
              <span className="font-mono text-xs font-semibold tracking-[0.15em] text-primary uppercase">
                {t(`kind.${k}`)}
              </span>
              <span className="mt-1 font-mono text-xl font-semibold">{t("creditsN", { n: prices[k] })}</span>
              <span className="mt-1 text-sm text-muted-foreground">{t(`kindHelp.${k}`)}</span>
            </label>
          ))}
          {/* SOS en directo: aún no construido (videollamada exprés con el primer mentor libre). */}
          <div aria-disabled="true" className="flex flex-col rounded-2xl border border-tint-sos-border bg-tint-sos p-4 opacity-80 sm:col-span-2">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold tracking-[0.15em] text-sos-text uppercase">
                {t("sosLiveTitle")}
              </span>
              <ComingSoon />
            </span>
            <span className="mt-2 text-sm text-muted-foreground">{t("sosLiveText")}</span>
          </div>
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

      <p className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
        {t("integrityNotice")} {t("contactNotice")}{" "}
        <Link href="/cancelacion" className="text-primary underline-offset-4 hover:underline">
          {t("policyLink")}
        </Link>
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending || sinSaldo}
          className="glow inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-5 font-bold text-primary-foreground transition-colors hover:bg-primary/85 disabled:pointer-events-none disabled:opacity-50"
        >
          {pending ? t("working") : t("sendTicket", { n: prices[kind] })}
        </button>
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
