import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Destino del enlace del email de confirmación (y de futuros enlaces de auth).
// Vive en /api para quedar fuera del middleware de idioma: el locale viaja en `next`.
// Acepta los dos formatos de Supabase:
//   ?code=…                    PKCE (por defecto con @supabase/ssr; mismo navegador
//                              que hizo el registro, guarda el code_verifier en cookie)
//   ?token_hash=…&type=signup  plantilla de email con {{ .TokenHash }} (funciona
//                              aunque se abra en otro navegador/dispositivo)
// Crea la sesión (cookies) y redirige a `next`; si falla, a /entrar?error=link.

// Solo rutas internas: evita open redirect (`//evil.com`, `https://…`, `/\evil`).
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\"))
    return "/panel";
  return raw;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const sb = await createClient();
  let ok = false;
  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await sb.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  }

  if (ok) return NextResponse.redirect(new URL(next, origin));

  // Conserva el prefijo de idioma de `next` (/ca/…) para la página de error.
  const localePrefix = next.startsWith("/ca/") || next === "/ca" ? "/ca" : "";
  return NextResponse.redirect(new URL(`${localePrefix}/entrar?error=link`, origin));
}
