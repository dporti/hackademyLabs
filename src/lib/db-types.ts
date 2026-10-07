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
