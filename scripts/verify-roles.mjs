// Verifica F1.5 contra la BD real: guardas de rol (nadie se auto-asciende), alta de
// mentor forzada a pendiente, edición de perfil propio y verificación por admin.
// Crea usuarios de prueba @tutor247.dev y los borra al final (no tienen ledger).
// Uso: node scripts/verify-roles.mjs
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
const opts = { auth: { autoRefreshToken: false, persistSession: false } };
const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, opts);
const anon = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, opts);

const password = "Tutor247Dev!";
const stamp = Date.now();
const created = [];
let ok = true;
const check = (l, c, x = "") => {
  console.log(`${c ? "✓" : "✗"} ${l}${x ? " → " + x : ""}`);
  if (!c) ok = false;
};

// Crea un usuario (como signUp: metadata → trigger) y devuelve un cliente con su sesión.
async function nuevoUsuario(tag, role) {
  const email = `test.${tag}.${stamp}@tutor247.dev`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Test ${tag}`, role },
  });
  if (error) throw new Error(`createUser ${tag}: ${error.message}`);
  created.push(data.user.id);
  const sb = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, opts);
  const { error: siErr } = await sb.auth.signInWithPassword({ email, password });
  if (siErr) throw new Error(`signIn ${tag}: ${siErr.message}`);
  return { id: data.user.id, sb };
}

async function main() {
  // 1. Registro pidiendo rol admin → cae a alumno.
  const hacker = await nuevoUsuario("hacker", "admin");
  const { data: hp } = await hacker.sb.from("profile").select("role").eq("id", hacker.id).single();
  check("registro con role=admin crea alumno", hp?.role === "alumno", hp?.role);

  // 2. Un usuario no puede cambiarse el rol.
  const { error: roleErr } = await hacker.sb
    .from("profile")
    .update({ role: "admin" })
    .eq("id", hacker.id);
  check("alumno NO puede ascenderse a admin", !!roleErr, roleErr?.message);
  const { error: nameErr } = await hacker.sb
    .from("profile")
    .update({ full_name: "Nuevo nombre" })
    .eq("id", hacker.id);
  check("alumno SÍ puede editar su nombre", !nameErr, nameErr?.message);

  // 3. Un alumno no puede crearse mentor_profile.
  const { error: mpAlumnoErr } = await hacker.sb
    .from("mentor_profile")
    .insert({ profile_id: hacker.id, status: "verificado" });
  check("alumno NO puede crearse mentor_profile", !!mpAlumnoErr, mpAlumnoErr?.message);

  // 4. Un mentor que se da de alta como verificado/experto queda pendiente/mentor.
  const mentor = await nuevoUsuario("mentor", "mentor");
  const { error: mpErr } = await mentor.sb.from("mentor_profile").insert({
    profile_id: mentor.id,
    status: "verificado",
    level: "experto",
    verified_at: new Date().toISOString(),
    headline: "Test",
  });
  check("mentor crea su mentor_profile", !mpErr, mpErr?.message);
  const { data: mp } = await mentor.sb
    .from("mentor_profile")
    .select("status, level, verified_at")
    .eq("profile_id", mentor.id)
    .single();
  check(
    "alta forzada a pendiente/mentor/sin verificar",
    mp?.status === "pendiente" && mp?.level === "mentor" && mp?.verified_at === null,
    JSON.stringify(mp),
  );

  // 5. El mentor no puede tocar status ni level; sí su perfil y módulos.
  const { error: stErr } = await mentor.sb
    .from("mentor_profile")
    .update({ status: "verificado" })
    .eq("profile_id", mentor.id);
  check("mentor NO puede auto-verificarse", !!stErr, stErr?.message);
  const { error: lvErr } = await mentor.sb
    .from("mentor_profile")
    .update({ level: "experto" })
    .eq("profile_id", mentor.id);
  check("mentor NO puede subirse de nivel", !!lvErr, lvErr?.message);
  const { error: edErr } = await mentor.sb
    .from("mentor_profile")
    .update({ headline: "Especialista 0485", languages: ["es", "ca"] })
    .eq("profile_id", mentor.id);
  check("mentor edita su perfil", !edErr, edErr?.message);
  const { data: m0485 } = await admin.from("modulo").select("id").eq("code", "0485").single();
  const { error: mmErr } = await mentor.sb
    .from("mentor_modulo")
    .insert({ mentor_id: mentor.id, modulo_id: m0485.id });
  check("mentor añade módulo que imparte", !mmErr, mmErr?.message);

  // 6. Pendiente → no aparece en la vista pública.
  const { data: pub0 } = await anon.from("mentor_public").select("profile_id").eq("profile_id", mentor.id);
  check("pendiente NO sale en mentor_public", (pub0 ?? []).length === 0);

  // 7. Admin (promovido con service role, como make-admin.mjs) verifica y sube nivel.
  const adm = await nuevoUsuario("admin", "alumno");
  const { error: promErr } = await admin.from("profile").update({ role: "admin" }).eq("id", adm.id);
  check("service role promueve a admin", !promErr, promErr?.message);
  const { data: lista } = await adm.sb.from("mentor_profile").select("profile_id");
  check("admin ve todos los mentor_profile", (lista ?? []).some((r) => r.profile_id === mentor.id));
  const { error: verErr } = await adm.sb
    .from("mentor_profile")
    .update({ status: "verificado", verified_at: new Date().toISOString(), level: "pro" })
    .eq("profile_id", mentor.id);
  check("admin verifica y sube nivel", !verErr, verErr?.message);
  const { data: pub1 } = await anon
    .from("mentor_public")
    .select("profile_id, level")
    .eq("profile_id", mentor.id);
  check("verificado SÍ sale en mentor_public (nivel pro)", pub1?.[0]?.level === "pro", JSON.stringify(pub1));
  const { error: rejErr } = await adm.sb
    .from("mentor_profile")
    .update({ status: "rechazado", verified_at: null })
    .eq("profile_id", mentor.id);
  check("admin rechaza", !rejErr, rejErr?.message);
  const { data: pub2 } = await anon.from("mentor_public").select("profile_id").eq("profile_id", mentor.id);
  check("rechazado desaparece de mentor_public", (pub2 ?? []).length === 0);

  // 8. Anti-bypass: la vista pública no expone email.
  const { data: cols } = await anon.from("mentor_public").select("*").limit(1);
  check("mentor_public sin email", !cols?.[0] || !("email" in cols[0]));
}

try {
  await main();
} catch (e) {
  check("ejecución", false, e.message);
} finally {
  for (const id of created) await admin.auth.admin.deleteUser(id);
  console.log(`(limpiados ${created.length} usuarios de prueba)`);
}
console.log(ok ? "\nTodo OK" : "\nHAY FALLOS");
process.exitCode = ok ? 0 : 1;
