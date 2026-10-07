// Promueve a admin a un usuario YA registrado (el registro público nunca da admin).
// Usa service role: el trigger guard_profile_role lo permite porque no hay auth.uid().
// Uso: node scripts/make-admin.mjs persona@ejemplo.com
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Uso: node scripts/make-admin.mjs <email>");
  process.exitCode = 1;
} else {
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

  const { data, error } = await admin
    .from("profile")
    .update({ role: "admin" })
    .eq("email", email)
    .select("id, email, role");
  if (error) {
    console.error("✗", error.message);
    process.exitCode = 1;
  } else if (!data.length) {
    console.error(`✗ No hay ningún usuario con email ${email}. Regístrate primero en /registro.`);
    process.exitCode = 1;
  } else {
    console.log(`✓ ${data[0].email} ahora es admin.`);
  }
}
