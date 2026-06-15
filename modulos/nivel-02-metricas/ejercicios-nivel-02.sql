-- =============================================================
-- EJERCICIOS NIVEL 2 — Métricas de Negocio
-- ShopSphere SQL Course
-- Tablas disponibles: customers, categories, products, orders
-- =============================================================
-- Contexto narrativo:
--   Llevas un mes en ShopSphere. Valentina confía en ti para
--   producir métricas básicas de negocio. Marco tiene reuniones
--   con inversores. Sofía analiza campañas. Ana revisa números.
--   Tus queries alimentan esas conversaciones.
-- =============================================================


-- ---------------------------------------------------------------
-- BLOQUE A: Funciones de Agregación (Lección 1)
-- ---------------------------------------------------------------

-- Ejercicio 01
-- CONTEXTO: Marco necesita un número rápido para una llamada
--   con un inversor: ¿cuántos pedidos ha procesado ShopSphere
--   en total hasta hoy?
-- Enunciado: Escribe una query que retorne el total de pedidos
--   en la tabla orders.
-- Criterio: Una sola fila, una sola columna llamada
--   'total_pedidos'. El número exacto es 31.345 con el seed
--   actual (puedes verificarlo con SELECT COUNT(*) FROM orders).

-- Tu query aquí:


-- Ejercicio 02
-- CONTEXTO: Valentina quiere un diagnóstico rápido del catálogo.
-- Enunciado: En una sola query, retorna:
--   - total de productos (todos)
--   - total de productos activos
--   - precio mínimo del catálogo completo
--   - precio máximo del catálogo completo
--   - precio promedio (redondeado a 2 decimales) del catálogo completo
-- Criterio: Una sola fila, cinco columnas con alias descriptivos.

-- Tu query aquí:


-- Ejercicio 03
-- CONTEXTO: Diego de Operaciones quiere saber qué tan completa
--   está la información de ciudad en la base de clientes,
--   antes de hacer un análisis logístico por ciudad.
-- Enunciado: Retorna el total de clientes, cuántos tienen ciudad
--   registrada (city no es NULL), y cuántos NO tienen ciudad.
-- Criterio: Una sola fila, tres columnas:
--   total_clientes, con_ciudad, sin_ciudad.
--   sin_ciudad = total_clientes - con_ciudad.

-- Tu query aquí:


-- Ejercicio 04
-- CONTEXTO: Marco pregunta cuántos pedidos entregados tuvo
--   ShopSphere, y cuál fue el primer y el último pedido
--   entregado (fecha más antigua y más reciente con status
--   'delivered').
-- Enunciado: Filtra solo pedidos con status = 'delivered' y
--   retorna: total de esos pedidos, fecha del más antiguo,
--   fecha del más reciente.
-- Criterio: Una sola fila con tres columnas con alias claros.

-- Tu query aquí:


-- Ejercicio 05
-- CONTEXTO: El equipo de datos necesita saber cuántos clientes
--   únicos han realizado al menos un pedido (aparecen en la
--   tabla orders), vs. el total de clientes registrados.
-- Enunciado: En una query sobre la tabla orders, retorna el
--   número de customer_id distintos que aparecen en orders.
--   (El total de clientes registrados es 500 — esa comparación
--   la hace Valentina manualmente.)
-- Criterio: Una sola fila, una columna: clientes_con_pedidos.

-- Tu query aquí:


-- ---------------------------------------------------------------
-- BLOQUE B: GROUP BY (Lección 2)
-- ---------------------------------------------------------------

-- Ejercicio 06
-- CONTEXTO: Sofía de Marketing quiere saber cómo está
--   distribuida la base de clientes por país, para decidir
--   qué mercados priorizar en la próxima campaña.
-- Enunciado: Muestra el total de clientes por país, ordenado
--   de mayor a menor cantidad.
-- Criterio: Una fila por país. Columnas: country, total.
--   Ordenado descendente por total.

-- Tu query aquí:


-- Ejercicio 07
-- CONTEXTO: Marco quiere ver la distribución de pedidos por
--   status para entender la salud operativa de ShopSphere.
-- Enunciado: Muestra el conteo de pedidos agrupado por status.
--   Ordena de mayor a menor cantidad.
-- Criterio: Una fila por cada valor de status. Columnas:
--   status, total_pedidos. Descendente por total_pedidos.

-- Tu query aquí:


-- Ejercicio 08
-- CONTEXTO: El equipo de producto quiere un resumen del
--   catálogo por categoría: cuántos productos hay en cada
--   categoría, cuál es el precio mínimo y máximo, y cuál
--   es el precio promedio redondeado a 2 decimales.
--   Solo productos activos.
-- Enunciado: Agrupa los productos activos por category_id
--   y calcula los estadísticos de precio.
-- Criterio: Una fila por category_id. Columnas: category_id,
--   total_productos, precio_min, precio_max, precio_promedio.
--   Solo is_active = TRUE.

-- Tu query aquí:


-- Ejercicio 09
-- CONTEXTO: Valentina quiere ver cómo fue el registro de
--   clientes por año (2023, 2024 y 2025), para el informe
--   anual. El dataset cubre registros en los tres años.
-- Enunciado: Agrupa los clientes por año de registro y muestra
--   el total de clientes registrados cada año. Ordena por año.
-- Criterio: Una fila por año (el resultado debe tener 3 filas:
--   2023, 2024 y 2025). Columnas: anio_registro, total.
--   anio_registro es un número (resultado de EXTRACT).

-- Tu query aquí:


-- Ejercicio 10
-- CONTEXTO: Sofía analiza la actividad de pedidos por mes
--   para detectar estacionalidad. Necesita la serie de tiempo
--   mensual de pedidos de ShopSphere.
-- Enunciado: Muestra el total de pedidos por mes, usando
--   DATE_TRUNC. Ordena cronológicamente.
-- Criterio: Una fila por mes. Columnas: mes (tipo fecha),
--   total_pedidos. Ordenado de más antiguo a más reciente.

-- Tu query aquí:


-- Ejercicio 11
-- CONTEXTO: Marco quiere ver el crecimiento trimestral.
--   Necesita el conteo de pedidos por año y trimestre.
-- Enunciado: Agrupa los pedidos por año y trimestre (usa
--   EXTRACT para ambos). Muestra también los clientes únicos
--   que compraron ese trimestre. Ordena por año y trimestre.
-- Criterio: Una fila por combinación (año, trimestre).
--   Columnas: anio, trimestre, total_pedidos, clientes_unicos.

-- Tu query aquí:


-- ---------------------------------------------------------------
-- BLOQUE C: HAVING (Lección 3)
-- ---------------------------------------------------------------

-- Ejercicio 12
-- CONTEXTO: Para el reporte de Marco, Valentina solo quiere
--   ver los países con más de 25 clientes registrados.
--   Los mercados pequeños no son relevantes para la reunión.
-- Enunciado: Filtra los países con más de 25 clientes.
--   Ordena de mayor a menor.
-- Criterio: Solo filas donde total > 25. Descendente.

-- Tu query aquí:


-- Ejercicio 13
-- CONTEXTO: Ana de Finanzas quiere identificar las categorías
--   de producto cuyo precio promedio supera los $70.
--   Son las categorías de ticket alto que más impactan el margen.
-- Enunciado: Solo productos activos. Agrupa por category_id.
--   Filtra donde el precio promedio > 70. Ordena por precio
--   promedio descendente.
-- Criterio: Solo categorías con AVG(price) > 70 (solo activos).
--   Columnas: category_id, total_activos, precio_promedio.

-- Tu query aquí:


-- Ejercicio 14
-- CONTEXTO: Sofía quiere los meses donde ShopSphere tuvo más
--   de 100 pedidos, para identificar los períodos de mayor
--   actividad y correlacionar con las campañas de marketing.
-- Enunciado: Agrupa por mes (DATE_TRUNC). Filtra meses con
--   más de 100 pedidos totales. Muestra mes y total.
--   Ordena de más a menos pedidos.
-- Criterio: Solo meses con más de 100 pedidos. Descendente
--   por total. La columna de mes es tipo fecha.

-- Tu query aquí:


-- Ejercicio 15
-- CONTEXTO: Valentina quiere combinar WHERE y HAVING.
--   Específicamente: de los pedidos de 2024, ¿qué meses
--   tuvieron más de 80 pedidos entregados?
-- Enunciado: Filtra pedidos de 2024 (WHERE) con status
--   = 'delivered'. Agrupa por mes. Filtra meses con más de
--   80 pedidos entregados (HAVING). Ordena descendente.
-- Criterio: Solo 2024, solo delivered. HAVING filtra los
--   grupos. Columnas: mes, pedidos_entregados.

-- Tu query aquí:


-- ---------------------------------------------------------------
-- BLOQUE D: Análisis Temporal (Lección 4)
-- ---------------------------------------------------------------

-- Ejercicio 16
-- CONTEXTO: Valentina prepara el informe mensual de nuevos
--   clientes por mes para el Q3 y parte del Q4 de 2024
--   (julio a noviembre 2024). Nota: diciembre 2024 no tuvo
--   registros de clientes nuevos en el dataset.
-- Enunciado: Filtra clientes registrados en julio-noviembre
--   2024. Agrupa por mes. Muestra mes y total. Orden cronológico.
-- Criterio: Solo clientes de julio a noviembre de 2024
--   (el resultado tendrá 5 filas, no 6, porque diciembre
--   2024 no tiene registros en el dataset actual).
--   Columnas: mes (fecha), clientes_nuevos. Ordenado por mes.

-- Tu query aquí:


-- Ejercicio 17
-- CONTEXTO: Sofía quiere comparar los pedidos de noviembre
--   2023 (primer Black Friday de ShopSphere) vs. noviembre
--   2024 (segundo Black Friday). Quiere ver el detalle por
--   día de cada noviembre.
-- Enunciado: Filtra pedidos de noviembre de cualquier año
--   (mes = 11). Agrupa por día (DATE_TRUNC al día). Muestra
--   día y total de pedidos ese día. Ordena cronológico.
-- Criterio: Solo registros donde el mes es noviembre.
--   Granularidad diaria. Ordenado cronológicamente.

-- Tu query aquí:


-- Ejercicio 18
-- CONTEXTO: Marco quiere ver el crecimiento año sobre año
--   de pedidos por mes del año. Es decir: cuántos pedidos
--   hubo en cada mes-del-año (1 a 12), separados por año.
-- Enunciado: Agrupa los pedidos por mes del año (EXTRACT
--   MONTH, del 1 al 12) y año. Muestra: anio, mes_numero,
--   total_pedidos. Ordena por anio y mes_numero.
-- Criterio: Dos columnas de agrupación: anio y mes_numero
--   (ambas numéricas). Columna total_pedidos. Orden correcto.

-- Tu query aquí:


-- Ejercicio 19
-- CONTEXTO: Valentina quiere identificar las semanas más
--   activas del año 2024 en términos de pedidos (top 5
--   semanas por volumen), para correlacionar con eventos
--   de marketing y campañas.
-- Enunciado: Filtra pedidos de 2024. Agrupa por semana
--   (DATE_TRUNC 'week'). Ordena de mayor a menor total.
--   Retorna solo las 5 semanas con más pedidos.
-- Criterio: Solo 2024. Granularidad semanal. LIMIT 5.
--   Descendente por total. Columnas: semana (fecha), pedidos.

-- Tu query aquí:


-- Ejercicio 20
-- CONTEXTO: Para un análisis de estacionalidad, Valentina
--   quiere ver el promedio de pedidos por día de la semana
--   (domingo=0, lunes=1, ..., sábado=6) para saber qué
--   días son los más activos. Solo pedidos entregados.
-- Enunciado: Filtra status = 'delivered'. Agrupa por
--   día de la semana (EXTRACT DOW). Calcula el total
--   de pedidos por día de semana y ordena por total descendente.
-- Criterio: 7 filas (una por día de semana, 0-6).
--   Columnas: dia_semana (0-6), total_pedidos. Descendente.

-- Tu query aquí:


-- Ejercicio 21
-- CONTEXTO: Ana de Finanzas necesita el número de pedidos
--   cancelados por mes en 2024, para el informe de pérdidas
--   de conversión del año.
-- Enunciado: Filtra 2024 Y status = 'cancelled'. Agrupa por
--   mes. Muestra mes y total de cancelaciones. Orden cronológico.
-- Criterio: Solo 2024, solo cancelados. Mes como fecha.
--   Ordenado cronológicamente.

-- Tu query aquí:


-- Ejercicio 22
-- CONTEXTO: Sofía quiere ver los meses de 2024 donde hubo
--   al menos 20 nuevos clientes registrados, para confirmar
--   cuáles campañas de adquisición tuvieron impacto.
-- Enunciado: Filtra customers de 2024. Agrupa por mes.
--   Solo meses con 20 o más clientes nuevos. Ordena
--   cronológicamente.
-- Criterio: Solo 2024. HAVING >= 20. Mes como fecha.
--   Columnas: mes, clientes_nuevos.

-- Tu query aquí:


-- Ejercicio 23
-- CONTEXTO: Marco necesita comparar dos trimestres específicos:
--   Q3 2024 (julio-septiembre) vs Q4 2024 (octubre-diciembre).
--   Quiere el total de pedidos y el número de clientes únicos
--   para cada uno.
-- Enunciado: Usa WHERE para filtrar solo el segundo semestre
--   de 2024. Agrupa por trimestre (EXTRACT QUARTER).
--   Muestra trimestre, total_pedidos, clientes_unicos.
-- Criterio: Solo Q3 y Q4 de 2024. Dos filas en el resultado.
--   Columnas correctas y con alias.

-- Tu query aquí:


-- Ejercicio 24
-- CONTEXTO: Valentina quiere el resumen definitivo de pedidos
--   por status y por año, para el informe anual. Necesita
--   ver todas las combinaciones (año, status) que existan.
-- Enunciado: Agrupa orders por año (EXTRACT) y status.
--   Muestra para cada combinación: anio, status,
--   total_pedidos, clientes_distintos. Ordena por anio y
--   por total descendente.
-- Criterio: GROUP BY con dos columnas. Cuatro columnas en
--   el resultado. Orden correcto.

-- Tu query aquí:


-- Ejercicio 25 — Integrador
-- CONTEXTO: Este es el reporte que Valentina va a usar en
--   la reunión del viernes con Marco y los inversores.
--   Quiere el resumen mensual del año 2024: por cada mes,
--   el total de pedidos, los pedidos entregados, los pedidos
--   cancelados, y la tasa de entrega (entregados / total * 100,
--   redondeado a 1 decimal). Solo los meses con más de 50
--   pedidos totales. Orden cronológico.
-- Enunciado: Combina todo lo aprendido: filtro de año (WHERE),
--   agregación (COUNT con FILTER), GROUP BY por mes,
--   cálculo de porcentaje, HAVING, ORDER BY.
-- Criterio: Solo 2024. HAVING > 50 pedidos. Mes como fecha.
--   Cinco columnas: mes, total_pedidos, entregados, cancelados,
--   tasa_entrega. Orden cronológico.

-- Tu query aquí:


-- =============================================================
-- SOLUCIONES
-- (Intenta resolver los ejercicios antes de leer esto)
-- =============================================================

/*
--- Solución 01 ---
SELECT COUNT(*) AS total_pedidos
FROM orders;

--- Solución 02 ---
SELECT
    COUNT(*)                    AS total_productos,
    COUNT(*) FILTER (WHERE is_active = TRUE)  AS productos_activos,
    MIN(price)                  AS precio_min,
    MAX(price)                  AS precio_max,
    ROUND(AVG(price), 2)        AS precio_promedio
FROM products;

--- Solución 03 ---
SELECT
    COUNT(*)                    AS total_clientes,
    COUNT(city)                 AS con_ciudad,
    COUNT(*) - COUNT(city)      AS sin_ciudad
FROM customers;

--- Solución 04 ---
SELECT
    COUNT(*)            AS pedidos_entregados,
    MIN(ordered_at)     AS primer_pedido,
    MAX(ordered_at)     AS ultimo_pedido
FROM orders
WHERE status = 'delivered';

--- Solución 05 ---
SELECT COUNT(DISTINCT customer_id) AS clientes_con_pedidos
FROM orders;

--- Solución 06 ---
SELECT
    country,
    COUNT(*) AS total
FROM customers
GROUP BY country
ORDER BY total DESC;

--- Solución 07 ---
SELECT
    status,
    COUNT(*) AS total_pedidos
FROM orders
GROUP BY status
ORDER BY total_pedidos DESC;

--- Solución 08 ---
SELECT
    category_id,
    COUNT(*)            AS total_productos,
    MIN(price)          AS precio_min,
    MAX(price)          AS precio_max,
    ROUND(AVG(price), 2) AS precio_promedio
FROM products
WHERE is_active = TRUE
GROUP BY category_id
ORDER BY category_id;

--- Solución 09 ---
SELECT
    EXTRACT(YEAR FROM registered_at)  AS anio_registro,
    COUNT(*)                           AS total
FROM customers
GROUP BY EXTRACT(YEAR FROM registered_at)
ORDER BY anio_registro;

--- Solución 10 ---
SELECT
    DATE_TRUNC('month', ordered_at)  AS mes,
    COUNT(*)                          AS total_pedidos
FROM orders
GROUP BY DATE_TRUNC('month', ordered_at)
ORDER BY mes ASC;

--- Solución 11 ---
SELECT
    EXTRACT(YEAR FROM ordered_at)     AS anio,
    EXTRACT(QUARTER FROM ordered_at)  AS trimestre,
    COUNT(*)                           AS total_pedidos,
    COUNT(DISTINCT customer_id)        AS clientes_unicos
FROM orders
GROUP BY
    EXTRACT(YEAR FROM ordered_at),
    EXTRACT(QUARTER FROM ordered_at)
ORDER BY anio, trimestre;

--- Solución 12 ---
SELECT
    country,
    COUNT(*) AS total
FROM customers
GROUP BY country
HAVING COUNT(*) > 25
ORDER BY total DESC;

--- Solución 13 ---
SELECT
    category_id,
    COUNT(*)            AS total_activos,
    ROUND(AVG(price), 2) AS precio_promedio
FROM products
WHERE is_active = TRUE
GROUP BY category_id
HAVING AVG(price) > 70
ORDER BY precio_promedio DESC;

--- Solución 14 ---
SELECT
    DATE_TRUNC('month', ordered_at)  AS mes,
    COUNT(*)                          AS total_pedidos
FROM orders
GROUP BY DATE_TRUNC('month', ordered_at)
HAVING COUNT(*) > 100
ORDER BY total_pedidos DESC;

--- Solución 15 ---
SELECT
    DATE_TRUNC('month', ordered_at)  AS mes,
    COUNT(*)                          AS pedidos_entregados
FROM orders
WHERE EXTRACT(YEAR FROM ordered_at) = 2024
  AND status = 'delivered'
GROUP BY DATE_TRUNC('month', ordered_at)
HAVING COUNT(*) > 80
ORDER BY pedidos_entregados DESC;

--- Solución 16 ---
SELECT
    DATE_TRUNC('month', registered_at)  AS mes,
    COUNT(*)                             AS clientes_nuevos
FROM customers
WHERE registered_at >= '2024-07-01'
  AND registered_at < '2024-12-01'
GROUP BY DATE_TRUNC('month', registered_at)
ORDER BY mes ASC;
-- Nota: el rango termina en noviembre porque diciembre 2024
-- no tiene clientes registrados en el dataset. El resultado
-- correcto tiene 5 filas (julio a noviembre 2024).

--- Solución 17 ---
SELECT
    DATE_TRUNC('day', ordered_at)  AS dia,
    COUNT(*)                        AS total_pedidos
FROM orders
WHERE EXTRACT(MONTH FROM ordered_at) = 11
GROUP BY DATE_TRUNC('day', ordered_at)
ORDER BY dia ASC;

--- Solución 18 ---
SELECT
    EXTRACT(YEAR FROM ordered_at)   AS anio,
    EXTRACT(MONTH FROM ordered_at)  AS mes_numero,
    COUNT(*)                         AS total_pedidos
FROM orders
GROUP BY
    EXTRACT(YEAR FROM ordered_at),
    EXTRACT(MONTH FROM ordered_at)
ORDER BY anio, mes_numero;

--- Solución 19 ---
SELECT
    DATE_TRUNC('week', ordered_at)  AS semana,
    COUNT(*)                         AS pedidos
FROM orders
WHERE EXTRACT(YEAR FROM ordered_at) = 2024
GROUP BY DATE_TRUNC('week', ordered_at)
ORDER BY pedidos DESC
LIMIT 5;

--- Solución 20 ---
SELECT
    EXTRACT(DOW FROM ordered_at)  AS dia_semana,
    COUNT(*)                       AS total_pedidos
FROM orders
WHERE status = 'delivered'
GROUP BY EXTRACT(DOW FROM ordered_at)
ORDER BY total_pedidos DESC;

--- Solución 21 ---
SELECT
    DATE_TRUNC('month', ordered_at)  AS mes,
    COUNT(*)                          AS cancelaciones
FROM orders
WHERE EXTRACT(YEAR FROM ordered_at) = 2024
  AND status = 'cancelled'
GROUP BY DATE_TRUNC('month', ordered_at)
ORDER BY mes ASC;

--- Solución 22 ---
SELECT
    DATE_TRUNC('month', registered_at)  AS mes,
    COUNT(*)                             AS clientes_nuevos
FROM customers
WHERE registered_at >= '2024-01-01'
  AND registered_at < '2025-01-01'
GROUP BY DATE_TRUNC('month', registered_at)
HAVING COUNT(*) >= 20
ORDER BY mes ASC;

--- Solución 23 ---
SELECT
    EXTRACT(QUARTER FROM ordered_at)  AS trimestre,
    COUNT(*)                           AS total_pedidos,
    COUNT(DISTINCT customer_id)        AS clientes_unicos
FROM orders
WHERE ordered_at >= '2024-07-01'
  AND ordered_at < '2025-01-01'
GROUP BY EXTRACT(QUARTER FROM ordered_at)
ORDER BY trimestre;

--- Solución 24 ---
SELECT
    EXTRACT(YEAR FROM ordered_at)   AS anio,
    status,
    COUNT(*)                         AS total_pedidos,
    COUNT(DISTINCT customer_id)      AS clientes_distintos
FROM orders
GROUP BY
    EXTRACT(YEAR FROM ordered_at),
    status
ORDER BY anio, total_pedidos DESC;

--- Solución 25 ---
SELECT
    DATE_TRUNC('month', ordered_at)                              AS mes,
    COUNT(*)                                                     AS total_pedidos,
    COUNT(*) FILTER (WHERE status = 'delivered')                AS entregados,
    COUNT(*) FILTER (WHERE status = 'cancelled')                AS cancelados,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'delivered') * 100.0
        / COUNT(*),
        1
    )                                                            AS tasa_entrega
FROM orders
WHERE EXTRACT(YEAR FROM ordered_at) = 2024
GROUP BY DATE_TRUNC('month', ordered_at)
HAVING COUNT(*) > 50
ORDER BY mes ASC;
*/
