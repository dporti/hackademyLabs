// Verifica F1.4 contra la BD real: ledger (solo servidor escribe, saldo calculado,
// inmutable) y student_modulo (RLS del dueño).
// Usa un alumno de prueba FIJO (test.alumno@tutor247.dev) que se reutiliza: sus
// movimientos del ledger no se pueden borrar (inmutabilidad), así que el saldo se
// comprueba por diferencia. apply_all.sql limpia los usuarios @tutor247.dev.
// Uso: node scripts/verify-credits.mjs
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
const user = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, opts);
const anon = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, opts);
const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, opts);

const email = "test.alumno@tutor247.dev";
const password = "Tutor247Dev!";
let ok = true;
const check = (l, c, x = "") => {
  console.log(`${c ? "✓" : "✗"} ${l}${x ? " → " + x : ""}`);
  if (!c) ok = false;
};

async function main() {
// 0. La migración de F1.4 está aplicada.
const { error: tblErr } = await admin.from("student_modulo").select("student_id").limit(1);
check("tabla student_modulo existe", !tblErr, tblErr?.message);
if (tblErr) {
  console.log("→ Aplica supabase/migrations/20261007090100_student_modulo.sql en el SQL Editor.");
  return;
}

// 1. Alumno de prueba (lo crea si no existe) + sesión.
const { error: cErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: "Test Alumno", role: "alumno" },
});
check("alumno de prueba disponible", !cErr || /already/i.test(cErr.message), cErr?.message);
const { data: si, error: siErr } = await user.auth.signInWithPassword({ email, password });
check("signIn del alumno", !siErr, siErr?.message);
const uid = si?.user?.id;

const { error: spErr } = await user
  .from("student_profile")
  .upsert({ profile_id: uid, mode: "autonomo" }, { onConflict: "profile_id" });
check("student_profile propio (RLS sp_own)", !spErr, spErr?.message);

// 2. El cliente NO puede escribir en el ledger.
const { error: insErr } = await user
  .from("credit_ledger")
  .insert({ student_id: uid, type: "bonus", amount: 1000 });
check("alumno NO puede insertar en credit_ledger", !!insErr, insErr?.message);

// 3. Compra mock (como hace buyPackAction): inserta el servidor con service role.
const { data: before } = await user.rpc("my_credit_balance");
const { data: pack } = await admin
  .from("pack")
  .select("id, credits")
  .eq("slug", "arranque")
  .single();
const expires = new Date();
expires.setMonth(expires.getMonth() + 12);
const { data: mov, error: movErr } = await admin
  .from("credit_ledger")
  .insert({
    student_id: uid,
    type: "compra_pack",
    amount: pack.credits,
    pack_id: pack.id,
    expires_at: expires.toISOString(),
    note: "verify-credits.mjs",
  })
  .select("id")
  .single();
check("servidor inserta compra_pack", !movErr, movErr?.message);
const { data: after } = await user.rpc("my_credit_balance");
check(
  `saldo calculado sube ${pack.credits}`,
  after - before === pack.credits,
  `${before} → ${after}`,
);

// 4. Inmutabilidad: ni el service role puede modificar/borrar.
const { error: upErr } = await admin
  .from("credit_ledger")
  .update({ amount: 9999 })
  .eq("id", mov.id);
check("UPDATE del ledger bloqueado", !!upErr, upErr?.message);
const { error: delErr } = await admin.from("credit_ledger").delete().eq("id", mov.id);
check("DELETE del ledger bloqueado", !!delErr, delErr?.message);

// 5. Lectura: el alumno ve sus movimientos (con pack); un anónimo no ve nada.
const { data: hist } = await user
  .from("credit_ledger")
  .select("id, pack(name)")
  .eq("student_id", uid);
check("alumno lee su historial", (hist ?? []).some((h) => h.id === mov.id));
const { data: anonHist } = await anon.from("credit_ledger").select("id").eq("student_id", uid);
check("anónimo no ve el ledger", (anonHist ?? []).length === 0);

// 6. student_modulo: alta propia OK, alta para otro alumno rechazada.
const { data: mod } = await admin.from("modulo").select("id").eq("code", "0485").single();
const { error: smErr } = await user
  .from("student_modulo")
  .upsert(
    { student_id: uid, modulo_id: mod.id, exam_date: "2027-06-01" },
    { onConflict: "student_id,modulo_id" },
  );
check("alumno añade su módulo", !smErr, smErr?.message);
const { error: smOtherErr } = await user.from("student_modulo").insert({
  student_id: "00000000-0000-0000-0000-000000000000",
  modulo_id: mod.id,
});
check("alumno NO añade módulos a otro", !!smOtherErr, smOtherErr?.message);
const { data: anonSm } = await anon.from("student_modulo").select("student_id");
check("anónimo no ve student_modulo", (anonSm ?? []).length === 0);
const { error: smDelErr } = await user
  .from("student_modulo")
  .delete()
  .eq("student_id", uid)
  .eq("modulo_id", mod.id);
check("alumno quita su módulo", !smDelErr, smDelErr?.message);

await user.auth.signOut();
}

await main();
console.log(ok ? "\nTodo OK" : "\nHAY FALLOS");
// exitCode (no process.exit): en Windows, salir a la fuerza con sockets abiertos
// dispara un assert de libuv.
process.exitCode = ok ? 0 : 1;
