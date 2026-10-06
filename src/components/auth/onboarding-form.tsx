"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { onboardingAction, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
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
  const [state, action, pending] = useActionState<AuthState, FormData>(
    onboardingAction,
    {},
  );

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />

      {role === "alumno" && (
        <>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t("mode")}</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="mode" value="autonomo" defaultChecked />
              {t("modeAutonomo")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="mode" value="familia" />
              {t("modeFamilia")}
            </label>
          </fieldset>
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("birthdate")}</span>
            <input
              name="birthdate"
              type="date"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
        </>
      )}

      {role === "familia" && (
        <label className="block space-y-1">
          <span className="text-sm font-medium">{t("familyName")}</span>
          <input
            name="family_name"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
      )}

      {role === "mentor" && (
        <>
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("headline")}</span>
            <input
              name="headline"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("bio")}</span>
            <textarea
              name="bio"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t("languages")}</legend>
            <label className="mr-4 inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="languages" value="es" defaultChecked />
              ES
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="languages" value="ca" />
              CA
            </label>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t("modules")}</legend>
            <div className="grid max-h-56 grid-cols-1 gap-1 overflow-y-auto rounded-md border p-3 sm:grid-cols-2">
              {modulos.map((m) => (
                <label
                  key={m.code}
                  className="flex items-center gap-2 text-sm"
                >
                  <input type="checkbox" name="modulos" value={m.code} />
                  <span className="font-mono text-muted-foreground">
                    {m.code}
                  </span>{" "}
                  {m.name}
                </label>
              ))}
            </div>
          </fieldset>
          <p className="text-xs text-muted-foreground">
            {t("pendingVerification")}
          </p>
        </>
      )}

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending} className="w-full">
        {t("finish")}
      </Button>
    </form>
  );
}
