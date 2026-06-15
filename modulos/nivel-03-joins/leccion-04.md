# Nivel 3 — JOINs y Relaciones
## Lección 4: Subqueries — Consultas dentro de consultas

> Tablas disponibles en este nivel: `customers`, `categories`, `products`, `orders`, `order_items`

---

## 1. INTRODUCCIÓN CONCEPTUAL

### La pregunta de dos pasos

Ana de Finanzas te manda un mensaje:

> *"Necesito los productos cuyo precio supera el precio promedio de su categoría. Y también los clientes que compraron en el mes de mayor actividad de este año."*

Ambas preguntas tienen algo en común: la respuesta depende de un valor que primero hay que calcular. No puedes filtrar productos cuyo precio supera el promedio de su categoría sin conocer ese promedio primero. No puedes filtrar clientes del mes más activo sin identificar cuál fue ese mes primero.

Con lo que sabes hasta ahora, resolverías esto en dos pasos: primero una query para calcular el promedio (o el mes), luego otra query que usa ese número. Eso funciona, pero es tedioso y frágil — si los datos cambian, tienes que re-ejecutar la primera query manualmente.

Las **subqueries** eliminan ese problema. Son queries anidadas dentro de otra query — el resultado de la query interior alimenta directamente a la query exterior. Todo en una sola instrucción, siempre actualizado.

**Cuatro posiciones donde puede vivir una subquery:**
1. En el `SELECT` — retorna un valor que se agrega como columna calculada
2. En el `WHERE` — retorna un valor o conjunto de valores para comparar
3. En el `FROM` — retorna una tabla temporal que se usa como fuente de datos
4. En el `EXISTS` / `NOT EXISTS` — verifica si la subquery retorna al menos una fila

**Subquery vs JOIN — la pregunta correcta:**
No hay una respuesta universal. La regla práctica: usa JOIN cuando necesitas columnas de la segunda tabla en el resultado. Usa subquery cuando solo necesitas un valor de la segunda tabla para filtrar o calcular, sin necesitar sus columnas en el SELECT. Hay más matices (los cubrimos en la sección 4), pero esta heurística resuelve el 80% de los casos.

---

## 2. SINTAXIS

### Subquery escalar en SELECT

```sql
SELECT
    columna_principal,
    (SELECT funcion_agregacion(col) FROM otra_tabla WHERE condicion) AS alias
FROM tabla_principal;
```

La subquery entre paréntesis debe retornar exactamente **un valor** (una fila, una columna). Si retorna más de un valor, la query falla con un error.

### Subquery en WHERE con IN

```sql
SELECT columnas
FROM tabla
WHERE columna IN (SELECT columna FROM otra_tabla WHERE condicion);
```

`IN` compara contra un **conjunto de valores**. La subquery puede retornar múltiples filas, pero debe retornar exactamente una columna.

### Subquery en WHERE con NOT IN — y la trampa con NULLs

```sql
SELECT columnas
FROM tabla
WHERE columna NOT IN (SELECT columna FROM otra_tabla WHERE condicion);
```

**ADVERTENCIA CRÍTICA:** Si la subquery retorna algún NULL, `NOT IN` falla silenciosamente — retorna 0 filas aunque haya coincidencias válidas. Esto se explica en detalle en la sección de Errores Comunes (Error 4).

### Subquery en FROM (tabla derivada)

```sql
SELECT columnas_externas
FROM (
    SELECT columnas_internas, FUNCION_AGREGACION() AS alias_agr
    FROM tabla
    GROUP BY columnas_internas
) AS nombre_alias_obligatorio
WHERE condicion_sobre_resultado_agregado;
```

El alias después del paréntesis de cierre (`AS nombre_alias_obligatorio`) es **obligatorio** en PostgreSQL. Sin alias, la query falla.

### EXISTS y NOT EXISTS

```sql
-- EXISTS: verdadero si la subquery retorna al menos una fila
SELECT columnas
FROM tabla_a a
WHERE EXISTS (
    SELECT 1
    FROM tabla_b b
    WHERE b.clave = a.clave
    AND b.condicion = valor
);

-- NOT EXISTS: verdadero si la subquery no retorna ninguna fila
SELECT columnas
FROM tabla_a a
WHERE NOT EXISTS (
    SELECT 1
    FROM tabla_b b
    WHERE b.clave = a.clave
);
```

El `SELECT 1` dentro de EXISTS es una convención: no importa qué se retorna, solo si hay filas o no. Usar `SELECT 1` es más claro que `SELECT *` porque comunica la intención.

---

## 3. EJEMPLO PRÁCTICO

### Contexto: las consultas de Ana y Valentina que requieren cálculos en dos pasos

**Query 1 — Subquery escalar en SELECT: precio de cada producto junto al promedio de su categoría**

Valentina quiere ver en el catálogo, para cada producto, su precio y el precio promedio de su categoría — así puede ver de un vistazo cuánto se desvía cada producto de la media.

```sql
SELECT
    p.name                               AS producto,
    cat.name                             AS categoria,
    p.price                              AS precio,
    ROUND(
        (SELECT AVG(p2.price)
         FROM products p2
         WHERE p2.category_id = p.category_id
           AND p2.is_active = TRUE),
        2
    )                                    AS precio_promedio_categoria,
    ROUND(p.price - (SELECT AVG(p2.price)
                     FROM products p2
                     WHERE p2.category_id = p.category_id
                       AND p2.is_active = TRUE), 2) AS diferencia_vs_promedio
FROM products p
INNER JOIN categories cat ON cat.category_id = p.category_id
WHERE p.is_active = TRUE
ORDER BY cat.name, diferencia_vs_promedio DESC;
```

Output (primeras filas):

| producto | categoria | precio | precio_promedio_categoria | diferencia_vs_promedio |
|---|---|---|---|---|
| Laptop Lenovo IdeaPad 3 | Tecnología | 549.99 | 187.45 | 362.54 |
| Smart TV 55" Samsung | Tecnología | 489.99 | 187.45 | 302.54 |
| Cable USB-C Anker 2m | Tecnología | 12.99 | 187.45 | -174.46 |

La subquery `(SELECT AVG(p2.price) FROM products p2 WHERE p2.category_id = p.category_id)` se ejecuta **una vez por cada fila** de la query exterior. Para el producto "Laptop", calcula el AVG de todos los productos de Tecnología. Para el siguiente producto de Tecnología, hace lo mismo. Es correcto pero potencialmente lento con tablas grandes — en el Nivel 5 aprenderás a resolverlo más eficientemente con Window Functions.

**Query 2 — Subquery en WHERE con IN: clientes que compraron durante el Black Friday 2025**

```sql
-- Clientes que hicieron al menos un pedido el 28 de noviembre de 2025
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
```

La subquery retorna un conjunto de `customer_id` — todos los que compraron ese día. La query exterior filtra los clientes cuyo ID está en ese conjunto. Nota: esto es equivalente a un INNER JOIN — cuándo usar cada uno se discute en los Casos de Uso.

**Query 3 — Subquery en WHERE con NOT IN: productos que NUNCA se vendieron**

```sql
-- Productos activos que no aparecen en ningún order_item
SELECT
    p.product_id,
    p.name       AS producto,
    cat.name     AS categoria,
    p.price
FROM products p
INNER JOIN categories cat ON cat.category_id = p.category_id
WHERE p.is_active = TRUE
  AND p.product_id NOT IN (
      SELECT DISTINCT oi.product_id
      FROM order_items oi
  )
ORDER BY p.price DESC;
```

La subquery retorna todos los `product_id` que aparecen en `order_items`. `NOT IN` filtra los que no están en ese conjunto — los que nunca se vendieron.

**Query 4 — Subquery en FROM: los clientes con ticket promedio por encima del promedio global**

Esta es la forma clásica de "filtrar sobre un agregado" usando tabla derivada:

```sql
-- Primero calculamos el ticket promedio por cliente,
-- luego filtramos los que superan el promedio global de todos los clientes

SELECT
    sub.customer_id,
    sub.first_name,
    sub.last_name,
    sub.ticket_promedio,
    sub.total_pedidos
FROM (
    -- subquery: ticket promedio por cliente
    SELECT
        c.customer_id,
        c.first_name,
        c.last_name,
        COUNT(DISTINCT o.order_id)                       AS total_pedidos,
        ROUND(AVG(oi.quantity * oi.unit_price), 2)       AS ticket_promedio
    FROM customers c
    INNER JOIN orders      o  ON o.customer_id  = c.customer_id
    INNER JOIN order_items oi ON oi.order_id    = o.order_id
    WHERE o.status = 'delivered'
    GROUP BY c.customer_id, c.first_name, c.last_name
) AS sub
WHERE sub.ticket_promedio > (
    -- segunda subquery: el promedio global de ticket
    SELECT AVG(oi2.quantity * oi2.unit_price)
    FROM order_items oi2
    INNER JOIN orders o2 ON o2.order_id = oi2.order_id
    WHERE o2.status = 'delivered'
)
ORDER BY sub.ticket_promedio DESC
LIMIT 20;
```

Output (primeras filas):

| customer_id | first_name | last_name | total_pedidos | ticket_promedio |
|---|---|---|---|---|
| 7 | Carlos | Mendoza | 25 | 312.45 |
| 143 | Laura | González | 12 | 287.90 |
| 89 | Rafael | Herrera | 8 | 243.50 |

Valentina ve el resultado: "Carlos Mendoza otra vez en el top. Es nuestro whale — 25 pedidos y ticket de $312 promedio. Merece estar en el segmento VIP."

**Query 5 — EXISTS: clientes que tienen al menos un pedido en estado 'delivered'**

```sql
SELECT
    c.customer_id,
    c.first_name,
    c.email
FROM customers c
WHERE EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.customer_id = c.customer_id
      AND o.status = 'delivered'
)
ORDER BY c.last_name;
```

**Query 6 — NOT EXISTS: clientes que NUNCA tuvieron un pedido entregado**

```sql
SELECT
    c.customer_id,
    c.first_name,
    c.email,
    c.country
FROM customers c
WHERE NOT EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.customer_id = c.customer_id
      AND o.status = 'delivered'
)
ORDER BY c.country, c.last_name;
```

Este resultado incluye tanto clientes que nunca compraron como clientes que compraron pero todos sus pedidos están en otro status (pending, shipped, cancelled).

---

## 4. CASOS DE USO REALES

**Caso 1 — Filtrado con umbral calculado dinámicamente**
Sofía quiere clientes cuyo gasto total supere el percentil 90. El percentil 90 cambia cada mes. Con subquery en WHERE, el umbral se calcula en el momento de la query — sin necesidad de hardcodearlo. Cada vez que corre la query, usa el percentil actualizado.
*Rol que lo usa: Marketing Analyst, CRM Analyst.*

**Caso 2 — Tablas derivadas para agregar en dos pasos**
Ana necesita el promedio de los promedios mensuales de revenue — no el promedio del revenue total. Eso requiere calcular el promedio mensual primero (subquery en FROM) y luego agregar sobre ese resultado (query exterior). No se puede hacer en un solo GROUP BY.
*Rol que lo usa: Finance Analyst, Data Analyst.*

**Caso 3 — EXISTS para verificación de existencia en validaciones de datos**
Antes de eliminar una categoría del catálogo, Diego verifica con `EXISTS` que no haya productos activos asociados a ella. Es una verificación de integridad que retorna booleano (existen o no existen filas) sin necesitar traer los datos.
*Rol que lo usa: DBA, Data Engineer, Operations Analyst.*

**Cuándo usar JOIN vs. subquery — la guía práctica:**

| Situación | Recomendación |
|---|---|
| Necesitas columnas de la segunda tabla en el SELECT | JOIN |
| Solo necesitas verificar si existe una relación | EXISTS |
| Necesitas comparar contra un conjunto de IDs | IN con subquery o JOIN (similares en rendimiento) |
| Necesitas comparar contra un valor agregado (AVG, MAX) | Subquery escalar o tabla derivada |
| La segunda tabla puede tener NULLs en la columna de comparación | EXISTS (evita la trampa de NOT IN) |
| Necesitas agregar en dos pasos distintos | Tabla derivada en FROM |

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico
**Contexto:** Valentina quiere identificar qué categorías de producto tienen un precio promedio superior al precio promedio de todo el catálogo activo. Son las categorías "premium" de ShopSphere.

Escribe una query que retorne el nombre de la categoría y su precio promedio, solo para las categorías cuyo precio promedio supera el promedio global del catálogo activo. Usa una subquery en HAVING o en WHERE.

**Tablas necesarias:** `categories`, `products`

**Resultado esperado:** Filas con nombre de categoría y precio promedio. Solo las categorías que superan el promedio global. El número de filas debe ser menor que el total de categorías.

**Criterio de éxito:** La subquery calcula el AVG global de `products` (is_active = TRUE). El resultado exterior solo muestra categorías por encima de ese umbral.

---

### Ejercicio Intermedio
**Contexto:** Ana de Finanzas necesita identificar los clientes que compraron productos de la categoría "Tecnología" pero que NUNCA compraron productos de la categoría "Hogar". Son clientes para una campaña de cross-sell hacia productos del hogar.

Escribe una query que use `IN` y `NOT IN` (o `EXISTS` y `NOT EXISTS`) para encontrar esos clientes. Muestra: customer_id, nombre, email, país.

**Tablas necesarias:** `customers`, `orders`, `order_items`, `products`, `categories`

**Resultado esperado:** Lista de clientes que compraron Tecnología pero no Hogar. Ordenada por apellido.

**Criterio de éxito:** No aparece ningún cliente que haya comprado productos de Hogar en el resultado. Si usas NOT IN, asegúrate de que la subquery no pueda retornar NULLs.

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
SELECT
    cat.name                  AS categoria,
    ROUND(AVG(p.price), 2)    AS precio_promedio
FROM categories cat
INNER JOIN products p ON p.category_id = cat.category_id
WHERE p.is_active = TRUE
GROUP BY cat.name
HAVING AVG(p.price) > (
    SELECT AVG(price)
    FROM products
    WHERE is_active = TRUE
)
ORDER BY precio_promedio DESC;
```

**Solución Ejercicio Intermedio (con NOT EXISTS — versión segura contra NULLs):**
```sql
SELECT
    c.customer_id,
    c.first_name,
    c.last_name,
    c.email,
    c.country
FROM customers c
WHERE EXISTS (
    -- compraron al menos un producto de Tecnología
    SELECT 1
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id    = o.order_id
    INNER JOIN products    p  ON p.product_id   = oi.product_id
    INNER JOIN categories  cat ON cat.category_id = p.category_id
    WHERE o.customer_id = c.customer_id
      AND cat.name = 'Tecnología'
)
AND NOT EXISTS (
    -- nunca compraron un producto de Hogar
    SELECT 1
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id    = o.order_id
    INNER JOIN products    p  ON p.product_id   = oi.product_id
    INNER JOIN categories  cat ON cat.category_id = p.category_id
    WHERE o.customer_id = c.customer_id
      AND cat.name = 'Hogar'
)
ORDER BY c.last_name;
```

Por qué `NOT EXISTS` en lugar de `NOT IN`: si cualquier `customer_id` en la subquery de Hogar fuera NULL (lo cual no ocurre aquí por la PK, pero es posible en columnas FK), `NOT IN` fallaría silenciosamente. `NOT EXISTS` es siempre seguro.

**Versión alternativa con IN/NOT IN (funciona aquí porque customer_id es PK y no tiene NULLs):**
```sql
SELECT c.customer_id, c.first_name, c.last_name, c.email, c.country
FROM customers c
WHERE c.customer_id IN (
    SELECT o.customer_id
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id    = o.order_id
    INNER JOIN products    p  ON p.product_id   = oi.product_id
    INNER JOIN categories  cat ON cat.category_id = p.category_id
    WHERE cat.name = 'Tecnología'
)
AND c.customer_id NOT IN (
    SELECT o.customer_id
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id    = o.order_id
    INNER JOIN products    p  ON p.product_id   = oi.product_id
    INNER JOIN categories  cat ON cat.category_id = p.category_id
    WHERE cat.name = 'Hogar'
)
ORDER BY c.last_name;
```

</details>

---

## 6. ERRORES COMUNES

**Error 1 — Subquery escalar que retorna más de una fila**

```sql
-- INCORRECTO: si hay múltiples categorías, la subquery retorna N filas
SELECT
    p.name,
    (SELECT AVG(price) FROM products)  AS promedio_ok,     -- esto está bien (1 valor)
    (SELECT name FROM categories)       AS nombre_categoria  -- ERROR: retorna N filas
FROM products p;
```

Error típico: `ERROR: more than one row returned by a subquery used as an expression`

El selector escalar debe retornar exactamente una fila y una columna. Para retornar el nombre de categoría de cada producto, la subquery necesita un `WHERE category_id = p.category_id` que la haga correlacionada con la fila exterior.

**Error 2 — Tabla derivada en FROM sin alias**

```sql
-- INCORRECTO: la subquery en FROM no tiene alias
SELECT sub.customer_id, sub.total
FROM (
    SELECT customer_id, COUNT(*) AS total
    FROM orders
    GROUP BY customer_id
);
-- ERROR: subquery in FROM must have an alias
```

```sql
-- CORRECTO: alias obligatorio
FROM (
    SELECT customer_id, COUNT(*) AS total
    FROM orders
    GROUP BY customer_id
) AS sub  -- alias requerido
```

**Error 3 — Usar columna de la tabla exterior en una subquery no correlacionada**

```sql
-- INCORRECTO: p.category_id no está disponible aquí si la subquery no está correlacionada
SELECT p.name
FROM products p
WHERE p.price > (
    SELECT AVG(price) FROM products
    -- Falta: WHERE category_id = p.category_id
    -- Esta subquery calcula el AVG global, no el de la categoría de p
);
```

La diferencia entre una subquery correlacionada (que referencia la tabla exterior) y una no correlacionada (que funciona independientemente) es sutil pero crítica. Una subquery escalar en SELECT casi siempre debe ser correlacionada si quiere ser específica por fila.

**Error 4 — NOT IN con NULLs: el error más peligroso del nivel**

Este es el bug más silencioso y destructivo de las subqueries. Debes entenderlo completamente.

```sql
-- ESCENARIO: quieres productos que nunca se vendieron
-- INCORRECTO si order_items.product_id puede tener NULLs:
SELECT p.name
FROM products p
WHERE p.product_id NOT IN (
    SELECT product_id FROM order_items
    -- Si alguna fila tiene product_id = NULL, la subquery retorna un NULL
    -- NOT IN con NULL en el conjunto SIEMPRE retorna 0 filas
    -- porque: 5 NOT IN (1, 2, NULL) equivale a NOT (5=1 OR 5=2 OR 5=NULL)
    -- y 5=NULL es UNKNOWN, lo que hace toda la expresión UNKNOWN, no TRUE
);
-- Resultado: 0 filas, aunque haya productos que nunca se vendieron
```

**Por qué ocurre:** En SQL de tres valores (TRUE, FALSE, UNKNOWN), `valor NOT IN (conjunto_con_NULL)` evalúa a UNKNOWN porque no puede confirmarse que el valor sea distinto de NULL. Las filas con UNKNOWN son descartadas.

```sql
-- SOLUCIÓN 1: filtrar NULLs en la subquery (si la columna puede tenerlos)
WHERE p.product_id NOT IN (
    SELECT product_id FROM order_items
    WHERE product_id IS NOT NULL
)

-- SOLUCIÓN 2 (mejor práctica): usar NOT EXISTS, que no tiene este problema
WHERE NOT EXISTS (
    SELECT 1 FROM order_items oi
    WHERE oi.product_id = p.product_id
)
```

En el schema de ShopSphere, `order_items.product_id` tiene una clave foránea y no debería tener NULLs. Pero en bases de datos reales, los datos sucios son comunes. Usar `NOT EXISTS` es siempre la opción más segura.

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

Las subqueries resuelven el problema de los "dos pasos". Pero hay un patrón de subquery que se repite tanto que SQL tiene una sintaxis dedicada para él: los CTEs (Common Table Expressions), que escribes con la cláusula `WITH`.

Un CTE es una subquery nombrada que puedes referenciar múltiples veces en la misma query. En lugar de anidar subqueries dentro de subqueries (que se vuelve ilegible rápidamente), defines cada paso con un nombre claro y los encadenas. Los CTEs son la base del SQL avanzado del Nivel 5 — y cuando los descubras, va a costar que vuelvas a escribir subqueries anidadas.
