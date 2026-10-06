-- Tutor247 — Enums base del dominio.
-- Fuente: docs/modelo-negocio-v1.md, docs/capa-ia-v1.md, docs/segmentos-tutor247-v1.md

-- Nivel del ciclo formativo.
create type grade_level as enum ('medio', 'superior');

-- Roles de usuario. Un usuario tiene un rol principal en profile; puede tener
-- subperfiles adicionales (p. ej. mentor + tutor_referencia) vía sus tablas.
create type user_role as enum (
  'alumno', 'familia', 'mentor', 'tutor_referencia', 'admin'
);

-- Modo del alumno: autónomo (mayor, paga él) vs familia (padres pagan).
create type student_mode as enum ('autonomo', 'familia');

-- Niveles de mentor (precio y % de reparto suben con el nivel).
create type mentor_level as enum ('mentor', 'pro', 'experto');

-- Estado de verificación del mentor (solo admin lo cambia).
create type mentor_status as enum ('pendiente', 'verificado', 'rechazado');

-- Semáforo del Mapa de Dominio por RA (orientativo, no nota oficial).
create type ra_status as enum ('verde', 'ambar', 'rojo');

-- Tipos de movimiento del ledger de créditos (inmutable).
create type ledger_type as enum (
  'compra_pack',  -- ingreso por comprar un pack
  'bonus',        -- créditos extra (bonus de pack, referidos)
  'gasto',        -- consumo en un producto
  'caducidad',    -- baja de créditos caducados (12 meses)
  'ajuste',       -- corrección manual (admin)
  'devolucion'    -- reembolso (p. ej. garantía "Seguimos contigo")
);

-- Productos que consumen créditos.
create type product_kind as enum (
  'diagnostico', 'sesion_1a1', 'sesion_flash', 'ticket_express', 'ticket_normal',
  'revision', 'simulacro', 'rescate_48h', 'plan_modulo', 'defensa_proyecto',
  'grupo_reducido'
);

-- Planes de suscripción.
create type plan_kind as enum ('gratis', 'companero', 'acompana', 'acompana_plus');

-- Tipos de consentimiento (RGPD / menores).
create type consent_type as enum (
  'compartir_familia',  -- alumno mayor autoriza compartir informes con familia
  'grabacion',          -- grabación de sesiones
  'whatsapp_menor'      -- tutor legal autoriza WhatsApp para un menor
);
