// Verifica la fase 7 contra la BD real: Mapa de Dominio guardado (autoevaluación,
// evidencias inmutables, sello solo por personas), actividad, rol tutor (alta por
// admin, cartera solo de asignados, check-ins, informes) y que nadie escriba directo.
// Crea usuarios @tutor247.dev. Los alumnos reciben el bonus de bienvenida (ledger
// inmutable) y no se pueden borrar: los limpia apply_all.sql.
// Uso: node scripts/verify-mapa.mjs
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
  return { id: data.user.id, email, sb };
}

async function alumno(tag) {
  const a = await nuevoUsuario(tag, "alumno");
  const { error } = await a.sb.from("student_profile").upsert({ profile_id: a.id }, { onConflict: "profile_id" });
  if (error) throw new Error(error.message);
  return a;
}

async function main() {
  const { error: tblErr } = await admin.from("ra_progress").select("ra_id").limit(1);
  check("tabla ra_progress existe", !tblErr, tblErr?.message);
  if (tblErr) {
    console.log("→ Aplica supabase/migrations/20261010090100_mapa_tutor.sql en el SQL Editor.");
    return;
  }

  const { data: ras } = await admin
    .from("ra")
    .select("id, code, modulo!inner(code)")
    .eq("modulo.code", "0485")
    .order("sort_order");
  check("0485 tiene RA cargados", (ras?.length ?? 0) >= 3, `${ras?.length ?? 0}`);

  const ana = await alumno("mapa.ana");
  const otro = await alumno("mapa.otro");

  // 1. Autoevaluación → progreso + evidencias; añade el módulo a "mis módulos".
  const niveles = { [ras[0].code]: "domino", [ras[1].code]: "casi", [ras[2].code]: "aun_no", RA99: "domino" };
  const { data: n, error: saErr } = await ana.sb.rpc("save_self_assessment", { p_modulo_code: "0485", p_niveles: niveles });
  check("alumno guarda su autoevaluación (ignora RA inexistentes)", !saErr && n === 3, saErr?.message ?? `n=${n}`);
  const { data: prog } = await ana.sb.from("ra_progress").select("ra_id, nivel, progress, sealed").eq("student_id", ana.id);
  check("ra_progress con 3 RA y progreso por nivel", prog?.length === 3 && prog.some((p) => p.nivel === "casi" && p.progress === 75));
  check("la autoevaluación no pone sellos", prog?.every((p) => !p.sealed));
  const { data: sm } = await ana.sb.from("student_modulo").select("modulo_id").eq("student_id", ana.id);
  check("guardar el diagnóstico añade el módulo", sm?.length === 1);
  const { data: act } = await ana.sb.from("student_activity").select("day").eq("student_id", ana.id);
  check("cuenta como día activo", act?.length === 1);

  // 2. Nadie escribe directo ni falsifica evidencias.
  const { error: insErr } = await ana.sb
    .from("ra_progress")
    .insert({ student_id: ana.id, ra_id: ras[3]?.id ?? ras[0].id, nivel: "domino", progress: 100, sealed: true });
  check("alumno NO inserta ra_progress directo", !!insErr);
  const { error: updErr, data: updData } = await ana.sb
    .from("ra_progress")
    .update({ sealed: true })
    .eq("student_id", ana.id)
    .select();
  check("alumno NO se pone el sello a mano", !!updErr || !updData?.length);
  const { error: applyErr } = await ana.sb.rpc("apply_ra_evidence", {
    p_student: ana.id, p_ra: ras[0].id, p_kind: "ajuste", p_nivel: "domino",
    p_seal: true, p_note: null, p_author: ana.id, p_booking: null,
  });
  check("alumno NO ejecuta apply_ra_evidence", !!applyErr);
  const { error: selfErr } = await ana.sb.rpc("assess_ra", {
    p_student: ana.id, p_ra: ras[0].id, p_nivel: "domino", p_seal: true, p_note: null,
  });
  check("alumno NO se valora con assess_ra", selfErr?.message?.includes("notAllowed"), selfErr?.message);
  const { data: ev } = await admin.from("ra_evidence").select("id").eq("student_id", ana.id).limit(1);
  const { error: evErr } = await admin.from("ra_evidence").update({ nivel: "domino" }).eq("id", ev[0].id);
  check("ra_evidence es inmutable (ni el servidor la edita)", !!evErr);

  // 3. Privacidad entre alumnos.
  const { data: ajeno } = await otro.sb.from("ra_progress").select("ra_id").eq("student_id", ana.id);
  check("otro alumno NO ve el Mapa ajeno", (ajeno?.length ?? 0) === 0);

  // 4. Tutor: nadie se hace tutor solo; alta por admin; ve solo a sus asignados.
  const tutor = await nuevoUsuario("mapa.tutor", "familia");
  const { error: selfRt } = await tutor.sb.from("reference_tutor").insert({ profile_id: tutor.id });
  check("un usuario NO se crea su fila de tutor", !!selfRt);
  const { error: mkFail } = await tutor.sb.rpc("admin_make_tutor", { p_email: tutor.email });
  check("un no-admin NO da rol de tutor", mkFail?.message?.includes("notAdmin"), mkFail?.message);
  const { error: mkStudent } = await admin.rpc("admin_make_tutor", { p_email: ana.email });
  check("un alumno NO puede ser tutor", mkStudent?.message?.includes("badRole"), mkStudent?.message);
  const { error: mkErr } = await admin.rpc("admin_make_tutor", { p_email: tutor.email });
  check("admin hace tutor a una cuenta", !mkErr, mkErr?.message);
  const { data: rol } = await admin.from("profile").select("role").eq("id", tutor.id).single();
  check("rol pasa a tutor_referencia", rol?.role === "tutor_referencia");

  const { data: c0 } = await tutor.sb.rpc("my_tutor_students");
  check("sin asignación, cartera vacía", (c0?.length ?? 0) === 0);
  const { data: p0 } = await tutor.sb.from("ra_progress").select("ra_id").eq("student_id", ana.id);
  check("sin asignación, NO ve el Mapa", (p0?.length ?? 0) === 0);

  const { error: asErr } = await admin.rpc("admin_assign_tutor", { p_student: ana.id, p_tutor: tutor.id });
  check("admin asigna alumno a tutor", !asErr, asErr?.message);
  const { data: c1 } = await tutor.sb.rpc("my_tutor_students");
  check("cartera con su alumno y señales", c1?.length === 1 && c1[0].ra_total === 3 && c1[0].active_days_7 === 1,
    JSON.stringify(c1?.[0] ?? null));
  check("cartera sin email (anti-bypass)", c1?.[0] && !("email" in c1[0]));
  const { data: p1 } = await tutor.sb.from("ra_progress").select("ra_id").eq("student_id", ana.id);
  check("asignado: ve el Mapa", p1?.length === 3);
  const { data: px } = await tutor.sb.from("ra_progress").select("ra_id").eq("student_id", otro.id);
  check("NO ve el Mapa de alumnos no asignados", (px?.length ?? 0) === 0);

  const { error: tuErr } = await tutor.sb.rpc("assess_ra", {
    p_student: ana.id, p_ra: ras[2].id, p_nivel: "con_ayuda", p_seal: true, p_note: "Lo ha explicado bien",
  });
  check("tutor valora un RA con sello", !tuErr, tuErr?.message);
  const { data: sellado } = await ana.sb.from("ra_progress").select("nivel, sealed, sealed_by").eq("ra_id", ras[2].id).single();
  check("el alumno ve el sello del tutor", sellado?.sealed && sellado.sealed_by === tutor.id && sellado.nivel === "con_ayuda");
  const { data: evT } = await ana.sb.from("ra_evidence").select("kind").eq("ra_id", ras[2].id).order("created_at", { ascending: false }).limit(1);
  check("evidencia de tipo tutor", evT?.[0]?.kind === "tutor");
  const { error: tuOtro } = await tutor.sb.rpc("assess_ra", {
    p_student: otro.id, p_ra: ras[0].id, p_nivel: "domino", p_seal: true, p_note: null,
  });
  check("tutor NO valora a alumnos no asignados", tuOtro?.message?.includes("notAllowed"), tuOtro?.message);

  // Una nueva autoevaluación cambia el nivel pero conserva el sello.
  await ana.sb.rpc("save_self_assessment", { p_modulo_code: "0485", p_niveles: { [ras[2].code]: "casi" } });
  const { data: tras } = await ana.sb.from("ra_progress").select("nivel, sealed").eq("ra_id", ras[2].id).single();
  check("autoevaluación posterior conserva el sello", tras?.nivel === "casi" && tras.sealed);

  // 5. Check-ins.
  const cuando = new Date(Date.now() + 86_400_000).toISOString();
  const { error: ciErr } = await tutor.sb.from("checkin").insert({ tutor_id: tutor.id, student_id: ana.id, scheduled_at: cuando, topic: "Plan" });
  check("tutor agenda check-in de su alumno", !ciErr, ciErr?.message);
  const { error: ciOtro } = await tutor.sb.from("checkin").insert({ tutor_id: tutor.id, student_id: otro.id, scheduled_at: cuando });
  check("NO agenda check-in a no asignados", !!ciOtro);
  const { data: ciAna } = await ana.sb.from("checkin").select("id").eq("student_id", ana.id);
  check("el alumno ve su check-in", ciAna?.length === 1);
  const { data: c2 } = await tutor.sb.rpc("my_tutor_students");
  check("cartera muestra el próximo check-in", !!c2?.[0]?.next_checkin);

  // 6. Informe semanal del tutor.
  const lunes = new Date();
  lunes.setUTCDate(lunes.getUTCDate() - ((lunes.getUTCDay() + 6) % 7));
  const { error: wrErr } = await tutor.sb.from("weekly_report").insert({
    student_id: ana.id, week_start: lunes.toISOString().slice(0, 10), payload: { overall: "verde", overall_note: "Bien", tip: "Seguid" },
  });
  check("tutor redacta informe de su alumno", !wrErr, wrErr?.message);
  const { error: wrOtro } = await tutor.sb.from("weekly_report").insert({
    student_id: otro.id, week_start: lunes.toISOString().slice(0, 10), payload: {},
  });
  check("NO redacta informes de no asignados", !!wrOtro);

  // 7. El alumno ve el nombre de su tutor.
  const { data: tn } = await ana.sb.rpc("my_tutor_name");
  check("el alumno ve el nombre de pila de su tutor", tn === "Test");

  // Limpieza de lo que sí se puede borrar.
  await admin.rpc("admin_assign_tutor", { p_student: ana.id, p_tutor: null });
}

try {
  await main();
} catch (e) {
  check("ejecución", false, e.message);
} finally {
  // Solo el tutor (sin ledger) se puede borrar; los alumnos los limpia apply_all.sql.
  for (const id of created) await admin.auth.admin.deleteUser(id).catch(() => {});
}
console.log(ok ? "\nTodo OK" : "\nHAY FALLOS");
process.exitCode = ok ? 0 : 1;
