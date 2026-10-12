// Reseñas de EJEMPLO para ver la función en local. NO son reales: borrarlas antes de
// abrir al público (CLAUDE.md: sin testimonios inventados) con:
//   node scripts/resenas-demo.mjs --borrar
// Crea alumnos de demo (test.demo.resenaN@tutor247.dev) con sesiones «hechas» y sus reseñas:
//   - Laura Gómez (seed): 5 reseñas → media visible, una con respuesta.
//   - Marc Soler (seed): 3 reseñas → media visible, una anónima y una con respuesta.
//   - Laura Visual (test.visual.f7mentora): 2 reseñas → sin media (mínimo 3), una denunciada
//     (aparece en el panel de admin).
//   - Marta (test.visual.f7alumna): una sesión hecha con Laura Visual SIN reseñar, para
//     probar el formulario en /panel/sesiones#resenas.
// Re-ejecutable: borra lo de la demo anterior y lo vuelve a crear.
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
const opts = { auth: { autoRefreshToken: false, persistSession: false } };
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, opts);
const NOTA = "demo-resenas"; // marca de las reservas de la demo
const PASSWORD = "Tutor247Dev!";

const LAURA = "11111111-1111-1111-1111-111111111111";
const MARC = "22222222-2222-2222-2222-222222222222";

const ALUMNOS = [
  { n: 1, name: "Lucía Fernández" },
  { n: 2, name: "Álex Martín" },
  { n: 3, name: "Paula Ruiz" },
  { n: 4, name: "Jordi Vidal" },
  { n: 5, name: "Irene Castro" },
  { n: 6, name: "Hugo Navarro" },
];

// [alumno, mentor, módulo, días atrás, estrellas, comentario, anónimo, respuesta del mentor]
const RESENAS = [
  [1, LAURA, "0485", 40, 5, "Llegué al examen de Programación sin entender la recursividad y en dos sesiones lo vi claro. Explica con ejemplos y te deja escribir el código a ti.", false, "¡Gracias, Lucía! Lo difícil lo hiciste tú. Mucha suerte en la recuperación."],
  [2, LAURA, "0484", 25, 5, "Muy clara con SQL y normalización. Me preparó ejercicios parecidos a los del examen.", false, null],
  [3, LAURA, "0485", 18, 4, "Buena sesión, aunque se nos quedó corta la hora. Repetiré.", false, null],
  [4, LAURA, "0486", 9, 5, "Por fin entiendo XML y XPath. Paciencia infinita.", false, null],
  [5, LAURA, "0485", 3, 4, null, false, null],
  [1, MARC, "0373", 30, 4, "Me ayudó a ordenar el temario de Lenguajes de marcas y a priorizar lo que más cae.", false, null],
  [2, MARC, "0612", 14, 5, "Resolvió en un ticket una duda de JavaScript que llevaba días atascada.", true, "Me alegro de que te sirviera. Si vuelve a pasar, mira primero la consola del navegador."],
  [6, MARC, "0613", 6, 4, "Bien explicado. Me habría gustado algún ejercicio más para practicar.", false, null],
  [3, "VISUAL", "0485", 12, 5, "Sesión muy útil antes del parcial.", false, null],
  [4, "VISUAL", "0224", 5, 2, "No llegamos a ver lo que le pedí.", false, null],
];

async function userId(email) {
  const { data } = await admin.from("profile").select("id").eq("email", email).maybeSingle();
  return data?.id ?? null;
}

async function borrar() {
  const ids = (await Promise.all(ALUMNOS.map((a) => userId(`test.demo.resena${a.n}@tutor247.dev`)))).filter(Boolean);
  const { data: bks } = await admin.from("booking").select("id").eq("note", NOTA);
  const bookingIds = (bks ?? []).map((b) => b.id);
  if (bookingIds.length) await admin.from("mentor_review").delete().in("booking_id", bookingIds);
  if (ids.length) await admin.from("mentor_review").delete().in("student_id", ids);
  if (bookingIds.length) await admin.from("booking").delete().in("id", bookingIds);
  for (const id of ids) await admin.auth.admin.deleteUser(id);
  return { alumnos: ids.length, reservas: bookingIds.length };
}

async function alumno(a) {
  const email = `test.demo.resena${a.n}@tutor247.dev`;
  const { data, error } = await admin.auth.admin.createUser({
    email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: a.name, role: "alumno" },
  });
  if (error) throw new Error(`${email}: ${error.message}`);
  await admin.from("student_profile").upsert({ profile_id: data.user.id, birthdate: "2001-03-15" }, { onConflict: "profile_id" });
  return data.user.id;
}

async function sesionHecha(student, mentor, code, dias) {
  const { data: mod } = await admin.from("modulo").select("id").eq("code", code).single();
  const at = new Date(Date.now() - dias * 86_400_000);
  at.setUTCHours(16, 0, 0, 0);
  const fin = new Date(at.getTime() + 60 * 60_000);
  const { data, error } = await admin
    .from("booking")
    .insert({ student_id: student, mentor_id: mentor, modulo_id: mod.id, product_kind: "sesion_1a1", starts_at: at.toISOString(), ends_at: fin.toISOString(), status: "confirmada", credits: 0, note: NOTA })
    .select("id")
    .single();
  if (error) throw new Error(`booking: ${error.message}`);
  await admin.from("booking").update({ status: "hecha" }).eq("id", data.id);
  return { id: data.id, at: fin.toISOString() };
}

const previo = await borrar();
if (process.argv.includes("--borrar")) {
  console.log(`Demo borrada: ${previo.alumnos} alumnos y ${previo.reservas} reservas (con sus reseñas).`);
  process.exit(0);
}

const visual = await userId("test.visual.f7mentora@tutor247.dev");
const marta = await userId("test.visual.f7alumna@tutor247.dev");
if (!visual || !marta) throw new Error("Faltan las cuentas test.visual.*: ejecuta antes node scripts/aula-demo.mjs");

const ids = {};
for (const a of ALUMNOS) ids[a.n] = await alumno(a);

let creadas = 0;
for (const [n, mentorRaw, code, dias, rating, comment, anonymous, reply] of RESENAS) {
  const mentor = mentorRaw === "VISUAL" ? visual : mentorRaw;
  const s = await sesionHecha(ids[n], mentor, code, dias);
  const r = await admin.rpc("create_review", {
    p_student: ids[n], p_booking: s.id, p_ticket: null, p_rating: rating, p_comment: comment, p_anonymous: anonymous,
  });
  if (r.error) throw new Error(`reseña: ${r.error.message}`);
  // Fecha de la reseña = día de la sesión (para que la lista no salga toda de hoy).
  await admin.from("mentor_review").update({ created_at: s.at }).eq("id", r.data);
  if (reply) await admin.rpc("reply_review", { p_mentor: mentor, p_review: r.data, p_reply: reply });
  if (rating <= 2) await admin.rpc("report_review", { p_mentor: mentor, p_review: r.data, p_reason: "Ejemplo de denuncia (demo)" });
  creadas++;
}

// Marta: una sesión hecha con Laura Visual pendiente de reseñar.
await sesionHecha(marta, visual, "0485", 1);

console.log(`✓ ${creadas} reseñas de ejemplo creadas.`);
console.log("  - /mentores/11111111-1111-1111-1111-111111111111 (Laura Gómez: 5, con media)");
console.log("  - /mentores/22222222-2222-2222-2222-222222222222 (Marc Soler: 3, con media)");
console.log(`  - /mentores/${visual} (Laura Visual: 2, sin media; una denunciada → panel de admin)`);
console.log("  - Marta → /panel/sesiones#resenas para valorar su sesión con Laura Visual");
console.log("  Borrar antes de abrir al público: node scripts/resenas-demo.mjs --borrar");
