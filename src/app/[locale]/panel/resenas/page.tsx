import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSessionUser, localePath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { MIN_RESENAS_MEDIA } from "@/lib/catalog";
import { ReviewItem, type ResenaVista } from "@/components/resenas/review-item";
import { MentorReviewActions } from "@/components/resenas/mentor-review-actions";
import { Stars, formatoNota } from "@/components/resenas/stars";

// Reseñas del mentor: su media (desde 3), todas las reseñas (también las ocultas por
// el admin, marcadas), responder una vez (editable) y denunciar.
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/panel/resenas">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "resenas" });
  return { title: t("mentorTitle"), robots: { index: false } };
}

export default async function ResenasMentorPage({ params }: PageProps<"/[locale]/panel/resenas">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getSessionUser();
  if (!session) redirect(localePath(locale, "/entrar"));
  if (session!.profile?.role !== "mentor") redirect(localePath(locale, "/panel"));

  const t = await getTranslations("resenas");
  const sb = await createClient();
  const { data } = await sb
    .from("mentor_review")
    .select("id, rating, comment, author_name, source, reply, created_at, status, reported_at, modulo(code)")
    .eq("mentor_id", session!.user.id)
    .order("created_at", { ascending: false });
  type Fila = Omit<ResenaVista, "modulo_code"> & { status: string; reported_at: string | null; modulo: { code: string } | null };
  const filas = (data ?? []) as unknown as Fila[];
  const publicadas = filas.filter((r) => r.status === "publicada");
  const media = publicadas.length ? publicadas.reduce((s, r) => s + r.rating, 0) / publicadas.length : 0;

  return (
    <div className="w-full space-y-8">
      <header>
        <h1 className="font-heading text-[32px] leading-tight font-bold tracking-tight sm:text-[40px]">{t("mentorTitle")}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("mentorSubtitle")}</p>
        {publicadas.length >= MIN_RESENAS_MEDIA ? (
          <p className="mt-4 flex flex-wrap items-center gap-3">
            <span className="font-heading text-3xl font-bold">{formatoNota(media, locale)}</span>
            <Stars value={media} size="lg" label={t("averageAria", { n: formatoNota(media, locale) })} />
            <span className="text-sm text-muted-foreground">{t("count", { n: publicadas.length })}</span>
          </p>
        ) : (
          <p className="mt-4 text-sm text-label">{t("belowMin", { n: publicadas.length, min: MIN_RESENAS_MEDIA })}</p>
        )}
        <p className="mt-2 text-sm">
          <Link href={`/mentores/${session!.user.id}#resenas`} className="text-primary hover:underline">
            {t("seePublic")}
          </Link>
        </p>
      </header>

      {filas.length === 0 ? (
        <p className="text-muted-foreground">{t("mentorEmpty")}</p>
      ) : (
        <div className="space-y-4">
          {filas.map((r) => (
            <ReviewItem key={r.id} r={{ ...r, modulo_code: r.modulo?.code ?? null }} locale={locale}>
              {r.status === "oculta" && <p className="mt-3 text-xs text-sos-text">{t("hiddenByAdmin")}</p>}
              <MentorReviewActions reviewId={r.id} reply={r.reply} reported={!!r.reported_at} />
            </ReviewItem>
          ))}
        </div>
      )}
    </div>
  );
}
