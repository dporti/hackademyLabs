import { useTranslations } from "next-intl";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { CONTACTO } from "@/lib/contacto";

// Tarjeta de contacto con Checkpoint Academy (teléfono, WhatsApp y, si está
// configurado, email). Para familias que prefieren hablar con una persona.
export function ContactCard({ title, text }: { title: string; text: string }) {
  const t = useTranslations("contacto");
  const btn =
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 font-bold transition-colors";
  return (
    <div className="glow rounded-3xl border border-tint-primary-border bg-tint-primary p-6 sm:p-8">
      <h3 className="font-heading text-2xl font-bold">{title}</h3>
      <p className="mt-2 max-w-2xl text-muted-foreground">{text}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href={CONTACTO.telefonoHref} className={`${btn} bg-primary text-primary-foreground hover:bg-primary/85`}>
          <Phone aria-hidden className="size-5" />
          {t("call", { phone: CONTACTO.telefono })}
        </a>
        <a
          href={CONTACTO.whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`${btn} border border-[#3a3f5c] hover:border-primary`}
        >
          <MessageCircle aria-hidden className="size-5" />
          {t("whatsapp")}
        </a>
        {CONTACTO.email && (
          <a href={`mailto:${CONTACTO.email}`} className={`${btn} border border-[#3a3f5c] hover:border-primary`}>
            <Mail aria-hidden className="size-5" />
            {CONTACTO.email}
          </a>
        )}
      </div>
      <p className="mt-4 text-sm text-label">{t("note")}</p>
    </div>
  );
}
