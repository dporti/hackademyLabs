import { getTranslations } from "next-intl/server";
import { CalendarClock, Inbox, MessageSquareText, Wallet } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { MentorProfileForm } from "@/components/panel/mentor-profile-form";
import { MentorStatusBadge } from "@/components/panel/mentor-status-badge";
import type { MentorSelf } from "@/lib/mentor";
import type { BookingRow, MentorEarnings, Nombres, TicketRow, getPendientesMentor } from "@/lib/consumo";
import type { Modulo } from "@/lib/db-types";
import { horasHasta } from "@/lib/tiempo";

// Panel del mentor (maqueta PanelMentor.html) con los datos que existen: estado y
// nivel, cifras del mes, próxima sesión, agenda de los próximos días y bandeja de
// tickets asignados. Brief de Bit, alertas de riesgo y generador de material dependen
// de Bit: no se muestran todavía.
export async function MentorPanel({
  locale,
  mentor,
  pendientes,
  earnings,
  catalogo,
  bookings = [],
  tickets = [],
  nombres = {},
}: {
  locale: string;
  mentor: MentorSelf;
  pendientes: Awaited<ReturnType<typeof getPendientesMentor>>;
  earnings: MentorEarnings;
  catalogo: Pick<Modulo, "code" | "name">[];
  bookings?: BookingRow[];
  tickets?: TicketRow[];
  nombres?: Nombres;
}) {
  const t = await getTranslations("mentorPanel");
  const tc = await getTranslations("consumo");
  const verificado = mentor.status === "verificado";

  const hora = (iso: string) =>
    new Intl.DateTimeFormat(locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Madrid",
    }).format(new Date(iso));

  // Agenda: sesiones confirmadas o por confirmar que aún no han terminado (más cercanas primero).
  const agenda = bookings
    .filter((b) => (b.status === "confirmada" || b.status === "solicitada") && !b.ended)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const proxima = agenda.find((b) => b.status === "confirmada");
  // Bandeja: tickets asignados aún sin responder, el que antes vence primero.
  const bandeja = tickets
    .filter((tk) => tk.status === "abierto" && !tk.answered_at)
    .sort((a, b) => (a.due_at ?? "").localeCompare(b.due_at ?? ""));

  const cifras = [
    { icon: Wallet, label: tc("earningsMonth"), value: earnings.monthCredits, unit: tc("creditsUnit"), href: undefined },
    { icon: Inbox, label: t("statPool"), value: pendientes.bolsa, unit: t("statPoolUnit"), href: "/panel/tickets" },
    { icon: MessageSquareText, label: t("statToAnswer"), value: pendientes.ticketsPorResponder, unit: t("statToAnswerUnit"), href: "/panel/tickets" },
    { icon: CalendarClock, label: t("statRequests"), value: pendientes.solicitudes, unit: t("statRequestsUnit"), href: "/panel/sesiones" },
  ];

  return (
    <div className="mt-8 space-y-12">
      {/* Estado: protagonista mientras no esté verificado; una línea cuando ya lo está. */}
      {verificado ? (
        <p className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <MentorStatusBadge status={mentor.status} label={t(`status.${mentor.status}`)} />
          <span className="font-mono">
            {t("levelLabel")}: <span className="text-foreground">{t(`level.${mentor.level}`)}</span>
          </span>
          <Link href={`/mentores/${mentor.profile_id}`} className="text-primary hover:underline">
            {t("viewPublic")} →
          </Link>
        </p>
      ) : (
        <section aria-labelledby="estado" className="glow rounded-3xl border border-tint-primary-border bg-tint-primary p-6">
          <h2 id="estado" className="font-mono text-xs tracking-[0.2em] text-label uppercase">
            {t("statusTitle")}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <MentorStatusBadge status={mentor.status} label={t(`status.${mentor.status}`)} />
            <span className="font-mono text-sm text-muted-foreground">
              {t("levelLabel")}: <span className="text-foreground">{t(`level.${mentor.level}`)}</span>
            </span>
          </div>
          <p className="mt-3 text-muted-foreground">{t(`statusHelp.${mentor.status}`)}</p>
        </section>
      )}

      {verificado && (
        <>
          {/* Cifras */}
          <section aria-label={t("statsAria")} className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {cifras.map((c, i) => {
              const cuerpo = (
                <>
                  <p className="flex items-center gap-2 text-sm text-label">
                    <c.icon aria-hidden className="size-4" />
                    {c.label}
                  </p>
                  <p className="mt-2 font-mono text-3xl font-semibold text-primary">{c.value}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{c.unit}</p>
                </>
              );
              const cls = `rounded-2xl border p-5 ${i === 0 ? "glow border-tint-primary-border bg-tint-primary" : "bg-card"}`;
              return c.href ? (
                <Link key={c.label} href={c.href} className={`card-interactive ${cls}`}>
                  {cuerpo}
                </Link>
              ) : (
                <div key={c.label} className={cls}>
                  {cuerpo}
                </div>
              );
            })}
          </section>
          <p className="-mt-8 text-xs text-label">
            {tc("earningsHelp", { n: earnings.monthItems, total: earnings.totalCredits })}
          </p>

          {/* Próxima sesión */}
          {proxima ? (
            <section
              aria-labelledby="proxima"
              className="flex flex-col gap-4 rounded-3xl border border-tint-primary-border bg-tint-primary p-6 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p id="proxima" className="font-mono text-xs tracking-[0.2em] text-primary uppercase">
                  {t("nextSession")} · {hora(proxima.starts_at)}
                </p>
                <p className="mt-2 font-heading text-xl font-semibold">
                  {nombres[proxima.student_id] || tc("student")} ·{" "}
                  {proxima.modulo ? `${proxima.modulo.code} ${proxima.modulo.name}` : tc(`kind.${proxima.product_kind}`)}
                </p>
                {proxima.note && <p className="mt-1 text-sm text-muted-foreground">{proxima.note}</p>}
              </div>
              {proxima.meeting_url && (
                <a
                  href={proxima.meeting_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-primary px-5 font-bold text-primary-foreground hover:bg-primary/85"
                >
                  {tc("joinRoom")}
                </a>
              )}
            </section>
          ) : (
            <p className="rounded-2xl border border-dashed p-5 text-muted-foreground">{t("noNextSession")}</p>
          )}

          <div className="grid gap-8 xl:grid-cols-2">
            {/* Agenda */}
            <section aria-labelledby="agenda">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="agenda" className="font-heading text-2xl font-bold">
                  {t("agendaTitle")}
                </h2>
                <Link href="/panel/sesiones" className="text-sm font-semibold text-primary hover:underline">
                  {t("seeAll")} →
                </Link>
              </div>
              {agenda.length === 0 ? (
                <p className="mt-4 text-muted-foreground">{t("agendaEmpty")}</p>
              ) : (
                <ol className="mt-4 space-y-2.5">
                  {agenda.slice(0, 5).map((b) => (
                    <li key={b.id} className="flex items-start gap-4 rounded-2xl border bg-card p-4">
                      <span className="w-28 shrink-0 font-mono text-xs text-primary first-letter:uppercase">
                        {hora(b.starts_at)}
                      </span>
                      <span className="min-w-0 text-sm">
                        <span className="font-semibold">{tc(`kind.${b.product_kind}`)}</span>
                        {" · "}
                        {nombres[b.student_id] || tc("student")}
                        {b.modulo && <span className="font-mono text-label"> · {b.modulo.code}</span>}
                        {b.status === "solicitada" && (
                          <span className="ml-2 rounded-md border border-tint-warning-border bg-tint-warning px-1.5 py-0.5 text-xs text-warning">
                            {tc("bookingStatus.solicitada")}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {/* Bandeja de tickets */}
            <section aria-labelledby="bandeja">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="bandeja" className="font-heading text-2xl font-bold">
                  {t("inboxTitle")}
                </h2>
                <Link href="/panel/tickets" className="text-sm font-semibold text-primary hover:underline">
                  {t("seeAll")} →
                </Link>
              </div>
              {bandeja.length === 0 ? (
                <p className="mt-4 text-muted-foreground">{t("inboxEmpty")}</p>
              ) : (
                <ul className="mt-4 space-y-2.5">
                  {bandeja.slice(0, 5).map((tk) => {
                    const h = tk.due_at ? horasHasta(tk.due_at) : null;
                    return (
                      <li key={tk.id}>
                        <Link href={`/panel/tickets/${tk.id}`} className="card-interactive block rounded-2xl border bg-card p-4">
                          <p className="flex flex-wrap items-center gap-2 font-mono text-xs">
                            <span className={tk.kind === "ticket_express" ? "text-sos-text" : "text-label"}>
                              {tc(`kind.${tk.kind}`)}
                            </span>
                            <span className="text-label">
                              · {nombres[tk.student_id] || tc("student")}
                              {tk.modulo && ` · ${tk.modulo.code}`}
                            </span>
                            {h != null && (
                              <span className={h < 0 ? "text-sos-text" : h <= 2 ? "text-warning" : "text-label"}>
                                · {h < 0 ? t("overdue") : t("dueIn", { h })}
                              </span>
                            )}
                          </p>
                          <p className="mt-1.5 font-semibold break-words">{tk.subject}</p>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </>
      )}

      {/* Perfil público: plegado si ya está verificado (se edita poco). */}
      <section aria-labelledby="perfil" className="rounded-3xl border bg-card p-5 sm:p-7">
        <details open={!verificado}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3">
            <span>
              <span id="perfil" className="block font-heading text-2xl font-bold">
                {t("profileTitle")}
              </span>
              <span className="block text-sm text-muted-foreground">{t("profileHelp")}</span>
            </span>
            <span aria-hidden className="font-mono text-primary">±</span>
          </summary>
          <div className="mt-6">
            <MentorProfileForm locale={locale} initial={mentor} modulos={catalogo} />
          </div>
        </details>
      </section>
    </div>
  );
}
