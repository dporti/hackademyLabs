import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/brand/logo";
import { SectionLabel } from "@/components/brand/section-label";
import { RaBadge } from "@/components/brand/ra-badge";
import { MapaDominio, type RaProgress } from "@/components/brand/mapa-dominio";
import { NIVELES } from "@/lib/dominio";

// Página interna de referencia (noindex). Textos de muestra en español a propósito:
// no es una página de producto.
export const metadata: Metadata = {
  title: "Styleguide",
  robots: { index: false },
};

const SAMPLE_RA: RaProgress[] = [
  { code: "RA1", label: "Estructura de un programa", status: "verde", progress: 100 },
  { code: "RA2", label: "Programación estructurada", status: "ambar", progress: 75 },
  { code: "RA3", label: "Estructuras de control", status: "ambar", progress: 45 },
  { code: "RA4", label: "Programación modular", status: "rojo", progress: 15 },
];

const SWATCHES = [
  ["background", "--background", "#07080F"],
  ["card", "--card", "#0E1019"],
  ["surface-2", "--surface-2", "#151826"],
  ["border", "--border", "#23263A"],
  ["divider", "--divider", "#1C1F30"],
  ["foreground", "--foreground", "#E8EAF2"],
  ["muted-foreground", "--muted-foreground", "#A9AEC4"],
  ["label", "--label", "#8A90A8"],
  ["primary · Aprueba tu módulo", "--primary", "#2EF2FF"],
  ["secondary · Tutor247", "--secondary", "#FF3DCB"],
  ["secondary-text", "--secondary-text", "#FF8BE0"],
  ["accent-pass · solo aprobado", "--accent-pass", "#7CFF5B"],
  ["warning", "--warning", "#FFB020"],
  ["sos", "--sos", "#FF5A36"],
  ["sos-text", "--sos-text", "#FF7A5C"],
] as const;

const TINTS = [
  ["Cian", "bg-tint-primary border-tint-primary-border", "text-primary"],
  ["Magenta", "bg-tint-secondary border-tint-secondary-border", "text-secondary-text"],
  ["Ámbar", "bg-tint-warning border-tint-warning-border", "text-warning"],
  ["SOS", "bg-tint-sos border-tint-sos-border", "text-sos-text"],
  ["Verde", "bg-tint-pass border-tint-pass-border", "text-accent-pass"],
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-t border-divider pt-6">
      <h2 className="font-mono text-xs tracking-[0.2em] text-label uppercase">{title}</h2>
      {children}
    </section>
  );
}

export default async function StyleguidePage({ params }: PageProps<"/[locale]/styleguide">) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-10 px-4 py-10">
      <div className="space-y-3">
        <Logo />
        <h1 className="font-heading text-4xl font-bold tracking-tight">Styleguide</h1>
        <p className="max-w-2xl text-muted-foreground">
          Checkpoint Academy · tema oscuro único. Cian = Aprueba tu módulo · magenta = Tutor247 ·
          verde solo para aprobado. Referencia completa en <code>docs/diseno/DISENO.md</code>.
        </p>
      </div>

      <Section title="Logo">
        <div className="flex flex-wrap items-center gap-8 rounded-2xl border bg-card p-6">
          <Logo />
          <Logo compact />
        </div>
      </Section>

      <Section title="Tipografía">
        <SectionLabel index="01">Aprueba tu módulo</SectionLabel>
        <p className="font-heading text-[46px] leading-tight font-bold tracking-tight">
          Aprende con IA. Demuéstralo sin ella.
        </p>
        <SectionLabel index="02" tone="secondary">Tutor247</SectionLabel>
        <p className="font-heading text-[38px] leading-tight font-bold tracking-tight">
          Siempre hay alguien. Y no te suelta.
        </p>
        <p className="max-w-2xl text-base text-muted-foreground">
          Inter para el texto y los paneles: legible en párrafos largos sobre el módulo, los RA y el
          plan hasta el examen.
        </p>
        <p className="font-mono text-sm text-primary">0485 · RA3 · 25 créditos · &lt; 2 h</p>
      </Section>

      <Section title="Colores">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {SWATCHES.map(([name, varName, hex]) => (
            <div key={varName} className="space-y-1">
              <div className="h-12 rounded-lg border" style={{ backgroundColor: `var(${varName})` }} />
              <p className="text-xs">{name}</p>
              <p className="font-mono text-[10px] text-label">
                {varName} · {hex}
              </p>
            </div>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-5">
          {TINTS.map(([name, cls, text]) => (
            <div key={name} className={`rounded-2xl border p-4 ${cls}`}>
              <p className={`font-mono text-xs ${text}`}>{name}</p>
              <p className="mt-1 text-xs text-muted-foreground">Bloque destacado</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Botones">
        <div className="flex flex-wrap items-center gap-3">
          <Button className="glow h-11 rounded-[10px] px-5 text-[15px] font-bold">Quiero aprobarlo</Button>
          <span data-accent="tutor">
            <Button className="glow h-11 rounded-[10px] px-5 text-[15px] font-bold">Conocer Tutor247</Button>
          </span>
          <Button variant="secondary" className="h-11 rounded-[10px] px-5 text-[15px]">
            Secundario (neutro)
          </Button>
          <Button variant="outline" className="h-11 rounded-[10px] px-5 text-[15px]">
            Test gratis
          </Button>
          <Button variant="ghost" className="h-11 rounded-[10px] px-5">Cancelar</Button>
          <span className="inline-flex min-h-11 items-center rounded-[10px] border border-sos px-4 font-mono font-bold text-sos-text">
            ● SOS
          </span>
        </div>
      </Section>

      <Section title="Tarjetas">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="glow rounded-2xl border border-tint-primary-border bg-tint-primary p-6">
            <SectionLabel>Aprueba tu módulo</SectionLabel>
            <h3 className="mt-2 font-heading text-2xl font-bold">No te damos clases. Te sacamos el módulo.</h3>
            <p className="mt-2 text-sm text-muted-foreground">Bloque destacado (uno por sección).</p>
          </div>
          <div data-accent="tutor" className="glow rounded-2xl border border-tint-primary-border bg-tint-primary p-6">
            <SectionLabel>Tutor247 · data-accent=&quot;tutor&quot;</SectionLabel>
            <h3 className="mt-2 font-heading text-2xl font-bold">Siempre hay alguien.</h3>
            <Button size="sm" className="mt-3">Ver planes</Button>
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm text-label">0485</span>
              <Badge variant="destructive">Killer</Badge>
            </div>
            <h4 className="mt-1 font-semibold">Programación</h4>
            <p className="mt-1 text-xs text-muted-foreground">DAM (1º) · DAW (1º) · 256 h</p>
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">Nombre del mentor</span>
              <Badge variant="secondary">Mentor Experto</Badge>
            </div>
            <p className="mt-3 font-mono text-xs text-label">Imparte: 0485 · 0486 · 0484</p>
          </div>
        </div>
      </Section>

      <Section title="Mapa de Dominio · 4 niveles">
        <div className="flex flex-wrap gap-2">
          {NIVELES.map((n) => (
            <RaBadge key={n} nivel={n} />
          ))}
        </div>
        <div className="max-w-xl">
          <MapaDominio code="0485" name="Programación" ras={SAMPLE_RA} />
        </div>
      </Section>

      <Section title="Estados genéricos (tickets, mentores, informes)">
        <div className="flex flex-wrap gap-2">
          <RaBadge status="verde" />
          <RaBadge status="ambar" />
          <RaBadge status="rojo" />
        </div>
      </Section>
    </main>
  );
}
