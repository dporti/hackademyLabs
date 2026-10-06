Actúa como arquitecto de software y desarrollador full-stack senior. Vamos a construir desde cero **Tutor247**, una plataforma web que conecta alumnos de FP de informática (SMX, ASIR/ASIX, DAM, DAW) con mentores para **aprobar módulos concretos**. No vendemos clases sueltas: vendemos "te sacamos el módulo".

Trabajo en Windows con PowerShell. Responde y comenta en español. La interfaz va en español, pero debe estar preparada para i18n (catalán después).

## Documentación del negocio
En `/docs` tienes tres documentos: `modelo-negocio-v1.md`, `capa-ia-v1.md` y `segmentos-tutor247-v1.md`. **Léelos enteros antes de proponer nada**: son la fuente de verdad. Si algo de este prompt los contradice, pregúntame.

## Resumen del concepto (por si falta contexto)
- **Catálogo por módulo oficial**: ciclo → módulo (código estatal, p. ej. 0485 Programación) → Resultados de Aprendizaje (RA). Debe existir una tabla de equivalencias con la numeración catalana (M01–M16 / UF).
- **Créditos**: 1 crédito ≈ 1 €. Hay packs con bonus y los créditos caducan a los 12 meses. Se gastan en sesión 1:1, sesión flash, Ticket Express/Normal, revisión explicada, simulacro, Rescate 48h, Plan Módulo y defensa de proyecto. El saldo debe llevarse con un **ledger** (movimientos inmutables), nunca con un campo de saldo editable.
- **Suscripciones**: Compañero (IA) para alumnos autónomos; Acompaña / Acompaña+ para familias.
- **Dos modos**:
  - **Autónomo**: alumno mayor de edad que paga él mismo.
  - **Familia**: los padres pagan, el alumno suele ser menor, hay un **tutor de referencia** fijo, informes semanales y alertas.
- **Roles**: alumno, familia (padre/madre/tutor legal), mentor (por módulo), tutor de referencia, admin. Un alumno puede estar vinculado a una familia. Si el alumno es mayor de edad, compartir informes con la familia requiere su consentimiento.
- **Mentores**: perfil público con módulos que dominan (por código), niveles (Mentor/Pro/Experto), valoraciones, verificación y reparto del 60–70 % de los créditos consumidos.
- **Diagnóstico + Mapa de Dominio** por RA (verde/ámbar/rojo) y **plan inverso** calculado a partir de la fecha del examen.
- **Anti-bypass**: el contacto directo está oculto y todo el pago y la comunicación pasan por la plataforma.
- **IA y WhatsApp (asistente "Bit")**: fases posteriores, pero el modelo de datos debe preverlo desde ya (conversaciones, mensajes, canal, escalados a humano).
- **Integridad académica**: nunca se hacen prácticas ni exámenes del alumno.

## Stack propuesto (valídalo o justifica alternativas)
- Next.js (App Router) + TypeScript: el SEO de las fichas de cada módulo es clave para captar alumnos.
- Tailwind + shadcn/ui.
- Supabase: Postgres, Auth, Storage y RLS por rol.
- Stripe para pagos: en la fase 1 solo con un mock de compra de packs.
- Despliegue en Vercel.

## Cómo quiero trabajar
1. **No escribas código todavía.** Primero lee `/docs` y entrégame:
   a) dudas o contradicciones que veas;
   b) la arquitectura propuesta;
   c) un modelo de datos completo (tablas, relaciones, enums y políticas RLS principales);
   d) un roadmap por fases con entregables verificables.
2. Cuando lo apruebe, crea `CLAUDE.md` con las convenciones del proyecto, la estructura de carpetas y los comandos.
3. Avanza por fases pequeñas. Al final de cada una: qué hay hecho, cómo probarlo y qué decisiones he de tomar. Haz commits pequeños y descriptivos.

## Alcance de la Fase 1 (MVP base)
- Proyecto inicial, Supabase con migraciones y **seed** con los ciclos y módulos de SMX, ASIR, DAM y DAW (códigos y nombres de `/docs/modelo-negocio-v1.md`), RA de ejemplo para 0485 y 0484, y 3 mentores de prueba.
- Web pública:
  - Home con doble entrada, "Soy estudiante" / "Soy madre/padre", y un buscador "¿Qué módulo te preocupa?".
  - Catálogo Ciclos → Módulos, con una ficha por módulo pensada para SEO (RA, productos, mentores).
  - Listado y perfil de mentores.
  - Página de precios (packs y suscripciones).
- Auth con selección de rol en el registro (alumno autónomo, familia, mentor) y onboarding diferente para cada uno.
- Panel del alumno: saldo de créditos (ledger), compra mock de packs, historial y módulos que está preparando.
- Panel del mentor (básico): perfil editable y módulos que imparte.
- Admin mínimo: verificar mentores.

**Fuera de la Fase 1** (pero el modelo de datos debe soportarlo): reservas y videollamada, tickets, diagnóstico y Mapa de Dominio, plan inverso, IA/Bit, WhatsApp, panel de familia y de tutor de referencia, informes, referidos, gamificación, Stripe real.

Empieza leyendo `/docs` y dame el punto 1.
