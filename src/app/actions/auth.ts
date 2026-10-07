"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { localePath } from "@/lib/auth";
import type { UserRole } from "@/lib/db-types";

// Errores e info como CÓDIGOS (claves i18n de `auth.errors` / `auth.info`); la UI
// los traduce. En error se devuelven los valores enviados para rellenar el
// formulario (React 19 lo resetea tras la acción). NUNCA se devuelve la contraseña.

export interface AuthValues {
  email?: string;
  full_name?: string;
  role?: string;
  // Onboarding
  mode?: string;
  birthdate?: string;
  family_name?: string;
  headline?: string;
  bio?: string;
  languages?: string[];
  modulos?: string[];
}

export interface AuthState {
  error?: string;
  info?: string;
  values?: AuthValues;
}

const ROLES: UserRole[] = ["alumno", "familia", "mentor"];

// Tras un cambio de sesión o de perfil, la caché del router del cliente puede
// guardar un /panel viejo (p. ej. el que redirigía a /onboarding) y el header de
// las páginas visitadas. revalidatePath en una server function invalida el panel
// y fuerza a refrescar lo ya visitado, sin purgar la caché de datos del catálogo.
function invalidarSesion() {
  revalidatePath("/[locale]/panel", "page");
}
const MIN_PASSWORD = 8;

// Traduce los errores de Supabase Auth a códigos propios (sin filtrar el texto
// interno a la UI).
function signUpErrorCode(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered"))
    return "emailTaken";
  if (m.includes("password")) return "weakPassword";
  if (m.includes("email")) return "invalidEmail";
  if (m.includes("rate limit")) return "rateLimit";
  return "generic";
}

// ─────────────────────────────── Registro ───────────────────────────────
export async function signUpAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "alumno");
  const role: UserRole = ROLES.includes(roleRaw as UserRole)
    ? (roleRaw as UserRole)
    : "alumno";
  const locale = String(formData.get("locale") ?? "es");
  const values: AuthValues = { email, full_name: fullName, role };

  if (!email || !password) return { error: "required", values };
  if (password.length < MIN_PASSWORD) return { error: "weakPassword", values };

  const sb = await createClient();
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    // El trigger handle_new_user crea el profile con este rol y nombre (y solo
    // acepta alumno/familia/mentor: ver migración role_guards).
    options: { data: { full_name: fullName, role } },
  });

  if (error) return { error: signUpErrorCode(error.message), values };
  // Si el proyecto exige confirmar email, no hay sesión todavía.
  if (!data.session) return { info: "confirmEmail" };

  redirect(localePath(locale, "/onboarding"));
}

// ──────────────────────────────── Login ─────────────────────────────────
export async function signInAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const locale = String(formData.get("locale") ?? "es");

  const sb = await createClient();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  // Mensaje único: no revela si el email existe.
  if (error) return { error: "badCredentials", values: { email } };

  invalidarSesion();
  redirect(localePath(locale, "/panel"));
}

// ──────────────────────────────── Logout ────────────────────────────────
export async function signOutAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "es");
  const sb = await createClient();
  await sb.auth.signOut();
  invalidarSesion();
  redirect(localePath(locale, "/"));
}

// ────────────────────────────── Onboarding ──────────────────────────────
export async function onboardingAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const locale = String(formData.get("locale") ?? "es");
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect(localePath(locale, "/entrar"));

  // El rol se lee del profile (servidor), no del formulario.
  const { data: profile } = await sb
    .from("profile")
    .select("role")
    .eq("id", user!.id)
    .maybeSingle();
  const role = (profile?.role ?? "alumno") as UserRole;

  const values: AuthValues = {
    mode: String(formData.get("mode") ?? ""),
    birthdate: String(formData.get("birthdate") ?? ""),
    family_name: String(formData.get("family_name") ?? ""),
    headline: String(formData.get("headline") ?? ""),
    bio: String(formData.get("bio") ?? ""),
    languages: formData.getAll("languages").map(String),
    modulos: formData.getAll("modulos").map(String),
  };
  const fail = (error = "generic"): AuthState => ({ error, values });

  if (role === "alumno") {
    const mode = values.mode === "familia" ? "familia" : "autonomo";
    const birthdate = values.birthdate || null;
    const { error } = await sb.from("student_profile").upsert(
      { profile_id: user!.id, mode, birthdate },
      { onConflict: "profile_id" },
    );
    if (error) return fail();
  } else if (role === "mentor") {
    const languages = (values.languages ?? []).filter((l) => l === "es" || l === "ca");
    // status/level/verified_at los fuerza el trigger guard_mentor_status.
    const { error } = await sb.from("mentor_profile").upsert(
      {
        profile_id: user!.id,
        headline: values.headline?.trim() || null,
        bio: values.bio?.trim() || null,
        languages: languages.length ? languages : ["es"],
      },
      { onConflict: "profile_id" },
    );
    if (error) return fail();

    // Módulos que imparte (por código → id).
    const codes = values.modulos ?? [];
    if (codes.length) {
      const { data: mods } = await sb
        .from("modulo")
        .select("id")
        .in("code", codes);
      const rows = (mods ?? []).map((m) => ({
        mentor_id: user!.id,
        modulo_id: m.id,
      }));
      if (rows.length) {
        const { error: mmErr } = await sb.from("mentor_modulo").upsert(rows, {
          onConflict: "mentor_id,modulo_id",
        });
        if (mmErr) return fail();
      }
    }
  } else if (role === "familia") {
    const name = values.family_name?.trim() || null;
    const { error } = await sb
      .from("family")
      .insert({ owner_profile_id: user!.id, name });
    if (error) return fail();
  }

  invalidarSesion();
  redirect(localePath(locale, "/panel"));
}
