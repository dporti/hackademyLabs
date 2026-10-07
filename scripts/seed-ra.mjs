// Carga (o actualiza) los RA de supabase/data/ra-killer.json en la BD con service
// role. Idempotente: upsert por (modulo_id, code). Los mismos datos están en
// seed.sql para instalaciones nuevas.
// Uso: node scripts/seed-ra.mjs
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

const { ra } = JSON.parse(
  readFileSync(new URL("../supabase/data/ra-killer.json", import.meta.url), "utf8"),
);
const codes = [...new Set(ra.map(([c]) => c))];
const { data: mods, error } = await admin.from("modulo").select("id, code").in("code", codes);
if (error) throw error;
const idPorCodigo = Object.fromEntries(mods.map((m) => [m.code, m.id]));

const filas = ra.map(([modulo, code, description]) => ({
  modulo_id: idPorCodigo[modulo],
  code,
  description,
  sort_order: Number(code.slice(2)),
}));
const { error: upErr } = await admin.from("ra").upsert(filas, { onConflict: "modulo_id,code" });
if (upErr) {
  console.error("✗", upErr.message);
  process.exitCode = 1;
} else {
  console.log(`✓ ${filas.length} RA cargados (${codes.join(", ")})`);
}
