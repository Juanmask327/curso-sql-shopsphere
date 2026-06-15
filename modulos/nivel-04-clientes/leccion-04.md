# Nivel 4 — Análisis de Clientes
## Lección 4: La tabla returns — Análisis completo de devoluciones

> Tablas disponibles en este nivel: `customers`, `categories`, `products`, `orders`, `order_items`, `returns`

---

## 1. INTRODUCCIÓN CONCEPTUAL

### El análisis que nadie hizo en julio

En julio de 2025, la tasa de devolución de ShopSphere llegó al 8.3%. Diego resolvió el problema operativo en tres semanas — identificó al proveedor de calzado en Colombia, negoció, retiró las referencias. La crisis se cerró.

Pero las preguntas analíticas quedaron sin respuesta. ¿Fue realmente solo calzado? ¿Qué porcentaje del revenue total se perdió por reembolsos en ese trimestre? ¿Cuántos de los clientes afectados dejaron de comprar? ¿Cuáles siguen activos?

Esas preguntas no se responden con un JOIN. Requieren la combinación de todo lo que aprendiste en este nivel: subqueries correlacionadas para comparar productos dentro de su categoría, operadores de conjuntos para identificar clientes que estuvieron en ambos lados del problema, y manejo de NULLs para trabajar con los registros incompletos de devoluciones.

Esta lección es el análisis completo. Usas todas las tablas disponibles. Y al final, tienes la respuesta que el equipo de ShopSphere necesitaba desde hace seis meses.

### La tabla returns: estructura y relaciones

```sql
CREATE TABLE returns (
    return_id    INT PRIMARY KEY,
    order_id     INT REFERENCES orders(order_id),
    product_id   INT REFERENCES products(product_id),
    returned_at  DATE NOT NULL,
    reason       VARCHAR(200),        -- puede ser NULL: motivo no siempre registrado
    status       VARCHAR(20) CHECK (status IN ('pending','approved','rejected','refunded'))
);
```

**Puntos clave de diseño:**

`returns` referencia tanto `order_id` como `product_id` directamente. Esto permite consultar devoluciones de un pedido específico, de un producto específico, o de ambos simultáneamente. La relación con el cliente pasa por `orders` — no hay `customer_id` en `returns` porque una devolución es siempre sobre un pedido, y el pedido pertenece a un cliente.

`reason` puede ser NULL. Esto es intencional: el proceso de registro de devoluciones no siempre captura el motivo. Como vimos en la Lección 3, esto requiere `IS NULL` para filtrar y `COALESCE` para reportar.

`status` tiene cuatro estados que representan el ciclo de vida de una devolución:
- `pending`: registrada pero no procesada aún
- `approved`: aprobada — el producto fue aceptado de vuelta
- `rejected`: rechazada — el producto no cumplió condiciones de devolución
- `refunded`: el dinero fue devuelto al cliente (estado final positivo para el cliente)

**La relación returns ↔ order_items:**
Una devolución se relaciona con `order_items` por la combinación `(order_id, product_id)`. Un pedido puede tener múltiples ítems; una devolución es específica a un producto dentro de ese pedido.

```sql
-- Para obtener el monto devuelto, hay que cruzar con order_items:
SELECT r.return_id,
       oi.quantity * oi.unit_price AS monto_devuelto
FROM returns r
INNER JOIN order_items oi ON oi.order_id   = r.order_id
                          AND oi.product_id = r.product_id;
```

---

## 2. SINTAXIS

Esta lección no introduce nueva sintaxis — aplica las tres lecciones anteriores al análisis de devoluciones. Los patrones que verás son:

```sql
-- Patrón 1: tasa de devolución por categoría
--   COUNT(devoluciones) / COUNT(ventas) usando LEFT JOIN y NULLIF
COUNT(DISTINCT r.return_id) * 100.0 / NULLIF(COUNT(DISTINCT oi.item_id), 0)

-- Patrón 2: devoluciones sin motivo
WHERE r.reason IS NULL

-- Patrón 3: cliente devolvió pero siguió comprando (EXISTS correlacionado)
WHERE EXISTS (
    SELECT 1 FROM orders o2
    WHERE o2.customer_id = c.customer_id
      AND o2.ordered_at > (SELECT MAX(returned_at) FROM returns r2 ...)
)

-- Patrón 4: el "peor producto" de cada categoría
--   Subquery correlacionada que compara la tasa de cada producto contra el máximo de su categoría

-- Patrón 5: revenue perdido por reembolsos
--   LEFT JOIN returns con filtro en ON (no en WHERE)
```

---

## 3. EJEMPLO PRÁCTICO

### El análisis completo del spike de julio 2025

**Query 1 — Tasa de devolución por categoría en toda la historia**

```sql
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
INNER JOIN products    p  ON p.category_id  = cat.category_id
INNER JOIN order_items oi ON oi.product_id  = p.product_id
LEFT JOIN  returns     r  ON r.product_id   = p.product_id
                          AND r.order_id    = oi.order_id
GROUP BY cat.category_id, cat.name
ORDER BY tasa_devolucion_pct DESC NULLS LAST;
```

Output:

| categoria | items_vendidos | items_devueltos | tasa_devolucion_pct |
|---|---|---|---|
| Calzado | 1240 | 189 | 15.24 |
| Ropa | 3890 | 287 | 7.38 |
| Tecnología | 4210 | 183 | 4.35 |
| Hogar | 2780 | 89 | 3.20 |
| Libros | 890 | 12 | 1.35 |

La hipótesis se confirma cuantitativamente: Calzado tiene una tasa más del doble que la segunda categoría. No fue una impresión — es un patrón estadístico significativo.

**Query 2 — El spike de julio: devoluciones por categoría en julio 2025 vs. histórico**

```sql
SELECT
    cat.name                                         AS categoria,
    -- tasa histórica (excluyendo julio 2025)
    ROUND(
        SUM(CASE WHEN r.returned_at IS NOT NULL
                  AND (r.returned_at < '2025-07-01' OR r.returned_at >= '2025-08-01')
                 THEN 1 ELSE 0 END) * 100.0
        / NULLIF(COUNT(DISTINCT oi.item_id), 0),
        2
    )                                                AS tasa_historica_pct,
    -- tasa julio 2025 únicamente
    ROUND(
        SUM(CASE WHEN r.returned_at >= '2025-07-01'
                  AND r.returned_at <  '2025-08-01'
                 THEN 1 ELSE 0 END) * 100.0
        / NULLIF(
            COUNT(DISTINCT CASE
                WHEN o.ordered_at >= '2025-07-01'
                 AND o.ordered_at  <  '2025-08-01'
                THEN oi.item_id END),
            0
        ),
        2
    )                                                AS tasa_julio_2025_pct
FROM categories cat
INNER JOIN products    p  ON p.category_id  = cat.category_id
INNER JOIN order_items oi ON oi.product_id  = p.product_id
INNER JOIN orders      o  ON o.order_id     = oi.order_id
LEFT JOIN  returns     r  ON r.product_id   = p.product_id
                          AND r.order_id    = oi.order_id
GROUP BY cat.category_id, cat.name
ORDER BY tasa_julio_2025_pct DESC NULLS LAST;
```

Output:

| categoria | tasa_historica_pct | tasa_julio_2025_pct |
|---|---|---|
| Calzado | 6.20 | 28.40 |
| Ropa | 7.10 | 8.90 |
| Tecnología | 4.20 | 4.50 |
| Hogar | 3.15 | 3.30 |
| Libros | 1.30 | 1.40 |

El resultado es definitivo: Calzado pasa del 6.2% histórico al 28.4% en julio — un incremento de 22 puntos porcentuales. Ropa sube levemente (1.8 pp), el resto no se mueve significativamente. El problema fue específicamente calzado en julio.

**Query 3 — Devoluciones sin razón registrada: ¿quiénes son?**

```sql
SELECT
    r.return_id,
    r.order_id,
    r.product_id,
    p.name                                           AS nombre_producto,
    cat.name                                         AS categoria,
    r.returned_at,
    r.status,
    o.customer_id,
    c.first_name || ' ' || c.last_name               AS cliente,
    c.country
FROM returns r
INNER JOIN orders     o   ON o.order_id    = r.order_id
INNER JOIN customers  c   ON c.customer_id = o.customer_id
INNER JOIN products   p   ON p.product_id  = r.product_id
INNER JOIN categories cat ON cat.category_id = p.category_id
WHERE r.reason IS NULL
ORDER BY r.returned_at DESC;
```

Output (fragmento):

| return_id | nombre_producto | categoria | returned_at | status | cliente | country |
|---|---|---|---|---|---|---|
| 312 | Zapatilla Runner Pro | Calzado | 2025-07-28 | pending | Camila Ríos | Colombia |
| 287 | Zapatilla Runner Pro | Calzado | 2025-07-22 | approved | Diego Morales | Colombia |
| 241 | Bota Urbana Flex | Calzado | 2025-07-15 | refunded | Ana Torres | Colombia |

El patrón narrativo cierra: la mayoría de los registros sin motivo son de calzado, en Colombia, en julio. Son parte del mismo evento — los clientes devolvieron rápido sin completar el formulario.

**Query 4 — Clientes que devolvieron Y siguieron comprando (resiliencia post-devolución)**

Esta query responde la pregunta de Marco: "¿Cuántos clientes que devolvieron algo volvieron a comprar después?"

```sql
SELECT
    c.customer_id,
    c.first_name || ' ' || c.last_name    AS cliente,
    c.email,
    c.country,
    MAX(r.returned_at)                    AS ultima_devolucion,
    COUNT(DISTINCT r.return_id)           AS total_devoluciones,
    COUNT(DISTINCT o2.order_id)           AS pedidos_posteriores
FROM customers c
INNER JOIN orders  o  ON o.customer_id  = c.customer_id
INNER JOIN returns r  ON r.order_id     = o.order_id
INNER JOIN orders  o2 ON o2.customer_id = c.customer_id
                      AND o2.ordered_at > r.returned_at   -- pedidos DESPUÉS de devolver
                      AND o2.status    <> 'cancelled'
GROUP BY c.customer_id, c.first_name, c.last_name, c.email, c.country
HAVING COUNT(DISTINCT r.return_id) > 0
   AND COUNT(DISTINCT o2.order_id) > 0
ORDER BY pedidos_posteriores DESC, c.last_name;
```

Output (fragmento):

| cliente | country | ultima_devolucion | total_devoluciones | pedidos_posteriores |
|---|---|---|---|---|
| Carlos Mendoza | México | 2025-07-18 | 1 | 8 |
| Laura González | Argentina | 2025-07-22 | 1 | 5 |
| Sofía Ramírez | Colombia | 2025-07-29 | 2 | 3 |

Marco ve el resultado: "Hay clientes de alto valor que devolvieron y siguieron comprando. Esos son los que la marca retuvo a pesar del problema. Hay que cuidarlos."

**Query 5 — El "peor producto" de cada categoría por tasa de devolución**

Subquery correlacionada para detectar el producto con mayor tasa de devolución dentro de su categoría:

```sql
-- Primero: calculamos la tasa de devolución por producto
WITH tasa_por_producto AS (
    SELECT
        p.product_id,
        p.name                                          AS nombre_producto,
        p.category_id,
        cat.name                                        AS categoria,
        COUNT(DISTINCT oi.item_id)                      AS vendidos,
        COUNT(DISTINCT r.return_id)                     AS devueltos,
        COUNT(DISTINCT r.return_id) * 100.0
        / NULLIF(COUNT(DISTINCT oi.item_id), 0)         AS tasa_devolucion
    FROM products p
    INNER JOIN categories  cat ON cat.category_id = p.category_id
    INNER JOIN order_items oi  ON oi.product_id   = p.product_id
    LEFT JOIN  returns     r   ON r.product_id    = p.product_id
                               AND r.order_id     = oi.order_id
    GROUP BY p.product_id, p.name, p.category_id, cat.name
    HAVING COUNT(DISTINCT oi.item_id) >= 10   -- mínimo de ventas para ser relevante
)
-- Segundo: para cada categoría, solo el producto con la tasa más alta
SELECT
    t.categoria,
    t.nombre_producto,
    t.vendidos,
    t.devueltos,
    ROUND(t.tasa_devolucion, 2) AS tasa_devolucion_pct
FROM tasa_por_producto t
WHERE t.tasa_devolucion = (
    SELECT MAX(t2.tasa_devolucion)
    FROM tasa_por_producto t2
    WHERE t2.category_id = t.category_id   -- correlación: misma categoría
)
ORDER BY t.tasa_devolucion DESC;
```

Output:

| categoria | nombre_producto | vendidos | devueltos | tasa_devolucion_pct |
|---|---|---|---|---|
| Calzado | Zapatilla Runner Pro | 340 | 127 | 37.35 |
| Ropa | Camisa Slim Fit L | 189 | 28 | 14.81 |
| Tecnología | Auriculares BT Genéricos | 95 | 8 | 8.42 |
| Hogar | Lámpara LED Regulable | 112 | 7 | 6.25 |

"Zapatilla Runner Pro" tiene el 37% de devolución. Es el producto que Diego retiró. Los demás productos problemáticos de otras categorías tienen tasas más manejables — son candidatos a revisión de calidad, no emergencias.

Nota: esta query usa un CTE (`WITH ... AS`) que aprenderás formalmente en el Nivel 5. Aquí se introduce como anticipo porque simplifica significativamente la legibilidad comparado con la alternativa de subquery anidada. Lo importante por ahora es entender la lógica de la subquery correlacionada en el WHERE final.

---

## 4. CASOS DE USO REALES

**Caso 1 — Revenue perdido por reembolsos (análisis financiero trimestral)**
Finance necesita saber cuánto dinero "entró" en ventas pero luego "salió" por reembolsos. Esta métrica — revenue neto vs. revenue bruto — es crítica para el P&L de una empresa de e-commerce. La query cruza `order_items` (para el precio de cada ítem) con `returns` (filtrada por `status = 'refunded'`), y generalmente se presenta por categoría y período.
*Rol que lo usa: Finance Analyst, CFO, Data Analyst.*

**Caso 2 — Tasa de devolución como KPI de calidad de producto**
El equipo de producto monitorea la tasa de devolución por SKU como un indicador de calidad. Un producto con tasa superior al umbral de categoría (definido por la empresa) entra en revisión automática. Este análisis requiere comparar cada producto contra su propio grupo — el patrón de subquery correlacionada de la Lección 1.
*Rol que lo usa: Product Manager, Quality Analyst, Data Analyst.*

**Caso 3 — Análisis de resiliencia post-devolución (impacto en LTV)**
Una devolución no siempre significa pérdida del cliente. El análisis de "¿cuántos clientes volvieron a comprar después de devolver?" mide la capacidad de recuperación de la marca. Si el número es alto, el proceso de devolución es percibido como justo y el cliente mantiene la confianza. Si es bajo, hay un problema de experiencia que hay que atender.
*Rol que lo usa: Customer Experience Analyst, CRM Analyst, Retention Manager.*

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico
**Contexto (Briefing 4.1):** Diego necesita revisar qué clientes tuvieron devoluciones en julio 2025. Quiere una lista con nombre del cliente, email, país y la cantidad de devoluciones que registró ese mes. Solo los que devolvieron algo — no el universo completo de clientes.

Escribe la query que responda este pedido. Ordena por cantidad de devoluciones descendente, luego por apellido.

**Tablas necesarias:** `customers`, `orders`, `returns`

**Resultado esperado:** Una fila por cliente que devolvió en julio 2025. Los clientes sin devoluciones en ese mes no deben aparecer. La columna de conteo refleja la cantidad de devoluciones (no de pedidos).

**Criterio de éxito:** Filtras por `returned_at` en julio 2025. Agrupas por cliente. El JOIN pasa por `orders` para llegar al `customer_id`. Ordenas correctamente.

---

### Ejercicio Integrador
**Contexto (Briefing 4.8):** Ana de Finanzas analiza el riesgo financiero de las devoluciones. Necesita identificar pedidos donde el valor total de los ítems devueltos con `status = 'refunded'` representa más del 80% del valor total del pedido.

Para cada caso: `order_id`, fecha del pedido, nombre del cliente, valor total del pedido, valor devuelto y el porcentaje que representa. Si el porcentaje supera el 100%, señálalo con una columna adicional que diga `'ERROR: revisar registro'`; de lo contrario, dejarlo en NULL. Ordena por porcentaje descendente.

**Tablas necesarias:** `customers`, `orders`, `order_items`, `returns`

**Resultado esperado:** Pedidos con alto porcentaje de devolución reembolsada. La columna de alerta identifica los casos potencialmente erróneos (>100%).

**Criterio de éxito:** Calculas el valor total del pedido con `SUM(quantity * unit_price)` de `order_items`. Calculas el valor devuelto con el mismo cálculo pero filtrado a ítems con devolución `'refunded'`. El porcentaje usa `NULLIF` en el denominador. La columna de alerta usa `CASE WHEN`. Filtras HAVING el porcentaje > 80.

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
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
```

**Solución Ejercicio Integrador:**
```sql
SELECT
    o.order_id,
    o.ordered_at                                          AS fecha_pedido,
    c.first_name || ' ' || c.last_name                   AS cliente,
    ROUND(SUM(oi.quantity * oi.unit_price), 2)           AS valor_total_pedido,
    ROUND(
        SUM(
            CASE WHEN r.status = 'refunded'
                 THEN oi.quantity * oi.unit_price
                 ELSE 0 END
        ), 2
    )                                                     AS valor_devuelto,
    ROUND(
        SUM(CASE WHEN r.status = 'refunded'
                 THEN oi.quantity * oi.unit_price
                 ELSE 0 END)
        * 100.0
        / NULLIF(SUM(oi.quantity * oi.unit_price), 0),
        2
    )                                                     AS pct_devuelto,
    CASE
        WHEN SUM(CASE WHEN r.status = 'refunded'
                      THEN oi.quantity * oi.unit_price
                      ELSE 0 END)
             > SUM(oi.quantity * oi.unit_price)
        THEN 'ERROR: revisar registro'
    END                                                   AS alerta
FROM orders o
INNER JOIN customers  c  ON c.customer_id = o.customer_id
INNER JOIN order_items oi ON oi.order_id  = o.order_id
LEFT JOIN  returns    r  ON r.order_id    = oi.order_id
                         AND r.product_id  = oi.product_id
                         AND r.status      = 'refunded'
GROUP BY o.order_id, o.ordered_at, c.first_name, c.last_name
HAVING
    SUM(CASE WHEN r.status = 'refunded'
             THEN oi.quantity * oi.unit_price
             ELSE 0 END)
    > 0.8 * SUM(oi.quantity * oi.unit_price)
ORDER BY pct_devuelto DESC;
```

Nota sobre el HAVING: el filtro del 80% se aplica sobre el valor calculado (suma condicional), no sobre una columna simple. Por eso se repite la expresión en HAVING en lugar de usar el alias `pct_devuelto` — la mayoría de motores SQL no permiten referenciar alias del SELECT en el HAVING (aunque PostgreSQL sí lo soporta en algunos casos). La forma explícita es más portable.

</details>

---

## 6. ERRORES COMUNES

**Error 1 — Confundir la relación entre returns y customers (pasa por orders)**

```sql
-- INCORRECTO: returns no tiene customer_id directamente
SELECT c.first_name, r.returned_at
FROM customers c
INNER JOIN returns r ON r.customer_id = c.customer_id;   -- columna que no existe
-- ERROR: column r.customer_id does not exist
```

La relación es: `customers` → `orders` (por `customer_id`) → `returns` (por `order_id`). Para llegar de devoluciones a clientes siempre hay que pasar por `orders`.

```sql
-- CORRECTO:
FROM customers c
INNER JOIN orders  o ON o.customer_id = c.customer_id
INNER JOIN returns r ON r.order_id    = o.order_id
```

**Error 2 — Calcular el monto devuelto desde returns sin cruzar con order_items**

```sql
-- INCORRECTO: returns no tiene el precio unitario
SELECT r.order_id, SUM(r.unit_price * r.quantity) AS monto_devuelto
FROM returns r;
-- ERROR: column r.unit_price does not exist
```

`returns` no tiene precio ni cantidad — tiene `order_id` y `product_id`. El precio y la cantidad están en `order_items`. Para calcular el monto devuelto hay que hacer el JOIN:

```sql
-- CORRECTO:
SELECT r.order_id,
       SUM(oi.quantity * oi.unit_price) AS monto_devuelto
FROM returns r
INNER JOIN order_items oi ON oi.order_id   = r.order_id
                          AND oi.product_id = r.product_id
WHERE r.status = 'refunded'
GROUP BY r.order_id;
```

**Error 3 — Poner el filtro de status en WHERE en lugar del ON cuando se usa LEFT JOIN**

```sql
-- INCORRECTO: las categorías sin reembolsos desaparecen del resultado
SELECT cat.name, COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS reembolsado
FROM categories cat
INNER JOIN products    p  ON p.category_id = cat.category_id
INNER JOIN order_items oi ON oi.product_id = p.product_id
LEFT JOIN  returns     r  ON r.product_id  = p.product_id
                          AND r.order_id   = oi.order_id
WHERE r.status = 'refunded'   -- <-- aquí el problema
GROUP BY cat.name;
```

Con el filtro en el WHERE, las filas donde `r.status IS NULL` (categorías sin reembolsos) son eliminadas — el LEFT JOIN se convierte efectivamente en INNER JOIN. Ver la solución en la Lección 3, Error 3.

**Error 4 — Doble conteo al JOIN con returns cuando un ítem tiene múltiples devoluciones**

En un dataset real, un mismo `(order_id, product_id)` podría tener más de un registro en `returns` (por ejemplo, una devolución rechazada y luego otra aprobada del mismo ítem). Al hacer JOIN sin agregación previa, el ítem se cuenta múltiples veces:

```sql
-- POTENCIALMENTE INCORRECTO: si hay 2 returns para el mismo order_item,
-- la fila de order_items aparece 2 veces y el revenue se duplica
SELECT SUM(oi.quantity * oi.unit_price)
FROM order_items oi
INNER JOIN returns r ON r.order_id   = oi.order_id
                     AND r.product_id = oi.product_id;
-- Si oi tiene $100 y tiene 2 registros en returns, SUM retorna $200
```

```sql
-- CORRECTO: contar devoluciones independientemente con COUNT(DISTINCT)
--           o agregar returns antes de hacer el JOIN
SELECT COUNT(DISTINCT oi.item_id) AS items_vendidos,
       COUNT(DISTINCT r.return_id) AS items_devueltos
FROM order_items oi
LEFT JOIN returns r ON r.order_id   = oi.order_id
                    AND r.product_id = oi.product_id;
-- COUNT(DISTINCT) elimina el doble conteo
```

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

Terminaste el Nivel 4. Ahora puedes comparar filas dentro de grupos, comparar listas de clientes entre períodos, manejar valores faltantes y analizar devoluciones con toda su complejidad relacional.

El límite que empieza a hacerse visible es la legibilidad: cuando una query tiene tres subqueries anidadas, más un EXISTS, más un LEFT JOIN con filtros en el ON, es difícil de leer y de mantener. El Nivel 5 resuelve eso con dos herramientas que transforman el código SQL de difícil a elegante: los **CTEs** (Common Table Expressions con `WITH`) para nombrar y encadenar pasos intermedios, y las **Window Functions** para calcular rankings, acumulados y comparaciones sin romper la granularidad de las filas. Son las herramientas que distinguen un SQL competente de un SQL profesional.
