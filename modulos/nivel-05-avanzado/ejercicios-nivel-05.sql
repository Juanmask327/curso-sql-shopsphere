-- =============================================================
-- EJERCICIOS NIVEL 5 — CTEs y Window Functions
-- ShopSphere SQL Course
-- Tablas disponibles: customers, categories, products,
--                     orders, order_items, returns, inventory
-- Nueva tabla en este nivel: inventory
--   (inventory_id, product_id, stock, updated_at)
-- =============================================================
-- Contexto narrativo:
--   El equipo directivo de ShopSphere empieza a hacer preguntas
--   que requieren análisis en capas: rankings dentro de grupos,
--   comparaciones período a período, urgencias de reposición
--   calculadas desde múltiples fuentes. Con las CTEs puedes
--   estructurar el pensamiento en pasos nombrados; con las Window
--   Functions puedes calcular posiciones y variaciones sin perder
--   el detalle fila por fila. Estas son las herramientas de los
--   analistas senior.
-- =============================================================


-- ---------------------------------------------------------------
-- BLOQUE A (1-6): CTEs simples y múltiples encadenadas
-- ---------------------------------------------------------------

-- Ejercicio 01
-- CONTEXTO: Diego necesita la lista de productos con stock
--   inferior a 10 unidades para la reunión de compras
--   (Briefing 5.1). Quiere: nombre, categoría, stock actual.
--   Los de stock cero van primero; dentro del mismo stock,
--   orden alfabético por nombre de producto.
-- Enunciado: Usa una CTE que cruce inventory, products y
--   categories. La query principal filtra stock < 10 y aplica
--   el orden indicado.
-- Criterio: Exactamente una CTE. El JOIN incluye las tres
--   tablas. El orden es stock ASC con desempate nombre ASC.
--   Columnas: producto, categoria, stock.

-- Tu query aquí:


-- Ejercicio 02
-- CONTEXTO: Valentina quiere saber el revenue total de cada
--   cliente para un análisis de segmentación. Solo pedidos
--   con status 'delivered'.
-- Enunciado: Usa una CTE que calcule el revenue total por
--   cliente (SUM de quantity * unit_price, solo pedidos
--   delivered). La query principal une esa CTE con customers
--   para mostrar el nombre completo, país y revenue total.
--   Ordena por revenue descendente. LIMIT 20.
-- Criterio: Una CTE. Solo pedidos delivered. Columnas:
--   nombre_completo, country, revenue_total. LIMIT 20.

-- Tu query aquí:


-- Ejercicio 03
-- CONTEXTO: Ana quiere el ratio de devoluciones por categoría:
--   unidades devueltas / unidades vendidas * 100, expresado
--   como porcentaje. Solo categorías con al menos 10 unidades
--   vendidas.
-- Enunciado: Usa dos CTEs: una para calcular unidades
--   vendidas por categoría (desde order_items + products),
--   otra para calcular unidades devueltas por categoría
--   (desde returns + order_items + products). La query
--   principal cruza ambas y calcula el ratio. Muestra solo
--   categorías con >= 10 unidades vendidas. Ordena por ratio
--   descendente.
-- Criterio: Exactamente dos CTEs. El ratio está redondeado
--   a 2 decimales. Columnas: categoria, unidades_vendidas,
--   unidades_devueltas, ratio_devolucion_pct.

-- Tu query aquí:


-- Ejercicio 04
-- CONTEXTO: Marco quiere una vista de los productos más
--   vendidos en todo el historial, con tres métricas:
--   unidades vendidas, revenue total y precio promedio
--   de venta (revenue / unidades). Solo los TOP 15.
-- Enunciado: Usa una CTE que calcule las tres métricas
--   para cada producto. La query principal aplica LIMIT 15
--   ordenado por revenue descendente.
-- Criterio: Una CTE. El precio promedio usa NULLIF para
--   proteger contra división por cero. Columnas: producto,
--   unidades_vendidas, revenue_total, precio_prom_venta
--   (redondeado a 2 decimales). LIMIT 15.

-- Tu query aquí:


-- Ejercicio 05
-- CONTEXTO: Diego quiere la lista de stock crítico con días
--   de cobertura estimados, basado en el promedio de ventas
--   diarias de los últimos 90 días (Briefing 5.1 extendido).
--   Un producto es crítico si tiene menos de 15 días de
--   cobertura. Los de stock cero van primero.
-- Enunciado: Usa dos CTEs encadenadas: la primera calcula
--   las ventas diarias promedio por producto (últimos 90
--   días). La segunda cruza con inventory para calcular
--   días de cobertura. La query principal filtra críticos
--   (< 15 días) e incluye stock = 0 siempre.
-- Criterio: Dos CTEs. La segunda referencia a la primera.
--   NULLIF en la división para proteger contra ventas_diarias
--   = 0. Columnas: producto, categoria, stock_actual,
--   ventas_diarias_prom, dias_cobertura. Orden correcto.

-- Tu query aquí:


-- Ejercicio 06
-- CONTEXTO: Valentina quiere los clientes con revenue total
--   por encima del doble del promedio general de revenue
--   por cliente. Son los "whales" — la versión mejorada del
--   ejercicio 24 del Nivel 3, ahora con CTEs en lugar de
--   subqueries anidadas.
-- Enunciado: Usa dos CTEs: una para calcular el revenue
--   por cliente (solo pedidos delivered), otra para calcular
--   el promedio general de esa primera CTE. La query
--   principal filtra los clientes que superan el doble
--   del promedio. Muestra: nombre_completo, country,
--   revenue_total. Ordena por revenue descendente.
-- Criterio: Dos CTEs. La segunda usa la primera para
--   calcular el promedio. El filtro es revenue > 2 *
--   promedio_general. Columnas correctas con alias.

-- Tu query aquí:


-- ---------------------------------------------------------------
-- BLOQUE B (7-10): CTEs recursivas — jerarquía de categorías
-- ---------------------------------------------------------------
-- Nota: Los ejercicios de este bloque usan una extensión temporal
-- del schema de categories con la columna parent_id. Esta
-- estructura no existe en el schema estándar — se introduce
-- solo para practicar CTEs recursivas.
--
-- Datos de ejemplo para los ejercicios 7-10:
--
-- CREATE TABLE categories_jerarquia (
--     category_id INT PRIMARY KEY,
--     name        VARCHAR(80) NOT NULL,
--     parent_id   INT REFERENCES categories_jerarquia(category_id)
-- );
-- INSERT INTO categories_jerarquia VALUES
--     (1, 'Tecnología', NULL),
--     (2, 'Hogar', NULL),
--     (3, 'Ropa', NULL),
--     (4, 'Smartphones', 1),
--     (5, 'Computadoras', 1),
--     (6, 'Audio', 1),
--     (7, 'Muebles', 2),
--     (8, 'Decoración', 2),
--     (9, 'Ropa Hombre', 3),
--     (10, 'Ropa Mujer', 3),
--     (11, 'Android', 4),
--     (12, 'iOS', 4),
--     (13, 'Laptops', 5),
--     (14, 'Desktops', 5),
--     (15, 'Auriculares', 6),
--     (16, 'Parlantes', 6);

-- Ejercicio 07
-- CONTEXTO: El equipo de catálogo quiere ver el árbol
--   completo de categorías con su nivel y ruta.
-- Enunciado: Escribe una CTE recursiva sobre
--   categories_jerarquia que produzca el árbol completo.
--   Para cada categoría: nombre, nivel (1 = raíz) y ruta
--   completa desde la raíz usando ' > ' como separador.
--   Ordena por ruta alfabéticamente.
-- Criterio: WITH RECURSIVE. Base case: parent_id IS NULL.
--   Recursive case: hijos de cada nodo visitado.
--   Columnas: nombre, nivel, ruta. Orden por ruta.

-- Tu query aquí:


-- Ejercicio 08
-- CONTEXTO: El sistema de navegación del e-commerce necesita
--   mostrar solo las categorías hoja (sin subcategorías)
--   — esas son las que los usuarios seleccionan para filtrar
--   productos.
-- Enunciado: Usa una CTE recursiva para construir el árbol
--   completo. La query principal filtra solo los nodos hoja
--   (categorías que no aparecen como parent_id de ninguna
--   otra). Muestra nombre, nivel y ruta. Ordena por ruta.
-- Criterio: WITH RECURSIVE. El filtro de nodos hoja usa
--   NOT IN o NOT EXISTS contra la columna parent_id (con
--   protección contra NULLs si usas NOT IN). Columnas y
--   orden correctos.

-- Tu query aquí:


-- Ejercicio 09
-- CONTEXTO: El área de operaciones necesita el listado de
--   todos los descendientes de "Tecnología" para planificar
--   una auditoría de proveedores. Quiere ver todas las
--   subcategorías a cualquier nivel de profundidad.
-- Enunciado: Escribe una CTE recursiva que empiece desde
--   la categoría "Tecnología" (category_id = 1) y devuelva
--   todos sus descendientes, incluida la propia categoría
--   raíz. Muestra nombre y nivel. Ordena por nivel y luego
--   por nombre.
-- Criterio: El base case filtra category_id = 1.
--   El recursive case usa INNER JOIN con la CTE.
--   Incluye límite de seguridad (nivel < 10). Orden correcto.

-- Tu query aquí:


-- Ejercicio 10
-- CONTEXTO: El equipo de BI necesita calcular cuántas
--   categorías hay en cada nivel del árbol (cuántas raíces,
--   cuántos nodos de segundo nivel, cuántos de tercero, etc.)
--   para documentar la complejidad del catálogo.
-- Enunciado: Usa una CTE recursiva para construir el árbol
--   completo con nivel. La query principal agrupa por nivel
--   y cuenta cuántas categorías hay en cada uno. Muestra
--   nivel y total_categorias, ordenado por nivel.
-- Criterio: CTE recursiva correcta. La query principal usa
--   GROUP BY nivel. Columnas: nivel, total_categorias.

-- Tu query aquí:


-- ---------------------------------------------------------------
-- BLOQUE C (11-18): ROW_NUMBER, RANK, DENSE_RANK, NTILE
-- ---------------------------------------------------------------

-- Ejercicio 11
-- CONTEXTO: Valentina necesita el primer pedido de cada
--   cliente para el análisis de cohortes (Briefing 5.5).
--   Solo clientes con al menos un pedido delivered.
-- Enunciado: Usa ROW_NUMBER() para numerar los pedidos de
--   cada cliente por fecha ascendente. Filtra para quedarte
--   solo con el número 1 de cada cliente. Muestra:
--   nombre_completo, country, fecha del primer pedido
--   (ordered_at) y el monto del pedido (SUM de la línea).
-- Criterio: ROW_NUMBER() con PARTITION BY customer_id
--   ORDER BY ordered_at ASC. Filtro rn = 1 en CTE o
--   subquery. Solo pedidos delivered. Columnas correctas.

-- Tu query aquí:


-- Ejercicio 12
-- CONTEXTO: Sofía quiere el ranking de productos por revenue
--   dentro de cada categoría (Briefing 5.4). Solo el top 3
--   de cada categoría. Si hay empate en la posición, ambos
--   productos deben aparecer.
-- Enunciado: Usa DENSE_RANK() con PARTITION BY categoria
--   ORDER BY revenue DESC. Filtra posicion <= 3.
--   Muestra: producto, categoria, revenue_total, posicion.
-- Criterio: DENSE_RANK() (no ROW_NUMBER). PARTITION BY
--   la categoría. Filtro en CTE o subquery. Solo top 3.
--   Columnas correctas con alias.

-- Tu query aquí:


-- Ejercicio 13
-- CONTEXTO: Diego quiere el producto con menor stock dentro
--   de cada categoría (Briefing 5.2). Si dos productos
--   tienen el mismo stock mínimo, quiere verlos a ambos.
-- Enunciado: Usa RANK() con PARTITION BY categoria
--   ORDER BY stock ASC. Filtra posicion = 1.
--   Muestra: categoria, producto, stock.
-- Criterio: RANK() o DENSE_RANK() (ambos válidos aquí).
--   PARTITION BY correcta. Filtro en query exterior.
--   Columnas: categoria, producto, stock. Ordenado por
--   categoria y luego stock ASC.

-- Tu query aquí:


-- Ejercicio 14
-- CONTEXTO: El equipo de producto quiere saber qué posición
--   ocupa cada producto en el ranking global de revenue,
--   sin eliminar ningún producto. Quieren ver todos los
--   productos con su posición — no solo el top N.
-- Enunciado: Calcula el revenue total por producto. Asigna
--   RANK() global por revenue descendente (sin PARTITION BY).
--   Muestra todos los productos con: producto, categoria,
--   revenue_total, posicion_global. Ordena por posicion.
-- Criterio: RANK() sin PARTITION BY (aplica a todo el
--   conjunto). Columnas correctas. Todos los productos.
--   Ordenado por posicion_global ASC.

-- Tu query aquí:


-- Ejercicio 15
-- CONTEXTO: Marco quiere los tres mejores clientes de cada
--   país por revenue total (Briefing 5.7). Solo clientes
--   con pedidos delivered.
-- Enunciado: Calcula revenue por cliente. Aplica
--   DENSE_RANK() con PARTITION BY country ORDER BY revenue
--   DESC. Filtra los que tienen posicion <= 3. Muestra:
--   nombre_completo, country, revenue_total, posicion.
--   Ordena por country y posicion.
-- Criterio: DENSE_RANK(). PARTITION BY country. Filtro
--   posicion <= 3. Solo pedidos delivered. Columnas
--   correctas con alias.

-- Tu query aquí:


-- Ejercicio 16
-- CONTEXTO: Diego quiere los productos del cuartil inferior
--   de inventario — el 25% con menor stock — para priorizarlos
--   en la revisión de compras (Briefing 5.3).
-- Enunciado: Usa NTILE(4) sobre inventory ordenado por
--   stock ASC. El cuartil 1 = menor stock. Filtra cuartil = 1.
--   Muestra: producto, categoria, stock. Ordena por stock ASC.
-- Criterio: NTILE(4) con ORDER BY stock ASC (no DESC).
--   Cuartil 1 es el de menor stock. Incluye JOIN con
--   products y categories para mostrar nombres.
--   Filtro cuartil = 1 en query exterior.

-- Tu query aquí:


-- Ejercicio 17
-- CONTEXTO: Ana quiere cuantificar la concentración de
--   revenue: ¿qué porcentaje del revenue total viene del
--   25% de productos con más ventas? (Briefing 5.8).
-- Enunciado: Usa NTILE(4) para dividir los productos en
--   cuartiles por revenue descendente. Cuartil 1 = mayor
--   revenue. Luego calcula el porcentaje que representa
--   el revenue del cuartil 1 sobre el revenue total.
--   Resultado: una sola fila con revenue_cuartil_top,
--   revenue_total y pct_concentracion.
-- Criterio: NTILE(4) con ORDER BY revenue DESC (cuartil 1
--   = mayor). Dos CTEs: una para los cuartiles, otra para
--   el porcentaje. El resultado es un solo número (pct)
--   redondeado a 1 decimal.

-- Tu query aquí:


-- Ejercicio 18
-- CONTEXTO: Ana prepara el análisis de riesgo de portafolio:
--   ¿qué porcentaje del revenue viene del quintil superior
--   de productos? (Briefing 5.9).
-- Enunciado: Similar al Ejercicio 17 pero con NTILE(5) en
--   lugar de NTILE(4). El quintil 1 = mayor revenue.
--   Resultado: revenue_quintil_top, revenue_total,
--   pct_concentracion. Una sola fila.
-- Criterio: NTILE(5). Cuartil 1 = mayor revenue (ORDER BY
--   revenue DESC). Porcentaje redondeado a 1 decimal.
--   Muestra también el revenue_quintil_top y revenue_total
--   para que Ana pueda verificar el cálculo.

-- Tu query aquí:


-- ---------------------------------------------------------------
-- BLOQUE D (19-25): LAG/LEAD, inventory, análisis temporal
-- ---------------------------------------------------------------

-- Ejercicio 19
-- CONTEXTO: Sofía necesita el revenue mes a mes de 2026
--   (enero a junio) con la variación respecto al mes anterior
--   para el análisis de campaña de invierno (Briefing 5.11).
-- Enunciado: Calcula el revenue mensual (solo pedidos
--   delivered) de enero a junio 2026. Usa LAG() para obtener
--   el revenue del mes anterior. Muestra: mes, revenue_mes,
--   revenue_anterior, variacion_absoluta, variacion_pct.
--   El primer mes tiene NULL en las columnas de variación.
-- Criterio: CTE para el revenue mensual. LAG(revenue, 1)
--   con ORDER BY mes en el OVER(). Variación porcentual con
--   NULLIF en el denominador. Valores redondeados a 2
--   decimales (pct a 1 decimal). Orden por mes ASC.

-- Tu query aquí:


-- Ejercicio 20
-- CONTEXTO: Diego quiere el ranking de urgencia de reposición
--   combinando dos criterios: stock actual (menor = más
--   urgente) y velocidad de ventas (más ventas = más urgente).
--   Solo productos que tienen stock en inventory.
-- Enunciado: Calcula ventas diarias promedio en últimos 90
--   días por producto. Cruza con inventory. Calcula días de
--   cobertura. Asigna RANK() de urgencia ordenado por
--   dias_cobertura ASC NULLS FIRST, luego por
--   ventas_diarias DESC como desempate. Muestra todos los
--   productos de inventory con sus métricas y ranking.
-- Criterio: Al menos dos CTEs. RANK() para el ranking de
--   urgencia. NULLIF en la división de dias_cobertura.
--   Columnas: producto, categoria, stock, ventas_diarias_prom,
--   dias_cobertura, ranking_urgencia. Orden por ranking.

-- Tu query aquí:


-- Ejercicio 21
-- CONTEXTO: Valentina quiere analizar el comportamiento de
--   clientes nuevos: de los clientes registrados en los
--   últimos 12 meses, ¿cuánto gastó cada uno en sus
--   primeros 30 días? (Briefing 5.12 — parte 1).
-- Enunciado: Identifica clientes registrados entre
--   2025-06-01 y 2026-05-31. Para cada uno, calcula el
--   revenue total de pedidos delivered dentro de los
--   primeros 30 días desde su registered_at. Luego usa
--   NTILE(4) para clasificarlos por ese monto (cuartil 1
--   = mayor gasto inicial). Muestra: nombre_completo,
--   country, registered_at, revenue_primer_mes, cuartil.
--   Solo clientes con al menos un pedido en ese período.
-- Criterio: Filtro de fecha de registro correcto. JOIN
--   con orders filtrando ordered_at <= registered_at + 30
--   días. NTILE(4) sobre revenue_primer_mes DESC.
--   Orden por cuartil ASC, luego revenue DESC.

-- Tu query aquí:


-- Ejercicio 22
-- CONTEXTO: Ana necesita el ranking de los cinco países por
--   revenue neto (revenue bruto menos devoluciones refunded)
--   para el informe Q1 2026 (Briefing 5.10).
-- Enunciado: Usa dos CTEs: una para el revenue bruto por
--   país (pedidos delivered en Q1 2026), otra para las
--   devoluciones reembolsadas por país (returns con status
--   'refunded' en Q1 2026, usando unit_price * quantity
--   de order_items como monto). La query principal calcula
--   revenue_neto = bruto - reembolsado y asigna RANK()
--   por revenue_neto DESC. Muestra todos los países aunque
--   el neto sea negativo.
-- Criterio: Dos CTEs. Q1 2026 = enero 1 a marzo 31. RANK()
--   para el ranking. Columnas: pais, revenue_bruto,
--   total_reembolsado, revenue_neto, posicion. Orden por
--   posicion ASC.

-- Tu query aquí:


-- Ejercicio 23
-- CONTEXTO: Sofía quiere ver el revenue acumulado mes a mes
--   en 2026 (running total) para seguir el progreso hacia
--   la meta anual. Solo pedidos delivered.
-- Enunciado: Calcula el revenue mensual de 2026. Usa
--   SUM() OVER (ORDER BY mes ROWS BETWEEN UNBOUNDED PRECEDING
--   AND CURRENT ROW) para calcular el acumulado. Muestra:
--   mes, revenue_mes, revenue_acumulado_ytd. Ordena por mes.
-- Criterio: CTE para el revenue mensual (2026 completo
--   disponible, hasta el mes actual). SUM() como Window
--   Function con el marco explícito. Columnas: mes,
--   revenue_mes, revenue_acumulado_ytd. Valores redondeados
--   a 2 decimales. Orden por mes ASC.

-- Tu query aquí:


-- Ejercicio 24
-- CONTEXTO: El análisis de productos sobre el promedio de
--   su categoría usando Window Functions, sin CTEs de soporte.
--   (Versión más directa del Ejercicio Intermedio de L1).
-- Enunciado: Usa AVG() OVER (PARTITION BY category_id) como
--   Window Function para calcular el promedio de revenue de
--   la categoría para cada producto, sin colapsar filas.
--   Filtra los productos que superan ese promedio. Muestra:
--   producto, categoria, revenue_total, promedio_categoria.
--   Ordena por categoria y revenue_total DESC.
-- Criterio: AVG() OVER (PARTITION BY cat.category_id) en
--   lugar de una CTE para el promedio. El filtro WHERE se
--   aplica en la query exterior (necesita CTE o subquery
--   porque no se puede filtrar por alias de window function
--   en el mismo nivel). Columnas correctas.

-- Tu query aquí:


-- Ejercicio 25 — Integrador
-- CONTEXTO: Valentina prepara el dashboard de cierre de
--   semestre H1 2026 (enero-junio) para Marco. Necesita
--   una tabla resumen con:
--   - Por cada mes: revenue del mes, revenue del mes
--     anterior, variación porcentual MoM
--   - Ranking de los 3 mejores productos del semestre
--     (por revenue total), con su posición global
--   - Productos del cuartil inferior de stock que además
--     están entre los más vendidos del semestre
--     (cruce de urgencia e importancia)
-- Enunciado: Esta es una query en tres partes. Puedes
--   entregarla como tres queries separadas con CTEs, o
--   como una sola query que use múltiples CTEs.
--   Parte A: Análisis MoM del H1 2026.
--   Parte B: Top 3 productos del semestre con DENSE_RANK.
--   Parte C: Productos en cuartil 1 de stock (menor stock)
--     que también están en cuartil 1 de ventas (mayor
--     revenue) — los más urgentes e importantes.
-- Criterio:
--   Parte A: LAG() para variación. 6 filas (ene-jun 2026).
--   Parte B: DENSE_RANK() sin PARTITION BY. Filtra <= 3.
--   Parte C: Dos NTILE(4): uno sobre stock ASC, otro sobre
--     revenue DESC. Filtra donde ambos cuartiles = 1.
--   Todos los valores redondeados a 2 decimales.

-- Tu query aquí (Parte A — MoM H1 2026):


-- Tu query aquí (Parte B — Top 3 productos):


-- Tu query aquí (Parte C — Críticos e importantes):


-- =============================================================
-- SOLUCIONES
-- (Intenta resolver los ejercicios antes de leer esto)
-- =============================================================

/*

--- Solución 01 ---
WITH inventario_completo AS (
    SELECT
        p.name      AS producto,
        cat.name    AS categoria,
        i.stock
    FROM inventory i
    INNER JOIN products   p   ON p.product_id   = i.product_id
    INNER JOIN categories cat ON cat.category_id = p.category_id
)
SELECT producto, categoria, stock
FROM inventario_completo
WHERE stock < 10
ORDER BY stock ASC, producto ASC;

--- Solución 02 ---
WITH revenue_por_cliente AS (
    SELECT
        o.customer_id,
        ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue_total
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status = 'delivered'
    GROUP BY o.customer_id
)
SELECT
    c.first_name || ' ' || c.last_name  AS nombre_completo,
    c.country,
    r.revenue_total
FROM customers c
INNER JOIN revenue_por_cliente r ON r.customer_id = c.customer_id
ORDER BY r.revenue_total DESC
LIMIT 20;

--- Solución 03 ---
WITH unidades_vendidas AS (
    SELECT
        cat.name                AS categoria,
        SUM(oi.quantity)        AS unidades_vendidas
    FROM order_items oi
    INNER JOIN products   p   ON p.product_id   = oi.product_id
    INNER JOIN categories cat ON cat.category_id = p.category_id
    GROUP BY cat.name
),
unidades_devueltas AS (
    SELECT
        cat.name            AS categoria,
        -- SUM(oi.quantity) cuenta unidades físicas devueltas, no eventos de devolución.
        -- COUNT contaría 1 por fila aunque quantity > 1 — subestimaría el ratio real.
        SUM(oi.quantity)    AS unidades_devueltas
    FROM returns r
    INNER JOIN order_items oi ON oi.order_id   = r.order_id
                              AND oi.product_id = r.product_id
    INNER JOIN products    p  ON p.product_id   = oi.product_id
    INNER JOIN categories  cat ON cat.category_id = p.category_id
    GROUP BY cat.name
)
SELECT
    uv.categoria,
    uv.unidades_vendidas,
    COALESCE(ud.unidades_devueltas, 0)           AS unidades_devueltas,
    ROUND(
        100.0 * COALESCE(ud.unidades_devueltas, 0)
        / NULLIF(uv.unidades_vendidas, 0),
        2
    )                                            AS ratio_devolucion_pct
FROM unidades_vendidas uv
LEFT JOIN unidades_devueltas ud ON ud.categoria = uv.categoria
WHERE uv.unidades_vendidas >= 10
ORDER BY ratio_devolucion_pct DESC;

--- Solución 04 ---
WITH metricas_producto AS (
    SELECT
        p.name                                         AS producto,
        SUM(oi.quantity)                               AS unidades_vendidas,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)     AS revenue_total,
        ROUND(
            SUM(oi.quantity * oi.unit_price)
            / NULLIF(SUM(oi.quantity), 0),
            2
        )                                              AS precio_prom_venta
    FROM order_items oi
    INNER JOIN products p ON p.product_id = oi.product_id
    GROUP BY p.name
)
SELECT producto, unidades_vendidas, revenue_total, precio_prom_venta
FROM metricas_producto
ORDER BY revenue_total DESC
LIMIT 15;

--- Solución 05 ---
WITH ventas_diarias AS (
    SELECT
        p.product_id,
        p.name                              AS producto,
        cat.name                            AS categoria,
        ROUND(SUM(oi.quantity) / 90.0, 2)  AS ventas_diarias_prom
    FROM order_items oi
    INNER JOIN products   p   ON p.product_id   = oi.product_id
    INNER JOIN categories cat ON cat.category_id = p.category_id
    INNER JOIN orders     o   ON o.order_id     = oi.order_id
    WHERE o.ordered_at >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY p.product_id, p.name, cat.name
),
cobertura AS (
    SELECT
        vd.producto,
        vd.categoria,
        i.stock                             AS stock_actual,
        vd.ventas_diarias_prom,
        ROUND(
            i.stock / NULLIF(vd.ventas_diarias_prom, 0),
            1
        )                                   AS dias_cobertura
    FROM ventas_diarias vd
    INNER JOIN inventory i ON i.product_id = vd.product_id
)
SELECT producto, categoria, stock_actual, ventas_diarias_prom, dias_cobertura
FROM cobertura
WHERE dias_cobertura < 15
   OR stock_actual = 0
ORDER BY
    CASE WHEN stock_actual = 0 THEN 0 ELSE 1 END,
    dias_cobertura ASC NULLS LAST;

--- Solución 06 ---
WITH revenue_cliente AS (
    SELECT
        o.customer_id,
        ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue_total
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status = 'delivered'
    GROUP BY o.customer_id
),
promedio_general AS (
    SELECT AVG(revenue_total) AS promedio
    FROM revenue_cliente
)
SELECT
    c.first_name || ' ' || c.last_name  AS nombre_completo,
    c.country,
    r.revenue_total
FROM customers c
INNER JOIN revenue_cliente  r ON r.customer_id = c.customer_id
CROSS JOIN promedio_general pg
WHERE r.revenue_total > 2 * pg.promedio
ORDER BY r.revenue_total DESC;

--- Solución 07 ---
WITH RECURSIVE arbol AS (
    SELECT
        category_id,
        name,
        parent_id,
        1       AS nivel,
        name    AS ruta
    FROM categories_jerarquia
    WHERE parent_id IS NULL

    UNION ALL

    SELECT
        c.category_id,
        c.name,
        c.parent_id,
        a.nivel + 1,
        a.ruta || ' > ' || c.name
    FROM categories_jerarquia c
    INNER JOIN arbol a ON c.parent_id = a.category_id
)
SELECT name AS nombre, nivel, ruta
FROM arbol
ORDER BY ruta;

--- Solución 08 ---
WITH RECURSIVE arbol AS (
    SELECT
        category_id,
        name,
        parent_id,
        1       AS nivel,
        name    AS ruta
    FROM categories_jerarquia
    WHERE parent_id IS NULL

    UNION ALL

    SELECT
        c.category_id,
        c.name,
        c.parent_id,
        a.nivel + 1,
        a.ruta || ' > ' || c.name
    FROM categories_jerarquia c
    INNER JOIN arbol a ON c.parent_id = a.category_id
)
SELECT name AS nombre, nivel, ruta
FROM arbol
WHERE category_id NOT IN (
    SELECT parent_id
    FROM categories_jerarquia
    WHERE parent_id IS NOT NULL
)
ORDER BY ruta;

--- Solución 09 ---
WITH RECURSIVE descendientes AS (
    SELECT
        category_id,
        name,
        1 AS nivel
    FROM categories_jerarquia
    WHERE category_id = 1

    UNION ALL

    SELECT
        c.category_id,
        c.name,
        d.nivel + 1
    FROM categories_jerarquia c
    INNER JOIN descendientes d ON c.parent_id = d.category_id
    WHERE d.nivel < 10
)
SELECT name AS nombre, nivel
FROM descendientes
ORDER BY nivel, name;

--- Solución 10 ---
WITH RECURSIVE arbol AS (
    SELECT
        category_id,
        name,
        1 AS nivel
    FROM categories_jerarquia
    WHERE parent_id IS NULL

    UNION ALL

    SELECT
        c.category_id,
        c.name,
        a.nivel + 1
    FROM categories_jerarquia c
    INNER JOIN arbol a ON c.parent_id = a.category_id
)
SELECT nivel, COUNT(*) AS total_categorias
FROM arbol
GROUP BY nivel
ORDER BY nivel;

--- Solución 11 ---
WITH pedidos_con_monto AS (
    SELECT
        o.order_id,
        o.customer_id,
        o.ordered_at,
        ROUND(SUM(oi.quantity * oi.unit_price), 2) AS monto_pedido
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status = 'delivered'
    GROUP BY o.order_id, o.customer_id, o.ordered_at
),
ranking AS (
    SELECT
        customer_id,
        ordered_at,
        monto_pedido,
        ROW_NUMBER() OVER (
            PARTITION BY customer_id
            ORDER BY ordered_at ASC
        ) AS rn
    FROM pedidos_con_monto
)
SELECT
    c.first_name || ' ' || c.last_name  AS nombre_completo,
    c.country,
    r.ordered_at                        AS fecha_primer_pedido,
    r.monto_pedido
FROM ranking r
INNER JOIN customers c ON c.customer_id = r.customer_id
WHERE r.rn = 1
ORDER BY r.ordered_at ASC;

--- Solución 12 ---
WITH revenue_producto AS (
    SELECT
        p.product_id,
        p.name                                       AS producto,
        cat.name                                     AS categoria,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)   AS revenue_total
    FROM order_items oi
    INNER JOIN products   p   ON p.product_id   = oi.product_id
    INNER JOIN categories cat ON cat.category_id = p.category_id
    GROUP BY p.product_id, p.name, cat.name
),
ranking AS (
    SELECT
        producto,
        categoria,
        revenue_total,
        DENSE_RANK() OVER (
            PARTITION BY categoria
            ORDER BY revenue_total DESC
        ) AS posicion
    FROM revenue_producto
)
SELECT producto, categoria, revenue_total, posicion
FROM ranking
WHERE posicion <= 3
ORDER BY categoria, posicion;

--- Solución 13 ---
WITH stock_rankeado AS (
    SELECT
        cat.name    AS categoria,
        p.name      AS producto,
        i.stock,
        RANK() OVER (
            PARTITION BY cat.category_id
            ORDER BY i.stock ASC
        ) AS posicion_stock
    FROM inventory i
    INNER JOIN products   p   ON p.product_id   = i.product_id
    INNER JOIN categories cat ON cat.category_id = p.category_id
)
SELECT categoria, producto, stock
FROM stock_rankeado
WHERE posicion_stock = 1
ORDER BY categoria, stock ASC;

--- Solución 14 ---
WITH revenue_producto AS (
    SELECT
        p.name                                       AS producto,
        cat.name                                     AS categoria,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)   AS revenue_total
    FROM order_items oi
    INNER JOIN products   p   ON p.product_id   = oi.product_id
    INNER JOIN categories cat ON cat.category_id = p.category_id
    GROUP BY p.name, cat.name
),
ranking AS (
    SELECT
        producto,
        categoria,
        revenue_total,
        RANK() OVER (ORDER BY revenue_total DESC) AS posicion_global
    FROM revenue_producto
)
SELECT producto, categoria, revenue_total, posicion_global
FROM ranking
ORDER BY posicion_global ASC;

--- Solución 15 ---
WITH revenue_cliente AS (
    SELECT
        o.customer_id,
        ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue_total
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status = 'delivered'
    GROUP BY o.customer_id
),
ranking AS (
    SELECT
        c.first_name || ' ' || c.last_name  AS nombre_completo,
        c.country,
        r.revenue_total,
        DENSE_RANK() OVER (
            PARTITION BY c.country
            ORDER BY r.revenue_total DESC
        ) AS posicion
    FROM customers c
    INNER JOIN revenue_cliente r ON r.customer_id = c.customer_id
)
SELECT nombre_completo, country, revenue_total, posicion
FROM ranking
WHERE posicion <= 3
ORDER BY country, posicion;

--- Solución 16 ---
WITH stock_cuartiles AS (
    SELECT
        p.name      AS producto,
        cat.name    AS categoria,
        i.stock,
        NTILE(4) OVER (ORDER BY i.stock ASC) AS cuartil
    FROM inventory i
    INNER JOIN products   p   ON p.product_id   = i.product_id
    INNER JOIN categories cat ON cat.category_id = p.category_id
)
SELECT producto, categoria, stock, cuartil
FROM stock_cuartiles
WHERE cuartil = 1
ORDER BY stock ASC;

--- Solución 17 ---
WITH revenue_producto AS (
    SELECT
        oi.product_id,
        ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue_total
    FROM order_items oi
    GROUP BY oi.product_id
),
cuartiles AS (
    SELECT
        product_id,
        revenue_total,
        NTILE(4) OVER (ORDER BY revenue_total DESC) AS cuartil
    FROM revenue_producto
)
SELECT
    ROUND(SUM(CASE WHEN cuartil = 1 THEN revenue_total ELSE 0 END), 2)  AS revenue_cuartil_top,
    ROUND(SUM(revenue_total), 2)                                         AS revenue_total,
    ROUND(
        100.0 * SUM(CASE WHEN cuartil = 1 THEN revenue_total ELSE 0 END)
        / NULLIF(SUM(revenue_total), 0),
        1
    )                                                                    AS pct_concentracion
FROM cuartiles;

--- Solución 18 ---
WITH revenue_producto AS (
    SELECT
        oi.product_id,
        ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue_total
    FROM order_items oi
    GROUP BY oi.product_id
),
quintiles AS (
    SELECT
        product_id,
        revenue_total,
        NTILE(5) OVER (ORDER BY revenue_total DESC) AS quintil
    FROM revenue_producto
)
SELECT
    ROUND(SUM(CASE WHEN quintil = 1 THEN revenue_total ELSE 0 END), 2) AS revenue_quintil_top,
    ROUND(SUM(revenue_total), 2)                                        AS revenue_total,
    ROUND(
        100.0 * SUM(CASE WHEN quintil = 1 THEN revenue_total ELSE 0 END)
        / NULLIF(SUM(revenue_total), 0),
        1
    )                                                                   AS pct_concentracion
FROM quintiles;

--- Solución 19 ---
WITH revenue_mensual AS (
    SELECT
        DATE_TRUNC('month', o.ordered_at)::DATE     AS mes,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)  AS revenue_mes
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status     = 'delivered'
      AND o.ordered_at >= '2026-01-01'
      AND o.ordered_at <  '2026-07-01'
    GROUP BY DATE_TRUNC('month', o.ordered_at)
)
SELECT
    mes,
    revenue_mes,
    LAG(revenue_mes) OVER (ORDER BY mes)                        AS revenue_anterior,
    ROUND(
        revenue_mes - LAG(revenue_mes) OVER (ORDER BY mes),
        2
    )                                                           AS variacion_absoluta,
    ROUND(
        100.0 * (revenue_mes - LAG(revenue_mes) OVER (ORDER BY mes))
        / NULLIF(LAG(revenue_mes) OVER (ORDER BY mes), 0),
        1
    )                                                           AS variacion_pct
FROM revenue_mensual
ORDER BY mes;

--- Solución 20 ---
WITH ventas_diarias AS (
    SELECT
        p.product_id,
        p.name                              AS producto,
        cat.name                            AS categoria,
        ROUND(SUM(oi.quantity) / 90.0, 2)  AS ventas_diarias_prom
    FROM order_items oi
    INNER JOIN products   p   ON p.product_id   = oi.product_id
    INNER JOIN categories cat ON cat.category_id = p.category_id
    INNER JOIN orders     o   ON o.order_id     = oi.order_id
    WHERE o.ordered_at >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY p.product_id, p.name, cat.name
),
stock_con_cobertura AS (
    SELECT
        COALESCE(vd.producto, p.name)       AS producto,
        COALESCE(vd.categoria, cat.name)    AS categoria,
        i.stock,
        COALESCE(vd.ventas_diarias_prom, 0) AS ventas_diarias_prom,
        ROUND(
            i.stock / NULLIF(COALESCE(vd.ventas_diarias_prom, 0), 0),
            1
        )                                   AS dias_cobertura
    FROM inventory i
    INNER JOIN products   p   ON p.product_id   = i.product_id
    INNER JOIN categories cat ON cat.category_id = p.category_id
    LEFT JOIN ventas_diarias vd ON vd.product_id = i.product_id
)
SELECT
    producto,
    categoria,
    stock,
    ventas_diarias_prom,
    dias_cobertura,
    RANK() OVER (
        ORDER BY
            dias_cobertura ASC NULLS FIRST,
            ventas_diarias_prom DESC
    ) AS ranking_urgencia
FROM stock_con_cobertura
ORDER BY ranking_urgencia;

--- Solución 21 ---
WITH clientes_nuevos AS (
    SELECT
        c.customer_id,
        c.first_name || ' ' || c.last_name  AS nombre_completo,
        c.country,
        c.registered_at,
        ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue_primer_mes
    FROM customers c
    INNER JOIN orders      o  ON o.customer_id  = c.customer_id
    INNER JOIN order_items oi ON oi.order_id    = o.order_id
    WHERE c.registered_at  >= '2025-06-01'
      AND c.registered_at  <  '2026-06-01'  -- Filtro exclusivo: < fecha_siguiente captura todo el día N sin necesitar hora 23:59:59
      AND o.status         = 'delivered'
      AND o.ordered_at     <= c.registered_at + INTERVAL '30 days'
    GROUP BY c.customer_id, c.first_name, c.last_name, c.country, c.registered_at
)
SELECT
    nombre_completo,
    country,
    registered_at,
    revenue_primer_mes,
    NTILE(4) OVER (ORDER BY revenue_primer_mes DESC) AS cuartil
FROM clientes_nuevos
ORDER BY cuartil ASC, revenue_primer_mes DESC;

--- Solución 22 ---
WITH revenue_bruto AS (
    SELECT
        c.country,
        ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue_bruto
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id    = o.order_id
    INNER JOIN customers   c  ON c.customer_id  = o.customer_id
    WHERE o.status     = 'delivered'
      AND o.ordered_at >= '2026-01-01'
      AND o.ordered_at <  '2026-04-01'
    GROUP BY c.country
),
devoluciones AS (
    SELECT
        c.country,
        ROUND(SUM(oi.quantity * oi.unit_price), 2) AS total_reembolsado
    FROM returns r
    INNER JOIN order_items oi ON oi.order_id   = r.order_id
                              AND oi.product_id = r.product_id
    INNER JOIN orders      o  ON o.order_id    = r.order_id
    INNER JOIN customers   c  ON c.customer_id = o.customer_id
    WHERE r.status      = 'refunded'
      AND r.returned_at >= '2026-01-01'
      AND r.returned_at <  '2026-04-01'
    GROUP BY c.country
)
SELECT
    rb.country                              AS pais,
    rb.revenue_bruto,
    COALESCE(d.total_reembolsado, 0)        AS total_reembolsado,
    ROUND(
        rb.revenue_bruto - COALESCE(d.total_reembolsado, 0),
        2
    )                                       AS revenue_neto,
    RANK() OVER (
        ORDER BY
            rb.revenue_bruto - COALESCE(d.total_reembolsado, 0) DESC
    )                                       AS posicion
FROM revenue_bruto rb
LEFT JOIN devoluciones d ON d.country = rb.country
ORDER BY posicion ASC;

--- Solución 23 ---
WITH revenue_mensual AS (
    SELECT
        DATE_TRUNC('month', o.ordered_at)::DATE     AS mes,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)  AS revenue_mes
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status     = 'delivered'
      AND o.ordered_at >= '2026-01-01'
      AND o.ordered_at <  '2027-01-01'
    GROUP BY DATE_TRUNC('month', o.ordered_at)
)
SELECT
    mes,
    revenue_mes,
    ROUND(
        SUM(revenue_mes) OVER (
            ORDER BY mes ASC
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ),
        2
    ) AS revenue_acumulado_ytd
FROM revenue_mensual
ORDER BY mes;

--- Solución 24 ---
WITH revenue_producto AS (
    SELECT
        p.product_id,
        p.name                                       AS producto,
        cat.category_id,
        cat.name                                     AS categoria,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)   AS revenue_total
    FROM order_items oi
    INNER JOIN products   p   ON p.product_id   = oi.product_id
    INNER JOIN categories cat ON cat.category_id = p.category_id
    GROUP BY p.product_id, p.name, cat.category_id, cat.name
),
con_promedio AS (
    SELECT
        producto,
        categoria,
        revenue_total,
        ROUND(
            AVG(revenue_total) OVER (PARTITION BY category_id),
            2
        ) AS promedio_categoria
    FROM revenue_producto
)
SELECT producto, categoria, revenue_total, promedio_categoria
FROM con_promedio
WHERE revenue_total > promedio_categoria
ORDER BY categoria, revenue_total DESC;

--- Solución 25 ---

-- PARTE A: Análisis MoM H1 2026
WITH revenue_mensual AS (
    SELECT
        DATE_TRUNC('month', o.ordered_at)::DATE     AS mes,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)  AS revenue_mes
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status     = 'delivered'
      AND o.ordered_at >= '2026-01-01'
      AND o.ordered_at <  '2026-07-01'
    GROUP BY DATE_TRUNC('month', o.ordered_at)
)
SELECT
    mes,
    revenue_mes,
    LAG(revenue_mes) OVER (ORDER BY mes)                        AS revenue_anterior,
    ROUND(
        revenue_mes - LAG(revenue_mes) OVER (ORDER BY mes),
        2
    )                                                           AS variacion_absoluta,
    ROUND(
        100.0 * (revenue_mes - LAG(revenue_mes) OVER (ORDER BY mes))
        / NULLIF(LAG(revenue_mes) OVER (ORDER BY mes), 0),
        1
    )                                                           AS variacion_pct
FROM revenue_mensual
ORDER BY mes;

-- PARTE B: Top 3 productos del semestre
WITH revenue_semestral AS (
    SELECT
        p.name                                       AS producto,
        cat.name                                     AS categoria,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)   AS revenue_total
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id    = o.order_id
    INNER JOIN products    p  ON p.product_id   = oi.product_id
    INNER JOIN categories  cat ON cat.category_id = p.category_id
    WHERE o.status     = 'delivered'
      AND o.ordered_at >= '2026-01-01'
      AND o.ordered_at <  '2026-07-01'
    GROUP BY p.name, cat.name
),
ranking AS (
    SELECT
        producto,
        categoria,
        revenue_total,
        DENSE_RANK() OVER (ORDER BY revenue_total DESC) AS posicion_global
    FROM revenue_semestral
)
SELECT producto, categoria, revenue_total, posicion_global
FROM ranking
WHERE posicion_global <= 3
ORDER BY posicion_global;

-- PARTE C: Críticos e importantes (cuartil 1 en stock Y cuartil 1 en revenue)
WITH revenue_producto AS (
    SELECT
        oi.product_id,
        ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue_total
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status     = 'delivered'
      AND o.ordered_at >= '2026-01-01'
      AND o.ordered_at <  '2026-07-01'
    GROUP BY oi.product_id
),
analisis_doble AS (
    SELECT
        p.name                                          AS producto,
        cat.name                                        AS categoria,
        i.stock,
        COALESCE(r.revenue_total, 0)                    AS revenue_total,
        NTILE(4) OVER (ORDER BY i.stock ASC)            AS cuartil_stock,
        NTILE(4) OVER (ORDER BY COALESCE(r.revenue_total, 0) DESC) AS cuartil_revenue
    FROM inventory i
    INNER JOIN products   p   ON p.product_id   = i.product_id
    INNER JOIN categories cat ON cat.category_id = p.category_id
    LEFT JOIN revenue_producto r ON r.product_id = i.product_id
)
SELECT producto, categoria, stock, revenue_total, cuartil_stock, cuartil_revenue
FROM analisis_doble
WHERE cuartil_stock   = 1    -- 25% de menor stock
  AND cuartil_revenue = 1    -- 25% de mayor revenue en H1 2026
ORDER BY stock ASC, revenue_total DESC;

*/
