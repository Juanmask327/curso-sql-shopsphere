-- =============================================================
-- EJERCICIOS NIVEL 4 — Análisis de Clientes
-- ShopSphere SQL Course
-- Tablas disponibles: customers, categories, products,
--                     orders, order_items, returns
-- =============================================================
-- Contexto narrativo:
--   Llevas dos meses y medio en ShopSphere. El spike de
--   devoluciones de julio 2025 fue tu primer gran desafío.
--   Diego resolvió el problema operativo — ahora te toca hacer
--   el análisis completo que nadie hizo: quiénes devolvieron,
--   cuánto costó, qué clientes se fueron y quiénes siguieron
--   comprando. Estos ejercicios son ese análisis.
-- =============================================================


-- ---------------------------------------------------------------
-- BLOQUE A (1-6): EXISTS / NOT EXISTS
-- ---------------------------------------------------------------

-- Ejercicio 01
-- CONTEXTO: Valentina quiere saber cuáles son los clientes
--   que devolvieron algo en los últimos 12 meses y que
--   actualmente tienen al menos un pedido en estado 'pending'
--   (potencialmente van a devolver de nuevo).
-- Enunciado: Retorna customer_id, first_name, last_name,
--   email y country de los clientes que cumplen AMBAS
--   condiciones: (1) tienen al menos una devolución con
--   returned_at en los últimos 12 meses desde hoy (usa
--   '2025-07-01' como fecha de referencia, es decir, desde
--   '2024-07-01'), y (2) tienen al menos un pedido con
--   status = 'pending'. Usa EXISTS para ambas condiciones.
-- Criterio: Dos EXISTS encadenados con AND. Correlación
--   correcta en cada uno. Tablas: customers, orders, returns.

-- Tu query aquí:


-- Ejercicio 02
-- CONTEXTO: Diego necesita identificar los productos activos
--   que nunca generaron una devolución aprobada o reembolsada.
--   Para la reunión con el área de calidad, son el conjunto
--   "sin historial de problemas".
-- Enunciado: Retorna product_id, nombre del producto, nombre
--   de categoría y precio. Solo productos activos sin ninguna
--   devolución con status 'approved' o 'refunded'. Ordena
--   por precio descendente.
-- Criterio: NOT EXISTS con filtro de status en la subquery.
--   INNER JOIN con categories para el nombre. Solo is_active
--   = TRUE. Columnas: product_id, producto, categoria, precio.

-- Tu query aquí:


-- Ejercicio 03
-- CONTEXTO: Valentina quiere segmentar los clientes en
--   "sin fricciones": clientes que tienen al menos un pedido
--   entregado Y que nunca registraron ninguna devolución.
--   Son el segmento más valioso y estable.
-- Enunciado: Retorna customer_id, first_name, last_name,
--   email y country. Usa EXISTS para la condición de pedido
--   entregado y NOT EXISTS para la ausencia de devoluciones.
--   Ordena por country y last_name.
-- Criterio: EXISTS verifica status = 'delivered'. NOT EXISTS
--   verifica ausencia en returns (a través de orders). La
--   correlación de NOT EXISTS pasa por orders para llegar
--   al customer_id.

-- Tu query aquí:


-- Ejercicio 04
-- CONTEXTO: Marco quiere saber cuántos clientes que tuvieron
--   una devolución aprobada o reembolsada en los últimos 12
--   meses (desde '2024-07-01') NO realizaron ningún pedido
--   DESPUÉS de esa devolución. Esos son los clientes que
--   perdimos por el problema de calidad.
-- Enunciado: Retorna customer_id, first_name, last_name,
--   email y country de los clientes que:
--   (1) tuvieron una devolución con status IN ('approved',
--       'refunded') y returned_at >= '2024-07-01'
--   (2) NO tienen ningún pedido con ordered_at posterior a
--       su última devolución (MAX de returned_at).
--   Ordena por last_name.
-- Criterio: Requiere calcular la fecha de última devolución
--   por cliente. Usa una subquery en FROM o correlacionada.
--   NOT EXISTS para verificar ausencia de pedidos posteriores.

-- Tu query aquí:


-- Ejercicio 05
-- CONTEXTO: Sofía quiere lanzar una campaña de cross-sell
--   de calzado hacia clientes de alto valor que todavía no
--   compraron en esa categoría. Solo clientes que hayan
--   gastado más de $500 en total y que nunca hayan comprado
--   productos de la categoría 'Calzado'.
-- Enunciado: Retorna customer_id, first_name, last_name,
--   email, country y su revenue histórico total. Filtra:
--   (1) revenue total > 500, y (2) NOT EXISTS compra en
--   categoría 'Calzado'. Ordena por revenue descendente.
-- Criterio: Revenue calculado en subquery o con GROUP BY +
--   HAVING. NOT EXISTS correlacionado para verificar ausencia
--   de compras en Calzado. JOIN completo de products y
--   categories dentro del NOT EXISTS.

-- Tu query aquí:


-- Ejercicio 06
-- CONTEXTO: Diego quiere identificar los pedidos que tienen
--   al menos un ítem devuelto con status 'pending' (devolución
--   pendiente de resolución). Son pedidos que necesitan
--   atención del equipo de operaciones.
-- Enunciado: Retorna order_id, ordered_at, el nombre del
--   cliente y el status del pedido. Solo pedidos que tienen
--   al menos un return con status = 'pending'. Ordena por
--   ordered_at descendente.
-- Criterio: EXISTS con correlación por order_id en returns.
--   JOIN con customers para el nombre. El EXISTS verifica
--   status = 'pending' en returns.

-- Tu query aquí:


-- ---------------------------------------------------------------
-- BLOQUE B (7-12): UNION / INTERSECT / EXCEPT
-- ---------------------------------------------------------------

-- Ejercicio 07
-- CONTEXTO: Sofía construye la lista de clientes para la
--   campaña de recuperación de Q4 2025. Los "perdidos" son
--   los que compraron en Q3 2025 (jul-sep) pero no en Q4
--   (oct-dic). Excluye pedidos cancelados.
-- Enunciado: Retorna customer_id, first_name, last_name,
--   email y country de los clientes que compraron en Q3
--   2025 pero no en Q4 2025. Ordena por country y last_name.
-- Criterio: EXCEPT entre dos subqueries de orders filtradas
--   por período. El resultado se usa con IN sobre customers.
--   Pedidos cancelados excluidos (status <> 'cancelled').

-- Tu query aquí:


-- Ejercicio 08
-- CONTEXTO: Sofía completa el análisis de retención: ahora
--   necesita los clientes que sí compraron en AMBOS
--   trimestres (Q3 y Q4 2025). Son los retenidos. Excluye
--   pedidos cancelados.
-- Enunciado: Retorna customer_id, first_name, last_name,
--   email y country. Solo clientes presentes en Q3 Y en Q4.
--   Ordena por country y last_name.
-- Criterio: INTERSECT entre dos subqueries de orders. Sin
--   pedidos cancelados. El resultado se usa con IN sobre
--   customers.

-- Tu query aquí:


-- Ejercicio 09
-- CONTEXTO: El equipo directivo quiere la foto completa de
--   retención Q3-Q4: una sola tabla con todos los clientes
--   de Q3 2025, etiquetados como 'retenido' o 'perdido'.
-- Enunciado: Retorna customer_id, first_name, last_name,
--   email, country y una columna 'segmento' que diga
--   'retenido' (si compró en Q3 y Q4) o 'perdido' (si
--   compró en Q3 pero no en Q4). Usa UNION ALL.
--   Ordena por segmento y last_name.
-- Criterio: UNION ALL de dos bloques. Primer bloque usa
--   INTERSECT internamente para los retenidos. Segundo bloque
--   usa EXCEPT para los perdidos. La columna 'segmento' es
--   un literal de texto en cada rama.

-- Tu query aquí:


-- Ejercicio 10
-- CONTEXTO: Ana necesita una lista consolidada de clientes
--   "de riesgo": los que devolvieron en julio 2025 UNIDA con
--   los que no compraron en ninguno de los últimos 6 meses
--   (enero-junio 2026). Son los que necesitan más atención.
--   Un cliente puede aparecer en ambos grupos — en ese caso
--   debe aparecer UNA sola vez, con la etiqueta 'ambos'.
-- Enunciado: Retorna customer_id, first_name, last_name,
--   email, country y una columna que diga 'devolucion_julio',
--   'inactivo_6m', o 'ambos' según corresponda. Ordena por
--   la columna de motivo y luego por last_name.
-- Pista: Este ejercicio es más difícil. Una estrategia es
--   crear dos conjuntos con UNION ALL, luego agregar sobre
--   el resultado para detectar los que aparecen en ambos
--   y asignar la etiqueta final con CASE WHEN.
-- Criterio: No hay duplicados en el resultado. La etiqueta
--   es correcta según las condiciones. La inactividad es en
--   los últimos 6 meses (2026-01-01 a 2026-06-30).

-- Tu query aquí:


-- Ejercicio 11
-- CONTEXTO: Diego quiere auditar si hay products que tienen
--   devoluciones en returns pero NO aparecen como activos en
--   products (podría haber productos descontinuados con
--   devoluciones históricas, lo cual es válido, o podría
--   haber referencias huérfanas).
-- Enunciado: Usa EXCEPT para encontrar product_id que
--   aparecen en returns pero no en la tabla products. Si
--   no hay ninguno, el resultado tiene 0 filas — es válido
--   y documéntalo con un comentario. Retorna solo product_id.
-- Criterio: EXCEPT entre dos SELECT de una sola columna
--   (product_id). Si el resultado es vacío, el dataset
--   está íntegro. Incluye un comentario que lo documente.

-- Tu query aquí:


-- Ejercicio 12 — Integrador de Bloque B
-- CONTEXTO: Valentina necesita tres números para la reunión
--   de lunes: cuántos clientes compraron solo en Q3, cuántos
--   solo en Q4, y cuántos en ambos trimestres. Sin pedidos
--   cancelados.
-- Enunciado: Retorna una tabla de tres filas con dos
--   columnas: 'segmento' y 'cantidad_clientes'. Los
--   segmentos son: 'solo_q3', 'solo_q4', 'ambos_trimestres'.
-- Pista: Tres bloques de SELECT con UNION ALL. Cada bloque
--   calcula su COUNT usando la lógica de conjuntos correcta.
--   Para 'solo_q3': Q3 EXCEPT Q4. Para 'solo_q4': Q4
--   EXCEPT Q3. Para 'ambos': Q3 INTERSECT Q4.
-- Criterio: Tres filas en el resultado. Los tres COUNT son
--   correctos (puedes verificar que solo_q3 + solo_q4 +
--   ambos = total de clientes activos en Q3 o Q4).

-- Tu query aquí:


-- ---------------------------------------------------------------
-- BLOQUE C (13-19): COALESCE, NULLIF, IS NULL,
--                   NULLs en agregaciones
-- ---------------------------------------------------------------

-- Ejercicio 13
-- CONTEXTO: Diego pide el listado de devoluciones con el
--   motivo legible. Donde reason es NULL debe aparecer el
--   texto 'Sin motivo registrado'. Ordena por returned_at
--   descendente. Solo las 30 más recientes.
-- Enunciado: Retorna return_id, order_id, product_id,
--   returned_at, status y el motivo (con COALESCE para los
--   NULL). Las 30 más recientes.
-- Criterio: COALESCE sobre reason. Sin filtro de NULL —
--   todas las devoluciones aparecen, solo con el texto
--   de reemplazo cuando corresponda. LIMIT 30.

-- Tu query aquí:


-- Ejercicio 14
-- CONTEXTO: Valentina quiere saber cuántas devoluciones
--   tienen motivo registrado y cuántas no, con el porcentaje
--   de cada grupo. El resultado es una sola fila.
-- Enunciado: Retorna cuatro columnas: total_devoluciones,
--   con_motivo, sin_motivo y pct_sin_motivo (porcentaje de
--   las que no tienen motivo, redondeado a 1 decimal).
-- Criterio: COUNT(*) vs COUNT(reason) para la diferencia.
--   NULLIF en el denominador del porcentaje (práctica
--   defensiva). Una sola fila de resultado.

-- Tu query aquí:


-- Ejercicio 15
-- CONTEXTO: Ana necesita la tasa de devolución por categoría
--   en toda la historia. Si una categoría no tiene ninguna
--   venta registrada (lo cual es raro pero posible), su tasa
--   debe aparecer como NULL — no como error.
-- Enunciado: Para cada categoría: nombre, items_vendidos,
--   items_devueltos y tasa_devolucion_pct (redondeada a 2
--   decimales). Si items_vendidos es 0, la tasa es NULL.
--   Ordena por tasa descendente, NULLs al final.
-- Criterio: NULLIF en el denominador de la tasa. LEFT JOIN
--   desde categories hacia products y order_items para
--   preservar categorías sin ventas. COUNT(DISTINCT) para
--   evitar doble conteo. ORDER BY ... NULLS LAST.

-- Tu query aquí:


-- Ejercicio 16
-- CONTEXTO: Diego quiere el reporte de devoluciones con el
--   nombre del cliente y el producto devuelto. Si el motivo
--   es NULL, que aparezca 'No especificado'. Si el status
--   es 'pending', que aparezca como 'Pendiente de revisión';
--   si es 'approved', 'Aprobada'; 'rejected', 'Rechazada';
--   'refunded', 'Reembolsada'. Cualquier otro valor: 'Estado
--   desconocido'.
-- Enunciado: Retorna return_id, returned_at, nombre del
--   cliente, nombre del producto, motivo (con COALESCE) y
--   status_legible (con CASE WHEN ... ELSE). Ordena por
--   returned_at DESC y, si hay empate de fecha, por return_id
--   DESC. Limita a 20 filas.
-- Criterio: COALESCE sobre reason. CASE WHEN con ELSE
--   explícito. JOIN de customers a través de orders. JOIN
--   con products para el nombre del producto.

-- Tu query aquí:


-- Ejercicio 17
-- CONTEXTO: Valentina quiere ver la última fecha de compra
--   de cada cliente y cuánto tiempo lleva sin comprar.
--   Para los clientes que nunca compraron, la fecha debe
--   aparecer como NULL y los días como NULL (no como error).
-- Enunciado: Para todos los clientes, retorna: customer_id,
--   nombre completo, email, última_compra (MAX de ordered_at,
--   puede ser NULL), y dias_sin_comprar (diferencia en días
--   entre '2026-06-01' y la última compra). Si nunca compró,
--   ambas columnas son NULL. Ordena por dias_sin_comprar
--   descendente NULLS LAST.
-- Criterio: LEFT JOIN entre customers y orders. MAX sobre
--   ordered_at (retorna NULL si no hay pedidos — comportamiento
--   correcto). El cálculo de días puede ser NULL cuando
--   última_compra es NULL — no uses COALESCE para eso,
--   deja el NULL como está. NULLS LAST en el ORDER BY.

-- Tu query aquí:


-- Ejercicio 18
-- CONTEXTO: Ana está cerrando el análisis financiero. Necesita
--   el ticket promedio por cliente, pero solo sobre pedidos
--   entregados. Si un cliente no tiene pedidos entregados,
--   su ticket promedio debe ser NULL (no aparecer como 0).
--   Y necesita identificar los clientes cuyo ticket promedio
--   no pudo calcularse (porque no tienen pedidos entregados).
-- Enunciado: Para todos los clientes, retorna: customer_id,
--   nombre completo, pedidos_entregados (COUNT), y
--   ticket_promedio (AVG de quantity*unit_price sobre pedidos
--   entregados, NULL si no hay). Separa en dos columnas:
--   ticket_promedio y tiene_historial ('Si'/'No' según si
--   tiene algún pedido entregado). Ordena por ticket_promedio
--   DESC NULLS LAST.
-- Criterio: LEFT JOIN. Filtro de status en el ON del LEFT
--   JOIN (no en WHERE) para preservar todos los clientes.
--   CASE WHEN para la columna 'tiene_historial'.

-- Tu query aquí:


-- Ejercicio 19 — Integrador de Bloque C
-- CONTEXTO: Diego necesita el informe de calidad de datos
--   de la tabla returns: cuántos campos están completos,
--   cuántos tienen NULLs en cada columna importante, y el
--   porcentaje de completitud de cada uno.
-- Enunciado: Retorna una tabla con tres columnas: campo,
--   total_registros, con_valor, sin_valor (NULLs) y
--   pct_completitud. Los campos a auditar son: reason,
--   status (normalmente no tendría NULLs por el CHECK
--   constraint, pero inclúyelo igual), returned_at.
-- Pista: Usa UNION ALL para combinar los tres análisis
--   en una sola tabla de resultado. Cada fila del resultado
--   corresponde a un campo de la tabla.
-- Criterio: UNION ALL de tres SELECT. Cada SELECT tiene
--   la misma estructura de columnas. COUNT(*) vs COUNT(campo)
--   para calcular con_valor. NULLIF en el denominador.
--   Columnas con alias correctos y consistentes.

-- Tu query aquí:


-- ---------------------------------------------------------------
-- BLOQUE D (20-25): Análisis de returns
--   El spike de julio 2025, tasa por categoría,
--   clientes afectados y comportamiento post-devolución
-- ---------------------------------------------------------------

-- Ejercicio 20
-- CONTEXTO (Briefing 4.1): Diego necesita la lista de
--   clientes que tuvieron devoluciones en julio 2025, con
--   nombre, email, país y conteo de devoluciones ese mes.
--   Solo los que devolvieron — no el universo de clientes.
-- Enunciado: Retorna nombre_cliente (first_name + last_name),
--   email, country y devoluciones_julio. Ordena por
--   devoluciones_julio DESC, luego last_name.
-- Criterio: JOIN de customers → orders → returns. Filtro
--   de returned_at en julio 2025. GROUP BY por cliente.
--   COUNT de devoluciones. Solo filas con al menos 1.

-- Tu query aquí:


-- Ejercicio 21
-- CONTEXTO (Briefing 4.2): Diego audita los registros sin
--   motivo. Necesita la lista de devoluciones donde reason
--   IS NULL: return_id, order_id, product_id, returned_at
--   y status. Ordena por fecha, más reciente primero.
--   También necesita el total de esos registros.
-- Enunciado: Retorna las columnas indicadas más una columna
--   adicional 'total_sin_motivo' que muestre el conteo total
--   de devoluciones sin motivo en TODAS las filas (no agrupado
--   — es el mismo número en cada fila, como referencia).
-- Criterio: IS NULL. La columna del total usa una subquery
--   escalar en el SELECT. Orden correcto.

-- Tu query aquí:


-- Ejercicio 22
-- CONTEXTO (Briefing 4.7): Ana cierra el análisis de Q3
--   2025. Necesita el revenue perdido por devoluciones con
--   status = 'refunded' en julio-septiembre 2025, por
--   categoría. Las categorías sin reembolsos en ese período
--   muestran 0.00 — no deben desaparecer.
-- Enunciado: Retorna categoria y revenue_reembolsado_q3
--   (redondeado a 2 decimales). Todas las categorías.
--   Las sin reembolsos muestran 0.00. Ordena por revenue
--   reembolsado descendente.
-- Criterio: LEFT JOIN con el filtro de status y fecha en
--   el ON (no en WHERE). COALESCE para el 0.00. JOIN de
--   categories → products → order_items → returns.

-- Tu query aquí:


-- Ejercicio 23
-- CONTEXTO (Briefing 4.5): Valentina necesita la lista de
--   clientes sin fricciones: al menos un pedido completado
--   (status = 'delivered') y NUNCA ninguna devolución.
--   Son los clientes más estables del portafolio.
-- Enunciado: Retorna nombre completo, email, country y
--   total de pedidos entregados (COUNT de orders con
--   status = 'delivered'). Ordena por total_pedidos_
--   entregados descendente, luego last_name.
-- Criterio: NOT EXISTS para la ausencia de devoluciones
--   (a través de orders). GROUP BY + HAVING COUNT(...) > 0
--   para asegurar que tienen al menos un pedido entregado.
--   O alternativamente, un EXISTS para el pedido entregado
--   más NOT EXISTS para la devolución.

-- Tu query aquí:


-- Ejercicio 24
-- CONTEXTO (Briefings 4.11 y 4.12): Marco quiere los dos
--   lados del comportamiento post-devolución:
--   (a) Clientes que devolvieron en los últimos 12 meses
--       (desde '2024-07-01') y NO volvieron a comprar después
--   (b) Clientes que devolvieron en ese período y SÍ volvieron
--   Una sola tabla con ambos segmentos, etiquetados.
-- Enunciado: Retorna customer_id, nombre_cliente, email,
--   country y segmento ('no_volvio' o 'si_volvio'). Ordena
--   por segmento y country.
-- Pista: Para detectar si volvieron a comprar DESPUÉS de
--   su última devolución, necesitas la fecha máxima de
--   devolución por cliente y comparar con ordered_at de
--   pedidos posteriores.
-- Criterio: UNION ALL de dos bloques. Cada bloque usa
--   EXISTS o NOT EXISTS para verificar si hay pedidos
--   posteriores a la última devolución.

-- Tu query aquí:


-- Ejercicio 25 — Integrador del Nivel 4
-- CONTEXTO: Valentina prepara el reporte ejecutivo de
--   devoluciones para Marco. Necesita el análisis completo
--   del spike de julio 2025:
--
--   Para cada categoría de producto:
--     - nombre_categoria
--     - items_vendidos_julio: total de ítems vendidos
--       en julio 2025 (todos los pedidos, no cancelados)
--     - items_devueltos_julio: total de ítems devueltos
--       en julio 2025 (cualquier status de return)
--     - tasa_devolucion_pct: porcentaje de ítems devueltos
--       sobre ítems vendidos (NULLIF en denominador)
--     - revenue_reembolsado_julio: SUM del valor de ítems
--       con devolución 'refunded' en julio 2025
--     - top_producto_devuelto: nombre del producto con más
--       devoluciones en julio 2025 en esa categoría
--       (puede ser una subquery correlacionada)
--
--   Ordenar por tasa_devolucion_pct descendente, NULLS LAST.
--   Solo categorías con al menos 1 venta en julio 2025.
--
-- Criterio: JOIN de las 6 tablas. Filtros de fecha en julio
--   2025 aplicados correctamente. NULLIF en la tasa. La
--   columna top_producto_devuelto usa una subquery
--   correlacionada. HAVING para excluir categorías sin ventas.
--   Orden correcto.

-- Tu query aquí:


-- =============================================================
-- SOLUCIONES
-- (Intenta resolver los ejercicios antes de leer esto)
-- =============================================================

/*

--- Solución 01 ---
SELECT
    c.customer_id,
    c.first_name,
    c.last_name,
    c.email,
    c.country
FROM customers c
WHERE EXISTS (
    -- condición 1: devolución en los últimos 12 meses
    SELECT 1
    FROM returns r
    INNER JOIN orders o ON o.order_id = r.order_id
    WHERE o.customer_id  = c.customer_id
      AND r.returned_at >= '2024-07-01'
)
AND EXISTS (
    -- condición 2: al menos un pedido pendiente
    SELECT 1
    FROM orders o2
    WHERE o2.customer_id = c.customer_id
      AND o2.status      = 'pending'
)
ORDER BY c.last_name;

--- Solución 02 ---
SELECT
    p.product_id,
    p.name      AS producto,
    cat.name    AS categoria,
    p.price     AS precio
FROM products p
INNER JOIN categories cat ON cat.category_id = p.category_id
WHERE p.is_active = TRUE
  AND NOT EXISTS (
      SELECT 1
      FROM returns r
      WHERE r.product_id = p.product_id
        AND r.status IN ('approved', 'refunded')
  )
ORDER BY p.price DESC;

--- Solución 03 ---
SELECT
    c.customer_id,
    c.first_name,
    c.last_name,
    c.email,
    c.country
FROM customers c
WHERE EXISTS (
    -- tiene al menos un pedido entregado
    SELECT 1
    FROM orders o
    WHERE o.customer_id = c.customer_id
      AND o.status      = 'delivered'
)
AND NOT EXISTS (
    -- nunca devolvió nada
    SELECT 1
    FROM returns r
    INNER JOIN orders o2 ON o2.order_id = r.order_id
    WHERE o2.customer_id = c.customer_id
)
ORDER BY c.country, c.last_name;

--- Solución 04 ---
SELECT
    c.customer_id,
    c.first_name,
    c.last_name,
    c.email,
    c.country
FROM customers c
WHERE EXISTS (
    -- tuvo una devolución aprobada/reembolsada en los últimos 12 meses
    SELECT 1
    FROM returns r
    INNER JOIN orders o ON o.order_id = r.order_id
    WHERE o.customer_id = c.customer_id
      AND r.status IN ('approved', 'refunded')
      AND r.returned_at >= '2024-07-01'
)
AND NOT EXISTS (
    -- NO tiene ningún pedido posterior a su última devolución
    SELECT 1
    FROM orders o2
    WHERE o2.customer_id = c.customer_id
      AND o2.ordered_at > (
          -- última devolución del cliente
          SELECT MAX(r2.returned_at)
          FROM returns r2
          INNER JOIN orders o3 ON o3.order_id = r2.order_id
          WHERE o3.customer_id = c.customer_id
            AND r2.status IN ('approved', 'refunded')
            AND r2.returned_at >= '2024-07-01'
      )
      AND o2.status <> 'cancelled'
)
ORDER BY c.last_name;

--- Solución 05 ---
SELECT
    c.customer_id,
    c.first_name,
    c.last_name,
    c.email,
    c.country,
    ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue_historico
FROM customers c
INNER JOIN orders      o  ON o.customer_id = c.customer_id
INNER JOIN order_items oi ON oi.order_id   = o.order_id
WHERE NOT EXISTS (
    -- nunca compró en la categoría 'Calzado'
    SELECT 1
    FROM orders      o2
    INNER JOIN order_items oi2  ON oi2.order_id    = o2.order_id
    INNER JOIN products    p2   ON p2.product_id   = oi2.product_id
    INNER JOIN categories  cat2 ON cat2.category_id = p2.category_id
    WHERE o2.customer_id = c.customer_id
      AND cat2.name = 'Calzado'
)
GROUP BY c.customer_id, c.first_name, c.last_name, c.email, c.country
HAVING SUM(oi.quantity * oi.unit_price) > 500
ORDER BY revenue_historico DESC;

--- Solución 06 ---
SELECT
    o.order_id,
    o.ordered_at,
    c.first_name || ' ' || c.last_name AS nombre_cliente,
    o.status
FROM orders o
INNER JOIN customers c ON c.customer_id = o.customer_id
WHERE EXISTS (
    SELECT 1
    FROM returns r
    WHERE r.order_id = o.order_id
      AND r.status   = 'pending'
)
ORDER BY o.ordered_at DESC;

--- Solución 07 ---
SELECT
    c.customer_id,
    c.first_name,
    c.last_name,
    c.email,
    c.country
FROM customers c
WHERE c.customer_id IN (
    -- compraron en Q3 2025
    SELECT DISTINCT o.customer_id
    FROM orders o
    WHERE o.ordered_at >= '2025-07-01'
      AND o.ordered_at <  '2025-10-01'
      AND o.status     <> 'cancelled'

    EXCEPT

    -- pero NO en Q4 2025
    SELECT DISTINCT o.customer_id
    FROM orders o
    WHERE o.ordered_at >= '2025-10-01'
      AND o.ordered_at <  '2026-01-01'
      AND o.status     <> 'cancelled'
)
ORDER BY c.country, c.last_name;

--- Solución 08 ---
SELECT
    c.customer_id,
    c.first_name,
    c.last_name,
    c.email,
    c.country
FROM customers c
WHERE c.customer_id IN (
    -- compraron en Q3 2025
    SELECT DISTINCT o.customer_id
    FROM orders o
    WHERE o.ordered_at >= '2025-07-01'
      AND o.ordered_at <  '2025-10-01'
      AND o.status     <> 'cancelled'

    INTERSECT

    -- Y también en Q4 2025
    SELECT DISTINCT o.customer_id
    FROM orders o
    WHERE o.ordered_at >= '2025-10-01'
      AND o.ordered_at <  '2026-01-01'
      AND o.status     <> 'cancelled'
)
ORDER BY c.country, c.last_name;

--- Solución 09 ---
SELECT
    c.customer_id,
    c.first_name,
    c.last_name,
    c.email,
    c.country,
    'retenido' AS segmento
FROM customers c
WHERE c.customer_id IN (
    SELECT DISTINCT o.customer_id FROM orders o
    WHERE o.ordered_at >= '2025-07-01' AND o.ordered_at < '2025-10-01'
      AND o.status <> 'cancelled'
    INTERSECT
    SELECT DISTINCT o.customer_id FROM orders o
    WHERE o.ordered_at >= '2025-10-01' AND o.ordered_at < '2026-01-01'
      AND o.status <> 'cancelled'
)

UNION ALL

SELECT
    c.customer_id,
    c.first_name,
    c.last_name,
    c.email,
    c.country,
    'perdido' AS segmento
FROM customers c
WHERE c.customer_id IN (
    SELECT DISTINCT o.customer_id FROM orders o
    WHERE o.ordered_at >= '2025-07-01' AND o.ordered_at < '2025-10-01'
      AND o.status <> 'cancelled'
    EXCEPT
    SELECT DISTINCT o.customer_id FROM orders o
    WHERE o.ordered_at >= '2025-10-01' AND o.ordered_at < '2026-01-01'
      AND o.status <> 'cancelled'
)

ORDER BY segmento, last_name;

--- Solución 10 ---
-- Estrategia: crear los dos conjuntos con etiquetas, hacer UNION ALL,
-- luego agregar para detectar los que aparecen en ambos.
--
-- NOTA IMP-13: MAX(motivo) retorna el valor lexicográficamente mayor del conjunto.
-- Esta lógica asume que 'devolucion_julio' es el valor más alto en orden ASCII
-- dentro del dominio posible {'devolucion_julio', 'inactivo_6m'}.
-- Si se agregan nuevos valores de motivo al sistema (por ejemplo 'fraude', que
-- lexicográficamente es mayor a 'devolucion_julio'), la lógica producirá
-- resultados silenciosamente incorrectos sin ningún error visible.
-- Una alternativa más robusta y explícita es:
--   BOOL_OR(motivo = 'devolucion_julio')  -- TRUE si alguna fila tiene ese motivo
-- o: COUNT(CASE WHEN motivo = 'devolucion_julio' THEN 1 END) > 0
-- La solución con MAX es válida para este dataset específico pero frágil en general.
SELECT
    customer_id,
    first_name,
    last_name,
    email,
    country,
    CASE WHEN COUNT(*) = 2 THEN 'ambos'
         WHEN MAX(motivo) = 'devolucion_julio' THEN 'devolucion_julio'
         ELSE 'inactivo_6m'
    END AS segmento
FROM (
    -- Conjunto 1: devolvieron en julio 2025
    SELECT
        c.customer_id, c.first_name, c.last_name, c.email, c.country,
        'devolucion_julio' AS motivo
    FROM customers c
    WHERE EXISTS (
        SELECT 1 FROM returns r
        INNER JOIN orders o ON o.order_id = r.order_id
        WHERE o.customer_id = c.customer_id
          AND r.returned_at >= '2025-07-01'
          AND r.returned_at <  '2025-08-01'
    )

    UNION ALL

    -- Conjunto 2: inactivos últimos 6 meses (ene-jun 2026)
    SELECT
        c.customer_id, c.first_name, c.last_name, c.email, c.country,
        'inactivo_6m' AS motivo
    FROM customers c
    WHERE NOT EXISTS (
        SELECT 1 FROM orders o
        WHERE o.customer_id = c.customer_id
          AND o.ordered_at >= '2026-01-01'
          AND o.ordered_at <  '2026-07-01'
          AND o.status     <> 'cancelled'
    )
) AS combinado
GROUP BY customer_id, first_name, last_name, email, country
ORDER BY segmento, last_name;

--- Solución 11 ---
SELECT r.product_id
FROM returns r

EXCEPT

SELECT p.product_id
FROM products p;

-- Si retorna 0 filas: todos los product_id en returns tienen
-- un producto válido en la tabla products (integridad correcta).

--- Solución 12 ---
SELECT 'solo_q3'           AS segmento,
       COUNT(*)            AS cantidad_clientes
FROM (
    SELECT DISTINCT o.customer_id FROM orders o
    WHERE o.ordered_at >= '2025-07-01' AND o.ordered_at < '2025-10-01'
      AND o.status <> 'cancelled'
    EXCEPT
    SELECT DISTINCT o.customer_id FROM orders o
    WHERE o.ordered_at >= '2025-10-01' AND o.ordered_at < '2026-01-01'
      AND o.status <> 'cancelled'
) AS solo_q3

UNION ALL

SELECT 'solo_q4',
       COUNT(*)
FROM (
    SELECT DISTINCT o.customer_id FROM orders o
    WHERE o.ordered_at >= '2025-10-01' AND o.ordered_at < '2026-01-01'
      AND o.status <> 'cancelled'
    EXCEPT
    SELECT DISTINCT o.customer_id FROM orders o
    WHERE o.ordered_at >= '2025-07-01' AND o.ordered_at < '2025-10-01'
      AND o.status <> 'cancelled'
) AS solo_q4

UNION ALL

SELECT 'ambos_trimestres',
       COUNT(*)
FROM (
    SELECT DISTINCT o.customer_id FROM orders o
    WHERE o.ordered_at >= '2025-07-01' AND o.ordered_at < '2025-10-01'
      AND o.status <> 'cancelled'
    INTERSECT
    SELECT DISTINCT o.customer_id FROM orders o
    WHERE o.ordered_at >= '2025-10-01' AND o.ordered_at < '2026-01-01'
      AND o.status <> 'cancelled'
) AS ambos;

--- Solución 13 ---
SELECT
    r.return_id,
    r.order_id,
    r.product_id,
    r.returned_at,
    r.status,
    COALESCE(r.reason, 'Sin motivo registrado') AS motivo
FROM returns r
ORDER BY r.returned_at DESC
LIMIT 30;

--- Solución 14 ---
SELECT
    COUNT(*)                                                    AS total_devoluciones,
    COUNT(reason)                                               AS con_motivo,
    COUNT(*) - COUNT(reason)                                    AS sin_motivo,
    ROUND(
        (COUNT(*) - COUNT(reason)) * 100.0
        / NULLIF(COUNT(*), 0),
        1
    )                                                           AS pct_sin_motivo
FROM returns;

--- Solución 15 ---
SELECT
    cat.name                                            AS categoria,
    COUNT(DISTINCT oi.item_id)                          AS items_vendidos,
    COUNT(DISTINCT r.return_id)                         AS items_devueltos,
    ROUND(
        COUNT(DISTINCT r.return_id) * 100.0
        / NULLIF(COUNT(DISTINCT oi.item_id), 0),
        2
    )                                                   AS tasa_devolucion_pct
FROM categories cat
LEFT JOIN products    p  ON p.category_id  = cat.category_id
LEFT JOIN order_items oi ON oi.product_id  = p.product_id
LEFT JOIN returns     r  ON r.product_id   = p.product_id
                         AND r.order_id    = oi.order_id
GROUP BY cat.category_id, cat.name
ORDER BY tasa_devolucion_pct DESC NULLS LAST;

--- Solución 16 ---
SELECT
    r.return_id,
    r.returned_at,
    c.first_name || ' ' || c.last_name          AS nombre_cliente,
    p.name                                       AS nombre_producto,
    COALESCE(r.reason, 'No especificado')        AS motivo,
    CASE
        WHEN r.status = 'pending'  THEN 'Pendiente de revisión'
        WHEN r.status = 'approved' THEN 'Aprobada'
        WHEN r.status = 'rejected' THEN 'Rechazada'
        WHEN r.status = 'refunded' THEN 'Reembolsada'
        ELSE 'Estado desconocido'
    END                                          AS status_legible
FROM returns r
INNER JOIN orders    o   ON o.order_id    = r.order_id
INNER JOIN customers c   ON c.customer_id = o.customer_id
INNER JOIN products  p   ON p.product_id  = r.product_id
ORDER BY r.returned_at DESC, r.return_id DESC
LIMIT 20;

--- Solución 17 ---
SELECT
    c.customer_id,
    c.first_name || ' ' || c.last_name                       AS nombre_completo,
    c.email,
    MAX(o.ordered_at)                                         AS ultima_compra,
    CASE
        WHEN MAX(o.ordered_at) IS NOT NULL
        THEN CAST('2026-06-01' AS DATE) - CAST(MAX(o.ordered_at) AS DATE)
    END                                                       AS dias_sin_comprar
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
GROUP BY c.customer_id, c.first_name, c.last_name, c.email
ORDER BY dias_sin_comprar DESC NULLS LAST;

-- Nota: la diferencia de fechas en PostgreSQL puede usarse directamente
-- entre tipos DATE (retorna INTEGER de días). Si ordered_at es TIMESTAMP,
-- CAST a DATE primero para obtener días completos.

--- Solución 18 ---
SELECT
    c.customer_id,
    c.first_name || ' ' || c.last_name          AS nombre_completo,
    COUNT(o.order_id)                            AS pedidos_entregados,
    ROUND(AVG(oi.quantity * oi.unit_price), 2)  AS ticket_promedio,
    CASE
        WHEN COUNT(o.order_id) > 0 THEN 'Si'
        ELSE 'No'
    END                                          AS tiene_historial
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
                   AND o.status = 'delivered'   -- filtro en el ON preserva todos los clientes
LEFT JOIN order_items oi ON oi.order_id = o.order_id
GROUP BY c.customer_id, c.first_name, c.last_name
ORDER BY ticket_promedio DESC NULLS LAST;

--- Solución 19 ---
SELECT
    'reason'         AS campo,
    COUNT(*)         AS total_registros,
    COUNT(reason)    AS con_valor,
    COUNT(*) - COUNT(reason) AS sin_valor,
    ROUND(COUNT(reason) * 100.0 / NULLIF(COUNT(*), 0), 1) AS pct_completitud
FROM returns

UNION ALL

SELECT
    'status',
    COUNT(*),
    COUNT(status),
    COUNT(*) - COUNT(status),
    ROUND(COUNT(status) * 100.0 / NULLIF(COUNT(*), 0), 1)
FROM returns

UNION ALL

SELECT
    'returned_at',
    COUNT(*),
    COUNT(returned_at),
    COUNT(*) - COUNT(returned_at),
    ROUND(COUNT(returned_at) * 100.0 / NULLIF(COUNT(*), 0), 1)
FROM returns;

--- Solución 20 ---
SELECT
    c.first_name || ' ' || c.last_name   AS nombre_cliente,
    c.email,
    c.country,
    COUNT(r.return_id)                   AS devoluciones_julio
FROM customers c
INNER JOIN orders  o ON o.customer_id = c.customer_id
INNER JOIN returns r ON r.order_id    = o.order_id
WHERE r.returned_at >= '2025-07-01'
  AND r.returned_at <  '2025-08-01'
GROUP BY c.customer_id, c.first_name, c.last_name, c.email, c.country
ORDER BY devoluciones_julio DESC, c.last_name;

--- Solución 21 ---
SELECT
    r.return_id,
    r.order_id,
    r.product_id,
    r.returned_at,
    r.status,
    (SELECT COUNT(*) FROM returns WHERE reason IS NULL) AS total_sin_motivo
FROM returns r
WHERE r.reason IS NULL
ORDER BY r.returned_at DESC;

--- Solución 22 ---
-- CORRECCIÓN CRIT-09: SUM debe usar CASE WHEN para distinguir filas con devolución
-- de filas sin devolución. Sin el CASE, categorías sin reembolsos suman el revenue
-- total de ventas (todas las filas de order_items), no el revenue reembolsado —
-- un número que parece plausible pero es numéricamente falso.
SELECT
    cat.name                                                   AS categoria,
    ROUND(
        SUM(CASE WHEN r.return_id IS NOT NULL
                 THEN oi.quantity * oi.unit_price
                 ELSE 0
            END),
        2
    )                                                          AS revenue_reembolsado_q3
FROM categories cat
INNER JOIN products    p  ON p.category_id  = cat.category_id
LEFT JOIN  order_items oi ON oi.product_id  = p.product_id
LEFT JOIN  returns     r  ON r.product_id   = p.product_id
                          AND r.order_id    = oi.order_id
                          AND r.status      = 'refunded'
                          AND r.returned_at >= '2025-07-01'
                          AND r.returned_at <  '2025-10-01'
GROUP BY cat.category_id, cat.name
ORDER BY revenue_reembolsado_q3 DESC;

--- Solución 23 ---
SELECT
    c.first_name || ' ' || c.last_name   AS nombre_completo,
    c.email,
    c.country,
    COUNT(o.order_id)                    AS total_pedidos_entregados
FROM customers c
INNER JOIN orders o ON o.customer_id = c.customer_id
                    AND o.status = 'delivered'
WHERE NOT EXISTS (
    SELECT 1
    FROM returns r
    INNER JOIN orders o2 ON o2.order_id = r.order_id
    WHERE o2.customer_id = c.customer_id
)
GROUP BY c.customer_id, c.first_name, c.last_name, c.email, c.country
HAVING COUNT(o.order_id) > 0
ORDER BY total_pedidos_entregados DESC, c.last_name;

--- Solución 24 ---
-- Bloque 1: devolvieron y NO volvieron a comprar
SELECT
    c.customer_id,
    c.first_name || ' ' || c.last_name  AS nombre_cliente,
    c.email,
    c.country,
    'no_volvio'                          AS segmento
FROM customers c
WHERE EXISTS (
    SELECT 1 FROM returns r
    INNER JOIN orders o ON o.order_id = r.order_id
    WHERE o.customer_id  = c.customer_id
      AND r.returned_at >= '2024-07-01'
)
AND NOT EXISTS (
    SELECT 1 FROM orders o2
    WHERE o2.customer_id = c.customer_id
      AND o2.status     <> 'cancelled'
      AND o2.ordered_at > (
          SELECT MAX(r2.returned_at)
          FROM returns r2
          INNER JOIN orders o3 ON o3.order_id = r2.order_id
          WHERE o3.customer_id = c.customer_id
            AND r2.returned_at >= '2024-07-01'
      )
)

UNION ALL

-- Bloque 2: devolvieron y SÍ volvieron a comprar
SELECT
    c.customer_id,
    c.first_name || ' ' || c.last_name,
    c.email,
    c.country,
    'si_volvio'
FROM customers c
WHERE EXISTS (
    SELECT 1 FROM returns r
    INNER JOIN orders o ON o.order_id = r.order_id
    WHERE o.customer_id  = c.customer_id
      AND r.returned_at >= '2024-07-01'
)
AND EXISTS (
    SELECT 1 FROM orders o2
    WHERE o2.customer_id = c.customer_id
      AND o2.status     <> 'cancelled'
      AND o2.ordered_at > (
          SELECT MAX(r2.returned_at)
          FROM returns r2
          INNER JOIN orders o3 ON o3.order_id = r2.order_id
          WHERE o3.customer_id = c.customer_id
            AND r2.returned_at >= '2024-07-01'
      )
)

ORDER BY segmento, country;

--- Solución 25 ---
SELECT
    cat.name                                                AS nombre_categoria,
    COUNT(DISTINCT CASE
        WHEN o.ordered_at >= '2025-07-01'
         AND o.ordered_at <  '2025-08-01'
         AND o.status     <> 'cancelled'
        THEN oi.item_id END)                               AS items_vendidos_julio,
    COUNT(DISTINCT CASE
        WHEN r.returned_at >= '2025-07-01'
         AND r.returned_at <  '2025-08-01'
        THEN r.return_id END)                              AS items_devueltos_julio,
    ROUND(
        COUNT(DISTINCT CASE
            WHEN r.returned_at >= '2025-07-01'
             AND r.returned_at <  '2025-08-01'
            THEN r.return_id END) * 100.0
        / NULLIF(
            COUNT(DISTINCT CASE
                WHEN o.ordered_at >= '2025-07-01'
                 AND o.ordered_at <  '2025-08-01'
                 AND o.status     <> 'cancelled'
                THEN oi.item_id END),
            0
        ),
        2
    )                                                      AS tasa_devolucion_pct,
    COALESCE(ROUND(
        SUM(CASE
            WHEN r.status      = 'refunded'
             AND r.returned_at >= '2025-07-01'
             AND r.returned_at <  '2025-08-01'
            THEN oi.quantity * oi.unit_price
            ELSE 0
        END), 2), 0.00)                                   AS revenue_reembolsado_julio,
    -- Top producto devuelto en julio 2025 para esta categoría (subquery correlacionada)
    (SELECT p2.name
     FROM products p2
     INNER JOIN order_items oi2 ON oi2.product_id  = p2.product_id
     LEFT JOIN  returns     r2  ON r2.product_id   = p2.product_id
                                AND r2.order_id    = oi2.order_id
                                AND r2.returned_at >= '2025-07-01'
                                AND r2.returned_at <  '2025-08-01'
     WHERE p2.category_id = cat.category_id
     GROUP BY p2.product_id, p2.name
     ORDER BY COUNT(r2.return_id) DESC
     LIMIT 1)                                             AS top_producto_devuelto
FROM categories cat
INNER JOIN products    p  ON p.category_id  = cat.category_id
INNER JOIN order_items oi ON oi.product_id  = p.product_id
INNER JOIN orders      o  ON o.order_id     = oi.order_id
LEFT JOIN  returns     r  ON r.product_id   = p.product_id
                          AND r.order_id    = oi.order_id
GROUP BY cat.category_id, cat.name
HAVING COUNT(DISTINCT CASE
    WHEN o.ordered_at >= '2025-07-01'
     AND o.ordered_at <  '2025-08-01'
     AND o.status     <> 'cancelled'
    THEN oi.item_id END) > 0
ORDER BY tasa_devolucion_pct DESC NULLS LAST;

*/
