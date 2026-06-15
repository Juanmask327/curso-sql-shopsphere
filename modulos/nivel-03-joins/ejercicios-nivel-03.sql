-- =============================================================
-- EJERCICIOS NIVEL 3 — JOINs y Relaciones
-- ShopSphere SQL Course
-- Tablas disponibles: customers, categories, products,
--                     orders, order_items
-- =============================================================
-- Contexto narrativo:
--   Llevas un mes y medio en ShopSphere. Ya produces métricas
--   básicas. Ahora el equipo te hace preguntas que requieren
--   cruzar tablas: revenue por producto, ventas por categoría,
--   clientes que compraron X pero no Y. Estas queries alimentan
--   decisiones reales de negocio.
-- =============================================================


-- ---------------------------------------------------------------
-- BLOQUE A (1-6): INNER JOIN entre 2 tablas
-- ---------------------------------------------------------------

-- Ejercicio 01
-- CONTEXTO: Valentina quiere revisar el catálogo completo con
--   el nombre de categoría visible (no solo el category_id).
--   La tabla products tiene category_id; la tabla categories
--   tiene el nombre de la categoría.
-- Enunciado: Retorna todos los productos activos con su nombre,
--   precio y el nombre de su categoría. Ordena por categoría
--   y luego por precio descendente.
-- Criterio: Solo productos activos. Dos tablas en el JOIN.
--   Columnas: producto, categoria, precio. Orden correcto.

-- Tu query aquí:


-- Ejercicio 02
-- CONTEXTO: Marco necesita saber cuál es el producto que más
--   se ha vendido en toda la historia de ShopSphere, medido
--   en unidades totales (Briefing 3.5).
-- Enunciado: Retorna el nombre del producto y el total de
--   unidades vendidas (SUM de quantity en order_items).
--   Solo la fila del producto ganador.
-- Criterio: INNER JOIN entre order_items y products.
--   SUM(quantity). Una sola fila: el mayor. LIMIT 1.

-- Tu query aquí:


-- Ejercicio 03
-- CONTEXTO: Diego quiere saber cuántas veces ha sido pedido
--   cada producto (número de ítems de pedido, no de pedidos
--   distintos). Solo productos que tengan al menos una venta.
-- Enunciado: Retorna el nombre del producto y el número de
--   veces que aparece en order_items. Ordena de más a menos.
-- Criterio: INNER JOIN entre products y order_items.
--   COUNT de filas en order_items. Solo productos con ventas
--   (INNER JOIN los excluye automáticamente). Descendente.

-- Tu query aquí:


-- Ejercicio 04
-- CONTEXTO: Valentina quiere validar que la tabla order_items
--   está bien relacionada con orders (Briefing 3.10). Necesita
--   ver los últimos 20 pedidos con: fecha del pedido, ID del
--   pedido, y el total de ítems distintos en ese pedido.
-- Enunciado: Retorna order_id, fecha del pedido (ordered_at),
--   y el conteo de ítems (COUNT de item_id) para los pedidos
--   más recientes. Limita a los 20 pedidos más recientes.
-- Criterio: JOIN entre orders y order_items. GROUP BY por
--   pedido. Ordenado por fecha descendente. LIMIT 20.
--   Columnas: order_id, ordered_at, total_items.

-- Tu query aquí:


-- Ejercicio 05
-- CONTEXTO: Diego de Operaciones quiere ver el ticket promedio
--   real por categoría (Briefing 3.12): revenue total de la
--   categoría dividido entre el total de ítems vendidos.
-- Enunciado: Para cada categoría, calcula el revenue total
--   (SUM de quantity * unit_price) y el total de ítems vendidos
--   (SUM de quantity). Muestra también el precio promedio por
--   unidad (revenue / unidades). Usa solo products y order_items.
-- Criterio: JOIN entre order_items, products. GROUP BY por
--   category_id. Columnas: category_id, revenue_total,
--   unidades_vendidas, precio_promedio_por_unidad (redondeado
--   a 2 decimales). Ordenado por revenue_total descendente.

-- Tu query aquí:


-- Ejercicio 06
-- CONTEXTO: Sofía quiere un listado de pedidos completos
--   con datos del cliente para una revisión de calidad.
--   Necesita: fecha del pedido, nombre del cliente (first_name
--   + last_name), email y status del pedido.
-- Enunciado: Retorna los 25 pedidos más recientes con los
--   datos del cliente que los realizó. Ordena por fecha
--   descendente.
-- Criterio: JOIN entre orders y customers. Solo las columnas
--   indicadas. Las últimas 25 filas (los más recientes).
--   Columnas: ordered_at, nombre_cliente, email, status.

-- Tu query aquí:


-- ---------------------------------------------------------------
-- BLOQUE B (7-12): LEFT JOIN y detección de huérfanos
-- ---------------------------------------------------------------

-- Ejercicio 07
-- CONTEXTO: Valentina necesita la lista de clientes que nunca
--   han realizado un pedido, para pasársela a Sofía para una
--   campaña de reactivación (Briefing 3.6).
-- Enunciado: Retorna customer_id, first_name, last_name, email
--   y country de los clientes que no tienen ningún pedido en
--   la tabla orders. Ordena por país y apellido.
-- Criterio: LEFT JOIN entre customers y orders. Filtro
--   WHERE orders.order_id IS NULL. Orden correcto.

-- Tu query aquí:


-- Ejercicio 08
-- CONTEXTO: El equipo de producto quiere saber qué productos
--   activos no han registrado ninguna venta en toda la historia.
--   Son candidatos a revisión o descontinuación.
-- Enunciado: Retorna el nombre del producto, su categoría
--   (usando category_id, no el nombre de categories) y su
--   precio. Solo productos activos sin ningún ítem en
--   order_items.
-- Criterio: LEFT JOIN entre products y order_items.
--   WHERE order_items.item_id IS NULL. Solo is_active = TRUE.
--   Columnas: product_id, nombre_producto, category_id, precio.

-- Tu query aquí:


-- Ejercicio 09
-- CONTEXTO: Ana de Finanzas necesita validar la cobertura del
--   catálogo: todas las categorías con el conteo de productos
--   que tienen, incluyendo las categorías que no tienen ningún
--   producto activo (que deben aparecer con 0).
-- Enunciado: Retorna todas las categorías con el total de
--   productos activos en cada una. Las categorías sin productos
--   activos muestran 0. Ordena por total_productos descendente.
-- Criterio: LEFT JOIN entre categories y products (con filtro
--   de is_active en el ON, no en el WHERE). COUNT correcto
--   para mostrar 0 en lugar de NULL. Todas las categorías
--   aparecen en el resultado.

-- Tu query aquí:


-- Ejercicio 10
-- CONTEXTO: Sofía analiza el engagement del catálogo en el
--   Día de Madres 2026 (5 al 10 de mayo de 2026). Quiere
--   saber qué productos tuvieron ventas en ese período y
--   cuántas unidades se vendieron, pero también quiere ver
--   los productos activos que NO tuvieron ninguna venta en
--   esos días (con 0 unidades).
-- Enunciado: Para todos los productos activos, muestra su
--   nombre, categoría (category_id) y total de unidades
--   vendidas en el período del 5 de mayo de 2026 a las
--   00:00:00 hasta el 10 de mayo de 2026 inclusive (el día
--   completo). Usa el patrón:
--   ordered_at >= '2026-05-05' AND ordered_at < '2026-05-11'
--   para capturar todos los pedidos del día 10 sin importar
--   la hora. Los productos sin ventas ese período muestran 0.
--   Ordena descendente por unidades_vendidas.
-- Criterio: LEFT JOIN de products con order_items (con el
--   filtro de fecha en el ON del LEFT JOIN, no en WHERE).
--   COALESCE para mostrar 0 en lugar de NULL. Solo productos
--   activos. Columnas: nombre_producto, category_id,
--   unidades_vendidas. Filtro de fecha:
--   >= '2026-05-05' AND < '2026-05-11'

-- Tu query aquí:


-- Ejercicio 11
-- CONTEXTO: Valentina quiere saber cuántos pedidos ha hecho
--   cada cliente, incluyendo los que tienen 0 pedidos.
--   Así puede segmentar: clientes nuevos (0 pedidos),
--   ocasionales (1-3) y frecuentes (4+).
-- Enunciado: Para todos los clientes, muestra su nombre
--   completo, email, país y total de pedidos. Los que tienen
--   0 pedidos deben aparecer con 0 (no NULL). Ordena por
--   total_pedidos descendente, luego por apellido.
-- Criterio: LEFT JOIN entre customers y orders.
--   COUNT(o.order_id) para que los sin pedidos den 0.
--   Columnas: nombre_completo (concatenado), email, country,
--   total_pedidos. Orden correcto.

-- Tu query aquí:


-- Ejercicio 12
-- CONTEXTO: Ana necesita verificar que todos los ítems de
--   pedidos en order_items corresponden a pedidos válidos
--   en la tabla orders (control de integridad referencial).
-- Enunciado: Retorna los ítems de order_items que NO tienen
--   un pedido correspondiente en orders (item huérfano).
--   Muestra item_id, order_id y product_id.
-- Criterio: Usa LEFT JOIN (order_items a la izquierda, orders
--   a la derecha), filtrando donde orders.order_id IS NULL.
--   La tabla de la izquierda es la que queremos auditar, y el
--   NULL en la tabla de la derecha indica que no existe pedido
--   válido para ese ítem. Alternativamente puedes resolver esto
--   con NOT EXISTS sobre orders para cada ítem de order_items.
--   Si el dataset está íntegro, la query retorna 0 filas —
--   ese resultado es válido y documéntalo con un comentario.

-- Tu query aquí:


-- ---------------------------------------------------------------
-- BLOQUE C (13-19): JOINs de 3+ tablas y FULL OUTER JOIN
-- ---------------------------------------------------------------

-- Ejercicio 13
-- CONTEXTO: Valentina necesita el top 10 de productos por
--   revenue total, con el nombre de categoría (Briefing 3.1).
-- Enunciado: Retorna los 10 productos con mayor revenue total
--   en toda la historia (SUM de quantity * unit_price).
--   Muestra nombre del producto, nombre de la categoría y
--   el revenue total. Ordena descendente.
-- Criterio: INNER JOIN entre order_items, products, categories.
--   GROUP BY por producto y categoría. TOP 10 por revenue.
--   Columnas: producto, categoria, revenue_total.

-- Tu query aquí:


-- Ejercicio 14
-- CONTEXTO: Sofía quiere analizar la campaña Día de Madres
--   2026 (5 al 10 de mayo) en detalle (Briefing 3.2). Para
--   cada categoría con ventas en esos días, necesita: revenue
--   total, total de unidades y número de pedidos distintos.
-- Enunciado: Filtra pedidos entre el 5 y el 10 de mayo de
--   2026. Para cada categoría, muestra: nombre de la categoría,
--   revenue_total, unidades_vendidas y pedidos_distintos.
--   Ordena por revenue descendente.
-- Criterio: JOIN de al menos 3 tablas (order_items, products,
--   categories, orders). GROUP BY por categoría. Filtro de
--   fecha correcto. COUNT(DISTINCT o.order_id) para pedidos.

-- Tu query aquí:


-- Ejercicio 15
-- CONTEXTO: Diego necesita el desempeño por categoría en
--   el año que va (enero-abril 2026), con revenue y unidades
--   en la misma tabla (Briefing 3.8). Solo pedidos no
--   cancelados.
-- Enunciado: Para cada categoría, muestra el nombre de la
--   categoría, revenue total y unidades vendidas en el período
--   enero-abril 2026. Excluye pedidos cancelados. Ordena por
--   revenue descendente.
-- Criterio: JOIN de 4 tablas (order_items, products,
--   categories, orders). WHERE correcto para el período y
--   el status. GROUP BY por categoría. Columnas correctas.

-- Tu query aquí:


-- Ejercicio 16
-- CONTEXTO: Valentina quiere ver un detalle completo de los
--   últimos 20 pedidos para validar la cadena de datos
--   completa (Briefing 3.10). Necesita: fecha del pedido,
--   nombre del cliente, nombre del producto, cantidad y
--   precio unitario de cada ítem.
-- Enunciado: Para los 20 pedidos más recientes, muestra
--   cada ítem con: ordered_at, nombre_cliente (first_name
--   + last_name), nombre_producto, quantity, unit_price.
--   Un pedido con múltiples ítems produce múltiples filas.
-- Criterio: JOIN de las 5 tablas. ORDER BY ordered_at DESC.
--   LIMIT por pedido: los 20 order_id más recientes, con
--   todos sus ítems. Sugerencia: filtra los 20 order_id
--   más recientes con una subquery en WHERE.

-- Tu query aquí:


-- Ejercicio 17
-- CONTEXTO: Sofía tiene la hipótesis de que quienes compran
--   tecnología también compran otras categorías (Briefing
--   3.11). Quiere saber qué categorías "acompañan" a
--   Tecnología en los mismos pedidos.
-- Enunciado: De todos los pedidos que incluyeron al menos
--   un producto de categoría "Tecnología", retorna las
--   otras categorías que aparecieron en esos mismos pedidos,
--   con el conteo de cuántas veces aparece cada una.
--   No incluyas "Tecnología" en el resultado (solo las que
--   acompañan). Ordena de más a menos frecuente.
-- Criterio: Necesitas identificar los order_id con tecnología
--   (subquery o CTE en Nivel 5), luego unirlos con otros
--   ítems de esos mismos pedidos. Al menos 4 tablas en total.
--   Columnas: categoria_acompañante, veces_aparece.

-- Tu query aquí:


-- Ejercicio 18
-- CONTEXTO: Ana quiere auditar la integridad del catálogo:
--   verificar si hay categorías sin productos o productos
--   con una categoría inexistente (auditoría bidireccional).
-- Enunciado: Usa FULL OUTER JOIN entre categories y products.
--   Muestra solo las filas "anómalas": categorías sin
--   productos y productos con categoría inválida.
--   Columnas: cat_id_en_categories, nombre_categoria,
--   prod_id_en_products, nombre_producto.
-- Criterio: FULL OUTER JOIN. WHERE con IS NULL en alguno
--   de los dos lados. Si el resultado es 0 filas, el catálogo
--   está íntegro — incluye un comentario que lo documente.

-- Tu query aquí:


-- Ejercicio 19
-- CONTEXTO: Valentina quiere ver el revenue por cliente y
--   por categoría para el análisis de Q1 2026 (enero-marzo).
--   Solo clientes de Argentina. Solo pedidos entregados.
-- Enunciado: Para cada cliente de Argentina con pedidos
--   entregados en Q1 2026, muestra su nombre, la categoría
--   de lo que compró y el revenue generado en esa categoría.
--   Un cliente puede aparecer varias veces (una por categoría).
--   Ordena por nombre_cliente y luego por revenue descendente.
-- Criterio: JOIN de las 5 tablas. WHERE filtra Argentina,
--   status='delivered' y el período Q1 2026. GROUP BY por
--   cliente y categoría. Columnas: nombre_cliente, categoria,
--   revenue_q1.

-- Tu query aquí:


-- ---------------------------------------------------------------
-- BLOQUE D (20-25): Subqueries (IN, NOT IN, EXISTS, FROM)
-- ---------------------------------------------------------------

-- Ejercicio 20
-- CONTEXTO: Sofía quiere contactar a los clientes que
--   compraron durante el Black Friday 2025 (28 de noviembre
--   de 2025) para invitarlos a una preventa exclusiva de
--   Black Friday 2026.
-- Enunciado: Retorna customer_id, first_name, last_name,
--   email y country de los clientes que realizaron al menos
--   un pedido el 28 de noviembre de 2025. Usa una subquery
--   con IN. Ordena por país y apellido.
-- Criterio: Subquery en WHERE con IN. La subquery filtra
--   orders por la fecha exacta del BF 2025. La query exterior
--   retorna datos de customers.

-- Tu query aquí:


-- Ejercicio 21
-- CONTEXTO: El equipo de producto quiere los productos que
--   NUNCA se han vendido en toda la historia de ShopSphere.
--   Son candidatos urgentes a revisión del catálogo.
-- Enunciado: Retorna product_id, nombre del producto y
--   precio de los productos activos que no aparecen en
--   ninguna fila de order_items. Usa NOT IN o NOT EXISTS.
--   Ordena por precio descendente.
-- Criterio: NOT IN o NOT EXISTS. Solo productos activos.
--   Si usas NOT IN, asegúrate de que la subquery no pueda
--   retornar NULLs. Columnas: product_id, producto, precio.

-- Tu query aquí:


-- Ejercicio 22
-- CONTEXTO: Ana quiere identificar las categorías cuyo precio
--   promedio de productos activos supera el precio promedio
--   global de todo el catálogo activo. Son las categorías
--   "premium" para el análisis de margen.
-- Enunciado: Usa una subquery escalar en HAVING o en WHERE
--   para comparar el promedio de cada categoría contra el
--   promedio global. Muestra el nombre de la categoría y
--   su precio promedio. Ordena por precio promedio descendente.
-- Criterio: La subquery calcula AVG global de products
--   (is_active = TRUE). JOIN con categories para mostrar
--   nombre (no category_id). Solo categorías con promedio
--   mayor al global. Redondeado a 2 decimales.

-- Tu query aquí:


-- Ejercicio 23
-- CONTEXTO: Valentina quiere detectar clientes que compraron
--   productos de Tecnología pero que NUNCA compraron
--   productos de Hogar. Son el segmento objetivo para una
--   campaña de cross-sell de línea de hogar.
-- Enunciado: Usa EXISTS y NOT EXISTS (o IN y NOT IN) para
--   encontrar esos clientes. Muestra customer_id, nombre
--   completo, email y país. Ordena por apellido.
-- Criterio: Dos condiciones: EXISTS (compró Tecnología) y
--   NOT EXISTS (nunca compró Hogar). Usa NOT EXISTS en lugar
--   de NOT IN para evitar la trampa de NULLs. Columnas
--   correctas con alias.

-- Tu query aquí:


-- Ejercicio 24
-- CONTEXTO: Marco quiere ver los clientes con ticket promedio
--   por pedido por encima del doble del ticket promedio global.
--   Son los "whales" de ShopSphere.
-- Enunciado: Usa una subquery en FROM para calcular el ticket
--   promedio por cliente (revenue total / pedidos). Luego
--   en la query exterior filtra los que superan el doble
--   del ticket promedio global (otra subquery escalar).
--   Muestra: customer_id, nombre_completo, total_pedidos,
--   ticket_promedio_cliente. Ordena descendente.
-- Criterio: Subquery en FROM con alias obligatorio. Segunda
--   subquery escalar para el promedio global. La query exterior
--   filtra sobre el resultado de la tabla derivada. El ticket
--   promedio por cliente se calcula como revenue total del
--   cliente dividido entre sus pedidos entregados.

-- Tu query aquí:


-- Ejercicio 25 — Integrador
-- CONTEXTO: Valentina prepara el reporte de cierre de Q1 2026
--   para presentar a Marco. Necesita el siguiente análisis:
--   Para cada categoría de producto, mostrar:
--     - nombre de la categoría
--     - revenue neto Q1 2026 (solo pedidos delivered)
--     - total de unidades vendidas Q1 2026
--     - número de clientes distintos que compraron esa categoría
--     - precio promedio de venta por unidad (revenue / unidades)
--   Solo mostrar categorías cuyo revenue neto supere los
--   $10.000 en Q1 2026.
--   Ordenar por revenue neto descendente.
-- Enunciado: Escribe la query completa usando JOIN de todas
--   las tablas necesarias, con WHERE, GROUP BY, HAVING y
--   los cálculos requeridos.
-- Criterio: Q1 2026 = enero 1 a marzo 31 de 2026. Solo
--   status = 'delivered'. HAVING revenue > 10000. 5 columnas
--   en el resultado (con alias). Precio promedio redondeado
--   a 2 decimales. Orden correcto.

-- Tu query aquí:


-- =============================================================
-- SOLUCIONES
-- (Intenta resolver los ejercicios antes de leer esto)
-- =============================================================

/*

--- Solución 01 ---
SELECT
    p.name        AS producto,
    cat.name      AS categoria,
    p.price       AS precio
FROM products p
INNER JOIN categories cat ON cat.category_id = p.category_id
WHERE p.is_active = TRUE
ORDER BY cat.name, p.price DESC;

--- Solución 02 ---
SELECT
    p.name            AS producto,
    SUM(oi.quantity)  AS unidades_vendidas
FROM order_items oi
INNER JOIN products p ON p.product_id = oi.product_id
GROUP BY p.name
ORDER BY unidades_vendidas DESC
LIMIT 1;

--- Solución 03 ---
SELECT
    p.name          AS producto,
    COUNT(oi.item_id) AS veces_en_pedidos
FROM products p
INNER JOIN order_items oi ON oi.product_id = p.product_id
GROUP BY p.name
ORDER BY veces_en_pedidos DESC;

--- Solución 04 ---
SELECT
    o.order_id,
    o.ordered_at,
    COUNT(oi.item_id) AS total_items
FROM orders o
INNER JOIN order_items oi ON oi.order_id = o.order_id
GROUP BY o.order_id, o.ordered_at
ORDER BY o.ordered_at DESC
LIMIT 20;

--- Solución 05 ---
SELECT
    p.category_id,
    ROUND(SUM(oi.quantity * oi.unit_price), 2)                    AS revenue_total,
    SUM(oi.quantity)                                               AS unidades_vendidas,
    ROUND(
        SUM(oi.quantity * oi.unit_price) / NULLIF(SUM(oi.quantity), 0),
        2
    )                                                              AS precio_promedio_por_unidad
FROM order_items oi
INNER JOIN products p ON p.product_id = oi.product_id
GROUP BY p.category_id
ORDER BY revenue_total DESC;

--- Solución 06 ---
SELECT
    o.ordered_at,
    c.first_name || ' ' || c.last_name  AS nombre_cliente,
    c.email,
    o.status
FROM orders o
INNER JOIN customers c ON c.customer_id = o.customer_id
ORDER BY o.ordered_at DESC
LIMIT 25;

--- Solución 07 ---
SELECT
    c.customer_id,
    c.first_name,
    c.last_name,
    c.email,
    c.country
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE o.order_id IS NULL
ORDER BY c.country, c.last_name;

--- Solución 08 ---
SELECT
    p.product_id,
    p.name        AS nombre_producto,
    p.category_id,
    p.price       AS precio
FROM products p
LEFT JOIN order_items oi ON oi.product_id = p.product_id
WHERE p.is_active = TRUE
  AND oi.item_id IS NULL
ORDER BY p.price DESC;

--- Solución 09 ---
SELECT
    cat.name                 AS categoria,
    COUNT(p.product_id)      AS total_productos
FROM categories cat
LEFT JOIN products p ON p.category_id = cat.category_id
                     AND p.is_active = TRUE
GROUP BY cat.name
ORDER BY total_productos DESC;

--- Solución 10 ---
SELECT
    p.name                            AS nombre_producto,
    p.category_id,
    COALESCE(SUM(oi.quantity), 0)     AS unidades_vendidas
FROM products p
LEFT JOIN order_items oi ON oi.product_id = p.product_id
                         AND oi.order_id IN (
                             SELECT order_id
                             FROM orders
                             WHERE ordered_at >= '2026-05-05'
                               AND ordered_at <  '2026-05-11'
                         )
WHERE p.is_active = TRUE
GROUP BY p.product_id, p.name, p.category_id
ORDER BY unidades_vendidas DESC;

--- Solución 11 ---
SELECT
    c.first_name || ' ' || c.last_name  AS nombre_completo,
    c.email,
    c.country,
    COUNT(o.order_id)                    AS total_pedidos
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
GROUP BY c.customer_id, c.first_name, c.last_name, c.email, c.country
ORDER BY total_pedidos DESC, c.last_name;

--- Solución 12 ---
-- Opción con LEFT JOIN:
SELECT
    oi.item_id,
    oi.order_id,
    oi.product_id
FROM order_items oi
LEFT JOIN orders o ON o.order_id = oi.order_id
WHERE o.order_id IS NULL;
-- Si retorna 0 filas, todos los ítems tienen un pedido válido (integridad correcta).

-- Opción con NOT EXISTS:
SELECT
    oi.item_id,
    oi.order_id,
    oi.product_id
FROM order_items oi
WHERE NOT EXISTS (
    SELECT 1 FROM orders o WHERE o.order_id = oi.order_id
);

--- Solución 13 ---
SELECT
    p.name                                     AS producto,
    cat.name                                   AS categoria,
    ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue_total
FROM order_items oi
INNER JOIN products   p   ON p.product_id   = oi.product_id
INNER JOIN categories cat ON cat.category_id = p.category_id
GROUP BY p.name, cat.name
ORDER BY revenue_total DESC
LIMIT 10;

--- Solución 14 ---
SELECT
    cat.name                                     AS categoria,
    ROUND(SUM(oi.quantity * oi.unit_price), 2)   AS revenue_total,
    SUM(oi.quantity)                              AS unidades_vendidas,
    COUNT(DISTINCT o.order_id)                    AS pedidos_distintos
FROM order_items oi
INNER JOIN products   p   ON p.product_id   = oi.product_id
INNER JOIN categories cat ON cat.category_id = p.category_id
INNER JOIN orders     o   ON o.order_id     = oi.order_id
WHERE o.ordered_at >= '2026-05-05'
  AND o.ordered_at <  '2026-05-11'
GROUP BY cat.name
ORDER BY revenue_total DESC;

--- Solución 15 ---
SELECT
    cat.name                                     AS categoria,
    ROUND(SUM(oi.quantity * oi.unit_price), 2)   AS revenue_total,
    SUM(oi.quantity)                              AS unidades_vendidas
FROM order_items oi
INNER JOIN products   p   ON p.product_id   = oi.product_id
INNER JOIN categories cat ON cat.category_id = p.category_id
INNER JOIN orders     o   ON o.order_id     = oi.order_id
WHERE o.ordered_at >= '2026-01-01'
  AND o.ordered_at <  '2026-05-01'
  AND o.status     <> 'cancelled'
GROUP BY cat.name
ORDER BY revenue_total DESC;

--- Solución 16 ---
SELECT
    o.ordered_at,
    c.first_name || ' ' || c.last_name  AS nombre_cliente,
    p.name                               AS nombre_producto,
    oi.quantity,
    oi.unit_price
FROM order_items oi
INNER JOIN orders     o  ON o.order_id    = oi.order_id
INNER JOIN products   p  ON p.product_id  = oi.product_id
INNER JOIN customers  c  ON c.customer_id = o.customer_id
WHERE o.order_id IN (
    SELECT order_id
    FROM orders
    ORDER BY ordered_at DESC
    LIMIT 20
)
ORDER BY o.ordered_at DESC, o.order_id, p.name;

--- Solución 17 ---
-- Identificamos los order_id con productos de Tecnología,
-- luego buscamos qué otras categorías aparecen en esos pedidos.
SELECT
    cat.name         AS categoria_acompanante,
    COUNT(*)         AS veces_aparece
FROM order_items oi
INNER JOIN products   p   ON p.product_id   = oi.product_id
INNER JOIN categories cat ON cat.category_id = p.category_id
WHERE cat.name <> 'Tecnología'
  AND oi.order_id IN (
      SELECT oi2.order_id
      FROM order_items oi2
      INNER JOIN products   p2   ON p2.product_id   = oi2.product_id
      INNER JOIN categories cat2 ON cat2.category_id = p2.category_id
      WHERE cat2.name = 'Tecnología'
  )
GROUP BY cat.name
ORDER BY veces_aparece DESC;

--- Solución 18 ---
SELECT
    cat.category_id   AS cat_id_en_categories,
    cat.name          AS nombre_categoria,
    p.product_id      AS prod_id_en_products,
    p.name            AS nombre_producto
FROM categories cat
FULL OUTER JOIN products p ON p.category_id = cat.category_id
WHERE cat.category_id IS NULL
   OR p.product_id    IS NULL
ORDER BY cat.category_id NULLS LAST, p.product_id NULLS LAST;
-- Si retorna 0 filas: catálogo íntegro — todas las categorías tienen
-- productos y todos los productos tienen categoría válida.

--- Solución 19 ---
SELECT
    c.first_name || ' ' || c.last_name       AS nombre_cliente,
    cat.name                                  AS categoria,
    ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue_q1
FROM order_items oi
INNER JOIN products   p   ON p.product_id   = oi.product_id
INNER JOIN categories cat ON cat.category_id = p.category_id
INNER JOIN orders     o   ON o.order_id     = oi.order_id
INNER JOIN customers  c   ON c.customer_id  = o.customer_id
WHERE c.country    = 'Argentina'
  AND o.status     = 'delivered'
  AND o.ordered_at >= '2026-01-01'
  AND o.ordered_at <  '2026-04-01'
GROUP BY c.customer_id, c.first_name, c.last_name, cat.name
ORDER BY nombre_cliente, revenue_q1 DESC;

--- Solución 20 ---
SELECT
    c.customer_id,
    c.first_name,
    c.last_name,
    c.email,
    c.country
FROM customers c
WHERE c.customer_id IN (
    SELECT o.customer_id
    FROM orders o
    WHERE o.ordered_at >= '2025-11-28'
      AND o.ordered_at <  '2025-11-29'
)
ORDER BY c.country, c.last_name;

--- Solución 21 ---
-- Con NOT EXISTS (forma recomendada — segura contra NULLs):
SELECT
    p.product_id,
    p.name    AS producto,
    p.price
FROM products p
WHERE p.is_active = TRUE
  AND NOT EXISTS (
      SELECT 1
      FROM order_items oi
      WHERE oi.product_id = p.product_id
  )
ORDER BY p.price DESC;

-- Con NOT IN (funciona aquí porque product_id en order_items tiene FK y no tiene NULLs,
-- pero NOT EXISTS es la práctica más robusta):
-- WHERE p.product_id NOT IN (
--     SELECT product_id FROM order_items WHERE product_id IS NOT NULL
-- )

--- Solución 22 ---
SELECT
    cat.name                  AS categoria,
    ROUND(AVG(p.price), 2)    AS precio_promedio
FROM products p
INNER JOIN categories cat ON cat.category_id = p.category_id
WHERE p.is_active = TRUE
GROUP BY cat.category_id, cat.name
HAVING AVG(p.price) > (
    SELECT AVG(price)
    FROM products
    WHERE is_active = TRUE
)
ORDER BY precio_promedio DESC;

--- Solución 23 ---
SELECT
    c.customer_id,
    c.first_name || ' ' || c.last_name  AS nombre_completo,
    c.email,
    c.country
FROM customers c
WHERE EXISTS (
    SELECT 1
    FROM orders o
    INNER JOIN order_items oi  ON oi.order_id    = o.order_id
    INNER JOIN products    p   ON p.product_id   = oi.product_id
    INNER JOIN categories  cat ON cat.category_id = p.category_id
    WHERE o.customer_id = c.customer_id
      AND cat.name = 'Tecnología'
)
AND NOT EXISTS (
    SELECT 1
    FROM orders o
    INNER JOIN order_items oi  ON oi.order_id    = o.order_id
    INNER JOIN products    p   ON p.product_id   = oi.product_id
    INNER JOIN categories  cat ON cat.category_id = p.category_id
    WHERE o.customer_id = c.customer_id
      AND cat.name = 'Hogar'
)
ORDER BY c.last_name;

--- Solución 24 ---
SELECT
    sub.customer_id,
    sub.first_name || ' ' || sub.last_name  AS nombre_completo,
    sub.total_pedidos,
    ROUND(sub.ticket_promedio, 2)            AS ticket_promedio_cliente
FROM (
    SELECT
        c.customer_id,
        c.first_name,
        c.last_name,
        COUNT(DISTINCT o.order_id)                    AS total_pedidos,
        SUM(oi.quantity * oi.unit_price)
            / NULLIF(COUNT(DISTINCT o.order_id), 0)   AS ticket_promedio
    FROM customers c
    INNER JOIN orders      o  ON o.customer_id  = c.customer_id
    INNER JOIN order_items oi ON oi.order_id    = o.order_id
    WHERE o.status = 'delivered'
    GROUP BY c.customer_id, c.first_name, c.last_name
) AS sub
WHERE sub.ticket_promedio > 2 * (
    SELECT AVG(oi2.quantity * oi2.unit_price)
    FROM order_items oi2
    INNER JOIN orders o2 ON o2.order_id = oi2.order_id
    WHERE o2.status = 'delivered'
)
ORDER BY ticket_promedio_cliente DESC;

--- Solución 25 ---
SELECT
    cat.name                                       AS categoria,
    ROUND(SUM(oi.quantity * oi.unit_price), 2)     AS revenue_neto_q1,
    SUM(oi.quantity)                               AS unidades_vendidas,
    COUNT(DISTINCT o.customer_id)                  AS clientes_distintos,
    ROUND(
        SUM(oi.quantity * oi.unit_price)
        / NULLIF(SUM(oi.quantity), 0),
        2
    )                                              AS precio_promedio_venta
FROM order_items oi
INNER JOIN products   p   ON p.product_id   = oi.product_id
INNER JOIN categories cat ON cat.category_id = p.category_id
INNER JOIN orders     o   ON o.order_id     = oi.order_id
WHERE o.status     = 'delivered'
  AND o.ordered_at >= '2026-01-01'
  AND o.ordered_at <  '2026-04-01'
GROUP BY cat.category_id, cat.name
HAVING SUM(oi.quantity * oi.unit_price) > 10000
ORDER BY revenue_neto_q1 DESC;

*/
