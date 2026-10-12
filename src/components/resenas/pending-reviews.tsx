import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { deleteReviewAction } from "@/app/actions/resenas";
import { ReviewForm } from "@/components/resenas/review-form";
import { ReviewItem, type ResenaVista } from "@/components/resenas/review-item";

// Alumno (en /panel/sesiones#resenas): sesiones hechas y tickets respondidos que aún
// puede valorar, y sus reseñas publicadas (puede borrarlas). Nada que mostrar = nada.
export async function PendingReviews({ locale, studentId }: { locale: string; studentId: string }) {
  const t = await getTranslations("resenas");
  const sb = await createClient();
  const [{ data: pend }, { data: mias }, { data: sp }] = await Promise.all([
    sb.rpc("my_reviewable"),
    sb
      .from("mentor_review")
      .select("id, rating, comment, author_name, source, reply, created_at, status, mentor_id, modulo(code)")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false }),
    sb.from("student_profile").select("mode, birthdate").eq("profile_id", studentId).maybeSingle(),
  ]);
  type Pend = { source: "sesion" | "ticket"; ref: string; mentor_name: string | null; modulo_code: string | null; at: string };
  const pendientes = (pend ?? []) as Pend[];
  type Mia = Omit<ResenaVista, "modulo_code"> & { status: string; modulo: { code: string } | null };
  const propias = (mias ?? []) as unknown as Mia[];
  if (!pendientes.length && !propias.length) return null;

  const mayor = (b: string | null) => !b || new Date(b) <= new Date(new Date().setFullYear(new Date().getFullYear() - 18));
  const forcedAnon = sp?.mode === "familia" || !mayor(sp?.birthdate ?? null);
  const fmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "Europe/Madrid" });

  return (
    <section id="resenas" aria-labelledby="resenas-t" className="scroll-mt-24 rounded-3xl border bg-card p-5 sm:p-7">
      <h2 id="resenas-t" className="font-heading text-2xl font-bold">
        {t("studentTitle")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("studentHelp")}</p>

      {pendientes.length > 0 && (
        <ul className="mt-5 grid gap-4 md:grid-cols-2">
          {pendientes.map((p) => (
            <li key={p.ref} className="rounded-2xl border border-tint-primary-border bg-background p-4">
              <p className="font-medium">
                {t("pendingItem", { mentor: p.mentor_name ?? "", modulo: p.modulo_code ?? "" })}
              </p>
              <p className="font-mono text-xs text-label">
                {t(`source.${p.source}`)} · {fmt.format(new Date(p.at))}
              </p>
              <ReviewForm source={p.source} refId={p.ref} forcedAnon={forcedAnon} />
            </li>
          ))}
        </ul>
      )}

      {propias.length > 0 && (
        <>
          <h3 className="mt-8 font-heading text-lg font-semibold">{t("mineTitle")}</h3>
          <div className="mt-3 space-y-3">
            {propias.map((r) => (
              <ReviewItem key={r.id} r={{ ...r, modulo_code: r.modulo?.code ?? null }} locale={locale}>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-label">
                  {r.status === "oculta" && <span>{t("hiddenNote")}</span>}
                  {/* Borrar pide un segundo clic: no se puede deshacer. */}
                  <details>
                    <summary className="cursor-pointer underline hover:text-foreground">{t("delete")}</summary>
                    <form action={deleteReviewAction} className="mt-2">
                      <input type="hidden" name="review" value={r.id} />
                      <button type="submit" className="rounded-lg border border-sos-text px-3 py-1.5 text-sos-text">
                        {t("deleteConfirm")}
                      </button>
                    </form>
                  </details>
                </div>
              </ReviewItem>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
