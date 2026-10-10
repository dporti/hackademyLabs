import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { evaluarAlumno, type Alerta, type EstadoAlumno } from "@/lib/tutor";
import type { Checkin, TutorStudentRow } from "@/lib/db-types";
import { cn } from "@/lib/utils";

// Panel del tutor de referencia de Tutor247 (maqueta PanelTutor.html): cartera con
// estado y alertas calculadas de datos reales (actividad, Mapa, exámenes, informes),
// y los check-ins de hoy. Lo que dependa de Bit (frustración detectada) no se muestra.

export type FiltroCartera = "todos" | "familia" | "autonomo" | "riesgo";
export const FILTROS: FiltroCartera[] = ["todos", "familia", "autonomo", "riesgo"];

const ESTADO_META: Record<EstadoAlumno, { color: string; glyph: string }> = {
  va_bien: { color: "var(--ra-verde)", glyph: "●" },
  atencion: { color: "var(--ra-ambar)", glyph: "◐" },
  riesgo: { color: "var(--ra-rojo)", glyph: "○" },
};

export async function EstadoBadge({ estado }: { estado: EstadoAlumno }) {
  const t = await getTranslations("tutorPanel");
  const m = ESTADO_META[estado];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{
        color: m.color,
        borderColor: `color-mix(in oklab, ${m.color} 40%, transparent)`,
        backgroundColor: `color-mix(in oklab, ${m.color} 12%, transparent)`,
      }}
    >
      <span aria-hidden>{m.glyph}</span>
      {t(`estado.${estado}`)}
    </span>
  );
}

export async function alertaTexto(a: Alerta) {
  const t = await getTranslations("tutorPanel");
  switch (a.kind) {
    case "sinActividad":
      return t("alert.sinActividad", { n: a.days });
    case "examenCerca":
      return t("alert.examenCerca", { code: a.code, n: a.days, flojos: a.flojos });
    default:
      return t(`alert.${a.kind}`);
  }
}

export async function TutorPanel({
  locale,
  cartera,
  checkins,
  filtro,
  hoy,
  lunes,
}: {
  locale: string;
  cartera: TutorStudentRow[];
  checkins: Checkin[];
  filtro: FiltroCartera;
  hoy: string;
  lunes: string;
}) {
  const t = await getTranslations("tutorPanel");
  const filas = await Promise.all(
    cartera.map(async (r) => {
      const ev = evaluarAlumno(r, hoy, lunes);
      return { r, ...ev, textos: await Promise.all(ev.alertas.map(alertaTexto)) };
    }),
  );
  const cuenta = (e: EstadoAlumno) => filas.filter((f) => f.estado === e).length;
  const conFamilia = cartera.filter((r) => r.has_family);
  const informesListos = conFamilia.filter((r) => r.last_report && r.last_report >= lunes).length;
  const nombre = new Map(cartera.map((r) => [r.student_id, r.full_name ?? "—"]));

  const visibles = filas.filter(({ r, estado }) =>
    filtro === "familia" ? r.mode === "familia" : filtro === "autonomo" ? r.mode === "autonomo" : filtro === "riesgo" ? estado === "riesgo" : true,
  );

  const hora = (iso: string) =>
    new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }).format(new Date(iso));
  const cuando = (iso: string) =>
    new Intl.DateTimeFormat(locale, {
      weekday: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Madrid",
    }).format(new Date(iso));
  const diaMadrid = (iso: string) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date(iso));
  const deHoy = checkins.filter((c) => diaMadrid(c.scheduled_at) === hoy);

  const cifras = [
    {
      label: t("statCartera"),
      value: cartera.length,
      sub: t("carteraSub", {
        familia: cartera.filter((r) => r.mode === "familia").length,
        autonomo: cartera.filter((r) => r.mode === "autonomo").length,
      }),
      tono: "primary",
    },
    { label: t("estado.va_bien"), value: cuenta("va_bien"), tono: "pass" },
    { label: t("estado.atencion"), value: cuenta("atencion"), tono: "warning" },
    { label: t("estado.riesgo"), value: cuenta("riesgo"), tono: "sos" },
    { label: t("statInformes"), value: `${informesListos}/${conFamilia.length}`, sub: t("informesSub"), tono: "primary" },
  ] as const;
  const TONO = {
    primary: "text-primary",
    pass: "text-accent-pass",
    warning: "text-warning",
    sos: "text-sos-text",
  } as const;

  return (
    <div className="mt-8 space-y-12">
      <p className="text-muted-foreground">{t("subtitle", { hoy: deHoy.length })}</p>

      <section aria-label={t("statsAria")} className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {cifras.map((c, i) => (
          <div
            key={c.label}
            className={`rounded-2xl border p-5 ${i === 0 ? "glow border-tint-primary-border bg-tint-primary" : "bg-card"}`}
          >
            <p className="font-mono text-xs tracking-[0.15em] text-label uppercase">{c.label}</p>
            <p className={`mt-2 font-mono text-3xl font-semibold ${TONO[c.tono]}`}>{c.value}</p>
            {"sub" in c && c.sub && <p className="mt-0.5 text-sm text-muted-foreground">{c.sub}</p>}
          </div>
        ))}
      </section>

      <div className="grid gap-8">
        {/* ───────────────────────── Cartera ───────────────────────── */}
        <section aria-labelledby="cartera">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="cartera" className="font-heading text-2xl font-bold">
              {t("carteraTitle")}
            </h2>
            <nav aria-label={t("filtersAria")} className="flex flex-wrap gap-1.5">
              {FILTROS.map((f) => (
                <Link
                  key={f}
                  href={f === "todos" ? "/panel" : `/panel?f=${f}`}
                  aria-current={f === filtro ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-10 items-center rounded-[10px] border px-3 text-sm",
                    f === filtro ? "border-tint-primary-border bg-tint-primary text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t(`filter.${f}`)}
                </Link>
              ))}
            </nav>
          </div>

          {cartera.length === 0 ? (
            <p className="mt-4 text-muted-foreground">{t("empty")}</p>
          ) : visibles.length === 0 ? (
            <p className="mt-4 text-muted-foreground">{t("emptyFilter")}</p>
          ) : (
            <div className="mt-5 overflow-x-auto rounded-2xl border bg-card">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-divider font-mono text-[11px] tracking-[0.15em] text-label uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">{t("col.alumno")}</th>
                    <th scope="col" className="px-4 py-3 font-medium">{t("col.modo")}</th>
                    <th scope="col" className="px-4 py-3 font-medium">{t("col.estado")}</th>
                    <th scope="col" className="px-4 py-3 font-medium">{t("col.dias")}</th>
                    <th scope="col" className="px-4 py-3 font-medium">{t("col.checkin")}</th>
                    <th scope="col" className="px-4 py-3 font-medium">{t("col.alerta")}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map(({ r, estado, textos }) => (
                    <tr key={r.student_id} className="border-b border-divider last:border-0">
                      <td className="px-4 py-3">
                        <Link href={`/panel/alumno/${r.student_id}`} className="font-semibold hover:text-primary hover:underline">
                          {r.full_name || "—"}
                        </Link>
                        <p className="text-xs text-label">
                          {r.next_exam_code ? t("examIn", { code: r.next_exam_code }) : t("noExam")}
                          {r.is_minor && ` · ${t("minor")}`}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{t(`mode.${r.mode}`)}</td>
                      <td className="px-4 py-3">
                        <EstadoBadge estado={estado} />
                      </td>
                      <td className="px-4 py-3 font-mono">{r.active_days_7}/7</td>
                      <td className="px-4 py-3 text-muted-foreground first-letter:uppercase">
                        {r.next_checkin ? cuando(r.next_checkin) : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{textos[0] ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ───────────────────────── Hoy ───────────────────────── */}
        <aside className="grid gap-4 md:grid-cols-2">
          <section aria-labelledby="hoy" className="rounded-2xl border bg-card p-5">
            <div className="flex items-baseline justify-between gap-2">
              <h2 id="hoy" className="font-heading text-xl font-bold">
                {t("todayTitle")}
              </h2>
              <Link href="/panel/checkins" className="text-sm font-semibold text-primary hover:underline">
                {t("allCheckins")} →
              </Link>
            </div>
            {deHoy.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("todayEmpty")}</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {deHoy.map((c) => (
                  <li key={c.id} className="flex gap-3">
                    <span className="w-12 shrink-0 font-mono text-sm text-primary">{hora(c.scheduled_at)}</span>
                    <span className="min-w-0">
                      <Link href={`/panel/alumno/${c.student_id}`} className="font-medium hover:underline">
                        {nombre.get(c.student_id)} · {t(`kind.${c.kind}`)}
                      </Link>
                      {c.topic && <span className="block text-sm text-muted-foreground">{c.topic}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="protocolo" className="rounded-2xl border border-tint-warning-border bg-tint-warning p-5">
            <h2 id="protocolo" className="font-mono text-xs font-semibold tracking-[0.2em] text-warning uppercase">
              {t("protocolTitle")}
            </h2>
            <p className="mt-2 text-sm">{t("protocolText")}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
