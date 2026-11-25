# Nivel 5 — SQL Avanzado
## Lección 4: Window Functions — Análisis temporal, inventory y acumulados

> Tablas disponibles en este nivel: `customers`, `categories`, `products`, `orders`, `order_items`, `returns`, `inventory`

> **Nota de dialecto:** Algunos ejemplos de esta lección usan sintaxis de PostgreSQL (`DATE_TRUNC`, `EXTRACT`, `INTERVAL`, `::DATE`) que **no funciona en el Playground**, porque el Playground corre SQLite. Equivalentes en SQLite: `strftime('%Y-%m-01', fecha)` en lugar de `DATE_TRUNC('month', fecha)`; `CAST(strftime('%Y', fecha) AS INTEGER)` en lugar de `EXTRACT(YEAR FROM fecha)` (`'%m'` para el mes); `date('now', '-90 days')` en lugar de `CURRENT_DATE - INTERVAL '90 days'`; `date('2026-01-01')` en lugar de `'2026-01-01'::DATE`. Los ejercicios se validan con la sintaxis SQLite.

---

## 1. INTRODUCCIÓN CONCEPTUAL

### Preguntas que requieren ver hacia adelante o hacia atrás

La lección anterior te dio herramientas para posicionar y clasificar filas: quién es el primero, a qué cuartil pertenece, cuántos hay antes que él. Pero hay una clase de análisis diferente que aparece constantemente en e-commerce y en cualquier negocio con datos históricos:

> *"¿El revenue de este mes fue mayor o menor que el del mes anterior?"*
> *"¿Cuál fue el stock mínimo histórico de este producto?"*
> *"¿Cuánto llevamos acumulado en ventas en lo que va del año?"*

Estas preguntas tienen en común que para responderlas necesitas acceder a una fila diferente a la que estás procesando: la fila del mes anterior, la primera fila del año, la fila siguiente en la secuencia. Las Window Functions de desplazamiento y de valor hacen exactamente eso: te permiten "mirar" hacia filas adyacentes dentro de la partición.

**LAG y LEAD** acceden a filas que están N posiciones antes o después de la fila actual, dentro del orden definido en el `OVER()`. Son el mecanismo estándar para calcular variaciones período a período.

**FIRST_VALUE y LAST_VALUE** acceden al primer y último valor del marco de la ventana — útiles para comparar cada fila contra el mejor o peor registro histórico de su grupo.

**SUM() sobre una ventana ordenada** acumula el valor progresivamente a medida que avanza por las filas en orden — esto produce running totals: el revenue acumulado día a día, el stock consumido acumulado, el número de pedidos acumulados en el año.

---

## 2. SINTAXIS

### LAG(columna, n, valor_por_defecto) — acceder a la fila anterior

```sql
SELECT
    fecha,
    revenue,
    LAG(revenue, 1, 0) OVER (
        PARTITION BY categoria    -- grupo en el que opera
        ORDER BY fecha ASC        -- orden para definir "anterior"
    ) AS revenue_periodo_anterior
FROM tabla_revenue;
```

- `columna` — el valor que quieres tomar de la fila anterior.
- `n` — cuántas posiciones hacia atrás. 1 = la fila inmediatamente anterior, 2 = dos filas atrás. Si se omite, el valor por defecto es 1.
- `valor_por_defecto` — qué devolver cuando no hay fila anterior (la primera fila de la partición). Si se omite, devuelve `NULL`.

**Variación período a período:**

```sql
SELECT
    mes,
    revenue,
    LAG(revenue) OVER (ORDER BY mes)   AS revenue_mes_anterior,
    revenue - LAG(revenue) OVER (ORDER BY mes) AS variacion_absoluta,
    ROUND(
        100.0 * (revenue - LAG(revenue) OVER (ORDER BY mes))
        / NULLIF(LAG(revenue) OVER (ORDER BY mes), 0),
        1
    )                                   AS variacion_porcentual
FROM revenue_mensual
ORDER BY mes;
```

### LEAD(columna, n, valor_por_defecto) — acceder a la fila siguiente

```sql
SELECT
    mes,
    revenue,
    LEAD(revenue, 1) OVER (ORDER BY mes) AS revenue_mes_siguiente
FROM revenue_mensual;
```

`LEAD` es el espejo de `LAG`: mira hacia adelante en lugar de hacia atrás. Útil para comparar el valor actual contra el próximo período, o para detectar si el siguiente registro cumple alguna condición.

### FIRST_VALUE(columna) y LAST_VALUE(columna) — el primero y el último de la ventana

```sql
SELECT
    producto,
    fecha,
    stock,
    FIRST_VALUE(stock) OVER (
        PARTITION BY producto
        ORDER BY fecha ASC
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS stock_inicial,
    LAST_VALUE(stock) OVER (
        PARTITION BY producto
        ORDER BY fecha ASC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS stock_final
FROM historial_inventario;
```

**La trampa de LAST_VALUE y el marco de la ventana:**

`FIRST_VALUE` funciona intuitivamente: devuelve el primer valor de la partición ordenada y ese valor es el mismo para todas las filas del grupo.

`LAST_VALUE` tiene una trampa: por defecto, el marco de la ventana en PostgreSQL es `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` — es decir, "desde el inicio hasta la fila actual". Para `LAST_VALUE`, esto significa que en cada fila devuelve el último valor *hasta esa fila*, no el último de toda la partición. Para obtener el último valor de toda la partición, debes especificar explícitamente `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`.

### SUM() OVER — acumulados (running total)

```sql
SELECT
    fecha,
    revenue_diario,
    SUM(revenue_diario) OVER (
        ORDER BY fecha ASC
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS revenue_acumulado
FROM revenue_por_dia
ORDER BY fecha;
```

Con `ORDER BY` dentro del `OVER()` y sin `PARTITION BY`, `SUM()` acumula el total desde la primera fila hasta la fila actual. El resultado es una columna que crece progresivamente: el total del día 1, el total del día 1 + día 2, el total de los tres primeros días, etc.

Para acumulados por grupo (por ejemplo, revenue acumulado por categoría):

```sql
SUM(revenue_diario) OVER (
    PARTITION BY categoria    -- se reinicia en cada categoría
    ORDER BY fecha ASC
)
```

---

## 3. EJEMPLO PRÁCTICO

### Contexto: análisis de stock y variación mensual de revenue

**Query 1 — LAG: comparación mes a mes de revenue (MoM)**

Sofía de Marketing necesita ver la variación de revenue mes a mes para el primer semestre de 2026. Quiere el revenue de cada mes, el del mes anterior y la variación porcentual:

```sql
WITH revenue_mensual AS (
    -- Paso 1: revenue total por mes
    SELECT
        DATE_TRUNC('month', o.ordered_at)::DATE     AS mes,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)  AS revenue
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status     = 'delivered'
      AND o.ordered_at >= '2026-01-01'
      AND o.ordered_at <  '2026-07-01'
    GROUP BY DATE_TRUNC('month', o.ordered_at)
)
-- Paso 2: LAG para comparar con el mes anterior
SELECT
    mes,
    revenue,
    LAG(revenue) OVER (ORDER BY mes)                        AS revenue_mes_anterior,
    ROUND(
        revenue - LAG(revenue) OVER (ORDER BY mes),
        2
    )                                                       AS variacion_absoluta,
    ROUND(
        100.0 * (revenue - LAG(revenue) OVER (ORDER BY mes))
        / NULLIF(LAG(revenue) OVER (ORDER BY mes), 0),
        1
    )                                                       AS variacion_pct
FROM revenue_mensual
ORDER BY mes;
```

Output:

| mes | revenue | revenue_mes_anterior | variacion_absoluta | variacion_pct |
|---|---|---|---|---|
| 2026-01-01 | 142350.00 | NULL | NULL | NULL |
| 2026-02-01 | 128740.00 | 142350.00 | -13610.00 | -9.6 |
| 2026-03-01 | 165820.00 | 128740.00 | 37080.00 | 28.8 |
| 2026-04-01 | 153290.00 | 165820.00 | -12530.00 | -7.6 |
| 2026-05-01 | 198450.00 | 153290.00 | 45160.00 | 29.5 |
| 2026-06-01 | 171230.00 | 198450.00 | -27220.00 | -13.7 |

El primer mes tiene NULL en `revenue_mes_anterior` porque no hay mes previo en el dataset — comportamiento esperado y correcto. Marzo y mayo fueron los mejores meses en crecimiento. Mayo a junio hubo una caída — Sofía querrá investigar qué pasó.

**Query 2 — FIRST_VALUE y LAST_VALUE: variación de stock desde la primera actualización**

Diego quiere ver, para cada producto, el stock en la primera actualización de inventario registrada y el stock actual, para calcular cuánto se consumió:

```sql
SELECT
    p.name                      AS producto,
    i.updated_at,
    i.stock,
    FIRST_VALUE(i.stock) OVER (
        PARTITION BY i.product_id
        ORDER BY i.updated_at ASC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    )                           AS stock_inicial,
    LAST_VALUE(i.stock) OVER (
        PARTITION BY i.product_id
        ORDER BY i.updated_at ASC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    )                           AS stock_actual,
    FIRST_VALUE(i.stock) OVER (
        PARTITION BY i.product_id
        ORDER BY i.updated_at ASC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) - LAST_VALUE(i.stock) OVER (
        PARTITION BY i.product_id
        ORDER BY i.updated_at ASC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    )                           AS consumo_historico
FROM inventory i
INNER JOIN products p ON p.product_id = i.product_id
ORDER BY p.name, i.updated_at;
```

Nota sobre la estructura: si el schema tiene un registro por producto en `inventory` (solo el estado actual), `FIRST_VALUE` y `LAST_VALUE` darían el mismo resultado. Esta query es más relevante cuando `inventory` registra múltiples snapshots históricos del stock. El patrón es correcto como técnica — en un entorno real, `inventory` tendría una fila por fecha de actualización.

**Query 3 — Análisis de urgencia de reposición con Window Functions**

Combinando lo aprendido: ranking de productos por urgencia de reposición. Urgencia = productos con stock bajo y ventas altas tienen prioridad máxima:

```sql
WITH ventas_producto AS (
    -- Revenue y unidades vendidas totales por producto
    SELECT
        oi.product_id,
        SUM(oi.quantity)                           AS unidades_vendidas,
        ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue_total
    FROM order_items oi
    INNER JOIN orders o ON o.order_id = oi.order_id
    WHERE o.status = 'delivered'
    GROUP BY oi.product_id
),
stock_con_ventas AS (
    -- Cruza inventario con ventas y añade el promedio de ventas diarias (90 días)
    SELECT
        p.name                          AS producto,
        cat.name                        AS categoria,
        i.stock,
        v.unidades_vendidas,
        v.revenue_total,
        ROUND(v.unidades_vendidas / 90.0, 2) AS ventas_diarias_prom,
        ROUND(i.stock / NULLIF(v.unidades_vendidas / 90.0, 0), 1) AS dias_cobertura
    FROM inventory i
    INNER JOIN products     p   ON p.product_id   = i.product_id
    INNER JOIN categories   cat ON cat.category_id = p.category_id
    LEFT JOIN ventas_producto v  ON v.product_id   = i.product_id
)
SELECT
    producto,
    categoria,
    stock,
    ventas_diarias_prom,
    dias_cobertura,
    -- Ranking global de urgencia (stock bajo + ventas altas = mayor urgencia)
    RANK() OVER (
        ORDER BY
            dias_cobertura ASC NULLS FIRST,   -- menos días = más urgente
            ventas_diarias_prom DESC           -- desempate: más ventas = más urgente
    )                                         AS ranking_urgencia,
    -- Cuartil de stock en el catálogo (1 = cuarto con menor stock)
    NTILE(4) OVER (ORDER BY stock ASC)        AS cuartil_stock
FROM stock_con_ventas
ORDER BY ranking_urgencia;
```

Output (primeras filas — los más urgentes primero):

| producto | categoria | stock | ventas_diarias_prom | dias_cobertura | ranking_urgencia | cuartil_stock |
|---|---|---|---|---|---|---|
| Zapatillas Running Nike | Deportes | 0 | 1.97 | NULL | 1 | 1 |
| Cable USB-C Anker 2m | Tecnología | 3 | 4.73 | 0.6 | 2 | 1 |
| Camiseta Básica Algodón | Ropa | 8 | 2.88 | 2.8 | 3 | 1 |
| Smartphone Samsung Galaxy A54 | Tecnología | 24 | 3.21 | 7.5 | 4 | 1 |

**Query 4 — SUM running total: revenue acumulado mes a mes**

```sql
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
    SUM(revenue_mes) OVER (
        ORDER BY mes ASC
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS revenue_acumulado_ytd
FROM revenue_mensual
ORDER BY mes;
```

Output:

| mes | revenue_mes | revenue_acumulado_ytd |
|---|---|---|
| 2026-01-01 | 142350.00 | 142350.00 |
| 2026-02-01 | 128740.00 | 271090.00 |
| 2026-03-01 | 165820.00 | 436910.00 |
| 2026-04-01 | 153290.00 | 590200.00 |
| 2026-05-01 | 198450.00 | 788650.00 |
| 2026-06-01 | 171230.00 | 959880.00 |

El running total permite visualizar el progreso hacia metas anuales: "necesitamos $1.2M para fin de año, llevamos $959.880 a junio" — ese tipo de lectura de negocio se hace directamente desde esta columna.

---

## 4. CASOS DE USO REALES

**Caso 1 — Comparación mes a mes (MoM) y año a año (YoY)**
El análisis de variación temporal es el más común en reportes ejecutivos. Revenue de este mes vs. el anterior, pedidos de este trimestre vs. el mismo trimestre del año pasado, tasa de conversión de esta semana vs. la semana anterior. `LAG(valor, 1)` para MoM, `LAG(valor, 12)` para YoY en series mensuales.
*Rol que lo usa: Data Analyst, Finance Analyst, Business Analyst.*

**Caso 2 — Running totals para seguimiento de objetivos**
Los dashboards de seguimiento de KPIs casi siempre muestran el acumulado del año o del trimestre junto con la meta. `SUM() OVER (ORDER BY fecha)` produce esa columna acumulada directamente en SQL, sin necesidad de post-procesar en la capa de visualización.
*Rol que lo usa: Data Analyst, BI Developer.*

**Caso 3 — Análisis de urgencia multi-criterio**
En operaciones de supply chain, la prioridad de reposición combina varios factores: stock actual, velocidad de venta, días de entrega del proveedor, margen del producto. Las Window Functions permiten calcular rankings y cuartiles para cada criterio y combinarlos en un índice de urgencia sin múltiples queries separadas.
*Rol que lo usa: Supply Chain Analyst, Operations Analyst.*

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico
**Contexto (Briefing 5.2):** Diego quiere ver, para cada categoría, el producto con el stock más bajo. Si dos productos de la misma categoría tienen el mismo stock mínimo, quiere verlos a ambos.

Escribe la query usando `RANK()` o `DENSE_RANK()` con `PARTITION BY` sobre la categoría y `ORDER BY` sobre el stock ascendente. Filtra para mostrar solo los que tienen el menor stock dentro de su categoría (posición 1).

**Tablas necesarias:** `inventory`, `products`, `categories`

**Resultado esperado:** Una fila por categoría (o más si hay empate en el mínimo). Columnas: categoría, nombre del producto, stock.

**Criterio de éxito:** Usas `RANK()` o `DENSE_RANK()` (no `ROW_NUMBER()`). El `PARTITION BY` agrupa por categoría. El `ORDER BY` dentro del `OVER()` es ascendente (menor stock primero). Filtras `posicion = 1` en la query exterior.

---

### Ejercicio Intermedio
**Contexto (Briefing 5.11):** Sofía quiere ver el revenue de los últimos 6 meses (diciembre 2025 a mayo 2026) con la variación mes a mes. Para cada mes necesita: el revenue total, el revenue del mes anterior, la variación absoluta y la variación porcentual. Si el mes anterior es NULL (primer mes de la serie), muestra NULL en esas columnas — es el comportamiento esperado.

Escribe la query usando una CTE para calcular el revenue mensual y luego aplicando `LAG()` en la query principal.

**Tablas necesarias:** `orders`, `order_items`

**Resultado esperado:** 6 filas (una por mes), con 5 columnas: mes, revenue_mes, revenue_anterior, variacion_absoluta, variacion_pct. El primer mes tiene NULL en las últimas tres columnas.

**Criterio de éxito:** Usas `LAG(revenue, 1)` con `ORDER BY mes`. La variación porcentual usa `NULLIF` en el denominador para evitar división por cero. Los valores están redondeados a 2 decimales.

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
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
ORDER BY categoria, producto;
```

**Solución Ejercicio Intermedio:**
```sql
WITH revenue_mensual AS (
    SELECT
        DATE_TRUNC('month', o.ordered_at)::DATE     AS mes,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)  AS revenue_mes
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status     = 'delivered'
      AND o.ordered_at >= '2025-12-01'
      AND o.ordered_at <  '2026-06-01'
    GROUP BY DATE_TRUNC('month', o.ordered_at)
)
SELECT
    mes,
    revenue_mes,
    LAG(revenue_mes) OVER (ORDER BY mes)                       AS revenue_anterior,
    ROUND(
        revenue_mes - LAG(revenue_mes) OVER (ORDER BY mes),
        2
    )                                                          AS variacion_absoluta,
    ROUND(
        100.0 * (revenue_mes - LAG(revenue_mes) OVER (ORDER BY mes))
        / NULLIF(LAG(revenue_mes) OVER (ORDER BY mes), 0),
        1
    )                                                          AS variacion_pct
FROM revenue_mensual
ORDER BY mes;
```

</details>

---

## 6. ERRORES COMUNES

**Error 1 — LAST_VALUE sin el marco de ventana explícito**

```sql
-- INCORRECTO: devuelve el valor de la fila actual, no el último de la partición
SELECT
    producto,
    stock,
    LAST_VALUE(stock) OVER (
        PARTITION BY categoria
        ORDER BY fecha ASC
        -- sin especificar ROWS BETWEEN... el marco por defecto es hasta la fila actual
    ) AS stock_final
FROM historial;
```

El resultado parece correcto para la última fila de cada partición, pero para todas las demás filas devuelve el valor de esa misma fila — porque el marco termina en `CURRENT ROW`. La corrección:

```sql
-- CORRECTO: marco explícito que incluye toda la partición
LAST_VALUE(stock) OVER (
    PARTITION BY categoria
    ORDER BY fecha ASC
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
)
```

**Error 2 — LAG sobre datos sin ORDER BY definido produce resultados no deterministas**

```sql
-- PELIGROSO: sin ORDER BY, ¿cuál es "la fila anterior"?
LAG(revenue) OVER (PARTITION BY categoria)   -- falta ORDER BY
```

Sin `ORDER BY` en el `OVER()`, el concepto de "fila anterior" no tiene significado determinista — el motor puede devolver cualquier fila. Para `LAG` y `LEAD`, el `ORDER BY` dentro del `OVER()` es obligatorio para que el resultado tenga sentido.

**Error 3 — Usar LAG para comparación anual con el offset incorrecto**

```sql
-- INCORRECTO para YoY con datos mensuales: LAG(revenue, 1) da el mes anterior, no el año anterior
LAG(revenue, 1) OVER (ORDER BY mes)    -- mes anterior (MoM), no año anterior (YoY)

-- CORRECTO para YoY con series mensuales: offset de 12 meses
LAG(revenue, 12) OVER (ORDER BY mes)   -- 12 posiciones atrás = mismo mes del año anterior
```

El segundo argumento de `LAG` es el número de posiciones a mirar hacia atrás — no un intervalo de tiempo. Si los datos son mensuales y quieres comparar con el mismo mes del año anterior, el offset es 12 (12 meses). Si falta algún mes en los datos, el offset puede no apuntar al mes correcto.

**Error 4 — Running total que no se reinicia por grupo**

```sql
-- Si quieres el acumulado por categoría, el PARTITION BY es obligatorio
-- Sin él, el acumulado es global — se va sumando para todas las categorías juntas
SUM(revenue) OVER (ORDER BY mes)                        -- acumulado global: probablemente no lo que querías
SUM(revenue) OVER (PARTITION BY categoria ORDER BY mes) -- acumulado por categoría: correcto
```

El error es silencioso: la query no falla, pero el acumulado mezcla todas las categorías en un solo total creciente. Si el análisis requiere el acumulado separado por categoría, el `PARTITION BY` es necesario.

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

Con CTEs y Window Functions tienes ahora las herramientas para construir análisis que antes requerirían múltiples pasos en Excel o herramientas externas. Pero hay una dimensión adicional en el trabajo de un analista senior: no solo producir el análisis correcto, sino producirlo de forma eficiente — entender por qué algunas queries son lentas, cómo los índices aceleran la búsqueda, y cómo las transacciones garantizan que múltiples operaciones se ejecuten de forma segura y completa.

El Nivel 6 introduce las Window Functions de analítica avanzada (cohortes, funnel, atribución), y el Nivel 8 cubre los fundamentos de rendimiento: índices, transacciones y lectura básica de planes de ejecución. Pero antes de llegar ahí, el Capstone Final te dará la oportunidad de combinar todas las herramientas del curso en un análisis completo de ShopSphere.
