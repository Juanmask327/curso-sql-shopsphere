-- =============================================================
-- CAPSTONE — PARTE 01: Exploración y diagnóstico H1 2026
-- ShopSphere SQL Course — Proyecto Final Integrador
-- Tablas disponibles: todas (customers, categories, products,
--   orders, order_items, returns, inventory,
--   marketing_campaigns, website_sessions, payments)
-- =============================================================
-- Contexto narrativo:
--   Valentina Torres te asignó el análisis estratégico
--   para la presentación de Serie B. Antes de responder
--   cualquier pregunta específica de los inversores, necesitas
--   entender el estado general del negocio en H1 2026
--   (enero–junio 2026). Estos seis ejercicios establecen
--   los números base que el resto del análisis referencia.
--   Si el EJ01 no cuadra con los subtotales de las partes
--   siguientes, algo está mal — el analista excelente
--   lo detecta antes de entregar.
--
-- Dialecto: SQLite
--   STRFTIME('%Y-%m', col)  para agrupar por mes
--   STRFTIME('%m', col)     para extraer mes como texto
--   JULIANDAY(a) - JULIANDAY(b) para diferencia en días
--   DROP VIEW IF EXISTS + CREATE VIEW (no OR REPLACE)
--   DATE('2026-06-01', '-N months') para fechas relativas
--   NULLIF(expr, 0) en todos los denominadores
-- =============================================================


-- ---------------------------------------------------------------
-- EJ01 — Resumen ejecutivo H1 2026
-- Dificultad: ⭐⭐
-- ---------------------------------------------------------------
-- Contexto:
--   Valentina necesita un número de portada para la reunión
--   con los fondos: el estado del negocio en H1 2026 en
--   cuatro métricas. Este es el KPI central del Capstone.
--   Todos los ejercicios siguientes deberían ser coherentes
--   con los totales de esta query.
--
-- Enunciado:
--   Calcula en UNA SOLA QUERY las cuatro métricas de resumen
--   de H1 2026 (2026-01-01 a 2026-06-30):
--     total_pedidos        — COUNT DISTINCT de order_id en orders
--                            donde ordered_at cae en H1 2026
--     revenue_neto         — pagos completed menos pagos refunded
--                            de payments donde paid_at cae en H1 2026
--                            (redondeado a 2 decimales)
--     tasa_devolucion_pct  — returns aprobados en H1 2026
--                            / pedidos H1 2026 * 100
--                            (redondeado a 2 decimales)
--     tasa_fallo_pago_pct  — pagos failed en H1 2026
--                            / total intentos en H1 2026 * 100
--                            (redondeado a 2 decimales)
--   Usa CTEs separadas para cada fuente de datos antes
--   de combinarlas en el SELECT final con CROSS JOIN.
--
-- Criterio de éxito:
--   - Resultado: 1 fila con las 4 columnas
--   - Los períodos de cada CTE usan rangos >= / <
--   - NULLIF en los dos denominadores de tasas
--   - El revenue_neto de esta query es la fuente de
--     verdad para el resto del Capstone
--
-- Nota de negocio:
--   Valentina dijo: "Si el número no está redondeado,
--   no lo quiero en la presentación." ROUND(x, 2) siempre.

-- Tu query aquí:


-- Solución EJ01:
/*
WITH pedidos_h1 AS (
    -- Todos los pedidos de H1 2026 (por fecha de creación del pedido)
    SELECT COUNT(DISTINCT order_id) AS total_pedidos
    FROM orders
    WHERE ordered_at >= '2026-01-01'
      AND ordered_at <  '2026-07-01'
),
pagos_h1 AS (
    -- Pagos procesados en H1 2026 (por fecha efectiva de pago)
    SELECT
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) AS cobrado,
        SUM(CASE WHEN status = 'refunded'  THEN amount ELSE 0 END) AS reembolsado,
        -- Contamos todos los intentos de pago, incluyendo failed y pending
        COUNT(*)                                                    AS total_intentos,
        SUM(CASE WHEN status = 'failed'    THEN 1     ELSE 0 END)  AS intentos_fallidos
    FROM payments
    WHERE paid_at >= '2026-01-01'
      AND paid_at <  '2026-07-01'
),
devoluciones_h1 AS (
    -- Returns aprobados cuya devolución ocurrió en H1 2026
    SELECT COUNT(DISTINCT return_id) AS devoluciones_aprobadas
    FROM returns
    WHERE returned_at >= '2026-01-01'
      AND returned_at <  '2026-07-01'
      AND status IN ('approved')
)
SELECT
    p.total_pedidos,
    ROUND(pg.cobrado - pg.reembolsado, 2)                    AS revenue_neto,
    ROUND(
        d.devoluciones_aprobadas * 100.0
        / NULLIF(p.total_pedidos, 0),
        2
    )                                                        AS tasa_devolucion_pct,
    ROUND(
        pg.intentos_fallidos * 100.0
        / NULLIF(pg.total_intentos, 0),
        2
    )                                                        AS tasa_fallo_pago_pct
FROM pedidos_h1 p
CROSS JOIN pagos_h1 pg
CROSS JOIN devoluciones_h1 d;
*/

-- Interpretación esperada:
-- "En H1 2026 ShopSphere procesó X pedidos con un revenue neto de $Y.
--  La tasa de devolución del Z% y la tasa de fallo de pago del W%
--  [están dentro de / superan] los benchmarks del sector (~3-5% ambas).
--  [Si alguna supera el umbral:] El W% de fallo de pago merece
--  investigación antes de la reunión con los fondos."


-- ---------------------------------------------------------------
-- EJ02 — Tendencia mensual H1 2026 con variación MoM
-- Dificultad: ⭐⭐⭐
-- ---------------------------------------------------------------
-- Contexto:
--   Los inversores quieren ver la tendencia, no solo el total.
--   Si el revenue de mayo 2026 cae respecto a abril, eso importa
--   más que el acumulado. Valentina necesita este gráfico
--   para la apertura de la presentación.
--
-- Enunciado:
--   Para cada mes de H1 2026 (enero a junio), calcula:
--     mes            — STRFTIME('%Y-%m', paid_at)
--     revenue_neto   — completed - refunded (ROUND a 2 dec)
--     revenue_anterior — revenue_neto del mes anterior via LAG
--                        (ROUND a 2 dec, NULL para enero)
--     variacion_pct  — (revenue_neto - revenue_anterior)
--                      / revenue_anterior * 100
--                      (ROUND a 2 dec, NULL para enero)
--   Ordena cronológicamente.
--   Solo pagos con paid_at IS NOT NULL en el período.
--
-- Criterio de éxito:
--   - 6 filas (una por mes enero–junio 2026)
--   - LAG() OVER (ORDER BY mes) sobre la CTE de revenue mensual
--   - NULLIF en el denominador de variacion_pct
--   - Si marzo muestra caída: está capturando el impacto
--     de la anomalía de Chile en credit_card

-- Tu query aquí:


-- Solución EJ02:
/*
WITH revenue_mensual AS (
    SELECT
        STRFTIME('%Y-%m', paid_at)                               AS mes,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) AS cobrado,
        SUM(CASE WHEN status = 'refunded'  THEN amount ELSE 0 END) AS reembolsado
    FROM payments
    WHERE paid_at >= '2026-01-01'
      AND paid_at <  '2026-07-01'
      AND paid_at IS NOT NULL
    GROUP BY STRFTIME('%Y-%m', paid_at)
)
SELECT
    mes,
    ROUND(cobrado - reembolsado, 2)                              AS revenue_neto,
    ROUND(
        LAG(cobrado - reembolsado) OVER (ORDER BY mes),
        2
    )                                                            AS revenue_anterior,
    -- Variación MoM: positivo = crecimiento, negativo = caída
    ROUND(
        (
            (cobrado - reembolsado)
            - LAG(cobrado - reembolsado) OVER (ORDER BY mes)
        ) * 100.0
        / NULLIF(
            LAG(cobrado - reembolsado) OVER (ORDER BY mes),
            0
        ),
        2
    )                                                            AS variacion_pct
FROM revenue_mensual
ORDER BY mes;
*/

-- Interpretación esperada:
-- "El revenue muestra [tendencia creciente/decreciente/mixta] en H1 2026.
--  [Si hay una caída notable:] La caída de X% en [mes] coincide con
--  la anomalía de pagos fallidos en Chile documentada en EJ03 / Parte 04.
--  [Si hay recuperación:] La recuperación de Y% en [mes siguiente]
--  sugiere que el problema fue puntual y no estructural."


-- ---------------------------------------------------------------
-- EJ03 — Top 5 países por revenue neto en H1 2026
-- Dificultad: ⭐⭐⭐
-- ---------------------------------------------------------------
-- Contexto:
--   Marco quiere saber qué mercados sostienen el negocio
--   y cuáles presentan señales de riesgo. Un país puede
--   tener alto revenue pero también alta tasa de fallo —
--   eso es un riesgo de portafolio que hay que nombrar.
--
-- Enunciado:
--   Para H1 2026, retorna los 5 países con mayor revenue neto.
--   Para cada país:
--     pais               — country del cliente (vía orders → customers)
--     revenue_neto       — pagos completed - refunded (ROUND a 2 dec)
--     pedidos            — COUNT DISTINCT de order_id con paid_at en rango
--     tasa_devolucion_pct — returns aprobados / pedidos del país * 100
--                           (ROUND a 2 dec)
--     tasa_fallo_pago_pct — pagos failed / total intentos * 100
--                           (ROUND a 2 dec)
--   Ordena por revenue_neto DESC. Limita a 5 filas.
--   Usa CTEs separadas para pagos y devoluciones, luego combínalas.
--
-- Criterio de éxito:
--   - 5 filas con los 5 países de mayor revenue
--   - El revenue neto por país es coherente con el total de EJ01
--   - Chile aparece con una tasa de fallo notablemente más alta
--     (anomalía de credit_card en mar-abr 2026)
--   - NULLIF en ambos denominadores de tasas

-- Tu query aquí:


-- Solución EJ03:
/*
WITH pagos_pais AS (
    -- Revenue y métricas de pago por país, H1 2026
    SELECT
        c.country,
        COUNT(DISTINCT p.order_id)                               AS pedidos,
        COUNT(*)                                                 AS total_intentos,
        SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END) AS cobrado,
        SUM(CASE WHEN p.status = 'refunded'  THEN p.amount ELSE 0 END) AS reembolsado,
        SUM(CASE WHEN p.status = 'failed'    THEN 1        ELSE 0 END) AS fallos
    FROM payments p
    INNER JOIN orders o    ON o.order_id    = p.order_id
    INNER JOIN customers c ON c.customer_id = o.customer_id
    WHERE p.paid_at >= '2026-01-01'
      AND p.paid_at <  '2026-07-01'
    GROUP BY c.country
),
devoluciones_pais AS (
    -- Returns aprobados por país, H1 2026
    -- Necesitamos llegar al país desde return → order → customer
    SELECT
        c.country,
        COUNT(DISTINCT r.return_id) AS devoluciones_aprobadas
    FROM returns r
    INNER JOIN orders o    ON o.order_id    = r.order_id
    INNER JOIN customers c ON c.customer_id = o.customer_id
    WHERE r.returned_at >= '2026-01-01'
      AND r.returned_at <  '2026-07-01'
      AND r.status = 'approved'
    GROUP BY c.country
)
SELECT
    pp.country                                                   AS pais,
    ROUND(pp.cobrado - pp.reembolsado, 2)                        AS revenue_neto,
    pp.pedidos,
    ROUND(
        COALESCE(dp.devoluciones_aprobadas, 0) * 100.0
        / NULLIF(pp.pedidos, 0),
        2
    )                                                            AS tasa_devolucion_pct,
    ROUND(
        pp.fallos * 100.0
        / NULLIF(pp.total_intentos, 0),
        2
    )                                                            AS tasa_fallo_pago_pct
FROM pagos_pais pp
LEFT JOIN devoluciones_pais dp ON dp.country = pp.country
ORDER BY revenue_neto DESC
LIMIT 5;
*/

-- Interpretación esperada:
-- "Los cinco principales mercados concentran el X% del revenue total.
--  Chile aparece en la posición N con una tasa de fallo de pago del Y%,
--  significativamente por encima del promedio del W% — riesgo documentado
--  en la Parte 04, relacionado con la anomalía de credit_card en Q1 2026."


-- ---------------------------------------------------------------
-- EJ04 — Top 10 productos por revenue neto descontando devoluciones
-- Dificultad: ⭐⭐⭐
-- ---------------------------------------------------------------
-- Contexto:
--   Marco quiere saber qué productos valen la pena escalar
--   y cuáles tienen alto volumen pero alto costo de devolución.
--   La tabla returns no tiene campo de monto — el revenue neto
--   es una aproximación que el analista debe documentar.
--
-- Enunciado:
--   Top 10 productos por revenue neto estimado, descontando
--   devoluciones aprobadas (status = 'approved').
--   Para cada producto:
--     producto             — name de products
--     categoria            — name de categories
--     unidades_vendidas    — SUM(quantity) de order_items
--     revenue_bruto        — SUM(quantity * unit_price) de order_items
--                            (ROUND a 2 dec)
--     devoluciones_aprobadas — COUNT de returns con status='approved'
--                              para ese producto (COALESCE a 0)
--     revenue_neto_aprox   — revenue_bruto - (devoluciones_aprobadas
--                            * precio_promedio_del_producto)
--                            donde precio_promedio =
--                            revenue_bruto / unidades_vendidas
--                            (ROUND a 2 dec)
--     margen_devolucion_pct — devoluciones_aprobadas / unidades_vendidas
--                             * 100 (ROUND a 2 dec)
--   Ordena por revenue_neto_aprox DESC. Limita a 10.
--
-- Criterio de éxito:
--   - Solo devoluciones con status='approved' (no pending ni rejected)
--   - El revenue_neto_aprox no puede ser negativo para ningún producto
--   - NULLIF en el denominador de precio_promedio y margen
--   - Nota en comentario: returns no tiene campo de monto,
--     por lo que este valor es una aproximación

-- Tu query aquí:


-- Solución EJ04:
/*
WITH revenue_bruto AS (
    -- Revenue e información de ventas por producto
    SELECT
        oi.product_id,
        SUM(oi.quantity)                                         AS unidades_vendidas,
        SUM(oi.quantity * oi.unit_price)                         AS revenue_bruto
    FROM order_items oi
    GROUP BY oi.product_id
),
devoluciones_aprobadas AS (
    -- NOTA: returns no tiene campo de cantidad ni monto.
    -- Contamos cada return aprobado como una unidad devuelta.
    -- El impacto en revenue se aproxima multiplicando por el
    -- precio promedio del producto (revenue_bruto / unidades_vendidas).
    SELECT
        product_id,
        COUNT(return_id) AS devoluciones
    FROM returns
    WHERE status = 'approved'
    GROUP BY product_id
)
SELECT
    p.name                                                       AS producto,
    cat.name                                                     AS categoria,
    rb.unidades_vendidas,
    ROUND(rb.revenue_bruto, 2)                                   AS revenue_bruto,
    COALESCE(da.devoluciones, 0)                                 AS devoluciones_aprobadas,
    -- Revenue neto: descontamos el precio promedio por cada devolución aprobada
    ROUND(
        rb.revenue_bruto
        - COALESCE(da.devoluciones, 0)
          * (rb.revenue_bruto / NULLIF(rb.unidades_vendidas, 0)),
        2
    )                                                            AS revenue_neto_aprox,
    ROUND(
        COALESCE(da.devoluciones, 0) * 100.0
        / NULLIF(rb.unidades_vendidas, 0),
        2
    )                                                            AS margen_devolucion_pct
FROM revenue_bruto rb
INNER JOIN products   p   ON p.product_id   = rb.product_id
INNER JOIN categories cat ON cat.category_id = p.category_id
LEFT JOIN  devoluciones_aprobadas da ON da.product_id = rb.product_id
ORDER BY revenue_neto_aprox DESC
LIMIT 10;
*/

-- Interpretación esperada:
-- "El top 10 de productos por revenue neto está dominado por [categoría].
--  [Producto X] tiene alto revenue bruto pero un margen de devolución
--  del Y%, lo que reduce su rentabilidad real — candidato a investigar
--  la causa de devoluciones antes de escalar.
--  NOTA TÉCNICA: revenue_neto_aprox es una estimación porque returns
--  no registra el monto devuelto — solo el conteo de returns aprobados."


-- ---------------------------------------------------------------
-- EJ05 — Distribución de pedidos por status
-- Dificultad: ⭐
-- ---------------------------------------------------------------
-- Contexto:
--   Una query de diagnóstico rápido que todo analista debería
--   hacer al inicio: ¿cómo están distribuidos los pedidos
--   por estado? Si hay un porcentaje alto de 'cancelled' o
--   'returned', eso necesita contexto antes de presentar
--   el revenue.
--
-- Enunciado:
--   Para todos los pedidos de la tabla orders (sin filtro
--   de fecha), retorna:
--     status         — el estado del pedido
--     total_pedidos  — COUNT(*) por status
--     pct_del_total  — porcentaje sobre el total de pedidos
--                      (ROUND a 2 dec)
--   Ordena por total_pedidos DESC.
--   Usa una window function (SUM OVER ()) para el total,
--   no una subquery adicional.
--
-- Criterio de éxito:
--   - Los porcentajes suman exactamente 100%
--   - Se usan todos los status presentes en la tabla
--     (pending, processing, delivered, cancelled, returned)
--   - Window function sin PARTITION BY para el total global

-- Tu query aquí:


-- Solución EJ05:
/*
SELECT
    status,
    COUNT(*)                                                     AS total_pedidos,
    ROUND(
        COUNT(*) * 100.0
        / NULLIF(SUM(COUNT(*)) OVER (), 0),
        2
    )                                                            AS pct_del_total
FROM orders
GROUP BY status
ORDER BY total_pedidos DESC;
*/

-- Interpretación esperada:
-- "El X% de los pedidos están en estado 'delivered', que es la base
--  del revenue real. El Y% en estado 'cancelled' y el Z% en 'returned'
--  representan revenue perdido o en riesgo. [Si algún porcentaje es
--  atípico:] La proporción de [status] del W% merece atención —
--  un benchmark saludable es < 5% para cancelled y < 3% para returned."


-- ---------------------------------------------------------------
-- EJ06 — Anomalía: mes y país con mayor desviación vs promedio
-- Dificultad: ⭐⭐⭐⭐
-- ---------------------------------------------------------------
-- Contexto:
--   Los inversores del fondo chileno mencionaron que notaron
--   algo raro en los números de marzo-abril 2026. Valentina
--   quiere que el análisis lo confirme con datos antes de
--   que ellos lo pregunten.
--   Este ejercicio usa AVG OVER (PARTITION BY) para calcular
--   el promedio histórico de cada país y luego detecta qué
--   mes-país se desvió más de ese promedio.
--
-- Enunciado:
--   Para cada combinación de país y mes (usando paid_at),
--   calcula el revenue neto mensual y lo compara con el
--   promedio histórico del país. Identifica las 5 combinaciones
--   con mayor desviación absoluta hacia arriba o abajo.
--
--   Columnas del resultado:
--     pais                 — country del cliente
--     mes                  — STRFTIME('%Y-%m', paid_at)
--     revenue_neto_mes     — revenue neto de ese mes/país (ROUND 2)
--     promedio_historico   — AVG(revenue_neto) sobre todos los
--                            meses del mismo país, via window function
--                            (ROUND 2)
--     desviacion_abs       — ABS(revenue_neto_mes - promedio_historico)
--                            (ROUND 2)
--     tipo_desviacion      — CASE WHEN: 'spike' si revenue_neto_mes
--                            > promedio_historico * 1.2,
--                            'caida' si < promedio_historico * 0.8,
--                            'normal' en otro caso
--   Ordena por desviacion_abs DESC. Limita a 5.
--   Solo paid_at IS NOT NULL.
--
-- Criterio de éxito:
--   - AVG OVER (PARTITION BY country) sobre la CTE de revenue mensual
--   - El umbral de 20% (+/- 20% del promedio) define spike/caida
--   - Chile en marzo o abril 2026 debería aparecer como 'caida'
--   - ABS() para la desviación absoluta

-- Tu query aquí:


-- Solución EJ06:
/*
WITH revenue_mensual_pais AS (
    -- Revenue neto por país y mes, histórico completo
    SELECT
        c.country,
        STRFTIME('%Y-%m', p.paid_at)                             AS mes,
        SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END)
        - SUM(CASE WHEN p.status = 'refunded' THEN p.amount ELSE 0 END) AS revenue_neto
    FROM payments p
    INNER JOIN orders o    ON o.order_id    = p.order_id
    INNER JOIN customers c ON c.customer_id = o.customer_id
    WHERE p.paid_at IS NOT NULL
    GROUP BY c.country, STRFTIME('%Y-%m', p.paid_at)
),
con_promedio AS (
    -- Agregamos el promedio histórico del país como window function
    SELECT
        country,
        mes,
        revenue_neto,
        -- AVG sin ROWS/RANGE: calcula sobre toda la partición del país
        AVG(revenue_neto) OVER (PARTITION BY country)            AS promedio_historico
    FROM revenue_mensual_pais
)
SELECT
    country                                                      AS pais,
    mes,
    ROUND(revenue_neto, 2)                                       AS revenue_neto_mes,
    ROUND(promedio_historico, 2)                                 AS promedio_historico,
    ROUND(ABS(revenue_neto - promedio_historico), 2)             AS desviacion_abs,
    -- Clasificamos la desviación: spike si supera 20% del promedio,
    -- caida si cae más del 20% por debajo
    CASE
        WHEN revenue_neto > promedio_historico * 1.2  THEN 'spike'
        WHEN revenue_neto < promedio_historico * 0.8  THEN 'caida'
        ELSE 'normal'
    END                                                          AS tipo_desviacion
FROM con_promedio
ORDER BY desviacion_abs DESC
LIMIT 5;
*/

-- Interpretación esperada:
-- "Las 5 mayores anomalías muestran que [País X] en [mes Y] tuvo
--  una caída del Z% respecto a su promedio histórico — consistente
--  con la anomalía de pagos fallidos documentada en la Parte 04.
--  [Si hay spikes también:] El spike de [País W] en [mes V]
--  podría indicar una campaña de marketing exitosa o un evento
--  puntual — merece seguimiento para confirmar si es sostenible."
