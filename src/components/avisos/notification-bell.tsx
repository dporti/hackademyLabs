"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// Campana del header (fase C): últimos avisos del usuario, contador de no leídos y
// llegada en tiempo real (Realtime respeta la RLS: cada uno solo recibe los suyos).
// Al abrirla se marcan como leídos.

interface Aviso {
  id: string;
  kind: string;
  payload: Record<string, string | number | null>;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export function NotificationBell({ userId, locale }: { userId: string; locale: string }) {
  const t = useTranslations("notif");
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [open, setOpen] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sb = createClient();
    let vivo = true;
    const cargar = () =>
      sb
        .from("notification")
        .select("id, kind, payload, link, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(15)
        .then(({ data }) => {
          if (vivo) setAvisos((data ?? []) as Aviso[]);
        });
    cargar();
    // El canal debe ir con el token del usuario: si se suscribe antes de recuperar la
    // sesión, va como anónimo y la RLS no deja pasar ningún evento.
    let canal: ReturnType<typeof sb.channel> | null = null;
    sb.auth.getSession().then(async ({ data }) => {
      if (!vivo) return;
      if (data.session) await sb.realtime.setAuth(data.session.access_token);
      canal = sb
        .channel(`notif:${userId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "notification", filter: `user_id=eq.${userId}` }, () => {
          cargar();
        })
        .subscribe();
    });
    return () => {
      vivo = false;
      if (canal) sb.removeChannel(canal);
    };
  }, [userId]);

  // Cerrar al pulsar fuera o con Escape.
  useEffect(() => {
    if (!open) return;
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const sinLeer = avisos.filter((a) => !a.read_at).length;
  const fmt = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  });
  const texto = (a: Aviso) => {
    const p = a.payload ?? {};
    const cuando = typeof p.starts_at === "string" ? fmt.format(new Date(p.starts_at)) : "";
    return t(`kind.${a.kind}`, {
      modulo: String(p.modulo ?? ""),
      mentor: String(p.mentor ?? ""),
      n: Number(p.n ?? 1),
      when: cuando,
      subject: String(p.subject ?? ""),
    });
  };

  const abrir = () => {
    const nuevo = !open;
    setOpen(nuevo);
    if (nuevo && sinLeer > 0) {
      const ahora = new Date().toISOString();
      setAvisos((as) => as.map((a) => (a.read_at ? a : { ...a, read_at: ahora })));
      createClient().rpc("mark_notifications_read", { p_ids: null });
    }
  };

  return (
    <div ref={caja} className="relative">
      <button
        type="button"
        onClick={abrir}
        aria-expanded={open}
        aria-label={sinLeer > 0 ? t("aria", { n: sinLeer }) : t("ariaNone")}
        className="relative inline-flex size-11 items-center justify-center rounded-[10px] border border-[#3a3f5c] text-foreground transition-colors hover:border-primary"
      >
        <Bell aria-hidden className="size-5" />
        {sinLeer > 0 && (
          <span
            aria-hidden
            className="absolute -top-1.5 -right-1.5 grid min-w-5 place-items-center rounded-full bg-primary px-1 font-mono text-[11px] font-bold text-primary-foreground"
          >
            {sinLeer > 9 ? "9+" : sinLeer}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(92vw,360px)] rounded-2xl border bg-card p-2 shadow-xl">
          <p className="px-3 pt-2 pb-1 font-mono text-xs tracking-[0.15em] text-label uppercase">{t("title")}</p>
          {avisos.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto">
              {avisos.map((a) => {
                const cuerpo = (
                  <>
                    <span className="block text-sm">{texto(a)}</span>
                    <span className="mt-0.5 block font-mono text-[11px] text-label first-letter:uppercase">
                      {fmt.format(new Date(a.created_at))}
                    </span>
                  </>
                );
                const cls = cn("block rounded-xl px-3 py-2.5", a.link && "hover:bg-tint-primary");
                return (
                  <li key={a.id}>
                    {a.link ? (
                      // Rutas internas guardadas por la BD (CHECK link like '/%').
                      <Link href={a.link as "/panel"} onClick={() => setOpen(false)} className={cls}>
                        {cuerpo}
                      </Link>
                    ) : (
                      <div className={cls}>{cuerpo}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
