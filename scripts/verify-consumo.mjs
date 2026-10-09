// Verifica F2.1 (tickets y reservas = consumo de créditos) contra la BD real:
//   · seguridad: el cliente no crea tickets/reservas ni llama a las RPC de cobro,
//     ni escribe ganancias; terceros no ven lo ajeno;
//   · tickets: cobro, bolsa del mentor, coger, hilo, ganancia única, cerrar,
//     cancelar con devolución, saldo insuficiente, módulo sin mentores;
//   · reservas: precio por nivel, solapes, antelación, aceptar (sala), rechazar y
//     cancelar con devolución, cancelación tardía, completar → ganancia.
// Usuarios de prueba FIJOS (@tutor247.dev) que se reutilizan: el ledger es inmutable,
// así que los saldos se comprueban por diferencia.
// Uso: node scripts/verify-consumo.mjs
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
const client = () => createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, opts);
const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, opts);

const password = "Tutor247Dev!";
let ok = true;
const check = (l, c, x = "") => {
  console.log(`${c ? "✓" : "✗"} ${l}${x ? " → " + x : ""}`);
  if (!c) ok = false;
};
const failsWith = (res, code) => !!res.error && res.error.message.includes(code);

// Crea (si no existe) y abre sesión con un usuario de prueba.
async function usuario(email, fullName, role) {
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });
  if (error && !/already/i.test(error.message)) throw error;
  const sb = client();
  const { data, error: siErr } = await sb.auth.signInWithPassword({ email, password });
  if (siErr) throw siErr;
  return { sb, id: data.user.id };
}

// Fecha/hora de pared en Madrid ("AAAA-MM-DDTHH:MM") a `ms` desde ahora.
function madrid(ms) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(Date.now() + ms))
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
const H = 3600_000;

async function main() {
  // 0. Migración aplicada.
  const { error: tblErr } = await admin.from("product_price").select("kind").limit(1);
  check("tabla product_price existe", !tblErr, tblErr?.message);
  if (tblErr) {
    console.log("→ Aplica supabase/migrations/20261008090100_tickets_bookings.sql en el SQL Editor.");
    return;
  }

  // 1. Actores: alumno con saldo, alumno sin saldo, mentor verificado (pro) de 0485 y
  //    mentor verificado de otro módulo.
  const alumno = await usuario("test.consumo.alumno@tutor247.dev", "Lucía Prueba", "alumno");
  const pobre = await usuario("test.consumo.pobre@tutor247.dev", "Pobre Prueba", "alumno");
  const mentor = await usuario("test.consumo.mentor@tutor247.dev", "Marta Mentora", "mentor");
  const otro = await usuario("test.consumo.otro@tutor247.dev", "Otro Mentor", "mentor");

  for (const s of [alumno, pobre]) {
    const { error } = await s.sb
      .from("student_profile")
      .upsert({ profile_id: s.id, mode: "autonomo" }, { onConflict: "profile_id" });
    check("student_profile de prueba", !error, error?.message);
  }
  const { data: m0485 } = await admin.from("modulo").select("id").eq("code", "0485").single();
  const { data: m2 } = await admin.from("modulo").select("id").neq("id", m0485.id).limit(1).single();

  for (const [m, level, modulo] of [
    [mentor, "pro", m0485.id],
    [otro, "mentor", m2.id],
  ]) {
    const { error } = await admin.from("mentor_profile").upsert(
      { profile_id: m.id, status: "verificado", level, verified_at: new Date().toISOString() },
      { onConflict: "profile_id" },
    );
    check("mentor_profile verificado", !error, error?.message);
    await admin
      .from("mentor_modulo")
      .upsert({ mentor_id: m.id, modulo_id: modulo }, { onConflict: "mentor_id,modulo_id" });
  }

  // Un módulo sin ningún mentor verificado (para noMentorForModulo).
  const { data: mods } = await admin.from("modulo").select("id, code");
  const { data: mm } = await admin.from("mentor_modulo").select("modulo_id");
  const conMentor = new Set((mm ?? []).map((x) => x.modulo_id));
  const sinMentor = (mods ?? []).find((m) => !conMentor.has(m.id));

  // Limpieza de ejecuciones anteriores: reservas activas del alumno → canceladas
  // (devuelve créditos) para que no bloqueen huecos.
  const { data: activas } = await admin
    .from("booking")
    .select("id, mentor_id")
    .eq("student_id", alumno.id)
    .in("status", ["solicitada", "confirmada"]);
  for (const b of activas ?? []) await admin.rpc("cancel_booking", { p_actor: b.mentor_id, p_booking: b.id });

  // Saldo suficiente para toda la prueba.
  await admin.from("credit_ledger").insert({
    student_id: alumno.id,
    type: "ajuste",
    amount: 100,
    note: "verify-consumo.mjs",
  });
  const saldo = async () => (await alumno.sb.rpc("my_credit_balance")).data;

  // 2. Seguridad: el cliente solo lee.
  const insT = await alumno.sb
    .from("ticket")
    .insert({ student_id: alumno.id, modulo_id: m0485.id, kind: "ticket_normal", subject: "gratis" });
  check("alumno NO inserta tickets directamente", !!insT.error, insT.error?.message);
  const insB = await alumno.sb.from("booking").insert({
    student_id: alumno.id,
    mentor_id: mentor.id,
    product_kind: "sesion_1a1",
    starts_at: new Date(Date.now() + 48 * H).toISOString(),
  });
  check("alumno NO inserta reservas directamente", !!insB.error, insB.error?.message);
  const rpcCli = await alumno.sb.rpc("create_ticket", {
    p_student: alumno.id,
    p_modulo_code: "0485",
    p_kind: "ticket_normal",
    p_subject: "Hola",
    p_body: "Intento de cobro desde cliente",
  });
  check("alumno NO ejecuta la RPC create_ticket", !!rpcCli.error, rpcCli.error?.message);
  const rpcCli2 = await mentor.sb.rpc("complete_booking", {
    p_mentor: mentor.id,
    p_booking: "00000000-0000-0000-0000-000000000000",
  });
  check("mentor NO ejecuta la RPC complete_booking", !!rpcCli2.error, rpcCli2.error?.message);
  const insE = await mentor.sb
    .from("mentor_earning")
    .insert({ mentor_id: mentor.id, product_kind: "sesion_1a1", credits: 999 });
  check("mentor NO se apunta ganancias", !!insE.error, insE.error?.message);

  // 3. Ticket: cobro.
  let antes = await saldo();
  const t1 = await admin.rpc("create_ticket", {
    p_student: alumno.id,
    p_modulo_code: "0485",
    p_kind: "ticket_normal",
    p_subject: "Bucle infinito en Java",
    p_body: "Mi while no termina nunca y no sé por qué.",
  });
  check("create_ticket (servidor)", !t1.error, t1.error?.message);
  const ticket = t1.data;
  check("cobra 3 créditos (ticket normal)", antes - (await saldo()) === 3);
  const { data: gasto } = await admin
    .from("credit_ledger")
    .select("type, amount, product_kind")
    .eq("ticket_id", ticket);
  check("ledger: 1 gasto ligado al ticket", gasto?.length === 1 && gasto[0].type === "gasto");
  const dup = await admin
    .from("credit_ledger")
    .insert({ student_id: alumno.id, type: "gasto", amount: -3, ticket_id: ticket });
  check("no se puede cobrar dos veces el mismo ticket", !!dup.error, dup.error?.message);

  const upd = await alumno.sb.from("ticket").update({ status: "cerrado" }).eq("id", ticket).select();
  check("alumno NO cambia el estado del ticket a mano", !!upd.error || (upd.data ?? []).length === 0);

  // Bolsa: lo ve el mentor del módulo, no el de otro módulo ni otro alumno.
  const pool = await mentor.sb.from("ticket").select("id").eq("id", ticket);
  check("mentor del módulo ve el ticket en la bolsa", pool.data?.length === 1);
  const poolOtro = await otro.sb.from("ticket").select("id").eq("id", ticket);
  check("mentor de otro módulo NO lo ve", (poolOtro.data ?? []).length === 0);
  const ajeno = await pobre.sb.from("ticket").select("id").eq("id", ticket);
  check("otro alumno NO lo ve", (ajeno.data ?? []).length === 0);

  const claimOtro = await admin.rpc("claim_ticket", { p_mentor: otro.id, p_ticket: ticket });
  check("mentor de otro módulo NO puede cogerlo", failsWith(claimOtro, "notFound"));
  const claim = await admin.rpc("claim_ticket", { p_mentor: mentor.id, p_ticket: ticket });
  check("mentor coge el ticket", !claim.error, claim.error?.message);
  const claim2 = await admin.rpc("claim_ticket", { p_mentor: mentor.id, p_ticket: ticket });
  check("no se puede coger dos veces", failsWith(claim2, "alreadyClaimed"));
  const cancelTarde = await admin.rpc("cancel_ticket", { p_student: alumno.id, p_ticket: ticket });
  check("alumno NO cancela un ticket ya cogido", failsWith(cancelTarde, "cannotCancel"));

  const { data: nombres } = await mentor.sb.rpc("my_student_names", { p_ids: [alumno.id, pobre.id] });
  check(
    "mentor ve solo el nombre de pila de SU alumno",
    nombres?.length === 1 && nombres[0].first_name === "Lucía",
    JSON.stringify(nombres),
  );

  const msgPobre = await admin.rpc("post_ticket_message", {
    p_author: pobre.id,
    p_ticket: ticket,
    p_body: "intruso",
  });
  check("un tercero NO escribe en el hilo", failsWith(msgPobre, "notFound"));
  const r1 = await admin.rpc("post_ticket_message", {
    p_author: mentor.id,
    p_ticket: ticket,
    p_body: "Revisa la condición: nunca cambias la variable del bucle.",
  });
  check("mentor responde", !r1.error, r1.error?.message);
  await admin.rpc("post_ticket_message", { p_author: alumno.id, p_ticket: ticket, p_body: "¿Y con for?" });
  await admin.rpc("post_ticket_message", { p_author: mentor.id, p_ticket: ticket, p_body: "Igual." });
  const { data: earnT } = await admin.from("mentor_earning").select("credits").eq("ticket_id", ticket);
  check("ganancia del mentor: una sola, 3 créditos", earnT?.length === 1 && earnT[0].credits === 3);
  const { data: hilo } = await alumno.sb.from("ticket_message").select("id").eq("ticket_id", ticket);
  check("alumno lee el hilo (3 mensajes)", hilo?.length === 3);
  const hiloAjeno = await pobre.sb.from("ticket_message").select("id").eq("ticket_id", ticket);
  check("otro alumno NO lee el hilo", (hiloAjeno.data ?? []).length === 0);
  const cerrar = await admin.rpc("close_ticket", { p_student: alumno.id, p_ticket: ticket });
  check("alumno lo da por resuelto", !cerrar.error, cerrar.error?.message);
  const trasCerrar = await admin.rpc("post_ticket_message", {
    p_author: alumno.id,
    p_ticket: ticket,
    p_body: "otra",
  });
  check("no se escribe en un ticket cerrado", failsWith(trasCerrar, "ticketClosed"));

  // Ticket Express cancelado antes de que lo cojan → devolución.
  antes = await saldo();
  const t2 = await admin.rpc("create_ticket", {
    p_student: alumno.id,
    p_modulo_code: "0485",
    p_kind: "ticket_express",
    p_subject: "Urgente",
    p_body: "Examen mañana, no entiendo herencia.",
  });
  check("ticket express cobra 6", !t2.error && antes - (await saldo()) === 6, t2.error?.message);
  const c2 = await admin.rpc("cancel_ticket", { p_student: alumno.id, p_ticket: t2.data });
  check("cancelar ticket libre → devuelve 6", !c2.error && (await saldo()) === antes, c2.error?.message);
  const c2b = await admin.rpc("cancel_ticket", { p_student: alumno.id, p_ticket: t2.data });
  check("no se devuelve dos veces", failsWith(c2b, "cannotCancel"));

  // Política de cancelación: cogido y sin respuesta → solo cancelable con el plazo vencido.
  antes = await saldo();
  const t3 = await admin.rpc("create_ticket", {
    p_student: alumno.id,
    p_modulo_code: "0485",
    p_kind: "ticket_express",
    p_subject: "Sin respuesta",
    p_body: "El mentor lo coge y no contesta a tiempo.",
  });
  await admin.rpc("claim_ticket", { p_mentor: mentor.id, p_ticket: t3.data });
  check(
    "cogido y en plazo → no se cancela",
    failsWith(await admin.rpc("cancel_ticket", { p_student: alumno.id, p_ticket: t3.data }), "cannotCancel"),
  );
  // Simula que vence el plazo (solo para la prueba).
  await admin
    .from("ticket")
    .update({ due_at: new Date(Date.now() - 60_000).toISOString() })
    .eq("id", t3.data);
  const c3 = await admin.rpc("cancel_ticket", { p_student: alumno.id, p_ticket: t3.data });
  check("cogido con plazo vencido sin respuesta → devuelve 6", !c3.error && (await saldo()) === antes, c3.error?.message);
  const { data: earn3 } = await admin.from("mentor_earning").select("id").eq("ticket_id", t3.data);
  check("…y el mentor no cobra", (earn3 ?? []).length === 0);

  const sinSaldo = await admin.rpc("create_ticket", {
    p_student: pobre.id,
    p_modulo_code: "0485",
    // Express (6) > bienvenida (3): el test sigue valiendo aunque reciba el bonus.
    p_kind: "ticket_express",
    p_subject: "Sin saldo",
    p_body: "No tengo créditos pero pregunto.",
  });
  check("saldo insuficiente → no crea ni cobra", failsWith(sinSaldo, "insufficientCredits"));
  if (sinMentor) {
    const sm = await admin.rpc("create_ticket", {
      p_student: alumno.id,
      p_modulo_code: sinMentor.code,
      p_kind: "ticket_normal",
      p_subject: "Nadie",
      p_body: "Módulo sin mentores verificados.",
    });
    check("módulo sin mentores → no cobra", failsWith(sm, "noMentorForModulo"));
  }

  // 4. Reservas. Hora aleatoria a 5–25 días para no chocar con ejecuciones previas.
  const dias = 5 + Math.floor(Math.random() * 20);
  const slot = madrid(dias * 24 * H + Math.floor(Math.random() * 40) * 15 * 60_000);
  const reservar = (p = {}) =>
    admin.rpc("create_booking", {
      p_student: alumno.id,
      p_mentor: mentor.id,
      p_modulo_code: "0485",
      p_kind: "sesion_flash",
      p_starts_local: slot,
      p_note: "RA3",
      ...p,
    });

  antes = await saldo();
  const b1 = await reservar();
  check("reserva flash con mentor pro", !b1.error, b1.error?.message);
  check("cobra 13 (flash, nivel pro)", antes - (await saldo()) === 13);
  const { data: g1 } = await admin
    .from("credit_ledger")
    .select("mentor_id")
    .eq("booking_id", b1.data)
    .eq("type", "gasto")
    .single();
  check("gasto atribuido al mentor", g1?.mentor_id === mentor.id);
  check("mismo hueco → slotTaken", failsWith(await reservar(), "slotTaken"));
  check("con < 3 h → tooSoon", failsWith(await reservar({ p_starts_local: madrid(1 * H) }), "tooSoon"));
  check("> 90 días → tooFar", failsWith(await reservar({ p_starts_local: madrid(100 * 24 * H) }), "tooFar"));
  check(
    "mentor que no imparte el módulo → mentorNotAvailable",
    failsWith(await reservar({ p_mentor: otro.id }), "mentorNotAvailable"),
  );

  const acc = await admin.rpc("respond_booking", { p_mentor: mentor.id, p_booking: b1.data, p_accept: true });
  check("mentor acepta", !acc.error, acc.error?.message);
  const { data: vista } = await alumno.sb.from("booking").select("status, meeting_url").eq("id", b1.data).single();
  check(
    "alumno ve la sesión confirmada con sala",
    vista?.status === "confirmada" && vista.meeting_url?.startsWith("https://meet.jit.si/Tutor247-"),
  );
  const vistaAjena = await pobre.sb.from("booking").select("id").eq("id", b1.data);
  check("otro alumno NO ve la reserva", (vistaAjena.data ?? []).length === 0);
  antes = await saldo();
  const cb1 = await admin.rpc("cancel_booking", { p_actor: alumno.id, p_booking: b1.data });
  check("alumno cancela con > 24 h → devuelve 13", !cb1.error && (await saldo()) - antes === 13, cb1.error?.message);

  // Rechazo del mentor → devolución.
  const b2 = await reservar({ p_kind: "sesion_1a1" });
  check("reserva 1:1 cobra 30 (pro)", !b2.error, b2.error?.message);
  antes = await saldo();
  const rej = await admin.rpc("respond_booking", { p_mentor: mentor.id, p_booking: b2.data, p_accept: false });
  check("mentor rechaza → devuelve 30", !rej.error && (await saldo()) - antes === 30, rej.error?.message);

  // Sesión próxima (4 h): cancelación tardía bloqueada; completar antes de empezar no.
  const b3 = await reservar({ p_starts_local: madrid(4 * H) });
  check("reserva a 4 h", !b3.error, b3.error?.message);
  await admin.rpc("respond_booking", { p_mentor: mentor.id, p_booking: b3.data, p_accept: true });
  check(
    "alumno NO cancela confirmada con < 24 h",
    failsWith(await admin.rpc("cancel_booking", { p_actor: alumno.id, p_booking: b3.data }), "tooLateToCancel"),
  );
  check(
    "no se completa antes de empezar",
    failsWith(await admin.rpc("complete_booking", { p_mentor: mentor.id, p_booking: b3.data }), "notStarted"),
  );
  // Simula que la sesión ya ha ocurrido (solo para la prueba).
  await admin
    .from("booking")
    .update({
      starts_at: new Date(Date.now() - 30 * 60_000).toISOString(),
      ends_at: new Date(Date.now() - 5 * 60_000).toISOString(),
    })
    .eq("id", b3.data);
  const done = await admin.rpc("complete_booking", { p_mentor: mentor.id, p_booking: b3.data });
  check("mentor marca la sesión como hecha", !done.error, done.error?.message);
  const { data: earnB } = await admin.from("mentor_earning").select("credits").eq("booking_id", b3.data);
  check("ganancia de la sesión: 13 créditos", earnB?.length === 1 && earnB[0].credits === 13);
  const { data: misGan } = await mentor.sb.from("mentor_earning").select("id");
  const { data: ganOtro } = await otro.sb.from("mentor_earning").select("id").eq("mentor_id", mentor.id);
  check("mentor lee sus ganancias; otro mentor no", (misGan ?? []).length >= 2 && (ganOtro ?? []).length === 0);
  const upE = await admin.from("mentor_earning").update({ credits: 999 }).eq("booking_id", b3.data);
  check("mentor_earning inmutable", !!upE.error, upE.error?.message);

  // Los mentores de prueba no deben quedar visibles en el catálogo público.
  const { error: pendErr } = await admin
    .from("mentor_profile")
    .update({ status: "pendiente", verified_at: null })
    .in("profile_id", [mentor.id, otro.id]);
  check("mentores de prueba vuelven a pendiente (fuera de /mentores)", !pendErr, pendErr?.message);

  for (const s of [alumno, pobre, mentor, otro]) await s.sb.auth.signOut();
}

await main();
console.log(ok ? "\nTodo OK" : "\nHAY FALLOS");
// exitCode (no process.exit): en Windows, salir a la fuerza con sockets abiertos
// dispara un assert de libuv.
process.exitCode = ok ? 0 : 1;
