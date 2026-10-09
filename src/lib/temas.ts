// Temas de cada módulo en lenguaje directo (Java, SQL, DNS, subnetting…), desde el
// namespace i18n `temas` ("0485": "Java · Python · …"), y nombre corto de cada RA
// (`temasRa`). La web habla de lo que se trabaja; los códigos RA quedan en segundo plano.

interface Traductor {
  (key: string): string;
  has: (key: string) => boolean;
}

export function temasDe(t: Traductor, code: string): string[] {
  return t.has(code) ? t(code).split(" · ") : [];
}

// Nombre corto de un RA ("Bucles, condicionales y depuración"); null si no lo hay.
export function temaRa(t: Traductor, code: string, ra: string): string | null {
  const k = `${code}.${ra}`;
  return t.has(k) ? t(k) : null;
}

// ¿Coincide la búsqueda con algún tema del módulo? Sin mayúsculas ni tildes.
const normal = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function coincideTema(temas: string[], q: string) {
  const n = normal(q.trim());
  return n.length >= 2 && temas.some((x) => normal(x).includes(n));
}
