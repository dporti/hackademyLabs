"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { MapaDominio, type RaProgress } from "@/components/brand/mapa-dominio";
import { calcularPlan, type PlanInverso } from "@/lib/plan-inverso";
import type { ModuloDiagnosticable } from "@/lib/catalog";
import type { RaStatus } from "@/lib/db-types";

// Diagnóstico gratis SIN cuenta (docs: "widget ¿Qué módulo te preocupa? → mini
// diagnóstico → Mapa de Dominio → oferta"). Autoevaluación por RA → Mapa en vivo →
// plan inverso con fecha de examen → recomendación con créditos. Todo en el
// navegador; el estado vive en la URL para poder compartirlo.

const OPCIONES: RaStatus[] = ["verde", "ambar", "rojo"];
const PROGRESO: Record<RaStatus, number> = { verde: 100, ambar: 55, rojo: 15 };
// Codificación compacta en la URL: v/a/r por RA, "-" sin responder.
const ENC: Record<RaStatus, string> = { verde: "v", ambar: "a", rojo: "r" };
const DEC: Record<string, RaStatus> = { v: "verde", a: "ambar", r: "rojo" };

export interface DiagnosticoInicial {
  modulo: string | null;
  estados: string; // "vva-r…"
  examen: string | null;
  horas: number | null;
}

const COLOR: Record<RaStatus, string> = {
  verde: "var(--ra-verde)",
  ambar: "var(--ra-ambar)",
  rojo: "var(--ra-rojo)",
};

function sumarDias(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function Diagnostico({
  modulos,
  hoy,
  inicial,
}: {
  modulos: ModuloDiagnosticable[];
  hoy: string;
  inicial: DiagnosticoInicial;
}) {
  const t = useTranslations("diagnostico");
  const tp = useTranslations("products");
  const locale = useLocale();

  const [code, setCode] = useState<string | null>(
    modulos.some((m) => m.code === inicial.modulo) ? inicial.modulo : null,
  );
  const modulo = modulos.find((m) => m.code === code) ?? null;
  const [estados, setEstados] = useState<Record<string, RaStatus>>(() => {
    const m = modulos.find((x) => x.code === inicial.modulo);
    if (!m) return {};
    return Object.fromEntries(
      m.ra
        .map((r, i) => [r.code, DEC[inicial.estados[i] ?? ""]] as const)
        .filter(([, v]) => v),
    );
  });
  const [examen, setExamen] = useState(
    inicial.examen && inicial.examen > hoy ? inicial.examen : sumarDias(hoy, 30),
  );
  const [horas, setHoras] = useState(
    inicial.horas && inicial.horas >= 1 && inicial.horas <= 20 ? inicial.horas : 5,
  );
  const [copiado, setCopiado] = useState(false);

  const respondidos = modulo ? modulo.ra.filter((r) => estados[r.code]).length : 0;
  const completo = !!modulo && respondidos === modulo.ra.length;

  // Estado → URL (compartible, sin recargar).
  useEffect(() => {
    const p = new URLSearchParams();
    if (code) p.set("m", code);
    if (modulo) p.set("e", modulo.ra.map((r) => (estados[r.code] ? ENC[estados[r.code]] : "-")).join(""));
    if (completo) {
      p.set("x", examen);
      p.set("h", String(horas));
    }
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [code, modulo, estados, completo, examen, horas]);

  const mapa: RaProgress[] = modulo
    ? modulo.ra.map((r) => ({
        code: r.code,
        label: r.description,
        status: estados[r.code] ?? "ambar",
        progress: estados[r.code] ? PROGRESO[estados[r.code]] : 0,
      }))
    : [];

  // Sin useMemo: el React Compiler ya memoriza el cálculo.
  const plan: PlanInverso | null =
    completo && modulo
      ? calcularPlan({ ras: modulo.ra, estados, hoy, examen, horasSemana: horas })
      : null;

  const fechaCorta = (d: string) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(
      new Date(`${d}T00:00:00Z`),
    );
  const statusLabels = {
    verde: t("map.verde"),
    ambar: t("map.ambar"),
    rojo: t("map.rojo"),
  };

  async function copiarEnlace() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  }

  // ───────────────────────── Paso 1: módulo ─────────────────────────
  if (!modulo) {
    return (
      <section aria-labelledby="paso-modulo">
        <h2 id="paso-modulo" className="font-display text-xl font-semibold">
          {t("pickTitle")}
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modulos.map((m) => (
            <button
              key={m.code}
              type="button"
              onClick={() => {
                setCode(m.code);
                setEstados({});
              }}
              className="card-interactive flex flex-col items-start rounded-lg border bg-card p-4 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span className="font-mono text-sm text-primary">{m.code}</span>
              <span className="mt-1 font-medium">{m.name}</span>
              <span className="mt-2 text-xs text-muted-foreground">
                {t("raCount", { n: m.ra.length })}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-5 text-sm text-muted-foreground">
          {t("notListed")}{" "}
          <Link href="/modulos" className="text-primary underline-offset-4 hover:underline">
            {t("notListedLink")}
          </Link>
        </p>
      </section>
    );
  }

  // ─────────────────── Paso 2 y 3: RA + mapa + plan ───────────────────
  return (
    <div className="space-y-12">
      <div className="grid items-start gap-8 lg:grid-cols-[1.15fr_1fr]">
        <section aria-labelledby="paso-ra">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="paso-ra" className="font-display text-xl font-semibold">
              {t("raTitle", { code: modulo.code })}
            </h2>
            <button
              type="button"
              onClick={() => setCode(null)}
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              {t("changeModule")}
            </button>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t("raHelp")}</p>

          <ol className="mt-5 space-y-3">
            {modulo.ra.map((r) => (
              <li key={r.code} className="rounded-lg border bg-card p-4">
                <p className="text-sm">
                  <span className="mr-2 font-mono text-primary">{r.code}</span>
                  {r.description}
                </p>
                <div
                  role="radiogroup"
                  aria-label={t("raAria", { code: r.code })}
                  className="mt-3 grid grid-cols-3 gap-2"
                >
                  {OPCIONES.map((o) => {
                    const activo = estados[r.code] === o;
                    return (
                      <button
                        key={o}
                        type="button"
                        role="radio"
                        aria-checked={activo}
                        onClick={() => setEstados((e) => ({ ...e, [r.code]: o }))}
                        className="rounded-md border px-2 py-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:text-sm"
                        style={
                          activo
                            ? {
                                color: COLOR[o],
                                borderColor: COLOR[o],
                                backgroundColor: `color-mix(in oklab, ${COLOR[o]} 14%, transparent)`,
                              }
                            : undefined
                        }
                      >
                        {t(`answer.${o}`)}
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Mapa en vivo: se va llenando con cada respuesta. */}
        <aside className="lg:sticky lg:top-20" aria-live="polite">
          <MapaDominio
            code={modulo.code}
            name={modulo.name}
            ras={mapa}
            statusLabels={statusLabels}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {completo ? t("mapDone") : t("mapProgress", { n: respondidos, total: modulo.ra.length })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("orientative")}</p>
        </aside>
      </div>

      {plan && (
        <section aria-labelledby="plan" className="animate-hud-in space-y-6">
          <div>
            <h2 id="plan" className="font-display text-2xl font-bold tracking-tight">
              {t("planTitle")}
            </h2>
            <p className="mt-1 text-muted-foreground">{t("planHelp")}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-medium">{t("examDate")}</span>
              <input
                type="date"
                min={sumarDias(hoy, 1)}
                value={examen}
                onChange={(e) => e.target.value > hoy && setExamen(e.target.value)}
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">{t("hoursWeek", { n: horas })}</span>
              <input
                type="range"
                min={1}
                max={20}
                value={horas}
                onChange={(e) => setHoras(Number(e.target.value))}
                className="w-full accent-[var(--primary)]"
              />
            </label>
          </div>

          {/* Veredicto */}
          <div
            className="rounded-xl border p-5"
            style={{
              borderColor: COLOR[plan.veredicto === "holgado" ? "verde" : plan.veredicto === "justo" ? "ambar" : "rojo"],
            }}
          >
            <p className="font-display text-lg font-semibold">
              {t(`verdict.${plan.veredicto}.title`, { dias: plan.dias })}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(`verdict.${plan.veredicto}.text`, {
                necesarias: plan.horasNecesarias,
                porSemana: Math.ceil(plan.horasNecesarias / Math.max(1, plan.dias / 7)),
                horas,
              })}
            </p>
          </div>

          {/* Semanas */}
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plan.semanas.map((s) => (
              <li key={s.semana} className="rounded-lg border bg-card p-4">
                <p className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold">{t("week", { n: s.semana })}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {t("from", { date: fechaCorta(s.inicio) })}
                  </span>
                </p>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {s.items.map((it) => (
                    <li key={it.code + it.repaso} className="flex justify-between gap-2">
                      <span>
                        <span className="font-mono text-primary">{it.code}</span>{" "}
                        {it.repaso ? t("review") : t("study")}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">{it.horas} h</span>
                    </li>
                  ))}
                  {s.simulacro && (
                    <li className="font-medium" style={{ color: "var(--secondary)" }}>
                      {t("mockExam")}
                    </li>
                  )}
                  {!s.items.length && !s.simulacro && (
                    <li className="text-muted-foreground">{t("buffer")}</li>
                  )}
                </ul>
              </li>
            ))}
          </ol>

          {/* Recomendación */}
          <div className="glow rounded-xl border border-primary/40 bg-card p-6">
            <p className="text-sm text-muted-foreground">{t("recTitle")}</p>
            <p className="mt-1 font-display text-2xl font-bold">
              {plan.recomendacion.kind === "sesion_1a1"
                ? t("recLoose", {
                    sesiones: plan.recomendacion.sesiones ?? 0,
                    flash: plan.recomendacion.flash ?? 0,
                  })
                : tp(`${plan.recomendacion.kind}.name`)}
            </p>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {t(`recWhy.${plan.recomendacion.kind}`)}
            </p>
            <p className="mt-4 font-mono text-3xl font-bold text-primary">
              {t("credits", { min: plan.recomendacion.min, max: plan.recomendacion.max })}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t("creditsNote")}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button className="glow" nativeButton={false} render={<Link href={`/modulos/${modulo.code}`} />}>
                {t("ctaMentors", { code: modulo.code })}
              </Button>
              <Button variant="secondary" nativeButton={false} render={<Link href="/precios" />}>
                {t("ctaPricing")}
              </Button>
              <Button variant="outline" onClick={copiarEnlace}>
                {copiado ? t("copied") : t("ctaShare")}
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {t("saveHint")}{" "}
              <Link href="/registro?rol=alumno" className="text-primary underline-offset-4 hover:underline">
                {t("saveLink")}
              </Link>
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
