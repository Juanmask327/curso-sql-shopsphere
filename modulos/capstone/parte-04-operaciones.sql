-- =============================================================
-- CAPSTONE — PARTE 04: Operaciones y calidad de datos
-- ShopSphere SQL Course — Proyecto Final Integrador
-- Tablas disponibles: todas (customers, categories, products,
--   orders, order_items, returns, inventory,
--   marketing_campaigns, website_sessions, payments)
-- =============================================================
-- Contexto narrativo:
--   Diego Morales, Head of Operations, tiene dos prioridades
--   antes de la auditoría de los fondos de inversión.
--   Primera: el análisis de inventario y devoluciones que
--   lleva semanas pidiendo — la situación de stock crítico
--   y las categorías con alta tasa de devolución necesitan
--   datos antes de hablar con proveedores.
--   Segunda: la auditoría que los inversores pidieron
--   explícitamente: ¿están los datos en condiciones para
--   una revisión externa? Si hay problemas de integridad,
--   hay que documentarlos antes de que los encuentre el
--   auditor.
--
-- Técnicas integradas de: Nivel 3 (LEFT JOIN con IS NULL),
--   Nivel 4 (subqueries, EXISTS), Nivel 5 (CTEs, JULIANDAY),
--   Nivel 6 (LAG para comparación MoM), Nivel 8 (UNION ALL
--   para consolidar anomalías, integridad referencial)
--
-- Dialecto: SQLite
--   JULIANDAY(a) - JULIANDAY(b) para diferencia en días
--   STRFTIME('%Y-%m', col) para agrupar por mes
--   NULLIF(expr, 0) en todos los denominadores
--   UNION ALL para consolidar registros de anomalía
-- =============================================================


-- ---------------------------------------------------------------
-- EJ18 — Stock crítico: productos con inventario bajo y alta rotación
-- Dificultad: ⭐⭐⭐
-- ---------------------------------------------------------------
-- Contexto:
--   Diego necesita una lista accionable: qué productos están
--   a punto de quedarse sin stock considerando su velocidad
--   de venta. No alcanza con saber que el stock es bajo —
--   hay que cruzarlo con cuántas unidades se venden por día
--   para calcular cuántos días de cobertura quedan. Un
--   producto con stock 50 pero que vende 2 unidades al día
--   tiene 25 días — es urgente. Uno con stock 50 que vende
--   1 unidad al mes no es prioritario.
--
-- Enunciado:
--   Para todos los productos activos (is_active = 1), calcula:
--     producto            — name de products
--     categoria           — name de categories
--     stock_actual        — stock de inventory (último registro
--                           por product_id si hay múltiples:
--                           usar MAX(updated_at))
--     unidades_90d        — unidades vendidas en los últimos
--                           90 días desde '2026-05-31'
--                           (SUM de quantity de order_items
--                           donde ordered_at >= '2026-03-02'
--                           AND < '2026-06-01')
--     ventas_diarias      — unidades_90d / 90.0 (ROUND 2)
--     dias_cobertura      — stock_actual / NULLIF(ventas_diarias, 0)
--                           (ROUND 1)
--     nivel_urgencia      — CASE WHEN:
--                           'critico'    si dias_cobertura < 15
--                           'alerta'     si dias_cobertura BETWEEN 15 AND 30
--                           'adecuado'   si dias_cobertura > 30
--                           'sin_ventas' si dias_cobertura IS NULL
--   Solo muestra productos con nivel_urgencia IN ('critico', 'alerta').
--   Ordena por dias_cobertura ASC NULLS FIRST.
--
-- Criterio de éxito:
--   - CTE stock_actual: para productos con múltiples filas
--     en inventory, tomar la más reciente (MAX(updated_at))
--   - CTE ventas_90d: pedidos entregados o enviados en el
--     rango de fechas
--   - NULLIF en el denominador de dias_cobertura (productos
--     activos sin ventas recientes = sin_ventas)
--   - El filtro de fecha no usa BETWEEN — usa >= y < para
--     incluir el día completo

-- Tu query aquí:


-- Solución EJ18:
/*
WITH stock_actual AS (
    -- Stock más reciente por producto (en caso de múltiples registros)
    SELECT
        i.product_id,
        i.stock
    FROM inventory i
    INNER JOIN (
        SELECT product_id, MAX(updated_at) AS ultima_actualizacion
        FROM inventory
        GROUP BY product_id
    ) ultimo ON ultimo.product_id = i.product_id
           AND ultimo.ultima_actualizacion = i.updated_at
),
ventas_90d AS (
    -- Unidades vendidas en los últimos 90 días desde 2026-05-31
    SELECT
        oi.product_id,
        SUM(oi.quantity)                                         AS unidades_90d
    FROM order_items oi
    INNER JOIN orders o ON o.order_id = oi.order_id
    WHERE o.status IN ('delivered', 'shipped')
      AND o.ordered_at >= '2026-03-02'      -- 2026-05-31 - 90 días
      AND o.ordered_at <  '2026-06-01'
    GROUP BY oi.product_id
),
cobertura AS (
    -- Combinamos stock con ventas para calcular cobertura
    SELECT
        p.product_id,
        p.name                                                   AS producto,
        cat.name                                                 AS categoria,
        COALESCE(sa.stock, 0)                                    AS stock_actual,
        COALESCE(v.unidades_90d, 0)                              AS unidades_90d,
        ROUND(COALESCE(v.unidades_90d, 0) / 90.0, 2)            AS ventas_diarias,
        ROUND(
            COALESCE(sa.stock, 0)
            / NULLIF(COALESCE(v.unidades_90d, 0) / 90.0, 0),
            1
        )                                                        AS dias_cobertura
    FROM products p
    INNER JOIN categories cat ON cat.category_id = p.category_id
    LEFT  JOIN stock_actual  sa  ON sa.product_id  = p.product_id
    LEFT  JOIN ventas_90d    v   ON v.product_id   = p.product_id
    WHERE p.is_active = 1
)
SELECT
    producto,
    categoria,
    stock_actual,
    unidades_90d,
    ventas_diarias,
    dias_cobertura,
    CASE
        WHEN dias_cobertura < 15                    THEN 'critico'
        WHEN dias_cobertura BETWEEN 15 AND 30       THEN 'alerta'
        WHEN dias_cobertura > 30                    THEN 'adecuado'
        ELSE 'sin_ventas'
    END                                                          AS nivel_urgencia
FROM cobertura
WHERE
    -- Solo mostramos los que requieren atención
    dias_cobertura < 15
    OR (dias_cobertura BETWEEN 15 AND 30)
ORDER BY dias_cobertura ASC NULLS FIRST;
*/

-- Resultado esperado (aproximado):
-- Lista de productos activos con stock crítico o en alerta.
-- Los primeros de la lista (dias_cobertura más bajo o NULL)
-- son los que Diego necesita reponer con urgencia.
-- Los NULL en dias_cobertura indican stock = 0 con ventas
-- recientes — ruptura de stock activa.

-- Interpretación esperada:
-- "Hay N productos en nivel 'critico' (< 15 días de cobertura)
--  y M en nivel 'alerta' (15-30 días). Entre los críticos,
--  [categoría] concentra la mayor cantidad — consistente con
--  el problema de inventario que Diego mencionó en enero 2026.
--  Recomendación: emitir órdenes de compra para los productos
--  críticos en las próximas 48 horas para evitar ruptura de
--  stock visible en el catálogo."


-- ---------------------------------------------------------------
-- EJ19 — Análisis de devoluciones por categoría con tendencia MoM
-- Dificultad: ⭐⭐⭐⭐
-- ---------------------------------------------------------------
-- Contexto:
--   Diego necesita un análisis de devoluciones con contexto
--   temporal: no solo cuánto se devuelve en cada categoría,
--   sino si la tasa está subiendo o bajando mes a mes.
--   El spike de julio 2025 (tasa del 8.3% en calzado) debe
--   aparecer en los datos. Si la tasa de alguna categoría
--   sigue alta en H1 2026, hay que nombrarlo antes de la
--   auditoría.
--
-- Enunciado:
--   Para cada categoría y mes en el período H1 2025 - H1 2026
--   (enero 2025 a junio 2026), calcula:
--     categoria          — name de categories
--     mes                — STRFTIME('%Y-%m', o.ordered_at)
--     pedidos_mes        — pedidos distintos de la categoría
--                          en ese mes
--     devoluciones_mes   — returns aprobados (status='approved')
--                          de esa categoría en ese mes
--                          (por returned_at del return)
--     tasa_devolucion_pct — devoluciones_mes / pedidos_mes
--                           * 100 (ROUND 1)
--     tasa_anterior      — LAG(tasa_devolucion_pct) OVER
--                          (PARTITION BY categoria
--                           ORDER BY mes) (ROUND 1)
--     variacion_mom      — tasa_devolucion_pct - tasa_anterior
--                          (ROUND 1)
--   Ordena por categoria ASC, mes ASC.
--
-- Criterio de éxito:
--   - CTE pedidos_categoria: COUNT DISTINCT de order_id por
--     categoria y mes (usando ordered_at del pedido)
--   - CTE devoluciones_categoria: COUNT de returns aprobados
--     por categoria y mes (usando returned_at del return)
--   - LEFT JOIN entre pedidos y devoluciones para mantener
--     meses con 0 devoluciones
--   - COALESCE(devoluciones_mes, 0) antes de calcular la tasa
--   - NULLIF en el denominador de la tasa
--   - Julio 2025 en la categoría de calzado debería aparecer
--     con tasa_devolucion_pct elevada

-- Tu query aquí:


-- Solución EJ19:
/*
WITH pedidos_categoria AS (
    -- Pedidos por categoría y mes (base del denominador)
    SELECT
        cat.name                                                 AS categoria,
        STRFTIME('%Y-%m', o.ordered_at)                          AS mes,
        COUNT(DISTINCT o.order_id)                               AS pedidos_mes
    FROM orders o
    INNER JOIN order_items oi  ON oi.order_id   = o.order_id
    INNER JOIN products    p   ON p.product_id  = oi.product_id
    INNER JOIN categories  cat ON cat.category_id = p.category_id
    WHERE o.ordered_at >= '2025-01-01'
      AND o.ordered_at <  '2026-07-01'
    GROUP BY cat.name, STRFTIME('%Y-%m', o.ordered_at)
),
devoluciones_categoria AS (
    -- Returns aprobados por categoría y mes (por fecha del return)
    SELECT
        cat.name                                                 AS categoria,
        STRFTIME('%Y-%m', r.returned_at)                         AS mes,
        COUNT(r.return_id)                                       AS devoluciones_mes
    FROM returns r
    INNER JOIN orders     o   ON o.order_id   = r.order_id
    INNER JOIN order_items oi ON oi.order_id  = o.order_id
    INNER JOIN products   p   ON p.product_id = oi.product_id
    INNER JOIN categories cat ON cat.category_id = p.category_id
    WHERE r.status = 'approved'
      AND r.returned_at >= '2025-01-01'
      AND r.returned_at <  '2026-07-01'
    GROUP BY cat.name, STRFTIME('%Y-%m', r.returned_at)
),
combinado AS (
    -- Combinamos pedidos con devoluciones
    SELECT
        pc.categoria,
        pc.mes,
        pc.pedidos_mes,
        COALESCE(dc.devoluciones_mes, 0)                         AS devoluciones_mes,
        ROUND(
            COALESCE(dc.devoluciones_mes, 0) * 100.0
            / NULLIF(pc.pedidos_mes, 0),
            1
        )                                                        AS tasa_devolucion_pct
    FROM pedidos_categoria pc
    LEFT JOIN devoluciones_categoria dc
        ON  dc.categoria = pc.categoria
        AND dc.mes       = pc.mes
)
SELECT
    categoria,
    mes,
    pedidos_mes,
    devoluciones_mes,
    tasa_devolucion_pct,
    ROUND(
        LAG(tasa_devolucion_pct) OVER (
            PARTITION BY categoria
            ORDER BY mes ASC
        ),
        1
    )                                                            AS tasa_anterior,
    ROUND(
        tasa_devolucion_pct
        - LAG(tasa_devolucion_pct) OVER (
            PARTITION BY categoria
            ORDER BY mes ASC
        ),
        1
    )                                                            AS variacion_mom
FROM combinado
ORDER BY categoria ASC, mes ASC;
*/

-- Resultado esperado (aproximado):
-- Muchas filas (categorías × meses). La categoría 'Calzado'
-- (o equivalente) debería mostrar un spike en julio 2025
-- con tasa_devolucion_pct muy superior al promedio.
-- variacion_mom positivo = la tasa subió vs. el mes anterior.

-- Interpretación esperada:
-- "La categoría [Calzado] registró una tasa de devolución del
--  X% en julio 2025, con una variación de +Y puntos porcentuales
--  respecto a junio — el spike más alto del período analizado,
--  consistente con el problema del proveedor documentado.
--  En H1 2026, la tasa de [categoría más problemática] es del
--  Z%, por encima del benchmark de 3-5% para e-commerce.
--  Diego debe priorizar la revisión de proveedores de esta
--  categoría antes de la auditoría."


-- ---------------------------------------------------------------
-- EJ20 — Auditoría de integridad: pedidos sin pago y pagos huérfanos
-- Dificultad: ⭐⭐⭐⭐
-- ---------------------------------------------------------------
-- Contexto:
--   Los inversores pidieron explícitamente una auditoría de
--   datos. Si hay pedidos marcados como 'delivered' sin ningún
--   pago completado en la tabla payments, ese revenue está
--   en riesgo real. Y si hay pagos completados que no tienen
--   un pedido válido, eso es una inconsistencia que el auditor
--   externo va a encontrar. Hay que documentarlo primero.
--
-- Enunciado:
--   Construye un reporte de anomalías de integridad usando
--   UNION ALL para consolidar dos tipos de problemas:
--
--   Anomalía 1: Pedidos 'delivered' sin ningún pago 'completed'
--     Para cada pedido entregado sin pago completado:
--       tipo_anomalia    — 'pedido_sin_pago_completado'
--       referencia_id    — order_id (CAST como TEXT)
--       detalle          — 'status: delivered, sin payment completed'
--       monto_estimado   — SUM de quantity * unit_price de
--                          order_items del pedido (ROUND 2)
--
--   Anomalía 2: Pagos 'completed' con paid_at IS NULL
--     Para cada pago completado sin fecha de pago:
--       tipo_anomalia    — 'pago_completado_sin_fecha'
--       referencia_id    — payment_id (CAST como TEXT)
--       detalle          — 'status: completed, paid_at NULL'
--       monto_estimado   — amount del pago (ROUND 2)
--
--   Resultado final (unión de ambas anomalías):
--     tipo_anomalia, referencia_id, detalle, monto_estimado
--   Ordena por tipo_anomalia ASC, monto_estimado DESC.
--   Al final de la query, agrega un resumen con:
--     tipo_anomalia, COUNT(*), SUM(monto_estimado)
--   (esto es un segundo SELECT usando la misma lógica).
--
-- Criterio de éxito:
--   - La Anomalía 1 usa LEFT JOIN de orders a payments
--     con filtro WHERE p.payment_id IS NULL o p.status != 'completed'
--     (o NOT EXISTS como alternativa)
--   - La Anomalía 2 filtra payments WHERE status = 'completed'
--     AND paid_at IS NULL
--   - UNION ALL (no UNION) porque los tipos son distintos
--   - CAST(order_id AS TEXT) para unificar el tipo en referencia_id

-- Tu query aquí:


-- Solución EJ20:
/*
-- PARTE A: Detalle de todas las anomalías
WITH pedidos_sin_pago AS (
    -- Pedidos 'delivered' que no tienen ningún payment 'completed'
    SELECT
        o.order_id,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)               AS monto_estimado
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status = 'delivered'
      AND NOT EXISTS (
          SELECT 1
          FROM payments p
          WHERE p.order_id = o.order_id
            AND p.status   = 'completed'
      )
    GROUP BY o.order_id
),
pagos_sin_fecha AS (
    -- Pagos 'completed' sin fecha de pago — inconsistencia de registro
    SELECT
        payment_id,
        ROUND(amount, 2)                                         AS monto_estimado
    FROM payments
    WHERE status  = 'completed'
      AND paid_at IS NULL
)
-- Detalle completo por anomalía
SELECT
    'pedido_sin_pago_completado'                                 AS tipo_anomalia,
    CAST(order_id AS TEXT)                                       AS referencia_id,
    'status: delivered, sin payment completed'                   AS detalle,
    monto_estimado
FROM pedidos_sin_pago

UNION ALL

SELECT
    'pago_completado_sin_fecha'                                  AS tipo_anomalia,
    CAST(payment_id AS TEXT)                                     AS referencia_id,
    'status: completed, paid_at NULL'                            AS detalle,
    monto_estimado
FROM pagos_sin_fecha

ORDER BY tipo_anomalia ASC, monto_estimado DESC;
*/

-- Solución EJ20 — PARTE B: Resumen ejecutivo de anomalías:
/*
WITH pedidos_sin_pago AS (
    SELECT
        o.order_id,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)               AS monto_estimado
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status = 'delivered'
      AND NOT EXISTS (
          SELECT 1 FROM payments p
          WHERE p.order_id = o.order_id AND p.status = 'completed'
      )
    GROUP BY o.order_id
),
pagos_sin_fecha AS (
    SELECT payment_id, ROUND(amount, 2) AS monto_estimado
    FROM payments
    WHERE status = 'completed' AND paid_at IS NULL
),
todas_las_anomalias AS (
    SELECT 'pedido_sin_pago_completado' AS tipo_anomalia, monto_estimado
    FROM pedidos_sin_pago
    UNION ALL
    SELECT 'pago_completado_sin_fecha'  AS tipo_anomalia, monto_estimado
    FROM pagos_sin_fecha
)
SELECT
    tipo_anomalia,
    COUNT(*)                                                     AS total_registros,
    ROUND(SUM(monto_estimado), 2)                                AS monto_total_en_riesgo
FROM todas_las_anomalias
GROUP BY tipo_anomalia
ORDER BY monto_total_en_riesgo DESC;
*/

-- Resultado esperado (aproximado):
-- Parte A: lista de registros anómalos con su monto.
-- Parte B: dos filas — una por tipo de anomalía — con el
-- conteo total y el monto total en riesgo.
-- Si hay muchos pedidos sin pago completado, el monto en
-- riesgo puede ser material para la auditoría.

-- Interpretación esperada:
-- "Se detectaron N pedidos marcados como 'delivered' sin pago
--  completado, representando $X en revenue en riesgo. Además,
--  M pagos con status 'completed' no tienen fecha de pago
--  registrada (paid_at NULL), por $Y — inconsistencia de
--  registro que puede afectar los reportes financieros.
--  RECOMENDACIÓN: antes de la auditoría externa, el equipo
--  técnico debe investigar si los N pedidos sin pago son
--  errores de integración o pagos reales no registrados.
--  Los M pagos sin fecha deben corregirse con un script
--  de reconciliación contra el procesador de pagos."


-- ---------------------------------------------------------------
-- EJ21 — Productos zombie y catálogo obsoleto
-- Dificultad: ⭐⭐⭐
-- ---------------------------------------------------------------
-- Contexto:
--   Un catálogo limpio es parte de la salud operacional.
--   Los "productos zombie" son aquellos que están marcados
--   como activos (is_active = 1) pero no han tenido ninguna
--   venta en los últimos 6 meses. Ocupan espacio en el
--   catálogo, confunden a los compradores y distorsionan
--   métricas de catálogo. Diego quiere una lista para
--   revisar con el equipo de producto antes de la auditoría.
--
-- Enunciado:
--   Identifica productos activos sin ninguna venta en los
--   últimos 6 meses (desde '2025-12-01' hasta '2026-05-31').
--   Para cada uno:
--     producto             — name de products
--     categoria            — name de categories
--     precio               — price de products (ROUND 2)
--     stock_actual         — stock de inventory (último registro)
--                            COALESCE a 0 si no hay registro
--     ultima_venta         — fecha del último pedido válido
--                            (delivered/shipped) para ese
--                            producto (MAX ordered_at)
--                            NULL si nunca se vendió
--     dias_desde_venta     — JULIANDAY('2026-05-31') -
--                            JULIANDAY(ultima_venta)
--                            NULL si nunca se vendió
--                            (ROUND 0)
--     clasificacion        — 'nunca_vendido' si ultima_venta IS NULL
--                            'obsoleto_6m'   si dias_desde_venta > 180
--   Ordena por clasificacion ASC, dias_desde_venta DESC NULLS FIRST.
--
-- Criterio de éxito:
--   - NOT EXISTS o LEFT JOIN con IS NULL para detectar
--     productos sin ventas en el período
--   - El período sin ventas es >= '2025-12-01' (no 6 meses
--     flotante — la fecha fija hace la query reproducible)
--   - La última venta histórica se calcula sobre todos los
--     pedidos (sin filtro de fecha), para mostrar cuándo
--     fue la última vez que alguien lo compró
--   - COALESCE en stock_actual para productos sin registro
--     en inventory

-- Tu query aquí:


-- Solución EJ21:
/*
WITH stock_actual AS (
    -- Stock más reciente por producto
    SELECT
        i.product_id,
        i.stock
    FROM inventory i
    INNER JOIN (
        SELECT product_id, MAX(updated_at) AS ultima_actualizacion
        FROM inventory
        GROUP BY product_id
    ) ult ON ult.product_id = i.product_id
         AND ult.ultima_actualizacion = i.updated_at
),
ultima_venta_historica AS (
    -- Fecha del último pedido válido por producto (toda la historia)
    SELECT
        oi.product_id,
        MAX(o.ordered_at)                                        AS ultima_venta
    FROM order_items oi
    INNER JOIN orders o ON o.order_id = oi.order_id
    WHERE o.status IN ('delivered', 'shipped')
    GROUP BY oi.product_id
),
productos_sin_venta_reciente AS (
    -- Productos activos sin ninguna venta en los últimos 6 meses
    SELECT DISTINCT oi.product_id
    FROM order_items oi
    INNER JOIN orders o ON o.order_id = oi.order_id
    WHERE o.status      IN ('delivered', 'shipped')
      AND o.ordered_at  >= '2025-12-01'
      AND o.ordered_at  <  '2026-06-01'
)
SELECT
    p.name                                                       AS producto,
    cat.name                                                     AS categoria,
    ROUND(p.price, 2)                                            AS precio,
    COALESCE(sa.stock, 0)                                        AS stock_actual,
    uv.ultima_venta,
    ROUND(
        JULIANDAY('2026-05-31') - JULIANDAY(uv.ultima_venta),
        0
    )                                                            AS dias_desde_venta,
    CASE
        WHEN uv.ultima_venta IS NULL THEN 'nunca_vendido'
        ELSE 'obsoleto_6m'
    END                                                          AS clasificacion
FROM products p
INNER JOIN categories cat ON cat.category_id = p.category_id
LEFT  JOIN stock_actual  sa ON sa.product_id  = p.product_id
LEFT  JOIN ultima_venta_historica uv ON uv.product_id = p.product_id
WHERE p.is_active = 1
  -- Excluimos los que sí tuvieron ventas en los últimos 6 meses
  AND p.product_id NOT IN (SELECT product_id FROM productos_sin_venta_reciente)
ORDER BY clasificacion ASC, dias_desde_venta DESC NULLS FIRST;
*/

-- Resultado esperado (aproximado):
-- Lista de productos activos sin venta en 6 meses.
-- Los 'nunca_vendido' son los más problemáticos —
-- están en el catálogo pero nunca generaron revenue.
-- Los 'obsoleto_6m' pueden tener última venta de hace
-- 7, 12 o más meses — indican productos que se agotaron
-- o perdieron demanda gradualmente.

-- Interpretación esperada:
-- "Hay N productos activos clasificados como zombie:
--  M nunca han generado una venta y K llevan más de 6 meses
--  sin actividad. En conjunto representan $X en valor de
--  catálogo y $Y en stock inmovilizado. Recomendación para
--  Diego: marcar los 'nunca_vendido' como is_active = 0
--  de inmediato, y revisar los 'obsoleto_6m' con los
--  brand managers antes de desactivarlos — pueden estar
--  en proceso de relanzamiento."
