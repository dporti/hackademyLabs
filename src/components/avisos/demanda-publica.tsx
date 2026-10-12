import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getDemandaPublica } from "@/lib/catalog";

// Módulos con alumnos esperando mentor (fase C), para captar mentores. Solo cifras
// agregadas por módulo: nunca nombres ni datos de alumnos.
export async function DemandaPublica() {
  const [t, demanda] = await Promise.all([getTranslations("avisosInfo"), getDemandaPublica()]);
  if (demanda.length === 0) return <p className="text-sm text-muted-foreground">{t("demandEmpty")}</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {demanda.slice(0, 12).map((d) => (
        <li key={d.modulo_code}>
          <Link
            href={`/modulos/${d.modulo_code}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-tint-primary-border bg-tint-primary px-3 text-sm hover:border-primary"
          >
            <span className="font-mono font-semibold text-primary">{d.modulo_code}</span>
            <span className="max-w-48 truncate">{d.modulo_name}</span>
            <span className="font-mono text-xs text-label">{t("demandN", { n: d.waiting })}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
