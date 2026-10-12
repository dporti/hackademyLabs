// Lista compacta de próximos huecos libres ('AAAA-MM-DDTHH:MI', hora de Madrid).
// Se usa en la agenda del mentor (vista previa) y en su ficha pública.
export function NextSlots({ locale, slots, empty }: { locale: string; slots: string[]; empty: string }) {
  if (slots.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  const fmt = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
  return (
    <ul className="flex flex-wrap gap-2">
      {slots.map((s) => (
        <li
          key={s}
          className="rounded-[10px] border border-tint-primary-border bg-tint-primary px-3 py-1.5 font-mono text-sm text-primary first-letter:uppercase"
        >
          {/* La hora ya es local de Madrid: se formatea como UTC para no desplazarla. */}
          {fmt.format(new Date(`${s}:00Z`))}
        </li>
      ))}
    </ul>
  );
}
