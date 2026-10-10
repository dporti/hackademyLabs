import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSessionUser, localePath } from "@/lib/auth";
import { getMapaAlumno } from "@/lib/mapa";
import { Link } from "@/i18n/navigation";
import { MapaModuloView } from "@/components/mapa/mapa-modulo";
import { cn } from "@/lib/utils";

// Mapa de Dominio guardado del alumno (fase 7, maqueta Mapa.html): un módulo cada vez
// (?m=código), con su progreso por RA y el plan inverso hasta el examen.
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/panel/mapa">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "mapa" });
  return { title: t("title"), robots: { index: false } };
}

export default async function MapaPage({ params, searchParams }: PageProps<"/[locale]/panel/mapa">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getSessionUser();
  if (!session) redirect(localePath(locale, "/entrar"));
  if (session!.profile?.role !== "alumno") redirect(localePath(locale, "/panel"));

  const t = await getTranslations("mapa");
  const sp = await searchParams;
  const pedido = typeof sp.m === "string" ? sp.m : undefined;
  const modulos = await getMapaAlumno(session!.user.id);
  const actual = modulos.find((m) => m.code === pedido) ?? modulos[0];
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div className="w-full space-y-8">
      <header>
        <h1 className="font-heading text-[32px] leading-tight font-bold tracking-tight sm:text-[40px]">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("subtitle")}</p>
      </header>

      {modulos.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-6">
          <p className="text-muted-foreground">{t("noModules")}</p>
          <Link
            href="/panel#mis-modulos"
            className="mt-3 inline-flex min-h-11 items-center rounded-[10px] bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/85"
          >
            {t("addModule")}
          </Link>
        </div>
      ) : (
        <>
          <nav aria-label={t("modulesAria")} className="flex flex-wrap gap-2">
            {modulos.map((m) => (
              <Link
                key={m.code}
                href={`/panel/mapa?m=${m.code}`}
                aria-current={m.code === actual.code ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-[10px] border px-4 text-sm transition-colors",
                  m.code === actual.code
                    ? "border-tint-primary-border bg-tint-primary text-primary"
                    : "text-muted-foreground hover:border-primary hover:text-foreground",
                )}
              >
                <span className="font-mono font-semibold">{m.code}</span>
                <span className="max-w-48 truncate">{m.name}</span>
              </Link>
            ))}
            <Link
              href="/panel#mis-modulos"
              className="inline-flex min-h-11 items-center rounded-[10px] border border-dashed px-4 text-sm text-label hover:text-foreground"
            >
              + {t("addModule")}
            </Link>
          </nav>
          <MapaModuloView locale={locale} modulo={actual} hoy={hoy} viewer="alumno" studentId={session!.user.id} />
        </>
      )}
    </div>
  );
}
