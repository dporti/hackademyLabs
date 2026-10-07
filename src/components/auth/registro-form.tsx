"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { signUpAction, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field";

const ROLES = ["alumno", "familia", "mentor"] as const;

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
  const v = state.values;
  const role = v?.role ?? (ROLES.includes(defaultRole as never) ? defaultRole : "alumno");

  // Cuenta creada pero falta confirmar el email: sustituye el formulario.
  if (state.info) {
    return (
      <p role="status" className="rounded-md border border-primary/40 p-4 text-sm">
        {t(`info.${state.info}`)}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />

      {/* Rol como tarjetas seleccionables (radio accesible con teclado). */}
      <fieldset className="space-y-2">
        <legend className={LABEL_CLASS}>{t("role")}</legend>
        <div className="grid gap-2">
          {ROLES.map((r) => (
            <label
              key={r}
              className="flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-primary/40 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
            >
              <input
                type="radio"
                name="role"
                value={r}
                defaultChecked={role === r}
                className="mt-1 accent-[var(--primary)]"
              />
              <span>
                <span className="block text-sm font-medium">{t(`roles.${r}.title`)}</span>
                <span className="block text-xs text-muted-foreground">
                  {t(`roles.${r}.desc`)}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block space-y-1">
        <span className={LABEL_CLASS}>{t("fullName")}</span>
        <input
          name="full_name"
          autoComplete="name"
          defaultValue={v?.full_name ?? ""}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block space-y-1">
        <span className={LABEL_CLASS}>{t("email")}</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={v?.email ?? ""}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block space-y-1">
        <span className={LABEL_CLASS}>{t("password")}</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          aria-describedby="password-hint"
          className={INPUT_CLASS}
        />
        <span id="password-hint" className="block text-xs text-muted-foreground">
          {t("passwordHint")}
        </span>
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {t(`errors.${state.error}`)}
        </p>
      )}

      <Button type="submit" disabled={pending} className="glow w-full">
        {pending ? t("registering") : t("register")}
      </Button>
    </form>
  );
}
