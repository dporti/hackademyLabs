import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSessionUser, localePath } from "@/lib/auth";
import { buscarModulos, getMentores } from "@/lib/catalog";
import {
  getMentorBookings,
  getSaldoYModulos,
  getStudentBookings,
  getTarifas,
  minReservaLocal,
  ordenarModulos,
  type BookingRow,
  type Nombres,
} from "@/lib/consumo";
import {
  cancelBookingAction,
  completeBookingAction,
  respondBookingAction,
} from "@/app/actions/consumo";
import { ActionButton } from "@/components/consumo/action-button";
import { NewBookingForm } from "@/components/consumo/new-booking-form";
import { BookingStatusBadge } from "@/components/consumo/status-badge";

// Sesiones 1:1 y flash (F2.1). Alumno: solicitar + sus reservas. Mentor: solicitudes
// pendientes, próximas y historial. La sala (meeting_url) solo la ven las partes.
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/panel/sesiones">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "consumo" });
  return { title: `${t("sessionsTitle")} · Tutor247`, robots: { index: false } };
}

export default async function SesionesPage({
  params,
  searchParams,
}: PageProps<"/[locale]/panel/sesiones">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getSessionUser();
  if (!session) redirect(localePath(locale, "/entrar"));
  const { user, profile } = session!;
  const role = profile?.role;
  if (role !== "alumno" && role !== "mentor") redirect(localePath(locale, "/panel"));

  const t = await getTranslations("consumo");
  const sp = await searchParams;
  const moduloParam = typeof sp.modulo === "string" ? sp.modulo : undefined;

  let contenido: React.ReactNode;
  if (role === "alumno") {
    const [{ bookings, nombres }, tarifas, ctx, catalogo, mentores] = await Promise.all([
      getStudentBookings(user.id),
      getTarifas(),
      getSaldoYModulos(user.id),
      buscarModulos(""),
      getMentores(),
    ]);
    const modulos = ordenarModulos(
      catalogo.map((m) => ({ code: m.code, name: m.name })),
      ctx.misModulos,
    );
    const def = modulos.some((m) => m.code === moduloParam) ? moduloParam : undefined;
    contenido = (
      <>
        <section aria-labelledby="nueva" className="hud-grid rounded-xl border border-primary/30 bg-card p-6">
          <h2 id="nueva" className="font-display text-xl font-semibold">
            {t("newSessionTitle")}
          </h2>
          <p className="mt-1 mb-5 text-sm text-muted-foreground">{t("newSessionHelp")}</p>
          <NewBookingForm
            locale={locale}
            modulos={modulos}
            balance={ctx.balance}
            defaultModulo={def}
            minDate={minReservaLocal()}
            mentores={mentores.map((m) => ({
              id: m.profile_id,
              name: m.full_name ?? "",
              level: m.level,
              headline: m.headline,
              modulos: m.modulos.map((x) => x.code),
            }))}
            prices={{
              sesion_flash: tarifas.sesion_flash ?? {},
              sesion_1a1: tarifas.sesion_1a1 ?? {},
            }}
          />
        </section>
        <BookingList
          title={t("mySessions")}
          empty={t("mySessionsEmpty")}
          bookings={bookings}
          nombres={nombres}
          locale={locale}
          viewer="alumno"
        />
      </>
    );
  } else {
    const { bookings, nombres } = await getMentorBookings(user.id);
    const solicitudes = bookings.filter((b) => b.status === "solicitada");
    const resto = bookings.filter((b) => b.status !== "solicitada");
    contenido = (
      <>
        <BookingList
          title={t("requestsTitle")}
          empty={t("requestsEmpty")}
          bookings={solicitudes}
          nombres={nombres}
          locale={locale}
          viewer="mentor"
        />
        <BookingList
          title={t("mentorSessions")}
          empty={t("mentorSessionsEmpty")}
          bookings={resto}
          nombres={nombres}
          locale={locale}
          viewer="mentor"
        />
      </>
    );
  }

  return (
    <main className="w-full flex-1 bg-background text-foreground">
      <div className="mx-auto w-full max-w-5xl space-y-10 px-4 py-12">
        <header>
          <Link href="/panel" className="font-mono text-xs text-muted-foreground hover:text-primary">
            ← {t("backToPanel")}
          </Link>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">{t("sessionsTitle")}</h1>
        </header>
        {contenido}
      </div>
    </main>
  );
}

async function BookingList({
  title,
  empty,
  bookings,
  nombres,
  locale,
  viewer,
}: {
  title: string;
  empty: string;
  bookings: BookingRow[];
  nombres: Nombres;
  locale: string;
  viewer: "alumno" | "mentor";
}) {
  const t = await getTranslations("consumo");
  const fecha = (iso: string) =>
    new Intl.DateTimeFormat(locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Madrid",
    }).format(new Date(iso));

  return (
    <section aria-label={title}>
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {bookings.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {bookings.map((b) => {
            const otro = viewer === "alumno" ? b.mentor_id : b.student_id;
            const empezada = b.started;
            const terminada = b.ended;
            const fields = { locale, booking: b.id };
            return (
              <li key={b.id} className="rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {b.modulo && <span className="font-mono text-xs text-primary">{b.modulo.code}</span>}
                      <span className="font-mono text-xs text-muted-foreground">
                        {t(`kind.${b.product_kind}`)} · {t("creditsN", { n: b.credits ?? 0 })}
                      </span>
                      <BookingStatusBadge status={b.status} label={t(`bookingStatus.${b.status}`)} />
                    </div>
                    <p className="mt-1 font-medium">
                      {fecha(b.starts_at)}
                      <span className="text-muted-foreground">
                        {" "}
                        · {viewer === "alumno" ? t("mentor") : t("student")}: {nombres[otro] || "—"}
                      </span>
                    </p>
                    {b.note && <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">{b.note}</p>}
                    {b.status === "confirmada" && b.meeting_url && !terminada && (
                      <a
                        href={b.meeting_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-sm text-primary hover:underline"
                      >
                        {t("joinRoom")} →
                      </a>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {viewer === "mentor" && b.status === "solicitada" && !empezada && (
                      <>
                        <ActionButton
                          action={respondBookingAction}
                          fields={{ ...fields, accept: "true" }}
                          label={t("accept")}
                          variant="default"
                        />
                        <ActionButton
                          action={respondBookingAction}
                          fields={{ ...fields, accept: "false" }}
                          label={t("reject")}
                          variant="outline"
                        />
                      </>
                    )}
                    {viewer === "mentor" && b.status === "confirmada" && empezada && (
                      <ActionButton
                        action={completeBookingAction}
                        fields={fields}
                        label={t("markDone")}
                        variant="default"
                      />
                    )}
                    {((viewer === "alumno" && b.status === "solicitada") ||
                      (b.status === "confirmada" && !empezada)) && (
                      <ActionButton
                        action={cancelBookingAction}
                        fields={fields}
                        label={t("cancelSession")}
                        variant="ghost"
                      />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
