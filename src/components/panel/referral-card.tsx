import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { localePath } from "@/lib/auth";
import { ReferralShare } from "@/components/panel/referral-share";

// «Invita a tu clase» (fase 8, maqueta Creditos.html): código propio, enlace para
// compartir y estado de los invitados (solo nombre de pila). 20 + 20 créditos cuando
// el invitado compra su primer pack; máximo 200 cr al trimestre.
export async function ReferralCard({ locale }: { locale: string }) {
  const t = await getTranslations("referidos");
  const sb = await createClient();
  const [{ data: code }, { data: lista }] = await Promise.all([sb.rpc("my_referral_code"), sb.rpc("my_referrals")]);
  if (!code) return null;
  const h = await headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;
  const url = `${origin.replace(/\/$/, "")}${localePath(locale, "/registro")}?ref=${code}`;
  const invitados = (lista ?? []) as { first_name: string; rewarded: boolean; created_at: string }[];

  return (
    <section
      aria-labelledby="referidos"
      data-accent="tutor"
      className="rounded-3xl border border-tint-secondary-border bg-tint-secondary p-5 sm:p-7"
    >
      <p className="font-mono text-xs font-semibold tracking-[0.2em] text-primary uppercase">{t("eyebrow")}</p>
      <h2 id="referidos" className="mt-2 font-heading text-2xl font-bold">
        {t("title")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("help")}</p>
      <div className="mt-5">
        <ReferralShare code={code as string} url={url} whatsappText={t("whatsappText", { url })} />
      </div>
      {invitados.length > 0 && (
        <ul className="mt-6 divide-y divide-divider rounded-2xl border bg-card">
          {invitados.map((r, i) => (
            <li key={i} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="font-medium">{r.first_name || t("someone")}</span>
              <span className={r.rewarded ? "font-mono font-semibold text-accent-pass" : "text-label"}>
                {r.rewarded ? t("rewarded") : t("pending")}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-label">{t("cap")}</p>
    </section>
  );
}
