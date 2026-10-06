import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente con service role: SALTA las políticas RLS. Usar SOLO en servidor y
// únicamente para operaciones controladas (insertar movimientos en credit_ledger,
// seeds, tareas de admin). Nunca importar desde código de cliente.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
