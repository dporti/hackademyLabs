import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { moderateReviewAction } from "@/app/actions/resenas";
import { ReviewItem, type ResenaVista } from "@/components/resenas/review-item";

// Admin: reseñas denunciadas por el mentor y ocultas. Ocultar / restaurar / descartar
// la denuncia. Lee con la sesión del admin (RLS mr_admin_all).
export async function AdminResenas({ locale }: { locale: string }) {
  const t = await getTranslations("resenas");
  const sb = await createClient();
  const { data } = await sb
    .from("mentor_review")
    .select("id, rating, comment, author_name, source, reply, created_at, status, reported_at, report_reason, mentor_id, modulo(code)")
    .or("reported_at.not.is.null,status.eq.oculta")
    .order("reported_at", { ascending: false, nullsFirst: false })
    .limit(50);
  type Fila = Omit<ResenaVista, "modulo_code"> & {
    status: string;
    reported_at: string | null;
    report_reason: string | null;
    mentor_id: string;
    modulo: { code: string } | null;
  };
  const filas = (data ?? []) as unknown as Fila[];
  const ids = [...new Set(filas.map((f) => f.mentor_id))];
  const { data: nombres } = ids.length
    ? await sb.from("profile").select("id, full_name").in("id", ids)
    : { data: [] as { id: string; full_name: string | null }[] };
  const nombre = new Map((nombres ?? []).map((n) => [n.id, n.full_name]));

  const boton = (id: string, op: "hide" | "show" | "dismiss") => (
    <form action={moderateReviewAction}>
      <input type="hidden" name="review" value={id} />
      <input type="hidden" name="op" value={op} />
      <button
        type="submit"
        className="inline-flex min-h-9 items-center rounded-[10px] border border-[#3a3f5c] px-3 text-sm hover:border-primary"
      >
        {t(`admin.${op}`)}
      </button>
    </form>
  );

  return (
    <section aria-labelledby="adm-resenas">
      <h2 id="adm-resenas" className="font-heading text-2xl font-bold">
        {t("admin.title")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("admin.help")}</p>
      {filas.length === 0 ? (
        <p className="mt-4 text-muted-foreground">{t("admin.empty")}</p>
      ) : (
        <div className="mt-5 space-y-3">
          {filas.map((r) => (
            <ReviewItem key={r.id} r={{ ...r, modulo_code: r.modulo?.code ?? null }} locale={locale}>
              <p className="mt-3 text-sm">
                <span className="text-label">{t("admin.mentor")}:</span> {nombre.get(r.mentor_id) ?? "—"}
                {r.status === "oculta" && <span className="ml-3 text-sos-text">{t("admin.hidden")}</span>}
              </p>
              {r.reported_at && (
                <p className="mt-1 text-sm">
                  <span className="text-label">{t("admin.reason")}:</span> {r.report_reason ?? "—"}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {r.status === "publicada" ? boton(r.id, "hide") : boton(r.id, "show")}
                {r.reported_at && r.status === "publicada" && boton(r.id, "dismiss")}
              </div>
            </ReviewItem>
          ))}
        </div>
      )}
    </section>
  );
}
