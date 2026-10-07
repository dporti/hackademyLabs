import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

// Captación de mentores (oferta). Contenido de docs/modelo-negocio §6 y
// capa-ia §3 (lo que la IA le quita de encima al mentor). Estática.

export async function generateMetadata({ params }: PageProps<"/[locale]/hazte-mentor">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "joinMentor" });
  return { title: `${t("metaTitle")} · Tutor247`, description: t("metaDescription") };
}

export default async function HazteMentorPage({ params }: PageProps<"/[locale]/hazte-mentor">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("joinMentor");

  const ventajas = ["v1", "v2", "v3", "v4", "v5", "v6"] as const;
  const ia = ["i1", "i2", "i3", "i4"] as const;
  const pasos = ["p1", "p2", "p3", "p4"] as const;
  const niveles = ["mentor", "pro", "experto"] as const;

  return (
    <main className="flex-1">
      <section className="hud-grid border-b border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-14 lg:py-20">
          <h1 className="max-w-3xl font-display text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
            {t("heroTitle")}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{t("heroSubtitle")}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button size="lg" className="glow" nativeButton={false} render={<Link href="/registro?rol=mentor" />}>
              {t("cta")}
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{t("ctaNote")}</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-3xl font-bold tracking-tight">{t("whyTitle")}</h2>
        <dl className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
          {ventajas.map((v) => (
            <div key={v} className="border-l-2 border-primary/50 pl-4">
              <dt className="font-display text-lg font-semibold">{t(`why.${v}.title`)}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{t(`why.${v}.text`)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="border-y border-border/60 bg-[var(--surface-2)]">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-3xl font-bold tracking-tight">{t("aiTitle")}</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">{t("aiSubtitle")}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {ia.map((i) => (
              <div key={i} className="rounded-xl border bg-card p-5">
                <h3 className="font-semibold">{t(`ai.${i}.title`)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t(`ai.${i}.text`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-3xl font-bold tracking-tight">{t("levelsTitle")}</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("levelsSubtitle")}</p>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {niveles.map((n, i) => (
            <li key={n} className="rounded-xl border bg-card p-5">
              <span className="font-mono text-sm text-primary">0{i + 1}</span>
              <h3 className="mt-2 font-display text-lg font-semibold">{t(`levels.${n}.title`)}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t(`levels.${n}.text`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-border/60 bg-[var(--surface-2)]">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-3xl font-bold tracking-tight">{t("stepsTitle")}</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pasos.map((p, i) => (
              <li key={p} className="rounded-xl border bg-card p-5">
                <span className="font-mono text-sm text-primary">0{i + 1}</span>
                <h3 className="mt-2 font-semibold">{t(`steps.${p}.title`)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t(`steps.${p}.text`)}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 max-w-3xl text-sm text-muted-foreground">{t("rules")}</p>
        </div>
      </section>

      <section className="hud-grid">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t("finalTitle")}
          </h2>
          <Button size="lg" className="glow mt-7" nativeButton={false} render={<Link href="/registro?rol=mentor" />}>
            {t("cta")}
          </Button>
        </div>
      </section>
    </main>
  );
}
