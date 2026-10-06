import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LoginForm } from "@/components/auth/login-form";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/entrar">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: `${t("loginTitle")} · Tutor247` };
}

export default async function EntrarPage({
  params,
}: PageProps<"/[locale]/entrar">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight">{t("loginTitle")}</h1>
      <div className="mt-6">
        <LoginForm locale={locale} />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/registro" className="underline">
          {t("goRegister")}
        </Link>
      </p>
    </main>
  );
}
