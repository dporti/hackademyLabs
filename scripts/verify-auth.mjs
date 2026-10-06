// Verifica el flujo de auth contra la BD real: signUp dispara el trigger que crea
// el profile; luego el propio usuario inserta su mentor_profile bajo RLS.
// Limpia el usuario de prueba al final. Uso: node scripts/verify-auth.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const email = `test.mentor.${Date.now()}@tutor247.dev`;
const password = "Tutor247Dev!";
let userId = null;
let ok = true;
const check = (l, c, x = "") => {
  console.log(`${c ? "✓" : "✗"} ${l}${x ? " → " + x : ""}`);
  if (!c) ok = false;
};

try {
  // 1. Crea el usuario vía admin (salta el validador de email y confirma el correo).
  //    Igual que signUp, la inserción en auth.users dispara handle_new_user.
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Test Mentor", role: "mentor" },
  });
  check("createUser (admin) sin error", !cErr, cErr?.message);
  userId = created?.user?.id ?? null;

  // Inicia sesión como el usuario para probar las políticas RLS reales.
  const { error: siErr } = await anon.auth.signInWithPassword({ email, password });
  check("signIn del usuario", !siErr, siErr?.message);

  // 2. El trigger creó el profile con rol mentor y nombre.
  const { data: prof } = await anon
    .from("profile")
    .select("role, full_name")
    .eq("id", userId)
    .maybeSingle();
  check("trigger creó profile", !!prof, JSON.stringify(prof));
  check("profile.role = mentor", prof?.role === "mentor");
  check("profile.full_name = Test Mentor", prof?.full_name === "Test Mentor");

  // 3. El usuario autenticado inserta su mentor_profile (RLS mp_insert_own).
  const { error: mpErr } = await anon
    .from("mentor_profile")
    .upsert(
      { profile_id: userId, headline: "Test", languages: ["es"] },
      { onConflict: "profile_id" },
    );
  check("self-insert mentor_profile bajo RLS", !mpErr, mpErr?.message);

  // 4. El mentor NO puede autoverificarse (trigger guard_mentor_status).
  const { error: selfVerify } = await anon
    .from("mentor_profile")
    .update({ status: "verificado" })
    .eq("profile_id", userId);
  check("mentor NO puede autoverificarse", !!selfVerify, selfVerify?.message ?? "(permitió)");
} finally {
  // Limpieza: borrar el usuario de prueba (cascade elimina profile/mentor_profile).
  if (userId) {
    await admin.auth.admin.deleteUser(userId);
    console.log("\n🧹 usuario de prueba borrado");
  }
}

console.log(ok ? "\n✅ AUTH OK" : "\n❌ FALLOS ARRIBA");
process.exit(ok ? 0 : 1);
