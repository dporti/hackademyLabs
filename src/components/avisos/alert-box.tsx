import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDemandaPublica } from "@/lib/catalog";
import { cancelAlertAction } from "@/app/actions/avisos";
import { AlertForm } from "@/components/avisos/alert-form";

// Caja «Avísame cuando haya mentor» de un módulo (fase C). Lee la sesión: va dentro de
// <Suspense> en páginas públicas. Alumno con alerta abierta → estado + cancelar; alumno
// sin alerta → un clic; sin sesión → email; otros roles → solo la explicación.
export async function AlertBox({ locale, modulo }: { locale: string; modulo: string }) {
  const [t, session, demanda] = await Promise.all([getTranslations("avisos"), getSessionUser(), getDemandaPublica()]);
  const role = session?.profile?.role;
  const esperando = demanda.find((d) => d.modulo_code === modulo)?.waiting ?? 0;

  let abierta: { id: string } | null = null;
  if (role === "alumno") {
    const sb = await createClient();
    const { data: mod } = await sb.from("modulo").select("id").eq("code", modulo).maybeSingle();
    if (mod) {
      const { data } = await sb
        .from("module_alert")
        .select("id")
        .eq("modulo_id", mod.id)
        .eq("status", "open")
        .maybeSingle();
      abierta = data;
    }
  }

  return (
    <div className="rounded-2xl border border-tint-primary-border bg-card p-5">
      <p className="font-heading text-lg font-semibold">{t("title", { code: modulo })}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t("help")}</p>
      {esperando > 0 && <p className="mt-2 font-mono text-xs text-label">{t("waiting", { n: esperando })}</p>}
      <div className="mt-4">
        {abierta ? (
          <div className="space-y-2">
            <p role="status" className="rounded-[10px] border border-tint-pass-border bg-tint-pass p-3 text-sm">
              {t("active", { code: modulo })}
            </p>
            <form action={cancelAlertAction}>
              <input type="hidden" name="alert" value={abierta.id} />
              <button type="submit" className="min-h-10 text-sm text-label hover:text-foreground">
                {t("cancel")}
              </button>
            </form>
          </div>
        ) : role && role !== "alumno" ? null : (
          <AlertForm locale={locale} modulo={modulo} logged={role === "alumno"} />
        )}
      </div>
    </div>
  );
}
