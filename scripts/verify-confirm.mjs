// Verifica /api/auth/confirm (enlace del email de confirmación) contra la BD real:
// genera un enlace de signup con admin.generateLink y llama al endpoint como lo haría
// el email (token_hash), más casos negativos y de open redirect.
// Requiere el servidor en marcha: npm run dev (http://localhost:3000).
// Uso: node scripts/verify-confirm.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const env=Object.fromEntries(readFileSync(new URL("../.env.local", import.meta.url),"utf8").split("\n").filter(l=>l.includes("=")&&!l.startsWith("#")).map(l=>[l.slice(0,l.indexOf("=")).trim(),l.slice(l.indexOf("=")+1).trim()]));
const a=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const base="http://localhost:3000/api/auth/confirm";
const email=`test.confirm.${Date.now()}@tutor247.dev`;
let ok=true; const check=(l,c,x="")=>{console.log(`${c?"✓":"✗"} ${l}${x?" → "+x:""}`); if(!c) ok=false;};
const get=(u)=>fetch(u,{redirect:"manual"});

// 1. Registro sin confirmar (como signUp con "Confirm email" activo).
const {data:gl,error}=await a.auth.admin.generateLink({type:"signup",email,password:"Tutor247Dev!",options:{data:{full_name:"Test Confirm",role:"alumno"}}});
check("generateLink signup", !error, error?.message);
const uid=gl?.user?.id;
check("usuario sin confirmar", gl?.user && !gl.user.email_confirmed_at);

// 2. Login antes de confirmar → email_not_confirmed.
const anon=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false}});
const {error:liErr}=await anon.auth.signInWithPassword({email,password:"Tutor247Dev!"});
check("login sin confirmar da email_not_confirmed", liErr?.code==="email_not_confirmed", liErr?.code);

// 3. Enlace válido → redirige a next y deja cookies de sesión.
const r=await get(`${base}?token_hash=${gl.properties.hashed_token}&type=signup&next=${encodeURIComponent("/ca/onboarding")}`);
const loc=r.headers.get("location"); const cookies=r.headers.getSetCookie?.() ?? [];
check("enlace válido redirige a /ca/onboarding", r.status>=300&&r.status<400&&loc?.endsWith("/ca/onboarding"), `${r.status} ${loc}`);
check("crea cookie de sesión", cookies.some(c=>c.includes("auth-token")), `${cookies.length} cookies`);
const {data:u}=await a.auth.admin.getUserById(uid);
check("email confirmado", !!u?.user?.email_confirmed_at);

// 4. Reutilizar el enlace → error=link conservando idioma.
const r2=await get(`${base}?token_hash=${gl.properties.hashed_token}&type=signup&next=${encodeURIComponent("/ca/onboarding")}`);
check("enlace usado → /ca/entrar?error=link", r2.headers.get("location")?.endsWith("/ca/entrar?error=link"), r2.headers.get("location"));

// 5. Sin token / basura → /entrar?error=link.
const r3=await get(`${base}?code=basura`);
check("code inválido → /entrar?error=link", r3.headers.get("location")?.endsWith("/entrar?error=link"), r3.headers.get("location"));

// 6. Open redirect: next externo se ignora.
// "/\evil.com" se construye con charCode para no depender de escapes.
for (const evil of ["//evil.com","https://evil.com","/"+String.fromCharCode(92)+"evil.com"]) {
  const {data:g2}=await a.auth.admin.generateLink({type:"magiclink",email});
  const r4=await get(`${base}?token_hash=${g2.properties.hashed_token}&type=magiclink&next=${encodeURIComponent(evil)}`);
  const l4=r4.headers.get("location")??"";
  check(`next=${evil} no sale del sitio`, l4.startsWith("http://localhost:3000/") && !l4.includes("evil"), l4);
}

await a.auth.admin.deleteUser(uid);
console.log(ok?"\nTodo OK":"\nHAY FALLOS");
process.exitCode=ok?0:1;
