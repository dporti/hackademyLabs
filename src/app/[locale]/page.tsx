import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HomeContent />;
}

function HomeContent() {
  const t = useTranslations("home");
  const c = useTranslations("common");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-16 text-center">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {c("appName")}
        </h1>
        <p className="text-xl font-medium text-foreground/80">{c("tagline")}</p>
        <p className="mx-auto max-w-xl text-muted-foreground">
          {t("heroSubtitle")}
        </p>
      </div>

      {/* Doble entrada: estudiante / familia */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          size="lg"
          nativeButton={false}
          render={<Link href="/registro?rol=alumno" />}
        >
          {t("studentCta")}
        </Button>
        <Button
          size="lg"
          variant="outline"
          nativeButton={false}
          render={<Link href="/registro?rol=familia" />}
        >
          {t("familyCta")}
        </Button>
      </div>

      {/* Buscador de módulo (placeholder funcional en Fase 1) */}
      <form
        action="/modulos"
        className="flex w-full max-w-md items-center gap-2"
      >
        <input
          type="search"
          name="q"
          aria-label={t("searchLabel")}
          placeholder={t("searchPlaceholder")}
          className="flex-1 rounded-md border border-input bg-background px-4 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit">{t("searchLabel")}</Button>
      </form>
    </main>
  );
}
