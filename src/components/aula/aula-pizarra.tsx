"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Trazo = { id: string; points: [number, number][]; color: string; width: number };
const COLORES = ["#2EF2FF", "#FF3DCB", "#7CFF5B", "#F5F7FF"];

// Pizarra compartida del aula (fase 9): cada trazo es una fila de `aula_stroke`
// (coordenadas 0–1, independientes del tamaño de pantalla) y llega al otro por
// Realtime. «Borrar todo» elimina los trazos de la reserva.
export function AulaPizarra({ bookingId }: { bookingId: string }) {
  const t = useTranslations("aula");
  const sb = useMemo(() => createClient(), []);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const [trazos, setTrazos] = useState<Trazo[]>([]);
  const [color, setColor] = useState(COLORES[0]);
  const actual = useRef<[number, number][] | null>(null);

  const pintar = useCallback(
    (lista: Trazo[], enCurso?: [number, number][] | null) => {
      const c = lienzo.current;
      if (!c) return;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      const { width: w, height: h } = c;
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const dibuja = (pts: [number, number][], col: string, ancho: number) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = ancho * (w / 800);
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * w, y * h) : ctx.moveTo(x * w, y * h)));
        if (pts.length === 1) ctx.lineTo(pts[0][0] * w + 0.1, pts[0][1] * h);
        ctx.stroke();
      };
      for (const s of lista) dibuja(s.points, s.color, s.width);
      if (enCurso) dibuja(enCurso, color, 3);
    },
    [color],
  );

  useEffect(() => {
    let vivo = true;
    sb.from("aula_stroke")
      .select("id, points, color, width")
      .eq("booking_id", bookingId)
      .order("created_at")
      .then(({ data }) => vivo && setTrazos((data ?? []) as Trazo[]));
    const canal = sb
      .channel(`aula-pizarra-${bookingId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "aula_stroke", filter: `booking_id=eq.${bookingId}` }, (p) =>
        setTrazos((l) => (l.some((x) => x.id === (p.new as Trazo).id) ? l : [...l, p.new as Trazo])),
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "aula_stroke", filter: `booking_id=eq.${bookingId}` }, (p) =>
        setTrazos((l) => l.filter((x) => x.id !== (p.old as { id: string }).id)),
      )
      .subscribe();
    return () => {
      vivo = false;
      sb.removeChannel(canal);
    };
  }, [sb, bookingId]);

  // Tamaño real del lienzo = tamaño en pantalla (nitidez) y repintado.
  useEffect(() => {
    const c = lienzo.current;
    if (!c) return;
    const ajustar = () => {
      const r = c.getBoundingClientRect();
      c.width = Math.round(r.width * devicePixelRatio);
      c.height = Math.round(r.height * devicePixelRatio);
      pintar(trazos);
    };
    ajustar();
    const ro = new ResizeObserver(ajustar);
    ro.observe(c);
    return () => ro.disconnect();
  }, [trazos, pintar]);

  const punto = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [
      Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    ];
  };

  async function terminar() {
    const pts = actual.current;
    actual.current = null;
    if (!pts?.length) return;
    // Simplifica: como mucho 2000 puntos con 3 decimales.
    const points = pts.slice(0, 2000).map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]);
    const { data } = await sb
      .from("aula_stroke")
      .insert({ booking_id: bookingId, points, color, width: 3 })
      .select("id, points, color, width")
      .single();
    if (data) setTrazos((l) => (l.some((x) => x.id === data.id) ? l : [...l, data as Trazo]));
  }

  async function borrar() {
    setTrazos([]);
    await sb.from("aula_stroke").delete().eq("booking_id", bookingId);
  }

  return (
    <section aria-labelledby="pizarra-t" className="rounded-2xl border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-divider px-4 py-2.5">
        <h2 id="pizarra-t" className="font-mono text-sm font-semibold">
          {t("boardTitle")}
        </h2>
        <div className="flex items-center gap-1.5">
          {COLORES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={t("color", { c })}
              aria-pressed={color === c}
              className={cn("size-8 rounded-full border-2", color === c ? "border-foreground" : "border-transparent")}
              style={{ backgroundColor: c }}
            />
          ))}
          <button type="button" onClick={borrar} className="ml-2 h-9 rounded-[8px] border border-border px-3 text-xs hover:border-primary">
            {t("boardClear")}
          </button>
        </div>
      </header>
      <canvas
        ref={lienzo}
        role="img"
        aria-label={t("boardAria")}
        className="block aspect-[16/9] w-full cursor-crosshair touch-none rounded-b-2xl bg-background"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          actual.current = [punto(e)];
          pintar(trazos, actual.current);
        }}
        onPointerMove={(e) => {
          if (!actual.current) return;
          actual.current.push(punto(e));
          pintar(trazos, actual.current);
        }}
        onPointerUp={terminar}
        onPointerCancel={terminar}
      />
    </section>
  );
}
