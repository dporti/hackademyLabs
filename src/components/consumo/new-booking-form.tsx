"use client";

import { startTransition, useActionState, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createBookingAction, type ConsumoState } from "@/app/actions/consumo";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field";
import { iniciales } from "@/components/brand/mentor-card";
import { cn } from "@/lib/utils";
import type { BookingKind, MentorLevel, Modulo } from "@/lib/db-types";

export interface MentorReservable {
  id: string;
  name: string;
  level: MentorLevel;
  headline: string | null;
  modulos: string[]; // códigos
}

// Solicitud de sesión (maqueta Reserva.html): pasos módulo y mentor → tipo → día y
// hora (Madrid) → qué trabajar, con resumen fijo (coste y saldo después). El precio
// depende del nivel del mentor; el servidor lo vuelve a calcular y cobra en la RPC.
export function NewBookingForm({
  locale,
  modulos,
  mentores,
  prices,
  balance,
  defaultModulo,
  defaultMentor,
  minDate,
}: {
  locale: string;
  modulos: Pick<Modulo, "code" | "name">[];
  mentores: MentorReservable[];
  prices: Record<BookingKind, Partial<Record<MentorLevel, number>>>;
  balance: number;
  defaultModulo?: string;
  // Mentor preseleccionado (desde su ficha: /panel/sesiones?mentor=…).
  defaultMentor?: string;
  // Ahora + 3 h en hora de Madrid (lo calcula el servidor).
  minDate: string;
}) {
  const t = useTranslations("consumo");
  const tm = useTranslations("mentorPanel");

  const mentorInicial = mentores.find((m) => m.id === defaultMentor);
  const [modulo, setModulo] = useState(
    defaultModulo && (!mentorInicial || mentorInicial.modulos.includes(defaultModulo))
      ? defaultModulo
      : (mentorInicial?.modulos[0] ?? defaultModulo ?? ""),
  );
  const [mentor, setMentor] = useState(mentorInicial?.id ?? "");
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

  const disponibles = useMemo(() => mentores.filter((m) => m.modulos.includes(modulo)), [mentores, modulo]);
  const elegido = disponibles.find((m) => m.id === mentor);
  const precio = elegido ? prices[kind][elegido.level] : undefined;
  const sinSaldo = precio !== undefined && balance < precio;

  // Módulos sin mentores verificados no se pueden reservar.
  const conMentor = modulos.filter((m) => mentores.some((x) => x.modulos.includes(m.code)));

  const fechaTxt = startsAt
    ? new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(
        new Date(startsAt),
      )
    : null;

  const paso = (n: number, titulo: string) => (
    <legend className="flex items-center gap-3 font-heading text-lg font-semibold">
      <span className="grid size-7 place-items-center rounded-full border border-primary font-mono text-sm text-primary">
        {n}
      </span>
      {titulo}
    </legend>
  );

  return (
    <form
      onSubmit={(e) => {
        // Sin <form action>: React 19 resetea el formulario tras la acción y los
        // radios controlados quedan desmarcados aunque el estado siga elegido.
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]"
    >
      <input type="hidden" name="locale" value={locale} />

      <div className="space-y-8">
        {/* 1 · Módulo y mentor */}
        <fieldset className="space-y-4">
          {paso(1, t("stepMentor"))}
          <label className="block space-y-1.5">
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
          {modulo &&
            (disponibles.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("errors.noMentorForModulo")}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {disponibles.map((m) => (
                  <label
                    key={m.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-2xl border bg-card p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                      mentor === m.id ? "border-primary bg-tint-primary" : "hover:border-primary/40",
                    )}
                  >
                    <input
                      type="radio"
                      name="mentor"
                      value={m.id}
                      required
                      checked={mentor === m.id}
                      onChange={() => setMentor(m.id)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden
                      className="grid size-11 shrink-0 place-items-center rounded-xl border border-tint-primary-border bg-tint-primary font-heading font-bold text-primary"
                    >
                      {iniciales(m.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold">{m.name}</span>
                      <span className="block font-mono text-xs text-label">{tm(`level.${m.level}`)}</span>
                      {m.headline && <span className="mt-1 block text-xs text-muted-foreground">{m.headline}</span>}
                    </span>
                  </label>
                ))}
              </div>
            ))}
        </fieldset>

        {/* 2 · Tipo de sesión */}
        <fieldset className="space-y-4">
          {paso(2, t("sessionKindLabel"))}
          <div className="grid gap-3 sm:grid-cols-2">
            {(["sesion_flash", "sesion_1a1"] as const).map((k) => (
              <label
                key={k}
                className={cn(
                  "flex cursor-pointer flex-col rounded-2xl border bg-card p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                  kind === k ? "border-primary bg-tint-primary" : "hover:border-primary/40",
                )}
              >
                <input
                  type="radio"
                  name="kind"
                  value={k}
                  checked={kind === k}
                  onChange={() => setKind(k)}
                  className="sr-only"
                />
                <span className="flex flex-col gap-0.5">
                  <span className="font-semibold">{t(`kind.${k}`)}</span>
                  <span className="font-mono text-sm text-primary">
                    {elegido
                      ? t("creditsN", { n: prices[k][elegido.level] ?? 0 })
                      : t("creditsFrom", { n: Math.min(...Object.values(prices[k])) })}
                  </span>
                </span>
                <span className="mt-1 text-sm text-muted-foreground">{t(`kindHelp.${k}`)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* 3 · Día y hora */}
        <fieldset className="space-y-4">
          {paso(3, t("stepWhen"))}
          <label className="block space-y-1.5">
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
        </fieldset>

        {/* 4 · Qué trabajar */}
        <fieldset className="space-y-4">
          {paso(4, t("noteLabel"))}
          <textarea
            name="note"
            maxLength={1000}
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("notePlaceholder")}
            aria-label={t("noteLabel")}
            className={INPUT_CLASS}
          />
        </fieldset>
      </div>

      {/* Resumen fijo */}
      <aside className="xl:sticky xl:top-24 xl:self-start">
        <div className="glow rounded-2xl border border-tint-primary-border bg-card p-5">
          <p className="font-mono text-xs tracking-[0.2em] text-label uppercase">{t("summary")}</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-label">{t("mentor")}</dt>
              <dd className="font-medium">{elegido?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-label">{t("sessionKindLabel")}</dt>
              <dd className="font-medium">{t(`kind.${kind}`)}</dd>
            </div>
            <div>
              <dt className="text-label">{t("stepWhen")}</dt>
              <dd className="font-medium first-letter:uppercase">{fechaTxt ?? "—"}</dd>
            </div>
            <div className="flex justify-between border-t border-divider pt-3">
              <dt className="text-label">{t("cost")}</dt>
              <dd className="font-mono font-semibold text-primary">
                {precio !== undefined ? t("creditsN", { n: precio }) : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-label">{t("balanceAfter")}</dt>
              <dd className={cn("font-mono font-semibold", sinSaldo ? "text-sos-text" : "")}>
                {precio !== undefined ? t("creditsN", { n: balance - precio }) : t("creditsN", { n: balance })}
              </dd>
            </div>
          </dl>
          <button
            type="submit"
            disabled={pending || !elegido || sinSaldo}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-4 font-bold text-primary-foreground transition-colors hover:bg-primary/85 disabled:pointer-events-none disabled:opacity-50"
          >
            {pending ? t("working") : precio !== undefined ? t("requestSessionN", { n: precio }) : t("requestSession")}
          </button>
          <p aria-live="polite" className="mt-2 min-h-4 text-xs">
            {sinSaldo && !state.error && <span className="text-destructive">{t("errors.insufficientCredits")}</span>}
            {state.ok && (
              <span className="text-primary">
                {t(`ok.${state.ok}`)}
                {state.redacted && ` ${t("redactedNotice")}`}
              </span>
            )}
            {state.error && <span className="text-destructive">{t(`errors.${state.error}`)}</span>}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            {t("cancelPolicy")}{" "}
            <Link href="/cancelacion" className="text-primary underline-offset-4 hover:underline">
              {t("policyLink")}
            </Link>
          </p>
          <p className="mt-2 text-xs text-label">{t("contactNotice")}</p>
        </div>
      </aside>
    </form>
  );
}
