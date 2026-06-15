# Nivel 3 — JOINs y Relaciones
## Lección 1: INNER JOIN — Conectar tablas por su clave común

> Tablas disponibles en este nivel: `customers`, `categories`, `products`, `orders`, `order_items`

---

## 1. INTRODUCCIÓN CONCEPTUAL

### El momento en que una tabla sola ya no alcanza

Llevas tres semanas en ShopSphere. Valentina entra al chat con un mensaje corto:

> *"Marco necesita saber qué productos generan más revenue. Nombre del producto, categoría y revenue total. Para el mediodía."*

Abres la base de datos. Tienes la tabla `order_items` con las cantidades y precios de cada ítem vendido. Tienes la tabla `products` con el nombre de cada producto. Tienes `categories` con el nombre de cada categoría. El revenue por producto está en `order_items`. Los nombres están en `products`. Las categorías están en `categories`.

El problema: ninguna tabla sola tiene todo lo que necesitas.

Eso es exactamente el problema que resuelve `JOIN`: **combinar filas de dos tablas distintas cuando comparten un valor común** — la clave que las conecta.

**La analogía del DNI:** Imagina que tienes dos archivos de papel. Uno tiene el número de DNI y el salario de cada empleado. Otro tiene el número de DNI y el nombre. Para armar una lista con nombre y salario, buscas el DNI en ambos archivos y los unís. SQL hace lo mismo, pero en microsegundos sobre millones de filas. El número de DNI es la clave de unión — en ShopSphere, ese rol lo cumplen columnas como `product_id`, `customer_id`, `order_id`.

**Por qué las tablas están separadas en primer lugar:** Porque el modelo relacional evita la redundancia. Si el nombre del producto estuviera repetido en cada fila de `order_items`, y ese producto cambiara de nombre, habría que actualizar miles de filas y cualquier error dejaría inconsistencias. En cambio, el nombre vive una sola vez en `products`. `order_items` solo guarda el `product_id` — la referencia. JOIN es el mecanismo para reunir esas piezas cuando las necesitas juntas.

**Por qué el INNER JOIN específicamente:** De todos los tipos de JOIN, `INNER JOIN` es el más restrictivo: solo devuelve filas donde existe la clave en ambas tablas. Si un producto no tiene ninguna venta en `order_items`, no aparece en el resultado. Si un `order_item` referencia un `product_id` que fue eliminado de `products`, tampoco aparece. Solo las coincidencias exactas pasan.

---

## 2. SINTAXIS

### Forma canónica

```sql
SELECT columnas
FROM tabla_a
INNER JOIN tabla_b ON tabla_a.clave = tabla_b.clave;
```

**Parámetros obligatorios:**
- `INNER JOIN tabla_b` — el nombre de la segunda tabla
- `ON tabla_a.clave = tabla_b.clave` — la condición de unión: qué columna comparten

**La palabra INNER es opcional:** `JOIN` sin calificador se comporta como `INNER JOIN` en todos los motores SQL. Sin embargo, escribirlo explícitamente hace el código más legible.

**Variante 1 — Con aliases de tabla (forma profesional)**
```sql
SELECT oi.order_id,
       p.name   AS producto,
       oi.quantity,
       oi.unit_price
FROM order_items oi
INNER JOIN products p ON p.product_id = oi.product_id;
```
Los aliases (`oi`, `p`) reemplazan el nombre completo de la tabla en toda la query. Son obligatorios cuando dos tablas tienen columnas con el mismo nombre — sin alias, SQL no sabe a cuál te referís.

**Variante 2 — JOIN con múltiples condiciones en el ON**
```sql
-- Detectar ítems vendidos con descuento respecto al precio de catálogo
FROM order_items oi
INNER JOIN products p ON p.product_id  = oi.product_id
                     AND oi.unit_price  < p.price
```
El `ON` puede tener más de una condición con `AND`. Aquí se une por `product_id` (la clave de relación habitual) y además se añade una segunda condición de negocio: que el precio unitario del ítem sea inferior al precio de catálogo del producto. Las filas resultantes son ítems que se vendieron con descuento — útil para auditar si los descuentos se aplicaron correctamente y en qué pedidos.

El patrón de múltiples condiciones en `ON` también aparece en contextos de integridad referencial cruzada. Por ejemplo, al listar ítems de pedido junto con el pedido al que pertenecen y verificar que el pedido corresponde a un cliente registrado:

```sql
-- Verificar que cada pedido tiene un cliente válido
SELECT o.order_id, o.ordered_at, oi.product_id, oi.quantity
FROM order_items oi
INNER JOIN orders o ON o.order_id    = oi.order_id
INNER JOIN customers c ON c.customer_id = o.customer_id;
```

*(Adelanto del Nivel 4: cuando incorporemos la tabla `returns`, cada devolución referencia tanto `order_id` como `product_id`. En ese nivel verás cómo el `ON` puede necesitar ambas claves para cruzar correctamente.)*

**Variante 3 — JOIN encadenado (múltiples tablas)**
```sql
FROM order_items oi
INNER JOIN products   p ON p.product_id   = oi.product_id
INNER JOIN categories c ON c.category_id  = p.category_id
```
Cada `INNER JOIN` agrega una tabla más. El resultado intermedio de los primeros dos se une con el tercero. El orden lógico es: empezar por la tabla que tiene las claves foráneas y unirse hacia las tablas padre.

**Reglas que generan errores frecuentes:**
- Si dos tablas tienen una columna con el mismo nombre (por ejemplo, ambas tienen `name`), debes calificarla con el alias: `p.name`, `c.name`. Sin alias, el motor no sabe cuál columna querés.
- El `ON` es obligatorio. Olvidarlo o escribir `JOIN tabla WHERE condicion` en lugar de `JOIN tabla ON condicion` genera un error o un producto cartesiano sin querer.
- El alias definido después de la tabla (ej: `orders o`) debe usarse consistentemente en toda la query. No puedes mezclar `o.customer_id` y `orders.customer_id` en la misma query si declaraste el alias `o`.

---

## 3. EJEMPLO PRÁCTICO

### Contexto: Valentina necesita el revenue por producto para Marco

**Query 1 — La forma mínima: unir order_items con products**

```sql
SELECT p.name        AS producto,
       oi.quantity,
       oi.unit_price
FROM order_items oi
INNER JOIN products p ON p.product_id = oi.product_id
LIMIT 5;
```

Output (5 primeras filas):

| producto | quantity | unit_price |
|---|---|---|
| Smartphone Samsung Galaxy A54 | 2 | 349.99 |
| Cable USB-C Anker 2m | 3 | 12.99 |
| Laptop Lenovo IdeaPad 3 15" | 1 | 549.99 |
| Auriculares Sony WH-1000XM5 | 1 | 279.99 |
| Cable USB-C Anker 2m | 2 | 12.99 |

Ya ves el nombre del producto junto con su cantidad y precio. Pero Valentina quiere revenue total (no fila a fila), y también la categoría. Avanzamos.

**Query 2 — Revenue por producto con categoría (la respuesta completa para Valentina)**

```sql
SELECT p.name            AS producto,
       c.name            AS categoria,
       SUM(oi.quantity * oi.unit_price) AS revenue_total
FROM order_items oi
INNER JOIN products   p ON p.product_id  = oi.product_id
INNER JOIN categories c ON c.category_id = p.category_id
GROUP BY p.name, c.name
ORDER BY revenue_total DESC
LIMIT 10;
```

Output (top 10 productos por revenue):

| producto | categoria | revenue_total |
|---|---|---|
| Laptop Lenovo IdeaPad 3 15" | Tecnología | 87450.00 |
| Smartphone Samsung Galaxy A54 | Tecnología | 64230.00 |
| Smart TV 55" Samsung | Tecnología | 58970.00 |
| Auriculares Sony WH-1000XM5 | Tecnología | 31245.00 |
| Silla Ergonómica OfficePro | Hogar | 28670.00 |
| ... | ... | ... |

Valentina mira el resultado: "Tecnología domina el revenue. Marco va a preguntar si eso es sano o si dependemos demasiado de esa categoría. Lo veremos en el análisis de diversificación."

**Por qué las filas se "pierden" en un INNER JOIN — la advertencia crítica:**

```sql
-- Esta query NO incluye productos que nunca se vendieron
SELECT p.name, SUM(oi.quantity) AS unidades
FROM order_items oi
INNER JOIN products p ON p.product_id = oi.product_id
GROUP BY p.name;

-- Si quisieras VER los productos sin ventas, necesitarías LEFT JOIN (Lección 2)
-- Con INNER JOIN, si un producto no aparece en order_items, desaparece del resultado
```

**El riesgo de duplicados inesperados — cuándo un JOIN multiplica filas:**

```sql
-- Si un producto aparece en 50 order_items, el JOIN lo une con esas 50 filas
-- Esto es correcto cuando querés agregar (SUM, COUNT)
-- Pero si olvidás el GROUP BY, obtenés 50 filas con el mismo nombre de producto
SELECT p.name, oi.quantity * oi.unit_price AS revenue_linea
FROM order_items oi
INNER JOIN products p ON p.product_id = oi.product_id;
-- Resultado correcto: una fila por cada línea de venta, no por producto
-- Para totales por producto: agregá GROUP BY p.name
```

La regla general: **JOIN combina filas según la cardinalidad de la relación**. Si un producto tiene 50 ventas, el JOIN produce 50 filas para ese producto. Eso es lo esperado — pero si lo olvidás al diseñar la query, los totales parecen incorrectos.

---

## 4. CASOS DE USO REALES

**Caso 1 — Revenue por producto, categoría o período (el análisis más común de e-commerce)**
El 80% de las queries de análisis de ventas en ShopSphere requieren unir `order_items` con `products` o `orders`. Sin INNER JOIN, el revenue total es solo un número. Con JOIN, se convierte en revenue desglosado por producto, categoría, mes o vendedor.
*Rol que lo usa: Data Analyst, Business Analyst, Finance Analyst.*

**Caso 2 — Detalle de pedidos para reportes de operaciones**
Diego de Operaciones necesita ver qué productos van en cada pedido y cuántas unidades. Esa información solo existe uniendo `orders` + `order_items` + `products`. Sin JOIN, solo puede ver el pedido en abstracto — no su contenido.
*Rol que lo usa: Operations Analyst, Supply Chain Analyst.*

**Caso 3 — Validación de integridad de datos**
Valentina quiere verificar que todos los `product_id` en `order_items` corresponden a productos válidos en `products`. Un INNER JOIN que retorna menos filas que las que hay en `order_items` indicaría referencias huérfanas — un problema de calidad de datos que hay que reportar antes de cualquier análisis.
*Rol que lo usa: Data Engineer, Data Analyst en tareas de data quality.*

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico
**Contexto:** Marco quiere saber cuál es el producto que más se vendió en toda la historia de ShopSphere, medido en unidades totales (Briefing 3.5).

Escribe una query que retorne el nombre del producto y el total de unidades vendidas, para el producto con más unidades en toda la historia. Solo la fila del ganador.

**Tablas necesarias:** `order_items`, `products`

**Resultado esperado:** Una sola fila con dos columnas: nombre del producto y total de unidades.

**Criterio de éxito:** Usas INNER JOIN entre `order_items` y `products`. Usas `SUM(quantity)`. Limitas a 1 resultado ordenado de mayor a menor.

---

### Ejercicio Intermedio
**Contexto:** Sofía de Marketing prepara el brief de Black Friday 2026 y necesita los 10 productos más vendidos en el Black Friday 2025 (28 de noviembre de 2025) medidos en unidades (Briefing 3.7).

Escribe una query que retorne: nombre del producto, categoría y total de unidades vendidas en ese día específico. Ordenado de mayor a menor por unidades.

**Tablas necesarias:** `order_items`, `products`, `categories`, `orders`

**Resultado esperado:** 10 filas con tres columnas: producto, categoría y unidades.

**Criterio de éxito:** Filtras por la fecha exacta del 28 de noviembre de 2025. Encadenas al menos 3 JOINs. El resultado está limitado a 10 filas.

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
SELECT p.name          AS producto,
       SUM(oi.quantity) AS unidades_vendidas
FROM order_items oi
INNER JOIN products p ON p.product_id = oi.product_id
GROUP BY p.name
ORDER BY unidades_vendidas DESC
LIMIT 1;
```

**Solución Ejercicio Intermedio:**
```sql
SELECT p.name            AS producto,
       c.name            AS categoria,
       SUM(oi.quantity)  AS unidades_vendidas
FROM orders o
INNER JOIN order_items oi ON oi.order_id    = o.order_id
INNER JOIN products    p  ON p.product_id   = oi.product_id
INNER JOIN categories  c  ON c.category_id  = p.category_id
WHERE o.ordered_at >= '2025-11-28'
  AND o.ordered_at <  '2025-11-29'
GROUP BY p.name, c.name
ORDER BY unidades_vendidas DESC
LIMIT 10;
```

Nota: el filtro de fecha usa `>=` y `<` en lugar de `DATE(ordered_at) = '2025-11-28'` porque es más eficiente sobre columnas TIMESTAMP — permite que el motor use índices sobre `ordered_at` sin aplicar una función a cada fila.

</details>

---

## 6. ERRORES COMUNES

**Error 1 — Olvidar calificar columnas con el mismo nombre en dos tablas**

```sql
-- INCORRECTO: orders y order_items ambas tienen order_id
SELECT order_id, quantity
FROM orders
INNER JOIN order_items ON order_id = order_id;
```
Error típico: `ERROR: column reference "order_id" is ambiguous`

El motor no sabe si `order_id` viene de `orders` o de `order_items`. Solución: usar aliases y calificar.

```sql
-- CORRECTO
SELECT o.order_id, oi.quantity
FROM orders o
INNER JOIN order_items oi ON oi.order_id = o.order_id;
```

**Error 2 — Hacer JOIN sin ON (producto cartesiano accidental)**

```sql
-- INCORRECTO: falta la condición ON
SELECT p.name, oi.quantity
FROM products p, order_items oi;
```

Esta sintaxis (coma entre tablas) es la notación antigua de JOIN. Sin condición de unión, combina cada fila de `products` con cada fila de `order_items`. Con 80 productos y 5.000 items, el resultado tiene 400.000 filas. En tablas grandes puede saturar la memoria.

```sql
-- CORRECTO
SELECT p.name, oi.quantity
FROM products p
INNER JOIN order_items oi ON oi.product_id = p.product_id;
```

**Error 3 — JOIN correcto pero GROUP BY incompleto**

```sql
-- INCORRECTO: falta c.name en el GROUP BY
SELECT p.name, c.name, SUM(oi.quantity)
FROM order_items oi
INNER JOIN products   p ON p.product_id  = oi.product_id
INNER JOIN categories c ON c.category_id = p.category_id
GROUP BY p.name;
```
Error típico: `ERROR: column "c.name" must appear in the GROUP BY clause or be used in an aggregate function`

Cuando hay varias columnas no agregadas en el SELECT, todas deben estar en el GROUP BY.

```sql
-- CORRECTO
GROUP BY p.name, c.name
```

**Error 4 — Confundir la condición del JOIN con un filtro de negocio**

```sql
-- INCORRECTO CONCEPTUALMENTE: mezcla condición de unión con filtro
FROM order_items oi
INNER JOIN products p ON p.product_id = oi.product_id
                     AND p.is_active = TRUE
```

Esto funciona sintácticamente, pero en INNER JOIN no hay diferencia práctica con poner `WHERE p.is_active = TRUE` después. Sin embargo, el hábito puede causar problemas cuando se usa LEFT JOIN (la condición en el ON y en el WHERE tienen efectos distintos — esto se verá en la Lección 2). La buena práctica: condiciones de unión en `ON`, condiciones de filtro en `WHERE`.

```sql
-- FORMA RECOMENDADA
FROM order_items oi
INNER JOIN products p ON p.product_id = oi.product_id
WHERE p.is_active = TRUE
```

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

El INNER JOIN une solo las filas con coincidencia en ambas tablas. Eso es exactamente lo que necesitas para calcular revenue — solo te interesan los productos que se vendieron.

Pero Valentina ya tiene la siguiente pregunta preparada: "¿Cuáles son los clientes que nunca hicieron un pedido?" y "¿Qué productos no registraron ninguna venta en los últimos 90 días?" Esas preguntas requieren lo opuesto: conservar las filas que NO tienen coincidencia. Para eso existe el `LEFT JOIN` — que es el tipo de JOIN más poderoso para detectar ausencias, registros huérfanos y oportunidades de negocio que los datos de ventas por sí solos no muestran.
