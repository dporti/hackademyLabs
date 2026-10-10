// Verifica la fase 9 (aula integrada) contra la BD real: editor compartido, Modo
// Examen solo del mentor, pizarra y ficheros solo para las dos partes de una reserva
// confirmada. Crea usuarios @tutor247.dev y una reserva directa (service role, sin
// cobro) que borra al final. Requiere la migración 20261010090300_aula.sql.
// Uso: node scripts/verify-aula.mjs
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
const bookings = [];
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
  created.push(data.user.id);
  const sb = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, opts);
  const { error: siErr } = await sb.auth.signInWithPassword({ email, password });
  if (siErr) throw new Error(`signIn ${tag}: ${siErr.message}`);
  return { id: data.user.id, sb };
}

async function main() {
  const { error: tblErr } = await admin.from("aula_doc").select("booking_id").limit(1);
  check("tabla aula_doc existe", !tblErr, tblErr?.message);
  if (tblErr) {
    console.log("→ Aplica supabase/migrations/20261010090300_aula.sql en el SQL Editor.");
    return;
  }

  const alumno = await nuevoUsuario("aula.alumno", "alumno");
  await alumno.sb.from("student_profile").upsert({ profile_id: alumno.id }, { onConflict: "profile_id" });
  const mentor = await nuevoUsuario("aula.mentor", "mentor");
  await admin.from("mentor_profile").insert({ profile_id: mentor.id, status: "verificado", verified_at: new Date().toISOString() });
  const intruso = await nuevoUsuario("aula.intruso", "alumno");
  await intruso.sb.from("student_profile").upsert({ profile_id: intruso.id }, { onConflict: "profile_id" });

  const { data: mod } = await admin.from("modulo").select("id").eq("code", "0485").single();
  const ahora = Date.now();
  const nueva = async (status) => {
    const { data, error } = await admin
      .from("booking")
      .insert({
        student_id: alumno.id, mentor_id: mentor.id, modulo_id: mod.id, product_kind: "sesion_flash", status,
        starts_at: new Date(ahora - 5 * 60_000).toISOString(), ends_at: new Date(ahora + 20 * 60_000).toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error(`booking: ${error.message}`);
    bookings.push(data.id);
    return data.id;
  };
  const b = await nueva("confirmada");
  const pendiente = await nueva("solicitada");

  // Editor compartido.
  const { error: insDoc } = await alumno.sb.from("aula_doc").insert({ booking_id: b, code: "int n = 0;" });
  check("alumno crea el documento del aula", !insDoc, insDoc?.message);
  const { data: docM } = await mentor.sb.from("aula_doc").select("code, updated_by").eq("booking_id", b).maybeSingle();
  check("mentor lo lee (y updated_by = alumno)", docM?.code === "int n = 0;" && docM.updated_by === alumno.id);
  const { data: docI } = await intruso.sb.from("aula_doc").select("code").eq("booking_id", b);
  check("intruso NO lo lee", (docI?.length ?? 0) === 0);
  const { data: updI } = await intruso.sb.from("aula_doc").update({ code: "hack" }).eq("booking_id", b).select();
  check("intruso NO lo edita", (updI?.length ?? 0) === 0);
  const { error: insPend } = await alumno.sb.from("aula_doc").insert({ booking_id: pendiente });
  check("sin reserva confirmada no hay aula", !!insPend);

  // Modo Examen: solo el mentor.
  const { error: exAl } = await alumno.sb.from("aula_doc").update({ exam_mode: true }).eq("booking_id", b);
  check("alumno NO activa el Modo Examen", exAl?.message?.includes("onlyMentor"), exAl?.message);
  const { error: exMe } = await mentor.sb.from("aula_doc").update({ exam_mode: true }).eq("booking_id", b);
  check("mentor activa el Modo Examen", !exMe, exMe?.message);
  const { error: codeAl } = await alumno.sb.from("aula_doc").update({ code: "int n = 1;" }).eq("booking_id", b);
  check("alumno sigue escribiendo en Modo Examen", !codeAl, codeAl?.message);

  // Pizarra.
  const { error: stA } = await alumno.sb.from("aula_stroke").insert({ booking_id: b, points: [[0.1, 0.1], [0.2, 0.2]] });
  check("alumno dibuja en la pizarra", !stA, stA?.message);
  const { error: stI } = await intruso.sb.from("aula_stroke").insert({ booking_id: b, points: [[0.5, 0.5]] });
  check("intruso NO dibuja", !!stI);
  const { error: stFake } = await alumno.sb.from("aula_stroke").insert({ booking_id: b, author_id: mentor.id, points: [[0.3, 0.3]] });
  check("nadie dibuja en nombre de otro", !!stFake);
  const { data: stM } = await mentor.sb.from("aula_stroke").select("id").eq("booking_id", b);
  check("mentor ve el trazo", stM?.length === 1);

  // Ficheros.
  const contenido = new Blob(["hola aula"], { type: "text/plain" });
  const { error: upA } = await alumno.sb.storage.from("aula").upload(`${b}/notas.txt`, contenido);
  check("alumno sube un fichero", !upA, upA?.message);
  const { data: lsM } = await mentor.sb.storage.from("aula").list(b);
  check("mentor lo ve", (lsM ?? []).some((f) => f.name === "notas.txt"));
  const { data: lsI } = await intruso.sb.storage.from("aula").list(b);
  check("intruso NO lo ve", !(lsI ?? []).some((f) => f.name === "notas.txt"));
  const { error: upI } = await intruso.sb.storage.from("aula").upload(`${b}/malo.txt`, contenido);
  check("intruso NO sube", !!upI);
  const { error: upRaro } = await alumno.sb.storage.from("aula").upload(`no-es-uuid/x.txt`, contenido);
  check("rutas fuera de una reserva rechazadas", !!upRaro);
  const { data: firm } = await intruso.sb.storage.from("aula").createSignedUrl(`${b}/notas.txt`, 60);
  check("intruso NO obtiene enlace firmado", !firm?.signedUrl);
  await admin.storage.from("aula").remove([`${b}/notas.txt`]);
}

try {
  await main();
} catch (e) {
  check("ejecución", false, e.message);
} finally {
  if (bookings.length) await admin.from("booking").delete().in("id", bookings);
  for (const id of created) await admin.auth.admin.deleteUser(id).catch(() => {});
}
console.log(ok ? "\nTodo OK" : "\nHAY FALLOS");
process.exitCode = ok ? 0 : 1;
