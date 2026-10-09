"use client";

import { startTransition, useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { createLeadAction, type LeadState } from "@/app/actions/leads";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { LeadKind, Modulo } from "@/lib/db-types";

// Formulario sin cuenta: "pregunta" (duda de un alumno a un mentor, gratis) o
// "llamada" (la familia deja su teléfono y la llamamos). Campos controlados para no
// perder lo escrito si algo falla (React 19 resetea el formulario tras la acción).
export function LeadForm({
  kind,
  modulos = [],
  defaultModulo,
}: {
  kind: LeadKind;
  modulos?: Pick<Modulo, "code" | "name">[];
  defaultModulo?: string;
}) {
  const t = useTranslations("lead");
  const locale = useLocale();
  const [state, action, pending] = useActionState<LeadState, FormData>(createLeadAction, {});
  const [v, setV] = useState({
    quien: kind === "llamada" ? "familia" : "alumno",
    modulo: defaultModulo ?? "",
    message: "",
    name: "",
    contact: "",
    preferred_time: "",
    consent: false,
  });
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV((p) => ({ ...p, [k]: e.target.value }));

  if (state.ok) {
    return (
      <div role="status" className="rounded-2xl border border-tint-pass-border bg-tint-pass p-6">
        <p className="flex items-center gap-2 font-heading text-xl font-semibold">
          <CheckCircle2 aria-hidden className="size-6 text-accent-pass" />
          {t(`ok.${kind}`)}
        </p>
        <p className="mt-2 text-muted-foreground">{t("okText")}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="space-y-4"
    >
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="locale" value={locale} />
      {/* Trampa para bots: oculto a personas y a lectores de pantalla. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

      <fieldset>
        <legend className={LABEL_CLASS}>{t("quien")}</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {(["alumno", "familia"] as const).map((q) => (
            <label
              key={q}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border px-3 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                v.quien === q ? "border-primary bg-tint-primary" : "border-border text-muted-foreground",
              )}
            >
              <input
                type="radio"
                name="quien"
                value={q}
                checked={v.quien === q}
                onChange={set("quien")}
                className="accent-[var(--primary)]"
              />
              {t(`quienOpt.${q}`)}
            </label>
          ))}
        </div>
      </fieldset>

      {kind === "pregunta" && modulos.length > 0 && (
        <label className="block space-y-1.5">
          <span className={LABEL_CLASS}>{t("modulo")}</span>
          <select name="modulo" value={v.modulo} onChange={set("modulo")} className={INPUT_CLASS}>
            <option value="">{t("moduloAny")}</option>
            {modulos.map((m) => (
              <option key={m.code} value={m.code}>
                {m.code} · {m.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block space-y-1.5">
        <span className={LABEL_CLASS}>{t(kind === "pregunta" ? "message" : "messageCall")}</span>
        <textarea
          name="message"
          required={kind === "pregunta"}
          minLength={kind === "pregunta" ? 10 : undefined}
          maxLength={3000}
          rows={kind === "pregunta" ? 6 : 3}
          value={v.message}
          onChange={set("message")}
          placeholder={t(kind === "pregunta" ? "messagePh" : "messageCallPh")}
          className={cn(INPUT_CLASS, kind === "pregunta" && "font-mono")}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className={LABEL_CLASS}>{t("name")}</span>
          <input name="name" autoComplete="given-name" maxLength={80} value={v.name} onChange={set("name")} className={INPUT_CLASS} />
        </label>
        <label className="block space-y-1.5">
          <span className={LABEL_CLASS}>{t(kind === "llamada" ? "phone" : "contact")}</span>
          <input
            name="contact"
            required
            maxLength={120}
            inputMode={kind === "llamada" ? "tel" : "email"}
            autoComplete={kind === "llamada" ? "tel" : "email"}
            value={v.contact}
            onChange={set("contact")}
            placeholder={t(kind === "llamada" ? "phonePh" : "contactPh")}
            className={INPUT_CLASS}
          />
        </label>
      </div>

      {kind === "llamada" && (
        <label className="block space-y-1.5">
          <span className={LABEL_CLASS}>{t("when")}</span>
          <input
            name="preferred_time"
            maxLength={80}
            value={v.preferred_time}
            onChange={set("preferred_time")}
            placeholder={t("whenPh")}
            className={INPUT_CLASS}
          />
        </label>
      )}

      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="consent"
          required
          checked={v.consent}
          onChange={(e) => setV((p) => ({ ...p, consent: e.target.checked }))}
          className="mt-0.5 size-4 accent-[var(--primary)]"
        />
        <span className="text-muted-foreground">
          {t("consent")} {t("minorNote")}
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="glow inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-5 font-bold text-primary-foreground transition-colors hover:bg-primary/85 disabled:opacity-60"
        >
          {pending ? t("sending") : t(`submit.${kind}`)}
        </button>
        <p aria-live="polite" className="text-sm text-sos-text">
          {state.error && t(`errors.${state.error}`)}
        </p>
      </div>
    </form>
  );
}
