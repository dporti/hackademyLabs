import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSessionUser, localePath } from "@/lib/auth";
import { getStudentDashboard } from "@/lib/student";
import { getPacks } from "@/lib/catalog";
import { BuyPackForm } from "@/components/panel/buy-pack-form";
import { LedgerTable } from "@/components/panel/ledger-table";

// Créditos del alumno (maqueta Creditos.html): saldo calculado, próxima caducidad,
// gasto del mes, recarga (compra MOCK de Fase 1) y movimientos del ledger.
// Referidos y facturas aún no existen: no se muestran.
export const instant = false;

const SESIONES = new Set(["sesion_1a1", "sesion_flash"]);
const TICKETS = new Set(["ticket_express", "ticket_normal"]);

export async function generateMetadata({ params }: PageProps<"/[locale]/panel/creditos">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "creditos" });
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function CreditosPage({ params }: PageProps<"/[locale]/panel/creditos">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getSessionUser();
  if (!session) redirect(localePath(locale, "/entrar"));
  if (session!.profile?.role !== "alumno") redirect(localePath(locale, "/panel"));

  const [dashboard, packs] = await Promise.all([getStudentDashboard(session!.user.id), getPacks()]);
  if (!dashboard.hasProfile) redirect(localePath(locale, "/panel"));

  const t = await getTranslations("creditos");
  const tp = await getTranslations("pricing");
  const tpanel = await getTranslations("panel");
  const { balance, ledger } = dashboard;
  const ahora = new Date();
  const fecha = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(iso));
  const eur = (n: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(n);

  // Próxima caducidad: la compra vigente que antes caduca (el ledger no reparte el
  // gasto entre compras, así que se informa del pack, no de un saldo exacto).
  const proxima = ledger
    .filter((m) => m.type === "compra_pack" && m.expires_at && new Date(m.expires_at) > ahora)
    .sort((a, b) => a.expires_at!.localeCompare(b.expires_at!))[0];

  // Gasto del mes en curso (movimientos negativos de tipo gasto).
  const delMes = ledger.filter((m) => {
    const d = new Date(m.created_at);
    return m.type === "gasto" && d.getFullYear() === ahora.getFullYear() && d.getMonth() === ahora.getMonth();
  });
  const gastado = -delMes.reduce((s, m) => s + m.amount, 0);
  const nTickets = delMes.filter((m) => m.product_kind && TICKETS.has(m.product_kind)).length;
  const nSesiones = delMes.filter((m) => m.product_kind && SESIONES.has(m.product_kind)).length;

  return (
    <div className="w-full space-y-12">
      <header>
        <h1 className="font-heading text-[32px] leading-tight font-bold tracking-tight sm:text-[40px]">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      </header>

      {/* ───────────────────────────── Resumen ───────────────────────────── */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="glow rounded-2xl border border-tint-primary-border bg-tint-primary p-6">
          <p className="font-mono text-xs tracking-[0.2em] text-label uppercase">{t("balance")}</p>
          <p className="mt-2 font-mono text-5xl font-semibold text-primary">
            {balance}
            <span className="ml-2 text-base font-normal text-muted-foreground">{t("balanceUnit")}</span>
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {proxima
              ? t("nextExpiry", {
                  pack: proxima.pack?.name ?? "pack",
                  n: proxima.amount,
                  date: fecha(proxima.expires_at!),
                })
              : t("noExpiry")}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-6">
          <p className="font-mono text-xs tracking-[0.2em] text-label uppercase">{t("month")}</p>
          {gastado > 0 ? (
            <>
              <p className="mt-2 font-mono text-3xl font-semibold">{t("monthSpent", { n: gastado })}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("monthDetail", {
                  tickets: nTickets,
                  sesiones: nSesiones,
                  sep: nTickets > 0 && nSesiones > 0 ? " · " : "",
                })}
              </p>
            </>
          ) : (
            <p className="mt-2 text-muted-foreground">{t("monthNone")}</p>
          )}
        </div>
      </section>

      {/* ───────────────────────────── Recargar ───────────────────────────── */}
      <section id="recargar" aria-labelledby="recargar-t" className="scroll-mt-24">
        <h2 id="recargar-t" className="font-heading text-2xl font-bold">
          {t("rechargeTitle")}
        </h2>
        <p className="mt-1 text-muted-foreground">{t("rechargeText")}</p>
        <p className="mt-2 text-sm text-warning">{tpanel("mockNotice")}</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          {packs.map((p) => {
            const featured = p.slug === "modulo";
            return (
              <div
                key={p.id}
                className={`flex flex-col rounded-2xl border p-5 ${
                  featured ? "glow border-tint-primary-border bg-tint-primary" : "bg-card"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-heading text-lg font-semibold">{p.name}</span>
                  {p.bonus_pct > 0 && (
                    <span className="rounded-md border border-tint-pass-border bg-tint-pass px-2 py-0.5 font-mono text-xs whitespace-nowrap text-accent-pass">
                      {tp("bonus", { pct: p.bonus_pct })}
                    </span>
                  )}
                </div>
                <p className="mt-3 font-mono text-xl font-semibold whitespace-nowrap text-primary">{tp("credits", { n: p.credits })}</p>
                <p className="text-sm text-muted-foreground">{eur(p.price_eur)}</p>
                <div className="mt-auto">
                  <BuyPackForm locale={locale} slug={p.slug} featured={featured} />
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-label">
          {tp("creditsNote")}{" "}
          <Link href="/cancelacion" className="text-primary underline-offset-4 hover:underline">
            {tp("cancelLink")}
          </Link>
        </p>
      </section>

      {/* ─────────────────────────── Movimientos ─────────────────────────── */}
      <section aria-labelledby="movimientos">
        <h2 id="movimientos" className="font-heading text-2xl font-bold">
          {t("historyTitle")}
        </h2>
        <div className="mt-5">
          <LedgerTable locale={locale} ledger={ledger} empty={t("historyEmpty")} />
        </div>
      </section>
    </div>
  );
}
