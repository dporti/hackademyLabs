import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check, Lock } from "lucide-react";
import { getSessionUser, localePath } from "@/lib/auth";
import { DIAS_SEMANA_RACHA, getLogros } from "@/lib/logros";
import { cn } from "@/lib/utils";

// Logros del alumno (fase 8, maqueta Logros.html): nivel por XP, racha semanal, sellos,
// quizzes, insignias y últimos puntos. Retos, liga de clase y muro de aprobados del
// mockup aún no existen: no se muestran (DISENO.md §8, lo no construido se oculta).
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/panel/logros">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "logros" });
  return { title: t("title"), robots: { index: false } };
}

export default async function LogrosPage({ params }: PageProps<"/[locale]/panel/logros">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getSessionUser();
  if (!session) redirect(localePath(locale, "/entrar"));
  if (session!.profile?.role !== "alumno") redirect(localePath(locale, "/panel"));

  const t = await getTranslations("logros");
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
  const l = await getLogros(session!.user.id, hoy);
  const { nivel } = l;
  const pct = nivel.hasta ? Math.round(((l.xp - nivel.desde) / (nivel.hasta - nivel.desde)) * 100) : 100;
  const n = (v: number) => new Intl.NumberFormat(locale).format(v);
  const fecha = (iso: string) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "Europe/Madrid" }).format(new Date(iso));

  const cifras = [
    { label: t("statStreak"), value: t("weeks", { n: l.racha }) },
    { label: t("statSeals"), value: n(l.sellos) },
    { label: t("statQuizzes"), value: n(l.quizzes) },
    { label: t("statSessions"), value: n(l.sesiones) },
  ];

  return (
    <div className="w-full space-y-10">
      <header>
        <h1 className="font-heading text-[32px] leading-tight font-bold tracking-tight sm:text-[40px]">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      </header>

      <section aria-label={t("levelAria")} className="glow rounded-3xl border border-tint-primary-border bg-tint-primary p-6 sm:p-8">
        <p className="font-mono text-xs tracking-[0.2em] text-label uppercase">{t("level")}</p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="font-mono text-5xl font-semibold text-primary">{nivel.nivel}</span>
          <span className="font-heading text-2xl font-bold">{t(`levels.${nivel.nivel}`)}</span>
        </div>
        <p className="mt-2 font-mono text-sm text-muted-foreground">
          {nivel.hasta
            ? t("xpToNext", { xp: n(l.xp), falta: n(nivel.hasta - l.xp), next: nivel.nivel + 1, name: t(`levels.${nivel.nivel + 1}`) })
            : t("xpMax", { xp: n(l.xp) })}
        </p>
        <div
          className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("levelAria")}
        >
          <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-3 text-xs text-label">{t("xpHow")}</p>
      </section>

      <section aria-label={t("statsAria")} className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cifras.map((c) => (
          <div key={c.label} className="rounded-2xl border bg-card p-5">
            <p className="font-mono text-xs tracking-[0.15em] text-label uppercase">{c.label}</p>
            <p className="mt-2 font-mono text-3xl font-semibold text-primary">{c.value}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="insignias">
        <h2 id="insignias" className="font-heading text-2xl font-bold">
          {t("badgesTitle")}
        </h2>
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {l.badges.map((b) => (
            <li
              key={b.slug}
              className={cn(
                "rounded-2xl border p-4",
                b.unlocked ? "border-tint-pass-border bg-tint-pass" : "bg-card opacity-80",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-10 place-items-center rounded-xl border",
                  b.unlocked ? "border-tint-pass-border text-accent-pass" : "text-label",
                )}
              >
                {b.unlocked ? <Check className="size-5" strokeWidth={3} /> : <Lock className="size-4" />}
              </span>
              <p className="mt-3 font-semibold">{t(`badges.${b.slug}.name`)}</p>
              <p className="text-xs text-muted-foreground">{t(`badges.${b.slug}.how`)}</p>
              <p className="mt-1 font-mono text-xs text-label">
                {b.unlocked ? t("unlocked") : t("locked")}
                {b.detail && ` · ${b.detail}`}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="racha">
        <h2 id="racha" className="font-heading text-2xl font-bold">
          {t("streakTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("streakHelp", { n: DIAS_SEMANA_RACHA })}</p>
        <ol className="mt-5 flex h-36 items-end gap-2" aria-label={t("streakTitle")}>
          {l.semanas.map((s, i) => {
            const ok = s.dias >= DIAS_SEMANA_RACHA;
            return (
              <li key={s.inicio} className="flex flex-1 flex-col items-center gap-1">
                <span className="font-mono text-xs text-label">{s.dias}</span>
                <span
                  className={cn("w-full rounded-t-md", ok ? "bg-accent-pass" : "bg-muted")}
                  style={{ height: `${Math.max(6, (s.dias / 7) * 100)}px` }}
                  aria-hidden
                />
                <span className="font-mono text-[10px] text-label">
                  {i === l.semanas.length - 1 ? t("thisWeek") : `S${i + 1}`}
                </span>
                <span className="sr-only">{t("weekDays", { date: fecha(`${s.inicio}T12:00:00Z`), n: s.dias })}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="puntos">
        <h2 id="puntos" className="font-heading text-2xl font-bold">
          {t("recentTitle")}
        </h2>
        {l.recientes.length === 0 ? (
          <p className="mt-2 text-muted-foreground">{t("recentEmpty")}</p>
        ) : (
          <ul className="mt-4 divide-y divide-divider rounded-2xl border bg-card">
            {l.recientes.map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>
                  {t(`xpKind.${r.kind}`)} <span className="text-label">· {fecha(r.at)}</span>
                </span>
                <span className="font-mono font-semibold text-accent-pass">+{r.points} XP</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
