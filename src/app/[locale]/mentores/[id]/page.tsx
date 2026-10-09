import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BadgeCheck, Play } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SectionLabel } from "@/components/brand/section-label";
import { iniciales } from "@/components/brand/mentor-card";
import { getMentorById, getMentorIds, getTarifasPublicas } from "@/lib/catalog";
import type { ProductKind } from "@/lib/db-types";

// Ficha pública de mentor (maqueta Mentor.html). Solo datos de mentor_public (sin
// contacto: anti-bypass). Sin cifras de alumnos/valoración/aprobados ni testimonios
// hasta tenerlos reales; la agenda en tiempo real tampoco existe aún.

const SERVICIOS: ProductKind[] = ["sesion_1a1", "sesion_flash", "ticket_express", "ticket_normal"];

export async function generateStaticParams() {
  const ids = await getMentorIds();
  return ids.map((id) => ({ id }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/mentores/[id]">) {
  const { id, locale } = await params;
  const m = await getMentorById(id);
  if (!m) return {};
  const t = await getTranslations({ locale, namespace: "mentors" });
  return {
    title: `${m.full_name} — ${m.headline ?? t(`level.${m.level}`)}`,
    description: m.bio ?? m.headline ?? undefined,
  };
}

export default async function MentorPage({ params }: PageProps<"/[locale]/mentores/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const [m, tarifas] = await Promise.all([getMentorById(id), getTarifasPublicas()]);
  if (!m) notFound();

  const t = await getTranslations("mentors");
  const idiomas = (m.languages ?? []).map((l) =>
    ["es", "ca", "en"].includes(l) ? t(`lang.${l as "es" | "ca" | "en"}`) : l.toUpperCase(),
  );

  return (
    <main className="flex-1">
      <section className="hud-grid border-b border-divider">
        <div className="mx-auto max-w-[1200px] px-4 pt-8 pb-12 sm:px-6">
          <nav aria-label={t("breadcrumb")} className="font-mono text-xs text-label">
            <Link href="/mentores" className="hover:text-foreground">
              {t("breadcrumb")}
            </Link>{" "}
            /{" "}
            <span className="text-foreground" aria-current="page">
              {m.full_name}
            </span>
          </nav>

          <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center">
            <span
              aria-hidden
              className="glow grid size-28 shrink-0 place-items-center rounded-3xl border border-tint-primary-border bg-tint-primary font-heading text-4xl font-bold text-primary"
            >
              {iniciales(m.full_name)}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold tracking-[0.15em] text-primary uppercase">
                  {t(`level.${m.level}`)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border border-tint-pass-border bg-tint-pass px-2 py-0.5 text-xs text-accent-pass">
                  <BadgeCheck aria-hidden className="size-3.5" />
                  {t("verified")}
                </span>
              </div>
              <h1 className="mt-2 font-heading text-[40px] leading-tight font-bold tracking-tight sm:text-5xl">
                {m.full_name}
              </h1>
              {m.headline && <p className="mt-2 text-lg text-muted-foreground">{m.headline}</p>}
              <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                {m.response_time_minutes != null && (
                  <div className="flex gap-2">
                    <dt className="text-label">{t("responds")}</dt>
                    <dd className="font-mono">{t("respondsValue", { min: m.response_time_minutes })}</dd>
                  </div>
                )}
                {idiomas.length > 0 && (
                  <div className="flex gap-2">
                    <dt className="text-label">{t("languages")}</dt>
                    <dd>{idiomas.join(" · ")}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          {m.video_url && (
            <a
              href={m.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="card-interactive flex items-center gap-4 rounded-2xl border bg-card p-5"
            >
              <span className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground">
                <Play aria-hidden className="size-5" />
              </span>
              <span className="font-heading text-lg font-semibold">{t("video")}</span>
            </a>
          )}

          {m.bio && (
            <section className="rounded-2xl border bg-card p-6">
              <SectionLabel>{t("howTitle")}</SectionLabel>
              <p className="mt-3 text-[17px] leading-relaxed whitespace-pre-line">{m.bio}</p>
            </section>
          )}

          {m.modulos.length > 0 && (
            <section>
              <SectionLabel>{t("modulesTitle")}</SectionLabel>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {m.modulos.map((mo) => (
                  <li key={mo.code}>
                    <Link
                      href={`/modulos/${mo.code}`}
                      className="card-interactive flex items-center gap-3 rounded-2xl border bg-card p-4"
                    >
                      <span className="font-mono text-sm font-semibold text-primary">{mo.code}</span>
                      <span>{mo.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="glow rounded-3xl border border-tint-primary-border bg-card p-6">
            <SectionLabel>{t("servicesTitle")}</SectionLabel>
            <ul className="mt-4 divide-y divide-divider">
              {SERVICIOS.map((k) => {
                const precio = tarifas[k]?.[m.level];
                if (!precio) return null;
                return (
                  <li key={k} className="flex items-baseline justify-between gap-3 py-3">
                    <span className="text-[15px]">{t(`service.${k}` as "service.sesion_1a1")}</span>
                    <span className="font-mono font-semibold text-primary">{t("sessionPrice", { n: precio })}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-xs text-label">{t("servicesNote")}</p>
            <div className="mt-5 space-y-2.5">
              <Link
                href="/panel/sesiones"
                className="flex min-h-12 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground transition-colors hover:bg-primary/85"
              >
                {t("bookSession")}
              </Link>
              <Link
                href="/panel/tickets"
                className="flex min-h-12 items-center justify-center rounded-xl border border-[#3a3f5c] font-medium transition-colors hover:border-primary"
              >
                {t("sendTicket")}
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <p className="font-mono text-xs font-semibold tracking-[0.2em] text-label uppercase">{t("availability")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("availabilitySoon")}</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
