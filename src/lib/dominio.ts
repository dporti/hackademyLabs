import type { RaStatus } from "@/lib/db-types";

// Mapa de Dominio de 4 niveles (DISENO.md §4). Sustituye al semáforo de 3 en la UI;
// los datos guardados siguen en RaStatus (verde/ámbar/rojo) y se traducen aquí.
export type NivelDominio = "aun_no" | "con_ayuda" | "casi" | "domino";

export const NIVELES: NivelDominio[] = ["aun_no", "con_ayuda", "casi", "domino"];

// Umbral de progreso a partir del cual un RA "en curso" se considera "casi".
const UMBRAL_CASI = 60;

// verde → Lo domino · rojo → Aún no · ámbar → Casi (≥ 60 %) o Con ayuda.
export function nivelDesdeEstado(status: RaStatus, progress?: number): NivelDominio {
  if (status === "verde") return "domino";
  if (status === "rojo") return "aun_no";
  return (progress ?? 0) >= UMBRAL_CASI ? "casi" : "con_ayuda";
}

// Color (token CSS) y forma de cada nivel: el estado nunca va solo por color.
export const NIVEL_META: Record<NivelDominio, { color: string; glyph: string }> = {
  aun_no: { color: "var(--nivel-aun-no)", glyph: "○" },
  con_ayuda: { color: "var(--nivel-con-ayuda)", glyph: "◔" },
  casi: { color: "var(--nivel-casi)", glyph: "◕" },
  domino: { color: "var(--nivel-domino)", glyph: "●" },
};
