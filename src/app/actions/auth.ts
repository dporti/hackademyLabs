"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { localePath } from "@/lib/auth";
import type { UserRole } from "@/lib/db-types";

export interface AuthState {
  error?: string;
  info?: string;
}

const ROLES: UserRole[] = ["alumno", "familia", "mentor"];

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

  if (!email || !password) return { error: "Email y contraseña son obligatorios." };
  if (password.length < 8)
    return { error: "La contraseña debe tener al menos 8 caracteres." };

  const sb = await createClient();
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    // El trigger handle_new_user crea el profile con este rol y nombre.
    options: { data: { full_name: fullName, role } },
  });

  if (error) return { error: error.message };
  // Si el proyecto exige confirmar email, no hay sesión todavía.
  if (!data.session)
    return { info: "Cuenta creada. Revisa tu email para confirmarla y luego entra." };

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
  if (error) return { error: "Email o contraseña incorrectos." };

  redirect(localePath(locale, "/panel"));
}

// ──────────────────────────────── Logout ────────────────────────────────
export async function signOutAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "es");
  const sb = await createClient();
  await sb.auth.signOut();
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

  if (role === "alumno") {
    const mode = String(formData.get("mode") ?? "autonomo");
    const birthdate = String(formData.get("birthdate") ?? "") || null;
    const { error } = await sb.from("student_profile").upsert(
      { profile_id: user!.id, mode, birthdate },
      { onConflict: "profile_id" },
    );
    if (error) return { error: error.message };
  } else if (role === "mentor") {
    const headline = String(formData.get("headline") ?? "").trim() || null;
    const bio = String(formData.get("bio") ?? "").trim() || null;
    const languages = formData.getAll("languages").map(String);
    const { error } = await sb.from("mentor_profile").upsert(
      {
        profile_id: user!.id,
        headline,
        bio,
        languages: languages.length ? languages : ["es"],
      },
      { onConflict: "profile_id" },
    );
    if (error) return { error: error.message };

    // Módulos que imparte (por código → id).
    const codes = formData.getAll("modulos").map(String);
    if (codes.length) {
      const { data: mods } = await sb
        .from("modulo")
        .select("id")
        .in("code", codes);
      const rows = (mods ?? []).map((m) => ({
        mentor_id: user!.id,
        modulo_id: m.id,
      }));
      if (rows.length)
        await sb.from("mentor_modulo").upsert(rows, {
          onConflict: "mentor_id,modulo_id",
        });
    }
  } else if (role === "familia") {
    const name = String(formData.get("family_name") ?? "").trim() || null;
    const { error } = await sb
      .from("family")
      .insert({ owner_profile_id: user!.id, name });
    if (error) return { error: error.message };
  }

  redirect(localePath(locale, "/panel"));
}
