"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { signUpAction, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export function RegistroForm({
  locale,
  defaultRole = "alumno",
}: {
  locale: string;
  defaultRole?: string;
}) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<AuthState, FormData>(
    signUpAction,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />

      <label className="block space-y-1">
        <span className="text-sm font-medium">{t("role")}</span>
        <select
          name="role"
          defaultValue={defaultRole}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="alumno">{t("roleAlumno")}</option>
          <option value="familia">{t("roleFamilia")}</option>
          <option value="mentor">{t("roleMentor")}</option>
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">{t("fullName")}</span>
        <input
          name="full_name"
          autoComplete="name"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </label>

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
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </label>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.info && <p className="text-sm text-foreground">{state.info}</p>}

      <Button type="submit" disabled={pending} className="w-full">
        {t("register")}
      </Button>
    </form>
  );
}
