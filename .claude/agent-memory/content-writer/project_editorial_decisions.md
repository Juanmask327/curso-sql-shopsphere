---
name: editorial-decisions
description: Decisiones de tono, estilo y narrativa tomadas para el curso — evitar repetirlas o contradecirlas
metadata:
  type: project
---

## Tono general del curso

- **Latinoamericano real, no genérico americano traducido.** Usar dinámicas de startups LatAm: informalidad horizontal, presión por resultados, mezcla de inglés/español en términos técnicos de negocio.
- **Sin frases corporativas vacías.** Prohibido: "¡Bienvenido a bordo!", "¡Estamos emocionados de tenerte!", "¡El equipo te da la bienvenida!"
- **Urgencia calibrada:** no todo es urgente. Ejercicios básicos = consultas rutinarias. Los emails de crisis se reservan para ejercicios de nivel medio-alto.
- **El español es natural, no traducido.** Los personajes hablan como hablan los profesionales de startups en CDMX, Bogotá o Santiago — no como un manual corporativo.

## Decisiones narrativas tomadas

- Andrés Palacios (cofundador original) renunció en 2020 y no aparece más en la narrativa activa del curso.
- Valentina Torres fue contratada hace 8 meses (desde mayo 2026 = septiembre 2025). Es la primera Head of Analytics de la empresa.
- El analista anterior de Valentina renunció para irse a una fintech en CDMX — eso explica por qué hay un puesto vacante.
- El estudiante es el primer analista que contrata Valentina en ShopSphere.
- Marco Jiménez vive en CDMX (se mudó en 2022 cuando México se volvió el mercado principal).

## Situaciones empresariales ya utilizadas

- Email de bienvenida de Valentina al estudiante (primer día)
- Contexto general de la empresa establecido en shopsphere-world.md
- Reunión de Marco con inversores (fondos mexicano y chileno) para Q1 2026 — usada en proyecto-nivel-02.md. La reunión es el martes siguiente a la fecha del encargo. Fondos preguntan específicamente por valor del cliente primer año y crecimiento interanual.
- Campaña Día de Madres México (5–10 de mayo) — usada como contexto en briefings-nivel-02.md (briefing 2.3 de Sofía) y como segunda capa de análisis en briefings-nivel-03.md (briefing 3.2, ahora con revenue + unidades + pedidos distintos)
- Black Friday 2024 vs 2025 comparativo — usada en briefings-nivel-02.md (briefing 2.11). Black Friday 2025 específico (28 nov) reaparece en briefing 3.7 para análisis de top productos por unidades
- Línea hogar premium (entrada septiembre 2025) — mencionada en briefings-nivel-01.md como contexto de verificación de catálogo (Diego, briefing 1.9). Reaparece en briefing 3.7: Sofía pregunta si hogar premium apareció entre top sellers del Black Friday 2025
- Anomalía pagos Chile (mar–abr 2026) — referenciada indirectamente en briefing 2.10 (pedidos cancelados por país)
- Reunión con proveedores (jueves, proyecto-nivel-03.md) — Diego necesita análisis de revenue por categoría, top 15 productos, productos con precio mal configurado, categorías sin movimiento y precio promedio real por ítem. Plazo: miércoles al mediodía
- Marco pregunta "¿qué productos nos dejan plata?" — disparador narrativo del Nivel 3, aparece en intro-nivel-03.md y briefing 3.1
- Campaña de reactivación de clientes sin compra — Sofía quiere la lista de clientes registrados que nunca compraron (briefing 3.6). Valentina advierte que si son más de 500 hay que avisarle antes de pasarle la lista a Sofía
- Hipótesis de bundles tecnología + otras categorías — Sofía quiere saber qué categorías acompañan a tecnología en el mismo pedido (briefing 3.11)
- Análisis post-crisis de devoluciones julio 2025 — Valentina encarga el análisis formal tres meses después del spike (proyecto-nivel-04.md). Tono: investigación sin urgencia, no crisis activa.
- Campaña de recuperación Q1 2026 de Sofía — target: clientes que compraron en Q3 2025 pero no volvieron en Q4 (briefings 4.9 y 4.10, complementarios entre sí)
- Marco pregunta por clientes que no volvieron tras devolución aprobada (briefing 4.11) y por los que sí siguieron comprando (briefing 4.12) — preguntas imprecisas que se resuelven con EXISTS / NOT EXISTS
- Tabla `returns` introducida en Nivel 4: return_id, order_id, product_id, returned_at, reason, status (pending/approved/rejected/refunded)
- Tabla `inventory` introducida en Nivel 5: inventory_id, product_id, stock, updated_at
- Marco pide top 3 clientes por país (briefing 5.7) — disparador narrativo directo del feedback que dio tras el análisis de Nivel 4 ("quiero saber quiénes son nuestros mejores clientes en cada país, no en total")
- Campaña de invierno junio–julio — Sofía pide ranking de categorías con evolución mensual para decidir distribución de presupuesto (briefing 5.11)
- Reunión mensual Diego con equipo de compras (primer jueves de junio 2026) — usada como contexto del proyecto-nivel-05.md. Preguntas: stock crítico rankeado, ranking de performance por categoría, cuartil inferior de ventas (candidatos a descontinuar), concentración de stock crítico por categoría, días de stock vs. ritmo de ventas, top 3 productos por país
- Ana pide concentración de revenue: qué porcentaje viene del quintil superior de productos (briefing 5.9) — análisis de riesgo de portafolio para cierre de mayo 2026
- Ana pide ranking de países por revenue neto descontando devoluciones, para cierre Q1 2026 (briefing 5.10)
- Discusión Sofía vs Ana sobre Black Friday 2025 — usada como disparador narrativo del Nivel 6. Sofía lo llama fracaso (volumen menor), Ana lo llama éxito (margen mayor). Ninguna tenía métrica acordada.
- Campaña "Regreso a Clases" marzo 2025 (MX/CO/CL) — Sofía vuelve a referenciarla en briefing 6.1: nunca se desagregó cuál de los tres canales rindió peor. Se plantea como deuda analítica pendiente.
- Análisis de cohorte hogar premium (briefing 6.4): clientes con primera compra septiembre 2025, retención en octubre–noviembre 2025.
- Análisis de estacionalidad histórica (briefing 6.12): Valentina quiere el revenue promedio por mes del año usando todos los datos disponibles — para anticipar pregunta de Marco.
- Proyecto nivel 6 encargado por Valentina a Sofía: análisis comparativo de campañas Q1 2025 vs Q1 2026 para decisión de presupuesto Q2 2026. Plazo: viernes 12 de junio. Cinco preguntas: ROI por campaña, tendencia MoM por canal (LAG), comparación Q1 vs Q1, retención por canal de adquisición, CAC estimado por canal.
- Cierre del proyecto nivel 6: "El objetivo no es el número — es la decisión que toma Sofía con ese número." (frase de Valentina).
- Tabla `payments` introducida en Nivel 8: payment_id, order_id, amount, method (credit_card/paypal/bank_transfer/crypto), status (pending/completed/failed/refunded), paid_at.
- Informe Q1 2026 para la junta directiva — encargo formal de Ana Castillo, audiencia: fondo chileno y fondo mexicano (inversores Serie A), plazo: miércoles 17 de junio al mediodía, presentación junta: jueves 18 de junio.
- Anomalía de Chile (mar–abr 2026) usada como caso central del Nivel 8: briefings 8.2 (tasa de fallo por método de pago por país) y 8.3 (NULLs en paid_at con status completed). Reaparece en Capstone como Pregunta 7.
- NULLs en paid_at con status completed — problema de integridad de datos introducido en briefing 8.3, reaparece en proyecto-nivel-08.md (punto 3) y Capstone (Pregunta 8).
- Serie B de financiamiento — USD 25 millones para expansión a Brasil y Ecuador. Disparador narrativo del Capstone. Marco encarga auditoría a Valentina, Valentina al estudiante.
- Cierre del Capstone (frase de Valentina): "Llevas ocho niveles aprendiendo a hacer esto bien. Este es el momento de demostrarlo." — cierre del arco narrativo completo del curso.

## Convenciones establecidas en briefings

- Valentina firma siempre "— Vale" (guión largo, sin espacio antes)
- Marco firma "M" o "Gracias / M"
- Ana siempre incluye CC a Valentina en pedidos formales
- Sofía incluye CC a Valentina en pedidos que implican análisis de campaña
- Diego distingue explícitamente entre "urgente para hoy" vs "para esta semana"
- Los briefings básicos (Nivel 1) no usan crisis como contexto — son consultas de rutina o preparación de materiales

**Why:** Evitar contradicciones en la narrativa a medida que se construyen más niveles del curso.

**How to apply:** Antes de introducir un evento nuevo o un dato biográfico de un personaje, revisar este archivo para asegurarse de que no contradice algo ya establecido. Si hay un evento nuevo relevante, añadirlo aquí.
