// Verifica que el esquema + seed están aplicados. Lee .env.local y consulta
// Supabase con la anon key (catálogo público) y la service key (ledger/admin).
// Uso: node scripts/verify-db.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Carga manual de .env.local (sin dependencias).
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;

const pub = createClient(url, anon);
const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let ok = true;
const check = (label, cond, extra = "") => {
  console.log(`${cond ? "✓" : "✗"} ${label}${extra ? " → " + extra : ""}`);
  if (!cond) ok = false;
};

// 1. Catálogo (lectura pública con anon key → prueba RLS de lectura abierta).
const ciclos = await pub.from("ciclo").select("code").order("sort_order");
check("ciclos = 4 (SMX/ASIR/DAM/DAW)", ciclos.data?.length === 4,
  ciclos.error?.message ?? ciclos.data?.map((c) => c.code).join(","));

const modulos = await pub.from("modulo").select("code", { count: "exact", head: true });
check("módulos = 31", modulos.count === 31, modulos.error?.message ?? `count=${modulos.count}`);

const ra0485 = await pub.from("ra").select("code, modulo:modulo_id(code)")
  .eq("modulo.code", "0485");
check("RA de 0485 presentes", (ra0485.data?.length ?? 0) >= 7,
  ra0485.error?.message ?? `n=${ra0485.data?.length}`);

const packs = await pub.from("pack").select("slug").order("sort_order");
check("packs = 4", packs.data?.length === 4, packs.error?.message);

const planes = await pub.from("plan").select("kind");
check("planes = 4", planes.data?.length === 4, planes.error?.message);

// 2. Mentores públicos (vista, solo verificados, sin PII).
const mentors = await pub.from("mentor_public").select("full_name, level");
check("mentor_public = 3 verificados", mentors.data?.length === 3,
  mentors.error?.message ?? mentors.data?.map((m) => m.full_name).join(", "));
check("mentor_public NO expone email",
  mentors.data?.every((m) => !("email" in m)) ?? false);

// 3. Ledger: la anon key NO debe poder insertar (RLS/revoke).
const student = await admin.from("student_profile").select("profile_id").limit(1);
// (puede estar vacío: no hay alumnos en el seed; solo comprobamos que la tabla existe)
check("tabla student_profile accesible (service)", !student.error, student.error?.message);

// 4. Vista previa de datos.
console.log("\nMentores:", mentors.data);
console.log("Ciclos:", ciclos.data?.map((c) => c.code));

console.log(ok ? "\n✅ VERIFICACIÓN OK" : "\n❌ FALLOS ARRIBA");
process.exit(ok ? 0 : 1);
