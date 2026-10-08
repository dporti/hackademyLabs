// Anti-bypass (docs/modelo-negocio-v1.md §7): pago y comunicación siempre dentro de
// la plataforma. Antes de guardar un mensaje se ocultan emails, teléfonos y enlaces a
// mensajería externa. Es un filtro de buena fe, no infalible: se complementa con la
// cláusula de no captación del contrato del mentor.

export const CONTACT_MASK = "[contacto oculto]";

const PATRONES: RegExp[] = [
  // Emails (también "nombre @ dominio . com" con espacios).
  /[\w.+-]+\s*@\s*[\w-]+(\s*\.\s*[\w-]+)+/gi,
  // Enlaces a mensajería y redes donde se cierra el trato fuera.
  /\b(https?:\/\/)?(www\.)?(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com|t\.me|telegram\.me|instagram\.com|discord\.gg|discord\.com\/users)\/\S*/gi,
  // Teléfonos españoles (9 dígitos que empiezan por 6/7/8/9, con espacios, puntos o
  // guiones y prefijo opcional +34/0034). Acotado para no tocar números de código.
  /(?<![\w.])(?:(?:\+|00)\s?34[\s.-]?)?[6789](?:[\s.-]?\d){8}(?![\w.])/g,
];

export function redactContact(text: string): { text: string; redacted: boolean } {
  let out = text;
  for (const re of PATRONES) out = out.replace(re, CONTACT_MASK);
  return { text: out, redacted: out !== text };
}
