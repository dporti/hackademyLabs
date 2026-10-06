import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Wrappers de navegación conscientes del locale. Usar estos (Link, useRouter…)
// en lugar de los de next/navigation para que respeten el prefijo de idioma.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
