import { getTranslations, setRequestLocale } from "next-intl/server";
import { Gift, MessageSquareText, UserCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SectionLabel } from "@/components/brand/section-label";
import { LeadForm } from "@/components/leads/lead-form";
import { getAllModulos } from "@/lib/catalog";
import { CONTACTO } from "@/lib/contacto";

// "Pregunta gratis": la primera duda a un mentor, sin cuenta ni pago. Deja un email o
// teléfono y le respondemos; después le invitamos a crear cuenta (3 créditos de
// bienvenida). Lee ?m=<código> para preseleccionar el módulo → dinámica.
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/pregunta">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pregunta" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function PreguntaPage({ params, searchParams }: PageProps<"/[locale]/pregunta">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("pregunta");
  const modulos = await getAllModulos();
  const m = typeof sp.m === "string" && modulos.some((x) => x.code === sp.m) ? sp.m : undefined;

  const pasos = [
    { icon: MessageSquareText, k: "s1" },
    { icon: UserCheck, k: "s2" },
    { icon: Gift, k: "s3" },
  ] as const;

  return (
    <main className="flex-1">
      <section className="hud-grid border-b border-divider">
        <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6">
          <SectionLabel>{t("eyebrow")}</SectionLabel>
          <h1 className="mt-4 max-w-4xl font-heading text-[40px] leading-[1.05] font-bold tracking-tight sm:text-[54px]">
            {t("title")}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{t("subtitle")}</p>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="form" className="rounded-3xl border bg-card p-5 sm:p-7">
          <h2 id="form" className="mb-6 font-heading text-2xl font-bold">
            {t("formTitle")}
          </h2>
          <LeadForm kind="pregunta" modulos={modulos} defaultModulo={m} />
        </section>

        <aside className="space-y-4">
          <ol className="space-y-3">
            {pasos.map(({ icon: Icon, k }, i) => (
              <li key={k} className="flex gap-3 rounded-2xl border bg-card p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-tint-primary-border bg-tint-primary text-primary">
                  <Icon aria-hidden className="size-5" />
                </span>
                <span>
                  <span className="font-mono text-xs text-label">0{i + 1}</span>
                  <span className="block font-semibold">{t(`${k}.t`)}</span>
                  <span className="block text-sm text-muted-foreground">{t(`${k}.d`)}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
            {t("hasAccount")}{" "}
            <Link href="/panel/tickets" className="text-primary underline-offset-4 hover:underline">
              {t("hasAccountLink")}
            </Link>
          </p>
          <p className="px-1 text-sm text-muted-foreground">
            {t("orCall")}{" "}
            <a href={CONTACTO.whatsappHref} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              WhatsApp
            </a>{" "}
            · <a href={CONTACTO.telefonoHref} className="font-mono text-foreground hover:text-primary">{CONTACTO.telefono}</a>
          </p>
        </aside>
      </div>
    </main>
  );
}
