# Nivel 3 — JOINs y Relaciones
## Lección 2: LEFT JOIN y RIGHT JOIN — La asimetría que revela lo que falta

> Tablas disponibles en este nivel: `customers`, `categories`, `products`, `orders`, `order_items`

---

## 1. INTRODUCCIÓN CONCEPTUAL

### El análisis que el INNER JOIN no puede hacer

Valentina tiene dos preguntas nuevas sobre el escritorio:

> *"Necesito la lista de clientes registrados que nunca hicieron un pedido. Sofía quiere usarla para una campaña de reactivación."*

> *"Diego preguntó qué productos del catálogo no registraron ventas en los últimos 90 días."*

Intentas resolverlo con INNER JOIN. El problema: INNER JOIN solo muestra filas donde hay coincidencia en ambas tablas. Un cliente sin pedidos no aparece en `orders` — por eso desaparece del resultado. Un producto sin ventas no aparece en `order_items` — mismo resultado.

Lo que necesitas es un JOIN que diga: "dame todas las filas de la tabla izquierda, haya o no coincidencia en la derecha". Eso es el `LEFT JOIN`.

**La asimetría fundamental:** En un JOIN, una tabla "manda" y la otra "participa". En `LEFT JOIN`, la tabla izquierda (la que aparece antes del JOIN) es la que manda: todas sus filas aparecen en el resultado, sin importar si tienen o no coincidencia en la tabla derecha. Donde no hay coincidencia, las columnas de la tabla derecha aparecen como `NULL`.

**La analogía de la lista de invitados:** Tienes la lista completa de invitados a una fiesta (tabla izquierda) y la lista de quiénes firmaron el libro de visitas (tabla derecha). Un LEFT JOIN te da a todos los invitados — los que firmaron y los que no. Los que no firmaron aparecen con NULL en la columna del libro. Si hicieras un INNER JOIN, solo verías los que firmaron. Perderías exactamente la información que más te interesa: quién faltó.

**RIGHT JOIN existe, pero casi nadie lo usa:** RIGHT JOIN es simétricamente opuesto: conserva todas las filas de la tabla derecha. En la práctica, toda query con RIGHT JOIN puede reescribirse como un LEFT JOIN simplemente invirtiendo el orden de las tablas. La convención del sector es siempre usar LEFT JOIN y poner la tabla "completa" a la izquierda — el código es más predecible y más fácil de leer.

---

## 2. SINTAXIS

### LEFT JOIN — forma canónica

```sql
SELECT columnas
FROM tabla_izquierda
LEFT JOIN tabla_derecha ON tabla_izquierda.clave = tabla_derecha.clave;
```

También se escribe `LEFT OUTER JOIN` — el `OUTER` es opcional y es más explícito sobre lo que hace.

**El patrón para detectar registros sin coincidencia — WHERE columna_derecha IS NULL**

```sql
SELECT c.customer_id, c.first_name, c.email
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE o.order_id IS NULL;
```

Este patrón es uno de los más importantes en análisis de datos:
1. El LEFT JOIN incluye todos los clientes
2. Los clientes sin pedidos tienen `NULL` en todas las columnas de `orders`
3. El `WHERE o.order_id IS NULL` filtra exactamente esos — los que no tienen coincidencia

**RIGHT JOIN — forma canónica**

```sql
SELECT columnas
FROM tabla_izquierda
RIGHT JOIN tabla_derecha ON tabla_izquierda.clave = tabla_derecha.clave;
```

Equivale exactamente a:

```sql
SELECT columnas
FROM tabla_derecha
LEFT JOIN tabla_izquierda ON tabla_izquierda.clave = tabla_derecha.clave;
```

Úsalo solo si el contexto hace más natural tener la tabla "completa" a la derecha. En la práctica, siempre es más claro reordenar y usar LEFT JOIN.

**La diferencia crítica: condición en ON vs. condición en WHERE con LEFT JOIN**

```sql
-- Versión A: condición en WHERE
SELECT c.customer_id, o.order_id
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE o.status = 'delivered';
-- RESULTADO: solo los clientes con pedidos entregados
-- (equivale a un INNER JOIN + filtro, porque WHERE elimina los NULL)

-- Versión B: condición en ON
SELECT c.customer_id, o.order_id
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
                  AND o.status = 'delivered';
-- RESULTADO: todos los clientes; los que tienen pedidos entregados muestran esos pedidos;
-- los demás muestran NULL en order_id (incluyendo los que solo tienen pedidos en otro estado)
```

Esta distinción es la causa número uno de bugs en queries con LEFT JOIN. La regla: si quieres conservar las filas sin coincidencia, pon los filtros de la tabla derecha en el `ON`, no en el `WHERE`.

---

## 3. EJEMPLO PRÁCTICO

### Contexto: Los dos pedidos de Valentina — clientes sin compras y productos sin ventas

**Query 1 — Clientes que nunca hicieron un pedido (Briefing 3.6)**

```sql
SELECT c.customer_id,
       c.first_name,
       c.last_name,
       c.email,
       c.country
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE o.order_id IS NULL
ORDER BY c.country, c.last_name;
```

Output (primeras 5 filas):

| customer_id | first_name | last_name | email | country |
|---|---|---|---|---|
| 47 | Rodrigo | Acosta | r.acosta@outlook.com | Argentina |
| 112 | Camila | Bravo | c.bravo@yahoo.com | Colombia |
| 203 | Felipe | Cruz | f.cruz@gmail.com | México |
| 289 | Lucia | Díaz | l.diaz@outlook.com | México |
| 334 | Andrés | Mora | a.mora@gmail.com | Perú |

Valentina mira el resultado: "Son 42 clientes. Le paso la lista a Sofía para la campaña. Que no envíe a los de Argentina hasta que resolvamos el problema cambiario."

**Lectura del resultado paso a paso:**
- LEFT JOIN incluye los 500 clientes en el resultado intermedio
- Los clientes con pedidos tienen valores en las columnas de `orders` (order_id, status, etc.)
- Los 42 sin pedidos tienen `NULL` en todas esas columnas
- `WHERE o.order_id IS NULL` filtra y deja solo los 42

**Query 2 — Productos sin ventas en los últimos 90 días (Briefing 3.3)**

```sql
SELECT p.product_id,
       p.name        AS producto,
       c.name        AS categoria,
       p.price       AS precio
FROM products p
INNER JOIN categories c ON c.category_id = p.category_id
LEFT JOIN order_items oi ON oi.product_id = p.product_id
                         AND oi.order_id IN (
                             SELECT order_id
                             FROM orders
                             WHERE ordered_at >= CURRENT_DATE - INTERVAL '90 days'
                         )
WHERE oi.item_id IS NULL
  AND p.is_active = TRUE
  AND p.price > 50
ORDER BY p.price DESC;
```

Output (ejemplo):

| product_id | producto | categoria | precio |
|---|---|---|---|
| 67 | Set de cocina premium Le Creuset | Hogar Premium | 289.99 |
| 43 | Monitor LG 27" 4K | Tecnología | 259.99 |
| 71 | Aspiradora Dyson V15 | Hogar | 179.99 |

Diego ve el resultado: "Tres productos de alto precio sin movimiento. Voy a hablar con los proveedores esta semana."

**Versión simplificada para enseñar el concepto central:**

```sql
-- Todos los productos con o sin ventas (versión básica, sin filtro de fechas)
SELECT p.name          AS producto,
       COUNT(oi.item_id) AS veces_vendido
FROM products p
LEFT JOIN order_items oi ON oi.product_id = p.product_id
GROUP BY p.name
ORDER BY veces_vendido ASC;
-- Los productos con 0 ventas aparecen primero (veces_vendido = 0)
-- COUNT(oi.item_id) cuenta solo los no-NULL -- cuando no hay ventas, devuelve 0
```

**Query 3 — Categorías con conteo de productos (incluyendo categorías vacías)**

```sql
SELECT c.name               AS categoria,
       COUNT(p.product_id)  AS total_productos
FROM categories c
LEFT JOIN products p ON p.category_id = c.category_id
GROUP BY c.name
ORDER BY total_productos DESC;
```

Output:

| categoria | total_productos |
|---|---|
| Tecnología | 24 |
| Ropa | 18 |
| Hogar | 15 |
| Calzado | 12 |
| Hogar Premium | 8 |
| Libros | 3 |
| Arte y Colección | 0 |

La última fila revela que ShopSphere tiene una categoría sin productos activos. Con INNER JOIN, esa categoría habría sido invisible.

---

## 4. CASOS DE USO REALES

**Caso 1 — Segmentación de clientes inactivos para campañas de reactivación**
Sofía necesita saber quién se registró pero nunca compró. LEFT JOIN entre `customers` y `orders` con el filtro `WHERE orders.order_id IS NULL` da exactamente esa lista. Es el primer paso de cualquier análisis de conversión del funnel de registro → primera compra.
*Rol que lo usa: Marketing Analyst, CRM Analyst.*

**Caso 2 — Análisis de cobertura del catálogo**
Diego quiere saber qué porcentaje de los productos activos registró al menos una venta en el último trimestre. LEFT JOIN entre `products` y `order_items` con filtro de fechas permite calcular ese ratio. Los productos sin ventas son candidatos a descontinuación o campaña de impulso.
*Rol que lo usa: Operations Analyst, Category Manager.*

**Caso 3 — Reporte de todas las categorías (incluyendo las vacías)**
Ana de Finanzas necesita un reporte de revenue por categoría para el cierre de mes. Si usa INNER JOIN, las categorías sin ventas ese mes desaparecen del reporte y ella no sabe si fue porque no vendieron o porque la query las excluyó. LEFT JOIN garantiza que todas las categorías aparezcan — las sin ventas con 0 o NULL en revenue.
*Rol que lo usa: Finance Analyst, Business Analyst.*

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico
**Contexto:** Ana de Finanzas necesita saber si hubo alguna categoría sin ventas en abril 2026 (Briefing 3.9). Si todas vendieron algo, eso también es un dato relevante.

Escribe una query que liste todas las categorías y el número de pedidos distintos que tuvieron en abril 2026. Las categorías sin ventas en ese mes deben aparecer con 0.

**Tablas necesarias:** `categories`, `products`, `order_items`, `orders`

**Resultado esperado:** Todas las categorías de ShopSphere, con su conteo de pedidos en abril 2026. Las categorías sin ventas muestran 0.

**Criterio de éxito:** El número de filas en el resultado debe ser igual al total de categorías (ninguna desaparece). Las categorías sin ventas en ese período muestran 0 en la columna de conteo.

---

### Ejercicio Intermedio
**Contexto:** Valentina quiere una vista completa del catálogo activo con su rendimiento de ventas: nombre del producto, categoría, precio, y el total de unidades vendidas en toda la historia. Los productos sin ninguna venta deben aparecer con 0 unidades.

Escribe esa query. Ordena por unidades vendidas de mayor a menor (los productos sin ventas quedan al final).

**Tablas necesarias:** `products`, `categories`, `order_items`

**Resultado esperado:** Todos los productos activos, con su categoría, precio y total de unidades vendidas. Los productos sin ventas aparecen al final con 0.

**Criterio de éxito:** No usas INNER JOIN entre `products` y `order_items` (porque eso excluiría los sin ventas). Usas `COUNT` o `SUM` correctamente para mostrar 0 en lugar de NULL para los productos sin ventas.

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
SELECT c.name                            AS categoria,
       COUNT(DISTINCT o.order_id)        AS pedidos_abril_2026
FROM categories c
LEFT JOIN products    p  ON p.category_id = c.category_id
LEFT JOIN order_items oi ON oi.product_id = p.product_id
LEFT JOIN orders      o  ON o.order_id    = oi.order_id
                         AND o.ordered_at >= '2026-04-01'
                         AND o.ordered_at <  '2026-05-01'
GROUP BY c.name
ORDER BY pedidos_abril_2026 DESC;
```

Nota importante: el filtro de fecha va en el `ON` del JOIN con `orders`, no en el `WHERE`. Si lo pusieras en el `WHERE`, las categorías sin ventas en abril serían eliminadas del resultado (sus filas quedarían con NULL en `o.ordered_at`, y `NULL >= '2026-04-01'` es falso). Al ponerlo en el `ON`, el LEFT JOIN preserva todas las categorías.

**Solución Ejercicio Intermedio:**
```sql
SELECT p.name              AS producto,
       c.name              AS categoria,
       p.price             AS precio,
       COALESCE(SUM(oi.quantity), 0) AS unidades_vendidas
FROM products p
INNER JOIN categories  c  ON c.category_id = p.category_id
LEFT JOIN  order_items oi ON oi.product_id  = p.product_id
WHERE p.is_active = TRUE
GROUP BY p.name, c.name, p.price
ORDER BY unidades_vendidas DESC;
```

Nota: `COALESCE(SUM(oi.quantity), 0)` convierte el NULL que aparece para productos sin ventas en 0. `SUM(NULL)` retorna NULL — COALESCE lo reemplaza por 0 para presentación.

</details>

---

## 6. ERRORES COMUNES

**Error 1 — Poner el filtro de la tabla derecha en WHERE en lugar de ON**

```sql
-- INCORRECTO: convierte el LEFT JOIN en INNER JOIN efectivo
SELECT c.name, COUNT(o.order_id)
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE o.ordered_at >= '2026-01-01';  -- Los clientes sin pedidos tienen NULL en ordered_at
                                      -- NULL >= '2026-01-01' es FALSE -> se eliminan
```

El resultado excluye a los clientes sin pedidos. Si era esa la intención, debería ser INNER JOIN. Si se quieren conservar todos los clientes, el filtro debe ir en el ON:

```sql
-- CORRECTO: LEFT JOIN que preserva todos los clientes
SELECT c.name, COUNT(o.order_id)
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
                  AND o.ordered_at >= '2026-01-01'
GROUP BY c.name;
```

**Error 2 — Usar COUNT(*) en lugar de COUNT(columna_derecha) con LEFT JOIN**

```sql
-- INCORRECTO conceptualmente: COUNT(*) cuenta la fila aunque order_id sea NULL
SELECT c.name, COUNT(*) AS total_pedidos
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
GROUP BY c.name;
-- Un cliente sin pedidos aparece con total_pedidos = 1 (cuenta la fila con NULLs)
```

```sql
-- CORRECTO: COUNT(o.order_id) solo cuenta los no-NULL
SELECT c.name, COUNT(o.order_id) AS total_pedidos
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
GROUP BY c.name;
-- Un cliente sin pedidos aparece con total_pedidos = 0
```

**Error 3 — Usar WHERE columna IS NULL para filtrar los matches en lugar de los no-matches**

```sql
-- ERROR CONCEPTUAL: esta query retorna solo los clientes CON pedidos (el opuesto de lo que se quiere)
SELECT c.first_name
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE c.customer_id IS NULL;  -- customer_id de customers NUNCA es NULL (es PRIMARY KEY)
```

Para detectar los sin coincidencia, el `IS NULL` debe aplicarse a una columna de la tabla derecha:

```sql
-- CORRECTO
WHERE o.order_id IS NULL  -- columna de la tabla derecha (orders)
```

**Error 4 — RIGHT JOIN cuando un LEFT JOIN invertido sería más claro**

```sql
-- FUNCIONA pero es confuso: ¿por qué orders a la izquierda si customers es la tabla completa?
SELECT c.first_name, o.order_id
FROM orders o
RIGHT JOIN customers c ON c.customer_id = o.customer_id;

-- MÁS CLARO: la tabla "completa" va a la izquierda
SELECT c.first_name, o.order_id
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id;
```

Ambas queries dan el mismo resultado. La convención del sector es usar LEFT JOIN con la tabla completa a la izquierda.

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

Con INNER JOIN y LEFT JOIN ya puedes unir dos tablas. Pero las preguntas de negocio reales en ShopSphere rara vez involucran solo dos tablas.

El revenue por categoría requiere `order_items` + `products` + `categories`. El detalle completo de un pedido requiere `orders` + `order_items` + `products` + `customers`. El análisis de ventas por país requiere todas esas más el país del cliente. Eso es exactamente lo que resuelve la Lección 3: encadenar tres o más tablas en una sola query manteniendo la lógica clara y el código legible.
