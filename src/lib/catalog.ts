import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type {
  Ciclo,
  Modulo,
  Ra,
  ModuloEquivCat,
  Pack,
  Plan,
  MentorPublic,
} from "./db-types";

// Capa de acceso al catálogo. Lectura pública (anon) y cacheada: el catálogo
// cambia poco, así que las fichas se sirven casi estáticas (bueno para SEO).

type CicloConModulos = Ciclo & {
  ciclo_modulo: { curso: number | null; modulo: Modulo }[];
};

export async function getCiclosConModulos(): Promise<CicloConModulos[]> {
  "use cache";
  cacheLife("hours");
  const sb = createPublicClient();
  const { data, error } = await sb
    .from("ciclo")
    .select(
      "id, code, name, grade, sort_order, ciclo_modulo(curso, modulo(id, code, name, description, hours, killer))",
    )
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as unknown as CicloConModulos[];
}

export type ModuloDetalle = Modulo & {
  ra: Ra[];
  modulo_equiv_cat: ModuloEquivCat[];
  ciclo_modulo: {
    curso: number | null;
    ciclo: Pick<Ciclo, "code" | "name" | "grade">;
  }[];
};

export async function getModuloByCode(
  code: string,
): Promise<ModuloDetalle | null> {
  "use cache";
  cacheLife("hours");
  const sb = createPublicClient();
  const { data, error } = await sb
    .from("modulo")
    .select(
      "*, ra(*), modulo_equiv_cat(*), ciclo_modulo(curso, ciclo(code, name, grade))",
    )
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  // Ordena los RA por sort_order (PostgREST no ordena embebidos de forma fiable).
  if (data?.ra) data.ra.sort((a: Ra, b: Ra) => a.sort_order - b.sort_order);
  return data as unknown as ModuloDetalle | null;
}

// Módulos "killer" (más suspensos) para destacar en la home.
export async function getModulosKiller(): Promise<Modulo[]> {
  "use cache";
  cacheLife("hours");
  const sb = createPublicClient();
  const { data, error } = await sb
    .from("modulo")
    .select("*")
    .eq("killer", true)
    .order("code");
  if (error) throw error;
  return (data ?? []) as Modulo[];
}

export async function getAllModuloCodes(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  const sb = createPublicClient();
  const { data, error } = await sb.from("modulo").select("code");
  if (error) throw error;
  return (data ?? []).map((m) => m.code);
}

// Búsqueda de módulos por código, nombre o código catalán (M03…). Dinámica: depende
// de la query. El término se limpia de los caracteres con significado en los filtros
// de PostgREST (coma, paréntesis, comodines) para que no altere la consulta.
export async function buscarModulos(q: string): Promise<Modulo[]> {
  const sb = createPublicClient();
  const term = q.replace(/[,()*%\\]/g, " ").trim().slice(0, 60);
  let query = sb.from("modulo").select("*").order("code");
  if (term) {
    const { data: eq, error: eqError } = await sb
      .from("modulo_equiv_cat")
      .select("modulo_id")
      .ilike("codigo_cat", `%${term}%`);
    if (eqError) throw eqError;
    const ids = (eq ?? []).map((e) => e.modulo_id);
    const filtros = [`code.ilike.%${term}%`, `name.ilike.%${term}%`];
    if (ids.length > 0) filtros.push(`id.in.(${ids.join(",")})`);
    query = query.or(filtros.join(","));
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Modulo[];
}

// ─────────────────────────────── Mentores ───────────────────────────────
// Tag de caché de los datos públicos de mentores: las acciones de mentor/admin
// lo invalidan (updateTag) para que el perfil público refleje los cambios al momento.
export const MENTORES_TAG = "mentores";

export type MentorConModulos = MentorPublic & {
  modulos: Pick<Modulo, "code" | "name">[];
};

async function adjuntarModulos(
  sb: ReturnType<typeof createPublicClient>,
  mentores: MentorPublic[],
): Promise<MentorConModulos[]> {
  const ids = mentores.map((m) => m.profile_id);
  if (!ids.length) return [];
  const { data: links } = await sb
    .from("mentor_modulo")
    .select("mentor_id, modulo(code, name)")
    .in("mentor_id", ids);
  const porMentor = new Map<string, Pick<Modulo, "code" | "name">[]>();
  for (const l of (links ?? []) as unknown as {
    mentor_id: string;
    modulo: Pick<Modulo, "code" | "name">;
  }[]) {
    const arr = porMentor.get(l.mentor_id) ?? [];
    if (l.modulo) arr.push(l.modulo);
    porMentor.set(l.mentor_id, arr);
  }
  return mentores.map((m) => ({
    ...m,
    modulos: porMentor.get(m.profile_id) ?? [],
  }));
}

export async function getMentores(): Promise<MentorConModulos[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(MENTORES_TAG);
  const sb = createPublicClient();
  const { data, error } = await sb
    .from("mentor_public")
    .select("*")
    .order("level", { ascending: false });
  if (error) throw error;
  return adjuntarModulos(sb, (data ?? []) as MentorPublic[]);
}

export async function getMentorById(
  id: string,
): Promise<MentorConModulos | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(MENTORES_TAG);
  const sb = createPublicClient();
  const { data, error } = await sb
    .from("mentor_public")
    .select("*")
    .eq("profile_id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [m] = await adjuntarModulos(sb, [data as MentorPublic]);
  return m ?? null;
}

export async function getMentorIds(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(MENTORES_TAG);
  const sb = createPublicClient();
  const { data, error } = await sb.from("mentor_public").select("profile_id");
  if (error) throw error;
  return (data ?? []).map((m) => m.profile_id);
}

export async function getMentoresByModulo(
  moduloId: string,
): Promise<MentorPublic[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(MENTORES_TAG);
  const sb = createPublicClient();
  const { data: links } = await sb
    .from("mentor_modulo")
    .select("mentor_id")
    .eq("modulo_id", moduloId);
  const ids = (links ?? []).map((l) => l.mentor_id);
  if (!ids.length) return [];
  const { data } = await sb
    .from("mentor_public")
    .select("*")
    .in("profile_id", ids);
  return (data ?? []) as MentorPublic[];
}

// ─────────────────────────────── Precios ────────────────────────────────
export async function getPacks(): Promise<Pack[]> {
  "use cache";
  cacheLife("hours");
  const sb = createPublicClient();
  const { data, error } = await sb
    .from("pack")
    .select("*")
    .eq("active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as Pack[];
}

export async function getPlanes(): Promise<Plan[]> {
  "use cache";
  cacheLife("hours");
  const sb = createPublicClient();
  const { data, error } = await sb
    .from("plan")
    .select("*")
    .eq("active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as Plan[];
}

// ─────────────────────────── Diagnóstico gratis ───────────────────────────
// Módulos con RA cargados (los únicos diagnosticables), con sus RA ordenados.
export type ModuloDiagnosticable = Pick<Modulo, "code" | "name" | "killer"> & {
  ra: Pick<Ra, "code" | "description">[];
};

export async function getModulosDiagnosticables(): Promise<ModuloDiagnosticable[]> {
  "use cache";
  cacheLife("hours");
  const sb = createPublicClient();
  const { data, error } = await sb
    .from("modulo")
    .select("code, name, killer, ra!inner(code, description, sort_order)")
    .order("code");
  if (error) throw error;
  type Row = Pick<Modulo, "code" | "name" | "killer"> & {
    ra: (Pick<Ra, "code" | "description"> & { sort_order: number })[];
  };
  return ((data ?? []) as unknown as Row[]).map((m) => ({
    code: m.code,
    name: m.name,
    killer: m.killer,
    ra: [...m.ra]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(({ code, description }) => ({ code, description })),
  }));
}
