"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { createCheckinAction, type MapaActionState } from "@/app/actions/mapa";
import { Button } from "@/components/ui/button";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field";

// El tutor agenda un check-in con el alumno o una llamada breve a la familia.
export function CheckinForm({
  locale,
  studentId,
  hasFamily,
  minDate,
}: {
  locale: string;
  studentId: string;
  hasFamily: boolean;
  minDate: string; // AAAA-MM-DDTHH:MM (Madrid)
}) {
  const t = useTranslations("tutorPanel");
  const tm = useTranslations("mapa");
  const [state, action, pending] = useActionState<MapaActionState, FormData>(createCheckinAction, {});
  const [when, setWhen] = useState("");
  const [kind, setKind] = useState("checkin");
  const [topic, setTopic] = useState("");

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr] lg:grid-cols-[1fr_1fr_2fr_auto] lg:items-end">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="student_id" value={studentId} />
      <label className="block space-y-1">
        <span className={LABEL_CLASS}>{t("ciWhen")}</span>
        <input
          type="datetime-local"
          name="scheduled_at"
          required
          min={minDate}
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          className={INPUT_CLASS}
        />
      </label>
      <label className="block space-y-1">
        <span className={LABEL_CLASS}>{t("ciKind")}</span>
        <select name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className={INPUT_CLASS}>
          <option value="checkin">{t("kind.checkin")}</option>
          {hasFamily && <option value="llamada_familia">{t("kind.llamada_familia")}</option>}
        </select>
      </label>
      <label className="block space-y-1">
        <span className={LABEL_CLASS}>{t("ciTopic")}</span>
        <input name="topic" maxLength={200} value={topic} onChange={(e) => setTopic(e.target.value)} className={INPUT_CLASS} />
      </label>
      <Button type="submit" disabled={pending} className="h-11 rounded-[10px] px-5 font-semibold">
        {t("ciCreate")}
      </Button>
      <p aria-live="polite" className="text-sm sm:col-span-2 lg:col-span-4">
        {state.ok && <span className="text-accent-pass">{t("ciCreated")}</span>}
        {state.error && <span className="text-sos-text">{tm(`errors.${state.error}`)}</span>}
      </p>
    </form>
  );
}
