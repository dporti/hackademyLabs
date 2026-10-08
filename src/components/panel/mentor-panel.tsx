import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MentorProfileForm } from "@/components/panel/mentor-profile-form";
import { MentorStatusBadge } from "@/components/panel/mentor-status-badge";
import type { MentorSelf } from "@/lib/mentor";
import type { MentorEarnings, getPendientesMentor } from "@/lib/consumo";
import type { Modulo } from "@/lib/db-types";

// Panel del mentor (F1.5, básico): estado de verificación, nivel y edición de perfil.
export async function MentorPanel({
  locale,
  mentor,
  pendientes,
  earnings,
  catalogo,
}: {
  locale: string;
  mentor: MentorSelf;
  pendientes: Awaited<ReturnType<typeof getPendientesMentor>>;
  earnings: MentorEarnings;
  catalogo: Pick<Modulo, "code" | "name">[];
}) {
  const t = await getTranslations("mentorPanel");
  const tc = await getTranslations("consumo");

  return (
    <div className="mt-8 space-y-10">
      <section
        aria-labelledby="estado"
        className="hud-grid rounded-xl border border-primary/30 bg-card p-6"
      >
        <h2 id="estado" className="text-sm font-medium text-muted-foreground">
          {t("statusTitle")}
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <MentorStatusBadge
            status={mentor.status}
            label={t(`status.${mentor.status}`)}
          />
          <span className="font-mono text-sm text-muted-foreground">
            {t("levelLabel")}:{" "}
            <span className="text-foreground">{t(`level.${mentor.level}`)}</span>
          </span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {t(`statusHelp.${mentor.status}`)}
        </p>
        {mentor.status === "verificado" && (
          <Link
            href={`/mentores/${mentor.profile_id}`}
            className="mt-3 inline-block text-sm text-primary hover:underline"
          >
            {t("viewPublic")} →
          </Link>
        )}
      </section>

      {mentor.status === "verificado" && (
        <section aria-labelledby="trabajo">
          <h2 id="trabajo" className="font-display text-xl font-semibold">
            {tc("workTitle")}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Link
              href="/panel/tickets"
              className="rounded-xl border bg-card p-5 transition hover:border-primary/50"
            >
              <span className="font-semibold">{tc("ticketsTitle")}</span>
              <p className="mt-2 font-mono text-sm text-primary">
                {tc("poolCount", { n: pendientes.bolsa })}
              </p>
              <p className="font-mono text-sm text-muted-foreground">
                {tc("toAnswerCount", { n: pendientes.ticketsPorResponder })}
              </p>
            </Link>
            <Link
              href="/panel/sesiones"
              className="rounded-xl border bg-card p-5 transition hover:border-primary/50"
            >
              <span className="font-semibold">{tc("sessionsTitle")}</span>
              <p className="mt-2 font-mono text-sm text-primary">
                {tc("requestsCount", { n: pendientes.solicitudes })}
              </p>
            </Link>
            <div className="hud-grid rounded-xl border border-primary/30 bg-card p-5">
              <span className="text-sm text-muted-foreground">{tc("earningsMonth")}</span>
              <p className="mt-1 font-mono text-3xl font-bold text-primary">
                {earnings.monthCredits}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  {tc("creditsUnit")}
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {tc("earningsHelp", { n: earnings.monthItems, total: earnings.totalCredits })}
              </p>
            </div>
          </div>
        </section>
      )}

      <section aria-labelledby="perfil">
        <h2 id="perfil" className="font-display text-xl font-semibold">
          {t("profileTitle")}
        </h2>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">{t("profileHelp")}</p>
        <MentorProfileForm
          locale={locale}
          initial={mentor}
          modulos={catalogo}
        />
      </section>
    </div>
  );
}
