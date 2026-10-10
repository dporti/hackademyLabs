"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { createMaterialAction, type MaterialState } from "@/app/actions/material";
import { Button } from "@/components/ui/button";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field";

// Alta de material para el banco de Bit. Campos controlados (React 19 resetea el form);
// tras guardar bien se vacían título y texto.
export function MaterialForm({
  locale,
  modulos,
}: {
  locale: string;
  modulos: { code: string; name: string; ras: string[] }[];
}) {
  const t = useTranslations("materiales");
  const [modulo, setModulo] = useState(modulos[0]?.code ?? "");
  const [ra, setRa] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [state, action, pending] = useActionState<MaterialState, FormData>(async (prev, fd) => {
    const r = await createMaterialAction(prev, fd);
    if (r.ok) {
      setTitle("");
      setBody("");
    }
    return r;
  }, {});
  const ras = modulos.find((m) => m.code === modulo)?.ras ?? [];

  if (!modulos.length) return <p className="text-sm text-muted-foreground">{t("noModules")}</p>;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className={LABEL_CLASS}>{t("modulo")}</span>
          <select
            name="modulo"
            value={modulo}
            onChange={(e) => {
              setModulo(e.target.value);
              setRa("");
            }}
            className={INPUT_CLASS}
          >
            {modulos.map((m) => (
              <option key={m.code} value={m.code}>
                {m.code} · {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className={LABEL_CLASS}>{t("ra")}</span>
          <select name="ra" value={ra} onChange={(e) => setRa(e.target.value)} className={INPUT_CLASS}>
            <option value="">{t("raAny")}</option>
            {ras.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block space-y-1">
        <span className={LABEL_CLASS}>{t("titleLabel")}</span>
        <input name="title" required maxLength={140} value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT_CLASS} />
      </label>
      <label className="block space-y-1">
        <span className={LABEL_CLASS}>{t("bodyLabel")}</span>
        <textarea
          name="body"
          required
          rows={8}
          maxLength={8000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className={`${INPUT_CLASS} font-mono text-sm`}
        />
        <span className="text-xs text-label">{t("bodyHelp")}</span>
      </label>
      <Button type="submit" disabled={pending} className="h-11 rounded-[10px] px-5 font-semibold">
        {pending ? t("saving") : t("save")}
      </Button>
      <p aria-live="polite" className="text-sm">
        {state.ok && <span className="text-accent-pass">{t(`ok.${state.ok}`)}</span>}
        {state.error && <span className="text-sos-text">{t(`errors.${state.error}`)}</span>}
      </p>
    </form>
  );
}
