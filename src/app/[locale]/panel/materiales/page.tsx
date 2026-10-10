import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSessionUser, localePath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteMaterialAction, reviewMaterialAction } from "@/app/actions/material";
import { MaterialForm } from "@/components/panel/material-form";
import { Button } from "@/components/ui/button";

// Banco de material por RA (fase 8): lo que Bit usa para responder (RAG). Mentor: lo
// suyo, en los módulos que imparte. Admin: todo, y decide qué está revisado.
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/panel/materiales">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "materiales" });
  return { title: t("title"), robots: { index: false } };
}

export default async function MaterialesPage({ params }: PageProps<"/[locale]/panel/materiales">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getSessionUser();
  if (!session) redirect(localePath(locale, "/entrar"));
  const role = session!.profile?.role;
  if (role !== "mentor" && role !== "admin") redirect(localePath(locale, "/panel"));
  const esAdmin = role === "admin";

  const t = await getTranslations("materiales");
  const sb = await createClient();
  type Mod = { code: string; name: string; ra: { code: string; sort_order: number }[] };
  const modsQuery = esAdmin
    ? sb.from("modulo").select("code, name, ra(code, sort_order)").order("code")
    : sb
        .from("mentor_modulo")
        .select("modulo(code, name, ra(code, sort_order))")
        .eq("mentor_id", session!.user.id);
  const [{ data: modsRaw }, { data: mats }] = await Promise.all([
    modsQuery,
    sb
      .from("material")
      .select("id, title, body, reviewed, author_id, created_at, modulo(code), ra(code)")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  const mods: Mod[] = esAdmin
    ? ((modsRaw ?? []) as unknown as Mod[])
    : ((modsRaw ?? []) as unknown as { modulo: Mod }[]).map((x) => x.modulo);
  const modulos = mods
    .map((m) => ({ code: m.code, name: m.name, ras: [...m.ra].sort((a, b) => a.sort_order - b.sort_order).map((r) => r.code) }))
    .sort((a, b) => a.code.localeCompare(b.code));
  type Mat = {
    id: string;
    title: string;
    body: string;
    reviewed: boolean;
    author_id: string | null;
    created_at: string;
    modulo: { code: string } | null;
    ra: { code: string } | null;
  };
  const lista = (mats ?? []) as unknown as Mat[];

  return (
    <div className="w-full space-y-10">
      <header>
        <h1 className="font-heading text-[32px] leading-tight font-bold tracking-tight sm:text-[40px]">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{esAdmin ? t("subtitleAdmin") : t("subtitleMentor")}</p>
      </header>

      <section aria-labelledby="nuevo" className="rounded-3xl border bg-card p-5 sm:p-7">
        <h2 id="nuevo" className="mb-5 font-heading text-2xl font-bold">
          {t("newTitle")}
        </h2>
        <MaterialForm locale={locale} modulos={modulos} />
      </section>

      <section aria-labelledby="lista">
        <h2 id="lista" className="font-heading text-2xl font-bold">
          {t("listTitle")}
        </h2>
        {lista.length === 0 ? (
          <p className="mt-2 text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {lista.map((m) => (
              <li key={m.id} className="rounded-2xl border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-primary">
                      {m.modulo?.code}
                      {m.ra && ` · ${m.ra.code}`}
                    </p>
                    <p className="mt-0.5 font-semibold">{m.title}</p>
                  </div>
                  <span
                    className={`rounded-md border px-2 py-0.5 text-xs ${m.reviewed ? "border-tint-pass-border text-accent-pass" : "border-tint-warning-border text-warning"}`}
                  >
                    {m.reviewed ? `✓ ${t("reviewed")}` : `◐ ${t("pending")}`}
                  </span>
                </div>
                <details className="mt-2">
                  <summary className="min-h-10 cursor-pointer text-sm text-label">{t("show")}</summary>
                  <p className="mt-2 font-mono text-sm whitespace-pre-wrap text-muted-foreground">{m.body}</p>
                </details>
                <div className="mt-3 flex flex-wrap gap-2">
                  {esAdmin && (
                    <form action={reviewMaterialAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="reviewed" value={m.reviewed ? "false" : "true"} />
                      <Button type="submit" size="sm" variant={m.reviewed ? "outline" : "default"} className="h-10 rounded-[10px]">
                        {m.reviewed ? t("unreview") : t("review")}
                      </Button>
                    </form>
                  )}
                  {(esAdmin || (!m.reviewed && m.author_id === session!.user.id)) && (
                    <form action={deleteMaterialAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={m.id} />
                      <Button type="submit" size="sm" variant="ghost" className="h-10 rounded-[10px]">
                        {t("delete")}
                      </Button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
