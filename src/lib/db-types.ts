// Tipos de la base de datos (mantenidos a mano mientras no haya CLI/MCP de Supabase
// para `supabase gen types`). Reflejan el esquema de supabase/migrations.
// Al habilitar la CLI/MCP, sustituir por database.types.ts autogenerado.

export type GradeLevel = "medio" | "superior";
export type UserRole =
  | "alumno"
  | "familia"
  | "mentor"
  | "tutor_referencia"
  | "admin";
export type StudentMode = "autonomo" | "familia";
export type MentorLevel = "mentor" | "pro" | "experto";
export type MentorStatus = "pendiente" | "verificado" | "rechazado";
export type RaStatus = "verde" | "ambar" | "rojo";
export type LedgerType =
  | "compra_pack"
  | "bonus"
  | "gasto"
  | "caducidad"
  | "ajuste"
  | "devolucion";
export type ProductKind =
  | "diagnostico"
  | "sesion_1a1"
  | "sesion_flash"
  | "ticket_express"
  | "ticket_normal"
  | "revision"
  | "simulacro"
  | "rescate_48h"
  | "plan_modulo"
  | "defensa_proyecto"
  | "grupo_reducido";
export type PlanKind = "gratis" | "companero" | "acompana" | "acompana_plus";

export interface Ciclo {
  id: string;
  code: string;
  name: string;
  grade: GradeLevel;
  sort_order: number;
}

export interface Modulo {
  id: string;
  code: string;
  name: string;
  description: string | null;
  hours: number | null;
  killer: boolean;
}

export interface Ra {
  id: string;
  modulo_id: string;
  code: string;
  description: string;
  weight: number | null;
  sort_order: number;
}

export interface ModuloEquivCat {
  id: string;
  modulo_id: string;
  codigo_cat: string;
  uf: string | null;
  comunidad: string;
}

export interface Pack {
  id: string;
  slug: string;
  name: string;
  price_eur: number;
  credits: number;
  bonus_pct: number;
  active: boolean;
  sort_order: number;
}

export interface Plan {
  id: string;
  kind: PlanKind;
  name: string;
  price_eur_month: number;
  features: string[];
  active: boolean;
  sort_order: number;
}

// Vista pública de mentores (sin PII de contacto).
export interface MentorPublic {
  profile_id: string;
  full_name: string | null;
  avatar_url: string | null;
  level: MentorLevel;
  headline: string | null;
  bio: string | null;
  video_url: string | null;
  languages: string[];
  response_time_minutes: number | null;
}

// Movimiento del ledger de créditos (inmutable; saldo = suma de amount).
export interface CreditLedgerEntry {
  id: string;
  student_id: string;
  type: LedgerType;
  amount: number;
  product_kind: ProductKind | null;
  mentor_id: string | null;
  pack_id: string | null;
  ticket_id: string | null;
  booking_id: string | null;
  expires_at: string | null;
  note: string | null;
  created_at: string;
}

// Módulo que prepara el alumno (N:M alumno ↔ módulo).
export interface StudentModulo {
  student_id: string;
  modulo_id: string;
  exam_date: string | null;
  created_at: string;
}

// ───────────────────────── Tickets y reservas (F2.1) ─────────────────────────
export type TicketKind = "ticket_normal" | "ticket_express";
export type TicketStatus = "abierto" | "respondido" | "cerrado" | "cancelado";
export type BookingKind = "sesion_1a1" | "sesion_flash";
export type BookingStatus =
  | "solicitada"
  | "confirmada"
  | "hecha"
  | "rechazada"
  | "cancelada";

export interface Ticket {
  id: string;
  student_id: string;
  mentor_id: string | null;
  modulo_id: string | null;
  kind: TicketKind;
  subject: string | null;
  body: string | null;
  status: TicketStatus;
  credits: number | null;
  due_at: string | null;
  answered_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export interface Booking {
  id: string;
  student_id: string;
  mentor_id: string;
  modulo_id: string | null;
  product_kind: BookingKind;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  credits: number | null;
  note: string | null;
  meeting_url: string | null;
  cancelled_by: string | null;
  created_at: string;
}

export interface ProductPrice {
  kind: ProductKind;
  level: MentorLevel;
  credits: number;
}

// Contacto sin cuenta: "Pregunta gratis" o "Quiero que me llaméis" (tabla lead).
export type LeadKind = "pregunta" | "llamada";
export type LeadStatus = "nuevo" | "contactado" | "cerrado";
export interface Lead {
  id: string;
  kind: LeadKind;
  status: LeadStatus;
  name: string | null;
  contact: string;
  quien: "alumno" | "familia" | null;
  modulo_code: string | null;
  message: string | null;
  preferred_time: string | null;
  consent: boolean;
  locale: string;
  admin_note: string | null;
  created_at: string;
  handled_at: string | null;
}
