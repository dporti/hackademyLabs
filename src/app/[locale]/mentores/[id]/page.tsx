import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { getMentorById, getMentorIds } from "@/lib/catalog";
import type { MentorLevel } from "@/lib/db-types";

export async function generateStaticParams() {
  const ids = await getMentorIds();
  return ids.map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/mentores/[id]">) {
  const { id } = await params;
  const m = await getMentorById(id);
  if (!m) return {};
  return {
    title: `${m.full_name} — ${m.headline ?? "Mentor"}`,
    description: m.bio ?? m.headline ?? undefined,
  };
}

export default async function MentorPage({
  params,
}: PageProps<"/[locale]/mentores/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const m = await getMentorById(id);
  if (!m) notFound();

  const t = await getTranslations("mentors");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {m.full_name}
        </h1>
        <Badge variant="secondary">
          {t(`level.${m.level as MentorLevel}`)}
        </Badge>
      </div>
      {m.headline && (
        <p className="mt-2 text-lg text-muted-foreground">{m.headline}</p>
      )}
      {m.bio && <p className="mt-4">{m.bio}</p>}

      <dl className="mt-6 space-y-1 text-sm text-muted-foreground">
        {m.languages?.length > 0 && (
          <div>Idiomas: {m.languages.map((l) => l.toUpperCase()).join(", ")}</div>
        )}
        {m.response_time_minutes != null && (
          <div>{t("responseTime", { min: m.response_time_minutes })}</div>
        )}
      </dl>

      {m.modulos.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold">{t("teaches")}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {m.modulos.map((mo) => (
              <Link
                key={mo.code}
                href={`/modulos/${mo.code}`}
                className="card-interactive rounded-full border bg-card px-3 py-1 text-sm"
              >
                <span className="font-mono text-primary">{mo.code}</span>{" "}
                {mo.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
