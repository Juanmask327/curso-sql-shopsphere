# Nivel 5 — SQL Avanzado
## Lección 3: Window Functions — Calcular sobre grupos sin colapsar filas

> Tablas disponibles en este nivel: `customers`, `categories`, `products`, `orders`, `order_items`, `returns`, `inventory`

---

## 1. INTRODUCCIÓN CONCEPTUAL

### El límite de GROUP BY — y cómo las Window Functions lo rompen

Marco tiene una pregunta que parece simple:

> *"¿Quiénes son los tres mejores clientes en cada país?"*

Con `GROUP BY` y `SUM` puedes calcular el revenue de cada cliente. Pero en el momento en que aplicas `GROUP BY`, cada cliente se convierte en una sola fila de agregado — ya no puedes ver si ese cliente es el primero, el segundo o el tercero en su país. Para saber el ranking por país, necesitas comparar el revenue de cada cliente con el de los otros clientes del mismo país. `GROUP BY` no puede hacer eso: colapsa las filas y pierde la información individual.

La solución con las herramientas previas sería escribir una subquery correlacionada por país, o cinco queries separadas (una por país) y pegar los resultados. Funciona, pero escala pésimo.

Las **Window Functions** resuelven esto de forma elegante: calculan un valor sobre un conjunto de filas relacionadas (la "ventana"), pero en lugar de colapsar esas filas en una sola, devuelven el resultado calculado para cada fila individual. La fila mantiene todos sus datos originales y además recibe el valor calculado sobre su ventana.

**La analogía del examen:** Imagina que tienes las notas de todos los alumnos de un colegio. Con `GROUP BY` puedes calcular el promedio por curso — pero obtienes una fila por curso, no por alumno. Con una Window Function, cada alumno conserva su nota individual y además recibe el promedio de su propio curso, el puesto que ocupa en su curso, y el percentil al que pertenece. Toda esa información calculada por grupo, fila por fila.

**La diferencia clave resumida:**
- `GROUP BY`: colapsa N filas en 1 fila por grupo. Pierdes los datos individuales.
- `Window Function` con `OVER()`: agrega información calculada a cada fila sin eliminar ninguna.

---

## 2. SINTAXIS

### Forma canónica

```sql
SELECT
    columnas_normales,
    FUNCION_WINDOW() OVER (
        PARTITION BY columna_de_grupo    -- define los grupos (como GROUP BY, pero sin colapsar)
        ORDER BY columna_de_orden        -- define el orden dentro de cada grupo
    ) AS alias
FROM tabla;
```

**Componentes del `OVER()`:**

- `PARTITION BY columna` — divide las filas en grupos. La función se calcula de forma independiente en cada grupo. Si se omite, el grupo es toda la tabla.
- `ORDER BY columna` — dentro de cada grupo, define el orden en que se procesan las filas. Obligatorio para funciones de ranking. Para funciones de agregación sin orden (como `SUM` total de la partición) se puede omitir.
- `ROWS/RANGE BETWEEN` — define el "marco" de filas que ve la función dentro de cada partición. Por defecto varía según la función (se explica en detalle en Lección 4).

### ROW_NUMBER() — numeración única sin empates

```sql
SELECT
    customer_id,
    first_name,
    country,
    ROW_NUMBER() OVER (
        PARTITION BY country
        ORDER BY revenue DESC
    ) AS posicion_en_pais
FROM ...
```

`ROW_NUMBER()` asigna un número entero único a cada fila dentro de la partición, empezando en 1. Si dos filas tienen el mismo `revenue`, el número asignado es arbitrario — una obtiene 1 y la otra 2, pero cuál es cuál depende del motor. No hay empates en el resultado: siempre números distintos.

**Uso más frecuente:** filtrar "el mejor de cada grupo" usando `WHERE posicion = 1` en un subquery o CTE:

```sql
WITH ranking AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY country ORDER BY revenue DESC) AS rn
    FROM tabla_con_revenue
)
SELECT * FROM ranking WHERE rn = 1;  -- el mejor de cada país
```

### RANK() vs. DENSE_RANK() — empates con y sin huecos

| Datos | ROW_NUMBER() | RANK() | DENSE_RANK() |
|---|---|---|---|
| Cliente A — $1.200 | 1 | 1 | 1 |
| Cliente B — $1.200 | 2 | 1 | 1 |
| Cliente C — $900 | 3 | 3 | 2 |
| Cliente D — $750 | 4 | 4 | 3 |

- **`RANK()`**: cuando hay empate en el valor, ambas filas reciben el mismo número. El siguiente número después del empate tiene un hueco (`1, 1, 3, 4`). Simula el ranking deportivo: si dos corredores llegan al mismo tiempo, ambos son primeros y no hay segundo lugar.
- **`DENSE_RANK()`**: mismo comportamiento en el empate (ambas filas reciben el mismo número), pero el siguiente número es consecutivo, sin hueco (`1, 1, 2, 3`). No hay posiciones vacías.

```sql
SELECT
    p.name          AS producto,
    cat.name        AS categoria,
    SUM(oi.quantity * oi.unit_price) AS revenue,
    RANK()          OVER (PARTITION BY cat.name ORDER BY SUM(oi.quantity * oi.unit_price) DESC) AS rank_cat,
    DENSE_RANK()    OVER (PARTITION BY cat.name ORDER BY SUM(oi.quantity * oi.unit_price) DESC) AS dense_rank_cat
FROM order_items oi
INNER JOIN products   p   ON p.product_id   = oi.product_id
INNER JOIN categories cat ON cat.category_id = p.category_id
GROUP BY p.name, cat.name
ORDER BY cat.name, rank_cat;
```

**Regla práctica:** usa `RANK()` cuando quieres reflejar empates reales (dos productos en primer lugar). Usa `DENSE_RANK()` cuando necesitas un ranking continuo sin huecos para análisis de distribución. Usa `ROW_NUMBER()` cuando necesitas exactamente un ganador por grupo, sin ambigüedad.

### NTILE(n) — dividir en n grupos de tamaño igual

```sql
SELECT
    customer_id,
    revenue_total,
    NTILE(4) OVER (ORDER BY revenue_total DESC) AS cuartil
FROM tabla_revenue;
```

`NTILE(4)` divide el conjunto en 4 grupos de tamaño aproximadamente igual, numerados del 1 al 4. El grupo 1 contiene el cuarto superior (los de mayor revenue), el grupo 4 contiene el cuarto inferior. Si el número de filas no es divisible exactamente por n, los primeros grupos tienen una fila extra.

**Usos frecuentes:**
- `NTILE(4)` → cuartiles (Q1, Q2, Q3, Q4)
- `NTILE(5)` → quintiles (análisis de concentración de revenue: cuánto genera el quintil superior)
- `NTILE(10)` → deciles (distribución de clientes por valor)
- `NTILE(100)` → percentiles

---

## 3. EJEMPLO PRÁCTICO

### Contexto: las tres preguntas de Marco

**Query 1 — ROW_NUMBER: el primer pedido de cada cliente**

Valentina necesita la fecha y el monto del primer pedido de cada cliente para un análisis de cohortes. El "primer pedido" es el que tiene la fecha más temprana para ese cliente.

```sql
WITH pedidos_con_monto AS (
    -- Calculamos el monto de cada pedido
    SELECT
        o.order_id,
        o.customer_id,
        o.ordered_at,
        o.status,
        SUM(oi.quantity * oi.unit_price) AS monto_pedido
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status = 'delivered'
    GROUP BY o.order_id, o.customer_id, o.ordered_at, o.status
),
ranking_pedidos AS (
    -- Numeramos los pedidos de cada cliente por fecha
    SELECT
        customer_id,
        order_id,
        ordered_at,
        monto_pedido,
        ROW_NUMBER() OVER (
            PARTITION BY customer_id        -- grupo: un cliente
            ORDER BY ordered_at ASC         -- orden: de más antiguo a más reciente
        ) AS numero_pedido
    FROM pedidos_con_monto
)
-- El primer pedido de cada cliente
SELECT
    c.first_name || ' ' || c.last_name  AS cliente,
    c.country,
    rp.ordered_at                       AS fecha_primer_pedido,
    ROUND(rp.monto_pedido, 2)           AS monto_primer_pedido
FROM ranking_pedidos rp
INNER JOIN customers c ON c.customer_id = rp.customer_id
WHERE rp.numero_pedido = 1              -- solo el primero
ORDER BY rp.ordered_at ASC;
```

Output (primeras filas):

| cliente | country | fecha_primer_pedido | monto_primer_pedido |
|---|---|---|---|
| Valentina Cruz | Colombia | 2024-01-03 09:14:00 | 349.99 |
| Diego Morales | México | 2024-01-05 14:22:00 | 89.97 |
| Ana Castillo | Argentina | 2024-01-07 11:45:00 | 1098.97 |

El truco está en el filtro `WHERE numero_pedido = 1`: de todos los pedidos de cada cliente, solo pasa el que `ROW_NUMBER()` marcó como 1 (el más antiguo).

**Query 2 — RANK y DENSE_RANK: top 3 por país con empates visibles**

Marco quiere los tres mejores clientes de cada país por revenue. Usamos `DENSE_RANK()` para que si dos clientes empatan en segunda posición, ambos aparezcan y no se pierda uno de ellos:

```sql
WITH revenue_cliente AS (
    SELECT
        o.customer_id,
        ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue_total
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status = 'delivered'
    GROUP BY o.customer_id
),
ranking_por_pais AS (
    SELECT
        c.customer_id,
        c.first_name || ' ' || c.last_name  AS cliente,
        c.country,
        r.revenue_total,
        DENSE_RANK() OVER (
            PARTITION BY c.country
            ORDER BY r.revenue_total DESC
        ) AS posicion_en_pais
    FROM customers c
    INNER JOIN revenue_cliente r ON r.customer_id = c.customer_id
)
SELECT cliente, country, revenue_total, posicion_en_pais
FROM ranking_por_pais
WHERE posicion_en_pais <= 3
ORDER BY country, posicion_en_pais;
```

Output (primeras filas):

| cliente | country | revenue_total | posicion_en_pais |
|---|---|---|---|
| Ana Castillo | Argentina | 4821.50 | 1 |
| Marcos Silva | Argentina | 3970.00 | 2 |
| Lucía Fernández | Argentina | 3970.00 | 2 |
| Javier Ruiz | Argentina | 2845.75 | 3 |
| Marco Jiménez | Colombia | 5210.00 | 1 |

Marcos Silva y Lucía Fernández empatan en segunda posición (ambos con $3.970). Con `DENSE_RANK()` ambos reciben posición 2 y el siguiente es posición 3 (sin hueco). Con `RANK()` ambos recibirían posición 2 pero el siguiente sería posición 4 (con hueco). Con `ROW_NUMBER()` uno de los dos recibiría posición 2 y el otro posición 3, perdiendo información del empate.

**Query 3 — NTILE: cuartiles de revenue por producto**

Marco pregunta si las ventas están concentradas en pocos productos. Dividimos los productos en cuartiles por revenue:

```sql
WITH revenue_producto AS (
    SELECT
        p.product_id,
        p.name                                   AS producto,
        cat.name                                 AS categoria,
        ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue_total
    FROM order_items oi
    INNER JOIN products   p   ON p.product_id   = oi.product_id
    INNER JOIN categories cat ON cat.category_id = p.category_id
    GROUP BY p.product_id, p.name, cat.name
)
SELECT
    producto,
    categoria,
    revenue_total,
    NTILE(4) OVER (ORDER BY revenue_total DESC) AS cuartil
FROM revenue_producto
ORDER BY cuartil, revenue_total DESC;
```

Output (fragmento):

| producto | categoria | revenue_total | cuartil |
|---|---|---|---|
| Laptop Lenovo IdeaPad 3 15" | Tecnología | 87450.00 | 1 |
| Smartphone Samsung Galaxy A54 | Tecnología | 64230.00 | 1 |
| Smart TV 55" Samsung | Tecnología | 58970.00 | 1 |
| ... | ... | ... | 1 |
| Cable USB-C Anker 2m | Tecnología | 12300.00 | 2 |
| ... | ... | ... | ... |
| Lápiz Corrector Blanco | Papelería | 420.00 | 4 |

Ahora puedes calcular qué porcentaje del revenue total viene del cuartil 1 (el 25% de productos con más ventas) — ese es el análisis de concentración que Marco necesita.

---

## 4. CASOS DE USO REALES

**Caso 1 — Rankings por grupo (el uso más frecuente de Window Functions)**
Cualquier análisis de "top N dentro de una categoría" usa Window Functions. Top 3 vendedores por región, top 5 productos por categoría, el empleado de mayor rendimiento por departamento. Sin Window Functions, cada uno de esos análisis requeriría una subquery correlacionada por grupo o múltiples queries manuales.
*Rol que lo usa: Data Analyst, Business Intelligence Developer, Sales Analyst.*

**Caso 2 — Segmentación de clientes por valor**
El análisis de cuartiles con `NTILE(4)` es la base de la segmentación de clientes en "high value", "medium value", "low value", "at-risk". Los clientes del primer cuartil reciben un tratamiento distinto en campañas de marketing, los del cuarto cuartil son candidatos a campañas de reactivación.
*Rol que lo usa: CRM Analyst, Marketing Analyst, Data Analyst.*

**Caso 3 — Detección del primer/último evento por entidad**
`ROW_NUMBER()` con `WHERE rn = 1` o `WHERE rn = MAX` es la forma estándar de obtener "el primer pedido de cada cliente", "la última sesión de cada usuario", "la primera transacción de cada cuenta". Es más eficiente que una subquery correlacionada con `MIN(fecha)` porque se calcula en una sola pasada.
*Rol que lo usa: Data Analyst, Data Engineer, Product Analyst.*

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico
**Contexto (Briefing 5.4):** Valentina necesita el ranking de productos por revenue total dentro de su categoría. Solo quiere los tres primeros de cada categoría. Si hay empate en la posición, quiere ver todos los empatados.

Escribe la query que retorne: nombre del producto, categoría, revenue total y su posición dentro de la categoría. Filtra para mostrar solo los que tienen posición menor o igual a 3.

**Tablas necesarias:** `order_items`, `products`, `categories`

**Resultado esperado:** Lista de productos top 3 por categoría, con su revenue y su posición. Si dos productos de la misma categoría tienen el mismo revenue, ambos aparecen en la misma posición.

**Criterio de éxito:** Usas `DENSE_RANK()` (no `ROW_NUMBER()`, ya que necesitas que los empates conserven la misma posición). El `PARTITION BY` agrupa por categoría. El filtro `<= 3` va en la query exterior (necesitas una CTE o subquery para filtrar sobre el resultado de la Window Function).

---

### Ejercicio Intermedio
**Contexto (Briefing 5.3):** Diego quiere los productos del cuartil inferior de inventario — los que tienen el stock más bajo en términos relativos a todo el catálogo. Para cada uno necesita: nombre del producto, categoría, stock actual y el cuartil al que pertenece. Solo los del cuartil 1 (el de menor stock), ordenados por stock ascendente.

Escribe la query usando `NTILE(4)` sobre la tabla `inventory`. El cuartil 1 en este caso es el de menor stock (ordena ascendente para que el menor reciba el número 1).

**Tablas necesarias:** `inventory`, `products`, `categories`

**Resultado esperado:** Lista de productos del cuartil inferior de stock, ordenados de menor a mayor stock.

**Criterio de éxito:** Usas `NTILE(4)`. El orden dentro del `OVER()` es ascendente (para que el menor stock quede en el grupo 1). Filtras `cuartil = 1` en la query exterior. Incluyes nombre del producto y categoría.

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
WITH revenue_por_producto AS (
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
        DENSE_RANK() OVER (
            PARTITION BY categoria
            ORDER BY revenue_total DESC
        ) AS posicion
    FROM revenue_por_producto
)
SELECT producto, categoria, revenue_total, posicion
FROM ranking
WHERE posicion <= 3
ORDER BY categoria, posicion;
```

**Solución Ejercicio Intermedio:**
```sql
WITH stock_con_cuartil AS (
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
FROM stock_con_cuartil
WHERE cuartil = 1
ORDER BY stock ASC;
```

</details>

---

## 6. ERRORES COMUNES

**Error 1 — Intentar filtrar por el resultado de la Window Function en el mismo SELECT**

```sql
-- INCORRECTO: no puedes usar el alias de la Window Function en el WHERE del mismo nivel
SELECT
    producto,
    RANK() OVER (PARTITION BY categoria ORDER BY revenue DESC) AS posicion
FROM revenue_producto
WHERE posicion <= 3;    -- ERROR: column "posicion" does not exist
```

Error típico: `ERROR: column "posicion" does not exist`

Las Window Functions se evalúan después del WHERE — el motor no puede filtrar por un valor que aún no calculó. La solución es siempre envolver en una CTE o subquery:

```sql
-- CORRECTO
WITH ranking AS (
    SELECT producto, RANK() OVER (...) AS posicion FROM ...
)
SELECT * FROM ranking WHERE posicion <= 3;
```

**Error 2 — Mezclar Window Functions con GROUP BY de forma incorrecta**

```sql
-- INCORRECTO: si hay GROUP BY, la Window Function opera sobre el resultado agregado,
-- pero las columnas no agregadas en el SELECT generan error
SELECT
    p.name,
    cat.name,
    SUM(oi.quantity * oi.unit_price)                             AS revenue,
    RANK() OVER (PARTITION BY cat.name ORDER BY SUM(...) DESC)  AS posicion
FROM order_items oi
INNER JOIN products   p   ON p.product_id   = oi.product_id
INNER JOIN categories cat ON cat.category_id = p.category_id
GROUP BY p.name    -- falta cat.name
```

Error típico: `ERROR: column "cat.name" must appear in the GROUP BY clause`

Cuando se mezcla `GROUP BY` con Window Functions en la misma query, todas las columnas no agregadas deben estar en el `GROUP BY`. El patrón más limpio es separar la agregación en una CTE y aplicar la Window Function en la query principal sobre el resultado ya agregado.

**Error 3 — Confundir el orden en OVER() con el ORDER BY final de la query**

```sql
-- El ORDER BY dentro del OVER() define el ranking DENTRO de la partición
-- No tiene ningún efecto sobre el orden de filas en el resultado final
SELECT
    producto,
    RANK() OVER (ORDER BY revenue DESC) AS posicion  -- orden del ranking
FROM tabla
-- sin ORDER BY exterior: el resultado puede aparecer en cualquier orden
```

La Window Function puede calcular el ranking correctamente, pero el resultado de la query no estará necesariamente ordenado. Para que el resultado se vea en orden, hay que añadir `ORDER BY posicion` al final de la query.

**Error 4 — NTILE produce grupos desiguales y el estudiante no lo espera**

```sql
-- Con 10 filas y NTILE(4): los grupos no son exactamente de 2.5 filas cada uno
-- PostgreSQL los distribuye así: grupos 1, 2 y 3 tienen 3 filas; grupo 4 tiene 1 fila
-- (el exceso siempre va en los primeros grupos)
SELECT producto, NTILE(4) OVER (ORDER BY revenue DESC) AS cuartil FROM tabla_10_filas;
```

No es un error técnico, pero genera confusión. Si tienes 10 filas y pides 4 grupos, no puedes tener 2.5 filas por grupo. NTILE distribuye el exceso en los primeros grupos. Para análisis de porcentajes exactos (top 25%), lo correcto es calcular el percentil manualmente o aceptar que los grupos pueden variar en 1 fila.

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

`ROW_NUMBER`, `RANK`, `DENSE_RANK` y `NTILE` trabajan sobre el estado actual de las filas: ordenan, numeran y dividen. Pero hay preguntas que requieren mirar hacia filas adyacentes: "¿cuánto cambió el revenue respecto al mes anterior?", "¿cuál fue el primer valor de stock de este producto?", "¿cuánto creció la venta de esta semana versus la semana siguiente?".

Para esas preguntas existen las funciones de desplazamiento y de valor: `LAG`, `LEAD`, `FIRST_VALUE` y `LAST_VALUE`. Con ellas puedes acceder a la fila anterior o siguiente dentro de la partición, y calcular variaciones período a período — el tipo de análisis temporal que cualquier analista de negocio usa a diario.
