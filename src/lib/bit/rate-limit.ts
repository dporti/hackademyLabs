// Límite de uso por clave (IP de Bit, formularios de contacto…) en memoria (ventana deslizante). Suficiente para el
// MVP en un solo servidor; en Vercel cada instancia lleva su cuenta, así que es un
// freno, no una garantía. Si el uso crece, mover a una tabla o a un KV.
const VENTANA_MS = 60 * 60 * 1000; // 1 hora
const MAX_MENSAJES = 30;
const usos = new Map<string, number[]>();

export function permitirMensaje(clave: string, max = MAX_MENSAJES, ahora = Date.now()): boolean {
  const recientes = (usos.get(clave) ?? []).filter((t) => ahora - t < VENTANA_MS);
  if (recientes.length >= max) {
    usos.set(clave, recientes);
    return false;
  }
  recientes.push(ahora);
  usos.set(clave, recientes);
  // Limpieza ocasional para que el mapa no crezca sin fin.
  if (usos.size > 5000) {
    for (const [k, v] of usos) if (v.every((t) => ahora - t >= VENTANA_MS)) usos.delete(k);
  }
  return true;
}
