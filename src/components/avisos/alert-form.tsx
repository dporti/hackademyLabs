"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createAlertAction, type AvisoState } from "@/app/actions/avisos";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field";

// «Avísame cuando haya mentor» de un módulo. `logged`: alumno con sesión (un clic,
// opción «solo si encaja con mi horario»). Sin sesión: email + consentimiento + edad.
export function AlertForm({ locale, modulo, logged }: { locale: string; modulo: string; logged: boolean }) {
  const t = useTranslations("avisos");
  const [state, action, pending] = useActionState<AvisoState, FormData>(createAlertAction, {});
  const [email, setEmail] = useState("");
  const [idioma, setIdioma] = useState("");

  if (state.ok === "created") {
    return (
      <p role="status" className="rounded-2xl border border-tint-pass-border bg-tint-pass p-4 text-sm">
        {logged ? t("createdLogged", { code: modulo }) : t("createdEmail", { code: modulo })}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="modulo" value={modulo} />
      {/* Campo trampa (antispam): oculto para personas. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

      {!logged && (
        <label className="block space-y-1">
          <span className={LABEL_CLASS}>{t("email")}</span>
          <input
            type="email"
            name="email"
            required
            maxLength={120}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={INPUT_CLASS}
          />
        </label>
      )}
      <label className="block space-y-1">
        <span className={LABEL_CLASS}>{t("language")}</span>
        <select name="language" value={idioma} onChange={(e) => setIdioma(e.target.value)} className={INPUT_CLASS}>
          <option value="">{t("anyLanguage")}</option>
          <option value="es">{t("lang.es")}</option>
          <option value="ca">{t("lang.ca")}</option>
        </select>
      </label>
      {logged ? (
        <label className="flex min-h-11 cursor-pointer items-start gap-2.5 text-sm">
          <input type="checkbox" name="fit" className="mt-1 size-4 accent-primary" />
          <span>
            {t("fit")}{" "}
            <Link href="/panel/agenda" className="text-primary underline-offset-4 hover:underline">
              {t("fitLink")}
            </Link>
          </span>
        </label>
      ) : (
        <>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm">
            <input type="checkbox" name="consent" required className="mt-1 size-4 accent-primary" />
            <span>{t("consent")}</span>
          </label>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm">
            <input type="checkbox" name="age" required className="mt-1 size-4 accent-primary" />
            <span>{t("age")}</span>
          </label>
        </>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-primary px-5 font-bold text-primary-foreground transition-colors hover:bg-primary/85 disabled:opacity-50"
      >
        {pending ? t("sending") : t("submit")}
      </button>
      {!logged && <p className="text-xs text-label">{t("emailNote")}</p>}
      <p aria-live="polite" className="min-h-4 text-sm text-sos-text">
        {state.error && t(`errors.${state.error}`)}
      </p>
    </form>
  );
}
