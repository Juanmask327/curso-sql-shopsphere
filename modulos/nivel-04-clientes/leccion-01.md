# Nivel 4 — Análisis de Clientes
## Lección 1: Subqueries Avanzadas — Correlacionadas, EXISTS y referencia de valor

> Tablas disponibles en este nivel: `customers`, `categories`, `products`, `orders`, `order_items`, `returns`

---

## 1. INTRODUCCIÓN CONCEPTUAL

### Cuando la subquery necesita saber en qué fila está

En el Nivel 3 aprendiste las subqueries básicas: una query dentro de otra que se ejecuta de forma independiente, calcula un resultado y lo pasa a la query exterior. Ese modelo funciona para preguntas como "¿qué clientes compraron en noviembre?" o "¿qué productos tienen precio mayor al promedio global?".

Pero Valentina tiene una pregunta más afilada:

> *"Quiero ver cada producto con su precio y el precio promedio de su propia categoría, no del catálogo completo. Y solo los productos que cuestan más que ese promedio de categoría, no el global."*

Eso cambia todo. El "promedio de su propia categoría" es un valor diferente para cada fila. No puedes calcular un solo promedio y usarlo para todas las filas — necesitas que la subquery sepa en qué producto está trabajando la query exterior y calcule el promedio de esa categoría específica.

Eso es una **subquery correlacionada**: una subquery que referencia la tabla exterior y se re-ejecuta una vez por cada fila del resultado exterior.

La diferencia conceptual entre una subquery normal y una correlacionada es la misma que hay entre una calculadora y una fórmula de Excel con referencias de celda: la calculadora siempre da el mismo número, la fórmula cambia según la fila.

**EXISTS y NOT EXISTS** llevan este mecanismo un paso más allá: no calculan un valor, sino que responden una pregunta de sí o no. "¿Existe alguna devolución aprobada para este cliente?" No importa cuántas hay — basta con que exista una para que la respuesta sea SÍ. Y tan pronto como encuentra la primera fila, deja de buscar. Eso los hace más eficientes que `IN` en muchos escenarios reales.

---

## 2. SINTAXIS

### Subquery correlacionada en WHERE

```sql
-- La referencia a la tabla exterior (tabla_a.columna) es lo que hace la correlación
SELECT columnas
FROM tabla_a a
WHERE a.valor > (
    SELECT FUNCION_AGREGACION(b.valor)
    FROM tabla_b b
    WHERE b.clave_fk = a.clave_pk   -- referencia a la fila exterior
);
```

La clave es `b.clave_fk = a.clave_pk`: la subquery usa la clave de la fila exterior para filtrar su propio resultado. Para cada fila de `tabla_a`, la subquery calcula el agregado solo de las filas relacionadas en `tabla_b`.

### Subquery correlacionada en SELECT

```sql
-- Retorna un valor calculado específico para cada fila del resultado
SELECT
    a.nombre,
    a.valor,
    (SELECT FUNCION_AGREGACION(b.valor)
     FROM tabla_b b
     WHERE b.clave_fk = a.clave_pk) AS valor_referencia
FROM tabla_a a;
```

La subquery entre paréntesis en el SELECT debe retornar exactamente un valor (una fila, una columna). Si la correlación es correcta, cada fila del resultado exterior tendrá su propio valor de referencia calculado.

### EXISTS

```sql
-- Devuelve TRUE si la subquery encuentra al menos una fila
SELECT columnas
FROM tabla_a a
WHERE EXISTS (
    SELECT 1                          -- el SELECT 1 es convención: no importa qué se retorna
    FROM tabla_b b
    WHERE b.clave_fk = a.clave_pk     -- la correlación
      AND b.condicion = valor
);
```

`EXISTS` es siempre correlacionado: referencia la tabla exterior. Tan pronto como encuentra la primera fila que satisface la condición, retorna TRUE y deja de buscar (cortocircuito). El `SELECT 1` es la convención estándar porque comunica que no te importa qué columnas hay — solo si hay filas.

### NOT EXISTS

```sql
-- Devuelve TRUE si la subquery NO encuentra ninguna fila
SELECT columnas
FROM tabla_a a
WHERE NOT EXISTS (
    SELECT 1
    FROM tabla_b b
    WHERE b.clave_fk = a.clave_pk
);
```

`NOT EXISTS` es el mecanismo correcto para detectar ausencias: filas en `tabla_a` que no tienen ninguna correspondencia en `tabla_b`. Es más robusto que `NOT IN` porque no tiene el problema con NULLs.

### Cuándo preferir EXISTS sobre IN — la diferencia de rendimiento

```sql
-- Con IN: la subquery se ejecuta completa y el resultado se evalúa contra cada fila exterior
WHERE customer_id IN (SELECT customer_id FROM returns WHERE status = 'approved')

-- Con EXISTS: para cada fila exterior, la subquery busca hasta encontrar una sola coincidencia
--            y para ahí (cortocircuito)
WHERE EXISTS (SELECT 1 FROM returns r WHERE r.customer_id = c.customer_id AND r.status = 'approved')
```

`EXISTS` gana cuando la subquery tiene un índice sobre la columna de correlación y cuando la mayoría de los casos son "sí existe" — porque para en la primera coincidencia. `IN` puede ser comparable o mejor cuando el conjunto de resultados de la subquery es pequeño y está en caché. En la práctica: usa `EXISTS` cuando la intención es "verificar si existe algún registro relacionado", y usa `IN` cuando tienes una lista literal o una subquery que claramente retorna pocos valores.

### El caso especial: NOT IN con la trampa de NULLs — aplicado a returns

Cuando la tabla de devoluciones es la fuente de la subquery, aparece un riesgo concreto:

```sql
-- PELIGROSO: si returns tuviera algún customer_id NULL, esta query retorna 0 filas
WHERE c.customer_id NOT IN (
    SELECT customer_id FROM returns
)

-- SEGURO: filtrar NULLs explícitamente si usas NOT IN
WHERE c.customer_id NOT IN (
    SELECT customer_id FROM returns WHERE customer_id IS NOT NULL
)

-- MÁS SEGURO: usar NOT EXISTS directamente
WHERE NOT EXISTS (
    SELECT 1 FROM returns r WHERE r.order_id IN (
        SELECT o.order_id FROM orders o WHERE o.customer_id = c.customer_id
    )
)
```

En `returns`, `order_id` y `product_id` son claves foráneas obligatorias — no deberían tener NULLs. Pero en datos reales (migraciones históricas, importaciones de sistemas legacy), los campos de FK a veces llegan con NULLs. El hábito de usar `NOT EXISTS` protege contra esa clase de sorpresa silenciosa.

---

## 3. EJEMPLO PRÁCTICO

### Contexto: el análisis del spike de julio que nadie hizo

Las preguntas de Valentina sobre el spike de devoluciones de julio 2025 requieren comparar cada producto contra su propio grupo, no contra el catálogo completo.

**Query 1 — Forma mínima: precio de cada producto vs. promedio de su categoría**

```sql
SELECT
    p.name                     AS producto,
    p.price                    AS precio,
    ROUND(
        (SELECT AVG(p2.price)
         FROM products p2
         WHERE p2.category_id = p.category_id   -- correlación: misma categoría
           AND p2.is_active = TRUE),
        2
    )                          AS promedio_categoria
FROM products p
WHERE p.is_active = TRUE
LIMIT 5;
```

Output:

| producto | precio | promedio_categoria |
|---|---|---|
| Laptop Lenovo IdeaPad 3 15" | 549.99 | 187.45 |
| Cable USB-C Anker 2m | 12.99 | 187.45 |
| Smartphone Samsung Galaxy A54 | 349.99 | 187.45 |
| Silla Ergonómica OfficePro | 289.99 | 156.30 |
| Camiseta Básica Algodón | 24.99 | 48.20 |

Para Laptop y Cable USB-C: misma categoría, mismo promedio (187.45). Para Silla: categoría Hogar, promedio diferente (156.30). Cada fila tiene su propio promedio calculado.

**Query 2 — Versión completa: solo productos más caros que el promedio de su categoría**

```sql
SELECT
    p.name                                 AS producto,
    cat.name                               AS categoria,
    p.price                                AS precio,
    ROUND(
        (SELECT AVG(p2.price)
         FROM products p2
         WHERE p2.category_id = p.category_id
           AND p2.is_active = TRUE),
        2
    )                                      AS promedio_categoria,
    ROUND(
        p.price - (SELECT AVG(p2.price)
                   FROM products p2
                   WHERE p2.category_id = p.category_id
                     AND p2.is_active = TRUE),
        2
    )                                      AS diferencia
FROM products p
INNER JOIN categories cat ON cat.category_id = p.category_id
WHERE p.is_active = TRUE
  AND p.price > (
      SELECT AVG(p2.price)
      FROM products p2
      WHERE p2.category_id = p.category_id   -- correlación: misma categoría
        AND p2.is_active = TRUE
  )
ORDER BY cat.name, diferencia DESC;
```

Output (primeras filas):

| producto | categoria | precio | promedio_categoria | diferencia |
|---|---|---|---|---|
| Laptop Lenovo IdeaPad 3 15" | Tecnología | 549.99 | 187.45 | 362.54 |
| Smart TV 55" Samsung | Tecnología | 489.99 | 187.45 | 302.54 |
| Auriculares Sony WH-1000XM5 | Tecnología | 279.99 | 187.45 | 92.54 |
| Silla Ergonómica OfficePro | Hogar | 289.99 | 156.30 | 133.69 |

Valentina ve el patrón: los productos de Tecnología que más se desvían de la media de su categoría son exactamente los que tienen mayor riesgo si hay un problema de calidad — son los de mayor precio relativo a su entorno.

**Query 3 — EXISTS: clientes que tienen al menos una devolución en julio 2025**

```sql
SELECT
    c.customer_id,
    c.first_name,
    c.last_name,
    c.email,
    c.country
FROM customers c
WHERE EXISTS (
    SELECT 1
    FROM returns r
    INNER JOIN orders o ON o.order_id = r.order_id
    WHERE o.customer_id = c.customer_id          -- correlación: mismo cliente
      AND r.returned_at >= '2025-07-01'
      AND r.returned_at <  '2025-08-01'
)
ORDER BY c.country, c.last_name;
```

La subquery busca si ese cliente específico tiene alguna devolución en julio. Tan pronto encuentra una, retorna TRUE para esa fila. Si el cliente tiene 5 devoluciones en julio, la subquery se detiene en la primera — no necesita contar todas.

Output esperado (fragmento):

| customer_id | first_name | last_name | email | country |
|---|---|---|---|---|
| 43 | Camila | Ríos | camila.rios@email.com | Colombia |
| 91 | Sebastián | Morales | s.morales@email.com | Colombia |
| 127 | Andrea | Vargas | a.vargas@email.com | Colombia |

El patrón geográfico ya es visible: Colombia concentra las devoluciones de julio. Diego tenía razón sobre el proveedor de calzado.

**Query 4 — NOT EXISTS: clientes que NUNCA han devuelto nada**

```sql
SELECT
    c.customer_id,
    c.first_name,
    c.last_name,
    c.email,
    c.country
FROM customers c
WHERE EXISTS (
    -- condición 1: que hayan comprado algo (al menos un pedido)
    SELECT 1
    FROM orders o
    WHERE o.customer_id = c.customer_id
)
AND NOT EXISTS (
    -- condición 2: que no tengan ninguna devolución
    SELECT 1
    FROM returns r
    INNER JOIN orders o ON o.order_id = r.order_id
    WHERE o.customer_id = c.customer_id
)
ORDER BY c.last_name;
```

Este patrón — `EXISTS` + `NOT EXISTS` combinados — es la forma canónica de "clientes que hicieron A pero nunca hicieron B". Es más legible y más robusto que la alternativa con `IN` y `NOT IN`.

---

## 4. CASOS DE USO REALES

**Caso 1 — Comparación dentro del grupo (el uso más frecuente de subquery correlacionada)**
En análisis de precios, RR.HH., seguimiento de inventario y análisis de rendimiento de campañas, el patrón "comparar contra el promedio del grupo al que pertenece" aparece constantemente. Precio de producto vs. precio promedio de su categoría. Salario de empleado vs. salario promedio de su departamento. Tiempo de entrega de pedido vs. promedio histórico de ese proveedor.
*Rol que lo usa: Data Analyst, Business Analyst, Finance Analyst.*

**Caso 2 — Verificación de elegibilidad con EXISTS**
En sistemas de e-commerce, se usa `EXISTS` para verificar condiciones antes de aplicar descuentos, upgrades o campañas: "¿este cliente tiene al menos un pedido entregado en los últimos 90 días?" (elegible para programa de lealtad). "¿Este producto tiene stock disponible?" (elegible para mostrarse en el catálogo). La verificación es booleana — no necesitas el dato, solo si existe.
*Rol que lo usa: Backend Developer, Data Analyst, CRM Analyst.*

**Caso 3 — Detección de segmentos por ausencia con NOT EXISTS**
El segmento más valioso a veces es el que no aparece en una tabla: clientes sin devoluciones (perfil de bajo riesgo), productos sin quejas (para destacar en campañas), pedidos sin pago registrado (problema financiero a investigar). `NOT EXISTS` es la herramienta para encontrar lo que no está.
*Rol que lo usa: Data Analyst, Risk Analyst, Operations Analyst.*

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico
**Contexto (Briefing 4.3):** Diego está preparando la reunión con el área de calidad. Quiere los productos que nunca generaron una devolución aprobada o reembolsada — son los productos más confiables del catálogo desde la perspectiva del cliente.

Escribe una query que retorne el nombre del producto, el nombre de su categoría y su precio, para todos los productos que no aparecen en ningún registro de la tabla `returns` con `status` igual a `'approved'` o `'refunded'`. Usa `NOT EXISTS`. Ordena por precio descendente.

**Tablas necesarias:** `products`, `categories`, `returns`, `order_items`

**Resultado esperado:** Lista de productos que pasaron el filtro de calidad completo. El número de filas debe ser menor que el total de productos activos.

**Criterio de éxito:** Usas `NOT EXISTS`. La subquery correlaciona por `product_id`. El filtro de status está dentro de la subquery. La query incluye el nombre de categoría (requiere JOIN con `categories`).

---

### Ejercicio Intermedio
**Contexto (Briefing 4.4):** Valentina quiere saber si los clientes que devolvieron en julio 2025 son clientes de alto valor o clientes ocasionales. Necesita la lista de clientes que cumplan dos condiciones al mismo tiempo: (1) tuvieron al menos una devolución en julio 2025, y (2) su revenue histórico total (suma de `quantity * unit_price` en todos sus pedidos) supera el promedio general de revenue por cliente.

Escribe una query que retorne nombre del cliente, email, país y revenue histórico total, solo para los clientes que cumplen ambas condiciones. Ordena por revenue histórico descendente.

**Tablas necesarias:** `customers`, `orders`, `order_items`, `returns`

**Resultado esperado:** Una lista potencialmente corta — son los clientes de alto valor que vivieron el spike de julio. Si está vacía, significa que el problema afectó principalmente a clientes ocasionales.

**Criterio de éxito:** Usas `EXISTS` para la condición de devolución en julio. Usas una subquery escalar o agrupación para calcular el revenue histórico por cliente. La comparación contra el promedio general usa otra subquery escalar.

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
SELECT
    p.name      AS producto,
    cat.name    AS categoria,
    p.price     AS precio
FROM products p
INNER JOIN categories cat ON cat.category_id = p.category_id
WHERE NOT EXISTS (
    SELECT 1
    FROM returns r
    WHERE r.product_id = p.product_id
      AND r.status IN ('approved', 'refunded')
)
ORDER BY p.price DESC;
```

Nota: la subquery correlaciona directamente por `product_id` porque `returns` tiene ese campo. No necesita pasar por `order_items`.

**Solución Ejercicio Intermedio:**
```sql
SELECT
    c.first_name || ' ' || c.last_name    AS nombre_cliente,
    c.email,
    c.country,
    ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue_historico
FROM customers c
INNER JOIN orders      o  ON o.customer_id = c.customer_id
INNER JOIN order_items oi ON oi.order_id   = o.order_id
WHERE EXISTS (
    -- condición 1: tuvo al menos una devolución en julio 2025
    SELECT 1
    FROM returns r
    INNER JOIN orders o2 ON o2.order_id = r.order_id
    WHERE o2.customer_id = c.customer_id
      AND r.returned_at >= '2025-07-01'
      AND r.returned_at <  '2025-08-01'
)
GROUP BY c.customer_id, c.first_name, c.last_name, c.email, c.country
HAVING SUM(oi.quantity * oi.unit_price) > (
    -- condición 2: revenue mayor al promedio general
    SELECT AVG(revenue_total)
    FROM (
        SELECT o3.customer_id,
               SUM(oi3.quantity * oi3.unit_price) AS revenue_total
        FROM orders o3
        INNER JOIN order_items oi3 ON oi3.order_id = o3.order_id
        GROUP BY o3.customer_id
    ) AS sub_revenue
)
ORDER BY revenue_historico DESC;
```

</details>

---

## 6. ERRORES COMUNES

**Error 1 — Subquery correlacionada que olvida la referencia a la tabla exterior**

```sql
-- INCORRECTO: la subquery calcula el AVG global, no el de la categoría de p
SELECT p.name, p.price
FROM products p
WHERE p.price > (
    SELECT AVG(price) FROM products WHERE is_active = TRUE
    -- falta: AND category_id = p.category_id
);
```

Error mental: olvidar que "promedio de la categoría" requiere que la subquery sepa en qué categoría está. Sin la correlación `category_id = p.category_id`, se compara contra el promedio global — un resultado silenciosamente incorrecto que no genera error, solo datos erróneos.

```sql
-- CORRECTO: la correlación es lo que hace la subquery "específica por fila"
WHERE p.price > (
    SELECT AVG(price)
    FROM products
    WHERE is_active = TRUE
      AND category_id = p.category_id   -- <-- correlación obligatoria
);
```

**Error 2 — Usar IN donde EXISTS es semánticamente más claro y eficiente**

```sql
-- FUNCIONA pero es menos intuitivo:
WHERE c.customer_id IN (
    SELECT o.customer_id
    FROM orders o
    INNER JOIN returns r ON r.order_id = o.order_id
    WHERE r.returned_at >= '2025-07-01'
      AND r.returned_at < '2025-08-01'
)

-- MÁS CLARO con EXISTS (intención explícita: "que tenga al menos una"):
WHERE EXISTS (
    SELECT 1
    FROM orders o
    INNER JOIN returns r ON r.order_id = o.order_id
    WHERE o.customer_id = c.customer_id
      AND r.returned_at >= '2025-07-01'
      AND r.returned_at < '2025-08-01'
)
```

El error no es técnico — ambas versiones pueden retornar el mismo resultado. El error es de legibilidad y mantenimiento: `IN` comunica "el ID está en este conjunto", mientras que `EXISTS` comunica "existe alguna relación que cumpla esta condición". Cuando la intención es verificar existencia, `EXISTS` es más preciso.

**Error 3 — NOT EXISTS vs. NOT IN con NULLs — el bug más peligroso**

```sql
-- PELIGROSO: si returns tiene alguna fila donde order_id lleva a un customer_id NULL,
-- toda la query retorna 0 filas (silenciosamente)
WHERE c.customer_id NOT IN (
    SELECT o.customer_id
    FROM orders o
    INNER JOIN returns r ON r.order_id = o.order_id
)

-- SEGURO: NOT EXISTS no tiene este problema
WHERE NOT EXISTS (
    SELECT 1
    FROM orders o
    INNER JOIN returns r ON r.order_id = o.order_id
    WHERE o.customer_id = c.customer_id
)
```

Por qué ocurre: si la subquery retorna un NULL entre sus valores, `NOT IN` evalúa todas las comparaciones como UNKNOWN (porque `valor = NULL` es siempre UNKNOWN en SQL), y una fila con UNKNOWN en el WHERE no pasa el filtro. El resultado es una query que retorna 0 filas aunque haya coincidencias válidas — sin ningún error ni advertencia.

**Error 4 — Subquery correlacionada en SELECT que retorna más de una fila**

```sql
-- INCORRECTO: si un cliente tiene múltiples devoluciones en julio, retorna N filas
SELECT
    c.customer_id,
    (SELECT r.returned_at
     FROM returns r
     INNER JOIN orders o ON o.order_id = r.order_id
     WHERE o.customer_id = c.customer_id
       AND r.returned_at >= '2025-07-01') AS fecha_devolucion
FROM customers c;
-- ERROR: more than one row returned by a subquery used as an expression
```

Una subquery correlacionada en el SELECT debe retornar exactamente un valor. Para obtener la primera fecha de devolución, agregar `ORDER BY r.returned_at LIMIT 1`. Para obtener el conteo, usar `COUNT(*)`.

```sql
-- CORRECTO: agrega una función de agregación o limita a 1
(SELECT MIN(r.returned_at)
 FROM returns r
 INNER JOIN orders o ON o.order_id = r.order_id
 WHERE o.customer_id = c.customer_id
   AND r.returned_at >= '2025-07-01') AS primera_devolucion_julio
```

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

Las subqueries correlacionadas resuelven el problema de comparar cada fila contra su propio grupo. Pero hay una clase de preguntas que no se puede responder fácilmente con subqueries simples: "¿qué clientes compraron en julio pero no en agosto?", "¿qué clientes están en la lista de devoluciones pero no en la lista de clientes premium?", "¿cuáles son los clientes que devolvieron Y siguieron comprando?".

Esas preguntas comparan conjuntos de clientes entre sí — no filas contra un valor calculado, sino listas completas de IDs contra otras listas. Para eso existe `UNION`, `INTERSECT` y `EXCEPT`: los operadores de conjuntos. Con ellos puedes combinar, intersectar y restar listas de clientes de distintas fuentes con una sintaxis simple y directa.
