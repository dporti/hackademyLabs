"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { saveDiagnosticoAction, type MapaActionState } from "@/app/actions/mapa";

// Guarda la autoevaluación del diagnóstico en el Mapa de Dominio del alumno.
export function SaveDiagnostico({ locale, code, enc }: { locale: string; code: string; enc: string }) {
  const t = useTranslations("mapa");
  const [state, action, pending] = useActionState<MapaActionState, FormData>(saveDiagnosticoAction, {});

  if (state.ok)
    return (
      <p aria-live="polite" className="text-sm">
        <span className="text-accent-pass">{t("diagSaved", { n: state.n ?? 0 })}</span>{" "}
        <Link href={`/panel/mapa?m=${code}`} className="font-semibold text-primary hover:underline">
          {t("seeMap")} →
        </Link>
      </p>
    );

  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="modulo" value={code} />
      <input type="hidden" name="e" value={enc} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center rounded-[10px] bg-accent-pass px-4 text-sm font-bold text-background hover:opacity-90 disabled:opacity-60"
      >
        {pending ? t("saving") : t("saveDiag")}
      </button>
      {state.error && (
        <span aria-live="polite" className="text-sm text-sos-text">
          {t(`errors.${state.error}`)}
        </span>
      )}
    </form>
  );
}
