import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSessionUser, localePath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { RaBadge } from "@/components/brand/ra-badge";
import { AssessRaForm } from "@/components/mapa/assess-ra-form";
import { temaRa } from "@/lib/temas";
import type { NivelDominio } from "@/lib/dominio";

// El mentor actualiza el Mapa de Dominio del alumno tras una sesión (fase 7). Solo
// ve los RA del módulo de ESA reserva y el nivel actual (RPC booking_ra_map: la
// reserva debe ser suya y estar confirmada o hecha). Sin más datos del alumno.
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/panel/sesiones/[id]/mapa">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "mapa" });
  return { title: t("mentorTitle"), robots: { index: false } };
}

export default async function SesionMapaPage({ params }: PageProps<"/[locale]/panel/sesiones/[id]/mapa">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await getSessionUser();
  if (!session) redirect(localePath(locale, "/entrar"));
  if (session!.profile?.role !== "mentor") redirect(localePath(locale, "/panel"));

  const sb = await createClient();
  const [{ data: booking }, { data: ras }] = await Promise.all([
    sb.from("booking").select("id, student_id, mentor_id, modulo(code, name)").eq("id", id).maybeSingle(),
    sb.rpc("booking_ra_map", { p_booking: id }),
  ]);
  if (!booking || booking.mentor_id !== session!.user.id || !ras?.length) notFound();
  const modulo = booking.modulo as unknown as { code: string; name: string } | null;
  const { data: nombres } = await sb.rpc("my_student_names", { p_ids: [booking.student_id] });
  const alumno = (nombres as { first_name: string }[] | null)?.[0]?.first_name || "—";

  const t = await getTranslations("mapa");
  const tr = await getTranslations("temasRa");
  type Row = { ra_id: string; code: string; description: string; nivel: NivelDominio | null; sealed: boolean };

  return (
    <div className="w-full space-y-8">
      <header>
        <Link href="/panel/sesiones" className="text-sm text-label hover:text-foreground">
          ← {t("backSessions")}
        </Link>
        <h1 className="mt-3 font-heading text-[32px] leading-tight font-bold tracking-tight sm:text-[40px]">{t("mentorTitle")}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          {t("mentorHelp", { name: alumno, code: modulo?.code ?? "", modulo: modulo?.name ?? "" })}
        </p>
      </header>
      <ul className="grid gap-3 md:grid-cols-2">
        {(ras as Row[]).map((ra) => (
          <li key={ra.ra_id} className="rounded-2xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-xs font-semibold text-primary">{ra.code}</p>
                <p className="mt-0.5 font-semibold leading-snug">
                  {(modulo && temaRa(tr, modulo.code, ra.code)) ?? ra.description}
                </p>
              </div>
              {ra.nivel ? (
                <RaBadge nivel={ra.nivel} />
              ) : (
                <span className="rounded-md border px-2 py-0.5 text-xs text-label">{t("notAssessed")}</span>
              )}
            </div>
            <AssessRaForm locale={locale} studentId={booking.student_id} raId={ra.ra_id} nivel={ra.nivel} sealed={ra.sealed} />
          </li>
        ))}
      </ul>
      <p className="text-xs text-label">
        {t("orientative")} {t("sealHelp")}
      </p>
    </div>
  );
}
