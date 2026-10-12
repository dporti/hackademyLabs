import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { RespondOffer } from "@/components/avisos/respond-offer";

// Huecos que los mentores ofrecen al alumno porque pidió aviso (fase D). Aceptar =
// reservar y pagar en créditos; la sesión queda confirmada al momento.
export async function OfertasAlumno({ locale, studentId }: { locale: string; studentId: string }) {
  const t = await getTranslations("ofertas");
  const sb = await createClient();
  const { data } = await sb
    .from("slot_offer")
    .select("id, mentor_id, product_kind, starts_at, credits, note, expires_at, modulo(code, name)")
    .eq("student_id", studentId)
    .eq("status", "pendiente")
    .gt("expires_at", new Date().toISOString())
    .order("starts_at");
  type Oferta = {
    id: string;
    mentor_id: string;
    product_kind: "sesion_1a1" | "sesion_flash";
    starts_at: string;
    credits: number;
    note: string | null;
    expires_at: string;
    modulo: { code: string; name: string } | null;
  };
  const ofertas = (data ?? []) as unknown as Oferta[];
  if (ofertas.length === 0) return null;

  const { data: mentores } = await sb
    .from("mentor_public")
    .select("profile_id, full_name")
    .in("profile_id", [...new Set(ofertas.map((o) => o.mentor_id))]);
  const nombre = new Map((mentores ?? []).map((m) => [m.profile_id, m.full_name as string]));
  const fmt = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  });

  return (
    <section id="ofertas" aria-labelledby="ofertas-t" className="scroll-mt-24 rounded-3xl border border-tint-primary-border bg-card p-5 sm:p-7">
      <h2 id="ofertas-t" className="font-heading text-2xl font-bold">
        {t("studentTitle")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("studentHelp")}</p>
      <ul className="mt-5 grid gap-4 md:grid-cols-2">
        {ofertas.map((o) => (
          <li key={o.id} className="rounded-2xl border bg-background p-4">
            <p className="font-mono text-xs text-label">
              <span className="text-primary">{o.modulo?.code}</span> · {o.modulo?.name}
            </p>
            <p className="mt-1 font-semibold first-letter:uppercase">{fmt.format(new Date(o.starts_at))}</p>
            <p className="text-sm text-muted-foreground">
              {nombre.get(o.mentor_id) ?? "—"} · {t(o.product_kind === "sesion_1a1" ? "kind1a1" : "kindFlash")} ·{" "}
              {t("creditsN", { n: o.credits })}
            </p>
            {o.note && <p className="mt-2 rounded-[10px] bg-surface-2 p-2.5 text-sm whitespace-pre-wrap">{o.note}</p>}
            <p className="mt-2 text-xs text-label first-letter:uppercase">
              {t("expires", { when: fmt.format(new Date(o.expires_at)) })}
            </p>
            <RespondOffer offerId={o.id} credits={o.credits} />
          </li>
        ))}
      </ul>
    </section>
  );
}
