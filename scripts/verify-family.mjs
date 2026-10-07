// Verifica la vinculación familia ↔ alumno contra la BD real: invitaciones,
// consentimiento (menor vs mayor), guardas de family_id y visibilidad de datos.
// Crea usuarios de prueba @tutor247.dev y los borra al final (sin ledger).
// Uso: node scripts/verify-family.mjs
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
const password = "Tutor247Dev!";
const stamp = Date.now();
const created = [];
let ok = true;
const check = (l, c, x = "") => {
  console.log(`${c ? "✓" : "✗"} ${l}${x ? " → " + x : ""}`);
  if (!c) ok = false;
};

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

const hace = (anios) => {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - anios);
  return d.toISOString().slice(0, 10);
};

async function main() {
  const { error: tblErr } = await admin.from("family_invite").select("code").limit(1);
  check("tabla family_invite existe", !tblErr, tblErr?.message);
  if (tblErr) {
    console.log("→ Aplica supabase/migrations/20261007090300_family_link.sql en el SQL Editor.");
    return;
  }

  // Familia + dos alumnos: uno menor y otro mayor de edad.
  const fam = await nuevoUsuario("familia", "familia");
  const { error: fErr } = await fam.sb
    .from("family")
    .upsert({ owner_profile_id: fam.id, name: "Familia Test" }, { onConflict: "owner_profile_id" });
  check("familia crea su family", !fErr, fErr?.message);

  const menor = await nuevoUsuario("menor", "alumno");
  const mayor = await nuevoUsuario("mayor", "alumno");
  for (const [a, edad] of [[menor, 16], [mayor, 20]]) {
    const { error } = await a.sb
      .from("student_profile")
      .upsert({ profile_id: a.id, birthdate: hace(edad) }, { onConflict: "profile_id" });
    if (error) throw new Error(error.message);
  }
  const { data: fRow } = await admin.from("family").select("id").eq("owner_profile_id", fam.id).single();

  // 1. Guardas: el alumno no puede fijar family_id a mano (update ni insert).
  const { error: upErr } = await menor.sb
    .from("student_profile")
    .update({ family_id: fRow.id })
    .eq("profile_id", menor.id);
  check("alumno NO fija family_id a mano", !!upErr, upErr?.message);

  // 2. Invitación: solo la familia la crea; el alumno la acepta.
  const { error: alumnoInvErr } = await menor.sb.rpc("create_family_invite");
  check("alumno NO puede crear invitaciones", !!alumnoInvErr, alumnoInvErr?.message);
  const { data: code1, error: invErr } = await fam.sb.rpc("create_family_invite");
  check("familia genera código", !invErr && /^[0-9A-F]{10}$/.test(code1 ?? ""), code1 ?? invErr?.message);

  const { error: badErr } = await menor.sb.rpc("accept_family_invite", { p_code: "XXXXXXXXXX", p_share: false });
  check("código falso rechazado", badErr?.message?.includes("invalidCode"), badErr?.message);

  // Acepta con formato humano (guion y minúsculas).
  const pretty = `${code1.slice(0, 5)}-${code1.slice(5)}`.toLowerCase();
  const { data: famName, error: accErr } = await menor.sb.rpc("accept_family_invite", { p_code: pretty, p_share: false });
  check("menor acepta (con guion/minúsculas)", !accErr && famName === "Familia Test", accErr?.message ?? famName);

  const { error: reuseErr } = await mayor.sb.rpc("accept_family_invite", { p_code: code1, p_share: true });
  check("código de un solo uso", reuseErr?.message?.includes("invalidCode"), reuseErr?.message);

  // 3. Mayor de edad acepta SIN compartir.
  const { data: code2 } = await fam.sb.rpc("create_family_invite");
  const { error: acc2Err } = await mayor.sb.rpc("accept_family_invite", { p_code: code2, p_share: false });
  check("mayor acepta sin compartir", !acc2Err, acc2Err?.message);

  // Datos para el ledger/módulos del menor (para ver que la familia los ve).
  const { data: m0485 } = await admin.from("modulo").select("id").eq("code", "0485").single();
  await menor.sb.from("student_modulo").insert({ student_id: menor.id, modulo_id: m0485.id, exam_date: "2027-06-01" });
  await mayor.sb.from("student_modulo").insert({ student_id: mayor.id, modulo_id: m0485.id });

  let { data: hijos } = await fam.sb.rpc("my_family_students");
  const hMenor = hijos?.find((h) => h.student_id === menor.id);
  const hMayor = hijos?.find((h) => h.student_id === mayor.id);
  check("familia ve a sus 2 hijos", hijos?.length === 2, String(hijos?.length));
  check("menor: compartido con módulos", hMenor?.shared === true && hMenor?.modulos?.[0]?.code === "0485", JSON.stringify(hMenor?.modulos));
  check("mayor sin consentimiento: sin datos", hMayor?.shared === false && hMayor?.modulos === null && hMayor?.balance === null);

  // 4. Informes: sin consentimiento, la familia no lee los del mayor.
  for (const a of [menor, mayor])
    await admin.from("weekly_report").insert({ student_id: a.id, family_id: fRow.id, week_start: "2026-10-05" });
  let { data: reps } = await fam.sb.from("weekly_report").select("student_id");
  check("informes: solo los del menor", reps?.length === 1 && reps[0].student_id === menor.id, JSON.stringify(reps));

  // 5. El mayor da su consentimiento → la familia ve datos e informes.
  const { error: shErr } = await mayor.sb.rpc("set_family_share", { p_share: true });
  check("mayor da consentimiento", !shErr, shErr?.message);
  ({ data: hijos } = await fam.sb.rpc("my_family_students"));
  check("ahora la familia ve sus módulos", hijos?.find((h) => h.student_id === mayor.id)?.shared === true);
  ({ data: reps } = await fam.sb.from("weekly_report").select("student_id"));
  check("y sus informes", reps?.length === 2);

  // 6. Consentimientos registrados.
  const { data: cons } = await mayor.sb.from("consent").select("granted").eq("subject_profile", mayor.id).order("created_at");
  check("consentimientos registrados (no, sí)", JSON.stringify(cons?.map((c) => c.granted)) === "[false,true]", JSON.stringify(cons));

  // 7. Desvincular.
  const { error: lvErr } = await mayor.sb.rpc("leave_family");
  check("mayor se desvincula", !lvErr, lvErr?.message);
  ({ data: hijos } = await fam.sb.rpc("my_family_students"));
  check("la familia ya no lo ve", !hijos?.some((h) => h.student_id === mayor.id));

  // 8. Otra familia no ve a hijos ajenos.
  const otra = await nuevoUsuario("otrafam", "familia");
  await otra.sb.from("family").upsert({ owner_profile_id: otra.id, name: "Otra" }, { onConflict: "owner_profile_id" });
  const { data: ajenos } = await otra.sb.rpc("my_family_students");
  check("otra familia no ve hijos ajenos", (ajenos ?? []).length === 0);
  const { data: invAjenas } = await otra.sb.from("family_invite").select("code");
  check("otra familia no ve invitaciones ajenas", (invAjenas ?? []).length === 0);
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
