# Diseño Checkpoint Academy — referencia para el proyecto

> Creado el 2026-10-09 a partir del mockup del lienzo «Checkpoint Academy — Mockup».
> Este documento y la carpeta `pantallas/` son la **referencia visual**. Los datos, la lógica,
> la seguridad y el i18n siguen las reglas de `CLAUDE.md`. Si algo choca, gana `CLAUDE.md`
> y se pregunta a David.

## 1. Cómo usar esta carpeta

- `pantallas/*.html`: las 23 pantallas del mockup en HTML estático. Ábrelas en el navegador
  (`index.html` las enlaza todas) para ver composición, jerarquía, textos y colores.
  Son una maqueta: estilos en línea, datos de ejemplo y sin lógica. **No se copian tal cual**:
  se reconstruyen con componentes React, tokens de `globals.css` y textos en `messages/`.
- Las partes interactivas del mockup («Encuentra tu camino», FAQ) se ven en un estado fijo;
  su comportamiento está descrito en la sección 6.
- Todo lo que en las pantallas aparece como `[XX]`, nombres de ejemplo (Laura M., Marta…),
  cifras de paneles o testimonios marcados «Texto de ejemplo» **no va a producción**.

## 2. Decisiones de marca (cerradas el 2026-10-09)

| # | Decisión | Decidido |
|---|---|---|
| 1 | Marca | **Checkpoint Academy**, con **Tutor247** como segundo producto. `hackademyLabs` queda solo como nombre del repositorio. |
| 2 | Colores | **Cian `#2EF2FF`** = Aprueba tu módulo (primario). **Magenta `#FF3DCB`** = Tutor247 (sustituye al violeta). |
| 3 | Familias | **Todo oscuro**: desaparece el tema claro `family`; landing y panel de familia en el tema oscuro, con magenta como acento. Vigilar contraste AA. |
| 4 | Fuentes | **Space Grotesk** títulos · **Inter** texto y paneles · **JetBrains Mono** códigos, RA, cifras y etiquetas. |
| 5 | Ruta de Tutor247 | **`/tutor247`** nueva; `/familias` redirige (308) a `/tutor247#familias`. |

## 3. Los dos modelos de negocio

| | Aprueba tu módulo | Tutor247 |
|---|---|---|
| Color | Cian | Magenta |
| Para quién | Tiene un módulo concreto y un examen con fecha | Le cuesta la constancia, estudia online, o es menor y la familia quiere seguimiento |
| Qué compra | Aprobar ese módulo | Acompañamiento todo el curso |
| Humano | Mentor especialista del módulo | Tutor de referencia fijo + mentores por módulo |
| IA | Bit socrático + Modo Examen | Bit 24/7: recordatorios, quizzes, empujón diario |
| Pago | Créditos (packs) / Plan Módulo | Suscripción mensual (Autónomo / Familia / Familia+) |
| Lema | «No te damos clases. Te sacamos el módulo.» | «Siempre hay alguien. Y no te suelta.» |

Segmentos transversales de la portada: **presencial** («Lo que no da tiempo a explicar en clase,
te lo explicamos aquí») y **online** («Estudiar online no debería ser estudiar solo»).

## 4. Tokens (tema oscuro único)

Se ajusta `[data-theme="student"]` en `src/app/globals.css` (y se elimina `family`):

| Token | Valor | Uso |
|---|---|---|
| `--background` | `#07080F` | Fondo |
| `--card` | `#0E1019` | Tarjetas |
| `--surface-2` | `#151826` | Superficies elevadas, chips |
| `--border` | `#23263A` | Bordes (`#1C1F30` para separadores) |
| `--foreground` | `#E8EAF2` | Texto |
| `--muted-foreground` | `#A9AEC4` | Texto secundario (`#8A90A8` etiquetas; nunca más oscuro en texto) |
| `--primary` | `#2EF2FF` | Aprueba tu módulo, CTA principal; texto sobre él `#05060B` |
| `--secondary` | `#FF3DCB` | Tutor247; texto sobre él `#120A14`; en texto pequeño usar `#FF8BE0` |
| `--accent-pass` | `#7CFF5B` | **Solo** aprobado / dominado / «va bien» |
| `--warning` (nuevo) | `#FFB020` | «Con ayuda», atención, retos |
| `--sos` (nuevo) | `#FF5A36` | Ticket SOS / urgente; texto `#FF7A5C` |
| Fondos tintados | cian `#0A1419` borde `#1F4C55` · magenta `#120A14` borde `#5A2450` · ámbar `#1A1408` borde `#5A3A10` · SOS `#160B0A` · verde `#0A120A` borde `#2A5A1A` | Bloques destacados de cada familia de color |
| Radio | tarjetas 16 px · bloques grandes 20–24 px · botones 10–12 px · chips 6 px | |
| Glow | `0 0 60px rgba(46,242,255,.10)` (cian) · `rgba(255,61,203,.10)` (magenta) | Solo en el bloque destacado de cada sección |
| Rejilla HUD | líneas `#10121C` cada 48 px | Portada y CTA final (`.hud-grid`) |

**Mapa de Dominio: 4 niveles** (sustituye al semáforo de 3): Aún no (magenta) · Con ayuda (ámbar)
· Casi (cian oscuro `#7FD8E0`) · Lo domino (cian). Siempre con texto, nunca solo color.
El Mapa es orientativo, no una nota oficial (decirlo en la UI).

## 5. Componentes

Nuevos en `src/components/brand/`:
`Logo` (✓ en cuadrado cian + «Checkpoint.» con punto magenta + «ACADEMY» en mono) ·
`SectionLabel` («01 — TEXTO» en mono, cian o magenta) · `ModelCard` · `ComparisonTable` ·
`PathFinder` (cliente) · `Faq` (cliente, acordeón accesible) · `FounderBlock` · `TrustStrip` ·
`BeforeAfter` · `AppShell` (barra lateral por rol: alumno, mentor, tutor, familia, admin).

Se reutilizan restyleados: `MapaDominio`, `RaBadge`, `ModuleCard`, `MentorCard`, `BitChatDemo`,
`InformeSemanal`, `Button`, `Card`, `Badge`.

Patrones del mockup: etiqueta de sección en mono + título 38–46 px; tarjetas `#0E1019` con borde
`#23263A`; un único bloque destacado por sección (borde de color + glow); botones de 44–60 px de
alto; iconos de línea (lucide), nunca emojis.

## 6. Pantallas: mockup → proyecto

| Archivo en `pantallas/` | Ruta | Qué hacer | Fase |
|---|---|---|---|
| `Main.html` | `/` | Rediseño completo (ver orden de secciones abajo) | 2 |
| `Tutor247.html` | `/tutor247` (nueva) | Landing del modelo; sección `#familias`; `/familias` redirige | 2 |
| `Modulos.html` | `/modulos`, `/ciclos` | Rediseño; datos de BD | 3 |
| `Modulo.html` | `/modulos/[code]` | Rediseño; «5 errores que suspenden» como dato por módulo | 3 |
| `Mentores.html` | `/mentores` | Rediseño + filtros | 3 |
| `Mentor.html` | `/mentores/[id]` | Rediseño; disponibilidad real cuando exista agenda | 3 |
| `Precios.html` | `/precios` | Rediseño con los dos modelos; planes y packs de BD | 3 |
| `Diagnostico.html` + `Resultado.html` | `/diagnostico` | Rediseño del paso a paso y del resultado | 3 |
| `Registro.html` | `/registro`, `/entrar`, `/onboarding` | Rediseño de `AuthShell` | 3 |
| `Panel.html` | `/panel` (alumno) | `AppShell` + panel con datos actuales | 4 |
| `Creditos.html` | `/panel/creditos` (nueva) | Saldo + ledger reales; referidos → fase 8 | 4 |
| `SOS.html` | `/panel/tickets` | Rediseño; «SOS en directo» → backend futuro | 5 |
| `Reserva.html` | `/panel/sesiones` | Rediseño; calendario real cuando haya agenda | 5 |
| `PanelMentor.html` | `/panel` (mentor) | Rediseño; brief de Bit cuando exista Bit | 6 |
| `Familia.html` | `/panel` (familia) | Rediseño en tema oscuro | 6 |
| `Admin.html` | `/panel` (admin) | Rediseño | 6 |
| `Mapa.html` | `/panel/mapa` (nueva) | Necesita progreso por RA guardado | 7 |
| `PanelTutor.html` | `/panel` (rol `tutor`, nuevo) | Rol + cartera | 7 |
| `Logros.html` | `/panel/logros` | XP, insignias, racha | 8 |
| `Bit.html` | `/panel/bit` | API de Claude + RAG por módulo | 8 |
| `Aula.html` | aula integrada | Sustituye a Jitsi | 9 |
| `Movil.html` | PWA / WhatsApp | | 9 |

`/hazte-mentor` y `/cancelacion` no están en el mockup: se rediseñan con los mismos patrones (fase 3).

### Orden de secciones de la portada

1. Hero: «La revolución de las clases online · FP Informática», **«Aprende con IA. Demuéstralo sin ella.»**,
   buscador «¿Qué módulo te preocupa?» + «Test gratis», fila de 4 datos, demo de código con Bit y mentor.
2. Dos modelos: `ModelCard` cian (Aprueba tu módulo) y magenta (Tutor247).
3. Franja de frases (ticker) + `TrustStrip`.
4. `BeforeAfter` («La IA te lo hace todo. Y luego llega el examen.»).
5. ¿Cómo estudias? Presencial vs online.
6. `PathFinder` «Encuentra tu camino»: 3 preguntas → recomienda un modelo.
   Regla: Tutor247 si «me cuesta ser constante» = sí, o «mi familia también», o «no tengo fecha»;
   si no, Aprueba tu módulo.
7. Aprueba tu módulo: 5 pasos, módulos más suspendidos (de BD), productos, garantía.
8. La fórmula: IA + mentor + tú = aprobado; Modo Examen + Mapa de Dominio.
9. Tutor247: semana tipo + chat de ejemplo con Bit y el tutor.
10. `ComparisonTable` «¿Cuál es el mío?».
11. Mentores (de BD) + bloque SOS.
12. `FounderBlock`: David Porti Pujal, profesor de FP Informática, 18 años.
13. Testimonios: **oculto hasta tener testimonios reales con permiso**.
14. `Faq` (7 preguntas, textos en sección 7).
15. CTA final con aviso de programa piloto (plazas por decidir).

## 7. Textos clave (pasar a `messages/es.json` y traducir a `ca.json`)

Lemas: «Aprende con IA. Demuéstralo sin ella.» · «No te damos clases. Te sacamos el módulo.» ·
«El examen tiene fecha. Tu plan también.» · «Siempre hay alguien. Y no te suelta.» ·
«Tú estudias. Nosotros no te soltamos.» · «Estudiar online no debería ser estudiar solo.» ·
«La IA a tu favor, no en tu lugar.» · «IA + mentor + tú = aprobado.» ·
«Copiar no es aprender. Entenderlo es aprobar.» · «No hacemos tus prácticas. Te enseñamos a hacerlas.»

El resto de textos (FAQ, tarjetas, secciones) está en los HTML de `pantallas/`; tomarlos de ahí.

## 8. Reglas al implementar

- Ningún texto en el código: `messages/es.json` **y** `messages/ca.json`.
- Datos siempre de BD; nada de cifras ni nombres del mockup en producción.
- Lo no construido (Bit, aula, Modo Examen, logros, referidos, Rescate 48h, SOS en directo):
  visible como **«Próximamente»** en la web pública y oculto en el panel.
- Sin testimonios ni estadísticas inventadas.
- Accesibilidad: contraste AA, estado con texto y forma, `prefers-reduced-motion`,
  objetivos táctiles de 44 px, responsive desde 360 px.
- Se mantienen ledger inmutable, RLS, anti-bypass, consentimiento familiar e integridad académica.
- Cierre de cada fase: `npm run lint`, `npm run build`, `verify-*` afectados, prueba en navegador
  (es y ca), commit en español y `docs/ESTADO.md` actualizado.
