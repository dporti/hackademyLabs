// Demo de la fase D con las cuentas de prueba: Marta (alumna) pide aviso de 0224 en
// inglés (Laura no habla inglés, así que no se cubre sola) y Laura (mentora) le ofrece
// su primer hueco libre de 1:1. Después:
//   - Marta → /panel/sesiones#ofertas (y la campana) para aceptar o rechazar.
//   - Laura → /panel/demanda para ver la alerta y su oferta pendiente.
// Re-ejecutable: reutiliza la alerta abierta y no duplica la oferta pendiente.
// Uso: node scripts/oferta-demo.mjs
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
const PASSWORD = "Tutor247Dev!";
const entrar = async (email) => {
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, opts);
  const { data, error } = await sb.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`${email}: ${error.message} (¿existe? node scripts/aula-demo.mjs)`);
  return { sb, id: data.user.id };
};

const marta = await entrar("test.visual.f7alumna@tutor247.dev");
const laura = await entrar("test.visual.f7mentora@tutor247.dev");

const alerta = await marta.sb.rpc("create_module_alert", { p_modulo_code: "0224", p_language: "en", p_fit: false });
if (alerta.error) throw new Error(`alerta: ${alerta.error.message}`);
const huecos = await laura.sb.rpc("mentor_slots", { p_mentor: laura.id, p_kind: "sesion_1a1", p_days: 14 });
const slot = huecos.data?.slots?.[0];
if (!slot) throw new Error("Laura no tiene huecos libres: publica franjas en /panel/agenda");
const oferta = await laura.sb.rpc("offer_slot", {
  p_alert: alerta.data,
  p_kind: "sesion_1a1",
  p_starts_local: `${slot}:00`,
  p_note: "Hola, puedo ayudarte con 0224. ¿Te va bien esta hora?",
});
if (oferta.error && !oferta.error.message.includes("alreadyOffered")) throw new Error(`oferta: ${oferta.error.message}`);
console.log(`Oferta de Laura a Marta para 0224 el ${slot.replace("T", " ")} (${oferta.error ? "ya existía" : "creada"}).
  Marta: /panel/sesiones#ofertas   Laura: /panel/demanda`);
// Sin signOut(): por defecto cierra TODAS las sesiones del usuario (también la del navegador).
