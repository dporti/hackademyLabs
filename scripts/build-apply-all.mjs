// Regenera supabase/apply_all.sql = preámbulo de limpieza + migraciones (en orden) + seed.
// Uso: node scripts/build-apply-all.mjs
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const dir = new URL("../supabase/", import.meta.url);
const migraciones = readdirSync(new URL("migrations/", dir))
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => `migrations/${f}`);
const partes = ["_reset_preamble.sql", ...migraciones, "seed.sql"];

let out =
  "-- Tutor247 — aplicar todo (RE-EJECUTABLE: limpia y recrea). Pegar en SQL Editor.\n\n";
for (const p of partes) {
  const sql = readFileSync(new URL(p, dir), "utf8").replace(/\r\n/g, "\n").trimEnd();
  out += `-- ========================= ${p} =========================\n${sql}\n\n\n`;
}
writeFileSync(new URL("apply_all.sql", dir), out.trimEnd() + "\n");
console.log(`apply_all.sql regenerado (${partes.length} partes)`);
