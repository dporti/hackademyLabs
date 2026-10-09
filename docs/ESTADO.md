# Estado del proyecto — Tutor247

> Documento vivo. Se actualiza al cerrar cada tarea o fase.
> Última actualización: 2026-10-09.

## 1. Resumen
Tutor247 es una plataforma web de FP de informática (SMX, ASIR/ASIX, DAM, DAW) que
no vende clases sueltas sino "te sacamos el módulo": catálogo por módulo oficial →
diagnóstico (Mapa de Dominio por RA) → plan inverso → mentor verificado → seguimiento
hasta el examen. Monetiza con créditos (ledger inmutable) y suscripciones (IA "Bit" y
acompañamiento a familias).
**Fase actual del roadmap: Fase 2 (consumo).** Fase 1 (MVP base) cerrada: F1.1–F1.5,
identidad visual, familias, informes y web vendible. Hecha F2.1 (tickets y reservas) y política de cancelación.
**En marcha: "Fusión del diseño"** → marca Checkpoint Academy (Aprueba tu módulo + Tutor247),
referencia en `docs/diseno/`.

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
- **Header con sesión** · 2026-10-07 · `93b54c3`
  "Mi panel"/"Entrar" según sesión en un hueco `<Suspense>` (públicas pasan de ○ a ◐:
  shell estático + hueco dinámico; contenido SEO sigue prerenderizado). `/entrar` y
  `/registro` con sesión → `/panel` (arregla "Comprar" de precios). Probado en navegador.
- **Pantallas de acceso HUD** · 2026-10-07 · `14cc665`
  `AuthShell` en entrar/registro/onboarding, rol del registro en tarjetas, errores de auth
  en i18n (es/ca) y valores conservados tras error (sin contraseña). Arreglado bug: tras el
  onboarding el usuario volvía a `/onboarding` (redirección de Server Component cacheada en
  el router del cliente) → el panel renderiza el onboarding en vez de redirigir.
  Probado en navegador; verify-auth/roles/credits OK.
- **Confirmación de email** · 2026-10-07 · `cef1f34`
  Registro con `emailRedirectTo` → `/api/auth/confirm` (PKCE `code` o `token_hash`) → sesión
  → onboarding; enlace inválido → `/entrar?error=link`; `next` sin open redirect; mensaje
  propio para "email sin confirmar". Verificado con `scripts/verify-confirm.mjs` (11/11).
- **Landing de familias** · 2026-10-07 · `4dd6a17`
  `/familias` en tema claro (estática): informe semanal de ejemplo, qué incluye, cómo funciona,
  planes Familia desde BD, confianza y límites, FAQ. Enlazada desde header y home. De paso:
  `loading.tsx` en fichas de módulo/mentor (aviso de navegación no instantánea de Next 16).
- **Panel de familia + vinculación** · 2026-10-07 · `1cb6178`
  Código de invitación que confirma el alumno; consentimiento en BD (menor → visible; mayor →
  solo si consiente, revocable, registrado en `consent`); panel de familia en tema claro
  (hijos, módulos, saldo, último informe); sección Familia en el panel del alumno. Migración
  `20261007090300_family_link.sql` aplicada. Arreglado: `wr_family` ignoraba el
  consentimiento. Verificado: `verify-family` 21/21, UI por HTTP 10/10, resto de verify OK.
- **Informes semanales** · 2026-10-07 · `6057f1e`
  Redacta el admin (hace de tutor de referencia); próximas fechas automáticas desde los
  exámenes; la familia ve el informe completo + historial (con consentimiento) y el alumno ve
  los suyos. Verificado: helpers 10/10, UI por HTTP 7/7. La acción de guardado no se ha
  probado de punta a punta desde el navegador (sí su camino en BD con sesión de admin).
- **Web vendible sin cuenta** · 2026-10-07 · `869d218` → `50e78b1`
  Diagnóstico gratis sin registro (`/diagnostico`: autoevaluación por RA → Mapa de Dominio en
  vivo → plan inverso semana a semana → recomendación con créditos; estado compartible en la
  URL). Home convertida en página de venta (dolores, cómo funciona, diferenciadores, demo de Bit,
  productos, garantía, mentores, FAQ). Precios con "¿cuánto me cuesta aprobar?" y tabla de
  productos. Landing `/hazte-mentor`. Fichas de módulo con CTA a su diagnóstico y productos.
  RA de los 5 módulos killer restantes cargados (orientativos). Sin testimonios ni cifras
  inventadas.
- **F2.1 — Tickets y reservas = consumo de créditos** · 2026-10-08 · `902b7c7` + arreglos tras
  prueba en navegador. Migración `20261008090100_tickets_bookings.sql` aplicada.
  - BD: tarifas en `product_price` (por nivel de mentor), RPC atómicas de cobro/devolución
    (`create_ticket`, `cancel_ticket`, `claim_ticket`, `release_ticket`, `post_ticket_message`,
    `close_ticket`, `create_booking`, `respond_booking`, `cancel_booking`, `complete_booking`)
    solo ejecutables por service role; bloqueo por alumno (sin saldo negativo); índices únicos
    (un gasto y una devolución por ticket/reserva); `ticket_message`; `mentor_earning`
    inmutable (atribución al responder/completar); `my_student_names` (mentor ve solo nombre de
    pila). **Seguridad**: quitadas las políticas del scaffolding que dejaban al alumno crear
    tickets/reservas sin pagar o cambiarles el estado.
  - UI: `/panel/tickets` (alumno: nueva duda + lista; mentor: bolsa + asignados),
    `/panel/tickets/[id]` (hilo, cancelar, resolver, coger/soltar), `/panel/sesiones` (solicitar
    con mentor y hora de Madrid; mentor acepta/rechaza/hecha; sala Jitsi provisional), accesos y
    contadores en el panel, ganancias del mes en el panel del mentor, concepto del producto en el
    historial del ledger. Filtro anti-contacto (`src/lib/contact-filter.ts`). i18n es/ca.
  - Verificado: `verify-consumo` 56/56 (re-ejecutable; deja los mentores de prueba en
    pendiente), sin regresión en verify-db/auth/credits/roles/family; navegador (es + ca): alumno
    envía ticket (email ocultado) → mentora lo coge y responde (teléfono ocultado) → reserva flash
    con precio por nivel → mentora acepta → sala Jitsi; cancelar ticket devuelve créditos.
    Arreglado en la prueba: `min` del selector de fecha no alineado con `step` (el navegador
    bloqueaba el envío), radios desmarcados tras el reset de React 19 (formularios con
    `onSubmit` + `startTransition`), "Esperando mentor" en tickets cancelados.
- **Política de cancelación** · 2026-10-09 · `7c4f7de`. Página pública `/cancelacion` (es/ca)
  enlazada desde precios y los formularios de ticket/sesión; regla nueva: el alumno puede cancelar
  con devolución un ticket **cogido pero sin respuesta en plazo**. Migración
  `20261008090200_cancel_policy.sql` aplicada. Verificado: `verify-consumo` 59/59 (caso nuevo
  incluido: devuelve créditos y el mentor no cobra).
- **Fusión del diseño · fase 1: marca y tokens** · 2026-10-09
  - Tema oscuro único con los tokens de DISENO.md §4 en `:root` + `[data-theme="student"]`
    (fuera el `:root` claro y `.dark` de shadcn y el tema `family`); nuevos `--warning`, `--sos`,
    `--sos-text`, `--secondary-text`, `--label`, `--divider`, fondos `tint-*`, `--nivel-*`,
    `.glow-secondary`; rejilla HUD 48 px. Zona Tutor247/familias con `data-accent="tutor"`
    (primario magenta): `/familias`, panel de familia, informes del alumno, franja de la home.
  - Mapa de Dominio a 4 niveles (`src/lib/dominio.ts`; `MapaDominio` y `RaBadge nivel`), con
    texto + forma, i18n y aviso "orientativo, no nota oficial". Datos sin cambios (se mapean).
  - Marca: appName y metadatos es/ca (plantilla `%s · Checkpoint Academy` en el layout), menciones
    a la plataforma en los textos → Checkpoint Academy; `Logo`, `SectionLabel`; header nuevo
    (Aprueba tu módulo, Tutor247, Mentores, Tarifas, SOS, Test gratis, cuenta; menú móvil
    accesible) y footer nuevo; `/styleguide` rehecho.
  - Verificado: lint + build OK; navegador es/ca (styleguide, home, `/ca/familias`, `/entrar`),
    móvil 360/390 px sin scroll horizontal, menú móvil (aria-expanded, enlaces), 1024/1280 px.
    No probado con sesión: panel de familia/alumno (solo cambia el atributo de tema).
- **Repo publicado** en https://github.com/dporti/hackademyLabs (rama `main`); último push
  2026-10-07 hasta `0562a0e`.

## 3. En curso
- **Fusión del diseño** (Checkpoint Academy) · fases 0 y 1 cerradas 2026-10-09; siguiente:
  fase 2 — Portada y Tutor247.

## 4. Próximos pasos (orden de prioridad)
0. **SIGUIENTE: fase nueva "Fusión del diseño"** (Checkpoint Academy, referencia
   `docs/diseno/DISENO.md`; prompts por fase en `docs/diseno/PROMPTS.md`). Cada fase cierra con
   lint + build + `verify-*` afectados + navegador (es y ca) + commit + ESTADO.md.
   - [x] **Fase 0** — Cerrar lo pendiente y preparar el terreno (CLAUDE.md + ESTADO.md).
   - [x] **Fase 1 — Marca y tokens** (2026-10-09): tokens del tema oscuro único (§4), `--warning`/`--sos`,
     eliminar `family`; Mapa de Dominio a 4 niveles; appName/metadatos a Checkpoint Academy,
     `Logo`, header y footer nuevos; `/styleguide` actualizado.
   - [ ] **Fase 2 — Portada y Tutor247**: home con las 15 secciones de §6 (ModelCard,
     TrustStrip, BeforeAfter, PathFinder, ComparisonTable, FounderBlock, Faq; testimonios
     ocultos); `/tutor247` con `#familias`; `/familias` → 308.
   - [ ] **Fase 3 — Resto de públicas**: `/modulos`, `/ciclos`, `/modulos/[code]` («5 errores
     que suspenden»: proponer modelo antes de migrar), `/mentores`, `/mentores/[id]`,
     `/precios` (dos modelos), `/diagnostico`, auth (`AuthShell`), `/hazte-mentor`,
     `/cancelacion`.
   - [ ] **Fase 4 — Panel del alumno**: `AppShell` por rol, panel con datos actuales,
     `/panel/creditos` nueva (saldo, caducidades, compra mock, ledger).
   - [ ] **Fase 5 — Tickets y sesiones**: `/panel/tickets` (SOS.html) y `/panel/sesiones`
     (Reserva.html) sin tocar RPC ni cobros.
   - [ ] **Fase 6 — Paneles de mentor, familia (oscuro) y admin**.
   - [ ] **Fase 7 — Backend nuevo I**: `/panel/mapa` (progreso por RA guardado) y rol `tutor`
     con cartera (`PanelTutor.html`). Planificar aparte.
   - [ ] **Fase 8 — Backend nuevo II**: `/panel/logros` (XP, insignias, racha), Bit
     (`/panel/bit`, API de Claude + RAG por módulo), referidos. Planificar aparte.
   - [ ] **Fase 9 — Backend nuevo III**: aula integrada (sustituye a Jitsi) y móvil
     (PWA / WhatsApp). Planificar aparte.
   Después: productos empaquetados (simulacro, Rescate 48h, Plan Módulo, reparto por tareas)
   → Stripe real → deploy en Vercel → legal (aviso legal, RGPD, cookies, términos).
1. **Crear tu usuario admin real**: regístrate en `/registro` y ejecuta
   `node scripts/make-admin.mjs tu@email`.
2. **Configurar Supabase Auth** (panel): Site URL y Redirect URLs (`http://localhost:3000/**`
   y el dominio de producción). Opcional: plantilla "Confirm signup" con `token_hash` para
   que el enlace funcione abierto en otro dispositivo. Probar un registro real con tu email.
3. **Revisar con el usuario la web pública** (copys, orden de secciones, qué promesas mantener
   antes de lanzar: ver "promesas aún no construidas" en deuda).
4. **Panel del tutor de referencia** (cartera de familias, redactar informes; hoy lo hace el admin).
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
- ~~**Diseño "HUD Terminal" (opción A)**~~ (sustituida 2026-10-09 por Checkpoint Academy): cian/violeta + táctica, Space Grotesk; verde acid
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
- **Sesión en UI con `getUser`, no `getClaims`**: misma verdad que el panel (evita bucles con
  cookies de usuarios borrados/revocados); coste extra asumible (el proxy ya llama a getUser) ·
  2026-10-07.
- **`apply_all.sql` se genera** con `scripts/build-apply-all.mjs` (no editar a mano) · 2026-10-07.
- **Consumo vía RPC con service role**: el servidor autentica y llama a la RPC con el id del
  usuario; cobro + alta en una transacción. Ninguna RPC de consumo es ejecutable desde el
  cliente · 2026-10-08.
- **Tarifas F2.1 = extremo bajo** (ticket normal 3, Express 6; flash 12/13/15 y 1:1 25/30/35
  por nivel mentor/pro/experto) en `product_price` · a validar · 2026-10-08.
- **Tickets**: se cobran al enviar; el alumno recupera los créditos si cancela antes de que un
  mentor lo coja; la repregunta no se cobra; la ganancia del mentor se apunta en su 1.ª
  respuesta. SLA 2 h / 24 h de reloj (horario aún por decidir) · 2026-10-08.
- **Reservas**: el alumno propone hora (Madrid, ≥ 3 h y ≤ 90 días), el mentor confirma o
  rechaza (rechazo = devolución). Cancelación del alumno con devolución si no está confirmada
  o faltan ≥ 24 h; el mentor siempre puede cancelar devolviendo. Ganancia al marcar "hecha" ·
  2026-10-08.
- **Política de cancelación** (pública en `/cancelacion`, refleja lo que aplican las RPC):
  ticket libre o cogido sin respuesta en plazo → devolución íntegra; respondido → no (repregunta
  gratis). Sesión: sin confirmar o confirmada con ≥ 24 h → íntegra; < 24 h o no presentarse → no;
  cancela/rechaza el mentor → siempre íntegra. Créditos no canjeables por dinero salvo
  desistimiento 14 días sobre créditos sin usar · texto provisional, **a revisar legalmente** ·
  2026-10-08.
- **Sala de videollamada provisional = Jitsi** (`meet.jit.si`, nombre aleatorio, solo visible
  para las partes) hasta tener aula integrada · 2026-10-08.
- **Diseño: `docs/diseno/` es la referencia visual y `DISENO.md` manda en el aspecto** (datos,
  lógica, seguridad e i18n siguen CLAUDE.md) · sustituye a "HUD Terminal (opción A)" · 2026-10-09.
- **Marca: Checkpoint Academy**, con **Tutor247** como segundo producto; `hackademyLabs` solo
  nombre del repo · decidido por el usuario · 2026-10-09.
- **Colores: cian `#2EF2FF` = Aprueba tu módulo** (primario); **magenta `#FF3DCB` = Tutor247**
  (sustituye al violeta); verde `#7CFF5B` solo aprobado · 2026-10-09.
- **Tema oscuro único**: se elimina el tema claro `family`; landing y panel de familia en
  oscuro con magenta de acento, vigilando AA · 2026-10-09.
- **Fuentes**: Space Grotesk títulos · Inter texto y paneles · JetBrains Mono códigos, RA,
  cifras y etiquetas · 2026-10-09.
- **Ruta de Tutor247: `/tutor247`**; `/familias` redirige (308) a `/tutor247#familias` ·
  2026-10-09. Hasta la fase 2, "Tutor247" del header apunta a `/familias`.
- **Zona Tutor247 = `data-accent="tutor"`** (cambia `--primary` a magenta) en vez de un segundo
  tema · reutiliza todos los componentes sin variantes nuevas · 2026-10-09.
- **Variante `secondary` de Button/Badge = neutra** (superficie gris), aunque `--secondary` sea el
  magenta: evita que cualquier botón secundario parezca "Tutor247" · 2026-10-09.
- **4 niveles desde el semáforo guardado**: verde → Lo domino, rojo → Aún no, ámbar → Casi si
  progreso ≥ 60 % o Con ayuda si no. Sin migración hasta tener progreso por RA (fase 7) ·
  2026-10-09.

## 6. Decisiones pendientes (las decide el usuario)
- ~~Nombre y marca definitivos~~ → Checkpoint Academy + Tutor247 (2026-10-09).
- Plazas del programa piloto (CTA final de la portada).
- Precio real del crédito y % de reparto con mentores (60–70 %).
- Confirmar precios de packs/planes y condiciones de la garantía "Seguimos contigo".
- Mapeo real de equivalencias catalanas (M/UF) y validación de RA con el BOE/decreto.
- MVP: ¿lanzar con 3–5 módulos killer y pocos mentores o catálogo completo?
- Edad/consentimiento: Modo Familia ¿obligatorio para <18 o solo recomendado?
- Aspectos legales: menores, facturación de mentores (autónomos), RGPD de grabaciones.

## 7. Problemas conocidos / deuda técnica
- **Enlace de confirmación PKCE** (plantilla por defecto) solo funciona en el mismo navegador
  del registro; con la plantilla `token_hash` funciona en cualquiera. Sin "reenviar email".
- **Tipos de BD a mano** (`src/lib/db-types.ts`) hasta usar `supabase gen types` (CLI/MCP).
- **Equivalencias catalanas y RA** del seed son orientativos → validar.
- **Buscador de la home** postea a `/modulos` (es-centric); afinar i18n del form.
- **Patch next-intl** (`@swc/core` lazy) por Windows App Control: revisar si deja de hacer
  falta en otros entornos o al actualizar next-intl.
- **Borrar un usuario con movimientos en el ledger falla**: el borrado en cascada choca con
  el trigger de inmutabilidad. Necesario definir estrategia (anonimizar en vez de borrar)
  para bajas/RGPD. El preámbulo de `apply_all.sql` ya borra los usuarios de prueba DESPUÉS
  de los drops para evitarlo.
- **Caducidad de créditos**: solo se guarda `expires_at`; falta el job que inserte los
  movimientos `caducidad` negativos.
- **Precios → "Comprar"**: con sesión acaba en `/panel`; sin sesión va a
  `/registro?pack=…` y el parámetro `pack` aún no se usa (no preselecciona el pack).
- **Formularios y reset de React 19**: tras una server action React resetea el formulario.
  Resuelto en auth, onboarding y perfil de mentor (devuelven los valores en error); falta
  "añadir módulo" del alumno (solo pierde la selección).
- **Evitar `redirect()` en Server Components hacia rutas que cambian tras una acción**: el
  router del cliente cachea la redirección. Patrón usado: renderizar el contenido en sitio.
- (Descartado) "el primer click no envía" en las pruebas: era la automatización de Chrome
  (el primer click solo activa la ventana; `document.hasFocus()` = false). No es bug.
- **Header oscuro en páginas claras** (`/familias`) — desaparece en la fase 1 de "Fusión del diseño" (tema oscuro único): el header es global (layout) y no sabe la
  ruta; se ve correcto pero no "family". Revisar si se quiere un header claro en esa zona.
- **`?plan=` en `/registro`** (desde planes Familia) aún no se usa.
- **Migraciones a mano**: el MCP de Supabase no accede a este proyecto (solo ve "gifter"), así
  que cada migración nueva se pega en el SQL Editor. Escribirlas **re-ejecutables** (if not
  exists / drop ... if exists) para que un intento a medias no bloquee el siguiente.
- **Promesas aún no construidas en la web pública**: Bit (IA, WhatsApp, quizzes), Ticket
  Express/Rescate 48h/sesiones reales, aula online, banco de materiales, Plan Módulo con
  garantía y liquidación a mentores (60–70 %, % aún por decidir). La web describe la visión de
  los docs; antes de abrir a usuarios reales, o se construyen o se marcan como "próximamente".
- **RA orientativos**: los de 0485/0484 y los 5 killer nuevos (`supabase/data/ra-killer.json`)
  hay que validarlos con el BOE/decreto; el diagnóstico solo cubre módulos con RA cargados (7).
- **"Días activos" del informe es manual**: no hay registro de actividad del alumno todavía.
- **`/styleguide` con textos en español en el código** (página interna `noindex`); excepción
  consciente a la regla de i18n.
- **Diagnóstico con 3 opciones** (verde/ámbar/rojo) aunque el Mapa muestre 4 niveles: el
  autodiagnóstico se rehace en la fase 3.
- **Tickets/sesiones sin automatismos**: no hay devolución automática si un ticket cogido no
  se responde en plazo, ni si una solicitud de sesión caduca sin respuesta (el alumno puede
  cancelarla), ni autocompletado de sesiones que el mentor no marca. Falta un job.
- **Incidencias de sesión sin flujo**: si el mentor no se presenta o hay un fallo técnico grave
  no hay botón de reclamación ni canal de contacto; la política pública no lo promete. Decidir
  regla (¿devolución + sin pago al mentor?) y canal.
- **Sin disponibilidad del mentor**: el alumno propone hora libre; no hay agenda/franjas.
- **Sin notificaciones** (email) de ticket respondido / sesión confirmada.
- **Filtro anti-contacto** básico (emails, teléfonos españoles, enlaces a apps); el texto de
  sustitución se guarda en español en BD.
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
`node scripts/verify-roles.mjs` (guardas de rol + verificación de mentores),
`node scripts/verify-family.mjs` (vinculación familia + consentimiento),
`node scripts/verify-consumo.mjs` (tickets, reservas, cobros, devoluciones, ganancias).
RA de catálogo: `node scripts/seed-ra.mjs` (carga `supabase/data/ra-killer.json`).
Admin: `node scripts/make-admin.mjs <email>` (el usuario debe existir).
`node scripts/verify-confirm.mjs` (enlace de confirmación; requiere `npm run dev`).
Tras tocar migraciones o seed: `node scripts/build-apply-all.mjs`.

### Variables de entorno
Copiar `.env.local.example` → `.env.local` y rellenar (NUNCA commitear valores):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable)
- `SUPABASE_SERVICE_ROLE_KEY` (secret; solo servidor)
- `NEXT_PUBLIC_SITE_URL` (p. ej. `http://localhost:3000`; respaldo para enlaces de email)
