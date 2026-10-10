import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check, Plus } from "lucide-react";
import { getSessionUser, localePath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMapaAlumno } from "@/lib/mapa";
import { diasHasta } from "@/lib/plan-inverso";
import { temaRa } from "@/lib/temas";
import { Link } from "@/i18n/navigation";
import { BitPanelChat } from "@/components/bit/bit-panel";
import { QuizCard } from "@/components/bit/quiz-card";
import { cn } from "@/lib/utils";

// Bit, tutor IA del alumno (fase 8, maqueta Bit.html): conversaciones guardadas, chat
// con el contexto del alumno y material de su módulo, quiz de 3 preguntas, «Quiero a
// mi mentor» (ticket) y lo que Bit sabe del alumno.
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/panel/bit">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "bitPanel" });
  return { title: t("title"), robots: { index: false } };
}

export default async function BitPage({ params, searchParams }: PageProps<"/[locale]/panel/bit">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getSessionUser();
  if (!session) redirect(localePath(locale, "/entrar"));
  if (session!.profile?.role !== "alumno") redirect(localePath(locale, "/panel"));
  const userId = session!.user.id;

  const t = await getTranslations("bitPanel");
  const tr = await getTranslations("temasRa");
  const sp = await searchParams;
  const sb = await createClient();
  const [{ data: convs }, mapa] = await Promise.all([
    sb.from("conversation").select("id, title, updated_at").eq("student_id", userId).order("updated_at", { ascending: false }).limit(20),
    getMapaAlumno(userId),
  ]);
  const actual = typeof sp.c === "string" ? (convs ?? []).find((c) => c.id === sp.c) : undefined;
  const { data: msgs } = actual
    ? await sb.from("message").select("sender, body").eq("conversation_id", actual.id).order("created_at").limit(100)
    : { data: [] };
  const inicial = (msgs ?? [])
    .filter((m) => m.body && (m.sender === "alumno" || m.sender === "bit"))
    .map((m) => ({ role: m.sender === "alumno" ? ("user" as const) : ("assistant" as const), content: String(m.body) }));

  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
  const foco =
    mapa.find((m) => m.code === sp.m) ??
    [...mapa].filter((m) => m.exam_date && diasHasta(hoy, m.exam_date) >= 0).sort((a, b) => a.exam_date!.localeCompare(b.exam_date!))[0] ??
    mapa[0];
  const flojos = foco?.ras.filter((r) => r.nivel === "aun_no" || r.nivel === "con_ayuda") ?? [];
  const rasQuiz = mapa.flatMap((m) =>
    m.ras.map((r) => ({ id: r.id, label: `${m.code} · ${r.code} · ${temaRa(tr, m.code, r.code) ?? r.description.slice(0, 50)}` })),
  );
  const defaultRa = typeof sp.quiz === "string" && rasQuiz.some((r) => r.id === sp.quiz) ? sp.quiz : flojos[0]?.id;
  const fecha = (d: string) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
  const cuando = (iso: string) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "Europe/Madrid" }).format(new Date(iso));

  return (
    <div className="w-full space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-[32px] leading-tight font-bold tracking-tight sm:text-[40px]">{t("title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link
          href={foco ? `/panel/tickets?modulo=${foco.code}` : "/panel/tickets"}
          className="inline-flex min-h-11 items-center rounded-[10px] border border-tint-sos-border bg-tint-sos px-4 text-sm font-bold text-sos-text hover:opacity-90"
        >
          {t("wantMentor")}
        </Link>
      </header>

      <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)_300px]">
        {/* Conversaciones */}
        <nav aria-label={t("convsAria")} className="space-y-2">
          <Link
            href="/panel/bit"
            className="flex min-h-11 items-center gap-2 rounded-[10px] bg-primary px-3 text-sm font-bold text-primary-foreground hover:bg-primary/85"
          >
            <Plus aria-hidden className="size-4" />
            {t("newChat")}
          </Link>
          <ul className="space-y-1">
            {(convs ?? []).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/panel/bit?c=${c.id}`}
                  aria-current={actual?.id === c.id ? "page" : undefined}
                  className={cn(
                    "block rounded-[10px] px-3 py-2 text-sm",
                    actual?.id === c.id ? "bg-tint-primary text-primary" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                  )}
                >
                  <span className="line-clamp-2">{c.title || t("untitled")}</span>
                  <span className="block font-mono text-[10px] text-label">{cuando(c.updated_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <BitPanelChat
          conversationId={actual?.id ?? null}
          inicial={inicial}
          modulo={foco?.code ?? null}
          sugerencias={[t("sugg.debug"), t("sugg.concept"), t("sugg.plan")]}
        />

        <aside className="space-y-4">
          <section aria-labelledby="sabe" className="rounded-2xl border bg-card p-5">
            <h2 id="sabe" className="font-mono text-xs font-semibold tracking-[0.2em] text-label uppercase">
              {t("knowsTitle")}
            </h2>
            {!foco ? (
              <p className="mt-2 text-sm text-muted-foreground">{t("knowsEmpty")}</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  {t("studies")} <span className="font-semibold">{foco.code} {foco.name}</span>
                </li>
                <li>
                  {foco.exam_date
                    ? t("examOn", { date: fecha(foco.exam_date), n: diasHasta(hoy, foco.exam_date) })
                    : t("noExam")}
                </li>
                <li>
                  {t("weak")}{" "}
                  {flojos.length ? <span className="font-mono">{flojos.map((r) => r.code).join(", ")}</span> : t("weakNone")}
                </li>
              </ul>
            )}
            <p className="mt-3 text-xs text-label">{t("knowsNote")}</p>
          </section>

          <section aria-labelledby="quiz" className="rounded-2xl border bg-card p-5">
            <h2 id="quiz" className="font-heading text-lg font-bold">
              {t("quizTitle")}
            </h2>
            <p className="mt-1 mb-4 text-xs text-muted-foreground">{t("quizHelp")}</p>
            <QuizCard ras={rasQuiz} defaultRa={defaultRa} />
          </section>

          <section aria-labelledby="reglas" className="rounded-2xl border border-tint-primary-border bg-tint-primary p-5">
            <h2 id="reglas" className="font-mono text-xs font-semibold tracking-[0.2em] text-primary uppercase">
              {t("rulesTitle")}
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {(["r1", "r2", "r3"] as const).map((r) => (
                <li key={r} className="flex gap-2">
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-accent-pass" strokeWidth={3} />
                  {t(`rules.${r}`)}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
