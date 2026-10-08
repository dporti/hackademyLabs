"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { localePath } from "@/lib/auth";
import { redactContact } from "@/lib/contact-filter";
import type { UserRole } from "@/lib/db-types";

// Tickets y reservas (F2.1). Patrón: el servidor autentica al usuario con su sesión y
// llama a la RPC con service role pasando SU id (las RPC no son ejecutables desde el
// cliente). Cobro, devolución y atribución al mentor ocurren dentro de la RPC, en una
// transacción. Errores = CÓDIGOS (claves i18n de `consumo.errors`).

export interface ConsumoState {
  error?: string;
  ok?: string;
  // Se ocultaron datos de contacto en el texto enviado.
  redacted?: boolean;
}

const ERRORES = [
  "invalidKind",
  "noProfile",
  "moduloNotFound",
  "invalidText",
  "noMentorForModulo",
  "insufficientCredits",
  "notFound",
  "cannotCancel",
  "alreadyClaimed",
  "cannotRelease",
  "ticketClosed",
  "cannotClose",
  "mentorNotAvailable",
  "tooSoon",
  "tooFar",
  "slotTaken",
  "notPending",
  "expired",
  "tooLateToCancel",
  "notConfirmed",
  "notStarted",
  "noPrice",
];

function codigo(message: string) {
  return ERRORES.find((c) => message.includes(c)) ?? "generic";
}

async function requireUser(locale: string, roles: UserRole[]) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect(localePath(locale, "/entrar"));
  const { data: profile } = await sb
    .from("profile")
    .select("role")
    .eq("id", user!.id)
    .maybeSingle();
  if (!profile || !roles.includes(profile.role as UserRole)) return { error: "forbidden" as const };
  return { userId: user!.id, role: profile.role as UserRole };
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

// Ejecuta una RPC de consumo con service role y traduce el error a código.
async function rpc(fn: string, args: Record<string, unknown>) {
  const { data, error } = await createAdminClient().rpc(fn, args);
  return { data, error: error ? codigo(error.message) : undefined };
}

// ─────────────────────────────── Tickets ────────────────────────────────
export async function createTicketAction(
  _prev: ConsumoState,
  fd: FormData,
): Promise<ConsumoState> {
  const locale = str(fd, "locale") || "es";
  const ctx = await requireUser(locale, ["alumno"]);
  if (ctx.error) return { error: ctx.error };

  const subject = redactContact(str(fd, "subject"));
  const body = redactContact(str(fd, "body"));
  const { data, error } = await rpc("create_ticket", {
    p_student: ctx.userId,
    p_modulo_code: str(fd, "modulo"),
    p_kind: str(fd, "kind"),
    p_subject: subject.text,
    p_body: body.text,
  });
  if (error) return { error };
  const aviso = subject.redacted || body.redacted ? "?oculto=1" : "";
  redirect(localePath(locale, `/panel/tickets/${data as string}${aviso}`));
}

export async function postTicketMessageAction(
  _prev: ConsumoState,
  fd: FormData,
): Promise<ConsumoState> {
  const locale = str(fd, "locale") || "es";
  const ctx = await requireUser(locale, ["alumno", "mentor"]);
  if (ctx.error) return { error: ctx.error };
  const body = redactContact(str(fd, "body"));
  const { error } = await rpc("post_ticket_message", {
    p_author: ctx.userId,
    p_ticket: str(fd, "ticket"),
    p_body: body.text,
  });
  if (error) return { error };
  refresh();
  return { ok: "messageSent", redacted: body.redacted };
}

export async function cancelTicketAction(_prev: ConsumoState, fd: FormData): Promise<ConsumoState> {
  const locale = str(fd, "locale") || "es";
  const ctx = await requireUser(locale, ["alumno"]);
  if (ctx.error) return { error: ctx.error };
  const { error } = await rpc("cancel_ticket", { p_student: ctx.userId, p_ticket: str(fd, "ticket") });
  if (error) return { error };
  refresh();
  return { ok: "ticketCancelled" };
}

export async function closeTicketAction(_prev: ConsumoState, fd: FormData): Promise<ConsumoState> {
  const locale = str(fd, "locale") || "es";
  const ctx = await requireUser(locale, ["alumno"]);
  if (ctx.error) return { error: ctx.error };
  const { error } = await rpc("close_ticket", { p_student: ctx.userId, p_ticket: str(fd, "ticket") });
  if (error) return { error };
  refresh();
  return { ok: "ticketClosed" };
}

export async function claimTicketAction(_prev: ConsumoState, fd: FormData): Promise<ConsumoState> {
  const locale = str(fd, "locale") || "es";
  const ctx = await requireUser(locale, ["mentor"]);
  if (ctx.error) return { error: ctx.error };
  const ticket = str(fd, "ticket");
  const { error } = await rpc("claim_ticket", { p_mentor: ctx.userId, p_ticket: ticket });
  if (error) return { error };
  redirect(localePath(locale, `/panel/tickets/${ticket}`));
}

export async function releaseTicketAction(_prev: ConsumoState, fd: FormData): Promise<ConsumoState> {
  const locale = str(fd, "locale") || "es";
  const ctx = await requireUser(locale, ["mentor"]);
  if (ctx.error) return { error: ctx.error };
  const { error } = await rpc("release_ticket", { p_mentor: ctx.userId, p_ticket: str(fd, "ticket") });
  if (error) return { error };
  redirect(localePath(locale, "/panel/tickets"));
}

// ─────────────────────────────── Reservas ───────────────────────────────
export async function createBookingAction(
  _prev: ConsumoState,
  fd: FormData,
): Promise<ConsumoState> {
  const locale = str(fd, "locale") || "es";
  const ctx = await requireUser(locale, ["alumno"]);
  if (ctx.error) return { error: ctx.error };

  // datetime-local: "AAAA-MM-DDTHH:MM" (hora de pared, la RPC la interpreta en Madrid).
  const startsLocal = str(fd, "starts_at");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(startsLocal)) return { error: "invalidDate" };
  const note = redactContact(str(fd, "note"));

  const { error } = await rpc("create_booking", {
    p_student: ctx.userId,
    p_mentor: str(fd, "mentor"),
    p_modulo_code: str(fd, "modulo"),
    p_kind: str(fd, "kind"),
    p_starts_local: startsLocal,
    p_note: note.text,
  });
  if (error) return { error };
  refresh();
  return { ok: "bookingRequested", redacted: note.redacted };
}

export async function respondBookingAction(_prev: ConsumoState, fd: FormData): Promise<ConsumoState> {
  const locale = str(fd, "locale") || "es";
  const ctx = await requireUser(locale, ["mentor"]);
  if (ctx.error) return { error: ctx.error };
  const accept = str(fd, "accept") === "true";
  const { error } = await rpc("respond_booking", {
    p_mentor: ctx.userId,
    p_booking: str(fd, "booking"),
    p_accept: accept,
  });
  if (error) return { error };
  refresh();
  return { ok: accept ? "bookingConfirmed" : "bookingRejected" };
}

export async function cancelBookingAction(_prev: ConsumoState, fd: FormData): Promise<ConsumoState> {
  const locale = str(fd, "locale") || "es";
  const ctx = await requireUser(locale, ["alumno", "mentor"]);
  if (ctx.error) return { error: ctx.error };
  const { error } = await rpc("cancel_booking", { p_actor: ctx.userId, p_booking: str(fd, "booking") });
  if (error) return { error };
  refresh();
  return { ok: "bookingCancelled" };
}

export async function completeBookingAction(_prev: ConsumoState, fd: FormData): Promise<ConsumoState> {
  const locale = str(fd, "locale") || "es";
  const ctx = await requireUser(locale, ["mentor"]);
  if (ctx.error) return { error: ctx.error };
  const { error } = await rpc("complete_booking", { p_mentor: ctx.userId, p_booking: str(fd, "booking") });
  if (error) return { error };
  refresh();
  return { ok: "bookingCompleted" };
}
