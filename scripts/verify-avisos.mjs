// Verifica la fase C (avisos) contra la BD real: «Avísame» con y sin cuenta, cobertura
// inmediata, aviso de demanda agrupado a mentores, cobertura al abrir franjas / al
// verificarse / al añadir módulo, demanda anónima, cifras públicas, avisos de reservas y
// RLS de notification. Crea usuarios @tutor247.dev y usa módulos SIN mentor verificado.
// Al final cierra las alertas de prueba y deja a los mentores en pendiente.
// Requiere las migraciones 20261012090100/0200/0300.
// Uso: node scripts/verify-avisos.mjs
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

async function usuario(tag, role) {
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
async function alumno(tag) {
  const u = await usuario(tag, "alumno");
  await u.sb.from("student_profile").upsert({ profile_id: u.id }, { onConflict: "profile_id" });
  return u;
}
async function mentor(tag, verificado) {
  const u = await usuario(tag, "mentor");
  await admin.from("mentor_profile").insert({
    profile_id: u.id,
    status: verificado ? "verificado" : "pendiente",
    verified_at: verificado ? new Date().toISOString() : null,
  });
  return u;
}
const avisos = async (u, kind) =>
  ((await u.sb.from("notification").select("kind, payload, link, read_at").eq("kind", kind)).data ?? []);
const estado = async (id) => (await admin.from("module_alert").select("status, notified_mentor_id").eq("id", id).single()).data;

async function main() {
  const { error: tblErr } = await admin.from("notification").select("id").limit(1);
  check("tabla notification existe", !tblErr, tblErr?.message);
  if (tblErr) {
    console.log("→ Aplica supabase/migrations/20261012090300_avisos.sql en el SQL Editor.");
    return;
  }

  // Módulos sin ningún mentor verificado (para que nadie ajeno cubra las alertas).
  const { data: mods } = await admin.from("modulo").select("id, code").order("code");
  const { data: mm } = await admin.from("mentor_modulo").select("modulo_id, mentor_profile!inner(status)").eq("mentor_profile.status", "verificado");
  const ocupados = new Set((mm ?? []).map((x) => x.modulo_id));
  const libres = (mods ?? []).filter((m) => !ocupados.has(m.id));
  check("hay 3 módulos sin mentor verificado para probar", libres.length >= 3);
  if (libres.length < 3) return;
  const [X, Y, Z] = libres;
  const alertas = [];

  // Mentor verificado de X con agenda lunes 10–12 (no coincide con los alumnos).
  const m2 = await mentor("avisos.m2", true);
  await admin.from("mentor_modulo").insert({ mentor_id: m2.id, modulo_id: X.id });
  await m2.sb.from("availability").insert({ profile_id: m2.id, weekday: 1, start_time: "10:00", end_time: "12:00" });

  // 1. Alerta que exige horario compatible → no se cubre; demanda al mentor.
  const b = await alumno("avisos.b");
  await b.sb.from("availability").insert({ profile_id: b.id, weekday: 2, start_time: "18:00", end_time: "20:00" });
  const rb = await b.sb.rpc("create_module_alert", { p_modulo_code: X.code, p_language: null, p_fit: true });
  check("alumno crea alerta (solo si encaja)", !rb.error, rb.error?.message);
  alertas.push(rb.data);
  check("sin horas en común → sigue abierta", (await estado(rb.data))?.status === "open");
  const rb2 = await b.sb.rpc("create_module_alert", { p_modulo_code: X.code, p_language: null, p_fit: true });
  check("repetir la alerta devuelve la misma", rb2.data === rb.data);
  let dem = await avisos(m2, "demand_new");
  check("mentor recibe aviso de demanda (n = 1)", dem.length === 1 && dem[0].payload.n === 1 && dem[0].payload.modulo === X.code, JSON.stringify(dem));

  // 2. Agrupado: otra alerta del mismo módulo → el mismo aviso pasa a n = 2.
  const c = await alumno("avisos.c");
  const rc = await c.sb.rpc("create_module_alert", { p_modulo_code: X.code, p_language: null, p_fit: true });
  alertas.push(rc.data);
  dem = await avisos(m2, "demand_new");
  check("avisos de demanda agrupados (1 aviso, n = 2)", dem.length === 1 && dem[0].payload.n === 2, JSON.stringify(dem.map((d) => d.payload.n)));

  // 3. Alerta sin condición de horario → se cubre al momento con m2.
  const a = await alumno("avisos.a");
  const ra = await a.sb.rpc("create_module_alert", { p_modulo_code: X.code, p_language: null, p_fit: false });
  alertas.push(ra.data);
  const ea = await estado(ra.data);
  check("ya hay mentor → alerta cubierta al momento", ea?.status === "notified" && ea.notified_mentor_id === m2.id);
  const ma = await avisos(a, "mentor_available");
  check("alumno recibe «ya hay mentor» con enlace a reservar", ma.length === 1 && ma[0].link?.startsWith("/panel/sesiones?mentor="), JSON.stringify(ma));

  // 4. Demanda anónima para el mentor.
  const md = await m2.sb.rpc("my_module_demand");
  const fx = (md.data ?? []).find((f) => f.modulo_code === X.code);
  check("my_module_demand: 2 esperando en X, 0 encajan", fx?.waiting === 2 && fx?.fits === 0, JSON.stringify(fx && { w: fx.waiting, f: fx.fits }));
  // `ref` = id de la alerta (fase D, para ofrecer hueco): no identifica al alumno.
  const perfiles = JSON.stringify((fx?.profiles ?? []).map(({ ref, ...p }) => p));
  check("perfil con ref de alerta (no del alumno)", (fx?.profiles ?? []).every((p) => alertas.includes(p.ref)));
  check("perfil anónimo: sin nombre, email ni ids", !/Test avisos|@|student_id|[0-9a-f]{8}-[0-9a-f]{4}/.test(perfiles), perfiles.slice(0, 120));
  check("perfil incluye franjas del alumno (mar tarde)", perfiles.includes('"d":2') && perfiles.includes('"p":"tarde"'));
  check("un alumno NO usa my_module_demand", !!(await a.sb.rpc("my_module_demand")).error);

  // 5. Cifras públicas.
  const pd = await anon.rpc("public_demand");
  const px = (pd.data ?? []).find((d) => d.modulo_code === X.code);
  check("public_demand (anónimo): X con 2 esperando, sin datos personales", px?.waiting === 2 && Object.keys(px).length === 3, JSON.stringify(px));

  // 6. El mentor abre franjas que coinciden con b → b cubierto; c (sin franjas) sigue.
  await m2.sb.from("availability").insert({ profile_id: m2.id, weekday: 2, start_time: "18:00", end_time: "21:00" });
  check("al abrir franjas compatibles → alerta de b cubierta", (await estado(rb.data))?.status === "notified");
  check("b recibe «ya hay mentor»", (await avisos(b, "mentor_available")).length === 1);
  check("c (sin disponibilidad) sigue esperando", (await estado(rc.data))?.status === "open");

  // 7. Sin cuenta: email (service role). El cliente anónimo no puede escribir.
  const anonIns = await anon.from("module_alert").insert({ email: "x@example.com", modulo_id: Y.id, consent_at: new Date().toISOString() });
  check("anónimo NO inserta alertas directamente", !!anonIns.error);
  const emailIns = await admin.from("module_alert").insert({ email: `aviso.${stamp}@example.com`, modulo_id: Y.id, consent_at: new Date().toISOString() }).select("id").single();
  check("alerta por email guardada (servidor)", !emailIns.error, emailIns.error?.message);
  if (emailIns.data) alertas.push(emailIns.data.id);
  const sinConsent = await admin.from("module_alert").insert({ email: `aviso2.${stamp}@example.com`, modulo_id: Y.id });
  check("alerta por email sin consentimiento → rechazada", !!sinConsent.error);

  // 8. Mentor pendiente de Y se verifica → alerta por email cubierta (email pendiente, fase E).
  const m = await mentor("avisos.m", false);
  await admin.from("mentor_modulo").insert({ mentor_id: m.id, modulo_id: Y.id });
  check("mentor pendiente no cubre nada", (await estado(emailIns.data.id))?.status === "open");
  await admin.from("mentor_profile").update({ status: "verificado", verified_at: new Date().toISOString() }).eq("profile_id", m.id);
  const ee = await estado(emailIns.data.id);
  check("al verificarse el mentor → alerta por email cubierta", ee?.status === "notified" && ee.notified_mentor_id === m.id);

  // 9. Mentor verificado añade el módulo Z → alerta de c en Z cubierta.
  const rcz = await c.sb.rpc("create_module_alert", { p_modulo_code: Z.code, p_language: null, p_fit: false });
  alertas.push(rcz.data);
  await admin.from("mentor_modulo").insert({ mentor_id: m.id, modulo_id: Z.id });
  check("al añadir el módulo → alerta cubierta", (await estado(rcz.data))?.status === "notified");

  // 10. Avisos de reservas: solicitud → mentor; confirmación → alumno.
  await admin.from("credit_ledger").insert({ student_id: a.id, type: "ajuste", amount: 100, note: "verify-avisos.mjs" });
  const hoy = Date.now();
  let dia = null;
  for (let i = 2; i <= 9 && !dia; i++) {
    const d = new Date(hoy + i * 86_400_000);
    const local = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(d);
    const wd = new Date(`${local}T12:00:00Z`).getUTCDay(); // 2 = martes
    if (wd === 2) dia = local;
  }
  const bk = await admin.rpc("create_booking", {
    p_student: a.id, p_mentor: m2.id, p_modulo_code: X.code, p_kind: "sesion_1a1", p_starts_local: `${dia}T18:00:00`, p_note: null,
  });
  check("reserva en la agenda del mentor", !bk.error, bk.error?.message);
  check("mentor recibe «nueva solicitud»", (await avisos(m2, "booking_requested")).length === 1);
  await admin.rpc("respond_booking", { p_mentor: m2.id, p_booking: bk.data, p_accept: true });
  const conf = await avisos(a, "booking_confirmed");
  check("alumno recibe «sesión confirmada» con fecha", conf.length === 1 && !!conf[0].payload.starts_at);

  // 11. RLS y marcar leídos.
  const ajenas = await a.sb.from("notification").select("id").eq("user_id", m2.id);
  check("un usuario NO ve avisos de otro", (ajenas.data ?? []).length === 0);
  const insN = await a.sb.from("notification").insert({ user_id: a.id, kind: "demand_new" });
  check("cliente NO inserta avisos", !!insN.error);
  await a.sb.rpc("mark_notifications_read", { p_ids: null });
  const leidas = await a.sb.from("notification").select("read_at");
  check("marcar todo como leído", (leidas.data ?? []).length >= 2 && leidas.data.every((n) => n.read_at));

  // 12. Cancelar.
  await c.sb.rpc("cancel_module_alert", { p_alert: rc.data });
  check("alumno cancela su alerta", (await estado(rc.data))?.status === "closed");

  // Limpieza.
  if (bk.data) await admin.rpc("cancel_booking", { p_actor: m2.id, p_booking: bk.data });
  await admin.from("module_alert").update({ status: "closed" }).in("id", alertas.filter(Boolean));
  await admin.from("mentor_profile").update({ status: "pendiente", verified_at: null }).in("profile_id", [m.id, m2.id]);
  for (const u of [a, b, c, m, m2]) await u.sb.auth.signOut();
}

await main();
console.log(ok ? "\nTodo OK" : "\nHAY FALLOS");
process.exitCode = ok ? 0 : 1;
