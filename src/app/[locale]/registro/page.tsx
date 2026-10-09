import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasSession, localePath } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { RegistroForm } from "@/components/auth/registro-form";
import { AuthShell } from "@/components/auth/auth-shell";

// Lee ?rol= para preseleccionar → ruta dinámica.
export const instant = false;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/registro">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("registerTitle") };
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
    <AuthShell
      title={t("registerTitle")}
      subtitle={t("registerSubtitle")}
      footer={
        <>
          {t("haveAccount")}{" "}
          <Link href="/entrar" className="text-primary underline-offset-4 hover:underline">
            {t("goLogin")}
          </Link>
        </>
      }
    >
      <RegistroForm locale={locale} defaultRole={rol} />
    </AuthShell>
  );
}
