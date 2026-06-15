---
name: course-files
description: Archivos del curso ya creados y su propósito — referencia para no duplicar contenido
metadata:
  type: reference
---

## Archivos de contenido

- `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\contenido\shopsphere-world.md` — Biblia fundacional. Parte A: historia y estructura de la empresa. Parte B: perfiles de personajes con emails de ejemplo. Parte C: timeline de eventos nov 2024 – may 2026 con impacto en datos.

- `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\contenido\bienvenida.md` — Primer texto del curso. Email de Valentina Torres al estudiante en su primer día. Presenta la empresa, el equipo y da el primer encargo (explorar los datos).

- `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\contenido\intro-nivel-00.md` — Intro Nivel 0 (150 palabras aprox). Contexto: orientación en la base de datos antes de analizar. Tono: voz narrativa del curso, segunda persona.

- `C:\Users\Juanm\Desktop\Curso SQL\contenido\briefings-nivel-00.md` — 20 briefings para ejercicios de SELECT, WHERE, ORDER BY, LIMIT, aliases y concatenación sobre customers, products y orders. Distribución: Valentina (6 — EJ01, EJ03, EJ09, EJ12, EJ17, EJ20), Sofía (5 — EJ02, EJ05, EJ08, EJ10, EJ19), Diego (3 — EJ06, EJ13, EJ15), Ana (3 — EJ07, EJ11, EJ16), Marco (3 — EJ04, EJ14, EJ18). Urgencia muy baja — primer día del estudiante, tareas de orientación y exploración.

- `C:\Users\Juanm\Desktop\Curso SQL\contenido\proyecto-nivel-00.md` — Mini-proyecto Nivel 0. Voz: Valentina. Contexto: Marco preguntó en standup "¿qué tan bien conocemos nuestra base de datos?" — nadie tiene esa información sistematizada. 4 preguntas: distribución de clientes por país, top 10 productos activos más caros, pedidos pending/shipped ordenados por fecha, clientes sin ciudad por país. Incluye preguntas de reflexión en lenguaje natural. Plazo: viernes antes de las 12. Tono: primer encargo real, sin urgencia de crisis.

- `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\contenido\intro-nivel-01.md` — Intro Nivel 1 (175 palabras aprox). Contexto: SELECT/WHERE/ORDER BY. Poder ganado: responder preguntas de catálogo y cliente en segundos. Personajes mencionados: Diego, Valentina.

- `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\contenido\intro-nivel-02.md` — Intro Nivel 2 (175 palabras aprox). Contexto: GROUP BY y agregaciones. Problema narrativo central: Valentina no puede responder las preguntas de Marco sobre métricas de negocio. Solución: este nivel.

- `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\contenido\briefings-nivel-01.md` — 10 briefings para ejercicios de SELECT/WHERE/ORDER BY sobre customers, categories, products. Distribuidos entre los 5 personajes. Urgencia baja/media — consultas de rutina.

- `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\contenido\briefings-nivel-02.md` — 12 briefings para ejercicios de GROUP BY y agregaciones sobre orders y tablas base. Personajes con más peso: Ana (4 briefings), Sofía (3), Valentina (3), Marco (2), Diego (1). Conectan con timeline canónico.

- `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\contenido\proyecto-nivel-01.md` — Mini-proyecto Nivel 1. Voz: Valentina. 5 preguntas sobre customers/categories/products. Primer encargo formal del estudiante. Formato esperado: tabla por pregunta, notas si hay anomalías. Plazo: viernes sin urgencia de hoy.

- `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\contenido\proyecto-nivel-02.md` — Mini-proyecto Nivel 2. Voz: Valentina (delegando encargo de Marco). Contexto: reunión con fondos inversores el martes. 5 preguntas sobre orders con GROUP BY. Plazo: lunes al mediodía.

- `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\contenido\intro-nivel-03.md` — Intro Nivel 3 (185 palabras aprox). Contexto: JOINs entre order_items, products, categories, orders, customers. Disparador narrativo: Marco pregunta "¿qué productos nos dejan plata?" — pregunta imposible sin cruzar tablas. Personajes mencionados: Marco, Diego, Sofía.

- `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\contenido\briefings-nivel-03.md` — 12 briefings para ejercicios de INNER JOIN, LEFT JOIN y JOINs múltiples. Distribución: Valentina (3), Sofía (3), Diego (3), Ana (2), Marco (1). Conectan con timeline: Black Friday 2025, campaña Día de Madres, hogar premium, reunión con proveedores. Briefings con LEFT JOIN implícito: 3.3 (productos sin ventas), 3.6 (clientes sin compra), 3.9 (categorías sin ventas en abril).

- `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\contenido\proyecto-nivel-03.md` — Mini-proyecto Nivel 3. Voz: Diego Morales. Contexto: reunión con 4 proveedores el jueves. 5 preguntas que cruzan order_items + products + categories + orders. Incluye revenue por categoría, top 15 productos, productos con precio mal configurado, categorías sin movimiento y precio promedio real por ítem. Plazo: miércoles al mediodía.

- `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\contenido\intro-nivel-04.md` — Intro Nivel 4 (~200 palabras). Contexto: subqueries, EXISTS/NOT EXISTS, UNION/INTERSECT, IS NULL, COALESCE, NULLIF. Disparador narrativo: spike de devoluciones julio 2025 — crisis operativa resuelta por Diego, pero el análisis de patrón nunca se hizo. Personajes mencionados: Diego. Tono: urgencia analítica, no de crisis activa.

- `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\contenido\briefings-nivel-04.md` — 12 briefings para ejercicios de subqueries y operaciones de conjuntos. Distribución: Diego (3), Valentina (3), Ana (2), Sofía (2), Marco (2). Tabla nueva: `returns`. Briefings con NOT EXISTS implícito: 4.3 (productos sin devoluciones aprobadas), 4.5 (clientes sin devoluciones), 4.11 y 4.12 (clientes que devolvieron y no/sí volvieron a comprar). Briefings con UNION/EXCEPT: 4.9+4.10 (retención Q3 vs Q4 2025). Briefings con IS NULL/COALESCE: 4.2 (devoluciones sin razón), 4.6 (motivo más frecuente).

- `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\contenido\proyecto-nivel-04.md` — Mini-proyecto Nivel 4. Voz: Valentina. Contexto: análisis formal post-crisis, tres meses después del spike de julio 2025. 6 preguntas: clientes afectados y su valor, completitud de razones (con COALESCE), revenue reembolsado por categoría (con COALESCE para categorías sin reembolsos), clientes que no volvieron tras la devolución (NOT EXISTS), clientes que sí volvieron (EXISTS), patrón de devoluciones en calzado por razón. Tono: investigación sin urgencia. Máx 350 palabras.

- `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\contenido\intro-nivel-05.md` — Intro Nivel 5 (~200 palabras). Contexto: CTEs y Window Functions. Disparador narrativo doble: Marco pide clientes por país (no en general) tras ver el análisis del Nivel 4; Diego necesita productos con stock crítico rankeados por urgencia. Explica ROW_NUMBER/RANK/DENSE_RANK, NTILE y CTEs como forma de estructurar análisis en pasos. Cierre: promesa de análisis que antes requerían múltiples pasos en Excel.

- `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\contenido\briefings-nivel-05.md` — 12 briefings para ejercicios de CTEs y Window Functions. Distribución: Diego (3 — stock crítico, inventario por categoría, cuartiles de inventario), Valentina (3 — ranking productos por categoría, primer pedido de cada cliente, productos sobre el promedio de su categoría), Marco (2 — top 3 por país, concentración de ventas), Ana (2 — concentración del quintil superior, ranking de países por revenue neto), Sofía (2 — ranking de categorías con evolución mensual, clientes nuevos rankeados por gasto primer mes). Tabla nueva: `inventory`.

- `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\contenido\proyecto-nivel-05.md` — Mini-proyecto Nivel 5. Voz: Diego Morales. Contexto: reunión mensual con equipo de compras (primer jueves de junio 2026). 6 preguntas: stock crítico rankeado con desempate por revenue reciente, ranking de performance por categoría (top 5 por categoría), cuartil inferior de ventas con flag si stock > 20 (candidatos a descontinuar), categorías con más productos en stock crítico, días de stock estimados vs. ritmo de ventas reciente, top 3 productos por país. Cierre: Diego invita a incluir hallazgos no pedidos. Tono: operacional y directo.

## Agentes del proyecto

- `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\contenido\intro-nivel-06.md` — Intro Nivel 6 (~200 palabras). Disparador narrativo: discusión Sofía vs Ana sobre Black Friday 2025 — sin métrica acordada para definir si un período fue bueno. LAG y LEAD como herramientas para comparar períodos. Promesa: análisis de cohortes, LTV y ROI de campañas para Valentina e inversores.

- `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\contenido\briefings-nivel-06.md` — 12 briefings para ejercicios de LAG/LEAD, cohortes, LTV y análisis de campañas. Distribución: Sofía (4 — ROI campaña Regreso a Clases, tendencia MoM por canal, ROI general de campañas, cohorte hogar premium), Valentina (3 — tendencia MoM revenue total, cohortes retención mes 2, LTV por país), Ana (2 — revenue neto Q1 2026 vs Q1 2025, evolución pagos fallidos con LAG), Marco (1 — crecimiento YoY por país con mezcla de revenue), Diego (1 — tasa de devoluciones mensual con variación vs mes anterior). Tabla nueva: marketing_campaigns.

- `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\contenido\proyecto-nivel-06.md` — Mini-proyecto Nivel 6. Voz: Valentina (encargo a estudiante, Sofía como destinataria final). Contexto: Sofía necesita sustentar distribución de presupuesto Q2 2026 con datos. 5 preguntas: ROI por campaña, tendencia MoM de revenue por canal (LAG), comparación Q1 2026 vs Q1 2025, retención por canal de adquisición (cohorte), CAC estimado por canal. Cierre: "El objetivo no es el número — es la decisión que toma Sofía con ese número." Plazo: viernes 12 de junio.

- `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\contenido\intro-nivel-07.md` — Intro Nivel 7 (~200 palabras). Disparador narrativo: fondos piden conectar Power BI directamente a los datos — necesitan vistas, no queries sueltas. También introduce el funnel de adquisición como pregunta no respondida. Explica vistas + funnels con SQL. Promesa: infraestructura analítica que otros pueden usar sin pedirte que reescribas la query.

- `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\contenido\briefings-nivel-07.md` — 12 briefings para ejercicios de vistas, funnels y cruces sesiones/pedidos. Distribución: Sofía (4 — tasa de conversión Día de Madres, conversión por canal, funnel completo Q1 2026, conversión por dispositivo), Valentina (3 — vista v_funnel_adquisicion, vista v_clientes_perfil, clasificación sesiones por engagement), Marco (2 — revenue por canal de adquisición, sesiones antes del primer pedido), Ana (2 — funnel financiero Chile mar-abr 2026, segmentación de clientes por revenue), Diego (1 — devoluciones por canal de adquisición). Tabla nueva: website_sessions.

- `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\contenido\proyecto-nivel-07.md` — Mini-proyecto Nivel 7. Voz: Valentina. Contexto: fondos se reúnen con Marco el 18 de junio — quieren dashboard en Power BI con funnel completo. 6 entregables: vista v_funnel_adquisicion, tasa de conversión por campaña, comportamiento por dispositivo con CASE WHEN, revenue atribuido por canal, vista v_clientes_perfil, segmentación de clientes por valor. Nota al cierre sobre anomalía de Chile. Tono: no análisis puntual sino infraestructura.

- `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\contenido\intro-nivel-08.md` — Intro Nivel 8 (~200 palabras). Disparador narrativo doble: Ana espera análisis de pagos fallidos Chile para junta directiva; query de revenue neto tarda 45 segundos; NULLs en paid_at. Introduce tabla payments. Establece el cambio de tono: SQL como responsabilidad profesional, no solo herramienta analítica. Conceptos: índices, EXPLAIN ANALYZE, transacciones, propiedades ACID, INSERT ON CONFLICT.

- `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\contenido\briefings-nivel-08.md` — 10 briefings para ejercicios de payments, índices, EXPLAIN ANALYZE y transacciones. Distribución: Ana (4 — revenue neto Q1 por país, anomalía Chile por método de pago, NULLs en paid_at, métodos de pago por rango de ticket), Valentina (3 — query lenta EXPLAIN ANALYZE, optimización cohortes, índice parcial Chile), Diego (2 — transacción atómica stock + pedido, INSERT ON CONFLICT inventario), Marco (1 — revenue real empresa + nota de Valentina). Tabla nueva: payments.

- `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\contenido\proyecto-nivel-08.md` — Mini-proyecto Nivel 8. Voz: Ana Castillo (formal, estructurado). Contexto: informe financiero Q1 2026 para junta directiva el 18 de junio; audiencia: fondo chileno y fondo mexicano. 6 preguntas: revenue neto por país, anomalía Chile por método + rango, integridad paid_at, evolución mensual revenue neto Q1, concentración por método de pago, transacción de ajuste contable de 3 pagos duplicados. Plazo: miércoles 17 de junio al mediodía.

- `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\contenido\capstone-brief.md` — Brief del Capstone. Voz: Valentina. Contexto: Serie B USD 25M para Brasil y Ecuador — inversores piden auditoría de datos previa. Marco encarga a Valentina, Valentina al estudiante. 8 preguntas que cubren todos los niveles: revenue neto histórico por país/trimestre (Nivel 8), segmentación de clientes (N7), adquisición por canal (N7), funnel completo Q1 por país (N7), cohorte Q3 2025 (N6), top 10 productos por revenue neto (N4+N5), anomalía Chile (N8), integridad de datos (N8). Criterio excelente vs suficiente explicitado. Cierre emocional del arco narrativo del curso.

- `.claude\agents\content-writer.md` — Definición del rol de este agente
- `.claude\agents\sql-teacher.md` — Agente técnico que escribe las lecciones y queries
- `.claude\agents\sql-data-analyst.md` — Agente que verifica coherencia analítica de los escenarios
