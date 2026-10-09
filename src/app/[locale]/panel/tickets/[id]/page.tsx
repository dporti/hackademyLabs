import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSessionUser, localePath } from "@/lib/auth";
import { getTicketDetail } from "@/lib/consumo";
import {
  cancelTicketAction,
  claimTicketAction,
  closeTicketAction,
  releaseTicketAction,
} from "@/app/actions/consumo";
import { ActionButton } from "@/components/consumo/action-button";
import { TicketReplyForm } from "@/components/consumo/ticket-reply-form";
import { TicketStatusBadge } from "@/components/consumo/status-badge";

// Hilo de un ticket. La RLS decide si el usuario puede verlo (alumno dueño, mentor
// asignado, mentor del módulo si está en la bolsa, admin); si no, 404.
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/panel/tickets/[id]">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "consumo" });
  return { title: t("ticketTitle"), robots: { index: false } };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TicketPage({
  params,
  searchParams,
}: PageProps<"/[locale]/panel/tickets/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await getSessionUser();
  if (!session) redirect(localePath(locale, "/entrar"));
  const { user } = session!;
  if (!UUID.test(id)) notFound();

  const detail = await getTicketDetail(id, user.id);
  if (!detail) notFound();
  const { ticket, messages, nombres, vencido } = detail;
  const t = await getTranslations("consumo");
  const sp = await searchParams;

  const esAlumno = user.id === ticket.student_id;
  const esMentor = user.id === ticket.mentor_id;
  const enBolsa = !ticket.mentor_id && !esAlumno && ticket.status === "abierto";
  const activo = ticket.status !== "cerrado" && ticket.status !== "cancelado";

  const fecha = (iso: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Madrid",
    }).format(new Date(iso));

  const autor = (authorId: string) => {
    if (authorId === user.id) return t("you");
    if (authorId === ticket.student_id) return nombres[authorId] || t("student");
    return nombres[authorId] || t("mentor");
  };

  return (
    <div className="w-full">
      <div className="w-full max-w-3xl space-y-8">
        <header>
          <Link href="/panel/tickets" className="font-mono text-xs text-muted-foreground hover:text-primary">
            ← {t("ticketsTitle")}
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {ticket.modulo && (
              <Link href={`/modulos/${ticket.modulo.code}`} className="font-mono text-sm text-primary hover:underline">
                {ticket.modulo.code}
              </Link>
            )}
            <span className="font-mono text-xs text-muted-foreground">{t(`kind.${ticket.kind}`)}</span>
            <span className="font-mono text-xs text-muted-foreground">
              · {t("creditsN", { n: ticket.credits ?? 0 })}
            </span>
            <TicketStatusBadge status={ticket.status} label={t(`ticketStatus.${ticket.status}`)} />
          </div>
          <h1 className="mt-3 font-heading text-[28px] leading-tight font-bold tracking-tight break-words sm:text-[34px]">{ticket.subject}</h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {fecha(ticket.created_at)}
            {ticket.due_at && !ticket.answered_at && activo && ` · ${t("dueAt", { date: fecha(ticket.due_at) })}`}
          </p>
          {sp.oculto === "1" && (
            <p className="mt-3 text-xs text-warning">{t("redactedNotice")}</p>
          )}
        </header>

        {/* Pregunta inicial + hilo */}
        <ol className="space-y-4">
          <li className="rounded-2xl rounded-tl-sm border bg-card p-5">
            <p className="font-mono text-xs tracking-wider text-label uppercase">
              {autor(ticket.student_id)} · {t("question")}
            </p>
            <p className="mt-2 font-mono text-sm whitespace-pre-wrap break-words">{ticket.body}</p>
          </li>
          {messages.map((m) => (
            <li
              key={m.id}
              className={`rounded-2xl border p-5 ${
                m.author_id === ticket.student_id
                  ? "rounded-tl-sm bg-card"
                  : "ml-6 rounded-tr-sm border-tint-primary-border bg-tint-primary"
              }`}
            >
              <p className="font-mono text-xs tracking-wider text-label uppercase">
                {autor(m.author_id)} · <span className="font-mono">{fecha(m.created_at)}</span>
              </p>
              <p className="mt-2 font-mono text-sm whitespace-pre-wrap break-words">{m.body}</p>
            </li>
          ))}
        </ol>

        {!ticket.mentor_id && ticket.status === "abierto" && esAlumno && (
          <p className="text-sm text-muted-foreground">{t("waitingMentor")}</p>
        )}
        {ticket.mentor_id && vencido && ticket.status === "abierto" && esAlumno && (
          <p className="rounded-xl border border-tint-warning-border bg-tint-warning p-4 text-sm text-warning">{t("overdueNotice")}</p>
        )}
        {esAlumno && activo && (
          <p className="text-xs text-muted-foreground">
            <Link href="/cancelacion" className="underline-offset-4 hover:underline">
              {t("policyLink")}
            </Link>
          </p>
        )}

        {/* Acciones */}
        <div className="flex flex-wrap gap-3">
          {enBolsa && (
            <ActionButton
              action={claimTicketAction}
              fields={{ locale, ticket: ticket.id }}
              label={t("claim", { n: ticket.credits ?? 0 })}
              variant="default"
            />
          )}
          {/* Política de cancelación: libre → siempre; cogido → solo con el plazo vencido. */}
          {esAlumno && ticket.status === "abierto" && !ticket.answered_at && (!ticket.mentor_id || vencido) && (
            <ActionButton
              action={cancelTicketAction}
              fields={{ locale, ticket: ticket.id }}
              label={ticket.mentor_id ? t("cancelOverdue") : t("cancelTicket")}
              variant="outline"
            />
          )}
          {esAlumno && ticket.answered_at && activo && (
            <ActionButton
              action={closeTicketAction}
              fields={{ locale, ticket: ticket.id }}
              label={t("closeTicket")}
              variant="outline"
            />
          )}
          {esMentor && !ticket.answered_at && activo && (
            <ActionButton
              action={releaseTicketAction}
              fields={{ locale, ticket: ticket.id }}
              label={t("releaseTicket")}
              variant="ghost"
            />
          )}
        </div>

        {(esAlumno || esMentor) && activo && (
          <section aria-label={t("reply")} className="rounded-2xl border bg-card p-5">
            <TicketReplyForm
              locale={locale}
              ticketId={ticket.id}
              placeholder={esMentor ? t("replyPlaceholderMentor") : t("replyPlaceholderStudent")}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {esMentor ? t("mentorIntegrity") : t("contactNotice")}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
