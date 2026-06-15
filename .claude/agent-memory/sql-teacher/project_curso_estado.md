---
name: project-curso-estado
description: Estado actual del curso SQL para Analisis de Datos con ShopSphere — archivos creados, nivel actual del estudiante, decisiones de diseno
metadata:
  type: project
---

El curso SQL para Analisis de Datos con ShopSphere fue iniciado el 2026-05-31. El directorio raiz es `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\`.

**Why:** El estudiante encargo el diseno del sistema de evaluacion diagnostica y el contenido de los Niveles 1 y 2 como artefactos del curso. No se ha determinado aun el nivel de entrada del estudiante via el diagnostico.

**How to apply:** Cuando el estudiante regrese, preguntar si ya tiene resultados del diagnostico para calibrar desde que nivel empieza el curso activo. El contenido de Nivel 0, 1 y 2 ya esta completo y disponible.

## Estructura de directorios confirmada

```
C:\Users\Juanm\OneDrive\Desktop\Curso SQL\
  .claude\
    agent-memory\
      sql-teacher\          <- este directorio
  modulos\
    nivel-00-fundamentos\
      leccion-01.md         <- CREADO (concepto relacional, tablas, PK/FK, NULL)
    nivel-01-exploracion\
      leccion-01.md         <- CREADO (SELECT y FROM)
      leccion-02.md         <- CREADO (WHERE: comparadores, logicos, LIKE, IN, BETWEEN, IS NULL)
      leccion-03.md         <- CREADO (ORDER BY, LIMIT, OFFSET)
      leccion-04.md         <- CREADO (Funciones escalares: texto, numero, fecha)
      ejercicios-nivel-01.sql <- CREADO (20 ejercicios)
    nivel-02-metricas\
      leccion-01.md         <- CREADO (COUNT, SUM, AVG, MIN, MAX)
      leccion-02.md         <- CREADO (GROUP BY)
      leccion-03.md         <- CREADO (HAVING)
      leccion-04.md         <- CREADO (Analisis temporal: DATE_TRUNC, EXTRACT, series de tiempo)
      ejercicios-nivel-02.sql <- CREADO (25 ejercicios)
  contenido\
    shopsphere-world.md     <- EXISTS (biblia de personajes y empresa)
  evaluaciones\
    diagnostico.md          <- CREADO v1.0 (2026-05-31)
  dataset\
    shopsphere-seed.sql     <- EXISTS (500 customers, 80 products, 2000 orders, etc.)
```

## Archivos creados en sesion 2026-05-31

| Archivo | Descripcion |
|---------|-------------|
| `evaluaciones/diagnostico.md` | Evaluacion diagnostica — 24 preguntas, algoritmo de recomendacion |
| `modulos/nivel-00-fundamentos/leccion-01.md` | Concepto relacional, tablas, PK/FK, NULL, ShopSphere context |
| `modulos/nivel-01-exploracion/leccion-01.md` | SELECT, FROM, DISTINCT, alias |
| `modulos/nivel-01-exploracion/leccion-02.md` | WHERE (comparadores, AND/OR/NOT, BETWEEN, IN, LIKE, IS NULL) |
| `modulos/nivel-01-exploracion/leccion-03.md` | ORDER BY, LIMIT, OFFSET, paginacion |
| `modulos/nivel-01-exploracion/leccion-04.md` | Funciones escalares (texto, numero, fecha) |
| `modulos/nivel-01-exploracion/ejercicios-nivel-01.sql` | 20 ejercicios con soluciones |
| `modulos/nivel-02-metricas/leccion-01.md` | COUNT, SUM, AVG, MIN, MAX — funciones de agregacion |
| `modulos/nivel-02-metricas/leccion-02.md` | GROUP BY — metricas por segmento |
| `modulos/nivel-02-metricas/leccion-03.md` | HAVING — filtrar sobre grupos |
| `modulos/nivel-02-metricas/leccion-04.md` | Analisis temporal: DATE_TRUNC, EXTRACT, series de tiempo |
| `modulos/nivel-02-metricas/ejercicios-nivel-02.sql` | 25 ejercicios con soluciones |

## Estado del dataset ShopSphere

Nombres reales de columnas en el seed (difieren ligeramente del schema canonico del curso):
- `customers`: usa `signup_date` y `segment` (el schema del curso usa `registered_at`)
- `orders`: usa `order_date`, `channel`, `campaign_id` (el schema del curso usa `ordered_at`)
- `products`: tiene columnas extra `cost` y `sku`

Las lecciones usan el schema canonico definido en el prompt (registered_at, ordered_at). Si el estudiante ejecuta contra el seed real, algunos ejemplos pueden requerir ajuste de nombre de columna.

## Tablas desbloqueadas por nivel (segun el curriculum)

- Nivel 0: ninguna (conceptual)
- Nivel 1 COMPLETO: customers, categories, products
- Nivel 2 COMPLETO: + orders
- Nivel 3 COMPLETO: + order_items
- Nivel 4 COMPLETO: + returns
- Nivel 5 (pendiente): + inventory
- Nivel 6 (pendiente): + marketing_campaigns
- Nivel 7 (pendiente): + website_sessions
- Nivel 8 (pendiente): + payments

## Outliers narrativos del dataset (relevantes para ejercicios futuros)

- Black Friday 2024-11-29: volumen 9x dia normal (pico visible en series de tiempo)
- customer_id=7: whale con 25 ordenes (vs promedio ~4)
- product_id=10 (Hub USB-C): stock=0 pero con ordenes en noviembre 2024
- product_id=24 (Smartwatch ProX): tasa devolucion ~20% (bateria)
- product_id=39 (Campera Invierno): tasa devolucion ~20% (talla)
- product_id=40 (Vestido Fiesta): tasa devolucion ~20% (descripcion)

## Archivos creados en sesion 2026-06-01 (segunda sesion)

| Archivo | Descripcion |
|---------|-------------|
| `modulos/nivel-03-joins/leccion-03.md` | JOINs multiples, FULL OUTER JOIN, self-join, riesgo de duplicados |
| `modulos/nivel-03-joins/leccion-04.md` | Subqueries: escalar en SELECT, IN/NOT IN, FROM derivada, EXISTS/NOT EXISTS, trampa de NOT IN con NULLs |
| `modulos/nivel-03-joins/ejercicios-nivel-03.sql` | 25 ejercicios: Bloque A (1-6 INNER JOIN 2 tablas), B (7-12 LEFT JOIN), C (13-19 JOIN 3+ tablas y FULL OUTER), D (20-25 subqueries) |

## Correcciones QA aplicadas en sesion 2026-06-01

| ID | Archivo corregido | Descripcion |
|----|-------------------|-------------|
| CRIT-03 | `modulos/nivel-02-metricas/leccion-01.md` | Error 3 de Errores Comunes: reemplazado AVG(quantity) FROM order_items (Nivel 3) por AVG(price) FROM products (Nivel 2) |
| CRIT-04 | `modulos/nivel-02-metricas/leccion-03.md` | Error 2 de Errores Comunes: corregida afirmacion falsa sobre alias en HAVING. Ahora dice explicitamente que PostgreSQL NO permite aliases en HAVING (solo en ORDER BY como extension) |
| IMP-07 | `modulos/nivel-02-metricas/ejercicios-nivel-02.sql` | EJ01: criterio actualizado de "Debe ser 2000" a "debe coincidir con SELECT COUNT(*) FROM orders" |
| IMP-08 | `modulos/nivel-02-metricas/ejercicios-nivel-02.sql` | EJ09: enunciado actualizado para mencionar 2023, 2024 y 2025 (3 filas). EJ16: enunciado actualizado para julio-noviembre 2024 (5 filas, no 6, porque diciembre 2024 no tiene registros) |

## Correcciones QA aplicadas en sesion 2026-06-01 (Nivel 4 — tercera tanda)

| ID | Archivo corregido | Descripcion |
|----|-------------------|-------------|
| CRIT-07 | `modulos/nivel-04-clientes/leccion-02.md` | Error 1 de Errores Comunes: reemplazada query que usaba `orders.country` (columna inexistente) por segmentacion temporal con `ordered_at` por trimestre. El comentario ahora explica por que UNION ALL es preferible cuando los conjuntos son disjuntos. |
| CRIT-08 | `modulos/nivel-04-clientes/leccion-03.md` | Solucion Ejercicio Intermedio: reemplazada `SUM(oi.quantity * oi.unit_price)` sin condicion por `SUM(CASE WHEN r.return_id IS NOT NULL THEN oi.quantity * oi.unit_price ELSE 0 END)`. Se agrego explicacion del bug silencioso del LEFT JOIN. |
| CRIT-09 | `modulos/nivel-04-clientes/ejercicios-nivel-04.sql` | Solucion Ejercicio 22: misma correccion que CRIT-08, con comentario explicativo del bug. |
| IMP-12 | `modulos/nivel-04-clientes/leccion-03.md` | Seccion de Sintaxis, NULL en JOIN: se agrego nota explicando que `ON r.order_id IN (subquery)` es un patron no canonico y se presento el patron correcto con doble LEFT JOIN. |
| IMP-13 | `modulos/nivel-04-clientes/ejercicios-nivel-04.sql` | Solucion Ejercicio 10: se agrego comentario documentando la fragilidad de MAX(motivo) por orden lexicografico, con alternativas BOOL_OR y COUNT FILTER. |

## Correcciones QA pendientes (no aplicadas aun)

- CRIT-01: diagnostico.md — Pregunta 15: promover respuesta alternativa como principal
- CRIT-02: diagnostico.md — Discrepancias de schema en mini-editor (pendiente de verificar entorno)
- CRIT-05: shopsphere-seed-base.sql — Agregar productos inactivos (product_id 37, 47, 51, 75)
- IMP-01 a IMP-06: varias mejoras en diagnostico.md y leccion-02.md de Nivel 2

## Estado del Nivel 3 — COMPLETO

- leccion-01.md: INNER JOIN — COMPLETA
- leccion-02.md: LEFT/RIGHT JOIN — COMPLETA
- leccion-03.md: JOINs multiples, FULL OUTER, self-join — COMPLETA (creada 2026-06-01)
- leccion-04.md: Subqueries — COMPLETA (creada 2026-06-01)
- ejercicios-nivel-03.sql: 25 ejercicios — COMPLETO (creado 2026-06-01)

## Estado del Nivel 4 — COMPLETO (creado 2026-06-01)

- leccion-01.md: Subqueries avanzadas — correlacionadas, EXISTS/NOT EXISTS, subquery en SELECT — COMPLETA
- leccion-02.md: UNION / INTERSECT / EXCEPT — operadores de conjuntos — COMPLETA
- leccion-03.md: Manejo de NULLs — IS NULL, COALESCE, NULLIF, NULLs en agregaciones y JOINs — COMPLETA
- leccion-04.md: La tabla returns — analisis completo de devoluciones, spike julio 2025 — COMPLETA
- ejercicios-nivel-04.sql: 25 ejercicios — COMPLETO
  - Bloque A (1-6): EXISTS / NOT EXISTS
  - Bloque B (7-12): UNION / INTERSECT / EXCEPT
  - Bloque C (13-19): COALESCE, NULLIF, IS NULL, NULLs en agregaciones
  - Bloque D (20-25): analisis de returns — spike julio 2025, tasa por categoria, clientes afectados

## Decisiones narrativas del Nivel 4

- El spike de julio 2025 (tasa de devolucion 8.3%) es el eje narrativo del nivel
- La causa narrativa: proveedor de calzado en Colombia (Diego lo resolvio operativamente)
- El nivel hace el analisis analitico que nadie hizo en julio
- Leccion-04 introduce CTEs brevemente como anticipo del Nivel 5 (solo en el Ejercicio Integrador del ejemplo, no en los ejercicios propuestos)
- Patron correcto para tasa de devolucion: COUNT(DISTINCT r.return_id) / NULLIF(COUNT(DISTINCT oi.item_id), 0)
- Patron JOIN correcto returns <-> customers: pasa por orders (returns no tiene customer_id)

## Correcciones QA del Nivel 3 aplicadas en sesion 2026-06-01 (segunda tanda)

| ID | Archivo corregido | Descripcion |
|----|-------------------|-------------|
| IMP-09 | `modulos/nivel-03-joins/leccion-01.md` | Variante 2 del JOIN con multiples condiciones: reemplazada tabla `returns` (Nivel 4) por un JOIN de order_items + products con condicion de descuento (unit_price < p.price). Se agrego nota sobre cuando aparece el patron con returns en Nivel 4. |
| IMP-10 | `modulos/nivel-03-joins/ejercicios-nivel-03.sql` | Ejercicio 12: corregida descripcion del LEFT JOIN. Ahora dice explicitamente "Usa order_items como tabla principal (izquierda) y orders en el JOIN (derecha)". |
| IMP-11 | `modulos/nivel-03-joins/ejercicios-nivel-03.sql` | Ejercicio 10: enunciado actualizado para especificar "ambos dias inclusive (desde 00:00:00 del 5 hasta 23:59:59 del 10)". Criterio actualizado con el filtro esperado >= '2026-05-05' AND < '2026-05-11'. |

## Estado del Nivel 5 — COMPLETO (creado 2026-06-01)

Tabla nueva desbloqueada: `inventory` (inventory_id, product_id, stock, updated_at)

- leccion-01.md: CTEs simples y multiples encadenadas — WITH, CTEs multiples, CTE vs subquery, patron "calcular una vez usar N veces", ejemplo de stock critico con 2 CTEs encadenadas — COMPLETA
- leccion-02.md: CTEs recursivas — estructura obligatoria (base case + UNION ALL + recursive case), extension temporal del schema de categories con parent_id, construccion de arbol con ruta, descendientes desde nodo especifico, generacion de secuencias de fechas — COMPLETA
- leccion-03.md: Window Functions fundamentos — ROW_NUMBER, RANK vs DENSE_RANK (tabla comparativa), NTILE(n), primer pedido por cliente con ROW_NUMBER()=1, top 3 por pais — COMPLETA
- leccion-04.md: Window Functions temporales e inventory — LAG, LEAD, FIRST_VALUE, LAST_VALUE (trampa del marco por defecto), SUM OVER running total, analisis MoM, urgencia de reposicion con RANK — COMPLETA
- ejercicios-nivel-05.sql: 25 ejercicios — COMPLETO
  - Bloque A (1-6): CTEs simples y multiples — stock critico, revenue por cliente, ratio devoluciones, top productos, cobertura stock, whales con CTEs
  - Bloque B (7-10): CTEs recursivas sobre categories_jerarquia (tabla auxiliar temporal) — arbol completo, nodos hoja, descendientes de Tecnologia, conteo por nivel
  - Bloque C (11-18): ROW_NUMBER, RANK, DENSE_RANK, NTILE — primer pedido, top 3 por categoria, minimo stock por categoria, ranking global, top 3 por pais, cuartil inferior stock, concentracion revenue (cuartiles y quintiles)
  - Bloque D (19-25): LAG/LEAD, inventory, analisis temporal — MoM H1 2026, ranking urgencia reposicion, clientes nuevos primer mes, revenue neto paises, running total YTD, productos sobre promedio categoria (AVG OVER), integrador H1 2026 (Parte A/B/C)

## Estado del Nivel 6 — COMPLETO (creado 2026-06-01)

Tabla nueva desbloqueada: `marketing_campaigns` (campaign_id, name, channel, started_at, ended_at, budget, spent)
Canales validos: 'email', 'social', 'paid_search', 'display', 'affiliate'

- leccion-01.md: LAG y LEAD — patron MoM completo, variacion porcentual con NULLIF, PARTITION BY con LAG para multiples series, analisis MoM de revenue 2025, tasa de devolucion con LEAD para ver contexto del spike de julio — COMPLETA
- leccion-02.md: FIRST_VALUE, LAST_VALUE y analisis de cohortes — trampa del marco por defecto en LAST_VALUE, patron de cohortes con MIN(ordered_at) + LEFT JOIN, tasa de retencion mes 2, LTV acumulado con SUM OVER running total, LTV promedio y mediana por pais con PERCENTILE_CONT — COMPLETA
- leccion-03.md: Analisis de campanas de marketing — introduccion a marketing_campaigns, modelo de atribucion directa por periodo, ROI = (revenue - spent) / spent, CAC = spent / clientes, JOIN con BETWEEN y COALESCE para ended_at NULL, ROI por campana con alerta, eficiencia por canal, analisis Regreso a Clases — COMPLETA
  - CRIT-06 APLICADO: el Briefing 6.9 fue adaptado usando Opcion A — pedidos cancelados como proxy de pagos fallidos. El ejercicio incluye nota explicando que el analisis real de pagos se realizara en el Nivel 8 con la tabla payments.
- leccion-04.md: Analisis temporal avanzado — estacionalidad con EXTRACT(MONTH) y AVG historico, YoY con LAG(12) en serie mensual, YoY por pais con pivoteo MAX(CASE WHEN), rolling average con ROWS BETWEEN 2 PRECEDING AND CURRENT ROW, deteccion de anomalias via desviacion vs tendencia — COMPLETA
- ejercicios-nivel-06.sql: 25 ejercicios — COMPLETO
  - Bloque A (1-6): LAG/LEAD — MoM revenue 2025, tasa devolucion con tendencia, MoM por canal, revenue neto Q1 YoY, primer y ultimo pedido por cliente, LAG + LEAD simultaneos para contexto de spike
  - Bloque B (7-12): Cohortes y LTV — cohortes 2025 retenciones, seguimiento cohorte septiembre, LTV promedio y mediana por pais, segmentacion por cuartil de LTV con NTILE, running total con % del total anual, LTV acumulado a 1/3/6 meses para cohortes Q1 2025
  - Bloque C (13-19): marketing_campaigns — ROI por campana, analisis Regreso a Clases, eficiencia por canal, meses con/sin paid_search, correlacion campanas vs tasa devolucion, CAC vs LTV por pais, integrador ROI + retencion por canal
  - Bloque D (20-25): Analisis temporal — estacionalidad historica, YoY por pais, rolling average 3m, YoY mensual con LAG(12), anomalia Chile con proxy de cancelaciones, integrador ejecutivo MoM + YoY + rolling avg + ranking

## Decisiones narrativas del Nivel 6

- La narrativa central: la Campana de Regreso a Clases de marzo 2025 explica la caida del 15% de ese mes y la peor tasa de retencion del ano
- Campana Hogar Premium (septiembre 2025): la mejor cohorte del ano con 35.8% de retencion
- Chile: anomalia de pedidos cancelados en marzo-abril 2026 (proxy de pagos fallidos — los datos reales estan en payments, Nivel 8)
- Estacionalidad: noviembre es el mes pico, marzo el mas debil

## Estado del Nivel 7 — COMPLETO (creado 2026-06-02)

Tabla nueva desbloqueada: `website_sessions` (session_id, customer_id, campaign_id, started_at, pages_viewed, converted, device_type)
~8.000 sesiones en el seed. campaign_id puede ser NULL (sesiones organicas).

- leccion-01.md: website_sessions + COUNT condicional — schema de la tabla nueva, COUNT(CASE WHEN converted=TRUE THEN 1 END), las dos formas equivalentes (COUNT vs SUM), formula de tasa de conversion con 100.0 y NULLIF, LEFT JOIN con marketing_campaigns + COALESCE para organicas, analisis por device_type con AVG(pages_viewed) — COMPLETA
- leccion-02.md: Funnel de adquisicion con LEFT JOIN encadenado — concepto de funnel multi-etapa, advertencia del producto cartesiano por customer_id, COUNT DISTINCT obligatorio, CTEs por periodo para sesiones y pedidos, funnel por pais con GROUP BY, sesiones previas al primer pedido con MIN y filtro de fecha — COMPLETA
- leccion-03.md: CREATE VIEW — sintaxis CREATE/DROP VIEW IF EXISTS (SQLite), diferencia entre vista y CTE, v_funnel_adquisicion (LEFT JOIN website_sessions+orders por customer_id, subquery escalar para order_total), v_clientes_perfil (triple LEFT JOIN, COUNT DISTINCT en todo, COALESCE para revenue_total), advertencia sobre multiplicacion de filas en vistas con N:N — COMPLETA
- leccion-04.md: Atribucion y segmentacion — first-touch attribution con ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY started_at ASC), COALESCE para organicos (channel NULL), segmentacion por revenue con CASE WHEN (sin compras/ocasional/recurrente/alto valor), SUM(SUM()) OVER() para porcentaje del total, ORDER BY con segundo CASE WHEN para orden semantico correcto — COMPLETA
- ejercicios-nivel-07.sql: 25 ejercicios — COMPLETO
  - Bloque A (1-6): COUNT condicional y tasas de conversion — campana Dia de Madres, ranking historico de canales, hipotesis mobile, evolucion mensual 2025, segmentacion por engagement, top 5 campanas por sesiones
  - Bloque B (7-12): Funnel con LEFT JOIN — funnel Q1 2026, funnel por pais, funnel Chile mar-abr 2026, sesiones previas al primer pedido, clientes con sesiones sin pedido, revenue por cantidad de touchpoints
  - Bloque C (13-19): Vistas — CREATE v_funnel_adquisicion, consulta sobre vista (tasas por campana), consulta (device_type con pages_viewed), CREATE v_clientes_perfil, top 10 por revenue, alto engagement sin compra, paises por promedio de sesiones
  - Bloque D (20-25): Atribucion y segmentacion — revenue atribuido por campana (first-touch), segmentacion CASE WHEN desde tablas base, segmentacion desde v_clientes_perfil con revenue_promedio, devoluciones por canal de adquisicion, velocidad de conversion (< 7 dias), integrador dashboard ejecutivo

## Decisiones tecnicas del Nivel 7

- website_sessions NO tiene order_id: el bridge a orders siempre va por customer_id
- JOIN website_sessions <-> orders genera producto cartesiano N:M — COUNT DISTINCT es obligatorio en el funnel
- La vista v_funnel_adquisicion preserva la multiplicacion N:M (una fila por combinacion sesion-pedido). Las queries encima de la vista deben usar COUNT DISTINCT.
- SQLite en el Playground: usar DROP VIEW IF EXISTS (no CREATE OR REPLACE VIEW), STRFTIME (no DATE_TRUNC), JULIANDAY para diferencia de dias
- Sesiones organicas: INNER JOIN excluye campaign_id NULL, LEFT JOIN + COALESCE('organic') las incluye. Cada ejercicio documenta cual decision tomo y por que.
- El EJ09 (Chile marzo-abril) usa orders.status como proxy de pagos: cancelled = proxy de pago fallido, delivered = proxy de pago exitoso. Se indica que el analisis real con payments.status es Nivel 8.
- SUM(SUM(...)) OVER () funciona en SQLite (confirmado por el template del expected-results).

## Estado del Nivel 8 — COMPLETO (creado 2026-06-02)

Tabla nueva desbloqueada: `payments` (payment_id, order_id, method, status, amount, paid_at, country)
~31.000 registros, cubre jun 2023 – may 2026.
Anomalia plantada: Chile, marzo-abril 2026, tasa de fallos alta en credit_card.
Regla de negocio clave: paid_at es NULL cuando status != 'completed'. Un pedido puede tener N intentos de pago.

- leccion-01.md: La tabla payments y el revenue neto real — diferencia orders.status vs payments.status, un pedido = N intentos, SUM condicional por status (completed / refunded / failed), revenue neto = completed - refunded, JOIN payments → orders → customers, analisis de anomalia Chile con CASE WHEN para grupo_pais, exploration inicial con distribucion de status — COMPLETA
- leccion-02.md: EXPLAIN QUERY PLAN e indices — diagnostico de queries lentas, SCAN vs SEARCH USING INDEX, CREATE INDEX (simple, compuesto, parcial con WHERE), anti-patrones (funcion en WHERE, subquery correlacionada en SELECT, NOT IN con NULLs, SELECT *), indice parcial para pagos fallidos de Chile — COMPLETA
- leccion-03.md: Transacciones y consistencia de datos — propiedades ACID para analistas, BEGIN/COMMIT/ROLLBACK, SAVEPOINT con rollback parcial, INSERT ... ON CONFLICT DO UPDATE (upsert idempotente), queries de auditoria con LEFT JOIN + IS NULL, tres tipos de inconsistencia detectables — COMPLETA
- leccion-04.md: SQL de produccion — vistas documentadas, comentarios como documentacion (encabezado + decisions no obvias), formatear outputs para no-tecnicos (ROUND, CAST, alias en espanol), CREATE VIEW en SQLite (DROP VIEW IF EXISTS), checklist de calidad de 10 puntos, v_resumen_mensual_ejecutivo multi-CTE, cierre del curso con roadmap de continuacion — COMPLETA
- ejercicios-nivel-08.sql: 25 ejercicios — COMPLETO
  - Bloque A (1-6): Analisis de pagos — revenue neto Q1 2026 por pais (EJ01), anomalia Chile por metodo (EJ02), auditoria completed + paid_at NULL (EJ03), distribucion por rango de monto (EJ04), evolucion MoM Q1 2026 con LAG (EJ05), revenue neto historico por pais y trimestre (EJ06)
  - Bloque B (7-12): Optimizacion y anti-patrones — EXPLAIN + CREATE INDEX + EXPLAIN (EJ07), NOT IN vs NOT EXISTS con NULLs (EJ08), funcion en WHERE → rango de fechas (EJ09), SELECT * → columnas especificas (EJ10), EXPLAIN sobre query de cohortes + indice propuesto con justificacion (EJ11), subquery correlacionada → LEFT JOIN (EJ12)
  - Bloque C (13-19): Transacciones y consistencia — transaccion con SAVEPOINT (EJ13), auditoria delivered sin pago completed (EJ14), auditoria returns huerfanos (EJ15), auditoria items con product_id inexistente (EJ16), revenue en riesgo con dos componentes (EJ17), deteccion de posible fraude (EJ18), vista v_inconsistencias_datos con UNION ALL (EJ19)
  - Bloque D (20-25): Dashboard ejecutivo — vista v_resumen_mensual_ejecutivo (EJ20), segmentacion completa canal + segmento + LTV (EJ21), rentabilidad por categoria descontando devoluciones y fallos (EJ22), forecast con rolling avg 3m + UNION ALL (EJ23), 5 insights ejecutivos con UNION ALL de CTEs (EJ24), integrador v_dashboard_inversores multi-CTE con indicador de riesgo Chile (EJ25)

## Decisiones tecnicas del Nivel 8

- payments usa `method` con valores canonicos: 'credit_card', 'bank_transfer', 'paypal', 'crypto' (corregido en sesion 2026-06-03; las lecciones y ejercicios ya usan estos valores)
- paid_at IS NOT NULL esta implicito cuando se filtra por rango de fechas en paid_at
- Para trimestres en SQLite: CASE WHEN STRFTIME('%m', ...) BETWEEN '01' AND '03' THEN 1 ... (no EXTRACT QUARTER)
- EXPLAIN QUERY PLAN (SQLite) vs EXPLAIN ANALYZE (PostgreSQL): cada ejercicio menciona la diferencia
- ON CONFLICT (product_id) requiere UNIQUE constraint en product_id de inventory — el schema canonico tiene inventory_id como PK pero no declara UNIQUE en product_id explicitamente
- La narrativa de Chile (anomalia en credit_card, marzo-abril 2026) es el eje narrativo central que conecta con los briefings de Ana y Valentina
- Formato de la vista v_dashboard_inversores: tiene columna indicador_riesgo_chile como CASE WHEN sobre country + tasa_fallo_pago_pct > 20%

## Estado del Capstone — COMPLETO (2026-06-02)

Directorio: `modulos/capstone/`

| Archivo | Parte | Ejercicios | Tema |
|---------|-------|-----------|------|
| README.md | — | — | Descripcion general, criterios, personajes |
| parte-01-exploracion.sql | 01 | EJ01–EJ06 | Exploracion y diagnostico H1 2026 |
| parte-02-clientes.sql | 02 | EJ07–EJ12 | Clientes y retención (RFM, cohortes, LTV, churn) |
| parte-03-marketing.sql | 03 | EJ13–EJ17 | Marketing y atribución (ROI, funnel, Chile) |
| parte-04-operaciones.sql | 04 | EJ18–EJ21 | Operaciones y calidad de datos |
| parte-05-dashboard-ejecutivo.sql | 05 | EJ22–EJ25 | Dashboard ejecutivo + vistas + insights |

Narrativa: auditoría de datos para Serie B de USD 25M. Valentina asigna el encargo.
Tablas: todas (customers, orders, order_items, products, categories, inventory, returns, marketing_campaigns, website_sessions, payments)
Schema canónico usado: payments SIN payments.country (el país se obtiene vía JOIN a orders→customers)
Dataset temporal: junio 2023 – mayo 2026. Fecha de cierre: '2026-05-31'.

### Decisiones técnicas del Capstone

- Dialecto: SQLite exclusivamente (STRFTIME, JULIANDAY, DROP VIEW IF EXISTS, no DATE_TRUNC)
- Patrón de fechas: >= 'YYYY-MM-DD' AND < 'YYYY-MM-DD' (nunca BETWEEN en fechas)
- NULLIF en todos los denominadores sin excepción
- País siempre via JOIN payments → orders → customers (nunca payments.country ni orders.country)
- Atribución first-touch: ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY started_at ASC) = 1
- Segmentación RFM usa JULIANDAY('2026-05-31') - JULIANDAY(MAX(ordered_at))
- LTV: calculado como revenue acumulado por mes de vida (CAST((JULIANDAY(a)-JULIANDAY(b))/30.44 AS INT))
- EJ25 es ejercicio abierto — 3 soluciones de referencia incluidas (Pareto, canal eficiente, zombies)

### Alineación con el README del Capstone

El README describe las 5 partes con nombres y numeración diferente al prompt de esta sesión.
El contenido creado sigue fielmente el prompt de creación (que tiene precedencia como spec más detallada):
  - README Parte 02 = "Clientes y retención" → parte-02-clientes.sql ✓
  - README Parte 03 = "Marketing y atribución" → parte-03-marketing.sql ✓
  - README Parte 04 = "Operaciones y calidad de datos" → parte-04-operaciones.sql ✓
  - README Parte 05 = "Dashboard ejecutivo" → parte-05-dashboard-ejecutivo.sql ✓

## Correcciones QA aplicadas en sesion 2026-06-02

| ID | Archivo | Descripcion |
|----|---------|-------------|
| CRIT-01 | evaluaciones/diagnostico.md | YA ESTABA APLICADA — P15 query correcta |
| CRIT-05 | dataset/shopsphere-seed-base.sql | YA ESTABA APLICADA — UPDATE products SET is_active=FALSE |
| IMP-14 | nivel-05/ejercicios-nivel-05.sql | COUNT → SUM en CTE unidades_devueltas de EJ03 |
| IMP-15 | nivel-05/ejercicios-nivel-05.sql | Comentario pedagogico en filtro de fecha EJ21 |
| CRIT-N7-01 | nivel-07/leccion-03.md + ejercicios | v_clientes_perfil: triple JOIN plano → CTEs pre-agregadas para evitar N×M |
| IMP-N7-01 | nivel-07/leccion-03.md | Seccion CREATE VIEW: SQLite primero, PostgreSQL despues |
| IMP-N7-02 | nivel-07/ejercicios-nivel-07.sql | EJ20: comentario first-touch vs first-paid-touch |

## Correcciones QA aplicadas en sesion 2026-06-02 (segunda tanda — Niveles 4-5 y dataset)

| ID | Archivo | Resultado |
|----|---------|-----------|
| CRIT-05 | dataset/shopsphere-seed-base.sql | YA ESTABA APLICADA — UPDATE products SET is_active=FALSE WHERE product_id IN (37,47,51,75) en linea 710 |
| CRIT-05 / EJ06 | dataset/expected-results-nivel-01.json | APLICADA — expected_row_count_approx actualizado de 0 a 4; nota actualizada para describir los 4 productos inactivos |
| CRIT-07 | modulos/nivel-04-clientes/leccion-02.md | APLICADA — Seccion 6 Error 1: eliminado comentario confuso "Incorrecto ademas porque orders no tiene columna 'country'" que coexistia con la query correcta. La query del Error 1 ya no tiene referencias a columnas inexistentes. Tambien corregido Error 4 que usaba `orders.country` en dos ejemplos — reemplazado por filtros con `ordered_at`. |
| CRIT-08 | modulos/nivel-04-clientes/leccion-03.md | YA ESTABA APLICADA — SUM(CASE WHEN r.return_id IS NOT NULL THEN ... ELSE 0 END) en solucion EJ intermedio |
| CRIT-09 | modulos/nivel-04-clientes/ejercicios-nivel-04.sql | YA ESTABA APLICADA — Solucion EJ22 usa CASE WHEN correcto con comentario explicativo |
| IMP-06 | dataset/shopsphere-seed-operacional.sql | SIN DISCREPANCIA — El header dice "Contiene: inventory" y el archivo solo contiene la tabla inventory. No habia listings erroneos de marketing_campaigns. |
| IMP-12 | modulos/nivel-04-clientes/leccion-03.md | YA ESTABA APLICADA — Seccion 2, NULL en JOIN: el patron ON r.order_id IN (subquery) esta marcado con nota explicita como no canonico; el patron con doble LEFT JOIN esta presentado como el patron preferido |
| IMP-13 | modulos/nivel-04-clientes/ejercicios-nivel-04.sql | YA ESTABA APLICADA — Solucion EJ10 tiene comentario completo sobre fragilidad de MAX(motivo) con alternativas BOOL_OR y COUNT FILTER |
| IMP-14 | modulos/nivel-05-avanzado/ejercicios-nivel-05.sql | YA ESTABA APLICADA — CTE unidades_devueltas usa SUM(oi.quantity) con comentario sobre unidades fisicas |
| IMP-15 | modulos/nivel-05-avanzado/ejercicios-nivel-05.sql | YA ESTABA APLICADA — Solucion EJ21 tiene comentario en la linea `registered_at < '2026-06-01'` explicando el patron de filtro exclusivo |

## Correcciones QA aplicadas en sesion 2026-06-02 (tercera tanda — Niveles 1-3 y diagnostico)

| ID | Archivo | Resultado |
|----|---------|-----------|
| CRIT-01 | evaluaciones/diagnostico.md | YA ESTABA APLICADA — P15 ya tenia respuesta correcta con JOIN entre returns y orders |
| IMP-03 | evaluaciones/diagnostico.md | YA ESTABA APLICADA — nota de P15 ya tenia la ruta returns→orders→customer_id |
| IMP-04 | evaluaciones/diagnostico.md | YA ESTABA APLICADA — header Bloque E ya decia "Todas las tablas de Niveles 0-5 disponibles. Preguntas se enfocan en orders." |
| IMP-05 | evaluaciones/diagnostico.md | APLICADA — P20 Respuesta modelo: invertido orden. Ahora el modelo principal es la version con doble CTE (recomendada). La version con una sola CTE queda como "Version alternativa (tambien correcta, recibe puntaje completo)". |
| CRIT-03 | modulos/nivel-02-metricas/leccion-01.md | YA ESTABA APLICADA — Error 3 ya usaba AVG(price) FROM products, no order_items |
| CRIT-04 | modulos/nivel-02-metricas/leccion-03.md | YA ESTABA APLICADA — Error 2 ya tenia el texto correcto: "INCORRECTO en todos los motores SQL estandar, incluyendo PostgreSQL" con nota sobre ORDER BY vs HAVING |
| IMP-01 | modulos/nivel-01-exploracion/leccion-03.md | APLICADA — Error 4: reestructurada la logica. Ahora "INCORRECTO" etiqueta claramente a `OFFSET 2` (muestra registros 3-12), y "CORRECTO" etiqueta a `OFFSET 10` (muestra registros 11-20). Aclaracion del error conceptual separada del codigo correcto. |
| IMP-02 | modulos/nivel-02-metricas/leccion-02.md | APLICADA — Seccion 3 Query 1: invertido el orden. Ahora la version principal (codigo primario) es la version sin window function. La window function queda como comentario "Adelanto (Nivel 5 - Window Functions)" fuera del bloque SQL. |
| IMP-07 | modulos/nivel-02-metricas/ejercicios-nivel-02.sql | APLICADA — EJ01 criterio actualizado: "El numero exacto es 31.345 con el seed actual (puedes verificarlo con SELECT COUNT(*) FROM orders)." |
| IMP-08 (EJ09) | modulos/nivel-02-metricas/ejercicios-nivel-02.sql | YA ESTABA APLICADA — EJ09 ya menciona "2023, 2024 y 2025" y "3 filas" |
| IMP-08 (EJ16) | modulos/nivel-02-metricas/ejercicios-nivel-02.sql | YA ESTABA APLICADA — EJ16 ya dice "julio a noviembre 2024" y "5 filas, no 6, porque diciembre 2024 no tiene registros". No menciona "6 meses". |
| IMP-09 | modulos/nivel-03-joins/leccion-01.md | APLICADA — Variante 2, Seccion 2: reemplazada referencia a `returns` (Nivel 4) por ejemplo de verificacion de integridad usando order_items + orders + customers (tablas de Nivel 3). La mencion a `returns` en Nivel 4 queda como nota en italica al final. |
| IMP-10 | modulos/nivel-03-joins/ejercicios-nivel-03.sql | APLICADA — EJ12: criterio reescrito para decir explicitamente "LEFT JOIN (order_items a la izquierda, orders a la derecha). La tabla izquierda es la que queremos auditar, y el NULL en la tabla derecha indica que no existe pedido valido." |
| IMP-11 | modulos/nivel-03-joins/ejercicios-nivel-03.sql | APLICADA — EJ10: enunciado actualizado para decir "desde el 5 de mayo de 2026 a las 00:00:00 hasta el 10 de mayo de 2026 inclusive (el dia completo). Usa el patron: ordered_at >= '2026-05-05' AND ordered_at < '2026-05-11'". |
| SUG-01 | modulos/nivel-01-exploracion/leccion-01.md | APLICADA — Seccion 5 Ejercicio Basico: agregada nota italic "Para ordenar, usa ORDER BY columna ASC — lo estudiaremos en detalle en la Leccion 3." |

## Correcciones QA aplicadas en sesion 2026-06-02 (cuarta tanda — Nivel 6 ejercicios)

| ID | Archivo | Descripcion |
|----|---------|-------------|
| CRIT-N6-01 | modulos/nivel-06-analitica/ejercicios-nivel-06.sql | Solucion 19: eliminada CTE huerfana clientes_cohorte_por_canal; eliminada CTE retencion_canal con SUM(MAX(...)) anidado invalido. Reemplazado por dos CTEs limpias: retencion_por_cliente (MAX por canal+customer_id) y retencion_canal (SUM sobre esos valores). SELECT final usa LEFT JOIN retencion_canal. |
| CRIT-N6-02 | modulos/nivel-06-analitica/ejercicios-nivel-06.sql | Solucion 25: refactorizada en tres CTEs. revenue_serie_completa (2024+2025 para LAG), metricas_con_lag (LAG(1), LAG(12), rolling avg sobre serie completa), solo_2025 (filtro a 2025 ANTES del RANK). RANK() en SELECT final opera sobre solo_2025 — 12 meses de 2025 unicamente. Eliminado comentario erroneo. |
| CRIT-N6-03 | modulos/nivel-06-analitica/ejercicios-nivel-06.sql | Solucion 12: mes_vida reemplazado por calculo de diferencia de meses calendario. SQLite: (CAST(strftime('%Y',...) AS INT) - CAST(strftime('%Y',cohorte) AS INT)) * 12 + diferencia de meses + 1. PostgreSQL comentado: AGE() con EXTRACT(YEAR)*12+EXTRACT(MONTH)+1. GROUP BY actualizado para usar la misma expresion. Los buckets ltv_1_a_3 y ltv_1_a_6 no modificados. |

## Correcciones QA aplicadas en sesion 2026-06-03

| ID | Archivo | Descripcion |
|----|---------|-------------|
| IMP-N8-01 | modulos/nivel-08-profesional/leccion-01.md | VERIFICADO — schema de payments ya usa metodos canonicos ('credit_card', 'bank_transfer', 'paypal', 'crypto'). Sin referencias a payments.country. |
| IMP-N8-02 | modulos/nivel-08-profesional/leccion-03.md | VERIFICADO — secuencia es BEGIN...ROLLBACK (sin COMMIT previo). No hay secuencia incoherente COMMIT;ROLLBACK;. |
| IMP-N8-03 | modulos/nivel-08-profesional/ejercicios-nivel-08.sql | VERIFICADO — Solucion 13 termina en ROLLBACK, no en COMMIT;ROLLBACK;. |
| IMP-N8-04 | modulos/nivel-08-profesional/leccion-01.md | VERIFICADO — outputs simulados de Query 3 usan metodos canonicos. |
| IMP-CAP-01 | modulos/capstone/README.md | VERIFICADO — schema canonico alineado, sin columnas ficticias. |
| IMP-CAP-02 | modulos/capstone/README.md | VERIFICADO — metodos de pago canonicos usados. |
| IMP-CAP-03 | modulos/capstone/parte-01-exploracion.sql | VERIFICADO — EJ01 especifica explicitamente revenue_neto = pagos completed - refunded usando payments. |
| Capstone partes 02-05 | modulos/capstone/ | VERIFICADO — los 5 archivos existen con ejercicios completos y soluciones. |

## Correcciones QA aplicadas en sesion 2026-06-03 (segunda tanda — Nivel 6 template JSON)

| ID | Archivo | Descripcion |
|----|---------|-------------|
| CRIT-06 | dataset/expected-results-nivel-06-template.json EJ12 | APLICADA — titulo, briefing_ref, reference_query, tables_used, expected_columns actualizados. La query ahora usa orders JOIN customers con orders.status = 'cancelled' como proxy. Referencia a payments eliminada. |
| IMP-N6-01 | modulos/nivel-06-analitica/ejercicios-nivel-06.sql Solucion 18 | APLICADA — eliminado INNER JOIN redundante que generaba producto cartesiano silencioso en CTE ltv_pais. Ahora agrupa directamente sobre subq.country. Comentario explica la decision INNER JOIN (solo clientes activos) vs LEFT JOIN alternativa. |
| IMP-N6-02 | dataset/expected-results-nivel-06-template.json EJ2 | APLICADA — reference_query reformulada con marketing_campaigns JOIN orders JOIN order_items. tables_used actualizado. website_sessions eliminado. |
| IMP-N6-03 | dataset/expected-results-nivel-06-template.json EJ3 y EJ9 | APLICADA — reference_query reformulada en ambos ejercicios con JOIN temporal directo (sin website_sessions). tables_used actualizado en ambos. |
| SUG-N6-03 | modulos/nivel-06-analitica/ejercicios-nivel-06.sql Solucion 19 | CONFIRMADO DONE — la CTE huerfana clientes_cohorte_por_canal ya habia sido eliminada en sesion 2026-06-02. |

## Archivos creados en sesion 2026-06-03 (tercera tanda — completar Nivel 0)

| Archivo | Descripcion |
|---------|-------------|
| `modulos/nivel-00-fundamentos/leccion-02.md` | WHERE: operadores comparacion, AND/OR/NOT, parentesis para prioridad, IS NULL. Motor: SQLite |
| `modulos/nivel-00-fundamentos/leccion-03.md` | ORDER BY ASC/DESC, multiple ORDER BY, LIMIT, OFFSET, paginacion |
| `modulos/nivel-00-fundamentos/leccion-04.md` | Aliases AS, alias de tabla, concatenacion ||, comentarios -- y /**/, buenas practicas |
| `modulos/nivel-00-fundamentos/ejercicios-nivel-00.sql` | 20 ejercicios progresivos con soluciones (EJ01-20) |

### Contenido del ejercicios-nivel-00.sql

- EJ01: SELECT * FROM customers
- EJ02: SELECT columnas especificas
- EJ03: Alias AS para columnas en espanol
- EJ04: LIMIT 10 en products
- EJ05: WHERE country = 'Mexico'
- EJ06: WHERE status = 'delivered' en orders
- EJ07: WHERE category_id != 1
- EJ08: WHERE country AND segment (AND)
- EJ09: WHERE channel OR (OR)
- EJ10: WHERE country != 'Spain'
- EJ11: WHERE price > 100
- EJ12: WHERE price < 50 AND (cat=2 OR cat=3) — parentesis
- EJ13: ORDER BY last_name ASC, first_name ASC
- EJ14: ORDER BY price DESC
- EJ15: ORDER BY order_date DESC, status ASC (multiple)
- EJ16: LIMIT 5 + ORDER BY price DESC (top 5)
- EJ17: Alias de tabla 'c', notacion c.columna
- EJ18: Concatenacion first_name || ' ' || last_name
- EJ19: BETWEEN 50 AND 200
- EJ20: Integrador — SELECT + WHERE + ORDER BY + LIMIT + alias + concatenacion

### Notas de diseno Nivel 0

- Motor: SQLite exclusivamente — booleanos como is_active = 1, concatenacion con ||
- Tablas usadas: customers, orders, products, categories
- Nombres de columna del dataset real: signup_date (no registered_at), segment, channel, campaign_id, cost, sku
- La leccion-02 incluye nota temprana sobre IS NULL (trampa comun) sin profundizar — el tema completo es Nivel 4
- La concatenacion en leccion-04 incluye advertencia sobre NULL en cualquier operando

## Estado QA global al 2026-06-03

| Nivel | Estado QA |
|-------|-----------|
| Diagnostico | APROBADO CON OBSERVACIONES |
| Nivel 0 | COMPLETO — leccion-01 a leccion-04 + ejercicios-nivel-00.sql |
| Nivel 1 | APROBADO CON OBSERVACIONES |
| Nivel 2 | APROBADO CON OBSERVACIONES |
| Nivel 3 | APROBADO CON OBSERVACIONES |
| Nivel 4 | APROBADO CON OBSERVACIONES |
| Nivel 5 | APROBADO |
| Nivel 6 | APROBADO (todas las correcciones criticas e importantes aplicadas 2026-06-03) |
| Nivel 7 | APROBADO CON OBSERVACIONES |
| Nivel 8 | APROBADO |
| Capstone | APROBADO |

## Proximos pasos pendientes

- Evaluaciones formales por nivel (Nivel 1-8) — no iniciadas
- Sugerencias opcionales pendientes: SUG-N6-01 (nota modelo de atribucion en leccion-01.md), SUG-N6-02 (notas de dialecto en lecciones 1-4 del Nivel 6), SUG-02/03 (leccion-04.md Nivel 1), SUG-04 (diagnostico P5), SUG-05 (ejercicios Nivel 1 EJ03)
- Todos los niveles estan publicables sin cambios criticos adicionales
