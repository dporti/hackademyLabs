"use client";

import { useEffect, useId, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { signOutAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

export interface AppShellItem {
  href: string;
  label: string;
  // Contador opcional (p. ej. tickets respondidos).
  badge?: number;
}

// Navegación del panel (maqueta Creditos.html): barra lateral en escritorio y menú
// desplegable en móvil. El enlace activo se marca con aria-current.
export function AppShellNav({
  roleLabel,
  items,
  balance,
  locale,
  labels,
}: {
  roleLabel: string;
  items: AppShellItem[];
  balance?: { label: string; value: string; cta: string };
  locale: string;
  labels: { nav: string; menu: string; logout: string };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const id = useId();

  // Cerrar el desplegable al navegar (el layout no se desmonta).
  const [prev, setPrev] = useState(pathname);
  if (prev !== pathname) {
    setPrev(pathname);
    setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const activo = (href: string) => (href === "/panel" ? pathname === "/panel" : pathname.startsWith(href));
  const actual = items.find((i) => activo(i.href));

  const lista = (
    <ul className="space-y-1">
      {items.map((it) => (
        <li key={it.href}>
          <Link
            href={it.href}
            aria-current={activo(it.href) ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center justify-between gap-2 rounded-[10px] px-3 text-[15px] transition-colors",
              activo(it.href)
                ? "bg-tint-primary text-primary"
                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
            )}
          >
            {it.label}
            {!!it.badge && (
              <span className="rounded-md bg-primary px-1.5 font-mono text-xs font-bold text-primary-foreground">
                {it.badge}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );

  const saldo = balance && (
    <div className="rounded-2xl border border-tint-primary-border bg-tint-primary p-4">
      <p className="font-mono text-xs tracking-[0.2em] text-label uppercase">{balance.label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold text-primary">{balance.value}</p>
      <Link
        href="/panel/creditos"
        className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-[10px] bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/85"
      >
        {balance.cta}
      </Link>
    </div>
  );

  const salir = (
    <form action={signOutAction}>
      <input type="hidden" name="locale" value={locale} />
      <button
        type="submit"
        className="flex min-h-11 w-full items-center gap-2 rounded-[10px] px-3 text-[15px] text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
      >
        <LogOut aria-hidden className="size-4" />
        {labels.logout}
      </button>
    </form>
  );

  return (
    <>
      {/* Escritorio: barra lateral fija */}
      <aside className="hidden lg:block">
        <nav aria-label={labels.nav} className="sticky top-24 space-y-5">
          <p className="px-3 font-mono text-xs font-semibold tracking-[0.2em] text-label uppercase">{roleLabel}</p>
          {lista}
          {saldo}
          {salir}
        </nav>
      </aside>

      {/* Móvil: desplegable bajo el header */}
      <div className="lg:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-12 w-full items-center justify-between rounded-xl border bg-card px-4 text-left"
        >
          <span>
            <span className="block font-mono text-[10px] tracking-[0.2em] text-label uppercase">
              {labels.menu} · {roleLabel}
            </span>
            <span className="block font-medium">{actual?.label ?? items[0]?.label}</span>
          </span>
          <ChevronDown aria-hidden className={cn("size-5 transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <nav id={id} aria-label={labels.nav} className="mt-2 space-y-4 rounded-xl border bg-card p-3">
            {lista}
            {saldo}
            {salir}
          </nav>
        )}
      </div>
    </>
  );
}
