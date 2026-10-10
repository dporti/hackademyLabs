import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSessionUser, localePath } from "@/lib/auth";
import { getTutorCartera, getTutorCheckins } from "@/lib/tutor";
import { Link } from "@/i18n/navigation";

// Agenda de check-ins del tutor (fase 7): próximos, agrupados por día (Madrid). Se
// agendan y cierran desde la ficha de cada alumno.
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/panel/checkins">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tutorPanel" });
  return { title: t("checkinsTitle"), robots: { index: false } };
}

export default async function CheckinsPage({ params }: PageProps<"/[locale]/panel/checkins">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getSessionUser();
  if (!session) redirect(localePath(locale, "/entrar"));
  if (session!.profile?.role !== "tutor_referencia") redirect(localePath(locale, "/panel"));

  const t = await getTranslations("tutorPanel");
  const [checkins, cartera] = await Promise.all([getTutorCheckins(session!.user.id), getTutorCartera()]);
  const nombre = new Map(cartera.map((r) => [r.student_id, r.full_name ?? "—"]));
  const dia = (iso: string) =>
    new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" }).format(new Date(iso));
  const hora = (iso: string) =>
    new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }).format(new Date(iso));

  const grupos = new Map<string, typeof checkins>();
  for (const c of checkins) {
    const k = dia(c.scheduled_at);
    grupos.set(k, [...(grupos.get(k) ?? []), c]);
  }

  return (
    <div data-accent="tutor" className="w-full space-y-8">
      <header>
        <h1 className="font-heading text-[32px] leading-tight font-bold tracking-tight sm:text-[40px]">{t("checkinsTitle")}</h1>
        <p className="mt-2 text-muted-foreground">{t("checkinsHelp")}</p>
      </header>
      {checkins.length === 0 ? (
        <p className="text-muted-foreground">{t("checkinsEmpty")}</p>
      ) : (
        [...grupos].map(([d, lista]) => (
          <section key={d} aria-label={d}>
            <h2 className="font-heading text-xl font-bold first-letter:uppercase">{d}</h2>
            <ul className="mt-3 divide-y divide-divider rounded-2xl border bg-card">
              {lista.map((c) => (
                <li key={c.id} className="flex gap-4 px-4 py-3">
                  <span className="w-14 shrink-0 font-mono text-primary">{hora(c.scheduled_at)}</span>
                  <span className="min-w-0">
                    <Link href={`/panel/alumno/${c.student_id}`} className="font-semibold hover:underline">
                      {nombre.get(c.student_id)}
                    </Link>{" "}
                    <span className="text-muted-foreground">· {t(`kind.${c.kind}`)}</span>
                    {c.topic && <span className="block text-sm text-muted-foreground">{c.topic}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
