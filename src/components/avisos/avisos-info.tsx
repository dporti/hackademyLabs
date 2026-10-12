import { getTranslations } from "next-intl/server";
import { SectionLabel } from "@/components/brand/section-label";

// Explicación pública de los avisos (fase C): qué pasa si no encuentras mentor (alumno)
// y qué recibe el mentor cuando alguien busca un módulo suyo. Solo texto: sin cifras.
export async function AvisosInfo({ variant = "alumno" }: { variant?: "alumno" | "mentor" }) {
  const t = await getTranslations("avisosInfo");
  const pasos = variant === "alumno" ? (["s1", "s2", "s3"] as const) : (["m1", "m2", "m3"] as const);
  return (
    <section aria-labelledby={`avisos-${variant}`} className="rounded-2xl border bg-card p-6">
      <SectionLabel>{t("label")}</SectionLabel>
      <h2 id={`avisos-${variant}`} className="mt-3 font-heading text-2xl font-bold">
        {variant === "alumno" ? t("titleAlumno") : t("titleMentor")}
      </h2>
      <ol className="mt-5 grid gap-4 md:grid-cols-3">
        {pasos.map((p, i) => (
          <li key={p} className="flex gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full border border-primary font-mono text-sm text-primary">
              {i + 1}
            </span>
            <span>
              <span className="block font-semibold">{t(`${p}.title`)}</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{t(`${p}.text`)}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-5 text-xs text-label">{t("privacy")}</p>
    </section>
  );
}
