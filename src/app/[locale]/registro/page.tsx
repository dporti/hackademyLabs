import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasSession, localePath } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { RegistroForm } from "@/components/auth/registro-form";

// Lee ?rol= para preseleccionar → ruta dinámica.
export const instant = false;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/registro">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: `${t("registerTitle")} · Tutor247` };
}

export default async function RegistroPage({
  params,
  searchParams,
}: PageProps<"/[locale]/registro">) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Con sesión no tiene sentido entrar/registrarse: al panel (p. ej. "Comprar"
  // desde /precios lleva aquí y el alumno ya logueado acaba en sus packs).
  if (await hasSession()) redirect(localePath(locale, "/panel"));
  const sp = await searchParams;
  const rol = typeof sp.rol === "string" ? sp.rol : "alumno";
  const t = await getTranslations("auth");

  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight">{t("registerTitle")}</h1>
      <div className="mt-6">
        <RegistroForm locale={locale} defaultRole={rol} />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link href="/entrar" className="underline">
          {t("goLogin")}
        </Link>
      </p>
    </main>
  );
}
