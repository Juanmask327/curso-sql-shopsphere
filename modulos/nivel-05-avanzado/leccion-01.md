# Nivel 5 — SQL Avanzado
## Lección 1: CTEs — Nombrar pasos intermedios para hacer el código legible

> Tablas disponibles en este nivel: `customers`, `categories`, `products`, `orders`, `order_items`, `returns`, `inventory`

---

## 1. INTRODUCCIÓN CONCEPTUAL

### El problema de las queries que nadie puede leer

Diego te escribe a las 8:47 de la mañana:

> *"Necesito saber qué productos tienen stock para menos de 15 días basándome en su promedio de ventas diarias. Para la reunión de las 10."*

La query que resuelve eso tiene al menos dos pasos: primero calcular cuántas unidades se venden por día en promedio para cada producto, y después dividir el stock actual entre ese número para obtener los días de cobertura. Cada paso por separado es manejable. Anidados, la query se vuelve un bloque de texto que nadie — incluyendo tú tres días después — puede mantener.

La solución es la **CTE** (Common Table Expression): la capacidad de darle un nombre a una query intermedia y referirla como si fuera una tabla.

En lugar de escribir:

```sql
SELECT producto, stock / dias_ventas AS dias_cobertura
FROM (
    SELECT p.name AS producto, i.stock,
           SUM(oi.quantity) / 90.0 AS dias_ventas
    FROM inventory i
    INNER JOIN products p ON p.product_id = i.product_id
    INNER JOIN order_items oi ON oi.product_id = i.product_id
    GROUP BY p.name, i.stock
) AS sub
WHERE stock / dias_ventas < 15;
```

Escribes:

```sql
WITH ventas_diarias AS (
    SELECT p.name AS producto, i.stock,
           SUM(oi.quantity) / 90.0 AS dias_ventas
    FROM inventory i
    INNER JOIN products p ON p.product_id = i.product_id
    INNER JOIN order_items oi ON oi.product_id = i.product_id
    GROUP BY p.name, i.stock
)
SELECT producto, stock, ROUND(stock / NULLIF(dias_ventas, 0), 1) AS dias_cobertura
FROM ventas_diarias
WHERE stock / NULLIF(dias_ventas, 0) < 15;
```

El código hace exactamente lo mismo. Pero ahora puedes leer qué hace `ventas_diarias` antes de ver cómo se usa. La intención es visible.

**La analogía de las variables:** En cualquier lenguaje de programación puedes asignar un valor complejo a una variable y usarla después. Las CTEs son eso aplicado a SQL: asignas el resultado de una query a un nombre, y ese nombre se convierte en una "tabla temporal" que existe solo durante la ejecución de la query principal.

**Por qué existen:** Las subqueries en el `FROM` (tablas derivadas) hacen lo mismo técnicamente. Pero tienen dos limitaciones: (1) solo puedes definirlas en el punto donde las usas — lo que fuerza el anidado — y (2) si necesitas referenciar el mismo cálculo dos veces, tienes que repetirlo o anidarlo dos veces. Las CTEs resuelven ambos problemas.

---

## 2. SINTAXIS

### Forma canónica — CTE simple

```sql
WITH nombre_cte AS (
    -- query que define la CTE
    SELECT ...
    FROM ...
    WHERE ...
)
-- query principal que usa la CTE como si fuera una tabla
SELECT columnas
FROM nombre_cte
WHERE condicion;
```

**Parámetros obligatorios:**
- `WITH` — la palabra clave que inicia el bloque de CTEs. Va antes del `SELECT` principal.
- `nombre_cte` — el nombre que le das a esta tabla temporal. Debe ser un identificador SQL válido (sin espacios, sin caracteres especiales).
- `AS (...)` — los paréntesis contienen la query completa que define la CTE.
- La query principal viene después del paréntesis de cierre, sin coma al final.

**Reglas críticas de sintaxis:**
- La palabra `WITH` va una sola vez, al inicio de todo.
- La CTE no termina con punto y coma — termina cuando se cierra el paréntesis.
- El punto y coma va al final de la query principal, no después de la CTE.

### CTEs múltiples encadenadas

```sql
WITH
cte_uno AS (
    SELECT ...
    FROM tabla_real
),
cte_dos AS (
    SELECT ...
    FROM cte_uno    -- puede referenciar a cte_uno
    WHERE ...
),
cte_tres AS (
    SELECT ...
    FROM cte_uno
    INNER JOIN cte_dos ON ...   -- puede usar varias CTEs anteriores
)
SELECT *
FROM cte_tres;
```

**Reglas de referencia entre CTEs:**
- Cada CTE puede referenciar las CTEs definidas antes que ella (las que aparecen más arriba en la lista).
- Una CTE NO puede referenciar una CTE definida después de ella — las referencias son hacia arriba, nunca hacia abajo.
- La query principal puede referenciar cualquier CTE del bloque.
- Las CTEs se separan por comas — la última CTE no lleva coma.

### CTE como "variable de tabla" — el patrón de calcular una vez y usar múltiples veces

```sql
WITH metricas_producto AS (
    -- Este cálculo se hace una sola vez
    SELECT
        product_id,
        SUM(quantity * unit_price) AS revenue_total,
        SUM(quantity)              AS unidades_totales
    FROM order_items
    GROUP BY product_id
)
-- Y se puede referenciar múltiples veces sin repetir la query
SELECT
    p.name,
    m.revenue_total,
    m.unidades_totales,
    ROUND(m.revenue_total / NULLIF(m.unidades_totales, 0), 2) AS precio_prom
FROM products p
INNER JOIN metricas_producto m ON m.product_id = p.product_id
WHERE m.revenue_total > 10000
ORDER BY m.revenue_total DESC;
```

Sin CTE, el `SUM(quantity * unit_price)` habría que escribirlo dos veces (en el SELECT y en el WHERE) o anidarlo en un subquery. Con CTE, se calcula una vez y se usa cuantas veces se necesite.

### CTE vs. subquery en FROM — cuándo usar cada una

| Criterio | Subquery en FROM | CTE |
|---|---|---|
| Se necesita solo en un punto | Preferible | Funciona pero es más verboso |
| Se necesita en dos o más lugares | Hay que repetirla | Definir una vez, usar N veces |
| La query tiene más de 2 niveles | Se vuelve ilegible | Clarifca la estructura |
| Quieres debuggear paso a paso | Difícil | Puedes ejecutar cada CTE por separado para verificar su resultado |
| Rendimiento en PostgreSQL | El motor decide | CTE se materializa por defecto (ver nota al final) |

La regla práctica: si la query tiene más de un nivel de anidado, o si necesitas referenciar el mismo cálculo en más de un lugar, usa CTE.

---

## 3. EJEMPLO PRÁCTICO

### Contexto: Diego necesita la lista de stock crítico para la reunión de las 10

Diego quiere saber qué productos tienen stock para menos de 15 días de ventas, basado en el promedio de ventas diarias de los últimos 90 días. El resultado debe incluir el nombre del producto, la categoría, el stock actual y los días de cobertura estimados.

**Query 1 — CTE simple: calcular ventas diarias promedio**

Primero definimos solo el cálculo de ventas diarias, para verificar que el resultado intermedio es correcto antes de agregar la segunda parte:

```sql
WITH ventas_diarias AS (
    SELECT
        p.product_id,
        p.name                              AS producto,
        cat.name                            AS categoria,
        SUM(oi.quantity) / 90.0             AS ventas_por_dia
    FROM order_items oi
    INNER JOIN products   p   ON p.product_id   = oi.product_id
    INNER JOIN categories cat ON cat.category_id = p.category_id
    INNER JOIN orders     o   ON o.order_id     = oi.order_id
    WHERE o.ordered_at >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY p.product_id, p.name, cat.name
)
SELECT *
FROM ventas_diarias
ORDER BY ventas_por_dia DESC
LIMIT 5;
```

Output (top 5 por velocidad de ventas):

| product_id | producto | categoria | ventas_por_dia |
|---|---|---|---|
| 3 | Cable USB-C Anker 2m | Tecnología | 4.73 |
| 7 | Smartphone Samsung Galaxy A54 | Tecnología | 3.21 |
| 12 | Camiseta Básica Algodón | Ropa | 2.88 |
| 1 | Laptop Lenovo IdeaPad 3 15" | Tecnología | 2.14 |
| 19 | Zapatillas Running Nike | Deportes | 1.97 |

El Cable USB-C se vende casi 5 unidades por día. Si tiene poco stock, es una urgencia de reposición.

**Query 2 — CTEs múltiples encadenadas: stock crítico con días de cobertura**

Ahora agregamos la segunda CTE que incorpora el inventario y calcula días de cobertura. La query final filtra los productos críticos:

```sql
WITH ventas_diarias AS (
    -- CTE 1: promedio de ventas por día en los últimos 90 días
    SELECT
        p.product_id,
        p.name                              AS producto,
        cat.name                            AS categoria,
        SUM(oi.quantity) / 90.0             AS ventas_por_dia
    FROM order_items oi
    INNER JOIN products   p   ON p.product_id   = oi.product_id
    INNER JOIN categories cat ON cat.category_id = p.category_id
    INNER JOIN orders     o   ON o.order_id     = oi.order_id
    WHERE o.ordered_at >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY p.product_id, p.name, cat.name
),
cobertura_stock AS (
    -- CTE 2: cruza ventas diarias con el inventario actual
    -- y calcula cuántos días alcanza el stock
    SELECT
        vd.producto,
        vd.categoria,
        i.stock                             AS stock_actual,
        ROUND(
            i.stock / NULLIF(vd.ventas_por_dia, 0),
            1
        )                                   AS dias_cobertura
    FROM ventas_diarias vd
    INNER JOIN inventory i ON i.product_id = vd.product_id
)
-- Query principal: filtra los que tienen menos de 15 días de cobertura
SELECT
    producto,
    categoria,
    stock_actual,
    dias_cobertura
FROM cobertura_stock
WHERE dias_cobertura < 15
   OR stock_actual = 0          -- stock cero siempre es crítico, aunque no haya ventas
ORDER BY
    CASE WHEN stock_actual = 0 THEN 0 ELSE 1 END,   -- stock cero primero
    dias_cobertura ASC;
```

Output (productos con stock crítico):

| producto | categoria | stock_actual | dias_cobertura |
|---|---|---|---|
| Zapatillas Running Nike | Deportes | 0 | NULL |
| Cable USB-C Anker 2m | Tecnología | 3 | 0.6 |
| Camiseta Básica Algodón | Ropa | 8 | 2.8 |
| Smartphone Samsung Galaxy A54 | Tecnología | 24 | 7.5 |
| Funda iPhone 14 Pro | Tecnología | 19 | 12.1 |

Diego puede llevar esta lista a la reunión de las 10. Los de stock cero son urgencias inmediatas. Los de 1-3 días necesitan orden de compra hoy.

**Por qué este patrón de dos CTEs es correcto:**
- `ventas_diarias` hace un cálculo costoso (JOIN de 4 tablas + GROUP BY). Se define una vez.
- `cobertura_stock` usa `ventas_diarias` como si fuera una tabla — no repite el JOIN.
- La query final es de lectura simple: solo un `WHERE` y un `ORDER BY` sobre `cobertura_stock`.
- Si el cálculo de días necesita ajustarse (por ejemplo, cambiar 90 días a 60), se modifica en un solo lugar dentro de `ventas_diarias`.

---

## 4. CASOS DE USO REALES

**Caso 1 — Análisis en capas (el uso más frecuente de CTEs múltiples)**
En análisis de negocio complejo es habitual construir el resultado en 3 o 4 pasos: primero calcular métricas brutas, luego enriquecerlas con dimensiones, luego calcular ratios o rankings sobre esas métricas. Las CTEs permiten nombrar cada capa explícitamente. Una query de análisis de LTV de clientes típicamente tiene 4 CTEs: `pedidos_por_cliente`, `revenue_por_cliente`, `segmento_cliente`, `ltv_calculado`.
*Rol que lo usa: Data Analyst, Analytics Engineer.*

**Caso 2 — Debugging paso a paso**
Cuando una query produce resultados inesperados, las CTEs permiten aislar el problema. Puedes ejecutar solo la primera CTE para verificar que sus datos son correctos, luego agregar la segunda, y así sucesivamente. Con subqueries anidadas, tienes que desconstruir la query completa para hacer lo mismo.
*Rol que lo usa: Data Analyst, Data Engineer, DBA.*

**Caso 3 — Reusabilidad de cálculos costosos dentro de una query**
Si necesitas calcular el revenue total de cada producto y luego usarlo tanto para filtrar como para calcular porcentajes sobre el total, sin CTE tendrías que repetir la subquery dos veces o anidar tres niveles. Con CTE, el cálculo costoso ocurre una vez y se referencia dos veces en la query exterior.
*Rol que lo usa: Data Analyst, Business Intelligence Developer.*

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico
**Contexto (Briefing 5.1):** Diego necesita la lista de productos con stock por debajo de 10 unidades, ordenados de menor a mayor stock (los de stock cero primero). Necesita ver: nombre del producto, nombre de la categoría, stock actual y su posición en el ranking de urgencia. Si dos productos tienen el mismo stock, el desempate es el nombre en orden alfabético.

Escribe la query usando al menos una CTE. La CTE debe encargarse de cruzar inventario con productos y categorías. La query principal aplica el filtro de stock < 10 y el orden correcto.

**Tablas necesarias:** `inventory`, `products`, `categories`

**Resultado esperado:** Lista de productos críticos ordenados por urgencia. El ranking de urgencia es simplemente la posición en el resultado (fila 1 = más urgente). Puede haber pocos o muchos según los datos del seed.

**Criterio de éxito:** Usas `WITH ... AS (...)`. La CTE hace el JOIN de las tres tablas. La query principal filtra `stock < 10`. El orden es `stock ASC` con desempate por `producto ASC`. La posición de urgencia puede calcularse en la query principal o simplemente ser el número de fila del resultado.

---

### Ejercicio Intermedio
**Contexto (Briefing 5.6):** Valentina quiere saber qué productos generan más revenue que el promedio de su propia categoría — no el promedio global, sino el de su grupo. Para cada uno, necesita: nombre del producto, categoría, su revenue total y el promedio de la categoría. Ordena por categoría y dentro de cada categoría por revenue descendente.

Escribe la query usando dos CTEs encadenadas: la primera calcula el revenue total por producto, la segunda calcula el promedio de revenue por categoría. La query principal cruza ambas y filtra los productos que superan el promedio de su categoría.

**Tablas necesarias:** `order_items`, `products`, `categories`

**Resultado esperado:** Lista de productos "above average" dentro de su categoría. Aparecen con su revenue total y el promedio de la categoría para comparar.

**Criterio de éxito:** Tienes exactamente dos CTEs. La segunda referencia a la primera. La query principal usa ambas. El filtro compara el revenue del producto contra el promedio de su categoría (no el promedio global).

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
WITH inventario_completo AS (
    SELECT
        p.name      AS producto,
        cat.name    AS categoria,
        i.stock
    FROM inventory i
    INNER JOIN products   p   ON p.product_id   = i.product_id
    INNER JOIN categories cat ON cat.category_id = p.category_id
)
SELECT
    producto,
    categoria,
    stock
FROM inventario_completo
WHERE stock < 10
ORDER BY stock ASC, producto ASC;
```

Nota: la posición de urgencia se lee directamente como el número de fila en el resultado — el primer registro es el más urgente. Si se requiere una columna explícita de ranking, se puede añadir `ROW_NUMBER()` (Lección 3 de este nivel).

**Solución Ejercicio Intermedio:**
```sql
WITH revenue_producto AS (
    -- CTE 1: revenue total por producto con su categoría
    SELECT
        p.product_id,
        p.name                                   AS producto,
        cat.category_id,
        cat.name                                 AS categoria,
        SUM(oi.quantity * oi.unit_price)         AS revenue_total
    FROM order_items oi
    INNER JOIN products   p   ON p.product_id   = oi.product_id
    INNER JOIN categories cat ON cat.category_id = p.category_id
    GROUP BY p.product_id, p.name, cat.category_id, cat.name
),
promedio_categoria AS (
    -- CTE 2: promedio de revenue de los productos en cada categoría
    -- referencia a revenue_producto (CTE anterior)
    SELECT
        category_id,
        AVG(revenue_total)  AS promedio_revenue
    FROM revenue_producto
    GROUP BY category_id
)
-- Query principal: filtra productos por encima del promedio de su categoría
SELECT
    rp.producto,
    rp.categoria,
    ROUND(rp.revenue_total, 2)      AS revenue_total,
    ROUND(pc.promedio_revenue, 2)   AS promedio_categoria
FROM revenue_producto rp
INNER JOIN promedio_categoria pc ON pc.category_id = rp.category_id
WHERE rp.revenue_total > pc.promedio_revenue
ORDER BY rp.categoria, rp.revenue_total DESC;
```

</details>

---

## 6. ERRORES COMUNES

**Error 1 — Poner el punto y coma después de la CTE en lugar de al final**

```sql
-- INCORRECTO: el punto y coma cierra la query antes de que empiece la principal
WITH ventas AS (
    SELECT product_id, SUM(quantity) AS total
    FROM order_items
    GROUP BY product_id
);                          -- <-- este punto y coma es el error

SELECT * FROM ventas;       -- ya no puede ver la CTE
```

Error típico: `ERROR: syntax error at or near "SELECT"` (en la línea del SELECT principal).

El punto y coma va al final de la query completa — después del SELECT principal, no después de la CTE.

```sql
-- CORRECTO
WITH ventas AS (
    SELECT product_id, SUM(quantity) AS total
    FROM order_items
    GROUP BY product_id
)
SELECT * FROM ventas;       -- punto y coma solo aquí
```

**Error 2 — Referenciar una CTE que aún no fue definida**

```sql
-- INCORRECTO: cte_dos intenta referenciar cte_tres, que viene después
WITH
cte_dos AS (
    SELECT * FROM cte_tres WHERE ...   -- error: cte_tres no existe aún
),
cte_tres AS (
    SELECT * FROM products
)
SELECT * FROM cte_dos;
```

Error típico: `ERROR: relation "cte_tres" does not exist`

Las CTEs solo pueden referenciar las que aparecen más arriba en la lista. Si `cte_dos` necesita datos de `cte_tres`, hay que reordenar: primero `cte_tres`, después `cte_dos`.

```sql
-- CORRECTO: las CTEs se definen en orden de dependencia
WITH
cte_tres AS (
    SELECT * FROM products
),
cte_dos AS (
    SELECT * FROM cte_tres WHERE ...
)
SELECT * FROM cte_dos;
```

**Error 3 — Poner coma después de la última CTE**

```sql
-- INCORRECTO: coma después de la última CTE antes de la query principal
WITH
cte_uno AS (SELECT ...),
cte_dos AS (SELECT ...),    -- <-- esta coma está de más
SELECT * FROM cte_dos;
```

Error típico: `ERROR: syntax error at or near "SELECT"`

Solo va coma entre CTEs, no después de la última. La última CTE va directamente seguida del SELECT principal.

**Error 4 — Usar una columna calculada en la CTE con un nombre que luego se confunde**

```sql
-- AMBIGÜEDAD: la CTE calcula "revenue" pero la query exterior filtra por "revenue_total"
WITH metricas AS (
    SELECT product_id, SUM(quantity * unit_price) AS revenue
    FROM order_items GROUP BY product_id
)
SELECT * FROM metricas WHERE revenue_total > 1000;
-- ERROR: column "revenue_total" does not exist
```

La columna se llama `revenue` dentro de la CTE. La query exterior debe usar ese mismo nombre: `WHERE revenue > 1000`. Nombrar las columnas de la CTE con precisión y consistencia evita este error.

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

Las CTEs que acabas de aprender procesan datos planos: tablas que tienen filas sin relación jerárquica entre sí. Pero ShopSphere tiene datos que sí son jerárquicos — las categorías pueden tener subcategorías, que pueden tener sub-subcategorías. Para recorrer ese tipo de estructura en SQL existe un mecanismo especial: la **CTE recursiva**, que se llama a sí misma hasta alcanzar el fondo del árbol. Es el mismo `WITH` que acabas de aprender, con una regla de estructura adicional que la hace capaz de navegar jerarquías de profundidad arbitraria.
