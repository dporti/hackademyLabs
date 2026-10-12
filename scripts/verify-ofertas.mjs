// Verifica la fase D (ofertas de hueco) contra la BD real: el mentor ofrece un hueco de
// su agenda a una alerta abierta, el alumno lo ve (y nadie más), rechaza o acepta
// (reserva + cobro + confirmada al momento), avisos a cada parte y retirada.
// Crea usuarios @tutor247.dev y usa un módulo sin mentor verificado; al final cancela la
// reserva, cierra las alertas y deja a los mentores en pendiente.
// Requiere las migraciones 20261012090100…0400.
// Uso: node scripts/verify-ofertas.mjs
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
let ok = true;
const check = (l, c, x = "") => {
  console.log(`${c ? "✓" : "✗"} ${l}${x ? " → " + x : ""}`);
  if (!c) ok = false;
};
const failsWith = (r, code) => !!r.error && r.error.message.includes(code);

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
  await admin.from("credit_ledger").insert({ student_id: u.id, type: "ajuste", amount: 100, note: "verify-ofertas.mjs" });
  return u;
}
async function mentor(tag, moduloId) {
  const u = await usuario(tag, "mentor");
  await admin.from("mentor_profile").insert({ profile_id: u.id, status: "verificado", verified_at: new Date().toISOString() });
  if (moduloId) await admin.from("mentor_modulo").insert({ mentor_id: u.id, modulo_id: moduloId });
  for (let d = 1; d <= 7; d++) await u.sb.from("availability").insert({ profile_id: u.id, weekday: d, start_time: "10:00", end_time: "12:00" });
  return u;
}
const avisos = async (u, kind) => ((await u.sb.from("notification").select("payload").eq("kind", kind)).data ?? []);
const saldo = async (u) => (await u.sb.rpc("my_credit_balance")).data;
const diaMadrid = (n) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date(Date.now() + n * 86_400_000));

async function main() {
  const { error: tblErr } = await admin.from("slot_offer").select("id").limit(1);
  check("tabla slot_offer existe", !tblErr, tblErr?.message);
  if (tblErr) {
    console.log("→ Aplica supabase/migrations/20261012090400_ofertas.sql en el SQL Editor.");
    return;
  }
  const { data: mods } = await admin.from("modulo").select("id, code").order("code");
  const { data: mm } = await admin.from("mentor_modulo").select("modulo_id, mentor_profile!inner(status)").eq("mentor_profile.status", "verificado");
  const ocupados = new Set((mm ?? []).map((x) => x.modulo_id));
  const X = (mods ?? []).find((m) => !ocupados.has(m.id));
  check("módulo sin mentor verificado para probar", !!X);
  if (!X) return;

  // Alumno con alerta «solo si encaja» (mar 18–20): los mentores (10–12) no la cubren solos.
  const s = await alumno("ofertas.s");
  await s.sb.from("availability").insert({ profile_id: s.id, weekday: 2, start_time: "18:00", end_time: "20:00" });
  const ra = await s.sb.rpc("create_module_alert", { p_modulo_code: X.code, p_language: null, p_fit: true });
  const alerta = ra.data;
  const m = await mentor("ofertas.m", X.id);
  const m2 = await mentor("ofertas.m2", X.id);
  const otro = await mentor("ofertas.otro", null); // verificado, pero no imparte X
  check("la alerta sigue abierta (sin horas en común)", (await admin.from("module_alert").select("status").eq("id", alerta).single()).data?.status === "open");

  const D = diaMadrid(2);
  const md = await m.sb.rpc("my_module_demand");
  const ref = (md.data ?? []).find((f) => f.modulo_code === X.code)?.profiles?.[0]?.ref;
  check("el mentor ve la alerta por su ref", ref === alerta);

  // 1. Ofertas.
  const o1 = await m.sb.rpc("offer_slot", { p_alert: alerta, p_kind: "sesion_1a1", p_starts_local: `${D}T10:00:00`, p_note: "Repasamos bucles" });
  check("mentor ofrece un hueco de su agenda", !o1.error, o1.error?.message);
  check("repetir la oferta → alreadyOffered", failsWith(await m.sb.rpc("offer_slot", { p_alert: alerta, p_kind: "sesion_1a1", p_starts_local: `${D}T11:00:00`, p_note: null }), "alreadyOffered"));
  check("fuera de su agenda → outsideAgenda", failsWith(await m2.sb.rpc("offer_slot", { p_alert: alerta, p_kind: "sesion_1a1", p_starts_local: `${D}T15:00:00`, p_note: null }), "outsideAgenda"));
  check("mentor que no imparte el módulo → notMentor", failsWith(await otro.sb.rpc("offer_slot", { p_alert: alerta, p_kind: "sesion_1a1", p_starts_local: `${D}T10:00:00`, p_note: null }), "notMentor"));
  const o2 = await m2.sb.rpc("offer_slot", { p_alert: alerta, p_kind: "sesion_flash", p_starts_local: `${D}T11:00:00`, p_note: null });
  check("segundo mentor ofrece otro hueco", !o2.error, o2.error?.message);

  const so = await avisos(s, "slot_offer");
  check("el alumno recibe 2 avisos de hueco ofrecido", so.length === 2 && so.every((x) => x.payload.modulo === X.code && x.payload.starts_at));
  const { data: vistas } = await s.sb.from("slot_offer").select("id, credits, note");
  check("el alumno ve sus 2 ofertas (con precio y mensaje)", (vistas ?? []).length === 2 && vistas.some((v) => v.note === "Repasamos bucles"));
  const intruso = await alumno("ofertas.intruso");
  check("otro alumno NO ve esas ofertas", ((await intruso.sb.from("slot_offer").select("id")).data ?? []).length === 0);
  check("el cliente NO llama a respond_slot_offer", !!(await s.sb.rpc("respond_slot_offer", { p_student: s.id, p_offer: o1.data, p_accept: true })).error);
  check("otro alumno NO responde la oferta → notFound", failsWith(await admin.rpc("respond_slot_offer", { p_student: intruso.id, p_offer: o1.data, p_accept: true }), "notFound"));

  // 2. Rechazar la de m2.
  const rej = await admin.rpc("respond_slot_offer", { p_student: s.id, p_offer: o2.data, p_accept: false });
  check("alumno rechaza la oferta de m2", !rej.error, rej.error?.message);
  check("m2 recibe «no le va bien»", (await avisos(m2, "offer_declined")).length === 1);

  // 3. Aceptar la de m: reserva, cobro y confirmada.
  const antes = await saldo(s);
  const acc = await admin.rpc("respond_slot_offer", { p_student: s.id, p_offer: o1.data, p_accept: true });
  check("alumno acepta → reserva creada", !acc.error && !!acc.data, acc.error?.message);
  const { data: bk } = await admin.from("booking").select("status, credits, mentor_id").eq("id", acc.data).single();
  check("la reserva queda CONFIRMADA y es con m", bk?.status === "confirmada" && bk.mentor_id === m.id);
  check("se cobran los créditos de la sesión", antes - (await saldo(s)) === bk?.credits, `${antes} → ${await saldo(s)}`);
  check("m recibe «han aceptado tu hueco» y NO «nueva solicitud»", (await avisos(m, "offer_accepted")).length === 1 && (await avisos(m, "booking_requested")).length === 0);
  check("el alumno recibe «sesión confirmada»", (await avisos(s, "booking_confirmed")).length === 1);
  check("la alerta queda cubierta", (await admin.from("module_alert").select("status").eq("id", alerta).single()).data?.status === "notified");
  check("aceptar otra vez → notPending", failsWith(await admin.rpc("respond_slot_offer", { p_student: s.id, p_offer: o1.data, p_accept: true }), "notPending"));
  check("con la alerta cubierta no se puede ofrecer más → alertClosed", failsWith(await m2.sb.rpc("offer_slot", { p_alert: alerta, p_kind: "sesion_1a1", p_starts_local: `${D}T10:00:00`, p_note: null }), "alertClosed"));

  // 4. Retirar.
  const s2 = await alumno("ofertas.s2");
  const ra2 = await s2.sb.rpc("create_module_alert", { p_modulo_code: X.code, p_language: null, p_fit: true });
  const o3 = await m2.sb.rpc("offer_slot", { p_alert: ra2.data, p_kind: "sesion_1a1", p_starts_local: `${diaMadrid(3)}T10:00:00`, p_note: null });
  await m2.sb.rpc("withdraw_slot_offer", { p_offer: o3.data });
  check("el mentor retira su oferta", (await admin.from("slot_offer").select("status").eq("id", o3.data).single()).data?.status === "retirada");
  check("retirada → el alumno ya no puede aceptarla", failsWith(await admin.rpc("respond_slot_offer", { p_student: s2.id, p_offer: o3.data, p_accept: true }), "notPending"));

  // Limpieza.
  if (acc.data) await admin.rpc("cancel_booking", { p_actor: m.id, p_booking: acc.data });
  await admin.from("module_alert").update({ status: "closed" }).in("id", [alerta, ra2.data].filter(Boolean));
  await admin.from("mentor_profile").update({ status: "pendiente", verified_at: null }).in("profile_id", [m.id, m2.id, otro.id]);
  for (const u of [s, s2, intruso, m, m2, otro]) await u.sb.auth.signOut();
}

await main();
console.log(ok ? "\nTodo OK" : "\nHAY FALLOS");
process.exitCode = ok ? 0 : 1;
