import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSessionUser, localePath } from "@/lib/auth";
import { buscarModulos } from "@/lib/catalog";
import {
  getMentorTickets,
  getSaldoYModulos,
  getStudentTickets,
  getTarifas,
  ordenarModulos,
  type Nombres,
  type TicketRow,
} from "@/lib/consumo";
import { claimTicketAction } from "@/app/actions/consumo";
import { ActionButton } from "@/components/consumo/action-button";
import { NewTicketForm } from "@/components/consumo/new-ticket-form";
import { TicketStatusBadge } from "@/components/consumo/status-badge";

// Tickets (F2.1). Alumno: pedir ayuda + sus tickets. Mentor: bolsa de su módulo +
// los que tiene asignados. Otros roles → panel.
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/panel/tickets">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "consumo" });
  return { title: t("ticketsTitle"), robots: { index: false } };
}

export default async function TicketsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/panel/tickets">) {
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
    const [{ tickets, nombres }, tarifas, ctx, catalogo] = await Promise.all([
      getStudentTickets(user.id),
      getTarifas(),
      getSaldoYModulos(user.id),
      buscarModulos(""),
    ]);
    const modulos = ordenarModulos(
      catalogo.map((m) => ({ code: m.code, name: m.name })),
      ctx.misModulos,
    );
    const def = modulos.some((m) => m.code === moduloParam) ? moduloParam : ctx.misModulos[0];
    contenido = (
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="nuevo" className="rounded-3xl border bg-card p-5 sm:p-7">
          <h2 id="nuevo" className="font-heading text-2xl font-bold">
            {t("newTicketTitle")}
          </h2>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">{t("newTicketHelp")}</p>
          <NewTicketForm
            locale={locale}
            modulos={modulos}
            balance={ctx.balance}
            defaultModulo={def}
            prices={{
              ticket_normal: tarifas.ticket_normal?.mentor ?? 0,
              ticket_express: tarifas.ticket_express?.mentor ?? 0,
            }}
          />
        </section>
        <TicketList
          title={t("myTickets")}
          empty={t("myTicketsEmpty")}
          tickets={tickets}
          nombres={nombres}
          locale={locale}
          otherLabel={t("mentor")}
          compact
        />
      </div>
    );
  } else {
    const { pool, mine, nombres } = await getMentorTickets(user.id);
    contenido = (
      <>
        <section aria-labelledby="bolsa">
          <h2 id="bolsa" className="font-heading text-2xl font-bold">
            {t("poolTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("poolHelp")}</p>
          {pool.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">{t("poolEmpty")}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {pool.map((tk) => (
                <li key={tk.id} className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border bg-card p-5">
                  <TicketResumen ticket={tk} locale={locale} />
                  <ActionButton
                    action={claimTicketAction}
                    fields={{ locale, ticket: tk.id }}
                    label={t("claim", { n: tk.credits ?? 0 })}
                    variant="default"
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
        <TicketList
          title={t("assignedTickets")}
          empty={t("assignedEmpty")}
          tickets={mine}
          nombres={nombres}
          locale={locale}
          otherLabel={t("student")}
          ownerKey="student_id"
        />
      </>
    );
  }

  return (
    <div className="w-full">
      <div className="w-full space-y-10">
        <header>
          <h1 className="font-heading text-[32px] leading-tight font-bold tracking-tight sm:text-[40px]">
            {role === "alumno" ? t("helpPageTitle") : t("ticketsTitle")}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {role === "alumno" ? t("helpPageSubtitle") : t("mentorTicketsSubtitle")}
          </p>
        </header>
        {contenido}
      </div>
    </div>
  );
}

async function TicketResumen({ ticket, locale }: { ticket: TicketRow; locale: string }) {
  const t = await getTranslations("consumo");
  const fecha = (iso: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Europe/Madrid",
    }).format(new Date(iso));
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        {ticket.modulo && <span className="font-mono text-xs font-semibold text-primary">{ticket.modulo.code}</span>}
        <span className="font-mono text-xs text-label">{t(`kind.${ticket.kind}`)}</span>
        <TicketStatusBadge status={ticket.status} label={t(`ticketStatus.${ticket.status}`)} />
      </div>
      <p className="mt-1.5 font-semibold break-words">{ticket.subject}</p>
      {ticket.due_at && !ticket.answered_at && ticket.status === "abierto" && (
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          {t("dueAt", { date: fecha(ticket.due_at) })}
        </p>
      )}
    </div>
  );
}

async function TicketList({
  title,
  empty,
  tickets,
  nombres,
  locale,
  otherLabel,
  ownerKey = "mentor_id",
  compact = false,
}: {
  title: string;
  empty: string;
  tickets: TicketRow[];
  nombres: Nombres;
  locale: string;
  otherLabel: string;
  ownerKey?: "mentor_id" | "student_id";
  // Columna lateral: título más pequeño y tarjetas apiladas.
  compact?: boolean;
}) {
  const t = await getTranslations("consumo");
  return (
    <section aria-label={title}>
      <h2 className={compact ? "font-heading text-lg font-bold" : "font-heading text-2xl font-bold"}>{title}</h2>
      {tickets.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {tickets.map((tk) => {
            const otro = tk[ownerKey];
            return (
              <li key={tk.id}>
                <Link
                  href={`/panel/tickets/${tk.id}`}
                  className={`card-interactive flex flex-wrap items-start justify-between gap-3 rounded-2xl border bg-card ${compact ? "p-4" : "p-5"}`}
                >
                  <TicketResumen ticket={tk} locale={locale} />
                  <span className="text-xs text-label">
                    {otro
                      ? `${otherLabel}: ${nombres[otro] || "—"}`
                      : tk.status === "abierto" && t("unassigned")}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
