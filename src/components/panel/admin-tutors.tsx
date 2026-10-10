"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { assignTutorAction, makeTutorAction, type MapaActionState } from "@/app/actions/mapa";
import { Button } from "@/components/ui/button";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field";
import type { AdminTutorData } from "@/lib/tutor";

// Admin: dar rol de tutor de referencia (por email, a una cuenta ya registrada que no
// sea alumno) y asignar a cada alumno su tutor. El tutor solo ve a sus asignados.
export function AdminTutors({ locale, data }: { locale: string; data: AdminTutorData }) {
  const t = useTranslations("adminTutors");
  const tm = useTranslations("mapa");
  const [state, action, pending] = useActionState<MapaActionState, FormData>(makeTutorAction, {});
  const [email, setEmail] = useState("");

  return (
    <div className="space-y-6">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="locale" value={locale} />
        <label className="block min-w-64 flex-1 space-y-1">
          <span className={LABEL_CLASS}>{t("emailLabel")}</span>
          <input
            type="email"
            name="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={INPUT_CLASS}
          />
        </label>
        <Button type="submit" disabled={pending} className="h-11 rounded-[10px] px-5 font-semibold">
          {t("makeTutor")}
        </Button>
        <p aria-live="polite" className="w-full text-sm">
          {state.ok && <span className="text-accent-pass">{t("created")}</span>}
          {state.error && <span className="text-sos-text">{tm(`errors.${state.error}`)}</span>}
        </p>
      </form>
      <p className="text-xs text-label">{t("emailHelp")}</p>

      {data.tutors.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {data.tutors.map((tu) => (
            <li key={tu.id} className="rounded-[10px] border bg-background px-3 py-2 text-sm">
              <span className="font-medium">{tu.name}</span>{" "}
              <span className="font-mono text-xs text-label">· {t("nStudents", { n: tu.students })}</span>
            </li>
          ))}
        </ul>
      )}

      {data.tutors.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noTutors")}</p>
      ) : data.students.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noStudents")}</p>
      ) : (
        <ul className="divide-y divide-divider rounded-2xl border bg-background">
          {data.students.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <span className="font-medium">{s.name}</span>
              <form action={assignTutorAction} className="flex items-center gap-2">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="student_id" value={s.id} />
                <label className="sr-only" htmlFor={`tu-${s.id}`}>
                  {t("tutorFor", { name: s.name })}
                </label>
                <select
                  id={`tu-${s.id}`}
                  name="tutor_id"
                  defaultValue={s.tutor_id ?? ""}
                  className="h-10 rounded-[10px] border border-border bg-background px-3 text-sm [color-scheme:dark]"
                >
                  <option value="">{t("noTutor")}</option>
                  {data.tutors.map((tu) => (
                    <option key={tu.id} value={tu.id}>
                      {tu.name}
                    </option>
                  ))}
                </select>
                <Button type="submit" size="sm" variant="secondary" className="h-10 rounded-[10px]">
                  {t("assign")}
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
