import { Suspense } from "react";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check } from "lucide-react";
import { getModulosDiagnosticables } from "@/lib/catalog";
import { SectionLabel } from "@/components/brand/section-label";
import { Diagnostico } from "@/components/diagnostico/diagnostico";
import { PageSkeleton } from "@/components/page-skeleton";

// Diagnóstico gratis sin cuenta. El encabezado es estático; la herramienta lee la
// URL (?m=&e=&x=&h=, estado compartible) dentro de <Suspense>.

export async function generateMetadata({ params }: PageProps<"/[locale]/diagnostico">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "diagnostico" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function DiagnosticoPage({
  params,
  searchParams,
}: PageProps<"/[locale]/diagnostico">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("diagnostico");

  return (
    <main className="flex-1">
      <section className="hud-grid border-b border-divider">
        <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6">
          <SectionLabel>{t("eyebrow")}</SectionLabel>
          <h1 className="mt-4 max-w-4xl font-heading text-[40px] leading-[1.05] font-bold tracking-tight sm:text-[54px]">
            {t("title")}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{t("subtitle")}</p>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {(["b1", "b2", "b3"] as const).map((b) => (
              <li key={b} className="flex items-center gap-2">
                <Check aria-hidden className="size-4 text-accent-pass" strokeWidth={3} />
                {t(`badges.${b}`)}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6">
        <Suspense fallback={<PageSkeleton />}>
          <Herramienta searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function Herramienta({
  searchParams,
}: {
  searchParams: PageProps<"/[locale]/diagnostico">["searchParams"];
}) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : null);
  const modulos = await getModulosDiagnosticables();
  // `hoy` se fija en el servidor (por petición) para que servidor y cliente
  // pinten lo mismo; connection() evita leer la hora durante el prerender.
  await connection();
  const hoy = new Date().toISOString().slice(0, 10);
  const horas = Number(str(sp.h));
  const examen = str(sp.x);

  return (
    <Diagnostico
      modulos={modulos}
      hoy={hoy}
      inicial={{
        modulo: str(sp.m) ?? str(sp.modulo),
        estados: (str(sp.e) ?? "").slice(0, 20),
        examen: examen && /^\d{4}-\d{2}-\d{2}$/.test(examen) ? examen : null,
        horas: Number.isFinite(horas) ? horas : null,
      }}
    />
  );
}
