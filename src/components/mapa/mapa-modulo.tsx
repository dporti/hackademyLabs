import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { RaBadge } from "@/components/brand/ra-badge";
import { AssessRaForm } from "@/components/mapa/assess-ra-form";
import { updatePlanAction } from "@/app/actions/mapa";
import { Button } from "@/components/ui/button";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field";
import { NIVELES, NIVEL_META } from "@/lib/dominio";
import { NIVEL_A_ESTADO, resumenMapa, type MapaModulo } from "@/lib/mapa";
import { calcularPlan, diasHasta } from "@/lib/plan-inverso";
import { temaRa } from "@/lib/temas";
import type { RaStatus } from "@/lib/db-types";

// Mapa de Dominio guardado de UN módulo (maqueta Mapa.html): cifras, RA por RA con su
// evidencia y sello, y plan inverso hasta el examen. Lo usan el alumno (edita fecha y
// horas), el tutor (valora RA) y la familia (solo lectura).

const ENC = { domino: "v", casi: "c", con_ayuda: "a", aun_no: "r" } as const;
const HORAS_DEFECTO = 5;

export async function MapaModuloView({
  locale,
  modulo,
  hoy,
  viewer,
  studentId,
}: {
  locale: string;
  modulo: MapaModulo;
  hoy: string; // AAAA-MM-DD (servidor)
  viewer: "alumno" | "tutor" | "familia";
  studentId: string;
}) {
  const t = await getTranslations("mapa");
  const td = await getTranslations("diagnostico");
  const tr = await getTranslations("temasRa");
  const tn = await getTranslations("dominio");
  const r = resumenMapa(modulo);
  const fechaDia = (d: string) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
  const fechaEvid = (iso: string) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "Europe/Madrid" }).format(new Date(iso));
  const tema = (code: string) => temaRa(tr, modulo.code, code);
  const dias = modulo.exam_date ? diasHasta(hoy, modulo.exam_date) : null;
  const horas = modulo.hours_week ?? HORAS_DEFECTO;

  // Enlace para rehacer la autoevaluación con lo guardado como punto de partida.
  const enc = modulo.ras.map((x) => (x.nivel ? ENC[x.nivel] : "-")).join("");
  const diagHref = `/diagnostico?m=${modulo.code}&e=${enc}${modulo.exam_date ? `&x=${modulo.exam_date}&h=${horas}` : ""}`;

  const plan =
    modulo.exam_date && dias != null && dias > 0 && r.evaluados > 0
      ? calcularPlan({
          ras: modulo.ras.map((x) => ({ code: x.code })),
          estados: Object.fromEntries(
            modulo.ras.filter((x) => x.nivel).map((x) => [x.code, NIVEL_A_ESTADO[x.nivel!]]),
          ) as Record<string, RaStatus>,
          hoy,
          examen: modulo.exam_date,
          horasSemana: horas,
        })
      : null;
  const cifras = [
    { label: t("statPrep"), value: `${r.preparacion} %`, sub: t("statPrepSub", { n: r.evaluados, total: modulo.ras.length }) },
    {
      label: t("statExam"),
      value: modulo.exam_date ? fechaDia(modulo.exam_date) : "—",
      sub: dias != null && dias >= 0 ? t("daysLeft", { n: dias }) : t("noExam"),
    },
    { label: t("statSeals"), value: t("sealsValue", { n: r.sellos, total: modulo.ras.length }), sub: viewer === "alumno" ? t("statSealsSub") : t("statSealsSubOther") },
    {
      label: t("statPriority"),
      value: r.prioridad.length ? r.prioridad.map((x) => x.code).join(" · ") : "—",
      sub: r.prioridad.length
        ? r.prioridad.map((x) => tema(x.code) ?? x.description).join(" · ")
        : r.evaluados
          ? t("priorityNone")
          : t("priorityUnknown"),
    },
  ];

  return (
    <div className="space-y-10">
      <section aria-label={t("statsAria")} className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cifras.map((c, i) => (
          <div
            key={c.label}
            className={`rounded-2xl border p-5 ${i === 0 ? "glow border-tint-primary-border bg-tint-primary" : "bg-card"}`}
          >
            <p className="font-mono text-xs tracking-[0.15em] text-label uppercase">{c.label}</p>
            <p className="mt-2 font-mono text-2xl font-semibold break-words text-primary">{c.value}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{c.sub}</p>
          </div>
        ))}
      </section>

      {/* ───────────────────────── RA por RA ───────────────────────── */}
      <section aria-labelledby={`ras-${modulo.code}`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id={`ras-${modulo.code}`} className="font-heading text-2xl font-bold">
            {t("byRa")}
          </h2>
          <ul className="flex flex-wrap gap-3 text-xs" aria-label={t("legendAria")}>
            {NIVELES.map((n) => (
              <li key={n} className="flex items-center gap-1" style={{ color: NIVEL_META[n].color }}>
                <span aria-hidden>{NIVEL_META[n].glyph}</span>
                {tn(`nivel.${n}`)}
              </li>
            ))}
          </ul>
        </div>

        {r.evaluados === 0 && (
          <div className="mt-4 rounded-2xl border border-dashed p-5">
            <p className="text-muted-foreground">{viewer === "alumno" ? t("emptyStudent") : t("emptyOther")}</p>
            {viewer === "alumno" && (
              <Link
                href={diagHref}
                className="mt-3 inline-flex min-h-11 items-center rounded-[10px] bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/85"
              >
                {t("doDiagnostic")}
              </Link>
            )}
          </div>
        )}

        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {modulo.ras.map((ra) => (
            <li key={ra.id} className="rounded-2xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs font-semibold text-primary">{ra.code}</p>
                  <p className="mt-0.5 font-semibold leading-snug">{tema(ra.code) ?? ra.description}</p>
                </div>
                {ra.nivel ? (
                  <RaBadge nivel={ra.nivel} />
                ) : (
                  <span className="rounded-md border px-2 py-0.5 text-xs text-label">{t("notAssessed")}</span>
                )}
              </div>
              <div
                className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={ra.progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${ra.code} ${ra.progress} %`}
              >
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${ra.progress}%`,
                    backgroundColor: ra.nivel ? NIVEL_META[ra.nivel].color : "var(--label)",
                  }}
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-label">
                <span>
                  {ra.evidencia
                    ? t("evidence", { kind: t(`kind.${ra.evidencia.kind}`), date: fechaEvid(ra.evidencia.at) })
                    : t("noEvidence")}
                  {ra.weight != null && ` · ${t("weight", { n: ra.weight })}`}
                </span>
                {ra.sealed ? (
                  <span className="inline-flex items-center gap-1 font-medium text-accent-pass">
                    <Check aria-hidden className="size-3.5" strokeWidth={3} />
                    {t("sealed")}
                  </span>
                ) : (
                  <span>{t("notSealed")}</span>
                )}
              </div>
              {viewer === "alumno" && (
                <Link
                  href={`/panel/bit?m=${modulo.code}&quiz=${ra.id}`}
                  className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-primary hover:underline"
                >
                  {t("quizRa")} →
                </Link>
              )}
              {viewer === "tutor" && (
                <AssessRaForm
                  locale={locale}
                  studentId={studentId}
                  raId={ra.id}
                  nivel={ra.nivel}
                  sealed={ra.sealed}
                />
              )}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-label">
          {t("orientative")} {viewer === "alumno" ? t("sealHelp") : t("sealHelpOther")}
        </p>
        {viewer === "alumno" && r.evaluados > 0 && (
          <Link href={diagHref} className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
            {t("redoDiagnostic")} →
          </Link>
        )}
      </section>

      {/* ───────────────────────── Plan inverso ───────────────────────── */}
      <section aria-labelledby={`plan-${modulo.code}`} className="rounded-3xl border bg-card p-5 sm:p-7">
        <h2 id={`plan-${modulo.code}`} className="font-heading text-2xl font-bold">
          {t("planTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("planHelp")}</p>

        {viewer === "alumno" && (
          <form action={updatePlanAction} className="mt-5 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="modulo_id" value={modulo.modulo_id} />
            <label className="block space-y-1">
              <span className={LABEL_CLASS}>{t("examDate")}</span>
              <input type="date" name="exam_date" defaultValue={modulo.exam_date ?? ""} min={hoy} className={INPUT_CLASS} />
            </label>
            <label className="block space-y-1">
              <span className={LABEL_CLASS}>{t("hoursWeek")}</span>
              <input type="number" name="hours_week" min={1} max={40} defaultValue={horas} className={INPUT_CLASS} />
            </label>
            <Button type="submit" className="h-11 rounded-[10px] px-5 font-semibold">
              {t("recalc")}
            </Button>
          </form>
        )}

        {!plan ? (
          <p className="mt-5 text-sm text-muted-foreground">
            {!modulo.exam_date ? t("planNeedsDate") : r.evaluados === 0 ? t("planNeedsMap") : t("planPast")}
          </p>
        ) : (
          <>
            <p className="mt-5 font-medium">
              {td(`verdict.${plan.veredicto}.title`, { dias: plan.dias })}{" "}
              <span className="font-mono text-sm text-label">
                {t("hoursSummary", { necesarias: plan.horasNecesarias, disponibles: plan.horasDisponibles })}
              </span>
            </p>
            <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {plan.semanas.map((s, i) => (
                <li
                  key={s.semana}
                  className={`rounded-2xl border p-4 ${i === 0 ? "border-tint-primary-border bg-tint-primary" : "bg-background"}`}
                >
                  <p className="flex items-baseline justify-between gap-2">
                    <span className="font-heading font-semibold">{td("week", { n: s.semana })}</span>
                    <span className="font-mono text-xs text-label">
                      {i === 0 ? t("now") : td("from", { date: fechaDia(s.inicio) })}
                    </span>
                  </p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {s.items.map((it) => (
                      <li key={it.code + it.repaso} className="flex justify-between gap-2">
                        <span>
                          <span className={it.repaso ? "text-label" : "text-primary"}>
                            {it.repaso ? td("review") : td("study")}:
                          </span>{" "}
                          {tema(it.code) ?? it.code}
                        </span>
                        <span className="shrink-0 font-mono text-xs text-label">{it.horas} h</span>
                      </li>
                    ))}
                    {s.simulacro && <li className="font-medium text-warning">{td("mockExam")}</li>}
                    {!s.items.length && !s.simulacro && <li className="text-muted-foreground">{td("buffer")}</li>}
                  </ul>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>
    </div>
  );
}

