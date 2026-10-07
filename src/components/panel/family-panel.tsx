import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createFamilyInviteAction } from "@/app/actions/family";
import { Button } from "@/components/ui/button";
import { RaBadge } from "@/components/brand/ra-badge";
import { formatInviteCode, type FamilyDashboard } from "@/lib/family";

// Panel de familia (zona "family": clara y sobria). Hijos vinculados con lo que
// el consentimiento permite ver, informes semanales e invitación para vincular.
export async function FamilyPanel({
  locale,
  dashboard,
}: {
  locale: string;
  dashboard: FamilyDashboard;
}) {
  const t = await getTranslations("familyPanel");
  const { students, invite, reports } = dashboard;
  // Fechas `date` (sin hora): formatear en UTC evita el desfase de día.
  const fechaDia = (d: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(
      new Date(d),
    );
  const fecha = (iso: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso));

  return (
    <div className="mt-8 space-y-10">
      {/* ─────────────────────────── Hijos ─────────────────────────── */}
      <section aria-labelledby="hijos">
        <h2 id="hijos" className="font-display text-xl font-semibold">
          {t("studentsTitle")}
        </h2>
        {students.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("studentsEmpty")}</p>
        ) : (
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {students.map((s) => {
              const informes = reports.filter((r) => r.student_id === s.student_id);
              return (
                <li key={s.student_id} className="rounded-xl border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-display text-lg font-semibold">
                      {s.full_name ?? t("noName")}
                    </p>
                    {s.shared ? (
                      <RaBadge status="verde" label={t(s.is_minor ? "minor" : "sharing")} />
                    ) : (
                      <RaBadge status="ambar" label={t("notSharing")} />
                    )}
                  </div>

                  {!s.shared ? (
                    <p className="mt-3 text-sm text-muted-foreground">{t("notSharingHelp")}</p>
                  ) : (
                    <>
                      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="text-xs text-muted-foreground">{t("balance")}</dt>
                          <dd className="mt-0.5 font-mono text-lg font-semibold">
                            {s.balance ?? 0}{" "}
                            <span className="text-xs font-normal text-muted-foreground">
                              {t("credits")}
                            </span>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">{t("lastReport")}</dt>
                          <dd className="mt-0.5">
                            {informes[0]
                              ? t("weekOf", { date: fechaDia(informes[0].week_start) })
                              : t("noReports")}
                          </dd>
                        </div>
                      </dl>
                      <p className="mt-4 text-xs text-muted-foreground">{t("modules")}</p>
                      {s.modulos?.length ? (
                        <ul className="mt-1.5 space-y-1 text-sm">
                          {s.modulos.map((m) => (
                            <li key={m.code} className="flex justify-between gap-3">
                              <span>
                                <span className="font-mono text-primary">{m.code}</span> {m.name}
                              </span>
                              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                                {m.exam_date
                                  ? t("examOn", { date: fechaDia(m.exam_date) })
                                  : t("noExamDate")}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-sm text-muted-foreground">{t("noModules")}</p>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ─────────────────────── Vincular a un hijo ─────────────────────── */}
      <section aria-labelledby="vincular" className="rounded-xl border bg-card p-6">
        <h2 id="vincular" className="font-display text-xl font-semibold">
          {t("linkTitle")}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("linkHelp")}</p>

        {invite ? (
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <p
              aria-label={t("codeAria")}
              className="rounded-lg border-2 border-dashed border-primary/40 bg-muted px-4 py-2 font-mono text-2xl font-bold tracking-widest select-all"
            >
              {formatInviteCode(invite.code)}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("codeExpires", { date: fecha(invite.expires_at) })}
            </p>
          </div>
        ) : null}

        <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm">
          <li>{t("step1")}</li>
          <li>{t("step2")}</li>
          <li>{t("step3")}</li>
        </ol>

        <form action={createFamilyInviteAction} className="mt-5">
          <input type="hidden" name="locale" value={locale} />
          <Button type="submit" variant={invite ? "outline" : "default"}>
            {invite ? t("newCode") : t("createCode")}
          </Button>
        </form>
      </section>

      <p className="text-sm text-muted-foreground">
        {t("plansHint")}{" "}
        <Link href="/familias#planes" className="text-primary underline-offset-4 hover:underline">
          {t("plansLink")}
        </Link>
      </p>
    </div>
  );
}
