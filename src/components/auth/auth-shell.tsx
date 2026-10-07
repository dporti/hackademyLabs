import type { ReactNode } from "react";

// Marco común de las pantallas de acceso (entrar, registro, onboarding): fondo con
// rejilla HUD y tarjeta central con glow.
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
  return (
    <main className="hud-grid flex flex-1 items-start justify-center px-4 py-12 sm:py-16">
      <div
        className={`animate-hud-in w-full ${width === "lg" ? "max-w-xl" : "max-w-sm"}`}
      >
        <div className="glow rounded-xl border border-primary/30 bg-card/90 p-6 backdrop-blur-sm sm:p-8">
          <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          )}
          <div className="mt-6">{children}</div>
        </div>
        {footer && (
          <p className="mt-4 text-center text-sm text-muted-foreground">{footer}</p>
        )}
      </div>
    </main>
  );
}
