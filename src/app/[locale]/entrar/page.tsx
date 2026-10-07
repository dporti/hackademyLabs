import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasSession, localePath } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { AuthShell } from "@/components/auth/auth-shell";

// Lee la sesión (cookies) → siempre dinámica.
export const instant = false;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/entrar">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: `${t("loginTitle")} · Tutor247` };
}

// Errores admitidos por URL (lista cerrada: nada de texto arbitrario en la UI).
const URL_ERRORS = ["link"];

export default async function EntrarPage({
  params,
  searchParams,
}: PageProps<"/[locale]/entrar">) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Con sesión no tiene sentido entrar/registrarse: al panel (p. ej. "Comprar"
  // desde /precios lleva aquí y el alumno ya logueado acaba en sus packs).
  if (await hasSession()) redirect(localePath(locale, "/panel"));
  const t = await getTranslations("auth");
  const sp = await searchParams;
  const urlError = typeof sp.error === "string" ? sp.error : "";

  return (
    <AuthShell
      title={t("loginTitle")}
      subtitle={t("loginSubtitle")}
      footer={
        <>
          {t("noAccount")}{" "}
          <Link href="/registro" className="text-primary underline-offset-4 hover:underline">
            {t("goRegister")}
          </Link>
        </>
      }
    >
      <LoginForm
        locale={locale}
        initialError={URL_ERRORS.includes(urlError) ? urlError : undefined}
      />
    </AuthShell>
  );
}
