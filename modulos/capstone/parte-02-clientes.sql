-- =============================================================
-- CAPSTONE — PARTE 02: Clientes y retención
-- ShopSphere SQL Course — Proyecto Final Integrador
-- Tablas disponibles: todas (customers, categories, products,
--   orders, order_items, returns, inventory,
--   marketing_campaigns, website_sessions, payments)
-- =============================================================
-- Contexto narrativo:
--   El equipo de Customer Success —liderado por Valentina—
--   necesita entender quiénes son los clientes que sostienen
--   el negocio antes de la presentación de Serie B.
--   Hay una preocupación concreta: el "churn silencioso",
--   clientes que siguen registrados pero compraron por última
--   vez hace más de 90 días. Los fondos van a preguntar
--   cuánto vale un cliente promedio y si se quedan.
--
-- Técnicas integradas de: Nivel 4 (subqueries, COALESCE),
--   Nivel 5 (CTEs múltiples, NTILE, window functions),
--   Nivel 6 (LAG, análisis temporal), Nivel 7 (cohortes,
--   segmentación RFM, LTV, atribución first-touch)
--
-- Dialecto: SQLite
--   STRFTIME('%Y-%m', col)  para agrupar por mes
--   JULIANDAY(a) - JULIANDAY(b) para diferencia en días
--   NULLIF(expr, 0) en todos los denominadores
--   La fecha de cierre del dataset es 2026-05-31
-- =============================================================


-- ---------------------------------------------------------------
-- EJ07 — Segmentación RFM de la base de clientes
-- Dificultad: ⭐⭐⭐
-- ---------------------------------------------------------------
-- Contexto:
--   Ana Castillo necesita saber qué proporción de la base de
--   clientes está activa y genera valor real. La segmentación
--   RFM (Recencia, Frecuencia, Monto) es el marco estándar:
--   clasifica a cada cliente en función de cuándo compró por
--   última vez, cuántas veces compró y cuánto gastó en total.
--   Con esto se puede identificar quién merece esfuerzo de
--   retención y quién ya se fue sin hacer ruido.
--
-- Enunciado:
--   Usando pedidos con status IN ('delivered', 'shipped')
--   y la fecha de cierre del dataset '2026-05-31', calcula
--   para cada cliente:
--     customer_id
--     recencia_dias   — días desde su último pedido hasta
--                       '2026-05-31' (JULIANDAY)
--     frecuencia      — número total de pedidos distintos
--     monto_total     — SUM(quantity * unit_price) de order_items
--                       (ROUND a 2 dec)
--     segmento_rfm    — clasificación con CASE WHEN:
--                       'champion'   si recencia_dias <= 30
--                                    Y frecuencia >= 3
--                       'leal'       si recencia_dias <= 90
--                                    Y frecuencia >= 2
--                       'en_riesgo'  si recencia_dias BETWEEN 91
--                                    AND 180
--                       'perdido'    si recencia_dias > 180
--                       'nuevo'      si frecuencia = 1
--                                    Y recencia_dias <= 60
--                       'otros'      para el resto
--   Solo incluye clientes que tienen al menos 1 pedido.
--   Ordena por monto_total DESC.
--
-- Criterio de éxito:
--   - Una CTE por métrica (recencia, frecuencia, monto)
--     antes de combinarlas en el SELECT final
--   - JULIANDAY('2026-05-31') - JULIANDAY(MAX(ordered_at))
--     para la recencia (no DATEDIFF)
--   - NULLIF no es necesario aquí porque no hay división,
--     pero el patrón de CTEs separadas sí es obligatorio
--   - Los segmentos se evalúan en orden: el primero que
--     aplica gana (CASE WHEN es short-circuit)

-- Tu query aquí:


-- Solución EJ07:
/*
WITH metricas_cliente AS (
    -- Una sola pasada por orders + order_items para las 3 métricas
    SELECT
        o.customer_id,
        JULIANDAY('2026-05-31') - JULIANDAY(MAX(o.ordered_at)) AS recencia_dias,
        COUNT(DISTINCT o.order_id)                              AS frecuencia,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)              AS monto_total
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status IN ('delivered', 'shipped')
    GROUP BY o.customer_id
)
SELECT
    customer_id,
    ROUND(recencia_dias, 0)                                     AS recencia_dias,
    frecuencia,
    monto_total,
    -- Los CASE se evalúan en orden: champion primero, luego leal, etc.
    CASE
        WHEN recencia_dias <= 30  AND frecuencia >= 3 THEN 'champion'
        WHEN recencia_dias <= 90  AND frecuencia >= 2 THEN 'leal'
        WHEN recencia_dias BETWEEN 91 AND 180         THEN 'en_riesgo'
        WHEN recencia_dias > 180                      THEN 'perdido'
        WHEN frecuencia = 1 AND recencia_dias <= 60   THEN 'nuevo'
        ELSE 'otros'
    END                                                         AS segmento_rfm
FROM metricas_cliente
ORDER BY monto_total DESC;
*/

-- Resultado esperado (aproximado):
-- N filas (todos los clientes con al menos 1 pedido).
-- Los 'champion' son pocos pero concentran el mayor monto_total.
-- Los 'perdido' serán el segmento más numeroso si el churn
-- silencioso es real — eso es exactamente lo que Valentina teme.

-- Interpretación esperada:
-- "El X% de los clientes están clasificados como 'perdido' o
--  'en_riesgo', lo que representa el Y% del revenue histórico.
--  Los 'champion' son solo Z clientes pero generan el W% del
--  monto total — concentración de valor que es un riesgo de
--  portafolio que los fondos van a señalar."


-- ---------------------------------------------------------------
-- EJ08 — Cohortes de adquisición: retención a 3, 6 y 12 meses
-- Dificultad: ⭐⭐⭐⭐
-- ---------------------------------------------------------------
-- Contexto:
--   Los inversores de la Serie B quieren ver la curva de
--   retención: de los clientes que adquirimos en un mes dado,
--   ¿cuántos volvieron a comprar 3, 6 y 12 meses después?
--   Una retención del 20% a 12 meses es sana en e-commerce;
--   por debajo del 10% hay un problema de producto o de
--   experiencia post-compra.
--
-- Enunciado:
--   Para cada cohorte mensual de adquisición (mes del primer
--   pedido del cliente), calcula:
--     cohorte          — STRFTIME('%Y-%m', fecha del primer pedido)
--     clientes_cohorte — clientes distintos en esa cohorte
--     ret_3m           — % de clientes que hicieron al menos
--                        1 pedido adicional en el mes 3
--                        (mes de cohorte + 3 meses)
--     ret_6m           — ídem para el mes 6
--     ret_12m          — ídem para el mes 12
--   Solo cohortes a partir de '2023-06' (inicio del dataset).
--   Excluye cohortes donde el período de retención aún no
--   ha ocurrido: ret_12m solo para cohortes antes de '2025-06',
--   ret_6m solo para cohortes antes de '2025-12'.
--   Usa ROUND(... * 100.0 / NULLIF(..., 0), 1) para los %.
--   Ordena cronológicamente por cohorte.
--
-- Criterio de éxito:
--   - CTE primer_pedido: customer_id + mes de primer pedido
--     usando MIN(ordered_at) filtrado por status válido
--   - CTE actividad: customer_id + mes de cada pedido posterior
--   - Los 3 LEFT JOINs de retención usan la condición
--     STRFTIME('%Y-%m', ordered_at) = STRFTIME('%Y-%m',
--       DATE(pp.primer_pedido, '+N months'))
--   - NULLIF en los tres denominadores (clientes_cohorte)

-- Tu query aquí:


-- Solución EJ08:
/*
WITH primer_pedido AS (
    -- Mes y fecha exacta del primer pedido de cada cliente
    SELECT
        customer_id,
        MIN(ordered_at)                                          AS primera_compra,
        STRFTIME('%Y-%m', MIN(ordered_at))                       AS cohorte
    FROM orders
    WHERE status IN ('delivered', 'shipped', 'processing', 'pending')
    GROUP BY customer_id
),
cohorte_base AS (
    -- Agrupamos por cohorte: cuántos clientes hay en cada mes
    SELECT
        cohorte,
        COUNT(DISTINCT customer_id)                              AS clientes_cohorte,
        MIN(primera_compra)                                      AS inicio_cohorte
    FROM primer_pedido
    GROUP BY cohorte
),
actividad_posterior AS (
    -- Todos los pedidos válidos para cruzar con las cohortes
    SELECT DISTINCT
        o.customer_id,
        STRFTIME('%Y-%m', o.ordered_at)                          AS mes_actividad
    FROM orders o
    WHERE o.status IN ('delivered', 'shipped', 'processing', 'pending')
)
SELECT
    cb.cohorte,
    cb.clientes_cohorte,
    -- Retención a 3 meses
    ROUND(
        COUNT(DISTINCT r3.customer_id) * 100.0
        / NULLIF(cb.clientes_cohorte, 0),
        1
    )                                                            AS ret_3m,
    -- Retención a 6 meses (solo cohortes anteriores a 2025-12)
    CASE
        WHEN cb.cohorte < '2025-12'
        THEN ROUND(
            COUNT(DISTINCT r6.customer_id) * 100.0
            / NULLIF(cb.clientes_cohorte, 0),
            1
        )
        ELSE NULL
    END                                                          AS ret_6m,
    -- Retención a 12 meses (solo cohortes anteriores a 2025-06)
    CASE
        WHEN cb.cohorte < '2025-06'
        THEN ROUND(
            COUNT(DISTINCT r12.customer_id) * 100.0
            / NULLIF(cb.clientes_cohorte, 0),
            1
        )
        ELSE NULL
    END                                                          AS ret_12m
FROM cohorte_base cb
-- Clientes de la cohorte que compraron exactamente en el mes cohorte+3
INNER JOIN primer_pedido pp ON pp.cohorte = cb.cohorte
LEFT JOIN actividad_posterior r3
    ON  r3.customer_id  = pp.customer_id
    AND r3.mes_actividad = STRFTIME('%Y-%m', DATE(pp.primera_compra, '+3 months'))
LEFT JOIN actividad_posterior r6
    ON  r6.customer_id  = pp.customer_id
    AND r6.mes_actividad = STRFTIME('%Y-%m', DATE(pp.primera_compra, '+6 months'))
LEFT JOIN actividad_posterior r12
    ON  r12.customer_id  = pp.customer_id
    AND r12.mes_actividad = STRFTIME('%Y-%m', DATE(pp.primera_compra, '+12 months'))
WHERE cb.cohorte >= '2023-06'
GROUP BY cb.cohorte, cb.clientes_cohorte
ORDER BY cb.cohorte;
*/

-- Resultado esperado (aproximado):
-- Una fila por mes de cohorte desde '2023-06' hasta '2026-04'.
-- ret_3m debería variar entre 15% y 35% en condiciones normales.
-- Las cohortes de julio 2025 mostrarán probablemente ret_3m
-- más bajo (efecto del spike de devoluciones de ese mes).
-- ret_12m NULL para las cohortes más recientes (aún no aplica).

-- Interpretación esperada:
-- "La retención promedio a 3 meses es del X%, y cae al Y% a
--  12 meses. La cohorte de [mes] muestra la peor retención
--  a 3 meses (Z%), coincidiendo con el spike de devoluciones
--  de julio 2025 — hay una correlación entre mala experiencia
--  post-compra y churn que merece atención antes de escalar."


-- ---------------------------------------------------------------
-- EJ09 — Clientes en riesgo de churn: ventana de 60-90 días
-- Dificultad: ⭐⭐
-- ---------------------------------------------------------------
-- Contexto:
--   Valentina define "en riesgo de churn" a los clientes cuyo
--   último pedido ocurrió entre 60 y 90 días antes del cierre
--   del dataset (2026-05-31): compraron entre el 2026-03-02
--   y el 2026-04-01. Son clientes todavía rescatables con
--   una acción de retención — los que llevan más de 90 días
--   sin comprar probablemente ya se fueron.
--
-- Enunciado:
--   Identifica los clientes cuyo último pedido (status IN
--   ('delivered', 'shipped')) cayó entre 60 y 90 días antes
--   del 2026-05-31. Para cada uno:
--     customer_id
--     email               — de la tabla customers
--     country             — de la tabla customers
--     ultimo_pedido       — fecha del último pedido
--     dias_sin_compra     — ROUND(JULIANDAY('2026-05-31')
--                           - JULIANDAY(ultimo_pedido), 0)
--     total_pedidos       — pedidos históricos totales (todos los status)
--     revenue_historico   — monto total de order_items (ROUND 2)
--   Ordena por revenue_historico DESC para priorizar a los
--   clientes de mayor valor en el seguimiento de retención.
--
-- Criterio de éxito:
--   - El rango de días es BETWEEN 60 AND 90 usando JULIANDAY
--   - Solo se considera el último pedido con status válido
--     para calcular dias_sin_compra; el total_pedidos y
--     revenue_historico usan todos los pedidos del cliente
--   - JOIN con customers para email y country

-- Tu query aquí:


-- Solución EJ09:
/*
WITH ultimo_pedido_valido AS (
    -- Fecha del último pedido con status válido por cliente
    SELECT
        customer_id,
        MAX(ordered_at)                                          AS ultimo_pedido
    FROM orders
    WHERE status IN ('delivered', 'shipped')
    GROUP BY customer_id
),
historial_cliente AS (
    -- Revenue histórico y total de pedidos (todos los status)
    SELECT
        o.customer_id,
        COUNT(DISTINCT o.order_id)                               AS total_pedidos,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)               AS revenue_historico
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    GROUP BY o.customer_id
)
SELECT
    c.customer_id,
    c.email,
    c.country,
    upv.ultimo_pedido,
    ROUND(
        JULIANDAY('2026-05-31') - JULIANDAY(upv.ultimo_pedido),
        0
    )                                                            AS dias_sin_compra,
    hc.total_pedidos,
    hc.revenue_historico
FROM ultimo_pedido_valido upv
INNER JOIN customers      c  ON c.customer_id  = upv.customer_id
INNER JOIN historial_cliente hc ON hc.customer_id = upv.customer_id
WHERE JULIANDAY('2026-05-31') - JULIANDAY(upv.ultimo_pedido)
      BETWEEN 60 AND 90
ORDER BY hc.revenue_historico DESC;
*/

-- Resultado esperado (aproximado):
-- Lista de clientes con días_sin_compra entre 60 y 90.
-- Los primeros de la lista son los más valiosos para recuperar.

-- Interpretación esperada:
-- "Hay N clientes en la ventana de riesgo de churn (60-90 días
--  sin comprar), que representan $X en revenue histórico.
--  Priorizando el top 20% por revenue, una campaña de retención
--  podría recuperar hasta $Y — la inversión se justifica si el
--  costo de la campaña es menor que el LTV de reactivación."


-- ---------------------------------------------------------------
-- EJ10 — Clientes de alto valor: distribución por país y canal
-- Dificultad: ⭐⭐⭐
-- ---------------------------------------------------------------
-- Contexto:
--   Los fondos quieren saber si la concentración de clientes
--   de alto valor es geográficamente diversa o está atada a
--   un solo mercado. Valentina también quiere saber qué canal
--   de adquisición produce los clientes más valiosos — eso
--   informa el presupuesto de marketing de la Serie B.
--   Se define "alto valor" como el top 20% de clientes por
--   revenue total (usando NTILE(5) y tomando el quintil 5).
--
-- Enunciado:
--   Paso 1: calcula el revenue total por cliente (pedidos
--   con status IN ('delivered', 'shipped')).
--   Paso 2: usa NTILE(5) OVER (ORDER BY revenue_total DESC)
--   para clasificar clientes en quintiles; el quintil 1
--   corresponde al top 20%.
--   Paso 3: para los clientes del quintil 1, cruza con:
--     - customers para obtener country
--     - website_sessions + marketing_campaigns para obtener
--       el canal de la primera sesión (first-touch)
--       usando ROW_NUMBER() OVER (PARTITION BY customer_id
--       ORDER BY started_at ASC) = 1
--       Si no hay sesión: COALESCE(..., 'sin_sesion')
--       Si hay sesión sin campaña: COALESCE(mc.channel, 'organic')
--   Resultado final: para cada combinación (country, canal):
--     country, canal, clientes_alto_valor, revenue_total
--     (ROUND 2), pct_clientes (% sobre el total de clientes
--     alto valor, ROUND 1)
--   Ordena por clientes_alto_valor DESC.
--
-- Criterio de éxito:
--   - NTILE(5) en lugar de percentil manual
--   - ROW_NUMBER para primera sesión (no MIN de started_at)
--   - COALESCE doble: primero para campaign_id NULL (organic),
--     luego para clientes sin ninguna sesión (sin_sesion)
--   - COUNT DISTINCT customer_id para evitar dobles
--   - NULLIF en el denominador del pct_clientes

-- Tu query aquí:


-- Solución EJ10:
/*
WITH revenue_por_cliente AS (
    -- Revenue de pedidos entregados o enviados por cliente
    SELECT
        o.customer_id,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)               AS revenue_total
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status IN ('delivered', 'shipped')
    GROUP BY o.customer_id
),
quintiles AS (
    -- Clasificamos en quintiles: quintil 1 = top 20% por revenue
    SELECT
        customer_id,
        revenue_total,
        NTILE(5) OVER (ORDER BY revenue_total DESC)              AS quintil
    FROM revenue_por_cliente
),
alto_valor AS (
    -- Solo los del top 20%
    SELECT customer_id, revenue_total
    FROM quintiles
    WHERE quintil = 1
),
primera_sesion AS (
    -- Primera sesión de cada cliente para atribución first-touch
    SELECT
        customer_id,
        campaign_id,
        ROW_NUMBER() OVER (
            PARTITION BY customer_id
            ORDER BY started_at ASC
        )                                                        AS rn
    FROM website_sessions
),
canal_adquisicion AS (
    -- Canal de la primera sesión; organic si no hay campaña
    SELECT
        ps.customer_id,
        COALESCE(mc.channel, 'organic')                          AS canal
    FROM primera_sesion ps
    LEFT JOIN marketing_campaigns mc ON mc.campaign_id = ps.campaign_id
    WHERE ps.rn = 1
)
SELECT
    c.country,
    COALESCE(ca.canal, 'sin_sesion')                             AS canal,
    COUNT(DISTINCT av.customer_id)                               AS clientes_alto_valor,
    ROUND(SUM(av.revenue_total), 2)                              AS revenue_total,
    ROUND(
        COUNT(DISTINCT av.customer_id) * 100.0
        / NULLIF(SUM(COUNT(DISTINCT av.customer_id)) OVER (), 0),
        1
    )                                                            AS pct_clientes
FROM alto_valor av
INNER JOIN customers       c  ON c.customer_id  = av.customer_id
LEFT  JOIN canal_adquisicion ca ON ca.customer_id = av.customer_id
GROUP BY c.country, COALESCE(ca.canal, 'sin_sesion')
ORDER BY clientes_alto_valor DESC;
*/

-- Resultado esperado (aproximado):
-- Varias filas con combinaciones país-canal.
-- Los mercados más grandes (México, Colombia) concentrarán
-- más clientes de alto valor en términos absolutos.
-- El canal con mejor calidad relativa (mayor revenue por
-- cliente) puede no ser el de mayor volumen.

-- Interpretación esperada:
-- "El top 20% de clientes por revenue proviene principalmente
--  de [país] y fue adquirido por [canal]. El canal [X] produce
--  el mayor revenue total atribuido a clientes de alto valor
--  con solo [N] clientes — el ROI por cliente adquirido es
--  sustancialmente mayor que [canal Y] con más volumen pero
--  menos valor individual."


-- ---------------------------------------------------------------
-- EJ11 — LTV real: revenue acumulado por mes de vida del cliente
-- Dificultad: ⭐⭐⭐⭐
-- ---------------------------------------------------------------
-- Contexto:
--   Ana Castillo preguntó: "¿Cuánto vale un cliente nuevo
--   en su primer año?" Para responderla con precisión, hay
--   que calcular el revenue acumulado por "mes de vida" del
--   cliente — no por mes calendario, sino por cuántos meses
--   han pasado desde su primera compra.
--   Mes de vida 0 = el mes del primer pedido.
--   Mes de vida 1 = el siguiente mes calendario. Etc.
--   El LTV promedio por mes de vida permite leer: "a los
--   6 meses de vida, un cliente ha generado en promedio $X".
--
-- Enunciado:
--   Paso 1: calcula el mes de vida de cada pedido:
--     mes_de_vida = diferencia en meses entre ordered_at
--     y la fecha del primer pedido del cliente.
--     Aproximación SQLite:
--       CAST((JULIANDAY(o.ordered_at) -
--             JULIANDAY(primer_pedido)) / 30.44 AS INT)
--   Paso 2: agrupa por mes_de_vida y calcula:
--     mes_de_vida         — el número de mes (0, 1, 2, ...)
--     clientes_activos    — clientes distintos con pedido ese mes
--     revenue_promedio    — AVG del revenue por cliente en ese mes
--                           (ROUND 2)
--     revenue_acumulado   — SUM(revenue_promedio) OVER
--                           (ORDER BY mes_de_vida) (running total,
--                           ROUND 2)
--   Solo pedidos con status IN ('delivered', 'shipped').
--   Limita a mes_de_vida <= 24 (dos años de vida).
--   Ordena por mes_de_vida ASC.
--
-- Criterio de éxito:
--   - CTE primer_pedido_fecha para obtener la fecha del
--     primer pedido de cada cliente
--   - CTE revenue_por_mes_vida para calcular el revenue
--     de cada cliente en cada mes de vida
--   - El running total usa SUM() OVER (ORDER BY mes_de_vida)
--   - NULLIF en el AVG solo si la tabla puede tener 0 clientes
--     (no es necesario aquí pero documentarlo)

-- Tu query aquí:


-- Solución EJ11:
/*
WITH primer_pedido_fecha AS (
    -- Fecha exacta del primer pedido de cada cliente
    SELECT
        customer_id,
        MIN(ordered_at)                                          AS primera_compra
    FROM orders
    WHERE status IN ('delivered', 'shipped')
    GROUP BY customer_id
),
pedidos_con_vida AS (
    -- Para cada pedido, calculamos en qué mes de vida del cliente cayó
    SELECT
        o.customer_id,
        o.order_id,
        CAST(
            (JULIANDAY(o.ordered_at) - JULIANDAY(pp.primera_compra))
            / 30.44
            AS INT
        )                                                        AS mes_de_vida,
        SUM(oi.quantity * oi.unit_price)                         AS revenue_pedido
    FROM orders o
    INNER JOIN order_items     oi ON oi.order_id    = o.order_id
    INNER JOIN primer_pedido_fecha pp ON pp.customer_id = o.customer_id
    WHERE o.status IN ('delivered', 'shipped')
    GROUP BY o.customer_id, o.order_id,
             CAST((JULIANDAY(o.ordered_at) - JULIANDAY(pp.primera_compra)) / 30.44 AS INT)
),
revenue_por_cliente_mes AS (
    -- Revenue total de cada cliente en cada mes de vida
    SELECT
        customer_id,
        mes_de_vida,
        SUM(revenue_pedido)                                      AS revenue_en_mes
    FROM pedidos_con_vida
    GROUP BY customer_id, mes_de_vida
),
ltv_por_mes AS (
    -- Promedio entre todos los clientes activos en ese mes de vida
    SELECT
        mes_de_vida,
        COUNT(DISTINCT customer_id)                              AS clientes_activos,
        ROUND(AVG(revenue_en_mes), 2)                            AS revenue_promedio
    FROM revenue_por_cliente_mes
    GROUP BY mes_de_vida
)
SELECT
    mes_de_vida,
    clientes_activos,
    revenue_promedio,
    -- Running total: LTV acumulado promedio por mes de vida
    ROUND(
        SUM(revenue_promedio) OVER (
            ORDER BY mes_de_vida ASC
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ),
        2
    )                                                            AS ltv_acumulado
FROM ltv_por_mes
WHERE mes_de_vida <= 24
ORDER BY mes_de_vida ASC;
*/

-- Resultado esperado (aproximado):
-- 25 filas (mes 0 a 24).
-- El mes 0 tiene el mayor revenue_promedio (primer pedido +
-- posible segundo pedido en el mismo mes).
-- El ltv_acumulado en el mes 12 es "el LTV a un año" que
-- Ana necesita para responder la pregunta de los fondos.

-- Interpretación esperada:
-- "El LTV promedio acumulado a 12 meses de vida es $X por
--  cliente. La mayor parte del LTV se genera en los primeros
--  3 meses (mes 0 a 2), luego la curva se aplana — esto indica
--  que las acciones de retención deben enfocarse en el
--  período de onboarding para maximizar el valor de vida."


-- ---------------------------------------------------------------
-- EJ12 — Net Revenue por cliente: bruto menos impacto de devoluciones
-- Dificultad: ⭐⭐⭐
-- ---------------------------------------------------------------
-- Contexto:
--   El revenue bruto de los ejercicios anteriores no descuenta
--   el impacto de las devoluciones. Ana quiere el revenue neto
--   real: revenue de ventas menos el valor estimado de los
--   productos devueltos (usando el precio promedio del producto
--   como proxy, ya que la tabla returns no tiene campo de monto).
--   Este ejercicio cierra el análisis de clientes con el número
--   de revenue más preciso disponible con el dataset.
--
-- Enunciado:
--   Para cada cliente con al menos 1 pedido, calcula:
--     customer_id
--     country             — de customers
--     revenue_bruto       — SUM(quantity * unit_price) de
--                           order_items (pedidos delivered/shipped)
--                           (ROUND 2)
--     devoluciones_aprobadas — COUNT de returns con
--                              status = 'approved' para pedidos
--                              de ese cliente (puede ser 0)
--     impacto_devoluciones — devoluciones_aprobadas multiplicado
--                            por el precio unitario promedio del
--                            cliente (revenue_bruto / unidades_totales)
--                            (ROUND 2)
--                            Patrón: usa COALESCE(devoluciones, 0)
--                            y NULLIF(unidades_totales, 0)
--     revenue_neto        — revenue_bruto - impacto_devoluciones
--                           (ROUND 2)
--   Solo incluye clientes con revenue_neto > 0.
--   Ordena por revenue_neto DESC. Limita a 20 filas.
--
-- Nota técnica obligatoria (agregar como comentario):
--   returns no tiene campo de monto; impacto_devoluciones es
--   una estimación basada en precio promedio por cliente.
--
-- Criterio de éxito:
--   - CTE ventas_cliente para revenue_bruto y unidades_totales
--   - CTE devoluciones_cliente para el conteo de returns
--     aprobados (LEFT JOIN posterior, no INNER)
--   - COALESCE(devoluciones, 0) para clientes sin devoluciones
--   - NULLIF(unidades_totales, 0) en el precio promedio

-- Tu query aquí:


-- Solución EJ12:
/*
WITH ventas_cliente AS (
    -- Revenue bruto y unidades vendidas por cliente
    SELECT
        o.customer_id,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)               AS revenue_bruto,
        SUM(oi.quantity)                                         AS unidades_totales
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status IN ('delivered', 'shipped')
    GROUP BY o.customer_id
),
devoluciones_cliente AS (
    -- NOTA: returns no tiene campo de monto.
    -- Contamos cada return aprobado para estimar el impacto.
    SELECT
        o.customer_id,
        COUNT(r.return_id)                                       AS devoluciones_aprobadas
    FROM returns r
    INNER JOIN orders o ON o.order_id = r.order_id
    WHERE r.status = 'approved'
    GROUP BY o.customer_id
)
SELECT
    c.customer_id,
    c.country,
    vc.revenue_bruto,
    COALESCE(dc.devoluciones_aprobadas, 0)                       AS devoluciones_aprobadas,
    -- Impacto: cada devolución aprobada se valúa al precio promedio del cliente
    -- NOTA TÉCNICA: estimación — returns no registra monto devuelto
    ROUND(
        COALESCE(dc.devoluciones_aprobadas, 0)
        * (vc.revenue_bruto / NULLIF(vc.unidades_totales, 0)),
        2
    )                                                            AS impacto_devoluciones,
    ROUND(
        vc.revenue_bruto
        - COALESCE(dc.devoluciones_aprobadas, 0)
          * (vc.revenue_bruto / NULLIF(vc.unidades_totales, 0)),
        2
    )                                                            AS revenue_neto
FROM ventas_cliente vc
INNER JOIN customers        c  ON c.customer_id  = vc.customer_id
LEFT  JOIN devoluciones_cliente dc ON dc.customer_id = vc.customer_id
WHERE vc.revenue_bruto
      - COALESCE(dc.devoluciones_aprobadas, 0)
        * (vc.revenue_bruto / NULLIF(vc.unidades_totales, 0))
      > 0
ORDER BY revenue_neto DESC
LIMIT 20;
*/

-- Resultado esperado (aproximado):
-- 20 filas con los clientes de mayor revenue neto.
-- Los clientes con muchas devoluciones aparecen con un
-- revenue_neto notablemente menor que su revenue_bruto.
-- Algunos clientes con alto bruto pueden caer en el ranking
-- neto si tienen alta tasa de devolución.

-- Interpretación esperada:
-- "El cliente de mayor revenue bruto tiene $X en bruto pero
--  $Y en neto por N devoluciones aprobadas — el ranking de
--  valor real cambia respecto al ranking por bruto.
--  NOTA: impacto_devoluciones es una estimación. Para datos
--  precisos, la tabla returns debería registrar el monto
--  devuelto explícitamente — mejora pendiente del schema."
