-- Tutor247 — Seed de datos iniciales (Fase 1).
-- Catálogo de ciclos/módulos (docs/modelo-negocio-v1.md), RA de ejemplo (0485, 0484),
-- equivalencias catalanas de ejemplo, packs, planes y 3 mentores de prueba.
-- Idempotente: usa ON CONFLICT para poder re-ejecutarse.

-- ═══════════════════════════════ CICLOS ═══════════════════════════════
insert into ciclo (code, name, grade, sort_order) values
  ('SMX',  'Sistemas Microinformáticos y Redes',            'medio',    1),
  ('ASIR', 'Administración de Sistemas Informáticos en Red', 'superior', 2),
  ('DAM',  'Desarrollo de Aplicaciones Multiplataforma',     'superior', 3),
  ('DAW',  'Desarrollo de Aplicaciones Web',                 'superior', 4)
on conflict (code) do nothing;

-- ═══════════════════════════════ MÓDULOS ══════════════════════════════
-- killer = true en los de más suspensos (docs §3).
insert into modulo (code, name, killer) values
  -- Tronco común DAM + DAW (1.º)
  ('0483', 'Sistemas informáticos',                                   false),
  ('0484', 'Bases de datos',                                          true),
  ('0485', 'Programación',                                            true),
  ('0373', 'Lenguajes de marcas y sistemas de gestión de información', true),
  ('0487', 'Entornos de desarrollo',                                  false),
  -- DAM (2.º)
  ('0486', 'Acceso a datos',                                          true),
  ('0488', 'Desarrollo de interfaces',                                false),
  ('0489', 'Programación multimedia y dispositivos móviles',          false),
  ('0490', 'Programación de servicios y procesos',                    false),
  ('0491', 'Sistemas de gestión empresarial',                         false),
  -- DAW (2.º)
  ('0612', 'Desarrollo web en entorno cliente',                       false),
  ('0613', 'Desarrollo web en entorno servidor',                      true),
  ('0614', 'Despliegue de aplicaciones web',                          false),
  ('0615', 'Diseño de interfaces web',                                false),
  -- ASIR
  ('0369', 'Implantación de sistemas operativos',                     false),
  ('0370', 'Planificación y administración de redes',                 true),
  ('0371', 'Fundamentos de hardware',                                 false),
  ('0372', 'Gestión de bases de datos',                               false),
  ('0374', 'Administración de sistemas operativos',                   false),
  ('0375', 'Servicios de red e Internet',                             false),
  ('0376', 'Implantación de aplicaciones web',                        false),
  ('0377', 'Administración de sistemas gestores de bases de datos',   false),
  ('0378', 'Seguridad y alta disponibilidad',                         false),
  -- SMX
  ('0221', 'Montaje y mantenimiento de equipos',                      false),
  ('0222', 'Sistemas operativos monopuesto',                          false),
  ('0223', 'Aplicaciones ofimáticas',                                 false),
  ('0224', 'Sistemas operativos en red',                              false),
  ('0225', 'Redes locales',                                           true),
  ('0226', 'Seguridad informática',                                   false),
  ('0227', 'Servicios en red',                                        false),
  ('0228', 'Aplicaciones web',                                        false)
on conflict (code) do nothing;

-- ═══════════════════════════ CICLO ↔ MÓDULO ═══════════════════════════
-- Helper inline: resuelve ids por código. curso 1/2, 0373 compartido DAM/DAW/ASIR.
insert into ciclo_modulo (ciclo_id, modulo_id, curso)
select c.id, m.id, v.curso
from (values
  -- DAM
  ('DAM','0483',1),('DAM','0484',1),('DAM','0485',1),('DAM','0373',1),('DAM','0487',1),
  ('DAM','0486',2),('DAM','0488',2),('DAM','0489',2),('DAM','0490',2),('DAM','0491',2),
  -- DAW
  ('DAW','0483',1),('DAW','0484',1),('DAW','0485',1),('DAW','0373',1),('DAW','0487',1),
  ('DAW','0612',2),('DAW','0613',2),('DAW','0614',2),('DAW','0615',2),
  -- ASIR
  ('ASIR','0369',1),('ASIR','0370',1),('ASIR','0371',1),('ASIR','0372',1),('ASIR','0373',1),
  ('ASIR','0374',2),('ASIR','0375',2),('ASIR','0376',2),('ASIR','0377',2),('ASIR','0378',2),
  -- SMX
  ('SMX','0221',1),('SMX','0222',1),('SMX','0223',1),('SMX','0225',1),('SMX','0226',1),
  ('SMX','0224',2),('SMX','0227',2),('SMX','0228',2)
) as v(ciclo_code, modulo_code, curso)
join ciclo c on c.code = v.ciclo_code
join modulo m on m.code = v.modulo_code
on conflict (ciclo_id, modulo_id) do nothing;

-- ══════════════════════ RA DE EJEMPLO (0485 y 0484) ═══════════════════
-- Resultados de Aprendizaje orientativos (LOE). A validar/completar con el BOE
-- y el decreto autonómico correspondiente.
insert into ra (modulo_id, code, description, sort_order)
select m.id, v.code, v.descr, v.ord
from (values
  ('0485','RA1','Reconoce la estructura de un programa informático, identificando los elementos del lenguaje.',1),
  ('0485','RA2','Escribe y prueba programas sencillos aplicando los fundamentos de la programación estructurada.',2),
  ('0485','RA3','Escribe y depura código usando las estructuras de control del lenguaje.',3),
  ('0485','RA4','Desarrolla programas organizados en funciones/métodos aplicando programación modular.',4),
  ('0485','RA5','Escribe programas que manipulan información con tipos de datos compuestos (arrays, cadenas, colecciones).',5),
  ('0485','RA6','Desarrolla programas aplicando los principios de la programación orientada a objetos.',6),
  ('0485','RA7','Realiza operaciones de entrada/salida y manejo de ficheros y excepciones.',7),
  ('0484','RA1','Reconoce los elementos de las bases de datos y la utilidad de los sistemas gestores.',1),
  ('0484','RA2','Diseña modelos lógicos normalizados interpretando diagramas entidad-relación.',2),
  ('0484','RA3','Realiza el diseño físico con el lenguaje de definición de datos (DDL).',3),
  ('0484','RA4','Consulta información almacenada usando el lenguaje de manipulación de datos (DML).',4),
  ('0484','RA5','Modifica la información almacenada mediante sentencias DML.',5),
  ('0484','RA6','Asegura la información analizando usuarios, privilegios y copias de seguridad.',6),
  ('0484','RA7','Desarrolla procedimientos almacenados y disparadores con el lenguaje del SGBD.',7)
) as v(modulo_code, code, descr, ord)
join modulo m on m.code = v.modulo_code
on conflict (modulo_id, code) do nothing;

-- ════════════════ EQUIVALENCIAS CATALANAS (EJEMPLO, A VALIDAR) ═════════
-- Mapeo orientativo código estatal ↔ M catalán. Completar con la numeración real.
insert into modulo_equiv_cat (modulo_id, codigo_cat, comunidad)
select m.id, v.codigo_cat, 'catalunya'
from (values
  ('0485','M03'),
  ('0484','M02'),
  ('0373','M05')
) as v(modulo_code, codigo_cat)
join modulo m on m.code = v.modulo_code;

-- ═══════════════════════════════ PACKS ════════════════════════════════
insert into pack (slug, name, price_eur, credits, bonus_pct, sort_order) values
  ('arranque', 'Arranque', 30,  30,  0,  1),
  ('estandar', 'Estándar', 100, 110, 10, 2),
  ('modulo',   'Módulo',   200, 230, 15, 3),
  ('curso',    'Curso',    400, 480, 20, 4)
on conflict (slug) do nothing;

-- ═══════════════════════════════ PLANES ═══════════════════════════════
-- Precios de Fase 1 = extremo bajo de los rangos de los docs (a validar).
insert into plan (kind, name, price_eur_month, features, sort_order) values
  ('gratis', 'Gratis', 0,
    '["Diagnóstico + Mapa de Dominio","10 consultas IA/semana"]'::jsonb, 1),
  ('companero', 'Compañero', 9.90,
    '["Bit ilimitado","Plan inverso vivo","Empujón diario","Quizzes","Modo examen"]'::jsonb, 2),
  ('acompana', 'Acompaña', 79,
    '["Tutor de referencia (check-in semanal)","Bit","Informes a la familia","1 sesión técnica/mes"]'::jsonb, 3),
  ('acompana_plus', 'Acompaña+', 149,
    '["Todo lo de Acompaña","4 sesiones técnicas/mes","Tickets Express incluidos","Simulacros"]'::jsonb, 4)
on conflict (kind) do nothing;

-- ══════════════════════════ MENTORES DE PRUEBA ════════════════════════
-- Crea usuarios en auth.users (el trigger crea su profile con rol 'mentor') y
-- luego su mentor_profile (verificado) y los módulos que imparten.
-- Contraseña dev para los tres: Tutor247Dev!  — SOLO para desarrollo local.
do $$
declare
  m record;
begin
  for m in
    select * from (values
      ('11111111-1111-1111-1111-111111111111'::uuid, 'laura.gomez@tutor247.dev', 'Laura Gómez',
       'experto', 'Especialista en 0485 Programación y 0486 Acceso a datos', array['es'],
       array['0485','0486','0484']),
      ('22222222-2222-2222-2222-222222222222'::uuid, 'marc.soler@tutor247.dev', 'Marc Soler',
       'pro', 'Full-stack · desarrollo web servidor y cliente (DAW)', array['es','ca'],
       array['0613','0612','0373']),
      ('33333333-3333-3333-3333-333333333333'::uuid, 'david.porti@tutor247.dev', 'David Porti',
       'mentor', 'Sysadmin y redes · ASIR/SMX', array['es','ca'],
       array['0370','0225','0372'])
    ) as t(id, email, full_name, lvl, headline, langs, modules)
  loop
    -- auth.users (dispara handle_new_user → crea profile rol mentor)
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
    ) values (
      '00000000-0000-0000-0000-000000000000', m.id, 'authenticated', 'authenticated',
      m.email, extensions.crypt('Tutor247Dev!', extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', m.full_name, 'role', 'mentor'),
      false, false
    ) on conflict (id) do nothing;

    -- identidad email (permite login en local)
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), m.id,
      jsonb_build_object('sub', m.id::text, 'email', m.email),
      'email', m.id::text, now(), now(), now()
    ) on conflict do nothing;

    -- mentor_profile verificado
    insert into mentor_profile (
      profile_id, level, status, headline, languages, response_time_minutes, verified_at
    ) values (
      m.id, m.lvl::mentor_level, 'verificado', m.headline, m.langs, 120, now()
    ) on conflict (profile_id) do nothing;

    -- módulos que imparte
    insert into mentor_modulo (mentor_id, modulo_id)
    select m.id, mo.id from modulo mo where mo.code = any (m.modules)
    on conflict do nothing;
  end loop;
end $$;
