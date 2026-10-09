import { Link } from "@/i18n/navigation";

// «¿Cuál es el mío?»: Aprueba tu módulo (cian) frente a Tutor247 (magenta).
// Tabla real (th scope) para lectores de pantalla; en móvil se desplaza en horizontal.
export function ComparisonTable({
  caption,
  heads,
  rows,
  ctas,
}: {
  caption: string;
  heads: { aprueba: string; tutor: string };
  rows: { k: string; a: string; t: string }[];
  ctas: { aprueba: { href: string; label: string }; tutor: { href: string; label: string } };
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="w-full min-w-[640px] border-collapse text-left text-[15px]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-divider">
            <td className="w-[22%] p-4" />
            <th scope="col" className="p-4 font-mono text-sm font-semibold tracking-[0.15em] text-primary uppercase">
              {heads.aprueba}
            </th>
            <th
              scope="col"
              data-accent="tutor"
              className="p-4 font-mono text-sm font-semibold tracking-[0.15em] text-primary uppercase"
            >
              {heads.tutor}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.k} className="border-b border-divider align-top">
              <th scope="row" className="p-4 text-sm font-medium text-label">
                {r.k}
              </th>
              <td className="p-4">{r.a}</td>
              <td className="p-4">{r.t}</td>
            </tr>
          ))}
          <tr>
            <td className="p-4" />
            <td className="p-4">
              <Link
                href={ctas.aprueba.href}
                className="inline-flex min-h-11 items-center rounded-[10px] bg-primary px-4 font-bold text-primary-foreground hover:bg-primary/85"
              >
                {ctas.aprueba.label}
              </Link>
            </td>
            <td className="p-4" data-accent="tutor">
              <Link
                href={ctas.tutor.href}
                className="inline-flex min-h-11 items-center rounded-[10px] bg-primary px-4 font-bold text-primary-foreground hover:bg-primary/85"
              >
                {ctas.tutor.label}
              </Link>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
