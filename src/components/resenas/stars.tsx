import { Star } from "lucide-react";

// Estrellas de solo lectura. `label` = texto accesible («4,8 de 5»): la forma no basta.
export function Stars({ value, label, size = "sm" }: { value: number; label: string; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "size-5" : "size-3.5";
  const llenas = Math.round(value);
  return (
    <span role="img" aria-label={label} className="inline-flex items-center gap-0.5 text-primary">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} aria-hidden className={`${cls} ${i <= llenas ? "fill-current" : "text-[#3a3f5c]"}`} />
      ))}
    </span>
  );
}

// «4,8» en el idioma de la página.
export const formatoNota = (n: number, locale: string) =>
  new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);

// Nota para la tarjeta de mentor: solo con reseñas suficientes (MIN_RESENAS_MEDIA).
export function notaTarjeta(
  v: { reviews: number; rating: number } | undefined,
  locale: string,
  min: number,
  t: (k: "count" | "averageAria", vals: Record<string, string | number>) => string,
) {
  if (!v || v.reviews < min) return undefined;
  const n = formatoNota(v.rating, locale);
  return { value: v.rating, text: `${n} · ${t("count", { n: v.reviews })}`, label: t("averageAria", { n }) };
}
