import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasSession, localePath } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { RegistroForm } from "@/components/auth/registro-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { Gift } from "lucide-react";

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
  const tw = await getTranslations("welcome");

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
      <p className="mb-5 flex items-center gap-2 rounded-xl border border-tint-pass-border bg-tint-pass px-3 py-2.5 text-sm">
        <Gift aria-hidden className="size-4 shrink-0 text-accent-pass" />
        {tw("text")}
      </p>
      <RegistroForm locale={locale} defaultRole={rol} />
    </AuthShell>
  );
}
