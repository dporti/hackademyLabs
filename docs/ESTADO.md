# Estado del proyecto — Tutor247

> Documento vivo. Se actualiza al cerrar cada tarea o fase.
> Última actualización: 2026-10-07.

## 1. Resumen
Tutor247 es una plataforma web de FP de informática (SMX, ASIR/ASIX, DAM, DAW) que
no vende clases sueltas sino "te sacamos el módulo": catálogo por módulo oficial →
diagnóstico (Mapa de Dominio por RA) → plan inverso → mentor verificado → seguimiento
hasta el examen. Monetiza con créditos (ledger inmutable) y suscripciones (IA "Bit" y
acompañamiento a familias).
**Fase actual del roadmap: Fase 1 (MVP base).** Hechas F1.1–F1.5 + identidad visual.
Fase 1 completa en lo básico; quedan pulidos (auth HUD, familias, header con sesión).

## 2. Hecho
- **Fase 0 — Scaffold** · 2026-10-06 · `9a5d25e`
  Next.js 16 (App Router, Turbopack) + TS + React 19 + Tailwind v4 + shadcn (Base UI),
  i18n next-intl (es por defecto, ca preparado), clientes Supabase (browser/server/admin),
  home inicial, CLAUDE.md, patch next-intl (@swc/core lazy por Windows App Control).
- **F1.1 — Esquema + seed** · 2026-10-06 · `b7c3577`, aplicado/verificado `97f62a0`
  5 migraciones (enums, perfiles/roles, catálogo, ledger inmutable, scaffolding futuro) +
  seed (4 ciclos, 31 módulos, RA de 0485/0484, equivalencias catalán de ejemplo, 4 packs,
  4 planes, 3 mentores). Aplicado a Supabase cloud y verificado (`scripts/verify-db.mjs`).
- **F1.2 — Web pública** · 2026-10-06 · `f94681d`
  Catálogo Ciclos→Módulos, ficha de módulo SEO (RA, equivalencia, mentores) con 64 páginas
  prerenderizadas, buscador, listado/perfil de mentores (vista `mentor_public` sin PII),
  precios. Capa de datos `src/lib/catalog.ts` (anon cookieless + `use cache`).
- **F1.3 — Auth + onboarding** · 2026-10-06 · `9f2d642`
  Registro con rol (trigger crea profile), onboarding por rol (alumno/familia/mentor con
  self-insert bajo RLS), login/logout, sesión SSR (proxy refresca cookies), panel stub.
  Verificado end-to-end (`scripts/verify-auth.mjs` + navegador).
- **Identidad visual "HUD Terminal"** · 2026-10-06 · `75c7168` (tokens + /styleguide) y
  `ed3131d` (aplicada a públicas)
  Dos temas por `data-theme` (student oscuro neón cian/violeta; family claro sobrio),
  semáforo RA verde/ámbar/rojo con AA, fuentes Space Grotesk/Inter/JetBrains Mono,
  componentes `MapaDominio`, `RaBadge`, `ModuleCard`, `MentorCard`, página `/styleguide`,
  home/catálogo/fichas/mentores/precios rediseñados.
- **F1.4 — Panel del alumno** · 2026-10-07 · `8025898`
  Saldo calculado (RPC `my_credit_balance`), compra mock de packs (`buyPackAction`: el
  servidor lee el pack de BD e inserta `compra_pack` con service role, caducidad 12 meses),
  historial del ledger (50 últimos), "módulos que preparas" con fecha de examen (tabla
  `student_modulo`, RLS del dueño, aplicada en Supabase). Verificado con
  `scripts/verify-credits.mjs` (15/15) y en navegador (es + ca). Arreglado de paso el aviso
  "unstable value Date.now()" del panel (`connection()` en `getSessionUser`).
- **F1.5 — Panel del mentor + admin mínimo + guardas de rol** · 2026-10-07 · `dc22cdd`
  Mentor: estado de verificación/nivel y edición de perfil (titular, bio, vídeo https,
  idiomas, módulos que imparte). Admin: lista de mentores (pendientes primero), verificar /
  rechazar / volver a pendiente y nivel. Datos públicos de mentores con `cacheTag` →
  cambios visibles al momento. **Seguridad**: migración `20261007090200_role_guards.sql`
  (aplicada) cierra 3 escaladas de privilegios del esquema inicial (auto-ascenso a admin,
  signUp con rol admin, alta de mentor ya verificado / auto-subida de nivel); comprobado
  que no se habían usado. Verificado con `scripts/verify-roles.mjs` (18/18), sin regresión
  en `verify-auth`/`verify-credits`, y en navegador (mentor y admin, ca).
- **Repo publicado** en https://github.com/dporti/hackademyLabs (rama `main`).

## 3. En curso
Nada abierto a medias. El último bloque cerrado fue F1.5 (panel mentor + admin).

## 4. Próximos pasos (orden de prioridad)
1. **Crear tu usuario admin real**: regístrate en `/registro` y ejecuta
   `node scripts/make-admin.mjs tu@email`.
2. **Header con sesión** (ahora siempre "Entrar") + enlace al panel; "Comprar" de `/precios`
   al panel si hay sesión.
3. Afinar pantallas de auth (`/entrar`, `/registro`, `/onboarding`) con el look HUD.
4. Landing propia de familias (`/familias`) en `data-theme="family"`.
5. Completar mapeo real de equivalencias catalanas y validar RA con BOE/decreto.

## 5. Decisiones tomadas
- **Nombre de trabajo: Tutor247** · aún no definitivo, se usa el de los docs · 2026-10-06.
- **Stack: Next.js 16 + TS + Tailwind v4 + shadcn (Base UI) + Supabase + Vercel** · SEO de
  fichas clave, RLS por rol, i18n desde el inicio · 2026-10-06.
- **Ledger de créditos inmutable** (append-only, saldo = suma; triggers bloquean UPDATE/
  DELETE) · es regla de negocio de los docs, evita saldo editable · 2026-10-06.
- **Anti-bypass**: mentores públicos vía vista `mentor_public` sin email/contacto · 2026-10-06.
- **Multi-ciclo**: módulo con código único vinculado a varios ciclos (N:M `ciclo_modulo`) ·
  p. ej. 0373 en DAM/DAW/ASIR · 2026-10-06.
- **i18n**: es sin prefijo, ca con prefijo (`localePrefix: as-needed`) · 2026-10-06.
- **Diseño "HUD Terminal" (opción A)**: cian/violeta + táctica, Space Grotesk; verde acid
  solo para aprobado; family claro con teal · elegido por el usuario · 2026-10-06.
- **Precios Fase 1 = extremo bajo de los rangos** de los docs (Compañero 9,90 / Acompaña 79
  / Acompaña+ 149) · a validar · 2026-10-06.
- **Stripe en Fase 1 = mock** (botón suma créditos, sin cobro real) · 2026-10-06.
- **Compra mock: un único movimiento `compra_pack`** con los créditos del pack (bonus
  incluido, como en `pack.credits`) y `expires_at` = +12 meses. Con Stripe real el insert
  pasará al webhook de pago confirmado · 2026-10-07.
- **"Módulos que prepara" = tabla `student_modulo`** (alumno, módulo, fecha de examen),
  separada de `study_plan` (plan inverso, más adelante) · 2026-10-07.
- **Admin solo por script** (`scripts/make-admin.mjs`, service role); el registro público
  nunca da admin. Cambios de rol/verificación/nivel: admin o servidor (`auth.uid()` nulo) ·
  2026-10-07.
- **Acciones de admin con la sesión del admin**, no con service role: la BD revalida (RLS +
  trigger) · 2026-10-07.
- **Un mentor verificado que edita su perfil sigue verificado** (los cambios salen en público
  sin re-revisión) · MVP; revisar si hace falta moderación · 2026-10-07.
- **`apply_all.sql` se genera** con `scripts/build-apply-all.mjs` (no editar a mano) · 2026-10-07.

## 6. Decisiones pendientes (las decide el usuario)
- Nombre y marca definitivos.
- Precio real del crédito y % de reparto con mentores (60–70 %).
- Confirmar precios de packs/planes y condiciones de la garantía "Seguimos contigo".
- Mapeo real de equivalencias catalanas (M/UF) y validación de RA con el BOE/decreto.
- MVP: ¿lanzar con 3–5 módulos killer y pocos mentores o catálogo completo?
- Edad/consentimiento: Modo Familia ¿obligatorio para <18 o solo recomendado?
- Aspectos legales: menores, facturación de mentores (autónomos), RGPD de grabaciones.

## 7. Problemas conocidos / deuda técnica
- **Supabase: "Confirm email"** probablemente activado → el registro real no devuelve
  sesión y el onboarding no arranca solo. Para dev conviene desactivarlo en el panel.
- **Tipos de BD a mano** (`src/lib/db-types.ts`) hasta usar `supabase gen types` (CLI/MCP).
- **Equivalencias catalanas y RA** del seed son orientativos → validar.
- **Header** no refleja la sesión (siempre muestra "Entrar").
- **Buscador de la home** postea a `/modulos` (es-centric); afinar i18n del form.
- **Patch next-intl** (`@swc/core` lazy) por Windows App Control: revisar si deja de hacer
  falta en otros entornos o al actualizar next-intl.
- **Borrar un usuario con movimientos en el ledger falla**: el borrado en cascada choca con
  el trigger de inmutabilidad. Necesario definir estrategia (anonimizar en vez de borrar)
  para bajas/RGPD. El preámbulo de `apply_all.sql` ya borra los usuarios de prueba DESPUÉS
  de los drops para evitarlo.
- **Caducidad de créditos**: solo se guarda `expires_at`; falta el job que inserte los
  movimientos `caducidad` negativos.
- **Precios → "Comprar"** sigue llevando a `/registro?pack=…` aunque haya sesión; el
  parámetro `pack` no se usa todavía.
- **Formularios y reset de React 19**: tras una server action React resetea el formulario.
  Arreglado en el perfil de mentor (devuelve los valores en error); falta en onboarding,
  registro y "añadir módulo" (en error se pierde lo escrito).
- **Login en dev**: el primer click en "Entrar" a veces no envía (probablemente antes de
  hidratar); el segundo sí. Revisar si pasa en producción.
- **Avisos de hidratación** en navegador por extensiones del cliente (LanguageTool), no del código.

## 8. Cómo arrancar el proyecto
Entorno: Windows + PowerShell. Requiere Node (con npm).

```powershell
npm install            # instala dependencias (postinstall aplica patch-package)
npm run dev            # desarrollo en http://localhost:3000
npm run build          # build de producción (incluye typecheck)
npm start              # servir el build
npm run lint           # eslint
```

Rutas: `/` = español (sin prefijo), `/ca` = catalán. Referencia de diseño: `/styleguide`.

### Base de datos (Supabase)
El esquema y los datos viven en `supabase/`. Para aplicarlos a un proyecto:
- **Cloud (SQL Editor)**: pegar `supabase/apply_all.sql` (re-ejecutable: limpia y recrea).
- **CLI local**: `supabase start` + `supabase db reset` (aplica `migrations/` + `seed.sql`).

Verificación: `node scripts/verify-db.mjs` (catálogo + mentores),
`node scripts/verify-auth.mjs` (trigger + RLS + guard) y
`node scripts/verify-credits.mjs` (ledger + compra mock + `student_modulo`) y
`node scripts/verify-roles.mjs` (guardas de rol + verificación de mentores).
Admin: `node scripts/make-admin.mjs <email>` (el usuario debe existir).
Tras tocar migraciones o seed: `node scripts/build-apply-all.mjs`.

### Variables de entorno
Copiar `.env.local.example` → `.env.local` y rellenar (NUNCA commitear valores):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable)
- `SUPABASE_SERVICE_ROLE_KEY` (secret; solo servidor)
