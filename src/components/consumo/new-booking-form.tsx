"use client";

import { startTransition, useActionState, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { createBookingAction, type ConsumoState } from "@/app/actions/consumo";
import { Button } from "@/components/ui/button";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field";
import type { BookingKind, MentorLevel, Modulo } from "@/lib/db-types";

export interface MentorReservable {
  id: string;
  name: string;
  level: MentorLevel;
  headline: string | null;
  modulos: string[]; // códigos
}

// Solicitud de sesión: módulo → mentor que lo imparte → tipo → fecha/hora (Madrid).
// El precio depende del nivel del mentor; el servidor lo vuelve a calcular.
export function NewBookingForm({
  locale,
  modulos,
  mentores,
  prices,
  balance,
  defaultModulo,
  minDate,
}: {
  locale: string;
  modulos: Pick<Modulo, "code" | "name">[];
  mentores: MentorReservable[];
  prices: Record<BookingKind, Partial<Record<MentorLevel, number>>>;
  balance: number;
  defaultModulo?: string;
  // Ahora + 3 h en hora de Madrid (lo calcula el servidor).
  minDate: string;
}) {
  const t = useTranslations("consumo");
  const tm = useTranslations("mentorPanel");

  const [modulo, setModulo] = useState(defaultModulo ?? "");
  const [mentor, setMentor] = useState("");
  const [kind, setKind] = useState<BookingKind>("sesion_flash");
  const [startsAt, setStartsAt] = useState("");
  const [note, setNote] = useState("");
  // Campos controlados (React 19 resetea el form): si va bien se vacían aquí; si
  // falla, el alumno no pierde lo escrito.
  const [state, action, pending] = useActionState<ConsumoState, FormData>(async (prev, fd) => {
    const r = await createBookingAction(prev, fd);
    if (r.ok) {
      setStartsAt("");
      setNote("");
    }
    return r;
  }, {});

  const disponibles = useMemo(
    () => mentores.filter((m) => m.modulos.includes(modulo)),
    [mentores, modulo],
  );
  const elegido = disponibles.find((m) => m.id === mentor);
  const precio = elegido ? prices[kind][elegido.level] : undefined;
  const sinSaldo = precio !== undefined && balance < precio;

  // Módulos sin mentores verificados no se pueden reservar.
  const conMentor = modulos.filter((m) => mentores.some((x) => x.modulos.includes(m.code)));

  return (
    <form
      onSubmit={(e) => {
        // Sin <form action>: React 19 resetea el formulario tras la acción y los
        // radios controlados quedan desmarcados aunque el estado siga elegido.
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="space-y-4"
    >
      <input type="hidden" name="locale" value={locale} />

      <label className="block space-y-1">
        <span className={LABEL_CLASS}>{t("moduleLabel")}</span>
        <select
          name="modulo"
          required
          value={modulo}
          onChange={(e) => {
            setModulo(e.target.value);
            setMentor("");
          }}
          className={INPUT_CLASS}
        >
          <option value="" disabled>
            {t("modulePlaceholder")}
          </option>
          {conMentor.map((m) => (
            <option key={m.code} value={m.code}>
              {m.code} · {m.name}
            </option>
          ))}
        </select>
      </label>

      {modulo && (
        <fieldset className="space-y-2">
          <legend className={LABEL_CLASS}>{t("mentorLabel")}</legend>
          {disponibles.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("errors.noMentorForModulo")}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {disponibles.map((m) => (
                <label
                  key={m.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-4 transition ${
                    mentor === m.id ? "border-primary/60 glow" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="mentor"
                    value={m.id}
                    required
                    checked={mentor === m.id}
                    onChange={() => setMentor(m.id)}
                    className="mt-1 accent-[var(--primary)]"
                  />
                  <span>
                    <span className="block font-medium">{m.name}</span>
                    <span className="block font-mono text-xs text-muted-foreground">
                      {tm(`level.${m.level}`)}
                    </span>
                    {m.headline && (
                      <span className="mt-1 block text-xs text-muted-foreground">{m.headline}</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          )}
        </fieldset>
      )}

      <fieldset className="space-y-2">
        <legend className={LABEL_CLASS}>{t("sessionKindLabel")}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["sesion_flash", "sesion_1a1"] as const).map((k) => (
            <label
              key={k}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-4 transition ${
                kind === k ? "border-primary/60 glow" : ""
              }`}
            >
              <input
                type="radio"
                name="kind"
                value={k}
                checked={kind === k}
                onChange={() => setKind(k)}
                className="mt-1 accent-[var(--primary)]"
              />
              <span>
                <span className="block font-medium">{t(`kind.${k}`)}</span>
                <span className="block text-xs text-muted-foreground">{t(`kindHelp.${k}`)}</span>
                <span className="mt-1 block font-mono text-sm text-primary">
                  {elegido
                    ? t("creditsN", { n: prices[k][elegido.level] ?? 0 })
                    : t("creditsFrom", { n: Math.min(...Object.values(prices[k])) })}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block space-y-1">
        <span className={`block ${LABEL_CLASS}`}>{t("startsAtLabel")}</span>
        <input
          type="datetime-local"
          name="starts_at"
          required
          min={minDate}
          step={900}
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          className={`${INPUT_CLASS} font-mono sm:max-w-xs`}
        />
        <span className="block text-xs text-muted-foreground">{t("startsAtHelp")}</span>
      </label>

      <label className="block space-y-1">
        <span className={LABEL_CLASS}>{t("noteLabel")}</span>
        <textarea
          name="note"
          maxLength={1000}
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("notePlaceholder")}
          className={INPUT_CLASS}
        />
      </label>

      <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        {t("cancelPolicy")} {t("contactNotice")}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || !elegido || sinSaldo} className="glow">
          {pending
            ? t("working")
            : precio !== undefined
              ? t("requestSessionN", { n: precio })
              : t("requestSession")}
        </Button>
        <span className="font-mono text-xs text-muted-foreground">
          {t("balanceShort", { n: balance })}
        </span>
      </div>
      <p aria-live="polite" className="min-h-4 text-xs">
        {sinSaldo && !state.error && (
          <span className="text-destructive">{t("errors.insufficientCredits")}</span>
        )}
        {state.ok && (
          <span className="text-primary">
            {t(`ok.${state.ok}`)}
            {state.redacted && ` ${t("redactedNotice")}`}
          </span>
        )}
        {state.error && <span className="text-destructive">{t(`errors.${state.error}`)}</span>}
      </p>
    </form>
  );
}
