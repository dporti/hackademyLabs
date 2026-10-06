"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { signInAction, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

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
        <span className="text-sm font-medium">{t("email")}</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">{t("password")}</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </label>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending} className="w-full">
        {t("login")}
      </Button>
    </form>
  );
}
