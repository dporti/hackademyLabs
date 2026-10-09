# Prompts para Claude Code — fusión del diseño Checkpoint

Pega un prompt por sesión, en orden. No pases a la siguiente fase sin haber probado la anterior
en el navegador. Fases 7–9 (backend nuevo) se planificarán aparte.

---

## Fase 0 — Cerrar lo pendiente y preparar el terreno

```
Lee CLAUDE.md, docs/ESTADO.md y docs/diseno/DISENO.md.

1. Cierra la tarea "En curso" de ESTADO.md: dime los pasos para aplicar
   supabase/migrations/20261008090200_cancel_policy.sql en Supabase (yo la pego en el
   SQL Editor), regenera apply_all.sql si toca y, cuando te confirme, pasa
   node scripts/verify-consumo.mjs.
2. Actualiza CLAUDE.md con las decisiones de la sección 2 de DISENO.md: marca Checkpoint
   Academy + Tutor247, tema oscuro único (se elimina "family"), cian = Aprueba tu módulo,
   magenta = Tutor247, fuentes, ruta /tutor247. Añade que docs/diseno/ es la referencia
   visual y que DISENO.md manda en el aspecto.
3. Actualiza docs/ESTADO.md: nueva fase "Fusión del diseño" con las fases 1–9 de DISENO.md
   en "Próximos pasos" y las 5 decisiones en "Decisiones tomadas".
No toques código de la app en esta fase. Commit en español.
```

## Fase 1 — Marca y tokens

```
Lee CLAUDE.md, docs/ESTADO.md y docs/diseno/DISENO.md (secciones 2, 4 y 5).
Abre docs/diseno/pantallas/Main.html y Panel.html en el navegador para ver el estilo.

1. globals.css: ajusta [data-theme="student"] a los tokens de la sección 4, añade --warning
   y --sos (con sus utilidades en @theme), elimina [data-theme="family"] y todos sus usos
   (las páginas de familia pasan al tema oscuro; revisa contraste AA).
2. Mapa de Dominio a 4 niveles (Aún no / Con ayuda / Casi / Lo domino) en MapaDominio y
   RaBadge, con texto + forma, sin romper los datos actuales (mapea los 3 estados existentes).
3. Marca: appName y metadatos (es/ca) a Checkpoint Academy; componente Logo; header
   con la navegación del mockup (Aprueba tu módulo, Tutor247, Mentores, Tarifas,
   botón SOS, Test gratis, cuenta) y footer nuevo.
4. Actualiza /styleguide para mostrar tokens, Logo, SectionLabel, botones, tarjetas y
   los 4 niveles del Mapa.
Resultado esperado: toda la web cambia de marca y color sin rediseñar páginas todavía.
lint + build + prueba en navegador (es y ca) + commit + ESTADO.md.
```

## Fase 2 — Portada y Tutor247

```
Lee CLAUDE.md, docs/ESTADO.md y docs/diseno/DISENO.md (secciones 3, 5, 6 y 7).
Referencia: docs/diseno/pantallas/Main.html y Tutor247.html.

1. Reconstruye la home (src/app/[locale]/page.tsx) con el orden de secciones de la
   sección 6 de DISENO.md, usando componentes de src/components/brand/ (ModelCard,
   TrustStrip, BeforeAfter, PathFinder, ComparisonTable, FounderBlock, Faq...).
   Todos los textos a messages/es.json y ca.json. Módulos, mentores y precios desde BD.
   PathFinder y Faq son client components accesibles (teclado, aria-expanded).
   La sección de testimonios queda creada pero oculta.
2. Crea /tutor247 a partir de Tutor247.html (planes desde BD) con una sección
   id="familias" que absorba lo útil de la /familias actual; /familias redirige con 308.
3. Lo no construido (Bit, aula, Modo Examen, Rescate 48h, SOS en directo) lleva la
   etiqueta "Próximamente".
lint + build + prueba en navegador (es y ca, móvil y escritorio) + commit + ESTADO.md.
```

## Fase 3 — Resto de páginas públicas

```
Lee CLAUDE.md, docs/ESTADO.md y docs/diseno/DISENO.md.
Rediseña con las pantallas de referencia, sin cambiar la lógica ni las consultas:
/modulos y /ciclos (Modulos.html), /modulos/[code] (Modulo.html; propón cómo guardar
"5 errores que suspenden" por módulo y pregúntame antes de crear migración),
/mentores (Mentores.html), /mentores/[id] (Mentor.html), /precios (Precios.html, con los
dos modelos), /diagnostico (Diagnostico.html y Resultado.html), /registro, /entrar y
/onboarding (Registro.html), /hazte-mentor y /cancelacion con los mismos patrones.
Una página por commit. lint + build + navegador (es y ca) + ESTADO.md al final.
```

## Fase 4 — Panel del alumno

```
Lee CLAUDE.md, docs/ESTADO.md y docs/diseno/DISENO.md.
Referencia: Panel.html y Creditos.html.
1. Crea AppShell (barra lateral por rol, móvil en cabecera desplegable) y úsalo en /panel.
2. Rediseña el panel del alumno con los datos que ya existen (saldo, módulos y fechas de
   examen, tickets, sesiones). Lo que no tiene datos (racha, XP, plan inverso semanal) no
   se muestra todavía.
3. Crea /panel/creditos con saldo, caducidades, compra mock de packs e historial del ledger.
   Referidos: no se construyen aún.
verify-credits + lint + build + navegador + commit + ESTADO.md.
```

## Fase 5 — Tickets y sesiones

```
Lee CLAUDE.md, docs/ESTADO.md y docs/diseno/DISENO.md.
Rediseña /panel/tickets y /panel/tickets/[id] con el aspecto de SOS.html (Ticket Express /
normal; "SOS en directo" como Próximamente) y /panel/sesiones con el de Reserva.html, sin
tocar las RPC ni las reglas de cobro. verify-consumo + lint + build + navegador + commit +
ESTADO.md.
```

## Fase 6 — Paneles de mentor, familia y admin

```
Lee CLAUDE.md, docs/ESTADO.md y docs/diseno/DISENO.md.
Con AppShell y la referencia de PanelMentor.html, Familia.html y Admin.html, rediseña los
paneles de mentor, familia (tema oscuro, contraste AA, aviso de privacidad del alumno) y
admin con los datos que ya existen. Lo que dependa de Bit o de datos inexistentes no se
muestra. verify-roles + verify-family + lint + build + navegador + commit + ESTADO.md.
```
