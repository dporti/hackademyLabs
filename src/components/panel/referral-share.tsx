"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

// Código + copiar enlace + compartir por WhatsApp (sin dar el número de nadie).
export function ReferralShare({ code, url, whatsappText }: { code: string; url: string; whatsappText: string }) {
  const t = useTranslations("referidos");
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      /* sin portapapeles: el enlace está visible para copiarlo a mano */
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="rounded-[10px] border border-dashed border-tint-primary-border bg-background px-4 py-2.5 font-mono text-lg font-semibold tracking-[0.15em] text-primary">
        {code}
      </span>
      <button
        type="button"
        onClick={copiar}
        className="inline-flex min-h-11 items-center rounded-[10px] bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/85"
      >
        {copiado ? t("copied") : t("copy")}
      </button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center rounded-[10px] border border-border px-4 text-sm font-semibold hover:border-primary"
      >
        WhatsApp
      </a>
      <span className="w-full font-mono text-xs break-all text-label">{url}</span>
    </div>
  );
}
