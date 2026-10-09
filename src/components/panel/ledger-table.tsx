import { getTranslations } from "next-intl/server";
import type { LedgerEntryConPack } from "@/lib/student";

// Movimientos del ledger de créditos (solo lectura: el ledger es inmutable).
export async function LedgerTable({
  locale,
  ledger,
  empty,
}: {
  locale: string;
  ledger: LedgerEntryConPack[];
  empty: string;
}) {
  const t = await getTranslations("panel");
  const tprod = await getTranslations("products");
  const fecha = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso));

  if (ledger.length === 0) return <p className="text-muted-foreground">{empty}</p>;
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="w-full min-w-[560px] text-left text-[15px]">
        <thead className="font-mono text-xs tracking-[0.15em] text-label uppercase">
          <tr className="border-b border-divider">
            <th scope="col" className="px-5 py-3 font-semibold">{t("colDate")}</th>
            <th scope="col" className="px-5 py-3 font-semibold">{t("colConcept")}</th>
            <th scope="col" className="px-5 py-3 font-semibold">{t("colExpires")}</th>
            <th scope="col" className="px-5 py-3 text-right font-semibold">{t("colAmount")}</th>
          </tr>
        </thead>
        <tbody>
          {ledger.map((m) => (
            <tr key={m.id} className="border-b border-divider last:border-0">
              <td className="px-5 py-3 font-mono text-xs whitespace-nowrap text-muted-foreground">
                {fecha(m.created_at)}
              </td>
              <td className="px-5 py-3">
                {t(`ledgerType.${m.type}`)}
                {m.pack && <span className="text-muted-foreground"> · {m.pack.name}</span>}
                {!m.pack && m.product_kind && (
                  <span className="text-muted-foreground"> · {tprod(`${m.product_kind}.name`)}</span>
                )}
              </td>
              <td className="px-5 py-3 font-mono text-xs whitespace-nowrap text-label">
                {m.expires_at ? fecha(m.expires_at) : "—"}
              </td>
              <td
                className={`px-5 py-3 text-right font-mono font-semibold whitespace-nowrap ${
                  m.amount >= 0 ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {m.amount >= 0 ? `+${m.amount}` : m.amount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
