-- =============================================================
-- CAPSTONE — PARTE 05: Dashboard ejecutivo
-- ShopSphere SQL Course — Proyecto Final Integrador
-- Tablas disponibles: todas (customers, categories, products,
--   orders, order_items, returns, inventory,
--   marketing_campaigns, website_sessions, payments)
-- =============================================================
-- Contexto narrativo:
--   Marco Jiménez, CEO, lleva la presentación a los fondos
--   mañana a las 9 AM. Valentina tiene un solo requerimiento:
--   "Dame el estado del negocio en una página. H1 2026 vs.
--   H1 2025. Los números más importantes, con la variación.
--   Y si hay algo raro en los datos, nómbralo — el auditor
--   lo va a encontrar de todas formas."
--   Esta es la parte final del Capstone: el entregable que
--   Marco lleva a la reunión. Todo lo que hiciste en las
--   Partes 01-04 converge aquí.
--
-- Técnicas integradas de: todos los niveles del curso.
--   Énfasis en: CTEs múltiples encadenadas (5+),
--   CREATE VIEW con CTEs internas, comparación YoY con
--   CROSS JOIN de períodos, UNION ALL para outputs
--   multi-sección, NULLIF en todos los denominadores,
--   DROP VIEW IF EXISTS + CREATE VIEW (dialecto SQLite)
--
-- Dialecto: SQLite
--   DROP VIEW IF EXISTS (no OR REPLACE)
--   STRFTIME para fechas
--   JULIANDAY para diferencias en días
--   NULLIF(expr, 0) en todos los denominadores
-- =============================================================


-- ---------------------------------------------------------------
-- EJ22 — Dashboard ejecutivo H1 2026 vs. H1 2025
-- Dificultad: ⭐⭐⭐⭐⭐
-- ---------------------------------------------------------------
-- Contexto:
--   La query más importante del Capstone. Marco la lleva
--   a la reunión. Debe mostrar los 5 KPIs del negocio en
--   dos columnas: H1 2025 y H1 2026, con la variación
--   porcentual entre períodos. Si un KPI cayó, hay que
--   nombrarlo — los fondos ya tienen los datos y prefieren
--   que el análisis sea honesto a que los sorprenda el auditor.
--
-- Enunciado:
--   En UNA SOLA QUERY con múltiples CTEs (mínimo 5),
--   calcula los siguientes KPIs para H1 2025 y H1 2026:
--     kpi                 — nombre del indicador
--     valor_h1_2025       — valor del KPI en H1 2025
--                           (ROUND 2)
--     valor_h1_2026       — valor del KPI en H1 2026
--                           (ROUND 2)
--     variacion_pct       — (h1_2026 - h1_2025) / h1_2025
--                           * 100 (ROUND 1)
--
--   Los 5 KPIs (una fila por KPI usando UNION ALL):
--     1. 'revenue_neto'           — pagos completed - refunded
--     2. 'pedidos_totales'        — COUNT DISTINCT de order_id
--                                   en orders (todos los status)
--     3. 'ticket_promedio'        — revenue_neto / pedidos_totales
--     4. 'nuevos_clientes'        — clientes con primer pedido
--                                   en el período
--     5. 'tasa_devolucion_pct'    — returns aprobados /
--                                   pedidos_totales * 100
--
--   H1 2025: paid_at/ordered_at/returned_at >= '2025-01-01'
--            AND < '2025-07-01'
--   H1 2026: paid_at/ordered_at/returned_at >= '2026-01-01'
--            AND < '2026-07-01'
--   Variación positiva = crecimiento. Negativa = caída.
--   Ordena por el orden natural de los KPIs (1 a 5).
--
-- Criterio de éxito:
--   - Una CTE por fuente de datos (pagos_h1, pedidos_h1,
--     nuevos_clientes_h1, devoluciones_h1) — 4 CTEs base
--   - Una CTE kpis que combina con CROSS JOIN
--   - El SELECT final usa UNION ALL con un literal de texto
--     para el nombre del KPI
--   - NULLIF en ticket_promedio y tasa_devolucion_pct
--   - Los valores de H1 2025 y H1 2026 están en la MISMA
--     fila (una CTE calcula ambos períodos)

-- Tu query aquí:


-- Solución EJ22:
/*
WITH pagos AS (
    -- Revenue neto por período (completed - refunded)
    SELECT
        SUM(CASE WHEN status = 'completed'
                  AND paid_at >= '2025-01-01'
                  AND paid_at <  '2025-07-01'
                 THEN amount ELSE 0 END)
        - SUM(CASE WHEN status = 'refunded'
                    AND paid_at >= '2025-01-01'
                    AND paid_at <  '2025-07-01'
                   THEN amount ELSE 0 END)                       AS revenue_h1_2025,
        SUM(CASE WHEN status = 'completed'
                  AND paid_at >= '2026-01-01'
                  AND paid_at <  '2026-07-01'
                 THEN amount ELSE 0 END)
        - SUM(CASE WHEN status = 'refunded'
                    AND paid_at >= '2026-01-01'
                    AND paid_at <  '2026-07-01'
                   THEN amount ELSE 0 END)                       AS revenue_h1_2026
    FROM payments
    WHERE paid_at IS NOT NULL
),
pedidos AS (
    -- Total de pedidos por período
    SELECT
        COUNT(DISTINCT CASE WHEN ordered_at >= '2025-01-01'
                             AND ordered_at <  '2025-07-01'
                            THEN order_id END)                   AS pedidos_h1_2025,
        COUNT(DISTINCT CASE WHEN ordered_at >= '2026-01-01'
                             AND ordered_at <  '2026-07-01'
                            THEN order_id END)                   AS pedidos_h1_2026
    FROM orders
),
nuevos_clientes AS (
    -- Clientes cuyo primer pedido fue en cada período
    SELECT
        COUNT(CASE WHEN primer_pedido >= '2025-01-01'
                    AND primer_pedido <  '2025-07-01'
                   THEN 1 END)                                   AS nuevos_h1_2025,
        COUNT(CASE WHEN primer_pedido >= '2026-01-01'
                    AND primer_pedido <  '2026-07-01'
                   THEN 1 END)                                   AS nuevos_h1_2026
    FROM (
        SELECT customer_id, MIN(ordered_at) AS primer_pedido
        FROM orders
        GROUP BY customer_id
    ) primeros
),
devoluciones AS (
    -- Returns aprobados por período (por fecha del return)
    SELECT
        COUNT(CASE WHEN returned_at >= '2025-01-01'
                    AND returned_at <  '2025-07-01'
                    AND status = 'approved'
                   THEN 1 END)                                   AS devol_h1_2025,
        COUNT(CASE WHEN returned_at >= '2026-01-01'
                    AND returned_at <  '2026-07-01'
                    AND status = 'approved'
                   THEN 1 END)                                   AS devol_h1_2026
    FROM returns
),
kpis AS (
    -- Combinamos todo en una sola fila con CROSS JOIN
    SELECT
        p.revenue_h1_2025,
        p.revenue_h1_2026,
        pe.pedidos_h1_2025,
        pe.pedidos_h1_2026,
        nc.nuevos_h1_2025,
        nc.nuevos_h1_2026,
        d.devol_h1_2025,
        d.devol_h1_2026
    FROM pagos p
    CROSS JOIN pedidos       pe
    CROSS JOIN nuevos_clientes nc
    CROSS JOIN devoluciones  d
)
-- Resultado final: una fila por KPI con comparación H1 2025 vs H1 2026
SELECT 1 AS orden, 'revenue_neto'        AS kpi,
    ROUND(revenue_h1_2025, 2)            AS valor_h1_2025,
    ROUND(revenue_h1_2026, 2)            AS valor_h1_2026,
    ROUND((revenue_h1_2026 - revenue_h1_2025) * 100.0
          / NULLIF(revenue_h1_2025, 0), 1) AS variacion_pct
FROM kpis

UNION ALL

SELECT 2, 'pedidos_totales',
    ROUND(CAST(pedidos_h1_2025 AS REAL), 2),
    ROUND(CAST(pedidos_h1_2026 AS REAL), 2),
    ROUND((pedidos_h1_2026 - pedidos_h1_2025) * 100.0
          / NULLIF(pedidos_h1_2025, 0), 1)
FROM kpis

UNION ALL

SELECT 3, 'ticket_promedio',
    ROUND(revenue_h1_2025 / NULLIF(pedidos_h1_2025, 0), 2),
    ROUND(revenue_h1_2026 / NULLIF(pedidos_h1_2026, 0), 2),
    ROUND(
        (   revenue_h1_2026 / NULLIF(pedidos_h1_2026, 0)
          - revenue_h1_2025 / NULLIF(pedidos_h1_2025, 0)
        ) * 100.0
        / NULLIF(revenue_h1_2025 / NULLIF(pedidos_h1_2025, 0), 0),
        1
    )
FROM kpis

UNION ALL

SELECT 4, 'nuevos_clientes',
    ROUND(CAST(nuevos_h1_2025 AS REAL), 2),
    ROUND(CAST(nuevos_h1_2026 AS REAL), 2),
    ROUND((nuevos_h1_2026 - nuevos_h1_2025) * 100.0
          / NULLIF(nuevos_h1_2025, 0), 1)
FROM kpis

UNION ALL

SELECT 5, 'tasa_devolucion_pct',
    ROUND(devol_h1_2025 * 100.0 / NULLIF(pedidos_h1_2025, 0), 2),
    ROUND(devol_h1_2026 * 100.0 / NULLIF(pedidos_h1_2026, 0), 2),
    ROUND(
        (   devol_h1_2026 * 100.0 / NULLIF(pedidos_h1_2026, 0)
          - devol_h1_2025 * 100.0 / NULLIF(pedidos_h1_2025, 0)
        ) * 100.0
        / NULLIF(devol_h1_2025 * 100.0 / NULLIF(pedidos_h1_2025, 0), 0),
        1
    )
FROM kpis

ORDER BY orden;
*/

-- Resultado esperado (aproximado):
-- 5 filas, una por KPI. La variacion_pct positiva indica
-- crecimiento H1 2026 vs H1 2025. Negativa indica caída.
-- Si el revenue_neto cayó: nombrar la anomalía de Chile.
-- Si la tasa_devolucion_pct subió: señalar el spike de julio
-- 2025 y si se normalizó en H1 2026.

-- Interpretación esperada:
-- "H1 2026 vs H1 2025: revenue neto [creció/cayó] X%,
--  pedidos [creció/cayó] Y%, ticket promedio [subió/bajó] Z%.
--  El crecimiento de nuevos clientes del W% indica [expansión
--  saludable/desaceleración]. La tasa de devolución [mejoró/
--  empeoró] en V puntos porcentuales — [normal/requiere
--  atención]. El número que Marco lleva a los fondos
--  es: revenue neto H1 2026 = $[N]."


-- ---------------------------------------------------------------
-- EJ23 — Vista reutilizable: resumen de salud del negocio
-- Dificultad: ⭐⭐⭐⭐
-- ---------------------------------------------------------------
-- Contexto:
--   Valentina quiere una vista que el equipo pueda consultar
--   periódicamente sin reescribir la query. La vista debe
--   encapsular el resumen de salud del negocio: catálogo,
--   stock, campañas y alertas de churn. Es un health-check
--   en una sola consulta que cualquier analista puede ejecutar
--   el primer lunes de cada mes.
--
-- Enunciado:
--   Crea una vista llamada v_salud_negocio. Primero ejecuta
--   DROP VIEW IF EXISTS v_salud_negocio; luego CREATE VIEW.
--   La vista debe devolver UNA SOLA FILA con estas columnas
--   (usando subqueries escalares o CTEs internas):
--
--     productos_activos    — COUNT de products con is_active = 1
--     productos_inactivos  — COUNT de products con is_active = 0
--     productos_stock_critico — productos activos con stock < 20
--                               (join con inventory, stock más
--                               reciente)
--     campanas_activas     — campañas donde ended_at IS NULL
--                            O ended_at >= '2026-05-31'
--     clientes_alerta_churn — clientes con último pedido válido
--                             (delivered/shipped) entre 60 y 90
--                             días antes de '2026-05-31'
--                             (el mismo cálculo de EJ09)
--     devol_pendientes     — returns con status = 'pending'
--                            (cola de aprobación)
--   La vista no tiene filtro de fecha para catálogo y campañas
--   — usa los datos actuales del dataset. Solo churn y stock
--   usan la fecha de cierre '2026-05-31'.
--
-- Criterio de éxito:
--   - DROP VIEW IF EXISTS antes del CREATE VIEW (sintaxis SQLite)
--   - Todas las métricas en una fila — no GROUP BY en el SELECT
--     final (las subqueries escalares resuelven esto)
--   - El umbral de stock < 20 es una constante de negocio —
--     agregar un comentario explicando de dónde viene
--   - La vista debe poder ejecutarse sin parámetros

-- Tu query aquí:


-- Solución EJ23:
/*
DROP VIEW IF EXISTS v_salud_negocio;

CREATE VIEW v_salud_negocio AS
WITH stock_mas_reciente AS (
    -- Stock actual por producto (registro más reciente)
    SELECT
        i.product_id,
        i.stock
    FROM inventory i
    INNER JOIN (
        SELECT product_id, MAX(updated_at) AS ultima
        FROM inventory
        GROUP BY product_id
    ) ult ON ult.product_id = i.product_id
         AND ult.ultima      = i.updated_at
),
ultimo_pedido_cliente AS (
    -- Fecha del último pedido válido por cliente
    SELECT
        customer_id,
        MAX(ordered_at)                                          AS ultimo_pedido
    FROM orders
    WHERE status IN ('delivered', 'shipped')
    GROUP BY customer_id
)
SELECT
    -- Salud del catálogo
    (SELECT COUNT(*) FROM products WHERE is_active = 1)          AS productos_activos,
    (SELECT COUNT(*) FROM products WHERE is_active = 0)          AS productos_inactivos,
    -- Stock crítico: umbral < 20 unidades (definido por Diego Morales en
    -- la reunión de operaciones de mayo 2026 como mínimo operacional)
    (
        SELECT COUNT(DISTINCT p.product_id)
        FROM products p
        INNER JOIN stock_mas_reciente smr ON smr.product_id = p.product_id
        WHERE p.is_active = 1
          AND smr.stock   < 20
    )                                                            AS productos_stock_critico,
    -- Campañas de marketing activas
    (
        SELECT COUNT(*)
        FROM marketing_campaigns
        WHERE ended_at IS NULL
           OR ended_at >= '2026-05-31'
    )                                                            AS campanas_activas,
    -- Clientes en ventana de riesgo de churn (60-90 días sin comprar)
    (
        SELECT COUNT(*)
        FROM ultimo_pedido_cliente
        WHERE JULIANDAY('2026-05-31') - JULIANDAY(ultimo_pedido)
              BETWEEN 60 AND 90
    )                                                            AS clientes_alerta_churn,
    -- Devoluciones esperando resolución
    (
        SELECT COUNT(*)
        FROM returns
        WHERE status = 'pending'
    )                                                            AS devol_pendientes;
*/

-- Para consultar la vista una vez creada:
-- SELECT * FROM v_salud_negocio;

-- Resultado esperado (aproximado):
-- 1 fila con 6 columnas. Los números deben ser coherentes
-- con los resultados de EJ18 (stock crítico) y EJ09 (churn).

-- Interpretación esperada:
-- "La vista v_salud_negocio entrega en una sola ejecución
--  el estado operacional del negocio. Con X productos en
--  stock crítico, Y clientes en alerta de churn y Z
--  devoluciones pendientes de resolución, el equipo tiene
--  tres acciones inmediatas para esta semana. Esta vista
--  puede ejecutarse cada lunes y sus valores deberían
--  mejorar semana a semana si las acciones correctivas
--  son efectivas."


-- ---------------------------------------------------------------
-- EJ24 — Score card de la anomalía Chile: impacto cuantificado
-- Dificultad: ⭐⭐⭐⭐
-- ---------------------------------------------------------------
-- Contexto:
--   Los fondos chilenos son parte del cap table actual desde
--   la Serie A. Van a preguntar por la anomalía de pagos de
--   marzo-abril 2026 en Chile. Valentina necesita el análisis
--   completo en una sola query: cuántos fallos hubo, cuánto
--   dinero estuvo en riesgo, qué método fue el afectado, y
--   qué porcentaje del revenue de Chile representa ese impacto.
--   El objetivo es que Marco pueda responder la pregunta con
--   datos antes de que la formulen.
--
-- Enunciado:
--   En una sola query con CTEs encadenadas, calcula para Chile
--   en el período marzo-abril 2026 (paid_at >= '2026-03-01'
--   AND < '2026-05-01'):
--
--     metodo_mas_afectado    — el método de pago con mayor
--                              número de fallos en Chile en
--                              el período (subquery o CTE)
--     fallos_ese_metodo      — COUNT de fallos de ese método
--     intentos_ese_metodo    — COUNT total de intentos
--                              de ese método en Chile
--     tasa_fallo_metodo_pct  — fallos / intentos * 100 (ROUND 1)
--     tasa_fallo_base        — tasa de fallo del mismo método
--                              en el resto de países en el
--                              mismo período (ROUND 1)
--     diferencia_pp          — tasa_fallo_metodo_pct -
--                              tasa_fallo_base (ROUND 1)
--                              "pp" = puntos porcentuales
--     monto_fallos_chile     — SUM(amount) de los fallos
--                              de ese método en Chile (ROUND 2)
--     revenue_chile_h1_2026  — revenue neto Chile en H1 2026
--                              (completed - refunded, ROUND 2)
--     impacto_sobre_revenue  — monto_fallos / revenue_h1 * 100
--                              (ROUND 1)
--
-- Criterio de éxito:
--   - El método más afectado se identifica con una subconsulta
--     o CTE + LIMIT 1 ORDER BY COUNT DESC
--   - La tasa de fallo base usa el mismo período pero
--     country != 'Chile'
--   - El revenue_chile_h1_2026 abarca H1 completo (enero-junio),
--     no solo mar-abr
--   - NULLIF en todos los denominadores de tasas e impacto
--   - El resultado es UNA SOLA FILA (la anomalía condensada)

-- Tu query aquí:


-- Solución EJ24:
/*
WITH pagos_mar_abr_chile AS (
    -- Pagos de Chile en mar-abr 2026 con indicador de fallo
    SELECT
        p.payment_id,
        p.method,
        p.status,
        p.amount
    FROM payments p
    INNER JOIN orders    o ON o.order_id    = p.order_id
    INNER JOIN customers c ON c.customer_id = o.customer_id
    WHERE c.country  = 'Chile'
      AND p.paid_at >= '2026-03-01'
      AND p.paid_at <  '2026-05-01'
),
pagos_mar_abr_otros AS (
    -- Pagos del resto de países en mar-abr 2026
    SELECT
        p.payment_id,
        p.method,
        p.status,
        p.amount
    FROM payments p
    INNER JOIN orders    o ON o.order_id    = p.order_id
    INNER JOIN customers c ON c.customer_id = o.customer_id
    WHERE c.country != 'Chile'
      AND p.paid_at >= '2026-03-01'
      AND p.paid_at <  '2026-05-01'
),
metodo_mas_afectado AS (
    -- El método con más fallos en Chile en el período
    SELECT method
    FROM pagos_mar_abr_chile
    WHERE status = 'failed'
    GROUP BY method
    ORDER BY COUNT(*) DESC
    LIMIT 1
),
metricas_metodo_chile AS (
    -- Métricas del método más afectado en Chile
    SELECT
        pmc.method,
        SUM(CASE WHEN pmc.status = 'failed' THEN 1 ELSE 0 END)  AS fallos,
        COUNT(*)                                                 AS intentos,
        ROUND(
            SUM(CASE WHEN pmc.status = 'failed' THEN 1.0 ELSE 0 END)
            / NULLIF(COUNT(*), 0) * 100,
            1
        )                                                        AS tasa_fallo_chile,
        ROUND(
            SUM(CASE WHEN pmc.status = 'failed' THEN pmc.amount ELSE 0 END),
            2
        )                                                        AS monto_fallos
    FROM pagos_mar_abr_chile pmc
    INNER JOIN metodo_mas_afectado mma ON mma.method = pmc.method
    GROUP BY pmc.method
),
tasa_base_otros AS (
    -- Tasa de fallo del mismo método en el resto del mundo
    SELECT
        ROUND(
            SUM(CASE WHEN pmo.status = 'failed' THEN 1.0 ELSE 0 END)
            / NULLIF(COUNT(*), 0) * 100,
            1
        )                                                        AS tasa_fallo_base
    FROM pagos_mar_abr_otros pmo
    INNER JOIN metodo_mas_afectado mma ON mma.method = pmo.method
),
revenue_chile_h1 AS (
    -- Revenue neto de Chile en todo H1 2026
    SELECT
        ROUND(
            SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END)
            - SUM(CASE WHEN p.status = 'refunded'  THEN p.amount ELSE 0 END),
            2
        )                                                        AS revenue_h1
    FROM payments p
    INNER JOIN orders    o ON o.order_id    = p.order_id
    INNER JOIN customers c ON c.customer_id = o.customer_id
    WHERE c.country  = 'Chile'
      AND p.paid_at >= '2026-01-01'
      AND p.paid_at <  '2026-07-01'
      AND p.paid_at IS NOT NULL
)
SELECT
    mmc.method                                                   AS metodo_mas_afectado,
    mmc.fallos                                                   AS fallos_ese_metodo,
    mmc.intentos                                                 AS intentos_ese_metodo,
    mmc.tasa_fallo_chile                                         AS tasa_fallo_metodo_pct,
    tbo.tasa_fallo_base,
    ROUND(mmc.tasa_fallo_chile - tbo.tasa_fallo_base, 1)         AS diferencia_pp,
    mmc.monto_fallos                                             AS monto_fallos_chile,
    rch.revenue_h1                                               AS revenue_chile_h1_2026,
    ROUND(
        mmc.monto_fallos * 100.0
        / NULLIF(rch.revenue_h1, 0),
        1
    )                                                            AS impacto_sobre_revenue
FROM metricas_metodo_chile mmc
CROSS JOIN tasa_base_otros   tbo
CROSS JOIN revenue_chile_h1  rch;
*/

-- Resultado esperado (aproximado):
-- 1 fila. El metodo_mas_afectado debería ser el equivalente
-- a 'credit_card' (o el método de mayor volumen en Chile).
-- La diferencia_pp debería ser de 2 dígitos (la anomalía
-- es un 40% más de fallos, según la biblia del mundo).
-- El impacto_sobre_revenue debería ser de un solo dígito
-- porcentual — material pero no catastrófico.

-- Interpretación esperada:
-- "La anomalía de Chile en mar-abr 2026 está concentrada
--  en el método '[X]': tasa de fallo del Y% en Chile vs.
--  Z% en el resto del mundo — una diferencia de W pp que
--  no puede atribuirse a variación estadística normal.
--  El monto en riesgo es $N, que representa el M% del
--  revenue neto de Chile en H1 2026.
--  CONCLUSIÓN PARA LOS FONDOS: el impacto es contenido y
--  el problema es técnico (método de pago específico),
--  no estructural. La recomendación es activar un método
--  alternativo y completar la investigación con el procesador
--  de pagos antes del cierre del Q2."


-- ---------------------------------------------------------------
-- EJ25 — Los 3 insights más importantes del análisis completo
-- Dificultad: ⭐⭐⭐⭐⭐ (ejercicio abierto)
-- ---------------------------------------------------------------
-- Contexto:
--   Este es el ejercicio final del Capstone. No hay una
--   respuesta única correcta — hay respuestas bien fundadas
--   y respuestas mal fundadas. El criterio no es la query
--   más compleja, sino la capacidad de elegir qué importa
--   y soportarlo con datos.
--   Valentina dijo: "Dame tres números que Marco pueda
--   decir en voz alta en la reunión con los fondos. Que
--   sean verdaderos. Que sean relevantes. Que tengan acción
--   implícita."
--
-- Enunciado:
--   Elige los 3 hallazgos más importantes de tu análisis
--   completo (Partes 01-04). Para cada hallazgo:
--   1. Escribe una query que produzca el número que soporta
--      el hallazgo (puede ser simple o compleja — lo que
--      produzca el dato más honesto)
--   2. Identifica el número clave en el resultado
--   3. Escribe la interpretación para Marco: una frase que
--      conecte el número con la decisión de negocio
--
--   Los hallazgos deben ser DISTINTOS entre sí: no puedes
--   presentar variantes del mismo número. Algunos candidatos
--   que deberías considerar (no son obligatorios):
--     - Concentración de revenue (análisis Pareto)
--     - Eficiencia del canal de adquisición más rentable
--     - Impacto real de la anomalía de Chile
--     - Retención de clientes a 12 meses
--     - Productos zombie y capital inmovilizado en stock
--
-- Criterio de éxito:
--   - Las 3 queries producen números coherentes con el
--     análisis de las Partes 01-04 (no pueden contradecirse)
--   - Cada query tiene comentarios que explican la lógica
--   - Cada hallazgo tiene una frase de interpretación
--     en formato: "[número] — lo que significa para el
--     negocio es... — la acción recomendada es..."
--   - Los 3 hallazgos juntos cuentan una historia coherente
--     del estado de ShopSphere

-- Tu query aquí — Hallazgo 1:


-- Tu query aquí — Hallazgo 2:


-- Tu query aquí — Hallazgo 3:


-- ============================================================
-- SOLUCIONES REFERENCIA EJ25
-- (Estas son 3 hallazgos posibles — los del estudiante pueden
--  ser diferentes si están bien fundamentados)
-- ============================================================

-- Solución EJ25 — Hallazgo 1: Concentración de revenue (Pareto)
/*
-- HALLAZGO: El top 20% de clientes genera más del 70% del revenue.
-- Si perdemos ese grupo, el negocio cambia fundamentalmente.

WITH revenue_cliente AS (
    SELECT
        o.customer_id,
        SUM(oi.quantity * oi.unit_price)                         AS revenue_total
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status IN ('delivered', 'shipped')
    GROUP BY o.customer_id
),
quintiles AS (
    SELECT
        customer_id,
        revenue_total,
        NTILE(5) OVER (ORDER BY revenue_total DESC)              AS quintil
    FROM revenue_cliente
)
SELECT
    CASE quintil
        WHEN 1 THEN 'top_20pct'
        WHEN 2 THEN '20-40pct'
        WHEN 3 THEN '40-60pct'
        WHEN 4 THEN '60-80pct'
        WHEN 5 THEN 'bottom_20pct'
    END                                                          AS segmento,
    COUNT(*)                                                     AS clientes,
    ROUND(SUM(revenue_total), 2)                                 AS revenue_total,
    ROUND(
        SUM(revenue_total) * 100.0
        / NULLIF(SUM(SUM(revenue_total)) OVER (), 0),
        1
    )                                                            AS pct_revenue
FROM quintiles
GROUP BY quintil
ORDER BY quintil;

-- INTERPRETACIÓN PARA MARCO:
-- "[X]% del revenue viene del top 20% de clientes.
--  Eso significa que los [N] clientes más valiosos sostienen
--  el negocio. La acción recomendada es implementar un programa
--  de fidelización dedicado para ese segmento antes de la
--  expansión a Brasil y Ecuador — perder 10 de esos clientes
--  en un mercado nuevo cuesta más que adquirir 100 ordinarios."
*/


-- Solución EJ25 — Hallazgo 2: Canal de adquisición más eficiente
/*
-- HALLAZGO: El canal de email tiene el mejor revenue por cliente
-- adquirido y el segundo mayor volumen. Es el canal a escalar.

WITH primera_sesion AS (
    SELECT
        customer_id,
        campaign_id,
        ROW_NUMBER() OVER (
            PARTITION BY customer_id
            ORDER BY started_at ASC
        )                                                        AS rn
    FROM website_sessions
),
canal_origen AS (
    SELECT
        ps.customer_id,
        COALESCE(mc.channel, 'organic')                          AS canal
    FROM primera_sesion ps
    LEFT JOIN marketing_campaigns mc ON mc.campaign_id = ps.campaign_id
    WHERE ps.rn = 1
),
revenue_cliente AS (
    SELECT
        o.customer_id,
        SUM(oi.quantity * oi.unit_price)                         AS revenue
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status IN ('delivered', 'shipped')
    GROUP BY o.customer_id
)
SELECT
    co.canal,
    COUNT(DISTINCT co.customer_id)                               AS clientes,
    ROUND(COALESCE(SUM(rc.revenue), 0), 2)                       AS revenue_total,
    ROUND(
        COALESCE(SUM(rc.revenue), 0)
        / NULLIF(COUNT(DISTINCT co.customer_id), 0),
        2
    )                                                            AS revenue_por_cliente,
    -- Ranking por revenue por cliente (calidad del canal)
    RANK() OVER (
        ORDER BY COALESCE(SUM(rc.revenue), 0)
                 / NULLIF(COUNT(DISTINCT co.customer_id), 0) DESC
    )                                                            AS rank_calidad
FROM canal_origen co
LEFT JOIN revenue_cliente rc ON rc.customer_id = co.customer_id
GROUP BY co.canal
ORDER BY revenue_por_cliente DESC;

-- INTERPRETACIÓN PARA MARCO:
-- "El canal '[email/X]' genera $[Y] por cliente adquirido,
--  [Z]x más que el promedio del resto de canales.
--  Con el presupuesto de la Serie B, duplicar la inversión
--  en ese canal tiene el mejor retorno esperado proyectado —
--  más que abrir un nuevo canal en Brazil desde cero."
*/


-- Solución EJ25 — Hallazgo 3: Oportunidad de limpieza de catálogo
/*
-- HALLAZGO: Hay capital inmovilizado en stock de productos zombie
-- que podría liberarse con descuentos antes de la expansión.

WITH stock_actual AS (
    SELECT
        i.product_id,
        i.stock
    FROM inventory i
    INNER JOIN (
        SELECT product_id, MAX(updated_at) AS ultima
        FROM inventory
        GROUP BY product_id
    ) ult ON ult.product_id = i.product_id
         AND ult.ultima      = i.updated_at
),
productos_sin_venta_reciente AS (
    SELECT DISTINCT oi.product_id
    FROM order_items oi
    INNER JOIN orders o ON o.order_id = oi.order_id
    WHERE o.status     IN ('delivered', 'shipped')
      AND o.ordered_at >= '2025-12-01'
      AND o.ordered_at <  '2026-06-01'
)
SELECT
    COUNT(DISTINCT p.product_id)                                 AS productos_zombie,
    ROUND(SUM(COALESCE(sa.stock, 0) * p.price), 2)               AS capital_inmovilizado,
    ROUND(AVG(COALESCE(sa.stock, 0)), 1)                         AS stock_promedio_zombie,
    COUNT(DISTINCT cat.name)                                     AS categorias_afectadas
FROM products p
INNER JOIN categories  cat ON cat.category_id = p.category_id
LEFT  JOIN stock_actual sa  ON sa.product_id  = p.product_id
WHERE p.is_active = 1
  AND p.product_id NOT IN (SELECT product_id FROM productos_sin_venta_reciente);

-- INTERPRETACIÓN PARA MARCO:
-- "Hay [N] productos activos en el catálogo sin ninguna venta
--  en los últimos 6 meses, con $[X] en stock inmovilizado al
--  precio de catálogo. Antes de la expansión a Brasil y Ecuador,
--  liquidar ese inventario con un 20-30% de descuento liberaría
--  capital y limpiaría el catálogo — un catálogo más pequeño
--  pero más rentable es más fácil de escalar en un mercado nuevo."
*/

-- ============================================================
-- FIN DEL CAPSTONE — SHOPSPHERE SQL COURSE
-- ============================================================
-- Completaste los 25 ejercicios del proyecto integrador.
-- Los números que produjiste son el análisis que Valentina
-- entrega a Marco, y Marco lleva a los fondos.
--
-- Si los números son coherentes entre partes, las queries
-- están limpias y las interpretaciones conectan el dato
-- con la decisión: eso es el trabajo de un Data Analyst.
--
-- Llevas ocho niveles aprendiendo a hacer esto.
-- Este fue el momento de demostrarlo.
-- ============================================================
