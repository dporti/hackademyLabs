import { getTranslations, setRequestLocale } from "next-intl/server";
import { MentorCard } from "@/components/brand/mentor-card";
import { getMentores } from "@/lib/catalog";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/mentores">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "mentors" });
  return { title: t("title"), description: t("subtitle") };
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
          <MentorCard
            key={m.profile_id}
            id={m.profile_id}
            name={m.full_name}
            level={m.level}
            levelLabel={t(`level.${m.level}`)}
            headline={m.headline}
            moduleCodes={m.modulos.map((mo) => mo.code)}
            responseMinutes={m.response_time_minutes}
          />
        ))}
      </div>
    </main>
  );
}
