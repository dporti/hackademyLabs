import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Logo } from "@/components/brand/logo";

// Marco común de las pantallas de acceso (entrar, registro, onboarding), maqueta
// Registro.html: panel de marca a la izquierda (oculto en móvil) y tarjeta del
// formulario a la derecha.
export function AuthShell({
  title,
  subtitle,
  width = "sm",
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  width?: "sm" | "lg";
  children: ReactNode;
  footer?: ReactNode;
}) {
  const t = useTranslations("auth");
  const f = useTranslations("footer");
  return (
    <main className="flex-1">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_minmax(0,560px)] lg:py-16">
        <aside className="hud-grid relative hidden flex-col justify-between overflow-hidden rounded-3xl border border-tint-primary-border bg-tint-primary p-10 lg:flex">
          <div>
            <Logo />
            <h2 className="mt-12 font-heading text-[40px] leading-[1.05] font-bold tracking-tight">
              {t("shellTitle")}
            </h2>
            <ul className="mt-8 space-y-3 text-[15px]">
              {(["b1", "b2", "b3"] as const).map((b) => (
                <li key={b} className="flex items-start gap-2.5">
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={3} />
                  {t(`shell.${b}`)}
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-12 font-mono text-sm text-label">{f("ethics")}</p>
        </aside>

        <div className={`animate-hud-in mx-auto w-full ${width === "lg" ? "max-w-xl" : "max-w-md"} lg:py-6`}>
          <div className="rounded-3xl border bg-card p-6 sm:p-8">
            <h1 className="font-heading text-3xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </div>
          {footer && <p className="mt-5 text-center text-sm text-muted-foreground">{footer}</p>}
        </div>
      </div>
    </main>
  );
}
