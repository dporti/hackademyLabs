// Plantilla de las imágenes Open Graph (1200×630) con la marca: fondo oscuro, rejilla
// HUD, cian = Aprueba tu módulo, magenta = Tutor247. Solo estilos que entiende Satori
// (next/og): todo div con varios hijos lleva display:flex.
export const OG_SIZE = { width: 1200, height: 630 };

export function OgCard({
  eyebrow,
  title,
  subtitle,
  code,
  footer,
  accent = "#2EF2FF",
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  code?: string;
  footer: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        background: "#07080f",
        backgroundImage:
          "linear-gradient(rgba(46,242,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(46,242,255,0.07) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
        color: "#f4f6fb",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 18, height: 18, borderRadius: 4, background: accent }} />
        <div style={{ fontSize: 26, letterSpacing: 4, textTransform: "uppercase", color: accent }}>{eyebrow}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {code ? (
          <div style={{ display: "flex", fontSize: 120, fontWeight: 700, color: accent, lineHeight: 1 }}>{code}</div>
        ) : null}
        <div style={{ display: "flex", fontSize: code ? 60 : 72, fontWeight: 700, lineHeight: 1.08, maxWidth: 1050 }}>
          {title}
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#a9b1c6", lineHeight: 1.3, maxWidth: 1000 }}>{subtitle}</div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 26 }}>
        <div style={{ display: "flex", fontWeight: 700 }}>
          <span>Checkpoint</span>
          <span style={{ color: "#2EF2FF", marginLeft: 8 }}>Academy</span>
        </div>
        <div style={{ display: "flex", color: "#a9b1c6" }}>{footer}</div>
      </div>
    </div>
  );
}
