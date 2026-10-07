import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MentorProfileForm } from "@/components/panel/mentor-profile-form";
import { MentorStatusBadge } from "@/components/panel/mentor-status-badge";
import type { MentorSelf } from "@/lib/mentor";
import type { Modulo } from "@/lib/db-types";

// Panel del mentor (F1.5, básico): estado de verificación, nivel y edición de perfil.
export async function MentorPanel({
  locale,
  mentor,
  catalogo,
}: {
  locale: string;
  mentor: MentorSelf;
  catalogo: Pick<Modulo, "code" | "name">[];
}) {
  const t = await getTranslations("mentorPanel");

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
