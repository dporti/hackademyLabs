import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSessionUser, localePath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";

// «Demanda en tus módulos» (fase C): alumnos esperando mentor en los módulos que
// imparte. Perfil ANÓNIMO (fecha de examen, franjas, si encaja con su agenda): nunca
// nombre ni contacto. Ofrecerles un hueco directamente llega en la fase D.
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/panel/demanda">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "demanda" });
  return { title: t("title"), robots: { index: false } };
}

interface Perfil {
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
  const [{ data }, { count }] = await Promise.all([
    sb.rpc("my_module_demand"),
    sb.from("availability").select("id", { count: "exact", head: true }),
  ]);
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
