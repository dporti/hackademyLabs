import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/brand/logo";
import { NAV_LINKS } from "@/components/site-header";
import { CONTACTO } from "@/lib/contacto";

// Pie global: marca + lema, enlaces de producto y ayuda, y la línea ética.
export function SiteFooter() {
  const t = useTranslations("footer");
  const n = useTranslations("nav");
  const c = useTranslations("contacto");

  const ayuda = [
    { href: "/ciclos", label: t("cycles") },
    { href: "/diagnostico", label: t("diagnostic") },
    { href: "/tutor247#familias", label: t("families") },
    { href: "/hazte-mentor", label: t("becomeMentor") },
    { href: "/cancelacion", label: t("cancellation") },
  ];

  return (
    <footer className="mt-10 border-t border-divider">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">{t("brandLine")}</p>
          <p className="text-sm text-muted-foreground">
            {c("footer")}:{" "}
            <a href={CONTACTO.telefonoHref} className="font-mono text-foreground hover:text-primary">
              {CONTACTO.telefono}
            </a>
            {CONTACTO.email && (
              <>
                {" · "}
                <a href={`mailto:${CONTACTO.email}`} className="text-foreground hover:text-primary">
                  {CONTACTO.email}
                </a>
              </>
            )}
          </p>
        </div>
        <FooterCol title={t("product")} links={NAV_LINKS.map((l) => ({ href: l.href, label: n(l.key) }))} />
        <FooterCol title={t("help")} links={ayuda} />
      </div>
      <div className="border-t border-divider">
        <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-3 px-4 py-6 text-sm text-label sm:px-6">
          <span>{t("rights")}</span>
          <span className="font-mono">{t("ethics")}</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <nav aria-label={title}>
      <p className="font-mono text-xs tracking-[0.2em] text-label uppercase">{title}</p>
      <ul className="mt-3 space-y-1">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="inline-flex min-h-9 items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
