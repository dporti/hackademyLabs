"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MapaDominio, type RaProgress } from "@/components/brand/mapa-dominio";
import { SectionLabel } from "@/components/brand/section-label";
import { ComingSoon } from "@/components/brand/coming-soon";
import { calcularPlan, type PlanInverso } from "@/lib/plan-inverso";
import { NIVEL_META, type NivelDominio } from "@/lib/dominio";
import type { ModuloDiagnosticable } from "@/lib/catalog";
import type { ProductKind, RaStatus } from "@/lib/db-types";
import { cn } from "@/lib/utils";
import { temaRa } from "@/lib/temas";
import { EVALUACIONES } from "@/lib/evaluaciones";

// Diagnóstico gratis SIN cuenta (docs: "widget ¿Qué módulo te preocupa? → mini
// diagnóstico → Mapa de Dominio → oferta"). Autoevaluación por RA → Mapa en vivo →
// plan inverso con fecha de examen → recomendación con créditos. Todo en el
// navegador; el estado vive en la URL para poder compartirlo.

// Autoevaluación con los 4 niveles del Mapa de Dominio (DISENO.md §4).
const OPCIONES: NivelDominio[] = ["aun_no", "con_ayuda", "casi", "domino"];
const PROGRESO: Record<NivelDominio, number> = { domino: 100, casi: 75, con_ayuda: 45, aun_no: 15 };
// El plan inverso trabaja con el semáforo (horas por estado): casi y con ayuda = ámbar.
const A_ESTADO: Record<NivelDominio, RaStatus> = { domino: "verde", casi: "ambar", con_ayuda: "ambar", aun_no: "rojo" };
// Codificación compacta en la URL, un carácter por RA ("-" sin responder). Compatible
// con los enlaces antiguos de 3 estados (v/a/r).
const ENC: Record<NivelDominio, string> = { domino: "v", casi: "c", con_ayuda: "a", aun_no: "r" };
const DEC: Record<string, NivelDominio> = { v: "domino", c: "casi", a: "con_ayuda", r: "aun_no" };
// Productos recomendables que aún no se pueden contratar.
const PROXIMAMENTE = new Set<ProductKind>(["rescate_48h", "plan_modulo", "simulacro"]);

export interface DiagnosticoInicial {
  modulo: string | null;
  estados: string; // "vva-r…"
  // Solo una parte del temario entra en el examen: "1" entra / "0" no, por RA. "" = todo.
  parte: string;
  examen: string | null;
  horas: number | null;
}

const VEREDICTO = {
  holgado: "border-tint-pass-border bg-tint-pass",
  justo: "border-tint-warning-border bg-tint-warning",
  noLlegas: "border-tint-sos-border bg-tint-sos",
} as const;

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
  const td = useTranslations("dominio");
  const tr = useTranslations("temasRa");
  const tema = (ra: string) => (code ? temaRa(tr, code, ra) : null);
  const ts = useTranslations("subtemasRa");
  const subtemas = (ra: string) => (code ? temaRa(ts, code, ra) : null);
  const tp = useTranslations("products");
  const locale = useLocale();

  const [code, setCode] = useState<string | null>(
    modulos.some((m) => m.code === inicial.modulo) ? inicial.modulo : null,
  );
  const modulo = modulos.find((m) => m.code === code) ?? null;
  const [estados, setEstados] = useState<Record<string, NivelDominio>>(() => {
    const m = modulos.find((x) => x.code === inicial.modulo);
    if (!m) return {};
    return Object.fromEntries(
      m.ra
        .map((r, i) => [r.code, DEC[inicial.estados[i] ?? ""]] as const)
        .filter(([, v]) => v),
    );
  });
  // ¿Entra todo el módulo o solo algunos temas (p. ej. un primer parcial)?
  const [soloParte, setSoloParte] = useState(
    () => !!modulos.find((x) => x.code === inicial.modulo) && inicial.parte.includes("0"),
  );
  const [fuera, setFuera] = useState<Set<string>>(() => {
    const m = modulos.find((x) => x.code === inicial.modulo);
    if (!m || !inicial.parte.includes("0")) return new Set();
    return new Set(m.ra.filter((_, i) => inicial.parte[i] === "0").map((r) => r.code));
  });
  const entra = (ra: string) => !soloParte || !fuera.has(ra);
  const alternar = (ra: string) =>
    setFuera((prev) => {
      const n = new Set(prev);
      if (n.has(ra)) n.delete(ra);
      else n.add(ra);
      return n;
    });
  // Atajos por evaluación: una evaluación está activa si todos sus temas entran. Si aún
  // entra todo, el primer clic deja solo esa evaluación; después, cada clic la suma o quita.
  const evaluaciones = (code && EVALUACIONES[code]) || [];
  const evActiva = (ras: string[]) => ras.every((ra) => !fuera.has(ra));
  const alternarEv = (ras: string[]) => {
    if (!modulo) return;
    if (fuera.size === 0) {
      setFuera(new Set(modulo.ra.map((r) => r.code).filter((c) => !ras.includes(c))));
      return;
    }
    setFuera((prev) => {
      const n = new Set(prev);
      if (evActiva(ras)) ras.forEach((ra) => n.add(ra));
      else ras.forEach((ra) => n.delete(ra));
      return n;
    });
  };
  const [examen, setExamen] = useState(
    inicial.examen && inicial.examen > hoy ? inicial.examen : sumarDias(hoy, 30),
  );
  const [horas, setHoras] = useState(
    inicial.horas && inicial.horas >= 1 && inicial.horas <= 20 ? inicial.horas : 5,
  );
  const [copiado, setCopiado] = useState(false);

  // Solo cuentan los temas que entran en el examen.
  const rasExamen = modulo ? modulo.ra.filter((r) => entra(r.code)) : [];
  const respondidos = rasExamen.filter((r) => estados[r.code]).length;
  const completo = !!modulo && rasExamen.length > 0 && respondidos === rasExamen.length;

  // Estado → URL (compartible, sin recargar).
  useEffect(() => {
    const p = new URLSearchParams();
    if (code) p.set("m", code);
    if (modulo) p.set("e", modulo.ra.map((r) => (estados[r.code] ? ENC[estados[r.code]] : "-")).join(""));
    if (modulo && soloParte) p.set("p", modulo.ra.map((r) => (fuera.has(r.code) ? "0" : "1")).join(""));
    if (completo) {
      p.set("x", examen);
      p.set("h", String(horas));
    }
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [code, modulo, estados, completo, examen, horas, soloParte, fuera]);

  const mapa: RaProgress[] = modulo
    ? rasExamen.map((r) => ({
        code: r.code,
        label: tema(r.code) ?? "",
        status: estados[r.code] ? A_ESTADO[estados[r.code]] : "ambar",
        progress: estados[r.code] ? PROGRESO[estados[r.code]] : 0,
        nivel: estados[r.code],
        pendiente: !estados[r.code],
      }))
    : [];

  // Sin useMemo: el React Compiler ya memoriza el cálculo.
  const plan: PlanInverso | null =
    completo && modulo
      ? calcularPlan({
          ras: rasExamen,
          estados: Object.fromEntries(Object.entries(estados).map(([k, v]) => [k, A_ESTADO[v]])),
          hoy,
          examen,
          horasSemana: horas,
        })
      : null;

  const fechaCorta = (d: string) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(
      new Date(`${d}T00:00:00Z`),
    );

  async function copiarEnlace() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  }

  const btnPrimary =
    "inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-5 font-bold text-primary-foreground transition-colors hover:bg-primary/85";
  const btnOutline =
    "inline-flex min-h-12 items-center justify-center rounded-xl border border-[#3a3f5c] px-5 font-medium transition-colors hover:border-primary";

  // ───────────────────────── Paso 1: módulo ─────────────────────────
  if (!modulo) {
    return (
      <section aria-labelledby="paso-modulo">
        <h2 id="paso-modulo" className="font-heading text-3xl font-bold">
          {t("pickTitle")}
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modulos.map((m) => (
            <button
              key={m.code}
              type="button"
              onClick={() => {
                setCode(m.code);
                setEstados({});
                setSoloParte(false);
                setFuera(new Set());
              }}
              className="card-interactive flex min-h-28 flex-col items-start rounded-2xl border bg-card p-5 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span className="font-mono text-sm font-semibold text-primary">{m.code}</span>
              <span className="mt-1.5 font-heading text-lg font-semibold">{m.name}</span>
              <span className="mt-auto pt-3 text-xs text-label">{t("raCount", { n: m.ra.length })}</span>
            </button>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
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
    <div className="space-y-14">
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1.15fr_1fr]">
        <section aria-labelledby="paso-ra">
          <p className="font-mono text-xs font-semibold tracking-[0.2em] text-primary uppercase">
            {t("progress", { n: respondidos, total: rasExamen.length })} · {modulo.code} {modulo.name}
          </p>
          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="paso-ra" className="font-heading text-3xl font-bold">
              {t("raTitle", { code: modulo.code })}
            </h2>
            <button
              type="button"
              onClick={() => setCode(null)}
              className="min-h-11 text-sm text-primary underline-offset-4 hover:underline"
            >
              {t("changeModule")}
            </button>
          </div>
          <p className="mt-2 text-muted-foreground">{t("raHelp")}</p>

          <fieldset className="mt-6 rounded-2xl border bg-card p-5">
            <legend className="sr-only">{t("scopeTitle")}</legend>
            <p className="font-heading text-lg font-semibold">{t("scopeTitle")}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {([false, true] as const).map((parte) => (
                <label
                  key={String(parte)}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] border px-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                    soloParte === parte ? "border-primary bg-tint-primary text-foreground" : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  <input
                    type="radio"
                    name="alcance"
                    checked={soloParte === parte}
                    onChange={() => setSoloParte(parte)}
                    className="accent-[var(--primary)]"
                  />
                  {parte ? t("scopePart") : t("scopeAll")}
                </label>
              ))}
            </div>
            {soloParte && evaluaciones.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium">{t("byTerm")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {evaluaciones.map((ras, i) => {
                    const activa = fuera.size > 0 && evActiva(ras);
                    return (
                      <button
                        key={i}
                        type="button"
                        aria-pressed={activa}
                        onClick={() => alternarEv(ras)}
                        className={cn(
                          "min-h-10 rounded-[10px] border px-3 text-sm transition-colors",
                          activa
                            ? "border-primary bg-tint-primary text-foreground"
                            : "border-border text-muted-foreground hover:border-primary/60 hover:text-foreground",
                        )}
                      >
                        {t("term", { n: i + 1 })}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-label">{t("byTermNote")}</p>
              </div>
            )}
            {soloParte && <p className="mt-3 text-sm text-muted-foreground">{t("scopePartHelp")}</p>}
          </fieldset>

          <ol className="mt-4 space-y-3">
            {modulo.ra.map((r) => (
              <li key={r.code} className={cn("rounded-2xl border bg-card p-5", !entra(r.code) && "opacity-60")}>
                <p className="flex items-baseline justify-between gap-3">
                  <span className="font-heading text-lg font-semibold">{tema(r.code) ?? r.description}</span>
                  <span className="shrink-0 font-mono text-xs text-label">{r.code}</span>
                </p>
                {subtemas(r.code) && <p className="mt-1 text-sm text-muted-foreground">{subtemas(r.code)}</p>}
                {soloParte && (
                  <label className="mt-3 flex min-h-10 w-fit cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={entra(r.code)}
                      onChange={() => alternar(r.code)}
                      className="size-4 accent-[var(--primary)]"
                    />
                    {t("inExam")}
                  </label>
                )}
                {entra(r.code) && (
                <div
                  role="radiogroup"
                  aria-label={t("raAria", { code: r.code })}
                  className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"
                >
                  {OPCIONES.map((o) => {
                    const activo = estados[r.code] === o;
                    const { color, glyph } = NIVEL_META[o];
                    return (
                      <button
                        key={o}
                        type="button"
                        role="radio"
                        aria-checked={activo}
                        onClick={() => setEstados((e) => ({ ...e, [r.code]: o }))}
                        className={cn(
                          "flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] border px-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                          !activo && "border-border text-muted-foreground hover:text-foreground",
                        )}
                        style={
                          activo
                            ? {
                                color,
                                borderColor: color,
                                backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)`,
                              }
                            : undefined
                        }
                      >
                        <span aria-hidden>{glyph}</span>
                        {td(`nivel.${o}`)}
                      </button>
                    );
                  })}
                </div>
                )}
              </li>
            ))}
          </ol>
        </section>

        {/* Mapa en vivo: se va llenando con cada respuesta. */}
        <aside className="lg:sticky lg:top-24" aria-live="polite">
          <p className="mb-3 font-mono text-xs font-semibold tracking-[0.2em] text-label uppercase">
            {completo ? t("mapDone") : t("mapDrawing")}
          </p>
          <MapaDominio code={modulo.code} name={modulo.name} ras={mapa} nota={false} />
          <p className="mt-3 text-xs text-muted-foreground">
            {completo ? t("orientative") : t("mapProgress", { n: respondidos, total: rasExamen.length })}
          </p>
        </aside>
      </div>

      {plan && (
        <section aria-labelledby="plan" className="animate-hud-in space-y-6">
          <div>
            <SectionLabel>
              {t("resultLabel")} · {modulo.code} {modulo.name}
            </SectionLabel>
            <h2 id="plan" className="mt-3 font-heading text-[32px] leading-tight font-bold tracking-tight sm:text-[42px]">
              {t("planTitle")}
            </h2>
            <p className="mt-2 text-muted-foreground">{t("planHelp")}</p>
          </div>

          <div className="grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">{t("examDate")}</span>
              <input
                type="date"
                min={sumarDias(hoy, 1)}
                value={examen}
                onChange={(e) => e.target.value > hoy && setExamen(e.target.value)}
                className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-[15px] [color-scheme:dark]"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">{t("hoursWeek", { n: horas })}</span>
              <input
                type="range"
                min={1}
                max={20}
                value={horas}
                onChange={(e) => setHoras(Number(e.target.value))}
                className="h-12 w-full accent-[var(--primary)]"
              />
            </label>
          </div>

          {/* Veredicto */}
          <div className={`rounded-2xl border p-6 ${VEREDICTO[plan.veredicto]}`}>
            <p className="font-heading text-xl font-semibold">
              {t(`verdict.${plan.veredicto}.title`, { dias: plan.dias })}
            </p>
            <p className="mt-1.5 text-muted-foreground">
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
              <li key={s.semana} className="rounded-2xl border bg-card p-5">
                <p className="flex items-baseline justify-between gap-2">
                  <span className="font-heading font-semibold">{t("week", { n: s.semana })}</span>
                  <span className="font-mono text-xs text-label">{t("from", { date: fechaCorta(s.inicio) })}</span>
                </p>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {s.items.map((it) => (
                    <li key={it.code + it.repaso} className="border-b border-divider pb-2 last:border-0 last:pb-0">
                      <p className="flex justify-between gap-2">
                        <span>
                          <span className={it.repaso ? "text-label" : "text-primary"}>
                            {it.repaso ? t("review") : t("study")}:
                          </span>{" "}
                          <span className="font-medium">{tema(it.code) ?? it.code}</span>
                        </span>
                        <span className="shrink-0 font-mono text-xs text-label">{it.horas} h</span>
                      </p>
                      {!it.repaso && subtemas(it.code) && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{subtemas(it.code)}</p>
                      )}
                    </li>
                  ))}
                  {s.simulacro && <li className="font-medium text-warning">{t("mockExam")}</li>}
                  {!s.items.length && !s.simulacro && <li className="text-muted-foreground">{t("buffer")}</li>}
                </ul>
              </li>
            ))}
          </ol>

          {/* Recomendación */}
          <div className="glow rounded-3xl border border-tint-primary-border bg-tint-primary p-6 sm:p-8">
            <p className="flex flex-wrap items-center gap-2 font-mono text-xs font-semibold tracking-[0.2em] text-primary uppercase">
              {t("recTitle")}
              {PROXIMAMENTE.has(plan.recomendacion.kind) && <ComingSoon />}
            </p>
            <p className="mt-2 font-heading text-2xl font-bold sm:text-3xl">
              {plan.recomendacion.kind === "sesion_1a1"
                ? t("recLoose", {
                    sesiones: plan.recomendacion.sesiones ?? 0,
                    flash: plan.recomendacion.flash ?? 0,
                  })
                : tp(`${plan.recomendacion.kind}.name`)}
            </p>
            <p className="mt-2 max-w-2xl text-muted-foreground">{t(`recWhy.${plan.recomendacion.kind}`)}</p>
            <p className="mt-4 font-mono text-3xl font-semibold text-primary">
              {t("credits", { min: plan.recomendacion.min, max: plan.recomendacion.max })}
            </p>
            <p className="mt-1 text-xs text-label">{t("creditsNote")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={`/modulos/${modulo.code}`} className={`${btnPrimary} glow`}>
                {t("ctaMentors", { code: modulo.code })}
              </Link>
              <Link href={`/pregunta?m=${modulo.code}`} className={btnOutline}>
                {t("ctaFreeQuestion")}
              </Link>
              <Link href="/precios" className={btnOutline}>
                {t("ctaPricing")}
              </Link>
              <button type="button" onClick={copiarEnlace} className={btnOutline} aria-live="polite">
                {copiado ? t("copied") : t("ctaShare")}
              </button>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
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
