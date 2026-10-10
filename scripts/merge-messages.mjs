// Fusiona claves nuevas de i18n en messages/{es,ca}.json (merge profundo; las claves
// existentes se sobrescriben). Uso: node scripts/merge-messages.mjs nuevas.es.json nuevas.ca.json
import { readFileSync, writeFileSync } from "node:fs";

const merge = (a, b) => {
  for (const [k, v] of Object.entries(b))
    a[k] = v && typeof v === "object" && !Array.isArray(v) && a[k] && typeof a[k] === "object" ? merge(a[k], v) : v;
  return a;
};
const [es, ca] = process.argv.slice(2);
for (const [loc, file] of [["es", es], ["ca", ca]]) {
  const path = new URL(`../messages/${loc}.json`, import.meta.url);
  const base = JSON.parse(readFileSync(path, "utf8"));
  writeFileSync(path, JSON.stringify(merge(base, JSON.parse(readFileSync(file, "utf8"))), null, 2) + "\n");
}
console.log("messages actualizados");
