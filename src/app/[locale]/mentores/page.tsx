import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { getMentores } from "@/lib/catalog";
import type { MentorLevel } from "@/lib/db-types";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/mentores">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "mentors" });
  return { title: `${t("title")} · Tutor247`, description: t("subtitle") };
}

export default async function MentoresPage({
  params,
}: PageProps<"/[locale]/mentores">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("mentors");
  const mentores = await getMentores();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mentores.map((m) => (
          <Link
            key={m.profile_id}
            href={`/mentores/${m.profile_id}`}
            className="flex flex-col rounded-xl border p-5 transition-colors hover:border-foreground/30 hover:bg-muted/40"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{m.full_name}</span>
              <Badge variant="secondary">
                {t(`level.${m.level as MentorLevel}`)}
              </Badge>
            </div>
            {m.headline && (
              <p className="mt-1 text-sm text-muted-foreground">{m.headline}</p>
            )}
            {m.modulos.length > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                {t("teaches")}:{" "}
                <span className="font-mono">
                  {m.modulos.map((mo) => mo.code).join(" · ")}
                </span>
              </p>
            )}
            {m.response_time_minutes != null && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t("responseTime", { min: m.response_time_minutes })}
              </p>
            )}
          </Link>
        ))}
      </div>
    </main>
  );
}
