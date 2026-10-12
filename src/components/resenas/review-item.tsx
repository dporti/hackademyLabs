import { getTranslations } from "next-intl/server";
import { Stars } from "@/components/resenas/stars";

// Una reseña: estrellas, autor («Marta G.» o anónimo), módulo, fecha, texto y la
// respuesta del mentor. `children` = acciones (responder, borrar, moderar).
export type ResenaVista = {
  id: string;
  rating: number;
  comment: string | null;
  author_name: string | null;
  modulo_code: string | null;
  source: "sesion" | "ticket";
  reply: string | null;
  created_at: string;
};

export async function ReviewItem({
  r,
  locale,
  mentorName,
  children,
}: {
  r: ResenaVista;
  locale: string;
  mentorName?: string | null;
  children?: React.ReactNode;
}) {
  const t = await getTranslations("resenas");
  const fecha = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "Europe/Madrid" }).format(
    new Date(r.created_at),
  );
  return (
    <article className="rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Stars value={r.rating} label={t("ratingAria", { n: r.rating })} />
        <span className="font-medium">{r.author_name ?? t("anonymousAuthor")}</span>
        <span className="font-mono text-xs text-label">
          {[r.modulo_code, t(`source.${r.source}`), fecha].filter(Boolean).join(" · ")}
        </span>
      </div>
      {r.comment && <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-line">{r.comment}</p>}
      {r.reply && (
        <div className="mt-4 rounded-xl border-l-2 border-primary bg-surface-2 px-4 py-3">
          <p className="font-mono text-[11px] tracking-[0.15em] text-label uppercase">
            {mentorName ? t("replyFrom", { name: mentorName }) : t("replyTitle")}
          </p>
          <p className="mt-1 text-sm whitespace-pre-line">{r.reply}</p>
        </div>
      )}
      {children}
    </article>
  );
}
