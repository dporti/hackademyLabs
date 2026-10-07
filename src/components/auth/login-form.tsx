"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { signInAction, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field";

export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<AuthState, FormData>(
    signInAction,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />

      <label className="block space-y-1">
        <span className={LABEL_CLASS}>{t("email")}</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state.values?.email ?? ""}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block space-y-1">
        <span className={LABEL_CLASS}>{t("password")}</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={INPUT_CLASS}
        />
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {t(`errors.${state.error}`)}
        </p>
      )}

      <Button type="submit" disabled={pending} className="glow w-full">
        {pending ? t("loggingIn") : t("login")}
      </Button>
    </form>
  );
}
