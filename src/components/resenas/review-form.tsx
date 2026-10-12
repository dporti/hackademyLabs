"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { createReviewAction, type ResenaState } from "@/app/actions/resenas";

// Formulario de reseña: 1–5 estrellas (radios nativos: teclado y lector de pantalla),
// comentario opcional y «publicar como anónimo». Menores / modo Familia: anónimo forzado
// en BD, aquí solo se avisa.
export function ReviewForm({ source, refId, forcedAnon }: { source: "sesion" | "ticket"; refId: string; forcedAnon: boolean }) {
  const t = useTranslations("resenas");
  const [state, action, pending] = useActionState<ResenaState, FormData>(createReviewAction, {});
  const [nota, setNota] = useState(0);
  const [hover, setHover] = useState(0);
  const [texto, setTexto] = useState("");
  const [anon, setAnon] = useState(false);

  if (state.ok === "created") {
    return (
      <p role="status" className="mt-3 text-sm text-accent-pass">
        {t("ok.created")} {state.redacted && <span className="text-muted-foreground">{t("redacted")}</span>}
      </p>
    );
  }

  const activa = hover || nota;
  return (
    <form action={action} className="mt-3 space-y-3">
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="ref" value={refId} />
      <fieldset className="min-w-0">
        <legend className="text-sm font-medium">{t("ratingLegend")}</legend>
        <div className="mt-1.5 flex flex-wrap items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((i) => (
            <label
              key={i}
              onMouseEnter={() => setHover(i)}
              className="cursor-pointer rounded-md p-0.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary"
            >
              <input
                type="radio"
                name="rating"
                value={i}
                checked={nota === i}
                onChange={() => setNota(i)}
                className="sr-only"
                required
              />
              <Star aria-hidden className={`size-7 ${i <= activa ? "fill-current text-primary" : "text-[#3a3f5c]"}`} />
              <span className="sr-only">{t("starN", { n: i })}</span>
            </label>
          ))}
          {activa > 0 && <span className="ml-2 text-sm text-muted-foreground">{t(`scale.${activa}` as "scale.1")}</span>}
        </div>
      </fieldset>
      <div>
        <label htmlFor={`c-${refId}`} className="text-sm font-medium">
          {t("commentLabel")}
        </label>
        <textarea
          id={`c-${refId}`}
          name="comment"
          rows={3}
          maxLength={1000}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={t("commentPlaceholder")}
          className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-label">{t("commentHelp")}</p>
      </div>
      {forcedAnon ? (
        <p className="text-xs text-label">{t("forcedAnon")}</p>
      ) : (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="anonymous" checked={anon} onChange={(e) => setAnon(e.target.checked)} className="size-4" />
          {t("anonymous")}
        </label>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending || nota === 0}
          className="inline-flex min-h-10 items-center rounded-[10px] bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/85 disabled:opacity-50"
        >
          {t("submit")}
        </button>
        <p aria-live="polite" className="text-sm text-sos-text">
          {state.error && t(`errors.${state.error}` as "errors.generic")}
        </p>
      </div>
    </form>
  );
}
