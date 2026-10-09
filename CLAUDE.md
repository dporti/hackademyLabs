# Checkpoint Academy (+ Tutor247) — Guía del proyecto (CLAUDE.md)

Plataforma web de FP de informática (SMX, ASIR/ASIX, DAM, DAW). Marca **Checkpoint
Academy** con dos productos: **Aprueba tu módulo** y **Tutor247**. Modelo:
**"No vendemos clases: te sacamos el módulo."** Catálogo por módulo oficial →
plan → mentor → seguimiento hasta el examen.

Fuente de verdad del negocio: `docs/modelo-negocio-v1.md`, `docs/capa-ia-v1.md`,
`docs/segmentos-tutor247-v1.md`. **Leerlos antes de cambiar reglas de negocio.**
Si el código contradice los docs, ganan los docs (o preguntar).

## Estado del proyecto (obligatorio)
- **Al empezar cada sesión, leer `docs/ESTADO.md`** para retomar el contexto.
- **Al terminar cada tarea o fase, actualizar `docs/ESTADO.md` sin que lo pidan**:
  mover tareas de "En curso" a "Hecho" (con fecha AAAA-MM-DD y commit si aplica),
  añadir decisiones tomadas y actualizar próximos pasos.
- **Nunca** escribir claves, contraseñas ni secretos en `docs/ESTADO.md`.

## Idioma y convenciones
- Interfaz y comentarios de código **en español**.
- Textos de UI **siempre** vía i18n (`next-intl`), nunca hardcodeados. `es` por
  defecto, `ca` (catalán) preparado. Añadir claves en `messages/es.json` **y**
  `messages/ca.json`.
- Los **códigos de módulo** (0485, 0484…) son universales: nunca se traducen.
  Los **nombres** de módulo/ciclo sí.
- Entorno de desarrollo: **Windows + PowerShell**.

## Stack
- Next.js 16 (App Router, Turbopack) + TypeScript + React 19.
- Tailwind v4 + shadcn/ui (**ojo: esta versión de shadcn usa Base UI, no Radix**).
- `next-intl` v4 con routing por locale (`localePrefix: "as-needed"`).
- Supabase: Postgres + Auth + Storage + RLS.
- Stripe: Fase 1 **mock** (sin cobro real); real en fase posterior.
- Deploy: Vercel.

## Estructura de carpetas
```
docs/                         Documentos de negocio (fuente de verdad)
  diseno/                     Referencia visual: DISENO.md (manda en el aspecto) + pantallas/
messages/                     Traducciones i18n: es.json, ca.json
patches/                      Parches a dependencias (patch-package)
src/
  app/[locale]/               Rutas con prefijo de idioma (layout raíz aquí)
    layout.tsx                <html>, fuentes, NextIntlClientProvider
    page.tsx                  Home (doble entrada + buscador de módulo)
  components/ui/              Componentes shadcn (Base UI)
  i18n/
    routing.ts                locales, defaultLocale, localePrefix
    navigation.ts             Link/useRouter conscientes del locale (usar ESTOS)
    request.ts                Carga de mensajes por petición
  lib/
    supabase/
      client.ts               Cliente browser (anon key) — RLS manda
      server.ts               Cliente SSR (cookies) para RSC/actions
      admin.ts                Cliente service role (SALTA RLS) — solo servidor
    utils.ts                  cn() y utilidades
  proxy.ts                    Middleware next-intl (Next 16 lo llama "proxy")
```

## Comandos (PowerShell)
```powershell
npm run dev      # desarrollo (http://localhost:3000)
npm run build    # build de producción (incluye typecheck)
npm start        # servir build de producción
npm run lint     # eslint
```
Rutas: `/` = español (sin prefijo), `/ca` = catalán.

## Reglas de arquitectura (no romper)
- **Créditos = ledger inmutable.** Tabla `credit_ledger` append-only. El saldo se
  CALCULA (`SUM(amount)` de movimientos no caducados), nunca se guarda como campo
  editable. Inserciones de movimientos SOLO desde servidor con service role.
- **RLS en todas las tablas.** El cliente usa anon key; la seguridad vive en las
  políticas, no en el código de cliente. `admin.ts` (service role) solo en servidor
  y solo para operaciones controladas (ledger, seeds, admin).
- **Anti-bypass:** datos de contacto ocultos; pago y comunicación siempre en la
  plataforma. No exponer email/teléfono de mentores en API ni UI públicas.
- **Integridad académica:** la plataforma/IA nunca hace prácticas ni exámenes.
- **Multi-ciclo:** un módulo (código único) se vincula a varios ciclos vía tabla
  N:M `ciclo_modulo` (p. ej. 0373 está en DAM/DAW y ASIR).
- **Menores / consentimiento:** modo Familia para <18; compartir informes con la
  familia de un alumno mayor de edad requiere su consentimiento explícito.

## Identidad visual (Checkpoint Academy)
**Referencia visual: `docs/diseno/`.** `docs/diseno/DISENO.md` **manda en el aspecto**
(marca, colores, tokens, componentes, composición de pantallas); `docs/diseno/pantallas/*.html`
son la maqueta (no se copian tal cual: se reconstruyen con componentes, tokens e i18n).
Datos, lógica, seguridad e i18n siguen este CLAUDE.md. Si chocan, preguntar a David.

Decisiones de marca (cerradas 2026-10-09, DISENO.md §2):
- **Marca: Checkpoint Academy**, con **Tutor247** como segundo producto. `hackademyLabs`
  queda solo como nombre del repositorio.
- **Dos modelos, dos colores**: **cian `#2EF2FF`** (`--primary`) = **Aprueba tu módulo**
  (créditos / Plan Módulo); **magenta `#FF3DCB`** (`--secondary`, sustituye al violeta) =
  **Tutor247** (suscripción, acompañamiento todo el curso). Verde `#7CFF5B`
  (`--accent-pass`) **solo** para aprobado/dominado/"va bien".
- **Tema oscuro único** (`data-theme="student"`): **se elimina el tema `family`**; landing y
  panel de familia van en oscuro con magenta de acento, vigilando contraste AA.
- **Fuentes**: **Space Grotesk** títulos (`--font-heading`), **Inter** texto y paneles
  (`--font-sans`), **JetBrains Mono** códigos, RA, cifras y etiquetas (`--font-mono`).
- **Ruta de Tutor247: `/tutor247`**; `/familias` redirige (308) a `/tutor247#familias`.

Más reglas:
- Tokens en `src/app/globals.css` (tabla completa en DISENO.md §4). Mapa de Dominio a
  **4 niveles** (Aún no / Con ayuda / Casi / Lo domino), siempre con texto + forma, nunca
  solo color. Todo respeta `prefers-reduced-motion`.
- Lo no construido (Bit, aula, Modo Examen, Rescate 48h, SOS en directo…) = "Próximamente"
  en la web pública y oculto en el panel. Sin testimonios ni cifras inventadas.
- Referencia viva: `/styleguide` (`noindex`). Componentes de marca: `src/components/brand/`.
- **Transición:** hasta cerrar la fase 1 de "Fusión del diseño" (ver `docs/ESTADO.md`) el
  código aún tiene los tokens HUD antiguos (cian `#22D3EE`, violeta, tema `family`).

## Parches de dependencias
`patches/next-intl+4.14.9.patch`: hace lazy el `require('@swc/core')` del plugin de
next-intl. Motivo: el binario nativo de `@swc/core` no está firmado y **Windows App
Control lo bloquea** ("Una directiva de Control de aplicaciones bloqueó este
archivo"). Solo se usa para `createMessagesDeclaration` (no lo usamos), así que el
require diferido nunca se dispara. Se reaplica solo vía `postinstall: patch-package`.

## Entorno
Copiar `.env.local.example` → `.env.local` y rellenar con las claves de Supabase.
`SUPABASE_SERVICE_ROLE_KEY` nunca se expone al cliente ni se commitea.

## Cómo trabajamos
Por fases pequeñas. Al cerrar cada fase: qué hay hecho, cómo probarlo, qué decisiones
quedan para David. Commits pequeños y descriptivos (en español).
