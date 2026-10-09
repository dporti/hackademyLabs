"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { signInAction, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field";

// initialError: error que llega por URL (p. ej. ?error=link desde /api/auth/confirm).
export function LoginForm({
  locale,
  initialError,
}: {
  locale: string;
  initialError?: string;
}) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<AuthState, FormData>(
    signInAction,
    {},
  );
  const error = state.error ?? initialError;

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

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {t(`errors.${error}`)}
        </p>
      )}

      <Button type="submit" disabled={pending} className="glow h-12 w-full rounded-xl text-[15px] font-bold">
        {pending ? t("loggingIn") : t("login")}
      </Button>
    </form>
  );
}
