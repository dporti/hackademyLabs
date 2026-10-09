"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// «Encuentra tu camino»: 3 preguntas → recomienda un modelo (DISENO.md §6).
// Regla: Tutor247 si le cuesta la constancia, si la familia también se encarga o si
// no tiene fecha de examen; si no, Aprueba tu módulo.
type Respuesta = "a" | "b";
const PREGUNTAS = ["q1", "q2", "q3"] as const;
type Pregunta = (typeof PREGUNTAS)[number];

export function recomendar(r: Record<Pregunta, Respuesta>): "aprueba" | "tutor" {
  return r.q1 === "b" || r.q2 === "b" || r.q3 === "b" ? "tutor" : "aprueba";
}

export function PathFinder() {
  const t = useTranslations("home.path");
  const tm = useTranslations("home.models");
  const [resp, setResp] = useState<Partial<Record<Pregunta, Respuesta>>>({});
  const completo = PREGUNTAS.every((p) => resp[p]);
  const modelo = completo ? recomendar(resp as Record<Pregunta, Respuesta>) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <ol className="space-y-4">
        {PREGUNTAS.map((p, i) => (
          <li key={p} className="rounded-2xl border bg-card p-5">
            <fieldset>
              <legend className="flex items-baseline gap-3 font-heading text-lg font-semibold">
                <span className="font-mono text-sm text-primary">0{i + 1}</span>
                {t(`${p}.q`)}
              </legend>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {(["a", "b"] as const).map((o) => {
                  const activo = resp[p] === o;
                  return (
                    <button
                      key={o}
                      type="button"
                      aria-pressed={activo}
                      onClick={() => setResp((r) => ({ ...r, [p]: o }))}
                      className={cn(
                        "min-h-11 rounded-[10px] border px-4 text-left text-[15px] transition-colors",
                        activo
                          ? "border-primary bg-tint-primary text-foreground"
                          : "border-border text-muted-foreground hover:border-primary/60 hover:text-foreground",
                      )}
                    >
                      {t(`${p}.${o}`)}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>

      <div aria-live="polite" className="lg:sticky lg:top-24 lg:self-start">
        {modelo ? (
          <div
            data-accent={modelo === "tutor" ? "tutor" : undefined}
            className="glow animate-hud-in rounded-3xl border border-tint-primary-border bg-tint-primary p-6 sm:p-8"
          >
            <p className="font-mono text-xs font-semibold tracking-[0.2em] text-primary uppercase">
              {t("result")} · {tm(`${modelo}.tag`)}
            </p>
            <h3 className="mt-3 font-heading text-2xl leading-tight font-bold">{t(`${modelo}.title`)}</h3>
            <p className="mt-3 text-muted-foreground">{t(`${modelo}.text`)}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href={modelo === "tutor" ? "/tutor247" : "/diagnostico"}
                className="inline-flex min-h-12 items-center rounded-xl bg-primary px-5 font-bold text-primary-foreground transition-colors hover:bg-primary/85"
              >
                {t(`${modelo}.cta`)}
              </Link>
              <button
                type="button"
                onClick={() => setResp({})}
                className="min-h-11 rounded-[10px] px-3 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {t("restart")}
              </button>
            </div>
          </div>
        ) : (
          <p className="rounded-3xl border border-dashed border-border p-6 text-muted-foreground sm:p-8">
            {t("pending")}
          </p>
        )}
      </div>
    </div>
  );
}
