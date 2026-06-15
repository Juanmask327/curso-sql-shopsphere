# Nivel 4 — Análisis de Clientes
## Lección 2: UNION, INTERSECT, EXCEPT — Operadores de conjuntos

> Tablas disponibles en este nivel: `customers`, `categories`, `products`, `orders`, `order_items`, `returns`

---

## 1. INTRODUCCIÓN CONCEPTUAL

### El problema de las dos listas

Sofía de Marketing te manda dos pedidos en un solo mensaje:

> *"Necesito la lista de clientes que compraron en Q3 2025. Y también los que compraron en Q4 2025. Pero en realidad lo que más me importa es: ¿quiénes compraron en Q3 pero NO volvieron en Q4? Esos son los que tengo que recuperar."*

Tienes tres preguntas distintas. Cada una requiere una query diferente. Pero el resultado final es siempre una lista de clientes — lo que cambia es cómo se relacionan esas listas entre sí.

Con los JOINs del Nivel 3 puedes combinar columnas de distintas tablas. Pero a veces el problema no es combinar columnas sino combinar filas de distintas queries. Quieres apilar dos listas. O encontrar lo que tienen en común. O restarle una a la otra.

Eso es exactamente lo que hacen los **operadores de conjuntos**:

- `UNION`: une dos listas en una sola — suma ambas
- `INTERSECT`: retorna solo lo que está en ambas listas — la intersección
- `EXCEPT`: retorna lo que está en la primera lista pero no en la segunda — la diferencia

La analogía con matemáticas de conjuntos es directa: si la Lista A son los clientes de Q3 y la Lista B son los de Q4, entonces:
- `A UNION B` = todos los que compraron en Q3 o Q4 (o ambos)
- `A INTERSECT B` = los que compraron en ambos trimestres (los retenidos)
- `A EXCEPT B` = los que compraron en Q3 pero no en Q4 (los perdidos)

---

## 2. SINTAXIS

### UNION — unir dos listas eliminando duplicados

```sql
SELECT columna1, columna2
FROM tabla_a
WHERE condicion_a

UNION

SELECT columna1, columna2
FROM tabla_b
WHERE condicion_b;
```

`UNION` elimina filas duplicadas del resultado combinado. Eso tiene un costo: el motor debe comparar todas las filas para detectar duplicados (equivalente a ejecutar un `DISTINCT` sobre el resultado completo).

### UNION ALL — unir dos listas conservando todos los duplicados

```sql
SELECT columna1, columna2
FROM tabla_a
WHERE condicion_a

UNION ALL

SELECT columna1, columna2
FROM tabla_b
WHERE condicion_b;
```

`UNION ALL` no elimina duplicados. Es más eficiente porque no necesita el paso de deduplicación. **Regla práctica:** usa `UNION ALL` por defecto. Cambia a `UNION` solo cuando realmente necesitas eliminar duplicados y has verificado que los habrá.

### INTERSECT — retornar solo lo que está en ambas queries

```sql
SELECT customer_id FROM tabla_a WHERE condicion_a

INTERSECT

SELECT customer_id FROM tabla_b WHERE condicion_b;
```

Retorna las filas que aparecen en el resultado de ambas queries. Equivale conceptualmente a un INNER JOIN entre los dos conjuntos de resultados, pero sobre filas completas en lugar de columnas clave.

### EXCEPT — retornar lo que está en la primera pero no en la segunda

```sql
SELECT customer_id FROM tabla_a WHERE condicion_a

EXCEPT

SELECT customer_id FROM tabla_b WHERE condicion_b;
```

Retorna las filas que están en el resultado de la primera query pero no en el de la segunda. El orden importa: `A EXCEPT B` no es lo mismo que `B EXCEPT A`.

### Reglas de compatibilidad — las tres que nunca se pueden romper

**Regla 1: Mismo número de columnas en ambas queries**
```sql
-- INCORRECTO: primera query tiene 3 columnas, segunda tiene 2
SELECT customer_id, first_name, last_name FROM customers
UNION
SELECT customer_id, email FROM customers;   -- ERROR
```

**Regla 2: Tipos de datos compatibles en cada posición**
```sql
-- INCORRECTO: posición 2 es VARCHAR en una query y DATE en la otra
SELECT customer_id, first_name FROM customers
UNION
SELECT customer_id, registered_at FROM customers;  -- ERROR de tipos
```

**Regla 3: Los nombres de columna del resultado vienen del primer SELECT**
```sql
-- El resultado tiene columnas "id" y "nombre" (del primer SELECT)
-- No importa cómo se llamen las columnas del segundo SELECT
SELECT customer_id AS id, first_name AS nombre FROM customers
UNION
SELECT order_id, status FROM orders;   -- el resultado usa "id" y "nombre"
```

### Orden de resultados con operadores de conjuntos

```sql
-- El ORDER BY va al final de todo, afecta al resultado combinado
SELECT customer_id, first_name FROM customers WHERE country = 'Colombia'
UNION
SELECT customer_id, first_name FROM customers WHERE country = 'Argentina'
ORDER BY first_name;   -- ordena el resultado combinado
```

No puedes poner `ORDER BY` dentro de cada query individual cuando usas operadores de conjuntos — solo al final.

---

## 3. EJEMPLO PRÁCTICO

### Contexto: Sofía analiza la retención de Q3 a Q4 2025

**Query 1 — La forma mínima: UNION ALL para consolidar dos segmentos geográficos**

A veces necesitas combinar dos listas de clientes de distintos países en una sola tabla. UNION ALL es la herramienta:

```sql
-- Clientes de Colombia y Argentina en una sola lista
SELECT
    customer_id,
    first_name || ' ' || last_name AS nombre,
    email,
    country,
    'Colombia' AS segmento
FROM customers
WHERE country = 'Colombia'

UNION ALL

SELECT
    customer_id,
    first_name || ' ' || last_name,
    email,
    country,
    'Argentina'
FROM customers
WHERE country = 'Argentina'

ORDER BY country, last_name;
```

Output (fragmento):

| customer_id | nombre | email | country | segmento |
|---|---|---|---|---|
| 43 | Camila Ríos | camila@email.com | Colombia | Colombia |
| 91 | Sebastián Morales | smorales@email.com | Colombia | Colombia |
| 12 | Laura García | lgarcia@email.com | Argentina | Argentina |

`UNION ALL` es correcto aquí porque no hay clientes que estén en ambos países — los duplicados son imposibles por definición del filtro.

**Query 2 — EXCEPT: clientes que compraron en Q3 2025 pero no en Q4 2025**

Esta es la respuesta al pedido principal de Sofía — la lista de clientes a recuperar:

```sql
-- Clientes que compraron en Q3 2025 (julio–septiembre)
SELECT DISTINCT o.customer_id
FROM orders o
WHERE o.ordered_at >= '2025-07-01'
  AND o.ordered_at <  '2025-10-01'
  AND o.status <> 'cancelled'

EXCEPT

-- Clientes que compraron en Q4 2025 (octubre–diciembre)
SELECT DISTINCT o.customer_id
FROM orders o
WHERE o.ordered_at >= '2025-10-01'
  AND o.ordered_at <  '2026-01-01'
  AND o.status <> 'cancelled';
```

Este resultado es una lista de `customer_id`. Para ver los datos completos de esos clientes, envuelve en una subquery:

```sql
SELECT
    c.customer_id,
    c.first_name,
    c.last_name,
    c.email,
    c.country
FROM customers c
WHERE c.customer_id IN (
    SELECT DISTINCT o.customer_id
    FROM orders o
    WHERE o.ordered_at >= '2025-07-01'
      AND o.ordered_at <  '2025-10-01'
      AND o.status <> 'cancelled'

    EXCEPT

    SELECT DISTINCT o.customer_id
    FROM orders o
    WHERE o.ordered_at >= '2025-10-01'
      AND o.ordered_at <  '2026-01-01'
      AND o.status <> 'cancelled'
)
ORDER BY c.country, c.last_name;
```

Output (fragmento):

| customer_id | first_name | last_name | email | country |
|---|---|---|---|---|
| 43 | Camila | Ríos | camila@email.com | Colombia |
| 78 | Diego | Paredes | dparedes@email.com | Mexico |
| 104 | Valentina | Cruz | vcruz@email.com | Colombia |

Sofía mira la lista: "Colombia aparece mucho. Tiene sentido — el spike de devoluciones de julio los habrá espantado."

**Query 3 — INTERSECT: clientes que compraron en Q3 Y en Q4 (los retenidos)**

```sql
SELECT
    c.customer_id,
    c.first_name,
    c.last_name,
    c.email,
    c.country
FROM customers c
WHERE c.customer_id IN (
    -- compraron en Q3 2025
    SELECT DISTINCT o.customer_id
    FROM orders o
    WHERE o.ordered_at >= '2025-07-01'
      AND o.ordered_at <  '2025-10-01'
      AND o.status <> 'cancelled'

    INTERSECT

    -- Y también compraron en Q4 2025
    SELECT DISTINCT o.customer_id
    FROM orders o
    WHERE o.ordered_at >= '2025-10-01'
      AND o.ordered_at <  '2026-01-01'
      AND o.status <> 'cancelled'
)
ORDER BY c.country, c.last_name;
```

**Query 4 — UNION: consolidar clientes de distintas fuentes con columna de origen**

Una técnica frecuente es agregar una columna que identifique la fuente de cada fila:

```sql
-- Clientes que devolvieron en julio 2025 (potencialmente insatisfechos)
SELECT
    c.customer_id,
    c.first_name || ' ' || c.last_name AS nombre,
    c.email,
    c.country,
    'devolucion_julio'                  AS segmento
FROM customers c
WHERE EXISTS (
    SELECT 1 FROM returns r
    INNER JOIN orders o ON o.order_id = r.order_id
    WHERE o.customer_id = c.customer_id
      AND r.returned_at >= '2025-07-01'
      AND r.returned_at <  '2025-08-01'
)

UNION ALL

-- Clientes sin ninguna compra en los últimos 6 meses (inactivos)
SELECT
    c.customer_id,
    c.first_name || ' ' || c.last_name,
    c.email,
    c.country,
    'inactivo_6m'
FROM customers c
WHERE NOT EXISTS (
    SELECT 1 FROM orders o
    WHERE o.customer_id = c.customer_id
      AND o.ordered_at >= '2025-12-01'
      AND o.status <> 'cancelled'
)
ORDER BY segmento, country;
```

Esta lista consolidada — con la columna `segmento` como etiqueta — alimenta directamente una campaña de re-engagement con mensajes diferenciados por tipo de cliente.

---

## 4. CASOS DE USO REALES

**Caso 1 — Análisis de retención y churn (EXCEPT)**
`EXCEPT` es la forma más directa de calcular el churn entre dos períodos: clientes del período anterior que no volvieron en el período actual. Sofía lo usa para diseñar campañas de recuperación. El equivalente de negocio es "¿cuántos clientes perdimos?".
*Rol que lo usa: Marketing Analyst, CRM Analyst, Growth Analyst.*

**Caso 2 — Comportamiento bimodal — clientes que compraron Y devolvieron (INTERSECT)**
`INTERSECT` identifica los clientes en la intersección de dos comportamientos: los que compraron Y también devolvieron. Son clientes en zona de riesgo que tuvieron una experiencia mixta. Marco quiere saber cuántos de ellos siguieron comprando después de la devolución — eso mide la resiliencia de la experiencia del cliente.
*Rol que lo usa: Data Analyst, Customer Experience Analyst.*

**Caso 3 — Consolidación de listas de distintas fuentes (UNION ALL)**
En entornos con múltiples bases de datos o sistemas de origen (CRM, e-commerce, tienda física), `UNION ALL` consolida datos del mismo tipo de distintas fuentes en una tabla unificada. Por ejemplo, clientes registrados en la web + clientes registrados en la app + clientes importados de un sistema legacy. `UNION ALL` (no `UNION`) porque la deduplicación se maneja aparte con una lógica de negocio explícita.
*Rol que lo usa: Data Engineer, Analytics Engineer.*

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico
**Contexto (Briefing 4.9):** Sofía está diseñando la campaña de recuperación para el primer semestre de 2026. Necesita la lista de clientes que compraron durante Q3 2025 (julio–septiembre) pero no volvieron a comprar en Q4 2025 (octubre–diciembre). Esos son el target principal.

Escribe una query que retorne `customer_id`, `first_name`, `last_name`, `email` y `country` de esos clientes. Excluye pedidos cancelados. Ordena por país y apellido.

**Tablas necesarias:** `customers`, `orders`

**Resultado esperado:** Lista de clientes que compraron en Q3 pero no en Q4. Si un cliente compró en Q3 y también en Q4, no debe aparecer.

**Criterio de éxito:** Usas `EXCEPT` entre dos subqueries de `orders` filtradas por período. Los pedidos cancelados están excluidos. El resultado está envuelto para mostrar datos de `customers`.

---

### Ejercicio Intermedio
**Contexto (Briefing 4.10 + 4.11):** Sofía quiere la foto completa de la retención. Necesita una sola tabla con: los clientes que compraron en Q3 y en Q4 (retenidos), y los que compraron en Q3 pero no en Q4 (perdidos). Cada fila debe indicar a qué segmento pertenece el cliente.

Escribe una query usando `UNION ALL` que combine ambos segmentos. La columna de segmento debe decir `'retenido'` o `'perdido'`. Ordena por segmento y luego por apellido.

**Tablas necesarias:** `customers`, `orders`

**Resultado esperado:** Una tabla con clientes etiquetados. Un mismo cliente no debe aparecer en ambos segmentos. La lógica de retención requiere que el cliente haya comprado en Q3 — los que solo compraron en Q4 no deben aparecer.

**Criterio de éxito:** Usas `UNION ALL`. Una rama usa `INTERSECT` internamente (retenidos), la otra usa `EXCEPT` (perdidos). La columna de segmento tiene valores constantes en cada rama.

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
SELECT
    c.customer_id,
    c.first_name,
    c.last_name,
    c.email,
    c.country
FROM customers c
WHERE c.customer_id IN (
    SELECT DISTINCT o.customer_id
    FROM orders o
    WHERE o.ordered_at >= '2025-07-01'
      AND o.ordered_at <  '2025-10-01'
      AND o.status <> 'cancelled'

    EXCEPT

    SELECT DISTINCT o.customer_id
    FROM orders o
    WHERE o.ordered_at >= '2025-10-01'
      AND o.ordered_at <  '2026-01-01'
      AND o.status <> 'cancelled'
)
ORDER BY c.country, c.last_name;
```

**Solución Ejercicio Intermedio:**
```sql
SELECT
    c.customer_id,
    c.first_name,
    c.last_name,
    c.email,
    c.country,
    'retenido' AS segmento
FROM customers c
WHERE c.customer_id IN (
    -- compró en Q3
    SELECT DISTINCT o.customer_id FROM orders o
    WHERE o.ordered_at >= '2025-07-01'
      AND o.ordered_at < '2025-10-01'
      AND o.status <> 'cancelled'
    INTERSECT
    -- y también en Q4
    SELECT DISTINCT o.customer_id FROM orders o
    WHERE o.ordered_at >= '2025-10-01'
      AND o.ordered_at < '2026-01-01'
      AND o.status <> 'cancelled'
)

UNION ALL

SELECT
    c.customer_id,
    c.first_name,
    c.last_name,
    c.email,
    c.country,
    'perdido' AS segmento
FROM customers c
WHERE c.customer_id IN (
    -- compró en Q3
    SELECT DISTINCT o.customer_id FROM orders o
    WHERE o.ordered_at >= '2025-07-01'
      AND o.ordered_at < '2025-10-01'
      AND o.status <> 'cancelled'
    EXCEPT
    -- pero no en Q4
    SELECT DISTINCT o.customer_id FROM orders o
    WHERE o.ordered_at >= '2025-10-01'
      AND o.ordered_at < '2026-01-01'
      AND o.status <> 'cancelled'
)

ORDER BY segmento, last_name;
```

Nota: usamos `UNION ALL` (no `UNION`) porque `retenido` y `perdido` son segmentos mutuamente excluyentes por construcción — no puede haber duplicados entre las dos ramas. `UNION ALL` evita el costo innecesario de deduplicación.

</details>

---

## 6. ERRORES COMUNES

**Error 1 — UNION cuando debería ser UNION ALL (o viceversa)**

```sql
-- INNECESARIAMENTE COSTOSO: UNION hace deduplicación aunque no haya duplicados posibles
SELECT customer_id, 'activo_q3' AS segmento
FROM orders
WHERE ordered_at >= '2025-07-01' AND ordered_at < '2025-10-01'
UNION
SELECT customer_id, 'activo_q4' AS segmento
FROM orders
WHERE ordered_at >= '2025-10-01' AND ordered_at < '2026-01-01';
-- UNION hace deduplicación aunque los dos conjuntos son disjuntos por construcción
-- (un pedido no puede ser de Q3 y Q4 al mismo tiempo) — es un costo innecesario
```

Error mental: asumir que `UNION` siempre es la opción correcta porque "suena más limpia". La deduplicación tiene un costo real en tablas grandes — es un sort implícito sobre todo el resultado combinado.

```sql
-- CORRECTO: si los conjuntos son disjuntos por construcción, usa UNION ALL
SELECT customer_id, 'activo_q3' AS segmento
FROM orders
WHERE ordered_at >= '2025-07-01' AND ordered_at < '2025-10-01'

UNION ALL

SELECT customer_id, 'activo_q4' AS segmento
FROM orders
WHERE ordered_at >= '2025-10-01' AND ordered_at < '2026-01-01';
-- UNION ALL no hace deduplicación — más eficiente y correcto cuando los conjuntos
-- son mutuamente excluyentes (Q3 y Q4 no se solapan).
```

**Error 2 — Número de columnas o tipos incompatibles entre las dos queries**

```sql
-- INCORRECTO: primera query tiene 3 columnas, segunda tiene 2
SELECT customer_id, first_name, email FROM customers
UNION
SELECT customer_id, last_name FROM customers;
-- ERROR: each UNION query must have the same number of columns
```

Error mental: pensar que SQL puede adivinar qué columnas corresponden a qué. No puede — el motor empareja columnas por posición, no por nombre.

```sql
-- CORRECTO: misma cantidad y tipos compatibles en cada posición
SELECT customer_id, first_name, email FROM customers
UNION
SELECT customer_id, last_name,  email FROM customers;
```

**Error 3 — Confundir el orden de EXCEPT (importa quién va primero)**

```sql
-- PREGUNTA: ¿qué clientes compraron en Q3 pero no en Q4?
-- CORRECTO: Q3 EXCEPT Q4
SELECT customer_id FROM orders WHERE ordered_at >= '2025-07-01' AND ordered_at < '2025-10-01'
EXCEPT
SELECT customer_id FROM orders WHERE ordered_at >= '2025-10-01' AND ordered_at < '2026-01-01';

-- INCORRECTO para esa pregunta: Q4 EXCEPT Q3 responde la pregunta inversa
-- (clientes de Q4 que no compraron en Q3)
SELECT customer_id FROM orders WHERE ordered_at >= '2025-10-01' AND ordered_at < '2026-01-01'
EXCEPT
SELECT customer_id FROM orders WHERE ordered_at >= '2025-07-01' AND ordered_at < '2025-10-01';
```

Error mental: pensar que `EXCEPT` es simétrico como `INTERSECT` o `UNION`. No lo es. `A EXCEPT B` ≠ `B EXCEPT A`.

**Error 4 — ORDER BY dentro de una rama del UNION en lugar de al final**

```sql
-- INCORRECTO: ORDER BY dentro de una rama individual
SELECT customer_id FROM orders WHERE ordered_at >= '2025-07-01' ORDER BY customer_id
UNION
SELECT customer_id FROM orders WHERE ordered_at >= '2025-10-01';
-- ERROR: syntax error at or near "UNION"
```

```sql
-- CORRECTO: ORDER BY al final, sobre el resultado combinado
SELECT customer_id FROM orders WHERE ordered_at >= '2025-07-01'
UNION
SELECT customer_id FROM orders WHERE ordered_at >= '2025-10-01'
ORDER BY customer_id;   -- aquí, al final de todo
```

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

Los operadores de conjuntos trabajan con listas — dan o quitan clientes en bloque. Pero hay un tipo de problema más fino: no si el cliente compró o devolvió, sino cómo manejar los registros donde esa información simplemente no está. Un cliente que no registró dirección. Una devolución sin motivo. Un producto sin precio configurado.

En SQL, la ausencia de información tiene una representación especial: `NULL`. Y `NULL` no se comporta como cualquier otro valor — no es igual a cero, no es igual a una cadena vacía, y no es igual a otro NULL. Esa rareza es la fuente de más bugs silenciosos en queries de producción que cualquier otro tema del nivel. La próxima lección te enseña a dominarlo.
