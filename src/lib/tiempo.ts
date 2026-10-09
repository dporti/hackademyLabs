// Utilidades de tiempo para pintar en servidor (fuera de los componentes, que deben
// ser puros: la regla react-hooks/purity no permite Date.now() durante el render).

// Horas (redondeadas) desde ahora hasta una fecha ISO; negativo si ya pasó.
export function horasHasta(iso: string) {
  return Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000);
}
