"use client";

import { useEffect, useId, useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";

// Menú desplegable del header en móvil (< lg). Se cierra al navegar y con Escape.
export function MobileMenu({
  label,
  navLabel,
  links,
  children,
}: {
  label: string;
  navLabel: string;
  links: { href: string; label: string }[];
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const id = useId();

  // Cerrar al cambiar de ruta (el header vive en el layout y no se desmonta).
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className="grid size-11 place-items-center rounded-[10px] border border-border text-foreground"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {open && (
        <nav
          id={id}
          aria-label={navLabel}
          className="absolute inset-x-0 top-full border-b border-divider bg-background px-4 pb-4 sm:px-6"
        >
          <ul className="flex flex-col">
            {links.map((l) => (
              <li key={l.href + l.label}>
                <Link
                  href={l.href}
                  className="flex min-h-11 items-center border-b border-divider text-[15px] text-[#c5c9da] hover:text-foreground"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          {children && <div className="pt-3">{children}</div>}
        </nav>
      )}
    </div>
  );
}
