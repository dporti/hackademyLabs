import type { ProductKind } from "@/lib/db-types";

// Productos que se pagan con créditos (1 crédito ≈ 1 €) y su coste orientativo.
// Fuente: docs/modelo-negocio-v1.md §5 ("En qué se gastan"). Los nombres y
// descripciones van por i18n (namespace `products`); aquí solo datos.
export interface ProductInfo {
  kind: ProductKind;
  min: number; // créditos
  max: number;
  // Destacado en la web (urgencia / estrella).
  highlight?: boolean;
}

export const PRODUCTS: ProductInfo[] = [
  { kind: "diagnostico", min: 0, max: 0 },
  { kind: "ticket_normal", min: 3, max: 4 },
  { kind: "ticket_express", min: 6, max: 8, highlight: true },
  { kind: "grupo_reducido", min: 8, max: 10 },
  { kind: "revision", min: 10, max: 15 },
  { kind: "sesion_flash", min: 12, max: 15 },
  { kind: "simulacro", min: 15, max: 20 },
  { kind: "sesion_1a1", min: 25, max: 35 },
  { kind: "defensa_proyecto", min: 30, max: 40 },
  { kind: "rescate_48h", min: 90, max: 120, highlight: true },
  { kind: "plan_modulo", min: 180, max: 300, highlight: true },
];

export const product = (kind: ProductKind) => PRODUCTS.find((p) => p.kind === kind)!;

// "25–35" o "Gratis" lo decide la UI; aquí el rango numérico.
export function creditRange(kind: ProductKind) {
  const p = product(kind);
  return p.min === p.max ? `${p.min}` : `${p.min}–${p.max}`;
}
