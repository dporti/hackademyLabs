import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSessionUser, localePath } from "@/lib/auth";
import { ABRE_ANTES_MIN, getAula, videoUrl } from "@/lib/aula";
import { completeBookingAction } from "@/app/actions/consumo";
import { Link } from "@/i18n/navigation";
import { ActionButton } from "@/components/consumo/action-button";
import { AulaEditor } from "@/components/aula/aula-editor";
import { AulaPizarra } from "@/components/aula/aula-pizarra";
import { AulaFicheros } from "@/components/aula/aula-ficheros";
import { SummaryForm } from "@/components/aula/summary-form";
import { Resumen } from "@/components/aula/resumen";

// Aula integrada (fase 9, maqueta Aula.html): vídeo, editor de código compartido,
// pizarra y ficheros, solo para el alumno y el mentor de la reserva y cerca de la
// hora. El mentor activa el Modo Examen, marca la sesión como hecha, actualiza el
// Mapa y pide a Bit el resumen. Sin grabación.
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/panel/aula/[id]">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "aula" });
  return { title: t("title"), robots: { index: false } };
}

export default async function AulaPage({ params }: PageProps<"/[locale]/panel/aula/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await getSessionUser();
  if (!session) redirect(localePath(locale, "/entrar"));
  const userId = session!.user.id;
  const aula = await getAula(id, userId);
  if (!aula) notFound();

  const t = await getTranslations("aula");
  const tc = await getTranslations("consumo");
  const esMentor = aula.role === "mentor";
  const cuando = (iso: string) =>
    new Intl.DateTimeFormat(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Madrid",
    }).format(new Date(iso));
  const nombre = (session!.profile?.full_name ?? "").split(" ")[0] || (esMentor ? t("mentor") : t("student"));
  const video = aula.abierta && aula.status === "confirmada" ? await videoUrl(aula, nombre) : null;

  return (
    <div className="w-full space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/panel/sesiones" className="text-sm text-label hover:text-foreground">
            ← {t("back")}
          </Link>
          <h1 className="mt-2 font-heading text-[28px] leading-tight font-bold tracking-tight sm:text-[36px]">
            {t("title")}
            {aula.modulo && <span className="ml-3 font-mono text-lg text-primary">{aula.modulo.code}</span>}
          </h1>
          <p className="mt-1 text-muted-foreground first-letter:uppercase">
            {cuando(aula.starts_at)} · {esMentor ? t("withStudent", { name: aula.otro || "—" }) : t("withMentor", { name: aula.otro || "—" })}
          </p>
        </div>
        {esMentor && aula.status === "confirmada" && aula.empezada && (
          <ActionButton action={completeBookingAction} fields={{ locale, booking: aula.id }} label={tc("markDone")} variant="default" />
        )}
      </header>

      {!aula.abierta && aula.status === "confirmada" ? (
        <div className="rounded-3xl border border-dashed p-8 text-center">
          <p className="font-heading text-xl font-semibold">{aula.pronto ? t("notYet", { n: ABRE_ANTES_MIN }) : t("closed")}</p>
          <p className="mt-2 text-muted-foreground">{t("windowHelp")}</p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-6">
            {aula.status === "confirmada" &&
              (video ? (
                <section aria-label={t("videoAria")} className="overflow-hidden rounded-2xl border bg-black">
                  <iframe
                    src={video.url}
                    title={t("videoAria")}
                    allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
                    className="aspect-video w-full"
                  />
                  <p className="bg-card px-4 py-2 text-xs text-label">{t(`provider.${video.proveedor}`)}</p>
                </section>
              ) : (
                <p className="rounded-2xl border p-4 text-sm text-muted-foreground">{t("noVideo")}</p>
              ))}
            {aula.status === "hecha" && <p className="rounded-2xl border p-4 text-sm text-muted-foreground">{t("doneNote")}</p>}
            <AulaEditor bookingId={aula.id} userId={userId} isMentor={esMentor} />
            <AulaPizarra bookingId={aula.id} />
          </div>

          <aside className="space-y-4">
            <AulaFicheros bookingId={aula.id} />
            {esMentor && (
              <section aria-labelledby="mentor-t" className="space-y-4 rounded-2xl border border-tint-primary-border bg-tint-primary p-4">
                <h2 id="mentor-t" className="font-mono text-xs font-semibold tracking-[0.2em] text-primary uppercase">
                  {t("mentorTools")}
                </h2>
                <p className="text-sm">{t("explainHelp")}</p>
                {aula.modulo && (
                  <Link
                    href={`/panel/sesiones/${aula.id}/mapa`}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-[10px] border border-border bg-background px-4 text-sm font-semibold hover:border-primary"
                  >
                    {tc("updateMap")}
                  </Link>
                )}
                <SummaryForm locale={locale} bookingId={aula.id} />
              </section>
            )}
            {aula.summary && (
              <section aria-labelledby="resumen-t" className="rounded-2xl border bg-card p-4">
                <h2 id="resumen-t" className="font-mono text-xs font-semibold tracking-[0.2em] text-label uppercase">
                  {t("summaryTitle")}
                </h2>
                <Resumen texto={aula.summary} />
              </section>
            )}
            <p className="text-xs text-label">{t("privacy")}</p>
          </aside>
        </div>
      )}
    </div>
  );
}
