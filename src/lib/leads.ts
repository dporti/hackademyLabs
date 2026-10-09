import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Lead } from "@/lib/db-types";

// Contactos sin cuenta para el panel de admin. Con la sesión del admin: la RLS
// (lead_admin) solo deja leer a admins. Nuevos primero, luego por fecha.
export async function getLeads(): Promise<Lead[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("lead").select("*").order("created_at", { ascending: false }).limit(100);
  if (error) {
    // Si la migración aún no se ha aplicado, el panel sigue funcionando sin la sección.
    console.error("[leads]", error.message);
    return [];
  }
  const orden = { nuevo: 0, contactado: 1, cerrado: 2 } as const;
  return ((data ?? []) as Lead[]).sort((a, b) => orden[a.status] - orden[b.status]);
}
