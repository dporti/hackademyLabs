"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { buyPackAction, type StudentActionState } from "@/app/actions/student";
import { Button } from "@/components/ui/button";

// Botón de compra de un pack (MOCK Fase 1: suma créditos sin cobro real).
// Solo envía el slug: precio y créditos los decide el servidor.
export function BuyPackForm({
  locale,
  slug,
  featured,
}: {
  locale: string;
  slug: string;
  featured?: boolean;
}) {
  const t = useTranslations("panel");
  const [state, action, pending] = useActionState<StudentActionState, FormData>(
    buyPackAction,
    {},
  );

  return (
    <form action={action} className="mt-4 space-y-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="pack" value={slug} />
      <Button
        type="submit"
        className={`w-full ${featured ? "glow" : ""}`}
        variant={featured ? "default" : "secondary"}
        disabled={pending}
      >
        {pending ? t("buying") : t("buyMock")}
      </Button>
      <p aria-live="polite" className="min-h-4 text-xs">
        {state.ok && (
          <span className="text-primary">
            {t("ok.packBought", { n: state.credits ?? 0 })}
          </span>
        )}
        {state.error && (
          <span className="text-destructive">{t(`errors.${state.error}`)}</span>
        )}
      </p>
    </form>
  );
}
