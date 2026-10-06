import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RaBadge } from "@/components/brand/ra-badge";
import { MapaDominio, type RaProgress } from "@/components/brand/mapa-dominio";

export const metadata: Metadata = {
  title: "Styleguide · Tutor247",
  robots: { index: false },
};

const SAMPLE_RA: RaProgress[] = [
  { code: "RA1", label: "Estructura de un programa", status: "verde", progress: 100 },
  { code: "RA2", label: "Programación estructurada", status: "verde", progress: 100 },
  { code: "RA3", label: "Estructuras de control", status: "ambar", progress: 65 },
  { code: "RA4", label: "Programación modular", status: "ambar", progress: 45 },
  { code: "RA5", label: "Tipos de datos compuestos", status: "rojo", progress: 15 },
];

const SWATCHES = [
  ["background", "--background"],
  ["surface / card", "--card"],
  ["surface-2", "--surface-2"],
  ["primary", "--primary"],
  ["secondary", "--secondary"],
  ["accent-pass", "--accent-pass"],
  ["ra-verde", "--ra-verde"],
  ["ra-ambar", "--ra-ambar"],
  ["ra-rojo", "--ra-rojo"],
  ["border", "--border"],
  ["muted-foreground", "--muted-foreground"],
] as const;

function ThemeShowcase({ theme }: { theme: "student" | "family" }) {
  const isStudent = theme === "student";
  return (
    <div
      data-theme={theme}
      className={`rounded-xl border bg-background p-5 text-foreground sm:p-8 ${
        isStudent ? "hud-grid" : ""
      }`}
    >
      <div className="mb-8 flex items-baseline justify-between gap-3">
        <h2 className="font-mono text-sm tracking-widest text-primary uppercase">
          {isStudent ? "ZONA ESTUDIANTES" : "ZONA FAMILIAS"}
        </h2>
        <span className="text-xs text-muted-foreground">
          data-theme=&quot;{theme}&quot;
        </span>
      </div>

      {/* Tipografía */}
      <Section title="Tipografía">
        <div className="space-y-2">
          <p className="font-display text-4xl font-bold tracking-tight">
            Te sacamos el módulo
          </p>
          <p className="text-base text-muted-foreground">
            Inter para el texto: legible, neutra, cómoda en párrafos largos sobre
            el módulo, los RA y el plan hasta el examen.
          </p>
          <p className="font-mono text-sm text-primary">
            0485 · RA3 · 25 créditos · &lt; 2 h
          </p>
        </div>
      </Section>

      {/* Colores */}
      <Section title="Colores">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {SWATCHES.map(([name, varName]) => (
            <div key={name} className="space-y-1">
              <div
                className="h-12 rounded-md border"
                style={{ backgroundColor: `var(${varName})` }}
              />
              <p className="text-xs">{name}</p>
              <p className="font-mono text-[10px] text-muted-foreground">
                {varName}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Botones */}
      <Section title="Botones">
        <div className="flex flex-wrap items-center gap-3">
          <Button className={isStudent ? "glow" : ""}>Quiero aprobarlo</Button>
          <Button variant="outline">Diagnóstico gratis</Button>
          <Button variant="secondary">Ver mentores</Button>
          <Button variant="ghost">Cancelar</Button>
          <Button variant="destructive">Eliminar</Button>
        </div>
      </Section>

      {/* Inputs */}
      <Section title="Inputs">
        <div className="flex max-w-md flex-col gap-3">
          <label className="space-y-1">
            <span className="text-sm font-medium">¿Qué módulo te preocupa?</span>
            <input
              placeholder="Código (0485) o nombre"
              className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        </div>
      </Section>

      {/* Badges de RA */}
      <Section title="Badges de RA (Mapa de Dominio)">
        <div className="flex flex-wrap gap-2">
          <RaBadge status="verde" />
          <RaBadge status="ambar" />
          <RaBadge status="rojo" />
        </div>
      </Section>

      {/* Tarjeta de módulo */}
      <Section title="Tarjeta de módulo">
        <div className="max-w-sm rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-sm text-muted-foreground">0485</span>
            <Badge variant="destructive">🔥 Killer</Badge>
          </div>
          <h4 className="mt-1 font-semibold">Programación</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            DAM (1º) · DAW (1º) · 256 h
          </p>
          <Button
            size="sm"
            className={`mt-3 w-full ${isStudent ? "glow" : ""}`}
          >
            Ver módulo
          </Button>
        </div>
      </Section>

      {/* Tarjeta de mentor */}
      <Section title="Tarjeta de mentor">
        <div className="max-w-sm rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">Laura Gómez</span>
            <Badge variant="secondary">Mentor Experto</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Especialista 0485 Programación
          </p>
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            Imparte: 0485 · 0486 · 0484
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Responde en ~120 min
          </p>
        </div>
      </Section>

      {/* Mini Mapa de Dominio */}
      <Section title="Mapa de Dominio (panel HUD)">
        <div className="max-w-xl">
          <MapaDominio code="0485" name="Programación" ras={SAMPLE_RA} />
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8 border-t border-border/60 pt-5 first:border-t-0 first:pt-0">
      <h3 className="mb-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

export default async function StyleguidePage({
  params,
}: PageProps<"/[locale]/styleguide">) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-10">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Tutor247 — Styleguide
        </h1>
        <p className="mt-2 text-muted-foreground">
          Identidad visual: HUD Terminal. Una marca, dos zonas — estudiantes
          (HUD oscuro, neón cian/violeta) y familias (claro, sobrio).
        </p>
      </div>

      <ThemeShowcase theme="student" />
      <ThemeShowcase theme="family" />
    </main>
  );
}
