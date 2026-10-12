import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { iniciales } from "@/components/brand/mentor-card";
import type { MentorLevel } from "@/lib/db-types";

// «Mentores para ti» (fase B): por cada módulo que prepara el alumno, los mentores que
// mejor encajan según match_mentors (horas en común con su disponibilidad, primer hueco
// que le cuadra, idioma, saldo). Solo datos públicos del mentor.

interface Match {
  mentor_id: string;
  full_name: string | null;
  level: MentorLevel;
  headline: string | null;
  overlap_min: number;
  next_slot: string | null;
  next_fit: string | null;
  price: number | null;
  same_lang: boolean;
  score: number;
}

export async function MentoresParaTi({
  locale,
  modulos,
}: {
  locale: string;
  modulos: { code: string; name: string }[];
}) {
  if (modulos.length === 0) return null;
  const t = await getTranslations("match");
  const tm = await getTranslations("mentorPanel");
  const sb = await createClient();
  const [{ count }, ...resultados] = await Promise.all([
    sb.from("availability").select("id", { count: "exact", head: true }),
    ...modulos.slice(0, 4).map((m) => sb.rpc("match_mentors", { p_modulo_code: m.code, p_limit: 3 })),
  ]);
  const tieneFranjas = (count ?? 0) > 0;
  // Las horas ya son locales de Madrid: se formatean como UTC para no desplazarlas.
  const fmt = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
  const cuando = (s: string) => fmt.format(new Date(`${s}:00Z`));

  return (
    <section id="mentores" aria-labelledby="mentores-t" className="scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="mentores-t" className="font-heading text-2xl font-bold">
          {t("title")}
        </h2>
        <Link href="/panel/agenda" className="text-sm font-semibold text-primary hover:underline">
          {tieneFranjas ? t("editAvailability") : t("setAvailability")} →
        </Link>
      </div>
      {!tieneFranjas && <p className="mt-2 text-sm text-muted-foreground">{t("noAvailability")}</p>}

      <div className="mt-5 space-y-6">
        {modulos.slice(0, 4).map((m, i) => {
          const lista = ((resultados[i]?.data ?? []) as Match[]).filter(Boolean);
          return (
            <div key={m.code}>
              <p className="font-mono text-xs tracking-[0.15em] text-label uppercase">
                <span className="text-primary">{m.code}</span> · {m.name}
              </p>
              {lista.length === 0 ? (
                <p className="mt-2 rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">{t("none")}</p>
              ) : (
                <ul className="mt-2 grid gap-3 md:grid-cols-3">
                  {lista.map((x) => (
                    <li key={x.mentor_id} className="flex flex-col rounded-2xl border bg-card p-4">
                      <div className="flex items-start gap-3">
                        <span
                          aria-hidden
                          className="grid size-10 shrink-0 place-items-center rounded-xl border border-tint-primary-border bg-tint-primary font-heading font-bold text-primary"
                        >
                          {iniciales(x.full_name ?? "")}
                        </span>
                        <span className="min-w-0">
                          <Link href={`/mentores/${x.mentor_id}`} className="block font-semibold hover:text-primary hover:underline">
                            {x.full_name}
                          </Link>
                          <span className="block font-mono text-xs text-label">{tm(`level.${x.level}`)}</span>
                        </span>
                      </div>
                      <ul className="mt-3 space-y-1 text-sm">
                        {tieneFranjas && (
                          <li className={x.overlap_min > 0 ? "text-accent-pass" : "text-muted-foreground"}>
                            {x.overlap_min > 0 ? t("overlap", { h: Math.round((x.overlap_min / 60) * 10) / 10 }) : t("noOverlap")}
                          </li>
                        )}
                        <li className="text-muted-foreground first-letter:uppercase">
                          {x.next_fit
                            ? t("nextFit", { when: cuando(x.next_fit) })
                            : x.next_slot
                              ? t("nextSlot", { when: cuando(x.next_slot) })
                              : t("proposeTime")}
                        </li>
                        {x.same_lang && <li className="text-muted-foreground">{t("sameLang")}</li>}
                      </ul>
                      <div className="mt-auto pt-4">
                        <Link
                          href={`/panel/sesiones?mentor=${x.mentor_id}&modulo=${m.code}`}
                          className="inline-flex min-h-10 w-full items-center justify-center rounded-[10px] bg-primary px-3 text-sm font-bold text-primary-foreground hover:bg-primary/85"
                        >
                          {x.price != null ? t("bookN", { n: x.price }) : t("book")}
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
