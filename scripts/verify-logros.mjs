// Verifica la fase 8 contra la BD real: XP inmutable por evidencias (sin duplicados),
// quiz invisible para el cliente, conversaciones de Bit solo por servidor, banco de
// material (revisión y búsqueda) y referidos (20 + 20 al primer pack, una vez).
// Requiere las migraciones de fase 7 y 8. Crea usuarios @tutor247.dev (los alumnos
// no se pueden borrar por el ledger: los limpia apply_all.sql).
// Uso: node scripts/verify-logros.mjs
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

async function nuevoUsuario(tag, role, extra = {}) {
  const email = `test.${tag}.${stamp}@tutor247.dev`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Test ${tag}`, role, ...extra },
  });
  if (error) throw new Error(`createUser ${tag}: ${error.message}`);
  created.push(data.user.id);
  const sb = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, opts);
  const { error: siErr } = await sb.auth.signInWithPassword({ email, password });
  if (siErr) throw new Error(`signIn ${tag}: ${siErr.message}`);
  return { id: data.user.id, email, sb };
}
async function alumno(tag, extra) {
  const a = await nuevoUsuario(tag, "alumno", extra);
  const { error } = await a.sb.from("student_profile").upsert({ profile_id: a.id }, { onConflict: "profile_id" });
  if (error) throw new Error(error.message);
  return a;
}
const xpDe = async (id) => {
  const { data } = await admin.from("xp_event").select("kind, points").eq("student_id", id);
  return { total: (data ?? []).reduce((s, e) => s + e.points, 0), rows: data ?? [] };
};

async function main() {
  const { error: tblErr } = await admin.from("xp_event").select("id").limit(1);
  check("tabla xp_event existe", !tblErr, tblErr?.message);
  if (tblErr) {
    console.log("→ Aplica supabase/migrations/20261010090200_logros_bit_referidos.sql en el SQL Editor.");
    return;
  }
  const { data: ras } = await admin.from("ra").select("id, code, modulo_id, modulo!inner(code)").eq("modulo.code", "0485").order("sort_order");

  // 1. XP por autoevaluación (5 por RA, una sola vez).
  const ana = await alumno("logros.ana");
  await ana.sb.rpc("save_self_assessment", { p_modulo_code: "0485", p_niveles: { [ras[0].code]: "casi", [ras[1].code]: "aun_no" } });
  check("XP por autoevaluar 2 RA = 10", (await xpDe(ana.id)).total === 10);
  await ana.sb.rpc("save_self_assessment", { p_modulo_code: "0485", p_niveles: { [ras[0].code]: "domino" } });
  check("re-evaluar no duplica XP", (await xpDe(ana.id)).total === 10);

  // 2. Sello y dominio confirmados por una persona (admin = ajuste).
  await admin.rpc("apply_ra_evidence", {
    p_student: ana.id, p_ra: ras[1].id, p_kind: "ajuste", p_nivel: "domino",
    p_seal: true, p_note: null, p_author: null, p_booking: null,
  });
  const x2 = await xpDe(ana.id);
  check("sello +50 y dominio +30", x2.total === 90, JSON.stringify(x2.rows));

  // 3. Nadie escribe XP ni lo edita.
  const { error: insXp } = await ana.sb.from("xp_event").insert({ student_id: ana.id, kind: "quiz", points: 999, ref: "x" });
  check("alumno NO inserta XP", !!insXp);
  const { error: rpcXp } = await ana.sb.rpc("grant_xp", { p_student: ana.id, p_kind: "quiz", p_points: 999, p_ref: "y" });
  check("alumno NO ejecuta grant_xp", !!rpcXp);
  const { data: row } = await admin.from("xp_event").select("id").eq("student_id", ana.id).limit(1);
  const { error: updXp } = await admin.from("xp_event").update({ points: 1 }).eq("id", row[0].id);
  check("xp_event es inmutable", !!updXp);

  // 4. Quiz: el cliente no lo lee (respuestas solo en servidor).
  const { data: q, error: qErr } = await admin
    .from("quiz")
    .insert({ student_id: ana.id, ra_id: ras[0].id, total: 1, questions: [{ pregunta: "¿?", opciones: ["a", "b", "c", "d"], correcta: 2, explicacion: "" }] })
    .select("id")
    .single();
  check("servidor crea quiz", !qErr, qErr?.message);
  const { data: qLeido, error: qLeErr } = await ana.sb.from("quiz").select("questions").eq("id", q?.id);
  check("alumno NO lee las respuestas del quiz", !!qLeErr || (qLeido?.length ?? 0) === 0);

  // 5. Conversaciones: solo servidor escribe; el alumno lee las suyas.
  const { error: cIns } = await ana.sb.from("conversation").insert({ student_id: ana.id });
  check("alumno NO crea conversaciones directo", !!cIns);
  const { data: conv } = await admin.from("conversation").insert({ student_id: ana.id, title: "Test" }).select("id").single();
  await admin.from("message").insert({ conversation_id: conv.id, sender: "alumno", body: "hola" });
  const { data: mLeidos } = await ana.sb.from("message").select("body").eq("conversation_id", conv.id);
  check("alumno lee sus mensajes", mLeidos?.length === 1);
  const otro = await alumno("logros.otro");
  const { data: mAjenos } = await otro.sb.from("message").select("body").eq("conversation_id", conv.id);
  check("otro alumno NO lee mensajes ajenos", (mAjenos?.length ?? 0) === 0);

  // 6. Material: mentor sin verificar no publica; admin sí; lo no revisado no se ve.
  const mentor = await nuevoUsuario("logros.mentor", "mentor");
  const { error: mMent } = await mentor.sb.from("material").insert({
    modulo_id: ras[0].modulo_id, title: "Bucles", body: "Un bucle for repite un bloque mientras se cumple la condición.", author_id: mentor.id,
  });
  check("mentor no verificado NO añade material", !!mMent);
  const palabra = `zqx${stamp}`;
  const { data: mat, error: mAdm } = await admin
    .from("material")
    .insert({ modulo_id: ras[0].modulo_id, ra_id: ras[0].id, title: `Prueba ${palabra}`, body: `Contenido de prueba con la palabra ${palabra} para buscar.`, reviewed: false })
    .select("id")
    .single();
  check("servidor añade material", !mAdm, mAdm?.message);
  const { data: noRev } = await ana.sb.from("material").select("id").eq("id", mat.id);
  check("alumno NO ve material sin revisar", (noRev?.length ?? 0) === 0);
  const { data: b0 } = await admin.rpc("search_material", { p_modulo: ras[0].modulo_id, p_query: palabra, p_ras: [], p_limit: 4 });
  check("Bit no usa material sin revisar", !(b0 ?? []).some((m) => m.id === mat.id));
  await admin.from("material").update({ reviewed: true }).eq("id", mat.id);
  const { data: b1 } = await admin.rpc("search_material", { p_modulo: ras[0].modulo_id, p_query: palabra, p_ras: [], p_limit: 4 });
  check("búsqueda encuentra material revisado", (b1 ?? []).some((m) => m.id === mat.id));
  await admin.from("material").delete().eq("id", mat.id);

  // 7. Referidos.
  const { data: code, error: cErr } = await ana.sb.rpc("my_referral_code");
  check("alumno obtiene su código", !cErr && /^[A-Z0-9]{8}$/.test(code ?? ""), cErr?.message ?? code);
  const { data: code2 } = await ana.sb.rpc("my_referral_code");
  check("el código es estable", code2 === code);
  const bea = await alumno("logros.bea", { ref: code });
  const { data: refRow } = await admin.from("referral").select("referrer_id, rewarded").eq("invited_id", bea.id).maybeSingle();
  check("registro con ?ref apunta el referido", refRow?.referrer_id === ana.id && !refRow.rewarded);
  const { error: refIns } = await ana.sb.from("referral").insert({ referrer_id: ana.id, invited_id: otro.id });
  check("alumno NO inserta referidos a mano", !!refIns);

  const saldo = async (sb) => (await sb.rpc("my_credit_balance")).data;
  const [antesA, antesB] = [await saldo(ana.sb), await saldo(bea.sb)];
  const { data: r0 } = await admin.rpc("reward_referral", { p_invited: bea.id });
  check("sin compra no hay recompensa", r0 === 0);
  await admin.from("credit_ledger").insert({ student_id: bea.id, type: "compra_pack", amount: 30, note: "verify" });
  const { data: r1 } = await admin.rpc("reward_referral", { p_invited: bea.id });
  check("primer pack: recompensa 20", r1 === 20);
  check("invitado +20", (await saldo(bea.sb)) === antesB + 30 + 20);
  check("quien invita +20", (await saldo(ana.sb)) === antesA + 20);
  const { data: r2 } = await admin.rpc("reward_referral", { p_invited: bea.id });
  check("no se paga dos veces", r2 === 0);
  const { data: lista } = await ana.sb.rpc("my_referrals");
  check("my_referrals sin email y marcado", lista?.length === 1 && lista[0].rewarded && !("email" in lista[0]));
  const { error: rwCli } = await ana.sb.rpc("reward_referral", { p_invited: bea.id });
  check("cliente NO ejecuta reward_referral", !!rwCli);
}

try {
  await main();
} catch (e) {
  check("ejecución", false, e.message);
} finally {
  for (const id of created) await admin.auth.admin.deleteUser(id).catch(() => {});
}
console.log(ok ? "\nTodo OK" : "\nHAY FALLOS");
process.exitCode = ok ? 0 : 1;
