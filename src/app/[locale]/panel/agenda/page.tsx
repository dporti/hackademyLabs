import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSessionUser, localePath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteOffAction, deleteSlotAction } from "@/app/actions/agenda";
import { OffForm, SlotForm } from "@/components/agenda/agenda-forms";
import { NextSlots } from "@/components/agenda/next-slots";
import { Link } from "@/i18n/navigation";

// Agenda del mentor (fase A): franjas semanales recurrentes (hora de Madrid) y días
// bloqueados; los alumnos solo pueden reservar dentro de ellas. Para el alumno (fase B)
// es «Mi disponibilidad»: sus franjas preferidas, que sirven para emparejarle con mentores.
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/panel/agenda">) {
  const { locale } = await params;
  const [t, session] = await Promise.all([getTranslations({ locale, namespace: "agenda" }), getSessionUser()]);
  return { title: session?.profile?.role === "alumno" ? t("studentTitle") : t("title"), robots: { index: false } };
}

const hhmm = (t: string) => t.slice(0, 5);

export default async function AgendaPage({ params }: PageProps<"/[locale]/panel/agenda">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getSessionUser();
  if (!session) redirect(localePath(locale, "/entrar"));
  const role = session!.profile?.role;
  if (role !== "mentor" && role !== "alumno") redirect(localePath(locale, "/panel"));

  const esAlumno = role === "alumno";
  const t = await getTranslations("agenda");
  const sb = await createClient();
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
  const [{ data: franjas }, { data: bloqueos }, { data: huecos }] = await Promise.all([
    sb.from("availability").select("id, weekday, start_time, end_time").order("weekday").order("start_time"),
    sb.from("availability_off").select("id, from_day, to_day").gte("to_day", hoy).order("from_day"),
    esAlumno
      ? Promise.resolve({ data: null })
      : sb.rpc("mentor_slots", { p_mentor: session!.user.id, p_kind: "sesion_1a1", p_days: 14 }),
  ]);
  const lista = franjas ?? [];
  const horas = lista.reduce((s, f) => {
    const [h1, m1] = f.start_time.split(":").map(Number);
    const [h2, m2] = f.end_time.split(":").map(Number);
    return s + (h2 * 60 + m2 - h1 * 60 - m1) / 60;
  }, 0);
  const slots = ((huecos as { slots?: string[] } | null)?.slots ?? []).slice(0, 6);
  const dia = (d: string) =>
    new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
      new Date(`${d}T00:00:00Z`),
    );

  return (
    <div className="w-full space-y-10">
      <header>
        <h1 className="font-heading text-[32px] leading-tight font-bold tracking-tight sm:text-[40px]">{esAlumno ? t("studentTitle") : t("title")}
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{esAlumno ? t("studentSubtitle") : t("subtitle")}</p>
        <p className="mt-3 font-mono text-sm text-label">
          {lista.length === 0 ? (esAlumno ? t("studentNone") : t("noAgenda")) : t("summary", { h: horas, n: lista.length })}
        </p>
      </header>

      {/* ───────────────────────── Semana ───────────────────────── */}
      <section aria-labelledby="semana" className="space-y-4">
        <h2 id="semana" className="font-heading text-2xl font-bold">
          {t("weekTitle")}
        </h2>
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => {
            const delDia = lista.filter((f) => f.weekday === d);
            return (
              <li key={d} className="rounded-2xl border bg-card p-3">
                <p className="font-mono text-xs tracking-[0.15em] text-label uppercase">{t(`wdLong.${d}`)}</p>
                {delDia.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">—</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {delDia.map((f) => (
                      <li
                        key={f.id}
                        className="flex items-center justify-between gap-1 rounded-[10px] border border-tint-primary-border bg-tint-primary pl-2.5"
                      >
                        <span className="font-mono text-sm text-primary">
                          {hhmm(f.start_time)}–{hhmm(f.end_time)}
                        </span>
                        <form action={deleteSlotAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="id" value={f.id} />
                          <button
                            type="submit"
                            aria-label={t("deleteSlot", { d: t(`wdLong.${d}`), h: hhmm(f.start_time) })}
                            className="grid size-9 place-items-center rounded-[10px] text-label hover:text-foreground"
                          >
                            ×
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="nueva" className="rounded-3xl border bg-card p-5 sm:p-7">
        <h2 id="nueva" className="mb-1 font-heading text-2xl font-bold">
          {t("addTitle")}
        </h2>
        <p className="mb-5 text-sm text-muted-foreground">{t("addHelp")}</p>
        <SlotForm locale={locale} />
      </section>

      {esAlumno ? (
        <p>
          <Link href="/panel#mentores" className="font-semibold text-primary hover:underline">
            {t("seeMatches")} →
          </Link>
        </p>
      ) : (
      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="bloqueos" className="rounded-3xl border bg-card p-5 sm:p-7">
          <h2 id="bloqueos" className="mb-1 font-heading text-2xl font-bold">
            {t("offTitle")}
          </h2>
          <p className="mb-5 text-sm text-muted-foreground">{t("offHelp")}</p>
          <OffForm locale={locale} minDate={hoy} />
          {(bloqueos ?? []).length > 0 && (
            <ul className="mt-4 space-y-2">
              {(bloqueos ?? []).map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2 border-b border-divider pb-2 last:border-0">
                  <span className="text-sm first-letter:uppercase">
                    {b.from_day === b.to_day ? dia(b.from_day) : `${dia(b.from_day)} → ${dia(b.to_day)}`}
                  </span>
                  <form action={deleteOffAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={b.id} />
                    <button type="submit" className="min-h-10 text-sm text-label hover:text-foreground">
                      {t("deleteOff")}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="proximos" className="rounded-3xl border bg-card p-5 sm:p-7">
          <h2 id="proximos" className="mb-1 font-heading text-2xl font-bold">
            {t("previewTitle")}
          </h2>
          <p className="mb-5 text-sm text-muted-foreground">{t("previewHelp")}</p>
          <NextSlots locale={locale} slots={slots} empty={lista.length === 0 ? t("noAgenda") : t("previewEmpty")} />
        </section>
      </div>
      )}
    </div>
  );
}
