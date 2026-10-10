// Crea (o reutiliza) una alumna y una mentora de prueba y una sesión 1:1 confirmada que
// empieza AHORA y dura 60 min, para probar el aula integrada con dos navegadores.
// Sin cobro (inserta la reserva con service role). Re-ejecutable: cada vez crea una
// sesión nueva. Los usuarios @tutor247.dev los limpia apply_all.sql.
// Uso: node scripts/aula-demo.mjs
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
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const PASSWORD = "Tutor247Dev!";
const ALUMNA = "test.visual.f7alumna@tutor247.dev";
const MENTORA = "test.visual.f7mentora@tutor247.dev";

async function usuario(email, name, role) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const ex = data.users.find((u) => u.email === email);
  if (ex) return ex.id;
  const { data: nuevo, error } = await admin.auth.admin.createUser({
    email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: name, role },
  });
  if (error) throw error;
  return nuevo.user.id;
}

const alumna = await usuario(ALUMNA, "Marta Visual", "alumno");
const mentora = await usuario(MENTORA, "Laura Visual", "mentor");
const { data: mod } = await admin.from("modulo").select("id").eq("code", "0485").single();
await admin.from("student_profile").upsert({ profile_id: alumna });
await admin.from("student_modulo").upsert({ student_id: alumna, modulo_id: mod.id }, { onConflict: "student_id,modulo_id", ignoreDuplicates: true });
await admin.from("mentor_profile").upsert({ profile_id: mentora, status: "verificado", verified_at: new Date().toISOString(), headline: "Mentora 0485" });
await admin.from("mentor_modulo").upsert({ mentor_id: mentora, modulo_id: mod.id }, { ignoreDuplicates: true });

const ahora = Date.now();
const { data: b, error } = await admin
  .from("booking")
  .insert({
    student_id: alumna,
    mentor_id: mentora,
    modulo_id: mod.id,
    product_kind: "sesion_1a1",
    status: "confirmada",
    credits: 0,
    note: "Sesión de prueba del aula",
    starts_at: new Date(ahora - 60_000).toISOString(),
    ends_at: new Date(ahora + 60 * 60_000).toISOString(),
    meeting_url: `https://meet.jit.si/Tutor247-demo-${crypto.randomUUID().replace(/-/g, "")}`,
  })
  .select("id")
  .single();
if (error) throw error;

const base = env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
console.log(`Sesión creada (abierta hasta dentro de 90 min).
  Alumna:  ${ALUMNA}
  Mentora: ${MENTORA}
  Contraseña: la de los usuarios de prueba (scripts/verify-*.mjs)
  Aula: ${base}/panel/aula/${b.id}`);
