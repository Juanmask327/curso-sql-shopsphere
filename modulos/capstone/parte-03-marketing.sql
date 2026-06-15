-- =============================================================
-- CAPSTONE — PARTE 03: Marketing y atribución
-- ShopSphere SQL Course — Proyecto Final Integrador
-- Tablas disponibles: todas (customers, categories, products,
--   orders, order_items, returns, inventory,
--   marketing_campaigns, website_sessions, payments)
-- =============================================================
-- Contexto narrativo:
--   Sofía Ramírez, Head of Marketing, tiene presupuesto para
--   el próximo semestre y necesita saber cuáles canales y
--   campañas generaron el mejor ROI en H1 2026. Hay sospechas
--   internas de que las campañas de display consumen
--   presupuesto sin convertir. Los fondos también quieren
--   ver la eficiencia de adquisición antes de comprometer
--   capital para la expansión en Brasil y Ecuador.
--
-- Técnicas integradas de: Nivel 6 (LAG, análisis temporal),
--   Nivel 7 (atribución first-touch, ROW_NUMBER, funnel),
--   Nivel 8 (CTEs encadenadas 4+, NULLIF en ROI)
--
-- Dialecto: SQLite
--   STRFTIME('%Y-%m', col) para agrupar por mes
--   JULIANDAY para diferencia de días
--   NULLIF(expr, 0) en todos los denominadores
--   Fechas H1 2026: >= '2026-01-01' AND < '2026-07-01'
-- =============================================================


-- ---------------------------------------------------------------
-- EJ13 — ROI por canal: first-touch attribution en H1 2026
-- Dificultad: ⭐⭐⭐
-- ---------------------------------------------------------------
-- Contexto:
--   La pregunta de Sofía es directa: "¿Qué canales generan
--   más revenue por cada peso invertido?" Para responderla
--   hay que atribuir el revenue de cada pedido al canal de
--   la primera sesión del cliente (first-touch), cruzar ese
--   revenue con el gasto real de las campañas de ese canal,
--   y calcular el ROI. Un canal puede tener alto volumen de
--   clientes pero bajo revenue por cliente — esa diferencia
--   importa para asignar el presupuesto del próximo semestre.
--
-- Enunciado:
--   Para cada canal de marketing en H1 2026, calcula:
--     canal               — channel de marketing_campaigns
--                           (COALESCE con 'organic' para
--                           sesiones sin campaign_id)
--     clientes_adquiridos — clientes con primera sesión en
--                           H1 2026 atribuidos a ese canal
--     revenue_atribuido   — SUM del revenue de pedidos
--                           (delivered/shipped) de esos
--                           clientes (ROUND 2)
--     gasto_canal         — SUM(spent) de campañas del canal
--                           activas en H1 2026 (ROUND 2)
--     roi_pct             — (revenue_atribuido - gasto_canal)
--                           / NULLIF(gasto_canal, 0) * 100
--                           (ROUND 1)
--   Solo sesiones con started_at en H1 2026.
--   Para 'organic': gasto_canal = 0 (no hay gasto atribuible).
--   Ordena por roi_pct DESC.
--
-- Criterio de éxito:
--   - CTE primera_sesion_h1: primera sesión de cada cliente
--     con started_at en H1 2026 usando ROW_NUMBER
--   - CTE canal_origen: LEFT JOIN con marketing_campaigns
--     para el channel, COALESCE a 'organic'
--   - CTE revenue_cliente: revenue de pedidos delivered/shipped
--   - CTE gasto_por_canal: SUM(spent) de campañas activas en H1
--     (started_at < '2026-07-01' AND (ended_at >= '2026-01-01'
--     OR ended_at IS NULL))
--   - NULLIF en el denominador del ROI
--   - organic tiene gasto_canal = 0.00, roi_pct = NULL o muy alto

-- Tu query aquí:


-- Solución EJ13:
/*
WITH primera_sesion_h1 AS (
    -- Primera sesión de cada cliente en H1 2026
    SELECT
        customer_id,
        campaign_id,
        started_at,
        ROW_NUMBER() OVER (
            PARTITION BY customer_id
            ORDER BY started_at ASC
        )                                                        AS rn
    FROM website_sessions
    WHERE started_at >= '2026-01-01'
      AND started_at <  '2026-07-01'
),
canal_origen AS (
    -- Canal de adquisición de la primera sesión H1 2026
    SELECT
        ps.customer_id,
        COALESCE(mc.channel, 'organic')                          AS canal
    FROM primera_sesion_h1 ps
    LEFT JOIN marketing_campaigns mc ON mc.campaign_id = ps.campaign_id
    WHERE ps.rn = 1
),
revenue_cliente AS (
    -- Revenue total de pedidos válidos por cliente
    SELECT
        o.customer_id,
        SUM(oi.quantity * oi.unit_price)                         AS revenue
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status IN ('delivered', 'shipped')
    GROUP BY o.customer_id
),
gasto_por_canal AS (
    -- Gasto real de campañas activas durante H1 2026 por canal
    SELECT
        channel                                                  AS canal,
        ROUND(SUM(COALESCE(spent, 0)), 2)                        AS gasto_canal
    FROM marketing_campaigns
    WHERE started_at < '2026-07-01'
      AND (ended_at >= '2026-01-01' OR ended_at IS NULL)
    GROUP BY channel
)
SELECT
    co.canal,
    COUNT(DISTINCT co.customer_id)                               AS clientes_adquiridos,
    ROUND(COALESCE(SUM(rc.revenue), 0), 2)                       AS revenue_atribuido,
    ROUND(COALESCE(gc.gasto_canal, 0), 2)                        AS gasto_canal,
    -- ROI: si no hay gasto (organic), el denominador es 0 -> NULL via NULLIF
    ROUND(
        (COALESCE(SUM(rc.revenue), 0) - COALESCE(gc.gasto_canal, 0))
        * 100.0
        / NULLIF(COALESCE(gc.gasto_canal, 0), 0),
        1
    )                                                            AS roi_pct
FROM canal_origen co
LEFT JOIN revenue_cliente    rc ON rc.customer_id = co.customer_id
LEFT JOIN gasto_por_canal    gc ON gc.canal       = co.canal
GROUP BY co.canal, gc.gasto_canal
ORDER BY roi_pct DESC NULLS LAST;
*/

-- Resultado esperado (aproximado):
-- 5-6 filas (email, social_media, search, display, affiliate,
-- organic). 'organic' tiene gasto_canal = 0.00 y roi_pct NULL.
-- Se espera que 'display' tenga el roi_pct más bajo
-- (sospechas de Sofía), mientras 'email' o 'search' lideran.

-- Interpretación esperada:
-- "El canal [X] tiene el ROI más alto en H1 2026 con X1%,
--  generando $Y en revenue con solo $Z de gasto. El canal
--  'display' tiene el ROI más bajo (W%), confirmando la
--  sospecha de Sofía: está consumiendo presupuesto sin
--  retorno proporcional. La recomendación es reasignar
--  presupuesto de display hacia [canal de mayor ROI]."


-- ---------------------------------------------------------------
-- EJ14 — Tasa de conversión y CPA por canal en H1 2026
-- Dificultad: ⭐⭐⭐
-- ---------------------------------------------------------------
-- Contexto:
--   Sofía quiere dos métricas complementarias al ROI:
--   1. Tasa de conversión: de las sesiones de cada canal,
--      ¿qué proporción terminó en una venta?
--   2. CPA (Costo por Adquisición): ¿cuánto costó adquirir
--      cada cliente nuevo por canal?
--   Estas dos métricas juntas revelan si un canal es eficiente
--   en convertir visitantes y si el costo por cliente es
--   sostenible en un modelo de expansión.
--
-- Enunciado:
--   Para cada canal en H1 2026 (sesiones con started_at en
--   el período), calcula:
--     canal                  — channel de la campaña o 'organic'
--     total_sesiones         — COUNT de sesiones del canal
--     sesiones_convertidas   — COUNT de sesiones con
--                              converted = 1 (o TRUE)
--     tasa_conversion_pct    — sesiones_convertidas / total_sesiones
--                              * 100 (ROUND 1)
--     nuevos_clientes        — clientes cuya primera sesión ever
--                              fue de este canal (primera sesión
--                              en toda la historia, no solo H1)
--     gasto_canal            — SUM(spent) de campañas del canal
--                              activas en H1 (igual que EJ13)
--     cpa                    — gasto_canal / NULLIF(nuevos_clientes, 0)
--                              (ROUND 2)
--   Ordena por tasa_conversion_pct DESC.
--
-- Criterio de éxito:
--   - total_sesiones y sesiones_convertidas usan sesiones
--     de H1 2026 (filtro en started_at)
--   - nuevos_clientes usa la primera sesión HISTÓRICA (sin
--     filtro de fecha en la CTE de primera sesión)
--   - Esto puede producir nuevos_clientes mayor que
--     sesiones_convertidas — documentarlo como nota
--   - NULLIF en el denominador de tasa_conversion y CPA

-- Tu query aquí:


-- Solución EJ14:
/*
WITH sesiones_h1 AS (
    -- Sesiones de H1 2026 con canal asignado
    SELECT
        ws.session_id,
        ws.customer_id,
        ws.converted,
        COALESCE(mc.channel, 'organic')                          AS canal
    FROM website_sessions ws
    LEFT JOIN marketing_campaigns mc ON mc.campaign_id = ws.campaign_id
    WHERE ws.started_at >= '2026-01-01'
      AND ws.started_at <  '2026-07-01'
),
primera_sesion_historica AS (
    -- Primera sesión de cada cliente en toda la historia
    SELECT
        customer_id,
        campaign_id,
        ROW_NUMBER() OVER (
            PARTITION BY customer_id
            ORDER BY started_at ASC
        )                                                        AS rn
    FROM website_sessions
),
nuevos_por_canal AS (
    -- Clientes cuya primera sesión ever pertenece a cada canal
    SELECT
        COALESCE(mc.channel, 'organic')                          AS canal,
        COUNT(DISTINCT ps.customer_id)                           AS nuevos_clientes
    FROM primera_sesion_historica ps
    LEFT JOIN marketing_campaigns mc ON mc.campaign_id = ps.campaign_id
    WHERE ps.rn = 1
    GROUP BY COALESCE(mc.channel, 'organic')
),
gasto_por_canal AS (
    SELECT
        channel                                                  AS canal,
        ROUND(SUM(COALESCE(spent, 0)), 2)                        AS gasto_canal
    FROM marketing_campaigns
    WHERE started_at < '2026-07-01'
      AND (ended_at >= '2026-01-01' OR ended_at IS NULL)
    GROUP BY channel
)
SELECT
    sh.canal,
    COUNT(sh.session_id)                                         AS total_sesiones,
    SUM(CASE WHEN sh.converted = 1 THEN 1 ELSE 0 END)           AS sesiones_convertidas,
    ROUND(
        SUM(CASE WHEN sh.converted = 1 THEN 1 ELSE 0 END) * 100.0
        / NULLIF(COUNT(sh.session_id), 0),
        1
    )                                                            AS tasa_conversion_pct,
    COALESCE(nc.nuevos_clientes, 0)                              AS nuevos_clientes,
    ROUND(COALESCE(gc.gasto_canal, 0), 2)                        AS gasto_canal,
    -- CPA: costo por adquisición histórica (no solo H1)
    -- NOTA: nuevos_clientes es histórico; gasto solo H1 — comparar con cautela
    ROUND(
        COALESCE(gc.gasto_canal, 0)
        / NULLIF(COALESCE(nc.nuevos_clientes, 0), 0),
        2
    )                                                            AS cpa
FROM sesiones_h1 sh
LEFT JOIN nuevos_por_canal nc ON nc.canal = sh.canal
LEFT JOIN gasto_por_canal  gc ON gc.canal = sh.canal
GROUP BY sh.canal, nc.nuevos_clientes, gc.gasto_canal
ORDER BY tasa_conversion_pct DESC;
*/

-- Resultado esperado (aproximado):
-- 5-6 filas. Los canales de intención alta (search, email)
-- deberían tener mayor tasa de conversión. Display tendrá
-- la tasa más baja. El CPA más alto no es necesariamente el
-- peor si ese canal adquiere clientes de alto valor (cruzar
-- con EJ10 y EJ13 para una lectura completa).

-- Interpretación esperada:
-- "El canal 'search' convierte el X% de las sesiones,
--  el más alto entre los canales de pago. 'Display' convierte
--  solo el Y%, al mayor costo por adquisición de $Z.
--  Cuando se combina con el ROI del EJ13, la imagen de display
--  es consistente: alto costo, baja conversión, ROI negativo.
--  NOTA: el CPA mezcla gasto H1 con nuevos clientes históricos
--  — para una comparación limpia se necesitaría el gasto
--  histórico total por canal."


-- ---------------------------------------------------------------
-- EJ15 — Campañas: ranking por ROI dentro de cada canal
-- Dificultad: ⭐⭐⭐⭐
-- ---------------------------------------------------------------
-- Contexto:
--   El análisis por canal de EJ13 da el panorama general.
--   Sofía necesita el nivel de granularidad siguiente:
--   ¿cuáles campañas específicas dentro de cada canal son
--   las que más aportan? Puede que 'email' tenga el mejor ROI
--   de canal pero dentro de email haya una campaña que
--   consume 60% del presupuesto con rendimiento mediocre.
--   RANK() OVER (PARTITION BY channel) permite comparar
--   campañas dentro de su canal sin mezclarlas entre sí.
--
-- Enunciado:
--   Para cada campaña en H1 2026 (campañas activas en el
--   período, con al menos 1 sesión de website), calcula:
--     canal               — channel de la campaña
--     campana             — name de la campaña
--     sesiones            — total de sesiones vinculadas
--                           a esa campaña en H1 2026
--     conversiones        — sesiones con converted = 1
--     revenue_atribuido   — revenue de pedidos de clientes
--                           cuya primera sesión fue esta
--                           campaña (first-touch, histórico)
--                           (ROUND 2)
--     gasto               — spent de la campaña (ROUND 2)
--     roi_campana_pct     — (revenue - gasto) / NULLIF(gasto, 0)
--                           * 100 (ROUND 1)
--     rank_en_canal       — RANK() OVER (PARTITION BY channel
--                           ORDER BY roi_campana_pct DESC)
--   Ordena por canal ASC, rank_en_canal ASC.
--
-- Criterio de éxito:
--   - La atribución de revenue es first-touch histórica:
--     no se limita al revenue de H1, sino al revenue total
--     de clientes cuya primera sesión fue esa campaña
--   - RANK() no ROW_NUMBER() (permite empates)
--   - NULLIF en el denominador del ROI de campaña
--   - Solo campañas con al menos 1 sesión en H1

-- Tu query aquí:


-- Solución EJ15:
/*
WITH sesiones_h1_campana AS (
    -- Sesiones de H1 2026 por campaña (solo las que tienen campaign_id)
    SELECT
        campaign_id,
        COUNT(*)                                                 AS sesiones,
        SUM(CASE WHEN converted = 1 THEN 1 ELSE 0 END)          AS conversiones
    FROM website_sessions
    WHERE started_at >= '2026-01-01'
      AND started_at <  '2026-07-01'
      AND campaign_id IS NOT NULL
    GROUP BY campaign_id
),
primera_sesion_historica AS (
    -- Primera sesión histórica de cada cliente
    SELECT
        customer_id,
        campaign_id,
        ROW_NUMBER() OVER (
            PARTITION BY customer_id
            ORDER BY started_at ASC
        )                                                        AS rn
    FROM website_sessions
    WHERE campaign_id IS NOT NULL
),
revenue_por_campana AS (
    -- Revenue histórico de clientes cuya primera sesión fue esa campaña
    SELECT
        ps.campaign_id,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)               AS revenue_atribuido
    FROM primera_sesion_historica ps
    INNER JOIN orders o       ON o.customer_id  = ps.customer_id
                              AND o.status IN ('delivered', 'shipped')
    INNER JOIN order_items oi ON oi.order_id    = o.order_id
    WHERE ps.rn = 1
    GROUP BY ps.campaign_id
)
SELECT
    mc.channel                                                   AS canal,
    mc.name                                                      AS campana,
    sh.sesiones,
    sh.conversiones,
    ROUND(COALESCE(rc.revenue_atribuido, 0), 2)                  AS revenue_atribuido,
    ROUND(COALESCE(mc.spent, 0), 2)                              AS gasto,
    ROUND(
        (COALESCE(rc.revenue_atribuido, 0) - COALESCE(mc.spent, 0))
        * 100.0
        / NULLIF(COALESCE(mc.spent, 0), 0),
        1
    )                                                            AS roi_campana_pct,
    RANK() OVER (
        PARTITION BY mc.channel
        ORDER BY
            (COALESCE(rc.revenue_atribuido, 0) - COALESCE(mc.spent, 0))
            / NULLIF(COALESCE(mc.spent, 0), 0) DESC
    )                                                            AS rank_en_canal
FROM marketing_campaigns mc
INNER JOIN sesiones_h1_campana sh ON sh.campaign_id = mc.campaign_id
LEFT  JOIN revenue_por_campana rc ON rc.campaign_id = mc.campaign_id
ORDER BY canal ASC, rank_en_canal ASC;
*/

-- Resultado esperado (aproximado):
-- Varias filas agrupadas por canal, ordenadas por rank.
-- Dentro de cada canal, la campaña con rank=1 es la de mayor ROI.
-- Puede haber campañas con roi_campana_pct negativo (gasto > revenue).

-- Interpretación esperada:
-- "Dentro del canal 'display', la campaña de mayor ROI tiene
--  X%, pero incluso la mejor campaña del canal está por debajo
--  del ROI promedio de 'email' (Y%). Esto refuerza la decisión
--  de reducir inversión en display. La campaña '[nombre]' de
--  email tiene el ROI más alto de todo el portafolio (Z%) —
--  candidata a recibir más presupuesto en H2 2026."


-- ---------------------------------------------------------------
-- EJ16 — Funnel de conversión por canal: sesiones → revenue
-- Dificultad: ⭐⭐⭐⭐
-- ---------------------------------------------------------------
-- Contexto:
--   Valentina quiere ver el funnel completo de conversión
--   por canal en H1 2026: cuántas sesiones generó cada canal,
--   cuántas convirtieron, cuántos pedidos se crearon y cuánto
--   revenue generaron. Las tasas de paso entre etapas revelan
--   dónde se pierde cada canal — y la comparación entre
--   canales muestra cuál tiene la mayor eficiencia global.
--
-- Enunciado:
--   Para H1 2026, construye el funnel de 4 etapas por canal:
--     canal                 — channel o 'organic'
--     sesiones              — total sesiones del canal en H1
--     sesiones_convertidas  — sesiones con converted = 1
--     pedidos_generados     — pedidos de clientes cuya primera
--                             sesión H1 fue ese canal y cuyo
--                             ordered_at también cayó en H1 2026
--                             (COUNT DISTINCT order_id)
--     revenue_h1            — SUM revenue de esos pedidos
--                             con status IN ('delivered', 'shipped')
--                             (ROUND 2)
--     tasa_conversion_pct   — sesiones_convertidas / sesiones * 100
--                             (ROUND 1)
--     tasa_sesion_pedido    — pedidos_generados / sesiones * 100
--                             (ROUND 1)
--     revenue_por_sesion    — revenue_h1 / NULLIF(sesiones, 0)
--                             (ROUND 2) — eficiencia total del canal
--   Ordena por revenue_h1 DESC.
--
-- Criterio de éxito:
--   - La primera sesión H1 es la misma CTE que EJ13/EJ14
--   - pedidos_generados requiere JOIN de canal_origen con orders
--     filtrando ordered_at en H1 2026
--   - NULLIF en los tres denominadores de tasas
--   - La cadena lógica es sesiones → converted → pedidos →
--     revenue, cada paso es un subconjunto del anterior

-- Tu query aquí:


-- Solución EJ16:
/*
WITH sesiones_h1_con_canal AS (
    -- Todas las sesiones de H1 2026 con canal asignado
    SELECT
        ws.session_id,
        ws.customer_id,
        ws.converted,
        COALESCE(mc.channel, 'organic')                          AS canal
    FROM website_sessions ws
    LEFT JOIN marketing_campaigns mc ON mc.campaign_id = ws.campaign_id
    WHERE ws.started_at >= '2026-01-01'
      AND ws.started_at <  '2026-07-01'
),
primera_sesion_h1 AS (
    -- Primera sesión de H1 de cada cliente para atribución
    SELECT
        customer_id,
        canal,
        ROW_NUMBER() OVER (
            PARTITION BY customer_id
            ORDER BY session_id ASC        -- session_id como proxy de orden temporal
        )                                                        AS rn
    FROM sesiones_h1_con_canal
),
canal_primera_sesion AS (
    -- Solo la primera sesión por cliente en H1
    SELECT customer_id, canal
    FROM primera_sesion_h1
    WHERE rn = 1
),
pedidos_revenue_h1 AS (
    -- Pedidos y revenue de H1 2026 para esos clientes
    SELECT
        cp.canal,
        COUNT(DISTINCT o.order_id)                               AS pedidos_generados,
        ROUND(
            SUM(CASE WHEN o.status IN ('delivered', 'shipped')
                     THEN oi.quantity * oi.unit_price
                     ELSE 0 END),
            2
        )                                                        AS revenue_h1
    FROM canal_primera_sesion cp
    INNER JOIN orders     o  ON o.customer_id = cp.customer_id
                             AND o.ordered_at >= '2026-01-01'
                             AND o.ordered_at <  '2026-07-01'
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    GROUP BY cp.canal
),
metricas_sesion AS (
    -- Métricas de sesión por canal en H1
    SELECT
        canal,
        COUNT(session_id)                                        AS sesiones,
        SUM(CASE WHEN converted = 1 THEN 1 ELSE 0 END)          AS sesiones_convertidas
    FROM sesiones_h1_con_canal
    GROUP BY canal
)
SELECT
    ms.canal,
    ms.sesiones,
    ms.sesiones_convertidas,
    COALESCE(pr.pedidos_generados, 0)                            AS pedidos_generados,
    COALESCE(pr.revenue_h1, 0.00)                                AS revenue_h1,
    ROUND(
        ms.sesiones_convertidas * 100.0
        / NULLIF(ms.sesiones, 0),
        1
    )                                                            AS tasa_conversion_pct,
    ROUND(
        COALESCE(pr.pedidos_generados, 0) * 100.0
        / NULLIF(ms.sesiones, 0),
        1
    )                                                            AS tasa_sesion_pedido,
    ROUND(
        COALESCE(pr.revenue_h1, 0)
        / NULLIF(ms.sesiones, 0),
        2
    )                                                            AS revenue_por_sesion
FROM metricas_sesion ms
LEFT JOIN pedidos_revenue_h1 pr ON pr.canal = ms.canal
ORDER BY revenue_h1 DESC;
*/

-- Resultado esperado (aproximado):
-- 5-6 filas. El canal 'organic' tendrá muchas sesiones pero
-- la tasa de conversión puede ser menor que 'email' (tráfico
-- de menor intención comercial). 'Display' tendrá la menor
-- tasa_sesion_pedido y el menor revenue_por_sesion.

-- Interpretación esperada:
-- "El funnel revela que 'email' tiene la mayor tasa de
--  sesión-pedido (X%) y el mayor revenue_por_sesion ($Y),
--  confirmando que es el canal más eficiente end-to-end.
--  'Display' genera muchas sesiones pero solo convierte el Z%
--  en pedidos, y su revenue_por_sesion de $W es el más bajo.
--  El análisis recomienda priorizar email para el presupuesto
--  de H2 2026 y reducir display a un nivel de mantenimiento."


-- ---------------------------------------------------------------
-- EJ17 — Anomalía Chile: pagos fallidos en marzo-abril 2026
-- Dificultad: ⭐⭐⭐⭐⭐
-- ---------------------------------------------------------------
-- Contexto:
--   Ana Castillo tiene una hipótesis: el aumento del 40% en
--   pagos fallidos en Chile entre marzo y abril 2026 está
--   concentrado en un método de pago específico. Los fondos
--   chilenos participantes de la Serie B van a preguntar
--   sobre esto — hay que documentar el patrón antes de
--   que lo encuentren ellos. Este ejercicio cuantifica el
--   impacto y muestra si la hipótesis de Ana se confirma
--   con los datos: concentración en un método de pago
--   y en transacciones de mayor monto.
--
-- Enunciado:
--   Analiza los pagos fallidos en Chile durante marzo-abril
--   2026. Construye una query que muestre:
--     Parte A — Tasa de fallo por método de pago en Chile
--     en el período (vs. el resto de países):
--       metodo              — method de payments
--       fallos_chile        — pagos fallidos en Chile
--       intentos_chile      — total intentos en Chile
--       tasa_fallo_chile_pct — (ROUND 1)
--       fallos_otros        — pagos fallidos fuera de Chile
--       intentos_otros      — total intentos fuera de Chile
--       tasa_fallo_otros_pct — (ROUND 1)
--       diferencia_pct      — tasa_chile - tasa_otros (ROUND 1)
--   Ordena por diferencia_pct DESC (el método más afectado
--   primero).
--
--   Parte B — Impacto financiero de la anomalía:
--   Una segunda query (separada) que calcule:
--       total_fallos_chile_mar_abr  — COUNT de pagos failed
--       monto_en_riesgo             — SUM(amount) de esos fallos
--                                     (ROUND 2)
--       revenue_chile_h1            — revenue neto (completed -
--                                     refunded) de Chile en H1
--                                     2026 (ROUND 2)
--       pct_impacto                 — monto_en_riesgo / revenue_chile_h1
--                                     * 100 (ROUND 1)
--
-- Criterio de éxito:
--   - Chile se identifica vía JOIN payments → orders → customers
--     (NO existe payments.country — prohibido usarla)
--   - El período es: paid_at >= '2026-03-01' AND < '2026-05-01'
--   - NULLIF en los dos denominadores de tasas y en pct_impacto
--   - Dos queries separadas y correctamente comentadas

-- Tu query aquí:


-- Solución EJ17 — Parte A: tasa de fallo por método en Chile vs. resto:
/*
WITH pagos_periodo AS (
    -- Pagos de marzo-abril 2026 con indicador de Chile
    SELECT
        p.method,
        p.status,
        p.amount,
        CASE WHEN c.country = 'Chile' THEN 1 ELSE 0 END         AS es_chile
    FROM payments p
    INNER JOIN orders    o ON o.order_id    = p.order_id
    INNER JOIN customers c ON c.customer_id = o.customer_id
    -- NOTA: el país se obtiene desde customers, no desde payments
    WHERE p.paid_at >= '2026-03-01'
      AND p.paid_at <  '2026-05-01'
)
SELECT
    method                                                       AS metodo,
    SUM(CASE WHEN es_chile = 1 AND status = 'failed'
             THEN 1 ELSE 0 END)                                  AS fallos_chile,
    SUM(CASE WHEN es_chile = 1 THEN 1 ELSE 0 END)                AS intentos_chile,
    ROUND(
        SUM(CASE WHEN es_chile = 1 AND status = 'failed'
                 THEN 1.0 ELSE 0 END)
        / NULLIF(SUM(CASE WHEN es_chile = 1 THEN 1 ELSE 0 END), 0)
        * 100,
        1
    )                                                            AS tasa_fallo_chile_pct,
    SUM(CASE WHEN es_chile = 0 AND status = 'failed'
             THEN 1 ELSE 0 END)                                  AS fallos_otros,
    SUM(CASE WHEN es_chile = 0 THEN 1 ELSE 0 END)                AS intentos_otros,
    ROUND(
        SUM(CASE WHEN es_chile = 0 AND status = 'failed'
                 THEN 1.0 ELSE 0 END)
        / NULLIF(SUM(CASE WHEN es_chile = 0 THEN 1 ELSE 0 END), 0)
        * 100,
        1
    )                                                            AS tasa_fallo_otros_pct,
    ROUND(
        SUM(CASE WHEN es_chile = 1 AND status = 'failed'
                 THEN 1.0 ELSE 0 END)
        / NULLIF(SUM(CASE WHEN es_chile = 1 THEN 1 ELSE 0 END), 0) * 100
        -
        SUM(CASE WHEN es_chile = 0 AND status = 'failed'
                 THEN 1.0 ELSE 0 END)
        / NULLIF(SUM(CASE WHEN es_chile = 0 THEN 1 ELSE 0 END), 0) * 100,
        1
    )                                                            AS diferencia_pct
FROM pagos_periodo
GROUP BY method
ORDER BY diferencia_pct DESC;
*/

-- Solución EJ17 — Parte B: impacto financiero de la anomalía:
/*
WITH fallos_chile AS (
    -- Pagos fallidos de Chile en mar-abr 2026
    SELECT
        p.payment_id,
        p.amount
    FROM payments p
    INNER JOIN orders    o ON o.order_id    = p.order_id
    INNER JOIN customers c ON c.customer_id = o.customer_id
    WHERE c.country   = 'Chile'
      AND p.status    = 'failed'
      AND p.paid_at  >= '2026-03-01'
      AND p.paid_at  <  '2026-05-01'
),
revenue_chile_h1 AS (
    -- Revenue neto de Chile en todo H1 2026
    SELECT
        SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END)
        - SUM(CASE WHEN p.status = 'refunded'  THEN p.amount ELSE 0 END) AS revenue_neto
    FROM payments p
    INNER JOIN orders    o ON o.order_id    = p.order_id
    INNER JOIN customers c ON c.customer_id = o.customer_id
    WHERE c.country  = 'Chile'
      AND p.paid_at >= '2026-01-01'
      AND p.paid_at <  '2026-07-01'
)
SELECT
    COUNT(fc.payment_id)                                         AS total_fallos_chile_mar_abr,
    ROUND(SUM(fc.amount), 2)                                     AS monto_en_riesgo,
    ROUND(rh.revenue_neto, 2)                                    AS revenue_chile_h1,
    ROUND(
        SUM(fc.amount) * 100.0
        / NULLIF(rh.revenue_neto, 0),
        1
    )                                                            AS pct_impacto
FROM fallos_chile fc
CROSS JOIN revenue_chile_h1 rh;
*/

-- Resultado esperado (aproximado):
-- Parte A: el método 'credit_card' (o equivalente) debería
-- mostrar la mayor diferencia_pct entre Chile y el resto.
-- Parte B: el monto_en_riesgo debería representar un % de
-- dos dígitos del revenue_chile_h1 — suficientemente material
-- para mencionarlo en la presentación a los fondos chilenos.

-- Interpretación esperada:
-- "La anomalía de pagos en Chile está concentrada en el método
--  [X]: tasa de fallo del Y% en Chile vs. Z% en el resto de
--  países — una diferencia de W puntos porcentuales que no
--  puede atribuirse a variación normal. El monto en riesgo
--  de $N representa el M% del revenue neto de Chile en H1 2026.
--  La hipótesis de Ana (cambio en condiciones de banco emisor
--  local) es consistente con este patrón. Recomendación:
--  habilitar un método de pago alternativo en Chile durante
--  el período de investigación técnica."
