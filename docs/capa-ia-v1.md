# Capa IA v1 — "Siempre hay alguien" (complemento a modelo-negocio-v1)

Versión 1 · 6 oct 2026 · Borrador.

## Principio rector
**IA primero, humano garantizado.** La IA está siempre (24/7, WhatsApp + web) para acompañar, ordenar y resolver lo sencillo. El mentor humano entra donde aporta valor: explicar lo difícil, motivar, preparar el examen. El alumno siempre sabe cuándo habla con la IA y siempre tiene un botón "quiero a mi mentor" con SLA.

Objetivo doble:
1. Alumno: sensación de "tengo a alguien conmigo todo el rato".
2. Mentor: dedicar su tiempo solo a lo que exige un humano (hipótesis a medir: reducir 40–60 % del tiempo en tareas repetitivas).

## 1. El compañero IA (persona de marca)
Nombre provisional: "Bit". Tono cercano, de colega que va un curso por delante. Conoce:
- el módulo y los RA del alumno,
- su Mapa de Dominio y su plan inverso,
- la fecha del examen,
- lo que trabajó con su mentor (resúmenes de sesión),
- su historial de dudas.

### Canales
- **WhatsApp (canal de contacto y empuje):** recordatorios del plan, quizzes de 2 min, dudas rápidas del módulo, reservas, avisos de créditos, check-in antes/después del examen. Número de la plataforma (nunca el del mentor → también frena el bypass).
- **App/web (PWA) (canal profundo):** tutor con código, pizarra, ejecución de ejercicios, Mapa de Dominio, historial.
- Opcional: Telegram/Discord para comunidad.

**Aviso normativo WhatsApp:** desde el 15/01/2026 Meta prohíbe en la API Business los chatbots de IA "de propósito general". Se permiten los asistentes ligados al servicio del negocio. Por eso Bit en WhatsApp debe estar acotado: plan, módulo matriculado, reservas, quizzes, escalado. El tutor "abierto" vive en la app. Validar con el proveedor (BSP) antes de lanzar.

## 2. Funcionalidades para el alumno
| Función | Qué hace | Canal |
|---|---|---|
| Diagnóstico adaptativo | Test que se ajusta según aciertos → Mapa de Dominio por RA | Web |
| Plan inverso vivo | Se recalcula si el alumno se retrasa o falla quizzes | Web + WhatsApp |
| Empujón diario | "Hoy toca RA3 – JOINs, 20 min. ¿Empiezas?" con enlace directo | WhatsApp |
| Quiz relámpago | 3–5 preguntas con repetición espaciada; alimenta el Mapa | WhatsApp |
| Tutor socrático 24/7 | Guía con preguntas y pistas, nunca entrega la solución de una práctica evaluable | App (WhatsApp limitado) |
| Debug guiado | El alumno pega error/código → la IA le hace localizar el fallo él mismo | App |
| Escalado a humano | Si la IA no está segura, el alumno se bloquea o lo pide → Ticket al mentor con resumen ya hecho | Ambos |
| Modo examen | Últimos 7 días: simulacros, chuletas por RA, plan de repaso, mensaje de ánimo la víspera | Ambos |
| Post-examen | "¿Cómo ha ido?" → si suspende, activa plan de recuperación (y garantía) | WhatsApp |
| Detector de ánimo | Detecta frustración o abandono → avisa al mentor para llamada humana | Interno |

## 3. Funcionalidades para el mentor (descargar peso)
- **Brief pre-sesión:** 30 s de lectura: RA flojos, últimas dudas, errores repetidos, estado de ánimo.
- **Resumen post-sesión automático** (con consentimiento de grabación): puntos vistos, tareas, actualización del plan, mensaje al alumno.
- **Borradores de respuesta a tickets:** el mentor revisa/edita y envía. Los tickets sencillos los resuelve la IA y el mentor solo audita.
- **Generador de material por RA:** ejercicios, simulacros y rúbricas en el estilo del módulo; banco común revisado por mentores.
- **Corrección asistida:** pre-corrección de simulacros con rúbrica; el mentor valida la nota.
- **Alertas de riesgo:** alumnos que no abren el plan, bajan aciertos o se acercan al examen en rojo.
- **Agenda inteligente:** propone huecos y agrupa alumnos con el mismo RA flojo → grupo reducido (más margen).

## 4. Para familias y para el negocio
- **Informe semanal a la familia** (alumnos menores o si el alumno lo autoriza): progreso del Mapa, constancia, próxima fecha clave.
- **Matching IA alumno-mentor:** por módulo, horario, estilo y valoraciones.
- **Captación:** widget "¿Qué módulo te preocupa?" en la home → mini diagnóstico → Mapa de Dominio → oferta. Contenido SEO por módulo/RA generado y revisado por mentores.
- **Ventas por WhatsApp:** onboarding y recuperación de carritos abandonados conversacional.

## 5. Impacto en el modelo de créditos
Nueva capa de suscripción para tener ingresos recurrentes:
| Plan | Incluye | Precio orientativo |
|---|---|---|
| Gratis | Diagnóstico + Mapa + 10 consultas IA/semana | 0 € |
| **Compañero** | Bit ilimitado, plan inverso vivo, empujón diario, quizzes, modo examen | 9,90–14,90 €/mes |
| Créditos (packs) | Todo lo humano: sesiones, tickets, Rescate 48h, Plan Módulo | Igual que v1 |

- Plan Módulo y Rescate 48h incluyen Compañero durante su vigencia.
- Ticket Express humano puede bajar de precio porque la IA filtra y resume; el mentor gana más por hora efectiva.
- Coste IA por alumno activo: estimar con pruebas reales (tokens + mensajes WhatsApp) antes de fijar precio.

## 6. Reglas de oro (confianza)
1. Transparencia: Bit se presenta siempre como IA (también exigido por el AI Act a partir de ago 2026).
2. Integridad académica: no hace prácticas ni exámenes; detecta "hazme la práctica" y reconduce a aprender.
3. Humano garantizado: botón de escalado siempre visible, con SLA.
4. El Mapa de Dominio es orientativo, no una nota oficial (evita entrar en "evaluación de resultados" de alto riesgo del AI Act; revisar con asesor).
5. Menores: consentimiento de tutores para WhatsApp y grabaciones; RGPD (edad de consentimiento digital en España: 14).
6. Calidad: respuestas basadas en el banco de material revisado por mentores (RAG por módulo/RA), no en conocimiento libre del modelo.

## 7. Stack orientativo (para la fase web)
WhatsApp Cloud API vía BSP (Twilio, 360dialog…) · LLM vía API con RAG sobre materiales por RA · Backend propio (orquestación, créditos, planes) · Automatizaciones (n8n o colas propias) · Videollamada integrada con grabación y transcripción · Panel mentor con bandeja de tickets + borradores IA.

## 8. MVP IA (orden sugerido)
1. Diagnóstico + Mapa de Dominio con IA (gancho de captación).
2. WhatsApp: empujón diario + quiz + escalado a ticket humano.
3. Brief pre-sesión y resumen post-sesión para el mentor.
4. Tutor socrático en la app con RAG del módulo piloto (0485 o 0484).
5. Suscripción Compañero.
