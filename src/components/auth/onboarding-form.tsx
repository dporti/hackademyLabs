"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { onboardingAction, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field";
import type { UserRole, Modulo } from "@/lib/db-types";

export function OnboardingForm({
  locale,
  role,
  modulos = [],
}: {
  locale: string;
  role: UserRole;
  modulos?: Pick<Modulo, "code" | "name">[];
}) {
  const t = useTranslations("onboarding");
  const ta = useTranslations("auth");
  const [state, action, pending] = useActionState<AuthState, FormData>(
    onboardingAction,
    {},
  );
  // Tras un error, lo enviado (React 19 resetea el formulario tras la acción).
  const v = state.values;
  const langs = v?.languages ?? ["es"];

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />

      {role === "alumno" && (
        <>
          <fieldset className="space-y-2">
            <legend className={LABEL_CLASS}>{t("mode")}</legend>
            {(["autonomo", "familia"] as const).map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="mode"
                  value={m}
                  defaultChecked={(v?.mode || "autonomo") === m}
                  className="accent-[var(--primary)]"
                />
                {m === "autonomo" ? t("modeAutonomo") : t("modeFamilia")}
              </label>
            ))}
          </fieldset>
          <label className="block space-y-1">
            <span className={LABEL_CLASS}>{t("birthdate")}</span>
            <input
              name="birthdate"
              type="date"
              defaultValue={v?.birthdate ?? ""}
              className={INPUT_CLASS}
            />
          </label>
        </>
      )}

      {role === "familia" && (
        <label className="block space-y-1">
          <span className={LABEL_CLASS}>{t("familyName")}</span>
          <input
            name="family_name"
            defaultValue={v?.family_name ?? ""}
            className={INPUT_CLASS}
          />
        </label>
      )}

      {role === "mentor" && (
        <>
          <label className="block space-y-1">
            <span className={LABEL_CLASS}>{t("headline")}</span>
            <input
              name="headline"
              maxLength={80}
              defaultValue={v?.headline ?? ""}
              className={INPUT_CLASS}
            />
          </label>
          <label className="block space-y-1">
            <span className={LABEL_CLASS}>{t("bio")}</span>
            <textarea
              name="bio"
              rows={3}
              maxLength={1200}
              defaultValue={v?.bio ?? ""}
              className={INPUT_CLASS}
            />
          </label>
          <fieldset className="space-y-2">
            <legend className={LABEL_CLASS}>{t("languages")}</legend>
            {["es", "ca"].map((l) => (
              <label key={l} className="mr-4 inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="languages"
                  value={l}
                  defaultChecked={langs.includes(l)}
                  className="accent-[var(--primary)]"
                />
                {l.toUpperCase()}
              </label>
            ))}
          </fieldset>
          <fieldset className="space-y-2">
            <legend className={LABEL_CLASS}>{t("modules")}</legend>
            <div className="grid max-h-56 grid-cols-1 gap-1 overflow-y-auto rounded-md border bg-background/40 p-3 sm:grid-cols-2">
              {modulos.map((m) => (
                <label key={m.code} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="modulos"
                    value={m.code}
                    defaultChecked={v?.modulos?.includes(m.code)}
                    className="accent-[var(--primary)]"
                  />
                  <span className="font-mono text-primary">{m.code}</span> {m.name}
                </label>
              ))}
            </div>
          </fieldset>
          <p className="text-xs text-muted-foreground">{t("pendingVerification")}</p>
        </>
      )}

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {ta(`errors.${state.error}`)}
        </p>
      )}

      <Button type="submit" disabled={pending} className="glow w-full">
        {t("finish")}
      </Button>
    </form>
  );
}
