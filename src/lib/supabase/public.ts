import { createClient } from "@supabase/supabase-js";

// Cliente público sin cookies ni sesión, para leer el catálogo (datos públicos).
// Al no depender de cookies/headers, es apto para Server Components cacheados
// ("use cache") y generación estática (SEO).
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
