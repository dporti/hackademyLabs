import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Booking,
  MentorLevel,
  Modulo,
  ProductKind,
  ProductPrice,
  Ticket,
  TicketMessage,
} from "@/lib/db-types";

// Capa de datos de tickets, reservas y ganancias de mentor (F2.1). Solo LECTURA con
// el cliente SSR: la RLS decide qué ve cada uno (alumno → lo suyo; mentor → lo
// asignado + la bolsa de su módulo; admin → todo). Las escrituras van por las RPC
// de `app/actions/consumo.ts`.

type Sb = Awaited<ReturnType<typeof createClient>>;
type ModuloRef = Pick<Modulo, "code" | "name"> | null;

export type TicketRow = Ticket & { modulo: ModuloRef };
// started/ended se calculan en servidor al leer (la UI no llama a Date.now en render).
export type BookingRow = Booking & { modulo: ModuloRef; started: boolean; ended: boolean };

function conTiempos(rows: unknown[]): BookingRow[] {
  const ahora = Date.now();
  return (rows as (Booking & { modulo: ModuloRef })[]).map((b) => ({
    ...b,
    started: new Date(b.starts_at).getTime() <= ahora,
    ended: new Date(b.ends_at).getTime() < ahora,
  }));
}

// Valor mínimo del selector de fecha de reserva: ahora + 3 h en hora de Madrid
// ("AAAA-MM-DDTHH:MM"), igual que exige la RPC.
export function minReservaLocal() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(Date.now() + 3 * 3600_000))
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

// Nombre visible de la otra parte, por id de perfil.
export type Nombres = Record<string, string>;

// Mentores: nombre público (vista sin PII). Alumnos: solo nombre de pila, y solo los
// que tienen algo asignado con el mentor actual (RPC my_student_names).
async function nombresMentores(sb: Sb, ids: string[]): Promise<Nombres> {
  if (!ids.length) return {};
  const { data } = await sb.from("mentor_public").select("profile_id, full_name").in("profile_id", ids);
  return Object.fromEntries((data ?? []).map((m) => [m.profile_id, m.full_name ?? ""]));
}

async function nombresAlumnos(sb: Sb, ids: string[]): Promise<Nombres> {
  if (!ids.length) return {};
  const { data } = await sb.rpc("my_student_names", { p_ids: ids });
  return Object.fromEntries(
    ((data ?? []) as { id: string; first_name: string }[]).map((r) => [r.id, r.first_name]),
  );
}

const unicos = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => !!x))];

// ─────────────────────────────── Tarifas ────────────────────────────────
export type Tarifas = Partial<Record<ProductKind, Partial<Record<MentorLevel, number>>>>;

export async function getTarifas(): Promise<Tarifas> {
  const sb = await createClient();
  const { data, error } = await sb.from("product_price").select("kind, level, credits");
  if (error) throw error;
  const out: Tarifas = {};
  for (const p of (data ?? []) as ProductPrice[]) {
    (out[p.kind] ??= {})[p.level] = p.credits;
  }
  return out;
}

// ─────────────────────────────── Tickets ────────────────────────────────
const TICKET_SELECT = "*, modulo(code, name)";

export async function getStudentTickets(studentId: string) {
  const sb = await createClient();
  const { data, error } = await sb
    .from("ticket")
    .select(TICKET_SELECT)
    .eq("student_id", studentId)
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  const tickets = (data ?? []) as unknown as TicketRow[];
  return { tickets, nombres: await nombresMentores(sb, unicos(tickets.map((t) => t.mentor_id))) };
}

export async function getMentorTickets(mentorId: string) {
  const sb = await createClient();
  const [poolRes, mineRes] = await Promise.all([
    // Bolsa: la RLS (ticket_mentor_pool) ya limita a sus módulos y a verificados.
    sb
      .from("ticket")
      .select(TICKET_SELECT)
      .is("mentor_id", null)
      .eq("status", "abierto")
      .order("due_at"),
    sb
      .from("ticket")
      .select(TICKET_SELECT)
      .eq("mentor_id", mentorId)
      .order("updated_at", { ascending: false })
      .limit(50),
  ]);
  if (poolRes.error) throw poolRes.error;
  if (mineRes.error) throw mineRes.error;
  const mine = (mineRes.data ?? []) as unknown as TicketRow[];
  return {
    pool: (poolRes.data ?? []) as unknown as TicketRow[],
    mine,
    nombres: await nombresAlumnos(sb, unicos(mine.map((t) => t.student_id))),
  };
}

export interface TicketDetail {
  ticket: TicketRow;
  messages: TicketMessage[];
  nombres: Nombres;
}

// null si no existe o la RLS no deja verlo.
export async function getTicketDetail(id: string, viewerId: string): Promise<TicketDetail | null> {
  const sb = await createClient();
  const { data, error } = await sb.from("ticket").select(TICKET_SELECT).eq("id", id).maybeSingle();
  if (error || !data) return null;
  const ticket = data as unknown as TicketRow;
  const { data: msgs } = await sb
    .from("ticket_message")
    .select("*")
    .eq("ticket_id", id)
    .order("created_at");
  const nombres =
    viewerId === ticket.student_id
      ? await nombresMentores(sb, unicos([ticket.mentor_id]))
      : await nombresAlumnos(sb, [ticket.student_id]);
  return { ticket, messages: (msgs ?? []) as TicketMessage[], nombres };
}

// ─────────────────────────────── Reservas ───────────────────────────────
const BOOKING_SELECT = "*, modulo(code, name)";

export async function getStudentBookings(studentId: string) {
  const sb = await createClient();
  const { data, error } = await sb
    .from("booking")
    .select(BOOKING_SELECT)
    .eq("student_id", studentId)
    .order("starts_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  const bookings = conTiempos(data ?? []);
  return { bookings, nombres: await nombresMentores(sb, unicos(bookings.map((b) => b.mentor_id))) };
}

export async function getMentorBookings(mentorId: string) {
  const sb = await createClient();
  const { data, error } = await sb
    .from("booking")
    .select(BOOKING_SELECT)
    .eq("mentor_id", mentorId)
    .order("starts_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  const bookings = conTiempos(data ?? []);
  return { bookings, nombres: await nombresAlumnos(sb, unicos(bookings.map((b) => b.student_id))) };
}

// ─────────────────────── Ganancias del mentor ───────────────────────
export interface MentorEarnings {
  monthCredits: number;
  totalCredits: number;
  monthItems: number;
}

export async function getMentorEarnings(mentorId: string): Promise<MentorEarnings> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("mentor_earning")
    .select("credits, created_at")
    .eq("mentor_id", mentorId);
  if (error) throw error;
  const inicioMes = new Date();
  inicioMes.setUTCDate(1);
  inicioMes.setUTCHours(0, 0, 0, 0);
  const rows = data ?? [];
  const delMes = rows.filter((r) => new Date(r.created_at) >= inicioMes);
  return {
    monthCredits: delMes.reduce((s, r) => s + r.credits, 0),
    totalCredits: rows.reduce((s, r) => s + r.credits, 0),
    monthItems: delMes.length,
  };
}

// Pendientes para los accesos del panel (badges con número).
export async function getPendientesAlumno(studentId: string) {
  const sb = await createClient();
  const [t, b] = await Promise.all([
    sb
      .from("ticket")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("status", "respondido"),
    sb
      .from("booking")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("status", "confirmada")
      .gte("ends_at", new Date().toISOString()),
  ]);
  return { ticketsRespondidos: t.count ?? 0, sesionesProximas: b.count ?? 0 };
}

export async function getPendientesMentor(mentorId: string) {
  const sb = await createClient();
  const [pool, mios, solicitudes] = await Promise.all([
    sb.from("ticket").select("id", { count: "exact", head: true }).is("mentor_id", null).eq("status", "abierto"),
    sb
      .from("ticket")
      .select("id", { count: "exact", head: true })
      .eq("mentor_id", mentorId)
      .eq("status", "abierto"),
    sb
      .from("booking")
      .select("id", { count: "exact", head: true })
      .eq("mentor_id", mentorId)
      .eq("status", "solicitada"),
  ]);
  return {
    bolsa: pool.count ?? 0,
    ticketsPorResponder: mios.count ?? 0,
    solicitudes: solicitudes.count ?? 0,
  };
}

// Saldo y códigos de los módulos que prepara el alumno (para preordenar selectores).
export async function getSaldoYModulos(studentId: string) {
  const sb = await createClient();
  const [bal, mods] = await Promise.all([
    sb.rpc("my_credit_balance"),
    sb.from("student_modulo").select("modulo(code)").eq("student_id", studentId),
  ]);
  return {
    balance: (bal.data as number | null) ?? 0,
    misModulos: ((mods.data ?? []) as unknown as { modulo: { code: string } | null }[])
      .map((m) => m.modulo?.code)
      .filter((c): c is string => !!c),
  };
}

// Los módulos del alumno primero, luego el resto del catálogo.
export function ordenarModulos<T extends { code: string }>(catalogo: T[], primero: string[]) {
  const set = new Set(primero);
  return [...catalogo.filter((m) => set.has(m.code)), ...catalogo.filter((m) => !set.has(m.code))];
}
