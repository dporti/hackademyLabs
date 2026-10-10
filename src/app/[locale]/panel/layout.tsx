import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPendientesAlumno } from "@/lib/consumo";
import { AppShellNav, type AppShellItem } from "@/components/panel/app-shell-nav";

// AppShell del panel (DISENO.md §5): barra lateral por rol + contenido. La navegación
// depende de la sesión, así que va en <Suspense>; sin sesión no pinta nada (cada
// página ya redirige a /entrar).
export default async function PanelLayout({ children, params }: LayoutProps<"/[locale]/panel">) {
  const { locale } = await params;
  return (
    <main className="w-full flex-1">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10 lg:py-12">
        <Suspense fallback={<div aria-hidden className="h-12 rounded-xl border bg-card lg:h-64" />}>
          <PanelNav locale={locale} />
        </Suspense>
        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}

async function PanelNav({ locale }: { locale: string }) {
  const session = await getSessionUser();
  const role = session?.profile?.role;
  if (!session || !role) return null;

  const t = await getTranslations("appShell");
  const items: AppShellItem[] = [{ href: "/panel", label: t("items.inicio") }];
  let balance: { label: string; value: string; cta: string } | undefined;

  if (role === "alumno") {
    const sb = await createClient();
    // Abrir el panel cuenta como día activo (días/semana del tutor, racha).
    const [saldo, pendientes] = await Promise.all([
      sb.rpc("my_credit_balance"),
      getPendientesAlumno(session.user.id),
      sb.rpc("touch_activity"),
    ]);
    items.push(
      { href: "/panel/mapa", label: t("items.mapa") },
      { href: "/panel/bit", label: t("items.bit") },
      { href: "/panel/tickets", label: t("items.tickets"), badge: pendientes.ticketsRespondidos },
      { href: "/panel/sesiones", label: t("items.sesiones"), badge: pendientes.sesionesProximas },
      { href: "/panel/logros", label: t("items.logros") },
      { href: "/panel/creditos", label: t("items.creditos") },
    );
    const n = (saldo.data as number | null) ?? 0;
    balance = { label: t("balance"), value: t("balanceValue", { n }), cta: t("recharge") };
  } else if (role === "tutor_referencia") {
    items[0] = { href: "/panel", label: t("items.cartera") };
    items.push({ href: "/panel/checkins", label: t("items.checkins") });
  } else if (role === "mentor") {
    items.push(
      { href: "/panel/tickets", label: t("items.bolsa") },
      { href: "/panel/sesiones", label: t("items.sesiones") },
      { href: "/panel/materiales", label: t("items.materiales") },
    );
  } else if (role === "admin") {
    items.push({ href: "/panel/materiales", label: t("items.materiales") });
  }

  return (
    <div data-accent={role === "familia" || role === "tutor_referencia" ? "tutor" : undefined}>
      <AppShellNav
        roleLabel={t(`role.${role}`)}
        items={items}
        balance={balance}
        locale={locale}
        labels={{ nav: t("navAria"), menu: t("menu"), logout: t("logout") }}
      />
    </div>
  );
}
