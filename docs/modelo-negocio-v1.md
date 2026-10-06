# Modelo de negocio v1 — Plataforma "Aprueba tu módulo" (FP Informática)

Versión 1 · 6 oct 2026 · Borrador para iterar antes de diseñar la web.

## 1. La idea en una frase
No vendemos clases: vendemos **superar un módulo concreto** (p. ej. "0485 Programación de DAM"). El alumno llega con un problema ("suspendo Programación", "examen de BBDD en 12 días") y sale con un plan, un mentor que domina ese módulo y un seguimiento hasta el examen.

**Promesa de marca (borradores):** "No te damos clases. Te sacamos el módulo." · "Tu módulo, aprobado. Con plan y con mentor."

## 2. Qué lo hace distinto (lo "nunca visto")
1. **Catálogo por módulo oficial, no por asignatura genérica.** Cada módulo con su código (0484, 0485, 0612…), sus Resultados de Aprendizaje (RA) y criterios de evaluación del BOE/decreto autonómico. Nadie en el mercado de repaso trabaja así.
2. **Mapa de Dominio.** Test diagnóstico → mapa visual del módulo por RA (verde/ámbar/rojo). Es el "antes/después" que el alumno (y su familia) ve.
3. **Plan inverso.** El alumno pone la fecha del examen; la plataforma calcula qué RA trabajar cada semana y cuántos créditos necesitará. Convierte "clases" en "proyecto con fecha".
4. **Productos de urgencia** (Ticket Express, Rescate 48h): se monetiza el pico de estrés, que es cuando el alumno compra.
5. **Mentores verificados de FP**, filtrables por módulo, con métricas reales (alumnos ayudados en ese módulo, valoración, tiempo de respuesta).
6. **Línea roja ética:** ayudamos a entender y aprobar; **no hacemos prácticas ni exámenes**. Es argumento de confianza para familias y centros.

## 3. Catálogo inicial de módulos (LOE, actualizados por RD 405/2023 y Ley 3/2022)

### Tronco común DAM + DAW (1.º curso) — máxima demanda
| Código | Módulo |
|---|---|
| 0483 | Sistemas informáticos |
| 0484 | Bases de datos |
| 0485 | Programación |
| 0373 | Lenguajes de marcas y sistemas de gestión de información (también en ASIR) |
| 0487 | Entornos de desarrollo |

### DAM (2.º)
| Código | Módulo |
|---|---|
| 0486 | Acceso a datos |
| 0488 | Desarrollo de interfaces |
| 0489 | Programación multimedia y dispositivos móviles |
| 0490 | Programación de servicios y procesos |
| 0491 | Sistemas de gestión empresarial |

### DAW (2.º)
| Código | Módulo |
|---|---|
| 0612 | Desarrollo web en entorno cliente |
| 0613 | Desarrollo web en entorno servidor |
| 0614 | Despliegue de aplicaciones web |
| 0615 | Diseño de interfaces web |

### ASIR (ASIX en Cataluña)
| Código | Módulo |
|---|---|
| 0369 | Implantación de sistemas operativos |
| 0370 | Planificación y administración de redes |
| 0371 | Fundamentos de hardware |
| 0372 | Gestión de bases de datos |
| 0373 | Lenguajes de marcas y SGI |
| 0374 | Administración de sistemas operativos |
| 0375 | Servicios de red e Internet |
| 0376 | Implantación de aplicaciones web |
| 0377 | Administración de sistemas gestores de bases de datos |
| 0378 | Seguridad y alta disponibilidad |

### SMX (Grado medio)
| Código | Módulo |
|---|---|
| 0221 | Montaje y mantenimiento de equipos |
| 0222 | Sistemas operativos monopuesto |
| 0223 | Aplicaciones ofimáticas |
| 0224 | Sistemas operativos en red |
| 0225 | Redes locales |
| 0226 | Seguridad informática |
| 0227 | Servicios en red |
| 0228 | Aplicaciones web |

### Transversales (todos los ciclos, tras la reforma)
Proyecto intermodular · Itinerario personal para la empleabilidad I y II (sustituyen FOL/EIE) · Inglés profesional · Digitalización aplicada a los sectores productivos · Sostenibilidad aplicada al sistema productivo · Optativa.
→ Prioridad: **Proyecto intermodular** (producto "Defensa de proyecto"). El resto, fase 2.

**Ojo Cataluña:** los ciclos se organizan en M01–M16 con UF. La web debe tener una capa de equivalencias (código estatal ↔ M/UF catalán) para que el alumno encuentre "su" módulo. Lo mismo, a futuro, con otras comunidades.

**Módulos "killer" para lanzar (más suspensos = más demanda):** 0485 Programación, 0484 Bases de datos, 0373 Lenguajes de marcas, 0613 Servidor, 0486 Acceso a datos, 0370 Redes, 0225 Redes locales.

## 4. Segmentos de cliente
| Segmento | Dolor | Producto estrella |
|---|---|---|
| Alumno a distancia (Planeta FP, Ilerna, MEDAC, IOC…) | Va solo, nadie le resuelve dudas a tiempo | Plan Módulo + Tickets Express |
| Alumno presencial atascado | Se descuelga en 1.º (Programación/BBDD) | Plan Módulo |
| Repetidor / módulos pendientes | Recuperación con fecha fija | Rescate 48h + simulacros |
| Alumno de grado medio (SMX), a menudo menor | Paga la familia | Plan Módulo con **informe para familias** |
| Alumno de 2.º con Proyecto intermodular | Miedo a la defensa | Defensa de proyecto |

Estacionalidad: picos en evaluaciones del 1.er trimestre (nov–dic), finales y recuperaciones (may–jun) y extraordinarias/inicio de curso (sep). Campañas de marketing alineadas a estas fechas.

## 5. Sistema de créditos
**Regla base:** 1 crédito ≈ 1 € (fácil de entender, permite bonus).

### Packs (propuesta inicial)
| Pack | Precio | Créditos | Bonus |
|---|---|---|---|
| Arranque | 30 € | 30 | — |
| Estándar | 100 € | 110 | +10 % |
| Módulo | 200 € | 230 | +15 % |
| Curso | 400 € | 480 | +20 % |
Créditos con caducidad de 12 meses (incentiva uso y evita pasivo contable eterno).

### En qué se gastan
| Producto | Qué es | Créditos (orientativo) |
|---|---|---|
| Diagnóstico + Mapa de Dominio | Test por RA + informe | Gratis (gancho) |
| Sesión 1:1 (60 min) | Videoclase en aula integrada | 25–35 según nivel del mentor |
| Sesión flash (25 min) | Duda concreta en directo | 12–15 |
| **Ticket Express** | Duda escrita/código, respuesta < 2 h (horario ampliado) | 6–8 |
| Ticket Normal | Respuesta < 24 h | 3–4 |
| Revisión explicada | El mentor revisa tu código/práctica y explica qué falla (no la rehace) | 10–15 |
| Simulacro de examen | Examen tipo del módulo + corrección comentada | 15–20 |
| **Rescate 48h** | 2 días pre-examen: 3 sesiones + tickets ilimitados + simulacro | 90–120 |
| **Plan Módulo** | Diagnóstico, plan inverso, X sesiones, tickets, simulacros hasta el examen | 180–300 |
| Defensa de proyecto | Ensayo de defensa con feedback | 30–40 |
| Grupo reducido (máx. 5) | Sesión temática por módulo | 8–10 por alumno |

**Garantía "Seguimos contigo"** (solo Plan Módulo): si cumples el plan (asistencia y tareas ≥ 80 %) y suspendes, la preparación de la recuperación sale con 50 % de créditos devueltos. Es la promesa que nos separa de "academia de clases".

## 6. Mentores
**Perfil público:** foto, módulos que domina (por código), ciclos, experiencia (docente FP en activo / desarrollador / sysadmin), idiomas (cat/cast), valoraciones, nº de alumnos por módulo, tiempo medio de respuesta, vídeo de presentación de 60 s.

**Verificación:** entrevista + prueba técnica por módulo. Insignias: "Docente FP", "Especialista 0485", "Top Rescate".

**Niveles:** Mentor → Mentor Pro → Mentor Experto (precio de sesión y % de reparto suben con valoraciones y resultados).

**Reparto:** el mentor cobra 60–70 % de los créditos consumidos (sube con el nivel). Liquidación mensual. Productos empaquetados (Plan Módulo, Rescate) se reparten por tareas realizadas.

**Lo que la plataforma da al mentor:** alumnos sin buscar, cobro garantizado, aula online, banco de materiales y simulacros por RA, agenda y facturación.

## 7. Evitar que se salten la plataforma
- El valor vive dentro: Mapa de Dominio, plan, simulacros, histórico, garantía y tickets solo existen en la web.
- Pago siempre en créditos; el mentor no gestiona cobros.
- Comisión decreciente con antigüedad del vínculo alumno-mentor (fuera de la plataforma no le compensa).
- Datos de contacto ocultos y filtro en el chat; cláusula de no captación en el contrato del mentor.
- La garantía y los bonus solo aplican dentro.

## 8. Crecimiento y retención
- **Referidos:** quien invita y el invitado reciben créditos cuando el invitado compra su primer pack.
- **Gamificación:** progreso del Mapa de Dominio, rachas de estudio, insignias por RA dominado, "módulo superado" compartible.
- **Contenido gratuito por módulo** (SEO): "Cómo aprobar 0485 Programación", chuletas por RA, exámenes tipo. Cada página de módulo = landing de venta.
- **Comunidad por ciclo** (Discord/foro moderado) como embudo.
- **Embajadores** en centros (alumnos de 2.º que traen a 1.º).
- Fase 2: acuerdos B2B con centros a distancia (paquetes de tutoría de refuerzo).

## 9. Métricas clave
Tasa de aprobado de alumnos con Plan Módulo · conversión diagnóstico → compra · ticket medio por alumno · % créditos consumidos · repetición de compra al curso siguiente · NPS · tiempo de respuesta de tickets.

## 10. Estructura de la futura web (borrador)
Home (promesa + buscador "¿qué módulo te preocupa?") · Ciclos → Módulos (ficha por módulo con RA, dificultad, mentores, productos) · Mentores (listado + perfil) · Diagnóstico gratis · Precios/créditos · Panel del alumno (Mapa de Dominio, plan, créditos, tickets, aula) · Panel del mentor · Panel familia · Blog/recursos.

## 11. Decisiones pendientes
- Nombre y marca.
- Precio real del crédito y % de reparto con mentores.
- Horario y SLA del Ticket Express.
- Condiciones exactas de la garantía.
- MVP: ¿lanzar con 3–5 módulos killer y pocos mentores (incluido David) o con el catálogo completo?
- Aspectos legales: menores (consentimiento de tutores), facturación de mentores (autónomos), RGPD de grabaciones.
