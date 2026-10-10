"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { answerQuizAction, startQuizAction } from "@/app/actions/bit";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Pregunta = { pregunta: string; opciones: string[] };
type Correccion = { correcta: number; elegida: number; explicacion: string };

// Quiz de 3 preguntas sobre un RA (lo genera Bit; lo corrige el servidor).
export function QuizCard({
  ras,
  defaultRa,
}: {
  ras: { id: string; label: string }[];
  defaultRa?: string;
}) {
  const t = useTranslations("bitPanel");
  const locale = useLocale();
  const [raId, setRaId] = useState(defaultRa ?? ras[0]?.id ?? "");
  const [quiz, setQuiz] = useState<{ id: string; ra: string; preguntas: Pregunta[] } | null>(null);
  const [resp, setResp] = useState<number[]>([]);
  const [res, setRes] = useState<{ score: number; total: number; correccion: Correccion[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!ras.length) return <p className="text-sm text-muted-foreground">{t("quizNoRa")}</p>;

  const empezar = () =>
    start(async () => {
      setError(null);
      setRes(null);
      const r = await startQuizAction(raId, locale);
      if ("error" in r) return setError(r.error);
      setQuiz(r);
      setResp(r.preguntas.map(() => -1));
    });
  const corregir = () =>
    start(async () => {
      if (!quiz) return;
      const r = await answerQuizAction(quiz.id, resp);
      if ("error" in r) return setError(r.error);
      setRes(r);
    });

  if (!quiz)
    return (
      <div className="space-y-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium">{t("quizRa")}</span>
          <select
            value={raId}
            onChange={(e) => setRaId(e.target.value)}
            className="min-h-11 w-full rounded-[10px] border border-border bg-background px-3 text-sm [color-scheme:dark]"
          >
            {ras.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <Button onClick={empezar} disabled={pending} className="h-11 w-full rounded-[10px] font-semibold">
          {pending ? t("quizGenerating") : t("quizStart")}
        </Button>
        {error && <p className="text-sm text-sos-text">{t(`quizErrors.${error}`)}</p>}
      </div>
    );

  return (
    <div className="space-y-4">
      <p className="font-mono text-xs text-label">{t("quizOf", { ra: quiz.ra })}</p>
      <ol className="space-y-4">
        {quiz.preguntas.map((p, i) => (
          <li key={i}>
            <fieldset>
              <legend className="text-sm font-semibold whitespace-pre-wrap">
                {i + 1}. {p.pregunta}
              </legend>
              <div className="mt-2 space-y-1.5">
                {p.opciones.map((o, j) => {
                  const c = res?.correccion[i];
                  const estado = c ? (j === c.correcta ? "ok" : j === c.elegida ? "mal" : null) : null;
                  return (
                    <label
                      key={j}
                      className={cn(
                        "flex min-h-10 cursor-pointer items-start gap-2 rounded-[10px] border px-3 py-2 text-sm",
                        estado === "ok" && "border-tint-pass-border bg-tint-pass",
                        estado === "mal" && "border-tint-sos-border bg-tint-sos",
                      )}
                    >
                      <input
                        type="radio"
                        name={`q${i}`}
                        disabled={!!res}
                        checked={resp[i] === j}
                        onChange={() => setResp((r) => r.map((x, k) => (k === i ? j : x)))}
                        className="mt-0.5 accent-[var(--primary)]"
                      />
                      <span className="whitespace-pre-wrap">
                        {o}
                        {estado === "ok" && <span className="sr-only"> ({t("correct")})</span>}
                        {estado === "mal" && <span className="sr-only"> ({t("wrong")})</span>}
                      </span>
                    </label>
                  );
                })}
              </div>
              {res && <p className="mt-2 text-xs text-muted-foreground">{res.correccion[i].explicacion}</p>}
            </fieldset>
          </li>
        ))}
      </ol>
      {res ? (
        <div aria-live="polite" className="space-y-3">
          <p className="font-heading text-lg font-semibold">{t("quizScore", { n: res.score, total: res.total })}</p>
          <p className="text-sm text-muted-foreground">{res.score >= 2 ? t("quizPassed") : t("quizFailed")}</p>
          <Button variant="outline" onClick={() => setQuiz(null)} className="h-11 w-full rounded-[10px]">
            {t("quizAnother")}
          </Button>
        </div>
      ) : (
        <Button onClick={corregir} disabled={pending || resp.some((r) => r < 0)} className="h-11 w-full rounded-[10px] font-semibold">
          {pending ? t("quizChecking") : t("quizCheck")}
        </Button>
      )}
      {error && <p className="text-sm text-sos-text">{t(`quizErrors.${error}`)}</p>}
    </div>
  );
}
