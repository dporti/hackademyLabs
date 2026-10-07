"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import {
  updateMentorProfileAction,
  type MentorActionState,
  type MentorFormValues,
} from "@/app/actions/mentor";
import { Button } from "@/components/ui/button";
import { INPUT_CLASS as INPUT } from "@/components/ui/field";
import type { Modulo } from "@/lib/db-types";

// Edición del perfil del mentor: titular, bio, vídeo, idiomas y módulos que imparte.
// status y level NO están aquí: solo los cambia un admin.
export function MentorProfileForm({
  locale,
  initial,
  modulos,
}: {
  locale: string;
  initial: MentorFormValues;
  modulos: Pick<Modulo, "code" | "name">[];
}) {
  const t = useTranslations("mentorPanel");
  const to = useTranslations("onboarding");
  const [state, action, pending] = useActionState<MentorActionState, FormData>(
    updateMentorProfileAction,
    {},
  );
  // Tras un error, lo enviado; si no, lo guardado en BD.
  const v = state.values ?? initial;

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />

      <label className="block space-y-1">
        <span className="text-sm font-medium">{to("headline")}</span>
        <input
          name="headline"
          maxLength={80}
          defaultValue={v.headline ?? ""}
          className={INPUT}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">{to("bio")}</span>
        <textarea
          name="bio"
          rows={4}
          maxLength={1200}
          defaultValue={v.bio ?? ""}
          className={INPUT}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">{t("videoUrl")}</span>
        <input
          name="video_url"
          type="url"
          placeholder="https://"
          defaultValue={v.video_url ?? ""}
          className={INPUT}
        />
        <span className="text-xs text-muted-foreground">{t("videoHint")}</span>
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{to("languages")}</legend>
        {["es", "ca"].map((l) => (
          <label key={l} className="mr-4 inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="languages"
              value={l}
              defaultChecked={v.languages.includes(l)}
            />
            {l.toUpperCase()}
          </label>
        ))}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{to("modules")}</legend>
        <div className="grid max-h-72 grid-cols-1 gap-1 overflow-y-auto rounded-md border p-3 sm:grid-cols-2">
          {modulos.map((m) => (
            <label key={m.code} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="modulos"
                value={m.code}
                defaultChecked={v.moduloCodes.includes(m.code)}
              />
              <span className="font-mono text-primary">{m.code}</span> {m.name}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? t("saving") : t("save")}
        </Button>
        <p aria-live="polite" className="text-sm">
          {state.ok && <span className="text-primary">{t(`ok.${state.ok}`)}</span>}
          {state.error && (
            <span className="text-destructive">{t(`errors.${state.error}`)}</span>
          )}
        </p>
      </div>
    </form>
  );
}
