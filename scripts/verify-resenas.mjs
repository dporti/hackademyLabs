// Verifica las reseñas de mentores contra la BD real: solo reseña quien tuvo sesión
// «hecha» o ticket respondido (una vez, ≤60 días), nombre «Nombre I.» o anónimo (forzado
// en menores), vistas públicas sin datos del alumno, media, respuesta del mentor,
// denuncia, moderación del admin y borrado por el alumno. Avisos a cada parte.
// Crea usuarios @tutor247.dev; al final borra las reseñas y deja a los mentores en pendiente.
// Requiere la migración 20261012090500_resenas.sql.
// Uso: node scripts/verify-resenas.mjs
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

async function usuario(tag, role, fullName) {
  const email = `test.${tag}.${stamp}@tutor247.dev`;
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: fullName ?? `Test ${tag}`, role },
  });
  if (error) throw new Error(`createUser ${tag}: ${error.message}`);
  const sb = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, opts);
  const { error: siErr } = await sb.auth.signInWithPassword({ email, password });
  if (siErr) throw new Error(`signIn ${tag}: ${siErr.message}`);
  return { id: data.user.id, sb };
}
async function alumno(tag, fullName, extra = {}) {
  const u = await usuario(tag, "alumno", fullName);
  await admin.from("student_profile").upsert({ profile_id: u.id, ...extra }, { onConflict: "profile_id" });
  return u;
}
async function mentor(tag) {
  const u = await usuario(tag, "mentor");
  await admin.from("mentor_profile").insert({ profile_id: u.id, status: "verificado", verified_at: new Date().toISOString() });
  return u;
}
const hace = (dias) => new Date(Date.now() - dias * 86_400_000).toISOString();
async function sesion(s, m, modulo, { dias = 1, status = "hecha" } = {}) {
  const { data, error } = await admin
    .from("booking")
    .insert({ student_id: s.id, mentor_id: m.id, modulo_id: modulo, product_kind: "sesion_1a1", starts_at: hace(dias), ends_at: hace(dias), status: "confirmada", credits: 10 })
    .select("id")
    .single();
  if (error) throw new Error(`booking: ${error.message}`);
  if (status !== "confirmada") await admin.from("booking").update({ status }).eq("id", data.id);
  return data.id;
}
async function ticket(s, m, modulo) {
  const { data, error } = await admin
    .from("ticket")
    .insert({ student_id: s.id, mentor_id: m.id, modulo_id: modulo, kind: "ticket_normal", subject: "Duda", body: "¿?", status: "respondido", answered_at: hace(0) })
    .select("id")
    .single();
  if (error) throw new Error(`ticket: ${error.message}`);
  return data.id;
}
const resenar = (s, { booking = null, ticket = null, rating = 5, comment = null, anonymous = false }) =>
  admin.rpc("create_review", { p_student: s.id, p_booking: booking, p_ticket: ticket, p_rating: rating, p_comment: comment, p_anonymous: anonymous });
const avisos = async (u, kind) => ((await u.sb.from("notification").select("payload, link").eq("kind", kind)).data ?? []);

async function main() {
  const { error: tblErr } = await admin.from("mentor_review").select("id").limit(1);
  check("tabla mentor_review existe", !tblErr, tblErr?.message);
  if (tblErr) {
    console.log("→ Aplica supabase/migrations/20261012090500_resenas.sql en el SQL Editor.");
    return;
  }
  const { data: mod } = await admin.from("modulo").select("id, code").order("code").limit(1).single();

  const m = await mentor("resenas.m");
  const m2 = await mentor("resenas.m2");
  const s = await alumno("resenas.s", "Lucía Fernández Gil", { birthdate: "1998-05-01" });
  const s2 = await alumno("resenas.s2", "Pau Serra", { birthdate: "2000-01-01" });
  const menor = await alumno("resenas.menor", "Nil Puig", { birthdate: new Date(Date.now() - 16 * 365 * 86_400_000).toISOString().slice(0, 10) });

  // 1. Elegibilidad.
  const b1 = await sesion(s, m, mod.id);
  check("sesión «hecha» → el alumno recibe «¿Qué tal la sesión?»", (await avisos(s, "review_request")).some((a) => a.link === "/panel/sesiones#resenas"));
  const t1 = await ticket(s, m, mod.id);
  const bConf = await sesion(s, m, mod.id, { status: "confirmada" });
  const bVieja = await sesion(s, m, mod.id, { dias: 61 });
  const pend = (await s.sb.rpc("my_reviewable")).data ?? [];
  check("my_reviewable lista la sesión hecha y el ticket (no la confirmada ni la de hace 61 días)",
    pend.some((p) => p.ref === b1) && pend.some((p) => p.ref === t1) && !pend.some((p) => p.ref === bConf || p.ref === bVieja), `${pend.length}`);
  check("el cliente NO llama a create_review", !!(await s.sb.rpc("create_review", { p_student: s.id, p_booking: b1, p_ticket: null, p_rating: 5, p_comment: null, p_anonymous: false })).error);
  check("otro alumno no puede reseñar esa sesión → notEligible", failsWith(await resenar(s2, { booking: b1 }), "notEligible"));
  check("sesión aún no hecha → notEligible", failsWith(await resenar(s, { booking: bConf }), "notEligible"));
  check("sesión de hace 61 días → tooLate", failsWith(await resenar(s, { booking: bVieja }), "tooLate"));
  check("6 estrellas → invalidRating", failsWith(await resenar(s, { booking: b1, rating: 6 }), "invalidRating"));

  // 2. Crear.
  const r1 = await resenar(s, { booking: b1, rating: 5, comment: "Me explicó genial los bucles" });
  check("reseña de la sesión creada", !r1.error && !!r1.data, r1.error?.message);
  check("repetir → alreadyReviewed", failsWith(await resenar(s, { booking: b1 }), "alreadyReviewed"));
  const { data: rv1 } = await admin.from("mentor_review").select("author_name, source").eq("id", r1.data).single();
  check("nombre visible = «Lucía F.»", rv1?.author_name === "Lucía F." && rv1.source === "sesion", rv1?.author_name);
  const r2 = await resenar(s, { ticket: t1, rating: 4, anonymous: true });
  check("reseña del ticket como anónimo → sin nombre", !r2.error && (await admin.from("mentor_review").select("author_name").eq("id", r2.data).single()).data?.author_name === null, r2.error?.message);
  const bMenor = await sesion(menor, m, mod.id);
  const r3 = await resenar(menor, { booking: bMenor, rating: 3, anonymous: false });
  check("menor de edad → anónimo forzado", !r3.error && (await admin.from("mentor_review").select("author_name").eq("id", r3.data).single()).data?.author_name === null, r3.error?.message);
  const rn = await avisos(m, "review_new");
  check("el mentor recibe aviso de reseña nueva (agrupado)", rn.length >= 1 && rn.some((a) => a.link === "/panel/resenas" && (a.payload.n ?? 1) >= 2), JSON.stringify(rn.map((a) => a.payload.n)));
  check("my_reviewable ya no lista lo reseñado", !((await s.sb.rpc("my_reviewable")).data ?? []).some((p) => p.ref === b1 || p.ref === t1));

  // 3. Lectura pública y privacidad.
  const pub = await anon.from("mentor_review_public").select("*").eq("mentor_id", m.id);
  check("anónimo ve las 3 reseñas publicadas", (pub.data ?? []).length === 3, pub.error?.message);
  check("la vista pública NO tiene student_id ni datos de denuncia",
    (pub.data ?? []).every((r) => !("student_id" in r) && !("report_reason" in r) && !("booking_id" in r)));
  check("anónimo NO lee la tabla mentor_review", ((await anon.from("mentor_review").select("id")).data ?? []).length === 0);
  check("otro alumno NO lee reseñas ajenas en la tabla", ((await s2.sb.from("mentor_review").select("id")).data ?? []).length === 0);
  const nota = (await anon.from("mentor_rating").select("reviews, rating").eq("mentor_id", m.id).single()).data;
  check("media = 4,0 con 3 reseñas", nota?.reviews === 3 && Number(nota.rating) === 4, JSON.stringify(nota));
  const upd = await s.sb.from("mentor_review").update({ rating: 1 }).eq("id", r1.data).select("id");
  check("el alumno NO edita su reseña desde el cliente", (upd.data ?? []).length === 0);

  // 4. Respuesta del mentor y denuncia.
  check("otro mentor no responde → notFound", failsWith(await admin.rpc("reply_review", { p_mentor: m2.id, p_review: r1.data, p_reply: "Hola" }), "notFound"));
  const rep = await admin.rpc("reply_review", { p_mentor: m.id, p_review: r1.data, p_reply: "¡Gracias, Lucía!" });
  check("el mentor responde", !rep.error, rep.error?.message);
  await admin.rpc("reply_review", { p_mentor: m.id, p_review: r1.data, p_reply: "¡Gracias, Lucía! Suerte en el examen." });
  const rr = await avisos(s, "review_reply");
  check("el alumno recibe UN aviso de respuesta (editar no re-avisa)", rr.length === 1 && rr[0].link === `/mentores/${m.id}#resenas`, `${rr.length}`);
  check("la respuesta editada sale en la vista pública",
    (await anon.from("mentor_review_public").select("reply").eq("id", r1.data).single()).data?.reply === "¡Gracias, Lucía! Suerte en el examen.");
  check("el mentor NO puede editar la reseña desde el cliente", ((await m.sb.from("mentor_review").update({ rating: 5 }).eq("id", r3.data).select("id")).data ?? []).length === 0);
  const den = await admin.rpc("report_review", { p_mentor: m.id, p_review: r3.data, p_reason: "No fue mi alumno" });
  check("el mentor denuncia una reseña (sigue publicada)", !den.error && (await anon.from("mentor_review_public").select("id").eq("id", r3.data)).data?.length === 1, den.error?.message);

  // 5. Moderación del admin (simulada con service role; la UI usa la RLS mr_admin_all).
  await admin.from("mentor_review").update({ status: "oculta" }).eq("id", r3.data);
  check("oculta → fuera de la vista pública", ((await anon.from("mentor_review_public").select("id").eq("id", r3.data)).data ?? []).length === 0);
  const nota2 = (await anon.from("mentor_rating").select("reviews, rating").eq("mentor_id", m.id).single()).data;
  check("la media se recalcula sin la oculta (2 reseñas, 4,5)", nota2?.reviews === 2 && Number(nota2.rating) === 4.5, JSON.stringify(nota2));

  // 6. Borrado por el alumno.
  check("otro alumno no borra la reseña → notFound", failsWith(await admin.rpc("delete_review", { p_student: s2.id, p_review: r2.data }), "notFound"));
  const del = await admin.rpc("delete_review", { p_student: s.id, p_review: r2.data });
  check("el alumno borra su reseña", !del.error && ((await admin.from("mentor_review").select("id").eq("id", r2.data)).data ?? []).length === 0, del.error?.message);

  // 7. Mentor no verificado → sus reseñas no salen.
  await admin.from("mentor_profile").update({ status: "pendiente", verified_at: null }).eq("profile_id", m.id);
  check("mentor no verificado → sin reseñas públicas", ((await anon.from("mentor_review_public").select("id").eq("mentor_id", m.id)).data ?? []).length === 0);

  // Limpieza.
  await admin.from("mentor_review").delete().in("mentor_id", [m.id, m2.id]);
  await admin.from("mentor_profile").update({ status: "pendiente", verified_at: null }).in("profile_id", [m.id, m2.id]);
}

main()
  .catch((e) => {
    console.error(e);
    ok = false;
  })
  .finally(() => {
    console.log(ok ? "\nRESEÑAS OK" : "\nHAY FALLOS");
    process.exit(ok ? 0 : 1);
  });
