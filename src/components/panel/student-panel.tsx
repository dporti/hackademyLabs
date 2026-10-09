import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { removeModuloAction } from "@/app/actions/student";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BuyPackForm } from "@/components/panel/buy-pack-form";
import { AddModuloForm } from "@/components/panel/add-modulo-form";
import { StudentFamily } from "@/components/panel/student-family";
import { WeeklyReportCard } from "@/components/panel/weekly-report-card";
import type { StudentDashboard } from "@/lib/student";
import type { getPendientesAlumno } from "@/lib/consumo";
import type { Modulo, Pack } from "@/lib/db-types";

// Panel del alumno (F1.4): saldo, compra mock de packs, módulos que prepara e
// historial de movimientos del ledger.
export async function StudentPanel({
  locale,
  dashboard,
  pendientes,
  packs,
  catalogo,
}: {
  locale: string;
  dashboard: StudentDashboard;
  pendientes: Awaited<ReturnType<typeof getPendientesAlumno>>;
  packs: Pack[];
  catalogo: Pick<Modulo, "code" | "name">[];
}) {
  const t = await getTranslations("panel");
  const tp = await getTranslations("pricing");
  const tc = await getTranslations("consumo");
  const tprod = await getTranslations("products");
  const { balance, ledger, modulos } = dashboard;

  const eur = (n: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(n);
  const fecha = (iso: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso));
  // Las fechas de examen son `date` (sin hora): formatear en UTC evita el desfase de día.
  const fechaDia = (d: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(
      new Date(d),
    );

  return (
    <div className="mt-8 space-y-10">
      {/* ───────────────────────────── Saldo ───────────────────────────── */}
      <section
        aria-labelledby="saldo"
        className="hud-grid glow rounded-xl border border-primary/30 bg-card p-6"
      >
        <h2 id="saldo" className="text-sm font-medium text-muted-foreground">
          {t("balanceTitle")}
        </h2>
        <p className="mt-2 font-mono text-5xl font-bold text-primary">
          {balance}
          <span className="ml-2 text-base font-normal text-muted-foreground">
            {t("creditsUnit")}
          </span>
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{tp("creditsNote")}</p>
      </section>

      {/* ─────────────────────────── Pedir ayuda ─────────────────────────── */}
      <section aria-labelledby="ayuda">
        <h2 id="ayuda" className="font-display text-xl font-semibold">
          {tc("helpTitle")}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Link
            href="/panel/tickets"
            className="rounded-xl border bg-card p-5 transition hover:border-primary/50"
          >
            <span className="font-semibold">{tc("ticketsTitle")}</span>
            <p className="mt-1 text-sm text-muted-foreground">{tc("ticketsCardHelp")}</p>
            {pendientes.ticketsRespondidos > 0 && (
              <p className="mt-2 font-mono text-xs text-primary">
                {tc("answeredCount", { n: pendientes.ticketsRespondidos })}
              </p>
            )}
          </Link>
          <Link
            href="/panel/sesiones"
            className="rounded-xl border bg-card p-5 transition hover:border-primary/50"
          >
            <span className="font-semibold">{tc("sessionsTitle")}</span>
            <p className="mt-1 text-sm text-muted-foreground">{tc("sessionsCardHelp")}</p>
            {pendientes.sesionesProximas > 0 && (
              <p className="mt-2 font-mono text-xs text-primary">
                {tc("upcomingCount", { n: pendientes.sesionesProximas })}
              </p>
            )}
          </Link>
        </div>
      </section>

      {/* ─────────────────────────── Comprar packs ─────────────────────────── */}
      <section aria-labelledby="packs">
        <h2 id="packs" className="font-display text-xl font-semibold">
          {t("buyTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("mockNotice")}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {packs.map((p) => {
            const featured = p.slug === "modulo";
            return (
              <div
                key={p.id}
                className={`flex flex-col rounded-xl border bg-card p-5 ${
                  featured ? "border-primary/40" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{p.name}</span>
                  {p.bonus_pct > 0 && (
                    <Badge variant="secondary">
                      {tp("bonus", { pct: p.bonus_pct })}
                    </Badge>
                  )}
                </div>
                <p className="mt-3 font-display text-2xl font-bold">
                  {eur(p.price_eur)}
                </p>
                <p className="mt-1 font-mono text-sm text-primary">
                  {tp("credits", { n: p.credits })}
                </p>
                <div className="mt-auto">
                  <BuyPackForm locale={locale} slug={p.slug} featured={featured} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─────────────────────────── Mis módulos ─────────────────────────── */}
      <section aria-labelledby="mis-modulos">
        <h2 id="mis-modulos" className="font-display text-xl font-semibold">
          {t("modulesTitle")}
        </h2>
        {modulos.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("modulesEmpty")}</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {modulos.map((sm) => (
              <li
                key={sm.modulo_id}
                className="flex items-start justify-between gap-3 rounded-lg border bg-card p-4"
              >
                <div>
                  <Link
                    href={`/modulos/${sm.modulo.code}`}
                    className="font-mono text-sm text-primary hover:underline"
                  >
                    {sm.modulo.code}
                  </Link>
                  <p className="mt-1 font-medium">{sm.modulo.name}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {sm.exam_date
                      ? t("examOn", { date: fechaDia(sm.exam_date) })
                      : t("noExamDate")}
                  </p>
                </div>
                <form action={removeModuloAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="modulo_id" value={sm.modulo_id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    aria-label={t("removeModuleAria", { code: sm.modulo.code })}
                  >
                    {t("removeModule")}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <AddModuloForm locale={locale} modulos={catalogo} />
      </section>

      {/* ───────────────────────────── Familia ───────────────────────────── */}
      <StudentFamily locale={locale} family={dashboard.family} />

      {/* ─────────────────────── Informes semanales ─────────────────────── */}
      {dashboard.reports.length > 0 && (
        <section aria-labelledby="informes" data-accent="tutor" className="rounded-2xl border border-tint-secondary-border bg-tint-secondary p-5">
          <h2 id="informes" className="font-display text-xl font-semibold">
            {t("reportsTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("reportsHelp")}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {dashboard.reports.slice(0, 2).map((r) => (
              <WeeklyReportCard key={r.id} report={r} studentName={t("you")} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {/* ───────────────────────── Historial ledger ───────────────────────── */}
      <section aria-labelledby="historial">
        <h2 id="historial" className="font-display text-xl font-semibold">
          {t("historyTitle")}
        </h2>
        {ledger.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("historyEmpty")}</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">{t("colDate")}</th>
                  <th className="px-4 py-2 font-medium">{t("colConcept")}</th>
                  <th className="px-4 py-2 font-medium">{t("colExpires")}</th>
                  <th className="px-4 py-2 text-right font-medium">
                    {t("colAmount")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="px-4 py-2 font-mono text-xs whitespace-nowrap">
                      {fecha(m.created_at)}
                    </td>
                    <td className="px-4 py-2">
                      {t(`ledgerType.${m.type}`)}
                      {m.pack && (
                        <span className="text-muted-foreground"> · {m.pack.name}</span>
                      )}
                      {!m.pack && m.product_kind && (
                        <span className="text-muted-foreground">
                          {" "}
                          · {tprod(`${m.product_kind}.name`)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs whitespace-nowrap text-muted-foreground">
                      {m.expires_at ? fecha(m.expires_at) : "—"}
                    </td>
                    <td
                      className={`px-4 py-2 text-right font-mono whitespace-nowrap ${
                        m.amount >= 0 ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {m.amount >= 0 ? `+${m.amount}` : m.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
