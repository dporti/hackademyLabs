import { getTranslations } from "next-intl/server";
import { SectionLabel } from "@/components/brand/section-label";
import { MIN_RESENAS_MEDIA, getResenasMentor } from "@/lib/catalog";
import { ReviewItem } from "@/components/resenas/review-item";
import { Stars, formatoNota } from "@/components/resenas/stars";

// Reseñas verificadas en la ficha pública del mentor. Media solo desde 3 reseñas.
// Sin reseñas: una línea honesta (sin inventar nada).
export async function MentorReviewsPublic({
  mentorId,
  mentorName,
  locale,
  valoracion,
}: {
  mentorId: string;
  mentorName: string | null;
  locale: string;
  valoracion?: { reviews: number; rating: number };
}) {
  const t = await getTranslations("resenas");
  const resenas = await getResenasMentor(mentorId);
  const conMedia = valoracion && valoracion.reviews >= MIN_RESENAS_MEDIA;

  return (
    <section id="resenas" aria-labelledby="resenas-pub" className="scroll-mt-24">
      <SectionLabel>{t("publicLabel")}</SectionLabel>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h2 id="resenas-pub" className="font-heading text-2xl font-bold">
          {t("publicTitle")}
        </h2>
        {conMedia && (
          <span className="flex items-center gap-2">
            <span className="font-heading text-2xl font-bold">{formatoNota(valoracion.rating, locale)}</span>
            <Stars value={valoracion.rating} size="lg" label={t("averageAria", { n: formatoNota(valoracion.rating, locale) })} />
            <span className="text-sm text-muted-foreground">{t("count", { n: valoracion.reviews })}</span>
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-label">{t("verifiedNote")}</p>
      {resenas.length === 0 ? (
        <p className="mt-4 text-muted-foreground">{t("publicEmpty")}</p>
      ) : (
        <div className="mt-5 space-y-3">
          {resenas.map((r) => (
            <ReviewItem key={r.id} r={r} locale={locale} mentorName={mentorName} />
          ))}
        </div>
      )}
    </section>
  );
}
