# Nivel 3 — JOINs y Relaciones
## Lección 3: JOINs múltiples, FULL OUTER JOIN y Self-Join

> Tablas disponibles en este nivel: `customers`, `categories`, `products`, `orders`, `order_items`

---

## 1. INTRODUCCIÓN CONCEPTUAL

### Cuando la respuesta vive en cinco tablas a la vez

Llevas tres semanas en ShopSphere. Diego acaba de mandarte el Briefing 3.8:

> *"Para la reunión con proveedores necesito ver el desempeño de cada categoría en lo que va del año (enero–abril 2026). Revenue total y total de unidades vendidas en la misma tabla."*

Abres la base de datos. El revenue está en `order_items` (quantity × unit_price). Las categorías están en `categories`. El vínculo entre ambas pasa por `products` (que tiene `category_id`) y por `orders` (que tiene la fecha). Son cuatro tablas — y la respuesta vive en la intersección de todas ellas.

En las lecciones anteriores uniste dos tablas. Ahora vas a encadenar tres, cuatro, cinco. El concepto es el mismo — cada JOIN agrega una tabla más al resultado intermedio — pero hay patrones nuevos que aparecen: **alias obligatorios para legibilidad**, **el riesgo de duplicados que se multiplican**, y dos tipos especiales de JOIN que abren casos de uso que no existían antes.

**Cómo piensa el optimizador cuando hay múltiples JOINs:**
El motor SQL no ejecuta los JOINs en el orden exacto en que están escritos. Usa el optimizador de consultas para elegir el orden más eficiente según estadísticas de las tablas (cardinalidad, índices disponibles). Lo que tú controlas es la *lógica* — cuál tabla se une con cuál a través de qué clave. El optimizador controla la *estrategia de ejecución*. En la práctica, para las queries del curso, el orden que escribes es razonable; pero debes saber que el motor puede reordenarlo internamente.

**El FULL OUTER JOIN — el JOIN que nadie olvida una vez que lo necesita:**
INNER JOIN: solo filas con coincidencia en ambas tablas.
LEFT JOIN: todas las filas de la izquierda, coincidan o no.
RIGHT JOIN: todas las filas de la derecha, coincidan o no.
FULL OUTER JOIN: **todas las filas de ambas tablas**, coincidan o no. Donde no hay coincidencia en un lado, aparece NULL en las columnas del otro. Es el JOIN para detectar inconsistencias bidireccionales: registros que no tienen pareja en ninguna dirección.

**El Self-Join — una tabla unida consigo misma:**
Hay preguntas que comparan filas de la misma tabla entre sí: "¿Qué productos cuestan más que el promedio de su categoría?" Para eso, la misma tabla actúa como dos tablas distintas en el JOIN. El truco es darle aliases diferentes a cada "instancia" de la tabla.

---

## 2. SINTAXIS

### JOINs encadenados — forma canónica

```sql
SELECT alias1.columna, alias2.columna, alias3.columna
FROM tabla1 alias1
JOIN tabla2 alias2 ON alias2.clave = alias1.clave
JOIN tabla3 alias3 ON alias3.clave = alias2.clave
JOIN tabla4 alias4 ON alias4.clave = alias3.clave;
```

Cada JOIN agrega una tabla al resultado acumulado. El `ON` de cada JOIN especifica cómo se conecta la nueva tabla con alguna de las ya unidas.

**Regla de aliases en JOINs múltiples:**
Con dos tablas, los aliases son convenientes. Con tres o más, son obligatorios. Sin alias, calificar columnas como `order_items.product_id` vs `products.product_id` es legible, pero cuando hay cinco tablas con nombres largos el código se vuelve ilegible. La convención:

```sql
-- aliases de una o dos letras, intuitivos:
customers    → c
categories   → cat
products     → p
orders       → o
order_items  → oi
```

**FULL OUTER JOIN — forma canónica**

```sql
SELECT columnas
FROM tabla_a
FULL OUTER JOIN tabla_b ON tabla_a.clave = tabla_b.clave;
```

También se escribe `FULL JOIN` (el `OUTER` es opcional). El resultado incluye:
- Filas donde hay coincidencia (como INNER JOIN)
- Filas de `tabla_a` sin coincidencia en `tabla_b` (columnas de B son NULL)
- Filas de `tabla_b` sin coincidencia en `tabla_a` (columnas de A son NULL)

**Self-Join — forma canónica**

```sql
SELECT a.columna, b.columna
FROM tabla a
JOIN tabla b ON a.clave_relacion = b.clave_comparacion
WHERE condicion_que_compara_a_con_b;
```

La misma tabla aparece dos veces con aliases distintos. SQL las trata como si fueran dos tablas separadas.

**Detectar duplicados antes de que ocurran — el patrón COUNT:**

```sql
-- Antes de agregar: verifica la cardinalidad de las relaciones
SELECT COUNT(*) FROM order_items;          -- N filas
SELECT COUNT(DISTINCT order_id) FROM order_items;  -- M pedidos distintos
-- Si N >> M, cada pedido tiene múltiples ítems
-- Al hacer JOIN orders ↔ order_items, orders se "multiplica" N veces
-- Eso es correcto para SUM() pero causa confusión si se olvida el GROUP BY
```

---

## 3. EJEMPLO PRÁCTICO

### Contexto: las preguntas de Diego, Sofía y el análisis completo de ShopSphere

**Query 1 — Las 5 tablas base unidas: revenue por categoría con detalle de cliente**

Esta es la query más compleja del nivel — une las cinco tablas centrales de ShopSphere en una sola consulta.

```sql
-- Revenue total por categoría, con conteo de clientes distintos
-- Período: enero-abril 2026 (Briefing 3.8)
SELECT
    cat.name                              AS categoria,
    COUNT(DISTINCT o.customer_id)         AS clientes_distintos,
    COUNT(DISTINCT o.order_id)            AS pedidos,
    SUM(oi.quantity)                      AS unidades_vendidas,
    ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue_total
FROM order_items oi
INNER JOIN products   p   ON p.product_id   = oi.product_id
INNER JOIN categories cat ON cat.category_id = p.category_id
INNER JOIN orders     o   ON o.order_id     = oi.order_id
INNER JOIN customers  c   ON c.customer_id  = o.customer_id
WHERE o.ordered_at >= '2026-01-01'
  AND o.ordered_at <  '2026-05-01'
  AND o.status     <> 'cancelled'
GROUP BY cat.name
ORDER BY revenue_total DESC;
```

Output (primeras filas):

| categoria | clientes_distintos | pedidos | unidades_vendidas | revenue_total |
|---|---|---|---|---|
| Tecnología | 312 | 1840 | 4210 | 487320.50 |
| Hogar | 198 | 1120 | 3890 | 198450.00 |
| Ropa | 245 | 1340 | 5670 | 134230.75 |
| Calzado | 167 | 890 | 2340 | 98760.00 |

Diego ve el resultado: "Tecnología tiene revenue alto pero menos unidades que Ropa. Margen por unidad muy diferente. Eso va directo a la conversación con proveedores."

**Recorrido del JOIN paso a paso:**
1. `order_items oi` — la tabla de hechos, cada fila es un ítem vendido
2. `JOIN products p` — agrega el nombre y categoría de cada producto
3. `JOIN categories cat` — agrega el nombre de la categoría (ya tenemos `category_id` de products)
4. `JOIN orders o` — agrega la fecha del pedido y el customer_id
5. `JOIN customers c` — agrega los datos del cliente (país, nombre)

El `WHERE` filtra por fecha y excluye cancelados. El `GROUP BY cat.name` colapsa todo por categoría.

**Query 2 — FULL OUTER JOIN: detectar inconsistencias entre categorías y productos**

El FULL OUTER JOIN es ideal para auditorías de datos: "¿Hay categorías sin productos? ¿Hay productos con una categoría que no existe en la tabla categories?"

```sql
-- Auditoría bidireccional: categorías sin productos y productos sin categoría válida
SELECT
    cat.category_id   AS cat_id_en_categories,
    cat.name          AS nombre_categoria,
    p.product_id      AS prod_id_en_products,
    p.name            AS nombre_producto,
    p.category_id     AS cat_id_en_products
FROM categories cat
FULL OUTER JOIN products p ON p.category_id = cat.category_id
WHERE cat.category_id IS NULL    -- productos cuya categoría no existe en categories
   OR p.product_id    IS NULL;   -- categorías que no tienen ningún producto
ORDER BY cat.category_id NULLS LAST, p.product_id NULLS LAST;
```

El resultado tiene dos tipos de filas:
- Filas donde `cat.category_id IS NULL`: un producto tiene un `category_id` que no existe en la tabla `categories` — referencia rota.
- Filas donde `p.product_id IS NULL`: una categoría existe en `categories` pero ningún producto la referencia — categoría vacía.

**Versión simplificada para aprender el concepto:**

```sql
-- ¿Qué categorías no tienen ningún producto activo?
SELECT
    cat.name         AS categoria,
    p.product_id     AS producto_id
FROM categories cat
FULL OUTER JOIN products p ON p.category_id = cat.category_id
                           AND p.is_active = TRUE
WHERE p.product_id IS NULL;
-- Muestra las categorías que no tienen ningún producto activo asociado
```

**Query 3 — Self-Join: productos más caros que el promedio de su propia categoría**

Este es el caso de uso clásico del self-join. La pregunta es: "¿Qué productos tienen un precio mayor al precio promedio de los otros productos de su misma categoría?"

```sql
-- Versión con self-join explícito
SELECT
    p1.name                  AS producto,
    p1.price                 AS precio_producto,
    ROUND(AVG(p2.price), 2)  AS precio_promedio_categoria,
    cat.name                 AS categoria
FROM products p1
INNER JOIN products    p2  ON p2.category_id = p1.category_id
                          AND p2.product_id  <> p1.product_id  -- excluir el producto mismo
INNER JOIN categories  cat ON cat.category_id = p1.category_id
WHERE p1.is_active = TRUE
  AND p2.is_active = TRUE
GROUP BY p1.product_id, p1.name, p1.price, cat.name
HAVING p1.price > AVG(p2.price)
ORDER BY cat.name, p1.price DESC;
```

Output (primeras filas):

| producto | precio_producto | precio_promedio_categoria | categoria |
|---|---|---|---|
| Laptop Lenovo IdeaPad 3 | 549.99 | 187.45 | Tecnología |
| Smart TV 55" Samsung | 489.99 | 187.45 | Tecnología |
| Smartphone Samsung Galaxy A54 | 349.99 | 187.45 | Tecnología |

**Cómo funciona el self-join aquí:**
- `p1` es la lista de productos que queremos evaluar
- `p2` es la lista de productos del mismo grupo de comparación (misma categoría, distinto product_id)
- `AVG(p2.price)` calcula el promedio de los otros productos de la categoría
- `HAVING p1.price > AVG(p2.price)` filtra solo los que superan ese promedio

**El riesgo de duplicados con JOINs múltiples — cómo se producen y cómo detectarlos:**

```sql
-- ESCENARIO: un pedido con 3 ítems
-- orders tiene 1 fila para ese pedido
-- order_items tiene 3 filas para ese pedido
-- Al hacer JOIN orders ↔ order_items, ese pedido produce 3 filas en el resultado

-- PROBLEMA: si luego agregas COUNT(o.order_id) sin DISTINCT, cuenta 3 en lugar de 1
SELECT
    p.name,
    COUNT(o.order_id)          AS conteo_incorrecto,  -- cuenta 3 por pedido con 3 items
    COUNT(DISTINCT o.order_id) AS conteo_correcto      -- cuenta 1 (pedidos únicos)
FROM order_items oi
INNER JOIN products p ON p.product_id = oi.product_id
INNER JOIN orders   o ON o.order_id   = oi.order_id
GROUP BY p.name;

-- CÓMO DETECTARLO ANTES DE QUE CAUSE PROBLEMAS:
-- Ejecuta COUNT(*) sobre el JOIN sin GROUP BY y compara con las tablas individuales
SELECT COUNT(*) FROM order_items;  -- M filas
SELECT COUNT(*) FROM orders;       -- N filas (N < M si hay pedidos con múltiples ítems)
-- El JOIN orders ↔ order_items produce M filas (la "explosión" es esperada y correcta)
-- La trampa ocurre cuando usas COUNT(o.order_id) esperando N y obtienes M
```

La regla práctica: cuando hay `JOIN` con tablas de "detalle" (order_items, returns), usa `COUNT(DISTINCT columna)` para contar entidades únicas de la tabla "cabecera" (orders, customers).

---

## 4. CASOS DE USO REALES

**Caso 1 — Revenue por categoría/región/período: el análisis de management**
El 90% de los reportes ejecutivos requieren unir 3 o más tablas. Revenue por categoría necesita `order_items` + `products` + `categories`. Revenue por país necesita además `orders` + `customers`. Estos JOINs encadenados son el pan de cada día del Data Analyst en cualquier empresa con datos transaccionales.
*Rol que lo usa: Data Analyst, Business Analyst, Finance Analyst.*

**Caso 2 — Auditoría de integridad referencial con FULL OUTER JOIN**
Antes de cualquier migración de datos o integración de sistemas, el equipo de datos verifica que no haya referencias rotas. FULL OUTER JOIN entre la tabla "padre" y la "hija" revela inmediatamente los registros huérfanos en ambas direcciones. Es una query de control de calidad que corre cualquier Data Engineer antes de cerrar una migración.
*Rol que lo usa: Data Engineer, DBA, Data Analyst en tareas de data quality.*

**Caso 3 — Comparaciones relativas con Self-Join (o subquery)**
"¿Qué vendedores superaron el promedio de su región?" "¿Qué productos tienen precio menor al mínimo de su categoría?" Estas preguntas requieren comparar filas de la misma tabla usando un contexto de grupo. El self-join es una de las formas de resolverlo; la otra (subquery correlacionada) la verás en la Lección 4.
*Rol que lo usa: Data Analyst, Sales Analyst, Pricing Analyst.*

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico
**Contexto:** Sofía está preparando el brief de Black Friday 2026 y necesita entender qué se vendió en el de 2025 (Briefing 3.7). Quiere los 10 productos más vendidos el 28 de noviembre de 2025, medidos en unidades.

Escribe una query que retorne: nombre del producto, nombre de la categoría y total de unidades vendidas. Ordenada de mayor a menor por unidades.

**Tablas necesarias:** `order_items`, `products`, `categories`, `orders`

**Resultado esperado:** Exactamente 10 filas. Tres columnas: producto, categoría, unidades_vendidas.

**Criterio de éxito:** Filtras por la fecha exacta (28 de noviembre de 2025 usando rango de timestamp). Encadenas al menos 3 JOINs. Límitas a 10 filas ordenadas descendentemente por unidades.

---

### Ejercicio Intermedio
**Contexto:** Valentina necesita validar la integridad del catálogo de ShopSphere. Quiere saber si hay alguna categoría que no tiene ningún producto asociado, o si hay algún producto que referencia una categoría inexistente (Briefing implícito: auditoría de datos).

Escribe una query que use FULL OUTER JOIN entre `categories` y `products` y muestre solo las filas "anómalas": categorías sin productos y productos sin categoría válida. Para cada fila anómala, muestra el ID de la categoría (de la tabla que lo tiene), el nombre de la categoría (si existe), el ID del producto (si existe) y su nombre (si existe).

**Tablas necesarias:** `categories`, `products`

**Resultado esperado:** Filas donde alguna de las dos partes del JOIN tiene NULL. Si el catálogo está perfectamente consistente, la query retorna 0 filas — eso también es un resultado válido y debe documentarse como "catálogo íntegro".

**Criterio de éxito:** Usas FULL OUTER JOIN. Filtras con `WHERE ... IS NULL OR ... IS NULL`. El resultado tiene sentido: cada fila explica qué está "faltando" en qué lado.

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
SELECT
    p.name              AS producto,
    cat.name            AS categoria,
    SUM(oi.quantity)    AS unidades_vendidas
FROM order_items oi
INNER JOIN products   p   ON p.product_id   = oi.product_id
INNER JOIN categories cat ON cat.category_id = p.category_id
INNER JOIN orders     o   ON o.order_id     = oi.order_id
WHERE o.ordered_at >= '2025-11-28'
  AND o.ordered_at <  '2025-11-29'
GROUP BY p.name, cat.name
ORDER BY unidades_vendidas DESC
LIMIT 10;
```

Nota: el filtro de fecha usa rango `>=` y `<` en lugar de `DATE(ordered_at) = '...'` porque permite que el motor use índices sobre la columna TIMESTAMP sin aplicar una función fila por fila.

**Solución Ejercicio Intermedio:**
```sql
SELECT
    cat.category_id   AS cat_id_en_categories,
    cat.name          AS nombre_categoria,
    p.product_id      AS prod_id_en_products,
    p.name            AS nombre_producto
FROM categories cat
FULL OUTER JOIN products p ON p.category_id = cat.category_id
WHERE cat.category_id IS NULL    -- producto con categoría inexistente
   OR p.product_id    IS NULL    -- categoría sin ningún producto
ORDER BY cat.category_id NULLS LAST, p.product_id NULLS LAST;
```

Si la query retorna 0 filas, el catálogo es íntegro — todas las categorías tienen al menos un producto y todos los productos referencian una categoría existente. Documenta ese resultado con un comentario en el código.

</details>

---

## 6. ERRORES COMUNES

**Error 1 — Alias definido pero no usado consistentemente**

```sql
-- INCORRECTO: mezcla alias con nombre completo
SELECT order_items.product_id, p.name
FROM order_items oi
INNER JOIN products p ON p.product_id = order_items.product_id;
-- Error: si declaraste el alias 'oi', debes usarlo en todas partes
```

Error típico: `ERROR: table name "order_items" specified more than once` o simplemente ambigüedad.

```sql
-- CORRECTO: alias usado consistentemente en toda la query
SELECT oi.product_id, p.name
FROM order_items oi
INNER JOIN products p ON p.product_id = oi.product_id;
```

**Error 2 — Duplicados invisibles por JOIN sin DISTINCT**

```sql
-- ESCENARIO: contar pedidos por cliente, uniendo con order_items
-- INCORRECTO: COUNT(o.order_id) cuenta una fila por ítem, no por pedido
SELECT
    c.first_name,
    COUNT(o.order_id) AS total_pedidos  -- si el pedido tiene 3 ítems, cuenta 3
FROM customers c
INNER JOIN orders      o  ON o.customer_id  = c.customer_id
INNER JOIN order_items oi ON oi.order_id    = o.order_id
GROUP BY c.customer_id, c.first_name;

-- CORRECTO: DISTINCT elimina los duplicados de order_id antes de contar
SELECT
    c.first_name,
    COUNT(DISTINCT o.order_id) AS total_pedidos
FROM customers c
INNER JOIN orders      o  ON o.customer_id  = c.customer_id
INNER JOIN order_items oi ON oi.order_id    = o.order_id
GROUP BY c.customer_id, c.first_name;
```

El error mental: olvidar que al unir una tabla "cabecera" (orders) con una tabla "detalle" (order_items), el JOIN multiplica las filas de la cabecera por la cantidad de detalles que tiene.

**Error 3 — Self-join sin excluir el producto comparado consigo mismo**

```sql
-- INCORRECTO: compara cada producto incluyéndose a sí mismo en el promedio
SELECT p1.name, AVG(p2.price) AS promedio_categoria
FROM products p1
INNER JOIN products p2 ON p2.category_id = p1.category_id
-- Falta: AND p2.product_id <> p1.product_id
GROUP BY p1.product_id, p1.name;
-- El promedio incluye el precio del propio p1, lo que sesga el cálculo
```

```sql
-- CORRECTO: excluir el producto de su propia comparación
INNER JOIN products p2 ON p2.category_id = p1.category_id
                      AND p2.product_id  <> p1.product_id
```

**Error 4 — FULL OUTER JOIN con filtro en WHERE que anula el efecto del FULL**

```sql
-- INCORRECTO: el WHERE convierte el FULL OUTER JOIN en INNER JOIN efectivo
SELECT cat.name, p.name
FROM categories cat
FULL OUTER JOIN products p ON p.category_id = cat.category_id
WHERE p.is_active = TRUE;  -- los NULL de p (categorías sin productos) fallan este filtro
                            -- resultado: solo filas con match en ambas tablas
```

```sql
-- CORRECTO: el filtro de la tabla derecha va en el ON, no en el WHERE
SELECT cat.name, p.name
FROM categories cat
FULL OUTER JOIN products p ON p.category_id = cat.category_id
                           AND p.is_active = TRUE;
-- Las categorías sin productos activos siguen apareciendo con NULL en p.name
```

La misma regla que con LEFT JOIN: filtros sobre la tabla "secundaria" van en `ON` si quieres preservar las filas sin coincidencia.

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

Con JOINs múltiples ya puedes responder casi cualquier pregunta que combine tablas. Pero hay un tipo de pregunta que los JOINs no resuelven bien: "dame los productos cuyo precio es mayor al promedio de toda la categoría" — que requiere calcular el promedio primero y luego comparar.

Esa secuencia — calcular algo y luego filtrar o comparar usando ese resultado — es el territorio de las **subqueries**: consultas anidadas dentro de otra consulta. La Lección 4 introduce las subqueries escalares, las subqueries en WHERE y el patrón EXISTS/NOT EXISTS — las herramientas que completan el toolkit del analista de datos para responder preguntas que tienen dos "pasos" lógicos.
