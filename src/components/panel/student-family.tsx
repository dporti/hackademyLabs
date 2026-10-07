"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import {
  acceptFamilyInviteAction,
  leaveFamilyAction,
  setFamilyShareAction,
  type StudentActionState,
} from "@/app/actions/student";
import { Button } from "@/components/ui/button";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field";
import type { StudentFamily as StudentFamilyData } from "@/lib/student";

// Sección "Familia" del panel del alumno: vincularse con el código de su familia
// y controlar qué se comparte. Transparencia: el alumno ve siempre qué ve su familia.
export function StudentFamily({
  locale,
  family,
}: {
  locale: string;
  family: StudentFamilyData;
}) {
  const t = useTranslations("studentFamily");
  const [state, action, pending] = useActionState<StudentActionState, FormData>(
    acceptFamilyInviteAction,
    {},
  );

  return (
    <section aria-labelledby="familia" className="rounded-xl border bg-card p-6">
      <h2 id="familia" className="font-display text-xl font-semibold">
        {t("title")}
      </h2>

      {family.linked ? (
        <div className="mt-3 space-y-4">
          <p className="text-sm">
            {t("linkedTo", { name: family.name || t("yourFamily") })}
          </p>
          <p className="text-sm text-muted-foreground">
            {family.isMinor
              ? t("minorShares")
              : family.shared
                ? t("adultShares")
                : t("adultNotShares")}
          </p>
          <p className="text-xs text-muted-foreground">{t("whatIsShared")}</p>
          <div className="flex flex-wrap gap-2">
            {!family.isMinor && (
              <form action={setFamilyShareAction}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="share" value={family.shared ? "false" : "true"} />
                <Button type="submit" size="sm" variant={family.shared ? "outline" : "default"}>
                  {family.shared ? t("stopSharing") : t("startSharing")}
                </Button>
              </form>
            )}
            <form action={leaveFamilyAction}>
              <input type="hidden" name="locale" value={locale} />
              <Button type="submit" size="sm" variant="ghost">
                {t("leave")}
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <form action={action} className="mt-3 space-y-4">
          <input type="hidden" name="locale" value={locale} />
          <p className="text-sm text-muted-foreground">{t("notLinked")}</p>
          <label className="block max-w-xs space-y-1">
            <span className={LABEL_CLASS}>{t("codeLabel")}</span>
            <input
              name="code"
              required
              autoComplete="off"
              placeholder="ABCDE-12345"
              className={`${INPUT_CLASS} font-mono uppercase tracking-widest`}
            />
          </label>
          {!family.isMinor && (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="share" className="mt-1 accent-[var(--primary)]" />
              <span>
                {t("shareConsent")}
                <span className="block text-xs text-muted-foreground">{t("whatIsShared")}</span>
              </span>
            </label>
          )}
          <Button type="submit" disabled={pending}>
            {t("link")}
          </Button>
          <p aria-live="polite" className="min-h-4 text-sm">
            {state.ok && <span className="text-primary">{t(`ok.${state.ok}`)}</span>}
            {state.error && (
              <span className="text-destructive">{t(`errors.${state.error}`)}</span>
            )}
          </p>
        </form>
      )}
    </section>
  );
}
