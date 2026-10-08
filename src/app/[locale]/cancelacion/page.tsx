import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { RaBadge } from "@/components/brand/ra-badge";

// Política de cancelación y devoluciones (estática). Describe EXACTAMENTE lo que
// aplican las RPC de supabase/migrations/20261008090100_tickets_bookings.sql y
// 20261008090200_cancel_policy.sql: si cambian los plazos allí, cambiar aquí.

export async function generateMetadata({ params }: PageProps<"/[locale]/cancelacion">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "cancelPolicy" });
  return { title: `${t("metaTitle")} · Tutor247`, description: t("metaDescription") };
}

// Casos por bloque. `refund` decide el distintivo (texto + forma + color).
const BLOQUES = [
  { id: "tickets", casos: [["t1", true], ["t2", true], ["t3", false]] },
  { id: "sesiones", casos: [["s1", true], ["s2", true], ["s3", false], ["s4", true], ["s5", true]] },
] as const;

export default async function CancelacionPage({ params }: PageProps<"/[locale]/cancelacion">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cancelPolicy");

  return (
    <main className="flex-1">
      <section className="hud-grid border-b border-border/60">
        <div className="mx-auto max-w-4xl px-4 py-14">
          <p className="font-mono text-xs text-primary">{t("eyebrow")}</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{t("subtitle")}</p>
          <p className="mt-4 font-mono text-xs text-muted-foreground">{t("updated")}</p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-14 px-4 py-14">
        {BLOQUES.map((b) => (
          <section key={b.id} aria-labelledby={b.id}>
            <h2 id={b.id} className="font-display text-2xl font-bold tracking-tight">
              {t(`${b.id}.title`)}
            </h2>
            <p className="mt-2 text-muted-foreground">{t(`${b.id}.intro`)}</p>
            <ul className="mt-6 divide-y rounded-xl border bg-card">
              {b.casos.map(([id, refund]) => (
                <li key={id} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                  <div>
                    <p className="font-medium">{t(`${b.id}.${id}.case`)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t(`${b.id}.${id}.detail`)}</p>
                  </div>
                  <span className="shrink-0">
                    <RaBadge
                      status={refund ? "verde" : "rojo"}
                      label={refund ? t("refundFull") : t("refundNone")}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section aria-labelledby="creditos">
          <h2 id="creditos" className="font-display text-2xl font-bold tracking-tight">
            {t("credits.title")}
          </h2>
          <ul className="mt-6 space-y-4">
            {(["c1", "c2", "c3", "c4"] as const).map((c) => (
              <li key={c} className="border-l-2 border-primary/50 pl-4">
                <p className="font-medium">{t(`credits.${c}.title`)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t(`credits.${c}.text`)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
          <p>{t("note")}</p>
          <p className="mt-3">
            <Link href="/precios" className="text-primary underline-offset-4 hover:underline">
              {t("toPricing")} →
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
