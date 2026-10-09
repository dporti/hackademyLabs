// Verifica la migración 20261009090100_leads_welcome.sql:
// - lead: el público (anon) y un alumno NO pueden leer ni escribir; el servidor sí.
// - bienvenida: un alumno nuevo recibe 3 créditos (una sola vez).
// Crea usuarios de prueba @tutor247.dev y borra sus leads al final.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(URL_, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon = () => createClient(URL_, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const password = "Tutor247Dev!";

let fallos = 0;
const ok = (cond, msg, extra = "") => {
  console.log(`${cond ? "✓" : "✗"} ${msg}${extra ? ` → ${extra}` : ""}`);
  if (!cond) fallos++;
};

// 1) Leads
const marca = `verify-leads-${Date.now()}`;
const pub = anon();
const insPub = await pub.from("lead").insert({ kind: "pregunta", contact: "a@b.es", consent: true, message: marca });
ok(!!insPub.error, "anon NO inserta leads", insPub.error?.message);
const selPub = await pub.from("lead").select("id").limit(1);
ok(!selPub.error && (selPub.data ?? []).length === 0, "anon NO lee leads");

const insSrv = await admin
  .from("lead")
  .insert({ kind: "pregunta", contact: "prueba@tutor247.dev", consent: true, message: marca, quien: "alumno" })
  .select("id")
  .single();
ok(!insSrv.error, "servidor inserta un lead", insSrv.error?.message);
const sinConsent = await admin.from("lead").insert({ kind: "llamada", contact: "600000000", consent: false });
ok(!!sinConsent.error, "sin consentimiento → rechazado (check)", sinConsent.error?.message);

// 2) Bienvenida: alumno nuevo
const email = `test.welcome.${Date.now()}@tutor247.dev`;
const nu = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: "Bienvenida Prueba", role: "alumno" },
});
ok(!nu.error, "crea alumno de prueba", nu.error?.message);
const id = nu.data.user.id;
const alumno = anon();
await alumno.auth.signInWithPassword({ email, password });
const selAlumno = await alumno.from("lead").select("id").limit(1);
ok(!selAlumno.error && (selAlumno.data ?? []).length === 0, "alumno NO lee leads");

const sp = await admin.from("student_profile").insert({ profile_id: id });
ok(!sp.error, "crea student_profile", sp.error?.message);
const bal = await alumno.rpc("my_credit_balance");
ok(bal.data === 3, "recibe 3 créditos de bienvenida", `saldo ${bal.data}`);
const mov = await admin.from("credit_ledger").select("type, amount, note, expires_at").eq("student_id", id);
ok(
  mov.data?.length === 1 && mov.data[0].type === "bonus" && mov.data[0].note === "bienvenida" && !!mov.data[0].expires_at,
  "un movimiento bonus 'bienvenida' con caducidad",
);

// Limpieza (el alumno queda: el ledger es inmutable y su borrado chocaría con el trigger).
await admin.from("lead").delete().eq("message", marca);
console.log(fallos ? `\n${fallos} fallo(s)` : "\nTodo OK");
process.exit(fallos ? 1 : 0);
