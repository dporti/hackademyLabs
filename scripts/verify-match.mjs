// Verifica la fase B (emparejamiento) contra la BD real: franjas del alumno, orden de
// match_mentors (horas en común, hueco que encaja, idioma) y el filtro público
// mentors_with_slots. Crea usuarios @tutor247.dev; al final deja a los mentores en
// pendiente (fuera del catálogo). Requiere 20261012090100_agenda.sql y 20261012090200_match.sql.
// Uso: node scripts/verify-match.mjs
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
let ok = true;
const check = (l, c, x = "") => {
  console.log(`${c ? "✓" : "✗"} ${l}${x ? " → " + x : ""}`);
  if (!c) ok = false;
};

async function nuevoUsuario(tag, role) {
  const email = `test.${tag}.${stamp}@tutor247.dev`;
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: `Test ${tag}`, role },
  });
  if (error) throw new Error(`createUser ${tag}: ${error.message}`);
  const sb = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, opts);
  const { error: siErr } = await sb.auth.signInWithPassword({ email, password });
  if (siErr) throw new Error(`signIn ${tag}: ${siErr.message}`);
  return { id: data.user.id, sb };
}

async function franjas(u, start, end) {
  for (let d = 1; d <= 7; d++) {
    const r = await u.sb.from("availability").insert({ profile_id: u.id, weekday: d, start_time: start, end_time: end });
    if (r.error) throw new Error(`franja: ${r.error.message}`);
  }
}

async function main() {
  const { error: fnErr } = await anon.rpc("mentors_with_slots", { p_days: 7 });
  check("RPC mentors_with_slots existe", !fnErr, fnErr?.message);
  if (fnErr) {
    console.log("→ Aplica supabase/migrations/20261012090200_match.sql en el SQL Editor.");
    return;
  }

  const { data: mod } = await admin.from("modulo").select("id").eq("code", "0485").single();
  const mentores = [];
  for (const [tag, langs] of [["match.m1", ["ca", "es"]], ["match.m2", ["es"]], ["match.m3", ["es"]]]) {
    const m = await nuevoUsuario(tag, "mentor");
    await admin.from("mentor_profile").insert({ profile_id: m.id, status: "verificado", verified_at: new Date().toISOString(), languages: langs });
    await admin.from("mentor_modulo").insert({ mentor_id: m.id, modulo_id: mod.id });
    mentores.push(m);
  }
  const [m1, m2, m3] = mentores;
  await franjas(m1, "18:00", "21:00"); // coincide con el alumno
  await franjas(m2, "10:00", "12:00"); // no coincide
  // m3 sin agenda

  const alumno = await nuevoUsuario("match.alumno", "alumno");
  await alumno.sb.from("student_profile").upsert({ profile_id: alumno.id }, { onConflict: "profile_id" });
  await admin.from("profile").update({ locale: "ca" }).eq("id", alumno.id);
  await admin.from("credit_ledger").insert({ student_id: alumno.id, type: "ajuste", amount: 100, note: "verify-match.mjs" });

  // Sin franjas del alumno: aún lista mentores (por hueco libre).
  const r0 = await alumno.sb.rpc("match_mentors", { p_modulo_code: "0485", p_limit: 20 });
  const ids0 = (r0.data ?? []).map((x) => x.mentor_id);
  check("sin disponibilidad: lista los 3 mentores", !r0.error && [m1.id, m2.id, m3.id].every((i) => ids0.includes(i)), r0.error?.message);

  await franjas(alumno, "18:00", "20:00");
  const { data: propias } = await alumno.sb.from("availability").select("id");
  check("alumno guarda sus franjas (RLS del dueño)", (propias ?? []).length === 7);

  const r = await alumno.sb.rpc("match_mentors", { p_modulo_code: "0485", p_limit: 20 });
  const fila = (id) => (r.data ?? []).find((x) => x.mentor_id === id);
  const f1 = fila(m1.id);
  const f2 = fila(m2.id);
  const f3 = fila(m3.id);
  check("match_mentors responde", !r.error && f1 && f2 && f3, r.error?.message);
  check("m1: 14 h/semana en común (7 × 2 h)", f1?.overlap_min === 840, String(f1?.overlap_min));
  check("m1: hueco que encaja entre 18:00 y 19:00", !!f1?.next_fit && f1.next_fit.slice(11) >= "18:00" && f1.next_fit.slice(11) <= "19:00", f1?.next_fit);
  check("m1: habla el idioma del alumno (ca)", f1?.same_lang === true);
  check("m2: sin horas en común ni hueco que encaje, pero con hueco libre", f2?.overlap_min === 0 && f2?.next_fit === null && !!f2?.next_slot);
  check("m3: sin agenda → sin huecos", f3?.next_slot === null);
  check("orden: m1 > m2 > m3", f1?.score > f2?.score && f2?.score > f3?.score, `${f1?.score} / ${f2?.score} / ${f3?.score}`);
  check("no devuelve email", f1 && !("email" in f1));

  const anonMatch = await anon.rpc("match_mentors", { p_modulo_code: "0485" });
  check("anónimo NO usa match_mentors", !!anonMatch.error);
  const ov = await alumno.sb.rpc("agenda_overlap", { p_a: alumno.id, p_b: m1.id });
  check("agenda_overlap no es pública", !!ov.error);
  const malMod = await alumno.sb.rpc("match_mentors", { p_modulo_code: "XXXX" });
  check("módulo inexistente → moduloNotFound", !!malMod.error && malMod.error.message.includes("moduloNotFound"));

  const { data: conHueco } = await anon.rpc("mentors_with_slots", { p_days: 7 });
  check("filtro público: m1 y m2 con hueco; m3 no", conHueco?.includes(m1.id) && conHueco?.includes(m2.id) && !conHueco?.includes(m3.id));

  await admin.from("mentor_profile").update({ status: "pendiente", verified_at: null }).in("profile_id", mentores.map((m) => m.id));
  for (const s of [...mentores, alumno]) await s.sb.auth.signOut();
}

await main();
console.log(ok ? "\nTodo OK" : "\nHAY FALLOS");
process.exitCode = ok ? 0 : 1;
