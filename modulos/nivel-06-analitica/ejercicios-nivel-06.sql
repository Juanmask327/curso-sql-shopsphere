-- =============================================================
-- EJERCICIOS NIVEL 6 — Analítica de Negocio
-- ShopSphere SQL Course
-- Tablas disponibles: customers, categories, products,
--                     orders, order_items, returns,
--                     inventory, marketing_campaigns
-- =============================================================
-- Contexto narrativo:
--   El equipo directivo de ShopSphere necesita respuestas
--   que no puede obtener mirando las tablas individuales.
--   Después de la crisis de julio 2025 y la campaña fallida
--   de Regreso a Clases en marzo, Valentina, Sofía, Marco,
--   Ana y Diego quieren entender los patrones — y actuar
--   antes de que los problemas se repitan.
--   Estos ejercicios son esos análisis.
-- =============================================================


-- ---------------------------------------------------------------
-- BLOQUE A (1-6): LAG y LEAD
-- MoM, variación %, primer/último pedido del cliente
-- ---------------------------------------------------------------

-- Ejercicio 01
-- CONTEXTO (Briefing 6.5 — Valentina Torres):
--   Valentina necesita el revenue total mensual de 2025 con
--   la variación porcentual respecto al mes anterior.
--   Marco tiene una call con fondos y quiere ver la tendencia.
-- Enunciado: Retorna mes, revenue_actual, revenue_mes_anterior
--   y variacion_pct (redondeado a 2 decimales). Solo 2025.
--   Excluye pedidos cancelados. El primer mes (enero) debe
--   mostrar NULL en revenue_mes_anterior — no uses COALESCE.
-- Criterio: CTE para la agregación mensual. LAG con ORDER BY
--   mes. NULLIF en el denominador del porcentaje. Resultado
--   ordenado por mes ascendente. 12 filas.

-- Tu query aquí:


-- Ejercicio 02
-- CONTEXTO (Briefing 6.11 — Diego Morales):
--   Diego necesita la tasa de devolución mensual (devoluciones
--   aprobadas o reembolsadas / total pedidos no cancelados)
--   desde enero 2025 hasta mayo 2026. Quiere la tasa del mes
--   anterior para ver la tendencia.
-- Enunciado: Retorna mes, total_pedidos, total_devoluciones,
--   tasa_devolucion_pct (redondeado a 2 decimales) y
--   tasa_mes_anterior. Usa solo devoluciones con status IN
--   ('approved', 'refunded'). El primer mes muestra NULL en
--   tasa_mes_anterior.
-- Criterio: Dos CTEs: una para pedidos por mes, otra para
--   devoluciones por mes. LEFT JOIN entre ellas por mes.
--   LAG sobre la tasa calculada. NULLIF en denominador.

-- Tu query aquí:


-- Ejercicio 03
-- CONTEXTO (Briefing 6.2 — Sofía Ramírez):
--   Sofía quiere ver la tendencia MoM de revenue por canal
--   de marketing durante 2025. Necesita saber si paid_search
--   viene creciendo y affiliate viene cayendo.
-- Enunciado: Para cada canal (channel) de marketing_campaigns,
--   retorna mes, revenue del mes y revenue del mes anterior
--   (LAG). Solo 2025. Excluye pedidos cancelados. Ordena por
--   channel y mes.
-- Criterio: JOIN de marketing_campaigns con orders por período
--   activo (BETWEEN started_at y COALESCE(ended_at, CURRENT_DATE)).
--   PARTITION BY channel en el LAG. GROUP BY channel y mes.
--   COALESCE para ended_at NULL.

-- Tu query aquí:


-- Ejercicio 04
-- CONTEXTO (Briefing 6.8 — Ana Castillo):
--   Ana necesita el revenue neto mensual (descontando
--   devoluciones reembolsadas) de Q1 2026 vs Q1 2025, con
--   variación absoluta y porcentual. Revenue neto =
--   revenue_bruto - revenue_reembolsado.
-- Enunciado: Retorna mes, revenue_neto_2026, revenue_neto_2025,
--   variacion_absoluta y variacion_pct. Una fila por mes
--   (enero, febrero, marzo). Los meses son los 3 meses del Q1
--   — muestra el número de mes (1, 2, 3) y el nombre del mes.
-- Criterio: CTE para revenue neto por mes-año. Pivoteo con
--   MAX(CASE WHEN año = N). NULLIF en el denominador. Los
--   reembolsos usan returns.status = 'refunded' y returned_at
--   para el filtro de fecha.

-- Tu query aquí:


-- Ejercicio 05
-- CONTEXTO: El equipo de operaciones quiere un reporte de
--   primer y último pedido por cliente (los que llevan más
--   de un año activos). Necesitan saber cuándo fue la primera
--   compra, cuándo la más reciente y el gap total en días.
-- Enunciado: Para cada cliente que tenga al menos 2 pedidos
--   no cancelados, retorna customer_id, nombre_completo,
--   first_order_date (primera compra), last_order_date
--   (última compra) y dias_activo (diferencia en días).
--   Solo clientes con dias_activo >= 365. Ordena por
--   dias_activo descendente.
-- Criterio: FIRST_VALUE y LAST_VALUE (con marco UNBOUNDED)
--   o MIN/MAX. Filtro de pedidos cancelados. HAVING o WHERE
--   sobre dias_activo. La diferencia de fechas en días.

-- Tu query aquí:


-- Ejercicio 06 — Integrador de Bloque A
-- CONTEXTO (Briefing 6.11 — Diego Morales):
--   Diego quiere confirmar que el spike de devoluciones de
--   julio 2025 fue puntual y no estructural. Necesita la
--   tasa de devolución mensual desde enero 2025 hasta mayo
--   2026 con dos columnas: tasa_mes_anterior (LAG) y
--   tasa_mes_siguiente (LEAD) para ver el contexto completo
--   de cada mes.
-- Enunciado: Retorna mes, tasa_devolucion_pct (redondeado
--   a 2 decimales), tasa_mes_anterior y tasa_mes_siguiente.
--   Usa devoluciones con status IN ('approved', 'refunded').
--   Excluye pedidos cancelados para el denominador.
-- Criterio: CTE para la tasa mensual. LAG y LEAD en el
--   SELECT externo. El mes de julio 2025 debe mostrar una
--   tasa significativamente mayor al mes anterior y al
--   siguiente (confirma que fue un spike puntual).

-- Tu query aquí:


-- ---------------------------------------------------------------
-- BLOQUE B (7-12): Cohortes y LTV
-- Retención mensual, valor acumulado, segmentación por valor
-- ---------------------------------------------------------------

-- Ejercicio 07
-- CONTEXTO (Briefing 6.6 — Valentina Torres):
--   Valentina quiere el análisis de cohortes de 2025:
--   por cada mes de primera compra, total de clientes nuevos,
--   cuántos volvieron en el mes siguiente y la tasa de
--   retención. Ordena de mayor a menor tasa de retención.
-- Enunciado: Retorna cohorte (mes de primera compra),
--   clientes_nuevos, retuvieron_mes_2 y tasa_retencion_pct
--   (redondeado a 1 decimal). Solo cohortes de 2025.
--   Excluye pedidos cancelados.
-- Criterio: CTE primer_pedido con MIN(ordered_at) GROUP BY
--   customer_id. CTE de retenciones con LEFT JOIN y MAX(CASE
--   WHEN). NULLIF en denominador. ORDER BY tasa DESC.

-- Tu query aquí:


-- Ejercicio 08
-- CONTEXTO (Briefing 6.4 — Sofía Ramírez):
--   Sofía lanzó hogar premium en septiembre 2025 y quiere
--   saber qué porcentaje de esos clientes volvió a comprar
--   en los 3 meses siguientes (octubre, noviembre, diciembre).
-- Enunciado: Toma los clientes cuya primera compra fue en
--   septiembre 2025. Para cada uno de los 3 meses siguientes
--   (oct, nov, dic 2025), retorna: mes_seguimiento, total
--   clientes de la cohorte septiembre, cuántos compraron
--   ese mes y la tasa de retención. Una fila por mes
--   de seguimiento.
-- Criterio: CTE para la cohorte de septiembre (primer pedido
--   en 2025-09). Tres meses de seguimiento con LEFT JOIN.
--   Tasa con NULLIF. Excluye cancelados.

-- Tu query aquí:


-- Ejercicio 09
-- CONTEXTO (Briefing 6.7 — Valentina Torres):
--   El fondo mexicano preguntó cuánto vale un cliente
--   de ShopSphere por país. Valentina necesita LTV promedio
--   y mediana por país, con número de clientes activos.
-- Enunciado: Retorna country, clientes_activos,
--   ltv_promedio (redondeado a 2 dec), ltv_mediana
--   (redondeado a 2 dec). Usa PERCENTILE_CONT(0.5) para
--   la mediana. Solo clientes con al menos 1 pedido no
--   cancelado. Ordena por ltv_promedio DESC.
-- Criterio: CTE ltv_por_cliente con SUM(quantity*unit_price)
--   agrupado por customer_id y country. Outer query agrupa
--   por country. PERCENTILE_CONT con WITHIN GROUP.

-- Tu query aquí:


-- Ejercicio 10
-- CONTEXTO: El equipo de fidelización quiere segmentar los
--   clientes activos de 2025 en 3 grupos por LTV: alto
--   (top 25%), medio (50%) y bajo (bottom 25%). Usa NTILE.
-- Enunciado: Para cada cliente con al menos 1 pedido en
--   2025 (no cancelado), retorna customer_id, nombre_completo,
--   ltv_2025 (su revenue total en 2025, redondeado a 2 dec)
--   y segmento ('alto', 'medio', 'bajo') según su cuartil
--   de LTV. Ordena por ltv_2025 DESC.
-- Criterio: CTE para el LTV 2025 por cliente. NTILE(4) en
--   una segunda CTE o subquery. CASE WHEN sobre el cuartil
--   para asignar la etiqueta. Solo pedidos de 2025.

-- Tu query aquí:


-- Ejercicio 11
-- CONTEXTO: Ana quiere el revenue acumulado de ShopSphere
--   mes a mes en 2025 — el "running total" — para mostrar
--   en qué mes se cruzó cada umbral de revenue anual.
-- Enunciado: Retorna mes, revenue_mensual, revenue_acumulado
--   (suma acumulada desde enero 2025) y pct_del_total_anual
--   (qué porcentaje del revenue total de 2025 representa
--   el acumulado hasta ese mes). Solo 2025. Excluye cancelados.
-- Criterio: CTE para el revenue mensual. SUM OVER con marco
--   UNBOUNDED PRECEDING AND CURRENT ROW para el acumulado.
--   El pct_del_total_anual usa SUM OVER() sin marco (suma
--   total) como denominador. 12 filas.

-- Tu query aquí:


-- Ejercicio 12 — Integrador de Bloque B
-- CONTEXTO (Briefing 6.4 + 6.7 combinados):
--   Valentina quiere combinar el análisis de cohortes con
--   el LTV: para las cohortes de Q1 2025 (enero, febrero,
--   marzo), el LTV acumulado promedio a los 1, 3 y 6 meses
--   de vida del cliente.
-- Enunciado: Para cada cohorte de Q1 2025, retorna:
--   cohorte, ltv_mes_1 (revenue en el primer mes),
--   ltv_mes_1_a_3 (revenue acumulado en los primeros 3 meses),
--   ltv_mes_1_a_6 (revenue acumulado en los primeros 6 meses).
--   Una fila por cohorte (3 filas en total).
-- Criterio: CTE para la cohorte de cada cliente. CTE para
--   el revenue por cliente y mes de vida. MAX(CASE WHEN) para
--   el pivoteo. Excluye cancelados. Los montos son promedios
--   por cliente de la cohorte (no suma total).

-- Tu query aquí:


-- ---------------------------------------------------------------
-- BLOQUE C (13-19): marketing_campaigns
-- ROI por campaña, eficiencia por canal,
-- análisis Regreso a Clases
-- ---------------------------------------------------------------

-- Ejercicio 13
-- CONTEXTO (Briefing 6.3 — Sofía Ramírez):
--   Sofía necesita el ROI de todas las campañas activas
--   en 2025, con una alerta para las de ROI negativo.
-- Enunciado: Retorna campana (name), channel, spent,
--   revenue_atribuible, roi_pct (redondeado a 2 dec) y
--   alerta ('ROI NEGATIVO' o ''). Excluye pedidos cancelados.
--   Usa COALESCE para ended_at. NULLIF en denominador.
--   Ordena por roi_pct DESC NULLS LAST.
-- Criterio: JOIN de marketing_campaigns con orders por
--   BETWEEN started_at y COALESCE(ended_at, CURRENT_DATE).
--   GROUP BY por todas las columnas de campaign excepto
--   las calculadas. CASE WHEN para la alerta.

-- Tu query aquí:


-- Ejercicio 14
-- CONTEXTO (Briefing 6.1 — Sofía Ramírez):
--   La campaña "Regreso a Clases" de marzo 2025 tuvo 3
--   canales. Sofía quiere saber cuál rindió peor.
-- Enunciado: Para la campaña o campañas cuyo name contiene
--   'Regreso a Clases' (usa LIKE), retorna channel, spent,
--   revenue_atribuible, roi_pct y cac (costo por cliente:
--   spent / clientes_distintos). Ordena por roi_pct DESC.
-- Criterio: Filtro con LIKE '%Regreso a Clases%'. COUNT
--   DISTINCT de customer_id para los clientes. La query
--   funciona incluso si hay una sola campaña con ese nombre.

-- Tu query aquí:


-- Ejercicio 15
-- CONTEXTO (Briefing 6.2 — Sofía Ramírez):
--   Antes de presentar el plan de canales para Q3, Sofía
--   quiere la eficiencia histórica de cada canal: ROI total
--   y revenue por dólar gastado.
-- Enunciado: Retorna channel, num_campanas, gasto_total,
--   revenue_total, roi_canal_pct y revenue_por_dolar
--   (revenue_total / gasto_total, redondeado a 2 dec).
--   Todas las campañas, sin filtro de año. Excluye pedidos
--   cancelados. Ordena por roi_canal_pct DESC.
-- Criterio: GROUP BY channel. SUM de spent y SUM de revenue
--   en el mismo GROUP BY. NULLIF en ambos denominadores.
--   COUNT DISTINCT de campaign_id para num_campanas.

-- Tu query aquí:


-- Ejercicio 16
-- CONTEXTO (Briefing 6.5 — Valentina + análisis de campañas):
--   Valentina quiere ver si los meses con campañas activas
--   de paid_search tuvieron revenue más alto que los meses
--   sin ellas. Necesita el revenue mensual de 2025 con una
--   columna que indique si ese mes había alguna campaña de
--   paid_search activa.
-- Enunciado: Retorna mes, revenue_mensual y tiene_paid_search
--   ('Si' o 'No' según si hubo alguna campaña de paid_search
--   activa ese mes). Excluye pedidos cancelados. Ordena por mes.
-- Criterio: CTE para el revenue mensual. LEFT JOIN con
--   marketing_campaigns filtrando channel = 'paid_search' y
--   el mes dentro del período activo. CASE WHEN sobre el
--   campaign_id del LEFT JOIN (NULL = sin campaña activa).

-- Tu query aquí:


-- Ejercicio 17
-- CONTEXTO: Diego quiere saber si las campañas activas
--   reducen la tasa de devoluciones (los clientes vienen
--   más informados) o la aumentan (viene más volumen y
--   más devoluciones). Necesita comparar la tasa de
--   devolución en meses con campaña activa vs. sin ella.
-- Enunciado: Para cada mes de 2025, retorna mes,
--   tasa_devolucion_pct y tiene_campana_activa ('Si'/'No').
--   Luego agrupa por tiene_campana_activa para obtener el
--   promedio de tasa de devolución en cada grupo.
--   Presenta ambos resultados: el detalle mensual y el
--   resumen por grupo (dos queries separadas o con UNION).
-- Criterio: El detalle mensual tiene una fila por mes.
--   El resumen tiene 2 filas. La tasa usa NULLIF en
--   denominador. Define "campaña activa" como cualquier
--   campaña de cualquier canal.

-- Tu query aquí:


-- Ejercicio 18
-- CONTEXTO (Briefing 6.3 — Sofía Ramírez):
--   Sofía quiere ver el CAC comparado con el LTV promedio
--   del país de destino. Si el CAC de una campaña es mayor
--   al LTV promedio del país, la economía unitaria es negativa.
-- Enunciado: Para cada campaña de 2025, retorna campana,
--   channel, pais_predominante (el country con más pedidos
--   en el período activo de la campaña), cac (spent /
--   clientes_distintos), ltv_promedio_pais (LTV promedio
--   de clientes de ese país), y razon_ltv_cac (ltv / cac,
--   redondeado a 2 dec). Alerta si razon_ltv_cac < 3
--   ('REVISAR') o >= 3 ('OK').
-- Criterio: Usa una subquery correlacionada o CTE para el
--   LTV promedio por país. El país predominante requiere
--   una subquery de MAX o MODE. NULLIF en denominadores.

-- Tu query aquí:


-- Ejercicio 19 — Integrador de Bloque C
-- CONTEXTO (Briefings 6.1, 6.2, 6.3 combinados):
--   Sofía necesita el análisis completo de campañas para
--   la presentación de presupuesto Q3:
--   Para cada canal de marketing, necesita:
--   - num_campanas: cuántas corrimos en 2025
--   - gasto_total: suma de spent en 2025
--   - revenue_atribuible: suma del revenue en períodos activos
--   - roi_pct: ROI del canal
--   - cac_promedio: gasto_total / clientes_distintos_totales
--   - tasa_retencion_promedio: promedio de retención mes 2
--     de las cohortes que iniciaron durante las campañas
--     de ese canal (usa el análisis de cohortes del Bloque B)
-- Ordena por roi_pct DESC.
-- Criterio: Múltiples CTEs. El canal es la unidad de análisis.
--   La tasa de retención requiere cruzar con la CTE de cohortes.
--   Esta es la query más compleja del bloque — tómate el tiempo.

-- Tu query aquí:


-- ---------------------------------------------------------------
-- BLOQUE D (20-25): Análisis temporal
-- Estacionalidad, YoY, rolling average, anomalía Chile
-- ---------------------------------------------------------------

-- Ejercicio 20
-- CONTEXTO (Briefing 6.12 — Valentina Torres):
--   Valentina quiere saber en qué meses del año ShopSphere
--   vende más, usando todos los datos históricos. "No por
--   año — el promedio histórico de cada mes del calendario."
-- Enunciado: Retorna mes_numero (1-12), mes_nombre,
--   revenue_promedio (AVG de los totales mensuales de cada
--   año, redondeado a 2 dec) y anios_con_datos (COUNT de
--   meses en el cálculo). Excluye cancelados. Ordena por
--   revenue_promedio DESC.
-- Criterio: CTE para el revenue por mes-año. GROUP BY
--   EXTRACT(MONTH) en la outer query. AVG sobre los totales
--   mensuales (no sobre transacciones individuales).
--   TO_CHAR para el nombre del mes.

-- Tu query aquí:


-- Ejercicio 21
-- CONTEXTO (Briefing 6.10 — Marco Jiménez):
--   Marco necesita el crecimiento YoY por país: revenue de
--   2024 vs 2025 por país, con variación porcentual y peso
--   de cada país en el revenue total de 2025.
-- Enunciado: Retorna country, revenue_2024, revenue_2025,
--   crecimiento_yoy_pct (redondeado a 2 dec) y
--   pct_revenue_2025 (peso del país en el total 2025,
--   redondeado a 1 dec). Excluye cancelados. Ordena por
--   crecimiento_yoy_pct DESC NULLS LAST.
-- Criterio: CTE para revenue anual por país. Pivoteo con
--   MAX(CASE WHEN año = N). SUM OVER() para el total 2025.
--   NULLIF en el denominador del YoY y del porcentaje.

-- Tu query aquí:


-- Ejercicio 22
-- CONTEXTO: Ana quiere el rolling average de 3 meses del
--   revenue mensual para identificar si hay tendencia real
--   detrás de la volatilidad. Necesita el revenue actual
--   y el rolling average lado a lado.
-- Enunciado: Retorna mes, revenue_mensual, rolling_avg_3m
--   (promedio de los 3 meses más recientes incluyendo el
--   actual, redondeado a 2 dec) y desviacion_vs_tendencia
--   (revenue_mensual - rolling_avg_3m, redondeado a 2 dec).
--   Solo 2025. Excluye cancelados. Ordena por mes.
-- Criterio: CTE para el revenue mensual. AVG OVER con
--   ROWS BETWEEN 2 PRECEDING AND CURRENT ROW para el
--   rolling. Cálculo de la desviación en el mismo SELECT.

-- Tu query aquí:


-- Ejercicio 23
-- CONTEXTO (Briefing 6.10 — Marco Jiménez — variante mensual):
--   Marco quiere ver el YoY mes a mes para 2025 (comparar
--   cada mes de 2025 con el mismo mes de 2024) a nivel
--   agregado (todos los países juntos).
-- Enunciado: Para cada mes de 2025, retorna mes,
--   revenue_2025, revenue_2024 (LAG de 12 meses) y
--   variacion_yoy_pct (redondeado a 2 dec). Los meses de
--   2025 que no tengan correspondencia en 2024 muestran
--   NULL — no uses COALESCE para ocultarlos.
-- Criterio: CTE con serie completa de meses (2024 y 2025).
--   LAG(revenue, 12) OVER (ORDER BY mes). Filtro WHERE mes
--   >= '2025-01-01' en el SELECT externo para mostrar
--   solo 2025. 12 filas en el resultado.

-- Tu query aquí:


-- Ejercicio 24
-- CONTEXTO (Briefing 6.9 — Ana Castillo — ADAPTADO):
--   Ana detectó pedidos cancelados inusualmente altos en
--   Chile en marzo-abril 2026. Como los datos de métodos
--   de pago están en un sistema separado (se integran en
--   el Nivel 8), se usa orders.status = 'cancelled' como
--   proxy de "transacción no completada". Necesita la tasa
--   de cancelación mensual de Chile en los últimos 6 meses
--   (diciembre 2025 a mayo 2026) con LAG para ver la tendencia.
-- Enunciado: Retorna mes, total_pedidos, pedidos_cancelados,
--   tasa_cancelacion_pct (redondeado a 2 dec) y
--   tasa_mes_anterior. Solo Chile (c.country = 'Chile').
--   Ordena por mes.
-- Nota: Este ejercicio usa orders.status = 'cancelled' como
--   proxy de pagos fallidos porque la tabla payments pertenece
--   al Nivel 8. El análisis real de pagos fallidos por método
--   de pago se realizará en el Nivel 8.
-- Criterio: JOIN con customers para filtrar Chile. CTE para
--   la tasa mensual. LAG en el SELECT externo. SUM(CASE WHEN
--   status = 'cancelled') para los cancelados. NULLIF en
--   denominador. Filtro de fechas correcto.

-- Tu query aquí:


-- Ejercicio 25 — Integrador del Nivel 6
-- CONTEXTO (Briefings 6.5, 6.10, 6.12 combinados):
--   Valentina prepara el reporte anual para el comité de
--   inversores. Necesita el cuadro completo de performance
--   de ShopSphere en 2025.
--
--   Para cada mes de 2025:
--     - mes (DATE)
--     - revenue_mensual: revenue bruto del mes
--     - revenue_mes_anterior: LAG (MoM)
--     - variacion_mom_pct: variación MoM porcentual
--     - revenue_mismo_mes_2024: LAG de 12 meses (YoY)
--     - variacion_yoy_pct: variación YoY porcentual
--     - rolling_avg_3m: promedio móvil 3 meses
--     - ranking_mes: rank del mes por revenue (1 = mejor)
--
--   Excluye pedidos cancelados.
--   Ordena por mes ascendente.
--
-- Criterio: CTE con serie completa de meses (2024 y 2025)
--   para que el LAG(12) funcione. Múltiples window functions
--   en el SELECT externo. RANK() para el ranking. Filtro
--   WHERE mes >= '2025-01-01' en el SELECT final.
--   Esta es la query de cierre de nivel — debe ser limpia,
--   con alias claros y un comentario introductorio.

-- Tu query aquí:


-- =============================================================
-- SOLUCIONES
-- (Intenta resolver los ejercicios antes de leer esto)
-- =============================================================

/*

--- Solución 01 ---
WITH revenue_mensual AS (
    SELECT
        DATE_TRUNC('month', o.ordered_at)::DATE    AS mes,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)  AS revenue
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.ordered_at >= '2025-01-01'
      AND o.ordered_at <  '2026-01-01'
      AND o.status     <> 'cancelled'
    GROUP BY DATE_TRUNC('month', o.ordered_at)
)
SELECT
    mes,
    revenue                                             AS revenue_actual,
    LAG(revenue) OVER (ORDER BY mes)                    AS revenue_mes_anterior,
    ROUND(
        (revenue - LAG(revenue) OVER (ORDER BY mes))
        * 100.0
        / NULLIF(LAG(revenue) OVER (ORDER BY mes), 0),
        2
    )                                                   AS variacion_pct
FROM revenue_mensual
ORDER BY mes;

--- Solución 02 ---
WITH pedidos_mes AS (
    SELECT
        DATE_TRUNC('month', o.ordered_at)::DATE  AS mes,
        COUNT(*)                                  AS total_pedidos
    FROM orders o
    WHERE o.ordered_at >= '2025-01-01'
      AND o.ordered_at <  '2026-06-01'
      AND o.status     <> 'cancelled'
    GROUP BY DATE_TRUNC('month', o.ordered_at)
),
devoluciones_mes AS (
    SELECT
        DATE_TRUNC('month', r.returned_at)::DATE  AS mes,
        COUNT(*)                                   AS total_devoluciones
    FROM returns r
    WHERE r.returned_at >= '2025-01-01'
      AND r.returned_at <  '2026-06-01'
      AND r.status IN ('approved', 'refunded')
    GROUP BY DATE_TRUNC('month', r.returned_at)
),
tasa_mensual AS (
    SELECT
        p.mes,
        p.total_pedidos,
        COALESCE(d.total_devoluciones, 0)                  AS total_devoluciones,
        ROUND(
            COALESCE(d.total_devoluciones, 0) * 100.0
            / NULLIF(p.total_pedidos, 0),
            2
        )                                                  AS tasa_devolucion_pct
    FROM pedidos_mes p
    LEFT JOIN devoluciones_mes d ON d.mes = p.mes
)
SELECT
    mes,
    total_pedidos,
    total_devoluciones,
    tasa_devolucion_pct,
    LAG(tasa_devolucion_pct) OVER (ORDER BY mes)  AS tasa_mes_anterior
FROM tasa_mensual
ORDER BY mes;

--- Solución 03 ---
WITH revenue_canal_mes AS (
    SELECT
        mc.channel,
        DATE_TRUNC('month', o.ordered_at)::DATE    AS mes,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)  AS revenue
    FROM marketing_campaigns mc
    INNER JOIN orders      o  ON o.ordered_at::DATE BETWEEN mc.started_at
                                                        AND COALESCE(mc.ended_at, CURRENT_DATE)
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.ordered_at >= '2025-01-01'
      AND o.ordered_at <  '2026-01-01'
      AND o.status     <> 'cancelled'
    GROUP BY mc.channel, DATE_TRUNC('month', o.ordered_at)
)
SELECT
    channel,
    mes,
    revenue,
    LAG(revenue) OVER (PARTITION BY channel ORDER BY mes)  AS revenue_mes_anterior
FROM revenue_canal_mes
ORDER BY channel, mes;

--- Solución 04 ---
WITH revenue_neto_mes AS (
    SELECT
        EXTRACT(MONTH FROM o.ordered_at)::INT        AS mes_numero,
        TO_CHAR(o.ordered_at, 'TMMonth')             AS mes_nombre,
        EXTRACT(YEAR FROM o.ordered_at)::INT         AS anio,
        ROUND(
            SUM(oi.quantity * oi.unit_price)
            - COALESCE((
                SELECT SUM(oi2.quantity * oi2.unit_price)
                FROM returns r2
                INNER JOIN order_items oi2 ON oi2.order_id = r2.order_id
                                           AND oi2.product_id = r2.product_id
                WHERE r2.order_id   = o.order_id
                  AND r2.status     = 'refunded'
                  AND EXTRACT(YEAR  FROM r2.returned_at) = EXTRACT(YEAR FROM o.ordered_at)
                  AND EXTRACT(MONTH FROM r2.returned_at) = EXTRACT(MONTH FROM o.ordered_at)
            ), 0),
            2
        )                                            AS revenue_neto
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE EXTRACT(MONTH FROM o.ordered_at) IN (1, 2, 3)
      AND EXTRACT(YEAR  FROM o.ordered_at) IN (2025, 2026)
      AND o.status <> 'cancelled'
    GROUP BY EXTRACT(MONTH FROM o.ordered_at),
             TO_CHAR(o.ordered_at, 'TMMonth'),
             EXTRACT(YEAR FROM o.ordered_at)
)
SELECT
    mes_numero,
    mes_nombre,
    MAX(CASE WHEN anio = 2026 THEN revenue_neto END)    AS revenue_neto_2026,
    MAX(CASE WHEN anio = 2025 THEN revenue_neto END)    AS revenue_neto_2025,
    ROUND(
        MAX(CASE WHEN anio = 2026 THEN revenue_neto END)
        - MAX(CASE WHEN anio = 2025 THEN revenue_neto END),
        2
    )                                                   AS variacion_absoluta,
    ROUND(
        (MAX(CASE WHEN anio = 2026 THEN revenue_neto END)
         - MAX(CASE WHEN anio = 2025 THEN revenue_neto END))
        * 100.0
        / NULLIF(MAX(CASE WHEN anio = 2025 THEN revenue_neto END), 0),
        2
    )                                                   AS variacion_pct
FROM revenue_neto_mes
GROUP BY mes_numero, mes_nombre
ORDER BY mes_numero;

--- Solución 05 ---
WITH pedidos_cliente AS (
    SELECT
        o.customer_id,
        c.first_name || ' ' || c.last_name              AS nombre_completo,
        MIN(o.ordered_at)::DATE                          AS first_order_date,
        MAX(o.ordered_at)::DATE                          AS last_order_date,
        COUNT(o.order_id)                                AS total_pedidos
    FROM orders o
    INNER JOIN customers c ON c.customer_id = o.customer_id
    WHERE o.status <> 'cancelled'
    GROUP BY o.customer_id, c.first_name, c.last_name
)
SELECT
    customer_id,
    nombre_completo,
    first_order_date,
    last_order_date,
    (last_order_date - first_order_date)  AS dias_activo
FROM pedidos_cliente
WHERE total_pedidos >= 2
  AND (last_order_date - first_order_date) >= 365
ORDER BY dias_activo DESC;

--- Solución 06 ---
WITH pedidos_mes AS (
    SELECT
        DATE_TRUNC('month', o.ordered_at)::DATE  AS mes,
        COUNT(*)                                  AS total_pedidos
    FROM orders o
    WHERE o.ordered_at >= '2025-01-01'
      AND o.ordered_at <  '2026-06-01'
      AND o.status     <> 'cancelled'
    GROUP BY DATE_TRUNC('month', o.ordered_at)
),
devoluciones_mes AS (
    SELECT
        DATE_TRUNC('month', r.returned_at)::DATE  AS mes,
        COUNT(*)                                   AS total_devoluciones
    FROM returns r
    WHERE r.returned_at >= '2025-01-01'
      AND r.returned_at <  '2026-06-01'
      AND r.status IN ('approved', 'refunded')
    GROUP BY DATE_TRUNC('month', r.returned_at)
),
tasa_mensual AS (
    SELECT
        p.mes,
        ROUND(
            COALESCE(d.total_devoluciones, 0) * 100.0
            / NULLIF(p.total_pedidos, 0),
            2
        ) AS tasa_devolucion_pct
    FROM pedidos_mes p
    LEFT JOIN devoluciones_mes d ON d.mes = p.mes
)
SELECT
    mes,
    tasa_devolucion_pct,
    LAG(tasa_devolucion_pct)  OVER (ORDER BY mes)  AS tasa_mes_anterior,
    LEAD(tasa_devolucion_pct) OVER (ORDER BY mes)  AS tasa_mes_siguiente
FROM tasa_mensual
ORDER BY mes;

--- Solución 07 ---
WITH primer_pedido AS (
    SELECT
        customer_id,
        DATE_TRUNC('month', MIN(ordered_at))::DATE  AS cohorte
    FROM orders
    WHERE status <> 'cancelled'
    GROUP BY customer_id
),
retenciones AS (
    SELECT
        pp.cohorte,
        pp.customer_id,
        MAX(CASE
            WHEN DATE_TRUNC('month', o.ordered_at)::DATE
                 = (pp.cohorte + INTERVAL '1 month')::DATE
            THEN 1
            ELSE 0
        END) AS retuvo_mes_2
    FROM primer_pedido pp
    LEFT JOIN orders o ON o.customer_id = pp.customer_id
                       AND o.status     <> 'cancelled'
    GROUP BY pp.cohorte, pp.customer_id
)
SELECT
    cohorte,
    COUNT(*)                                              AS clientes_nuevos,
    SUM(retuvo_mes_2)                                    AS retuvieron_mes_2,
    ROUND(
        SUM(retuvo_mes_2) * 100.0
        / NULLIF(COUNT(*), 0),
        1
    )                                                    AS tasa_retencion_pct
FROM retenciones
WHERE cohorte >= '2025-01-01'
  AND cohorte <  '2026-01-01'
GROUP BY cohorte
ORDER BY tasa_retencion_pct DESC;

--- Solución 08 ---
WITH cohorte_sep AS (
    SELECT customer_id
    FROM orders
    WHERE status <> 'cancelled'
    GROUP BY customer_id
    HAVING DATE_TRUNC('month', MIN(ordered_at))::DATE = '2025-09-01'
),
seguimiento AS (
    SELECT
        gs.mes_seguimiento,
        COUNT(DISTINCT cs.customer_id)                   AS total_cohorte,
        COUNT(DISTINCT CASE
            WHEN DATE_TRUNC('month', o.ordered_at)::DATE = gs.mes_seguimiento
            THEN o.customer_id
        END)                                             AS compraron_ese_mes
    FROM cohorte_sep cs
    CROSS JOIN (
        VALUES
            ('2025-10-01'::DATE),
            ('2025-11-01'::DATE),
            ('2025-12-01'::DATE)
    ) AS gs(mes_seguimiento)
    LEFT JOIN orders o ON o.customer_id = cs.customer_id
                       AND o.status     <> 'cancelled'
    GROUP BY gs.mes_seguimiento
)
SELECT
    mes_seguimiento,
    total_cohorte,
    compraron_ese_mes,
    ROUND(
        compraron_ese_mes * 100.0
        / NULLIF(total_cohorte, 0),
        1
    ) AS tasa_retencion_pct
FROM seguimiento
ORDER BY mes_seguimiento;

--- Solución 09 ---
WITH ltv_por_cliente AS (
    SELECT
        o.customer_id,
        c.country,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)  AS ltv_total
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id   = o.order_id
    INNER JOIN customers   c  ON c.customer_id = o.customer_id
    WHERE o.status <> 'cancelled'
    GROUP BY o.customer_id, c.country
)
SELECT
    country,
    COUNT(DISTINCT customer_id)                   AS clientes_activos,
    ROUND(AVG(ltv_total), 2)                      AS ltv_promedio,
    ROUND(PERCENTILE_CONT(0.5)
          WITHIN GROUP (ORDER BY ltv_total), 2)   AS ltv_mediana
FROM ltv_por_cliente
GROUP BY country
ORDER BY ltv_promedio DESC;

--- Solución 10 ---
WITH ltv_2025 AS (
    SELECT
        o.customer_id,
        c.first_name || ' ' || c.last_name               AS nombre_completo,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)        AS ltv_2025
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id   = o.order_id
    INNER JOIN customers   c  ON c.customer_id = o.customer_id
    WHERE o.ordered_at >= '2025-01-01'
      AND o.ordered_at <  '2026-01-01'
      AND o.status     <> 'cancelled'
    GROUP BY o.customer_id, c.first_name, c.last_name
),
con_cuartil AS (
    SELECT
        customer_id,
        nombre_completo,
        ltv_2025,
        NTILE(4) OVER (ORDER BY ltv_2025 DESC)  AS cuartil
    FROM ltv_2025
)
SELECT
    customer_id,
    nombre_completo,
    ltv_2025,
    CASE
        WHEN cuartil = 1 THEN 'alto'
        WHEN cuartil = 2 THEN 'medio'
        WHEN cuartil = 3 THEN 'medio'
        WHEN cuartil = 4 THEN 'bajo'
    END AS segmento
FROM con_cuartil
ORDER BY ltv_2025 DESC;

--- Solución 11 ---
WITH revenue_mensual AS (
    SELECT
        DATE_TRUNC('month', o.ordered_at)::DATE    AS mes,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)  AS revenue_mensual
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.ordered_at >= '2025-01-01'
      AND o.ordered_at <  '2026-01-01'
      AND o.status     <> 'cancelled'
    GROUP BY DATE_TRUNC('month', o.ordered_at)
)
SELECT
    mes,
    revenue_mensual,
    SUM(revenue_mensual) OVER (
        ORDER BY mes
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    )                                                AS revenue_acumulado,
    ROUND(
        SUM(revenue_mensual) OVER (
            ORDER BY mes
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) * 100.0
        / NULLIF(SUM(revenue_mensual) OVER (), 0),
        1
    )                                                AS pct_del_total_anual
FROM revenue_mensual
ORDER BY mes;

--- Solución 12 ---
-- CORRECCIÓN [CRIT-N6-03]: mes_vida ahora usa diferencia de meses calendario
-- en lugar de división entera por 30, que producía resultados incorrectos
-- en meses cortos (febrero, etc.).
-- SQLite (Playground): strftime para extraer año y mes como enteros.
-- PostgreSQL (producción): ver comentario dentro de la CTE.
WITH primer_pedido AS (
    SELECT
        customer_id,
        DATE_TRUNC('month', MIN(ordered_at))::DATE  AS cohorte
    FROM orders
    WHERE status <> 'cancelled'
    GROUP BY customer_id
),
revenue_por_mes_vida AS (
    SELECT
        pp.cohorte,
        pp.customer_id,
        -- Mes de vida basado en meses calendario (corrección CRIT-N6-03)
        -- SQLite (Playground):
        (CAST(strftime('%Y', o.ordered_at) AS INT)
         - CAST(strftime('%Y', pp.cohorte) AS INT)) * 12
        + (CAST(strftime('%m', o.ordered_at) AS INT)
           - CAST(strftime('%m', pp.cohorte) AS INT)) + 1   AS mes_vida,
        -- En PostgreSQL usar:
        -- EXTRACT(YEAR FROM AGE(DATE_TRUNC('month', o.ordered_at), pp.cohorte)) * 12
        -- + EXTRACT(MONTH FROM AGE(DATE_TRUNC('month', o.ordered_at), pp.cohorte)) + 1
        SUM(oi.quantity * oi.unit_price)                    AS revenue
    FROM primer_pedido pp
    INNER JOIN orders      o  ON o.customer_id = pp.customer_id
                              AND o.status     <> 'cancelled'
    INNER JOIN order_items oi ON oi.order_id   = o.order_id
    WHERE pp.cohorte >= '2025-01-01'
      AND pp.cohorte <  '2025-04-01'   -- Q1 2025: ene, feb, mar
    GROUP BY pp.cohorte, pp.customer_id,
             (CAST(strftime('%Y', o.ordered_at) AS INT)
              - CAST(strftime('%Y', pp.cohorte) AS INT)) * 12
             + (CAST(strftime('%m', o.ordered_at) AS INT)
                - CAST(strftime('%m', pp.cohorte) AS INT)) + 1
),
ltv_acumulado AS (
    SELECT
        cohorte,
        customer_id,
        SUM(CASE WHEN mes_vida = 1 THEN revenue ELSE 0 END)           AS ltv_mes_1,
        SUM(CASE WHEN mes_vida BETWEEN 1 AND 3 THEN revenue ELSE 0 END) AS ltv_1_a_3,
        SUM(CASE WHEN mes_vida BETWEEN 1 AND 6 THEN revenue ELSE 0 END) AS ltv_1_a_6
    FROM revenue_por_mes_vida
    GROUP BY cohorte, customer_id
)
SELECT
    cohorte,
    ROUND(AVG(ltv_mes_1), 2)  AS ltv_mes_1,
    ROUND(AVG(ltv_1_a_3), 2)  AS ltv_mes_1_a_3,
    ROUND(AVG(ltv_1_a_6), 2)  AS ltv_mes_1_a_6
FROM ltv_acumulado
GROUP BY cohorte
ORDER BY cohorte;

--- Solución 13 ---
WITH revenue_campanas AS (
    SELECT
        mc.campaign_id,
        mc.name                                           AS campana,
        mc.channel,
        mc.spent,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)        AS revenue_atribuible
    FROM marketing_campaigns mc
    INNER JOIN orders      o  ON o.ordered_at::DATE BETWEEN mc.started_at
                                                        AND COALESCE(mc.ended_at, CURRENT_DATE)
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status      <> 'cancelled'
      AND mc.started_at >= '2025-01-01'
      AND mc.started_at <  '2026-01-01'
    GROUP BY mc.campaign_id, mc.name, mc.channel, mc.spent
)
SELECT
    campana,
    channel,
    spent,
    revenue_atribuible,
    ROUND(
        (revenue_atribuible - spent) * 100.0
        / NULLIF(spent, 0),
        2
    )                                                     AS roi_pct,
    CASE WHEN revenue_atribuible < spent THEN 'ROI NEGATIVO' ELSE '' END AS alerta
FROM revenue_campanas
ORDER BY roi_pct DESC NULLS LAST;

--- Solución 14 ---
SELECT
    mc.channel,
    mc.spent,
    ROUND(SUM(oi.quantity * oi.unit_price), 2)       AS revenue_atribuible,
    ROUND(
        (SUM(oi.quantity * oi.unit_price) - mc.spent) * 100.0
        / NULLIF(mc.spent, 0),
        2
    )                                                AS roi_pct,
    ROUND(
        mc.spent
        / NULLIF(COUNT(DISTINCT o.customer_id), 0),
        2
    )                                                AS cac
FROM marketing_campaigns mc
INNER JOIN orders      o  ON o.ordered_at::DATE BETWEEN mc.started_at
                                                    AND COALESCE(mc.ended_at, CURRENT_DATE)
INNER JOIN order_items oi ON oi.order_id = o.order_id
WHERE o.status <> 'cancelled'
  AND mc.name  LIKE '%Regreso a Clases%'
GROUP BY mc.campaign_id, mc.channel, mc.spent
ORDER BY roi_pct DESC;

--- Solución 15 ---
SELECT
    mc.channel,
    COUNT(DISTINCT mc.campaign_id)                AS num_campanas,
    ROUND(SUM(mc.spent), 2)                       AS gasto_total,
    ROUND(SUM(oi.quantity * oi.unit_price), 2)    AS revenue_total,
    ROUND(
        (SUM(oi.quantity * oi.unit_price) - SUM(mc.spent))
        * 100.0
        / NULLIF(SUM(mc.spent), 0),
        2
    )                                             AS roi_canal_pct,
    ROUND(
        SUM(oi.quantity * oi.unit_price)
        / NULLIF(SUM(mc.spent), 0),
        2
    )                                             AS revenue_por_dolar
FROM marketing_campaigns mc
INNER JOIN orders      o  ON o.ordered_at::DATE BETWEEN mc.started_at
                                                    AND COALESCE(mc.ended_at, CURRENT_DATE)
INNER JOIN order_items oi ON oi.order_id = o.order_id
WHERE o.status <> 'cancelled'
GROUP BY mc.channel
ORDER BY roi_canal_pct DESC;

--- Solución 16 ---
WITH revenue_mensual AS (
    SELECT
        DATE_TRUNC('month', o.ordered_at)::DATE    AS mes,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)  AS revenue_mensual
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.ordered_at >= '2025-01-01'
      AND o.ordered_at <  '2026-01-01'
      AND o.status     <> 'cancelled'
    GROUP BY DATE_TRUNC('month', o.ordered_at)
)
SELECT
    rm.mes,
    rm.revenue_mensual,
    CASE WHEN mc.campaign_id IS NOT NULL THEN 'Si' ELSE 'No' END AS tiene_paid_search
FROM revenue_mensual rm
LEFT JOIN marketing_campaigns mc
    ON rm.mes BETWEEN mc.started_at AND COALESCE(mc.ended_at, CURRENT_DATE)
   AND mc.channel = 'paid_search'
ORDER BY rm.mes;

--- Solución 17 ---
-- Detalle mensual
WITH pedidos_mes AS (
    SELECT
        DATE_TRUNC('month', o.ordered_at)::DATE  AS mes,
        COUNT(*)                                  AS total_pedidos
    FROM orders o
    WHERE o.ordered_at >= '2025-01-01'
      AND o.ordered_at <  '2026-01-01'
      AND o.status     <> 'cancelled'
    GROUP BY DATE_TRUNC('month', o.ordered_at)
),
devoluciones_mes AS (
    SELECT
        DATE_TRUNC('month', r.returned_at)::DATE  AS mes,
        COUNT(*)                                   AS total_devoluciones
    FROM returns r
    WHERE r.returned_at >= '2025-01-01'
      AND r.returned_at <  '2026-01-01'
      AND r.status IN ('approved', 'refunded')
    GROUP BY DATE_TRUNC('month', r.returned_at)
),
tasa_con_campana AS (
    SELECT
        p.mes,
        ROUND(COALESCE(d.total_devoluciones,0) * 100.0
              / NULLIF(p.total_pedidos, 0), 2)      AS tasa_devolucion_pct,
        CASE WHEN mc.campaign_id IS NOT NULL THEN 'Si' ELSE 'No' END AS tiene_campana_activa
    FROM pedidos_mes p
    LEFT JOIN devoluciones_mes d ON d.mes = p.mes
    LEFT JOIN marketing_campaigns mc
        ON p.mes BETWEEN mc.started_at AND COALESCE(mc.ended_at, CURRENT_DATE)
)
-- Detalle mensual
SELECT mes, tasa_devolucion_pct, tiene_campana_activa
FROM tasa_con_campana
ORDER BY mes;

-- Resumen por grupo
-- SELECT tiene_campana_activa,
--        ROUND(AVG(tasa_devolucion_pct), 2) AS tasa_promedio
-- FROM tasa_con_campana
-- GROUP BY tiene_campana_activa;

--- Solución 18 ---
-- NOTA [IMP-N6-01]: La CTE ltv_pais usa INNER JOIN (via subquery), excluyendo
-- del denominador del AVG a los clientes sin pedidos. Esto es CORRECTO para este
-- enunciado: el contexto pide LTV promedio como referencia para evaluar si el CAC
-- de una campaña es sostenible frente al valor que generan los clientes activos de
-- ese país. Incluir clientes sin pedidos (LTV = 0) bajaría artificialmente el
-- promedio y distorsionaría la comparación con el CAC. Si el análisis requiriese
-- el LTV sobre toda la base de clientes (incluyendo inactivos), se usaría LEFT JOIN
-- desde customers hacia orders.
WITH ltv_pais AS (
    SELECT
        subq.country,
        ROUND(AVG(ltv_cliente), 2) AS ltv_promedio
    FROM (
        SELECT o.customer_id, c2.country,
               SUM(oi.quantity * oi.unit_price) AS ltv_cliente
        FROM orders o
        INNER JOIN order_items oi ON oi.order_id = o.order_id
        INNER JOIN customers c2 ON c2.customer_id = o.customer_id
        WHERE o.status <> 'cancelled'
        GROUP BY o.customer_id, c2.country
    ) AS subq
    GROUP BY subq.country
),
campanas_2025 AS (
    SELECT
        mc.campaign_id,
        mc.name                                            AS campana,
        mc.channel,
        mc.spent,
        COUNT(DISTINCT o.customer_id)                     AS clientes_distintos,
        ROUND(mc.spent / NULLIF(COUNT(DISTINCT o.customer_id), 0), 2) AS cac,
        -- País predominante: el que tiene más pedidos en el período activo
        (SELECT c2.country
         FROM orders o2
         INNER JOIN customers c2 ON c2.customer_id = o2.customer_id
         WHERE o2.ordered_at::DATE BETWEEN mc.started_at
                                       AND COALESCE(mc.ended_at, CURRENT_DATE)
           AND o2.status <> 'cancelled'
         GROUP BY c2.country
         ORDER BY COUNT(*) DESC
         LIMIT 1) AS pais_predominante
    FROM marketing_campaigns mc
    INNER JOIN orders o ON o.ordered_at::DATE BETWEEN mc.started_at
                                                  AND COALESCE(mc.ended_at, CURRENT_DATE)
    WHERE o.status      <> 'cancelled'
      AND mc.started_at >= '2025-01-01'
      AND mc.started_at <  '2026-01-01'
    GROUP BY mc.campaign_id, mc.name, mc.channel, mc.spent
)
SELECT
    c2025.campana,
    c2025.channel,
    c2025.pais_predominante,
    c2025.cac,
    lp.ltv_promedio                                        AS ltv_promedio_pais,
    ROUND(lp.ltv_promedio / NULLIF(c2025.cac, 0), 2)      AS razon_ltv_cac,
    CASE WHEN lp.ltv_promedio / NULLIF(c2025.cac, 0) < 3
         THEN 'REVISAR'
         ELSE 'OK'
    END                                                    AS alerta
FROM campanas_2025 c2025
LEFT JOIN ltv_pais lp ON lp.country = c2025.pais_predominante
ORDER BY razon_ltv_cac DESC NULLS LAST;

--- Solución 19 ---
-- CORRECCIÓN [CRIT-N6-01]: eliminada la CTE huérfana clientes_cohorte_por_canal
-- y la CTE retencion_canal con SUM(MAX(...)) anidado (PostgreSQL: "aggregate
-- function calls cannot be nested"). La retención se calcula ahora en dos CTEs
-- separadas: retención_por_cliente (MAX por cliente) y retencion_canal (SUM
-- sobre esos valores ya calculados).
WITH revenue_canal AS (
    SELECT
        mc.channel,
        COUNT(DISTINCT mc.campaign_id)                AS num_campanas,
        ROUND(SUM(mc.spent), 2)                       AS gasto_total,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)    AS revenue_atribuible,
        COUNT(DISTINCT o.customer_id)                 AS clientes_distintos
    FROM marketing_campaigns mc
    INNER JOIN orders      o  ON o.ordered_at::DATE BETWEEN mc.started_at
                                                        AND COALESCE(mc.ended_at, CURRENT_DATE)
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status      <> 'cancelled'
      AND mc.started_at >= '2025-01-01'
      AND mc.started_at <  '2026-01-01'
    GROUP BY mc.channel
),
primer_pedido AS (
    SELECT customer_id,
           DATE_TRUNC('month', MIN(ordered_at))::DATE AS cohorte
    FROM orders
    WHERE status <> 'cancelled'
    GROUP BY customer_id
),
-- CTE 1 de retención: MAX por (canal, cliente) — resuelve la anidación inválida
retencion_por_cliente AS (
    SELECT
        mc.channel,
        pp.customer_id,
        MAX(CASE
            WHEN DATE_TRUNC('month', o2.ordered_at)::DATE
                 = (pp.cohorte + INTERVAL '1 month')::DATE
            THEN 1
            ELSE 0
        END)                                          AS retuvo_mes_2
    FROM marketing_campaigns mc
    INNER JOIN orders      o  ON o.ordered_at::DATE BETWEEN mc.started_at
                                                        AND COALESCE(mc.ended_at, CURRENT_DATE)
    INNER JOIN primer_pedido pp ON pp.customer_id = o.customer_id
                                AND pp.cohorte    = DATE_TRUNC('month', o.ordered_at)::DATE
    LEFT JOIN orders o2 ON o2.customer_id = pp.customer_id
                        AND o2.status     <> 'cancelled'
    WHERE mc.started_at >= '2025-01-01'
      AND mc.started_at <  '2026-01-01'
      AND o.status      <> 'cancelled'
    GROUP BY mc.channel, pp.customer_id
),
-- CTE 2 de retención: SUM sobre valores ya aplanados — sin anidación
retencion_canal AS (
    SELECT
        channel,
        ROUND(
            SUM(retuvo_mes_2) * 100.0
            / NULLIF(COUNT(customer_id), 0),
            1
        )                                             AS tasa_retencion_promedio
    FROM retencion_por_cliente
    GROUP BY channel
)
SELECT
    rc.channel,
    rc.num_campanas,
    rc.gasto_total,
    rc.revenue_atribuible,
    ROUND(
        (rc.revenue_atribuible - rc.gasto_total) * 100.0
        / NULLIF(rc.gasto_total, 0),
        2
    )                                                  AS roi_pct,
    ROUND(rc.gasto_total / NULLIF(rc.clientes_distintos, 0), 2) AS cac_promedio,
    ret.tasa_retencion_promedio
FROM revenue_canal rc
LEFT JOIN retencion_canal ret ON ret.channel = rc.channel
ORDER BY roi_pct DESC;

--- Solución 20 ---
WITH revenue_mensual AS (
    SELECT
        EXTRACT(MONTH FROM o.ordered_at)::INT       AS mes_numero,
        TO_CHAR(o.ordered_at, 'TMMonth')            AS mes_nombre,
        DATE_TRUNC('month', o.ordered_at)::DATE     AS mes,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)  AS revenue
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status <> 'cancelled'
    GROUP BY EXTRACT(MONTH FROM o.ordered_at),
             TO_CHAR(o.ordered_at, 'TMMonth'),
             DATE_TRUNC('month', o.ordered_at)
)
SELECT
    mes_numero,
    mes_nombre,
    ROUND(AVG(revenue), 2)  AS revenue_promedio,
    COUNT(*)                AS anios_con_datos
FROM revenue_mensual
GROUP BY mes_numero, mes_nombre
ORDER BY revenue_promedio DESC;

--- Solución 21 ---
WITH revenue_anual_pais AS (
    SELECT
        c.country,
        EXTRACT(YEAR FROM o.ordered_at)::INT        AS anio,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)  AS revenue_anual
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id   = o.order_id
    INNER JOIN customers   c  ON c.customer_id = o.customer_id
    WHERE o.status <> 'cancelled'
    GROUP BY c.country, EXTRACT(YEAR FROM o.ordered_at)
)
SELECT
    country,
    MAX(CASE WHEN anio = 2024 THEN revenue_anual END)          AS revenue_2024,
    MAX(CASE WHEN anio = 2025 THEN revenue_anual END)          AS revenue_2025,
    ROUND(
        (MAX(CASE WHEN anio = 2025 THEN revenue_anual END)
         - MAX(CASE WHEN anio = 2024 THEN revenue_anual END))
        * 100.0
        / NULLIF(MAX(CASE WHEN anio = 2024 THEN revenue_anual END), 0),
        2
    )                                                           AS crecimiento_yoy_pct,
    ROUND(
        MAX(CASE WHEN anio = 2025 THEN revenue_anual END) * 100.0
        / NULLIF(
            SUM(MAX(CASE WHEN anio = 2025 THEN revenue_anual END)) OVER (),
            0
        ),
        1
    )                                                           AS pct_revenue_2025
FROM revenue_anual_pais
WHERE anio IN (2024, 2025)
GROUP BY country
ORDER BY crecimiento_yoy_pct DESC NULLS LAST;

--- Solución 22 ---
WITH revenue_mensual AS (
    SELECT
        DATE_TRUNC('month', o.ordered_at)::DATE    AS mes,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)  AS revenue_mensual
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.ordered_at >= '2025-01-01'
      AND o.ordered_at <  '2026-01-01'
      AND o.status     <> 'cancelled'
    GROUP BY DATE_TRUNC('month', o.ordered_at)
)
SELECT
    mes,
    revenue_mensual,
    ROUND(
        AVG(revenue_mensual) OVER (
            ORDER BY mes
            ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
        ),
        2
    )                                              AS rolling_avg_3m,
    ROUND(
        revenue_mensual - AVG(revenue_mensual) OVER (
            ORDER BY mes
            ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
        ),
        2
    )                                              AS desviacion_vs_tendencia
FROM revenue_mensual
ORDER BY mes;

--- Solución 23 ---
WITH revenue_mensual AS (
    SELECT
        DATE_TRUNC('month', o.ordered_at)::DATE    AS mes,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)  AS revenue
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.ordered_at >= '2024-01-01'
      AND o.ordered_at <  '2026-01-01'
      AND o.status     <> 'cancelled'
    GROUP BY DATE_TRUNC('month', o.ordered_at)
)
SELECT
    mes,
    revenue                                         AS revenue_2025,
    LAG(revenue, 12) OVER (ORDER BY mes)            AS revenue_2024,
    ROUND(
        (revenue - LAG(revenue, 12) OVER (ORDER BY mes))
        * 100.0
        / NULLIF(LAG(revenue, 12) OVER (ORDER BY mes), 0),
        2
    )                                               AS variacion_yoy_pct
FROM revenue_mensual
WHERE mes >= '2025-01-01'
  AND mes <  '2026-01-01'
ORDER BY mes;

--- Solución 24 ---
WITH pedidos_chile_mes AS (
    SELECT
        DATE_TRUNC('month', o.ordered_at)::DATE       AS mes,
        COUNT(*)                                        AS total_pedidos,
        SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END)
                                                        AS pedidos_cancelados
    FROM orders o
    INNER JOIN customers c ON c.customer_id = o.customer_id
    WHERE c.country = 'Chile'
      AND o.ordered_at >= '2025-12-01'
      AND o.ordered_at <  '2026-06-01'
    GROUP BY DATE_TRUNC('month', o.ordered_at)
),
tasa_cancelacion AS (
    SELECT
        mes,
        total_pedidos,
        pedidos_cancelados,
        ROUND(
            pedidos_cancelados * 100.0
            / NULLIF(total_pedidos, 0),
            2
        )                                              AS tasa_cancelacion_pct
    FROM pedidos_chile_mes
)
SELECT
    mes,
    total_pedidos,
    pedidos_cancelados,
    tasa_cancelacion_pct,
    LAG(tasa_cancelacion_pct) OVER (ORDER BY mes)  AS tasa_mes_anterior
FROM tasa_cancelacion
ORDER BY mes;
-- NOTA: orders.status = 'cancelled' es un proxy de pagos fallidos.
-- El análisis real con payments.status = 'failed' se realizará en el Nivel 8.

--- Solución 25 ---
-- Reporte ejecutivo anual ShopSphere 2025
-- Incluye: MoM, YoY, rolling average y ranking mensual
-- CORRECCIÓN [CRIT-N6-02]: RANK() se calcula ahora en una CTE separada que
-- contiene SOLO los 12 meses de 2025, no los 24 meses de la serie base.
-- Así el ranking compara únicamente meses de 2025 entre sí.
-- La serie base de 24 meses (2024+2025) se mantiene para que LAG(12) y
-- el rolling avg de los primeros meses de 2025 tengan contexto suficiente.
WITH revenue_serie_completa AS (
    -- Fase 1: serie 2024+2025 para LAG(12) y rolling avg
    SELECT
        DATE_TRUNC('month', o.ordered_at)::DATE    AS mes,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)  AS revenue
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.ordered_at >= '2024-01-01'
      AND o.ordered_at <  '2026-01-01'
      AND o.status     <> 'cancelled'
    GROUP BY DATE_TRUNC('month', o.ordered_at)
),
metricas_con_lag AS (
    -- Fase 2: calcula LAG, YoY y rolling avg sobre la serie completa
    SELECT
        mes,
        revenue,
        LAG(revenue, 1)  OVER (ORDER BY mes)        AS revenue_mes_anterior,
        LAG(revenue, 12) OVER (ORDER BY mes)        AS revenue_mismo_mes_2024,
        AVG(revenue) OVER (
            ORDER BY mes
            ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
        )                                           AS rolling_avg_3m_raw
    FROM revenue_serie_completa
),
solo_2025 AS (
    -- Fase 3: filtra a 2025 ANTES de calcular el RANK,
    -- para que el ranking compare solo los 12 meses de 2025
    SELECT *
    FROM metricas_con_lag
    WHERE mes >= '2025-01-01'
      AND mes <  '2026-01-01'
)
SELECT
    mes,
    revenue                                                    AS revenue_mensual,
    revenue_mes_anterior,
    ROUND(
        (revenue - revenue_mes_anterior) * 100.0
        / NULLIF(revenue_mes_anterior, 0),
        2
    )                                                          AS variacion_mom_pct,
    revenue_mismo_mes_2024,
    ROUND(
        (revenue - revenue_mismo_mes_2024) * 100.0
        / NULLIF(revenue_mismo_mes_2024, 0),
        2
    )                                                          AS variacion_yoy_pct,
    ROUND(rolling_avg_3m_raw, 2)                               AS rolling_avg_3m,
    RANK() OVER (ORDER BY revenue DESC)                        AS ranking_mes
FROM solo_2025
ORDER BY mes;

*/
