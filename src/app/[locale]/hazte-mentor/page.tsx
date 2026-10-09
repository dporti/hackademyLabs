import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ComingSoon } from "@/components/brand/coming-soon";

// Captación de mentores (oferta). Contenido de docs/modelo-negocio §6 y
// capa-ia §3 (lo que la IA le quita de encima al mentor). Estática.

export async function generateMetadata({ params }: PageProps<"/[locale]/hazte-mentor">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "joinMentor" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function HazteMentorPage({ params }: PageProps<"/[locale]/hazte-mentor">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("joinMentor");

  const ventajas = ["v1", "v2", "v3", "v4", "v5", "v6"] as const;
  // Ventajas que dependen de piezas aún no construidas (aula, banco de materiales, agenda).
  const proximamente = new Set<string>(["v3", "v4", "v5"]);
  const ia = ["i1", "i2", "i3", "i4"] as const;
  const pasos = ["p1", "p2", "p3", "p4"] as const;
  const niveles = ["mentor", "pro", "experto"] as const;

  return (
    <main className="flex-1">
      <section className="hud-grid border-b border-divider">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-14 lg:py-20">
          <h1 className="max-w-3xl font-heading text-[40px] leading-[1.05] font-bold tracking-tight sm:text-[54px]">
            {t("heroTitle")}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{t("heroSubtitle")}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/registro?rol=mentor" className="glow inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-5 font-bold text-primary-foreground transition-colors hover:bg-primary/85">
              {t("cta")}
            </Link>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{t("ctaNote")}</p>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 sm:px-6 py-16">
        <h2 className="font-heading text-[32px] leading-tight font-bold tracking-tight sm:text-[42px]">{t("whyTitle")}</h2>
        <dl className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
          {ventajas.map((v) => (
            <div key={v} className="border-l-2 border-primary/50 pl-4">
              <dt className="flex flex-wrap items-center gap-2 font-heading text-lg font-semibold">
                {t(`why.${v}.title`)}
                {proximamente.has(v) && <ComingSoon />}
              </dt>
              <dd className="mt-1 text-sm text-muted-foreground">{t(`why.${v}.text`)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="border-y border-divider bg-card/40">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-16">
          <h2 className="flex flex-wrap items-center gap-3 font-heading text-[32px] leading-tight font-bold tracking-tight sm:text-[42px]">
            {t("aiTitle")}
            <ComingSoon />
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">{t("aiSubtitle")}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {ia.map((i) => (
              <div key={i} className="rounded-2xl border bg-card p-5">
                <h3 className="font-semibold">{t(`ai.${i}.title`)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t(`ai.${i}.text`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 sm:px-6 py-16">
        <h2 className="font-heading text-[32px] leading-tight font-bold tracking-tight sm:text-[42px]">{t("levelsTitle")}</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("levelsSubtitle")}</p>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {niveles.map((n, i) => (
            <li key={n} className="rounded-2xl border bg-card p-5">
              <span className="font-mono text-sm text-primary">0{i + 1}</span>
              <h3 className="mt-2 font-heading text-lg font-semibold">{t(`levels.${n}.title`)}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t(`levels.${n}.text`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-divider bg-card/40">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-16">
          <h2 className="font-heading text-[32px] leading-tight font-bold tracking-tight sm:text-[42px]">{t("stepsTitle")}</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pasos.map((p, i) => (
              <li key={p} className="rounded-2xl border bg-card p-5">
                <span className="font-mono text-sm text-primary">0{i + 1}</span>
                <h3 className="mt-2 font-semibold">{t(`steps.${p}.title`)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t(`steps.${p}.text`)}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 max-w-3xl text-sm text-muted-foreground">{t("rules")}</p>
        </div>
      </section>

      <section className="hud-grid border-t border-divider">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-16 text-center">
          <h2 className="mx-auto max-w-2xl font-heading text-[34px] leading-[1.1] font-bold tracking-tight sm:text-5xl">
            {t("finalTitle")}
          </h2>
          <Link href="/registro?rol=mentor" className="mt-7 glow inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-5 font-bold text-primary-foreground transition-colors hover:bg-primary/85">
            {t("cta")}
          </Link>
        </div>
      </section>
    </main>
  );
}
