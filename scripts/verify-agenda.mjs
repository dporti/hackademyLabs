// Verifica la fase A (agenda del mentor) contra la BD real: franjas con RLS del dueño,
// fusión de franjas, huecos libres (mentor_slots) descontando reservas y bloqueos, y
// create_booking rechazando horas fuera de agenda. Crea usuarios @tutor247.dev; al
// final cancela las reservas y deja al mentor en pendiente.
// Requiere la migración 20261012090100_agenda.sql.
// Uso: node scripts/verify-agenda.mjs
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
const failsWith = (r, code) => !!r.error && r.error.message.includes(code);

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

// Día local de Madrid dentro de n días ('AAAA-MM-DD').
const diaMadrid = (n) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date(Date.now() + n * 86_400_000));

async function main() {
  const { error: tblErr } = await admin.from("availability").select("id").limit(1);
  check("tabla availability existe", !tblErr, tblErr?.message);
  if (tblErr) {
    console.log("→ Aplica supabase/migrations/20261012090100_agenda.sql en el SQL Editor.");
    return;
  }

  const mentor = await nuevoUsuario("agenda.mentor", "mentor");
  await admin.from("mentor_profile").insert({ profile_id: mentor.id, status: "verificado", verified_at: new Date().toISOString() });
  const { data: mod } = await admin.from("modulo").select("id").eq("code", "0485").single();
  await admin.from("mentor_modulo").insert({ mentor_id: mentor.id, modulo_id: mod.id });
  const alumno = await nuevoUsuario("agenda.alumno", "alumno");
  await alumno.sb.from("student_profile").upsert({ profile_id: alumno.id }, { onConflict: "profile_id" });
  await admin.from("credit_ledger").insert({ student_id: alumno.id, type: "ajuste", amount: 100, note: "verify-agenda.mjs" });

  // 1. Sin agenda → flujo antiguo.
  const sin = await anon.rpc("mentor_slots", { p_mentor: mentor.id, p_kind: "sesion_1a1" });
  check("sin agenda: mentor_slots → agenda false", !sin.error && sin.data?.agenda === false, sin.error?.message);

  // 2. Franjas (cliente del mentor, RLS).
  for (let d = 1; d <= 7; d++) {
    const r = await mentor.sb.from("availability").insert({ profile_id: mentor.id, weekday: d, start_time: "10:00", end_time: "12:00" });
    if (r.error) check(`franja día ${d}`, false, r.error.message);
  }
  const merge = await mentor.sb.from("availability").insert({ profile_id: mentor.id, weekday: 1, start_time: "12:00", end_time: "13:00" });
  const { data: lunes } = await mentor.sb.from("availability").select("start_time, end_time").eq("weekday", 1);
  check(
    "franjas que se tocan se fusionan (lun 10–12 + 12–13 → 10–13)",
    !merge.error && lunes?.length === 1 && lunes[0].start_time.startsWith("10:00") && lunes[0].end_time.startsWith("13:00"),
    JSON.stringify(lunes),
  );
  const malGrid = await mentor.sb.from("availability").insert({ profile_id: mentor.id, weekday: 2, start_time: "10:15", end_time: "11:00" });
  check("hora fuera de la rejilla de 30 min → rechazada", !!malGrid.error);
  const ajena = await alumno.sb.from("availability").insert({ profile_id: mentor.id, weekday: 3, start_time: "15:00", end_time: "16:00" });
  check("otro usuario NO añade franjas al mentor", !!ajena.error);
  const { data: verAjena } = await alumno.sb.from("availability").select("id").eq("profile_id", mentor.id);
  check("otro usuario NO lee las franjas del mentor", (verAjena ?? []).length === 0);

  // 3. Huecos libres.
  const D = diaMadrid(2);
  const D1 = diaMadrid(3);
  const slots = async (kind) => (await anon.rpc("mentor_slots", { p_mentor: mentor.id, p_kind: kind, p_days: 28 })).data?.slots ?? [];
  const s1 = await slots("sesion_1a1");
  const sf = await slots("sesion_flash");
  check("1:1 → huecos 10:00, 10:30, 11:00 el día D", ["10:00", "10:30", "11:00"].every((h) => s1.includes(`${D}T${h}`)) && !s1.includes(`${D}T11:30`));
  check("flash → incluye 11:30 (25 min caben antes de las 12)", sf.includes(`${D}T11:30`));
  const min = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    .format(new Date(Date.now() + 3 * 3_600_000))
    .replace(" ", "T");
  check("ningún hueco con menos de 3 h de antelación", s1.every((x) => x >= min), s1[0]);

  // 4. Reserva dentro de agenda → ok y el hueco desaparece.
  const b = await admin.rpc("create_booking", {
    p_student: alumno.id, p_mentor: mentor.id, p_modulo_code: "0485", p_kind: "sesion_1a1",
    p_starts_local: `${D}T10:00:00`, p_note: null,
  });
  check("reserva en un hueco de la agenda", !b.error, b.error?.message);
  const s2 = await slots("sesion_1a1");
  check("tras reservar: 10:00 y 10:30 ya no salen; 11:00 sí", !s2.includes(`${D}T10:00`) && !s2.includes(`${D}T10:30`) && s2.includes(`${D}T11:00`));

  // 5. Fuera de agenda → outsideAgenda.
  const fuera = await admin.rpc("create_booking", {
    p_student: alumno.id, p_mentor: mentor.id, p_modulo_code: "0485", p_kind: "sesion_1a1",
    p_starts_local: `${D}T15:00:00`, p_note: null,
  });
  check("reserva fuera de franja → outsideAgenda", failsWith(fuera, "outsideAgenda"), fuera.error?.message);
  const cruza = await admin.rpc("create_booking", {
    p_student: alumno.id, p_mentor: mentor.id, p_modulo_code: "0485", p_kind: "sesion_1a1",
    p_starts_local: `${D}T11:30:00`, p_note: null,
  });
  check("1:1 que se sale de la franja (11:30–12:30) → outsideAgenda", failsWith(cruza, "outsideAgenda"), cruza.error?.message);

  // 6. Día bloqueado.
  const off = await mentor.sb.from("availability_off").insert({ profile_id: mentor.id, from_day: D1, to_day: D1 });
  check("mentor bloquea un día", !off.error, off.error?.message);
  const offPasado = await mentor.sb.from("availability_off").insert({ profile_id: mentor.id, from_day: "2020-01-01", to_day: "2020-01-02" });
  check("no se bloquean días pasados", !!offPasado.error);
  const s3 = await slots("sesion_1a1");
  check("el día bloqueado no tiene huecos", !s3.some((s) => s.startsWith(D1)));
  const enOff = await admin.rpc("create_booking", {
    p_student: alumno.id, p_mentor: mentor.id, p_modulo_code: "0485", p_kind: "sesion_1a1",
    p_starts_local: `${D1}T10:00:00`, p_note: null,
  });
  check("reserva en día bloqueado → outsideAgenda", failsWith(enOff, "outsideAgenda"), enOff.error?.message);

  // 7. Mentor no verificado → sin huecos públicos.
  await admin.from("mentor_profile").update({ status: "pendiente", verified_at: null }).eq("profile_id", mentor.id);
  const pend = await anon.rpc("mentor_slots", { p_mentor: mentor.id, p_kind: "sesion_1a1" });
  check("mentor pendiente → sin agenda pública", pend.data?.agenda === false);

  // Limpieza: cancelar reservas (devuelve créditos).
  if (b.data) await admin.rpc("cancel_booking", { p_actor: mentor.id, p_booking: b.data });
  for (const s of [mentor, alumno]) await s.sb.auth.signOut();
}

await main();
console.log(ok ? "\nTodo OK" : "\nHAY FALLOS");
process.exitCode = ok ? 0 : 1;
