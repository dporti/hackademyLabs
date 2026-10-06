import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSessionUser, localePath } from "@/lib/auth";
import { signOutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

// Panel autenticado (stub de F1.3; se desarrolla por rol en F1.4/F1.5).
export const instant = false;

export default async function PanelPage({
  params,
}: PageProps<"/[locale]/panel">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSessionUser();
  if (!session) redirect(localePath(locale, "/entrar"));
  const { profile } = session!;

  const t = await getTranslations("panel");
  const ta = await getTranslations("auth");
  const name = profile?.full_name ?? profile?.email ?? "";

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("greeting", { name })}
        </h1>
        <form action={signOutAction}>
          <input type="hidden" name="locale" value={locale} />
          <Button type="submit" variant="outline" size="sm">
            {ta("logout")}
          </Button>
        </form>
      </div>
      <p className="mt-4 text-muted-foreground">
        {t("roleLabel")}: <span className="font-medium">{profile?.role}</span>
      </p>
    </main>
  );
}
