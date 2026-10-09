import { getTranslations } from "next-intl/server";
import { Mail, Phone } from "lucide-react";
import { updateLeadStatusAction } from "@/app/actions/leads";
import { Button } from "@/components/ui/button";
import type { Lead, LeadStatus } from "@/lib/db-types";

// Contactos sin cuenta para el admin: dudas gratis y peticiones de llamada. Los nuevos,
// primero. El contacto (email/teléfono) solo se ve aquí, nunca en zonas públicas.
const SIGUIENTE: Record<LeadStatus, LeadStatus[]> = {
  nuevo: ["contactado", "cerrado"],
  contactado: ["cerrado", "nuevo"],
  cerrado: ["nuevo"],
};

export async function AdminLeads({ locale, leads }: { locale: string; leads: Lead[] }) {
  const t = await getTranslations("adminLeads");
  const fecha = (iso: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Madrid" }).format(
      new Date(iso),
    );
  const nuevos = leads.filter((l) => l.status === "nuevo").length;
  const esEmail = (c: string) => c.includes("@");

  return (
    <section aria-labelledby="contactos">
      <h2 id="contactos" className="font-heading text-2xl font-bold">
        {t("title")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("newCount", { n: nuevos })} · {t("help")}
      </p>
      {leads.length === 0 ? (
        <p className="mt-4 text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {leads.map((l) => (
            <li
              key={l.id}
              className={`rounded-2xl border p-5 ${l.status === "nuevo" ? "border-tint-warning-border bg-card" : "bg-card opacity-80"}`}
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`rounded-md px-2 py-0.5 font-mono font-semibold ${
                    l.kind === "pregunta" ? "bg-tint-primary text-primary" : "bg-tint-secondary text-secondary-text"
                  }`}
                >
                  {t(`kind.${l.kind}`)}
                </span>
                <span className="rounded-md border px-2 py-0.5">{t(`status.${l.status}`)}</span>
                {l.quien && <span className="text-label">{t(`quien.${l.quien}`)}</span>}
                {l.modulo_code && <span className="font-mono text-label">{l.modulo_code}</span>}
                <span className="ml-auto font-mono text-label">{fecha(l.created_at)}</span>
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-semibold">
                {l.name && <span>{l.name}</span>}
                <a
                  href={esEmail(l.contact) ? `mailto:${l.contact}` : `tel:${l.contact.replace(/[^\d+]/g, "")}`}
                  className="inline-flex items-center gap-1.5 font-mono text-sm text-primary hover:underline"
                >
                  {esEmail(l.contact) ? <Mail aria-hidden className="size-4" /> : <Phone aria-hidden className="size-4" />}
                  {l.contact}
                </a>
              </p>
              {l.message && <p className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">{l.message}</p>}
              {l.preferred_time && (
                <p className="mt-1 text-sm">
                  <span className="text-label">{t("when")}:</span> {l.preferred_time}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2 border-t border-divider pt-4">
                {SIGUIENTE[l.status].map((s) => (
                  <form key={s} action={updateLeadStatusAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="lead" value={l.id} />
                    <input type="hidden" name="status" value={s} />
                    <Button type="submit" size="sm" variant={s === "contactado" ? "default" : "outline"}>
                      {t(`mark.${s}`)}
                    </Button>
                  </form>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
