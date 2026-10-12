import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSessionUser, localePath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { OfferForm } from "@/components/avisos/offer-form";
import { withdrawOfferAction } from "@/app/actions/avisos";

// «Demanda en tus módulos» (fase C): alumnos esperando mentor en los módulos que
// imparte. Perfil ANÓNIMO (fecha de examen, franjas, si encaja con su agenda): nunca
// nombre ni contacto. El mentor puede ofrecerles un hueco de su agenda (fase D).
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/panel/demanda">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "demanda" });
  return { title: t("title"), robots: { index: false } };
}

interface Perfil {
  ref: string;
  exam: string | null;
  since: string;
  fit_only: boolean;
  fits: boolean;
  franjas: { d: number; p: "manana" | "tarde" | "noche" }[];
}
interface Fila {
  modulo_code: string;
  modulo_name: string;
  waiting: number;
  fits: number;
  profiles: Perfil[];
}

export default async function DemandaPage({ params }: PageProps<"/[locale]/panel/demanda">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getSessionUser();
  if (!session) redirect(localePath(locale, "/entrar"));
  if (session!.profile?.role !== "mentor") redirect(localePath(locale, "/panel"));

  const t = await getTranslations("demanda");
  const ta = await getTranslations("agenda");
  const sb = await createClient();
  const [{ data }, { count }, { data: ofertasRaw }] = await Promise.all([
    sb.rpc("my_module_demand"),
    sb.from("availability").select("id", { count: "exact", head: true }),
    sb
      .from("slot_offer")
      .select("id, alert_id, status, starts_at, expires_at")
      .eq("mentor_id", session!.user.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  // Última oferta del mentor por alerta (una pendiente caducada cuenta como caducada).
  const ofertas = new Map<string, { id: string; status: string; starts_at: string; caducada: boolean }>();
  const ahora = new Date().toISOString();
  for (const o of ofertasRaw ?? []) {
    if (!ofertas.has(o.alert_id)) ofertas.set(o.alert_id, { ...o, caducada: o.status === "pendiente" && o.expires_at <= ahora });
  }
  const fmt = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
  const filas = (data ?? []) as Fila[];
  const total = filas.reduce((s, f) => s + f.waiting, 0);
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
  const dias = (d: string) => Math.round((Date.parse(`${d}T00:00:00Z`) - Date.parse(`${hoy}T00:00:00Z`)) / 86_400_000);
  const franjas = (p: Perfil) => {
    const porDia = new Map<number, string[]>();
    for (const f of [...p.franjas].sort((a, b) => a.d - b.d)) porDia.set(f.d, [...(porDia.get(f.d) ?? []), t(`part.${f.p}`)]);
    return [...porDia].map(([d, ps]) => `${ta(`wd.${d}`)} ${ps.join("/")}`).join(" · ");
  };

  return (
    <div className="w-full space-y-10">
      <header>
        <h1 className="font-heading text-[32px] leading-tight font-bold tracking-tight sm:text-[40px]">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("subtitle")}</p>
        <p className="mt-3 font-mono text-sm text-label">{t("total", { n: total })}</p>
        {(count ?? 0) === 0 && (
          <p className="mt-3 text-sm">
            {t("noAgenda")}{" "}
            <Link href="/panel/agenda" className="font-semibold text-primary hover:underline">
              {t("noAgendaLink")} →
            </Link>
          </p>
        )}
      </header>

      {filas.length === 0 ? (
        <p className="text-muted-foreground">{t("noModules")}</p>
      ) : (
        <div className="space-y-6">
          {filas.map((f) => (
            <section key={f.modulo_code} aria-labelledby={`m-${f.modulo_code}`} className="rounded-3xl border bg-card p-5 sm:p-7">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id={`m-${f.modulo_code}`} className="font-heading text-xl font-bold">
                  <span className="font-mono text-primary">{f.modulo_code}</span> · {f.modulo_name}
                </h2>
                <p className="font-mono text-sm text-label">
                  {t("waiting", { n: f.waiting })}
                  {f.waiting > 0 && ` · ${t("fitsN", { n: f.fits })}`}
                </p>
              </div>
              {f.waiting === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">{t("nobody")}</p>
              ) : (
                <ul className="mt-4 grid gap-3 md:grid-cols-2">
                  {f.profiles.map((p, i) => (
                    <li key={i} className="rounded-2xl border bg-background p-4 text-sm">
                      <p className="font-semibold">
                        {t("anon")}
                        {p.exam && dias(p.exam) >= 0 && ` · ${t("examIn", { n: dias(p.exam) })}`}
                      </p>
                      <p className="mt-1 text-muted-foreground">{p.franjas.length ? franjas(p) : t("noFranjas")}</p>
                      <p className={`mt-1 ${p.fits ? "text-accent-pass" : "text-label"}`}>
                        {p.fits ? t("fits") : p.fit_only ? t("needsFit") : t("noFit")}
                      </p>
                      {(() => {
                        const o = ofertas.get(p.ref);
                        if (o && o.status === "pendiente" && !o.caducada) {
                          return (
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-tint-primary-border bg-tint-primary px-3 py-2">
                              <span className="first-letter:uppercase">{t("offered", { when: fmt.format(new Date(o.starts_at)) })}</span>
                              <form action={withdrawOfferAction}>
                                <input type="hidden" name="offer" value={o.id} />
                                <button type="submit" className="min-h-10 text-sm text-label hover:text-foreground">
                                  {t("withdraw")}
                                </button>
                              </form>
                            </div>
                          );
                        }
                        return (
                          <>
                            {o && o.status === "rechazada" && <p className="mt-2 text-xs text-label">{t("declinedBefore")}</p>}
                            {o?.caducada && <p className="mt-2 text-xs text-label">{t("expiredBefore")}</p>}
                            <OfferForm locale={locale} alertId={p.ref} mentorId={session!.user.id} />
                          </>
                        );
                      })()}
                    </li>
                  ))}
                  {f.waiting > f.profiles.length && (
                    <li className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                      {t("byEmail", { n: f.waiting - f.profiles.length })}
                    </li>
                  )}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
      <p className="text-xs text-label">{t("privacy")}</p>
    </div>
  );
}
