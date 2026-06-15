# Nivel 4 — Análisis de Clientes
## Lección 3: Manejo de NULLs — La ausencia de valor

> Tablas disponibles en este nivel: `customers`, `categories`, `products`, `orders`, `order_items`, `returns`

---

## 1. INTRODUCCIÓN CONCEPTUAL

### El valor que no es ningún valor

Diego abre el panel de devoluciones y te escribe:

> *"Hay registros donde el motivo está vacío. ¿Cuántos son? ¿Y cuáles son esos pedidos?"*

Abres la tabla `returns`. El campo `reason` existe. Pero algunas filas no tienen nada en ese campo. No un espacio en blanco, no un guión, no el texto "sin motivo" — literalmente nada. Ese nada tiene un nombre en SQL: `NULL`.

`NULL` es la representación de la ausencia de valor. No es cero (`0`). No es una cadena vacía (`''`). No es `FALSE`. Es la declaración de que ese dato no existe, no fue registrado o es desconocido. Y ese detalle cambia completamente cómo tienes que tratarlo en tus queries.

**La regla que lo explica todo:** cualquier comparación con `NULL` retorna `NULL` (no `TRUE`, no `FALSE` — `NULL`). Eso incluye `NULL = NULL`, que no es `TRUE`. Es `NULL`. Esto se llama la lógica de tres valores de SQL: TRUE, FALSE y NULL (o UNKNOWN).

```sql
SELECT NULL = NULL;    -- resultado: NULL  (no TRUE)
SELECT NULL = 0;       -- resultado: NULL  (no FALSE)
SELECT NULL = '';      -- resultado: NULL  (no FALSE)
SELECT NULL IS NULL;   -- resultado: TRUE  (única forma correcta de comparar)
```

Esto tiene consecuencias concretas en cada parte de una query:
- En `WHERE`: las filas con `NULL` en la condición no pasan el filtro
- En `COUNT`: `COUNT(columna)` ignora los NULLs; `COUNT(*)` los cuenta igual
- En `SUM` y `AVG`: los NULLs se ignoran silenciosamente
- En `GROUP BY`: los NULLs se agrupan juntos (como si fueran una categoría propia)
- En `JOIN`: un LEFT JOIN donde la columna del lado derecho es `NULL` indica "sin coincidencia"

---

## 2. SINTAXIS

### IS NULL / IS NOT NULL — la única forma correcta de comparar con NULL

```sql
-- Buscar filas donde reason es NULL
WHERE reason IS NULL

-- Buscar filas donde reason tiene algún valor
WHERE reason IS NOT NULL
```

`= NULL` nunca funciona como filtro. `IS NULL` e `IS NOT NULL` son los únicos operadores que evalúan la presencia o ausencia de NULL correctamente.

### COALESCE — retornar el primer valor no-NULL de una lista

```sql
COALESCE(expresion1, expresion2, expresion3, ...)
```

Evalúa las expresiones de izquierda a derecha y retorna el primero que no sea NULL. Si todas son NULL, retorna NULL.

```sql
-- Valor por defecto cuando reason es NULL
SELECT COALESCE(reason, 'Sin motivo registrado') AS motivo

-- Múltiples alternativas
SELECT COALESCE(phone, mobile, 'Sin teléfono') AS contacto
```

### NULLIF — retornar NULL si dos valores son iguales

```sql
NULLIF(expresion1, expresion2)
```

Retorna NULL si `expresion1 = expresion2`. En cualquier otro caso, retorna `expresion1`. El uso más frecuente es evitar la división por cero:

```sql
-- Sin NULLIF: si total_pedidos = 0, produce ERROR: division by zero
revenue / total_pedidos

-- Con NULLIF: si total_pedidos = 0, el resultado es NULL en lugar de error
revenue / NULLIF(total_pedidos, 0)
```

### COUNT y el comportamiento de NULLs en agregaciones

```sql
-- COUNT(*): cuenta todas las filas, incluyendo las que tienen NULLs en cualquier columna
COUNT(*)

-- COUNT(columna): cuenta solo las filas donde esa columna no es NULL
COUNT(reason)   -- cuenta solo devoluciones que tienen motivo registrado

-- Diferencia entre ambas en la misma tabla:
SELECT
    COUNT(*)           AS total_devoluciones,
    COUNT(reason)      AS con_motivo_registrado,
    COUNT(*) - COUNT(reason) AS sin_motivo
FROM returns;
```

### CASE WHEN y NULLs — el ELSE implícito

```sql
-- Un CASE sin ELSE retorna NULL cuando ninguna condición es verdadera
SELECT
    CASE
        WHEN status = 'approved' THEN 'Aprobada'
        WHEN status = 'refunded' THEN 'Reembolsada'
        -- no hay ELSE: si status = 'pending' o 'rejected', el resultado es NULL
    END AS estado_legible
FROM returns;

-- Con ELSE explícito: nunca retorna NULL
SELECT
    CASE
        WHEN status = 'approved' THEN 'Aprobada'
        WHEN status = 'refunded' THEN 'Reembolsada'
        ELSE 'Otro'    -- cubre 'pending', 'rejected' y cualquier valor inesperado
    END AS estado_legible
FROM returns;
```

### NULL en JOIN — qué significa una columna NULL en un LEFT JOIN

```sql
-- Si un cliente no tiene devoluciones, r.return_id será NULL en un LEFT JOIN
SELECT
    c.customer_id,
    c.first_name,
    r.return_id,        -- NULL si no hay devolución
    r.reason            -- NULL si no hay devolución
FROM customers c
LEFT JOIN returns r ON r.order_id IN (
    SELECT order_id FROM orders WHERE customer_id = c.customer_id
);

-- Para identificar los clientes SIN devoluciones:
WHERE r.return_id IS NULL
```

**Nota sobre el patrón anterior:** El `ON r.order_id IN (subquery)` funciona, pero no es el patrón canónico. Mezcla lógica de JOIN con lógica de filtrado de subquery, lo que puede confundir y generar planes de ejecución subóptimos en algunos motores. El patrón estándar para este caso es el doble LEFT JOIN:

```sql
-- PATRÓN CANÓNICO (preferido): doble LEFT JOIN encadenado
SELECT
    c.customer_id,
    c.first_name,
    r.return_id,
    r.reason
FROM customers c
LEFT JOIN orders  o ON o.customer_id = c.customer_id
LEFT JOIN returns r ON r.order_id    = o.order_id;

-- Para clientes SIN devoluciones:
WHERE r.return_id IS NULL
```

El doble LEFT JOIN es más legible, más explícito sobre la cadena de relaciones, y es lo que verás en código de producción.

---

## 3. EJEMPLO PRÁCTICO

### Contexto: Diego audita los registros de devoluciones incompletos

**Query 1 — La forma mínima: encontrar devoluciones sin motivo registrado**

```sql
SELECT
    r.return_id,
    r.order_id,
    r.product_id,
    r.returned_at,
    r.status
FROM returns r
WHERE r.reason IS NULL
ORDER BY r.returned_at DESC;
```

Output (fragmento):

| return_id | order_id | product_id | returned_at | status |
|---|---|---|---|---|
| 312 | 8934 | 47 | 2025-07-28 | pending |
| 287 | 8801 | 47 | 2025-07-22 | approved |
| 241 | 8654 | 23 | 2025-07-15 | refunded |

Diego nota que el `product_id` 47 aparece varias veces. Y todas son de julio. El proveedor problemático.

**Query 2 — COALESCE para reemplazar NULLs en el reporte**

```sql
SELECT
    r.return_id,
    r.returned_at,
    COALESCE(r.reason, 'Sin motivo registrado')  AS motivo,
    r.status,
    COUNT(*) OVER ()                              AS total_devoluciones
FROM returns r
ORDER BY r.returned_at DESC
LIMIT 10;
```

Output (fragmento):

| return_id | returned_at | motivo | status |
|---|---|---|---|
| 312 | 2025-07-28 | Sin motivo registrado | pending |
| 311 | 2025-07-27 | Producto defectuoso | approved |
| 308 | 2025-07-25 | Sin motivo registrado | pending |
| 305 | 2025-07-24 | Talla incorrecta | refunded |

Con `COALESCE`, el reporte es legible para cualquier persona del equipo — no aparecen celdas vacías que puedan interpretarse como errores de visualización.

**Query 3 — COUNT(*) vs COUNT(columna) para auditoría de completitud**

```sql
SELECT
    COUNT(*)                          AS total_devoluciones,
    COUNT(r.reason)                   AS con_motivo,
    COUNT(*) - COUNT(r.reason)        AS sin_motivo,
    ROUND(
        100.0 * (COUNT(*) - COUNT(r.reason)) / NULLIF(COUNT(*), 0),
        1
    )                                 AS pct_sin_motivo
FROM returns r;
```

Output:

| total_devoluciones | con_motivo | sin_motivo | pct_sin_motivo |
|---|---|---|---|
| 847 | 692 | 155 | 18.3 |

Diego: "El 18.3% de las devoluciones no tiene motivo registrado. Eso es un problema de proceso — el formulario de devolución debería obligar el campo."

Nótese `NULLIF(COUNT(*), 0)` en el denominador: aunque `COUNT(*)` no puede ser cero mientras haya filas, el patrón `NULLIF(denominador, 0)` es una práctica defensiva que protege contra el error de división por cero en tablas que podrían estar vacías en otros contextos.

**Query 4 — NULLIF para evitar división por cero en tasa de devolución por categoría**

```sql
SELECT
    cat.name                          AS categoria,
    COUNT(DISTINCT oi.item_id)        AS items_vendidos,
    COUNT(DISTINCT r.return_id)       AS items_devueltos,
    ROUND(
        100.0 * COUNT(DISTINCT r.return_id)
               / NULLIF(COUNT(DISTINCT oi.item_id), 0),
        2
    )                                 AS tasa_devolucion_pct
FROM categories cat
INNER JOIN products p    ON p.category_id  = cat.category_id
INNER JOIN order_items oi ON oi.product_id = p.product_id
LEFT JOIN returns r      ON r.product_id   = p.product_id
GROUP BY cat.category_id, cat.name
ORDER BY tasa_devolucion_pct DESC NULLS LAST;
```

Output (fragmento):

| categoria | items_vendidos | items_devueltos | tasa_devolucion_pct |
|---|---|---|---|
| Calzado | 1240 | 189 | 15.24 |
| Ropa | 3890 | 287 | 7.38 |
| Tecnología | 4210 | 183 | 4.35 |
| Libros | 890 | 12 | 1.35 |

El patrón es claro: Calzado tiene una tasa de devolución más del doble que cualquier otra categoría. Esto confirma la hipótesis del proveedor de julio.

**Query 5 — NULL en CASE WHEN y el ELSE implícito que causa confusión**

```sql
-- VERSIÓN CON BUG SILENCIOSO: sin ELSE
SELECT
    r.return_id,
    CASE
        WHEN r.status = 'approved' THEN 'Devolución válida'
        WHEN r.status = 'refunded' THEN 'Reembolso completado'
        -- 'pending' y 'rejected' no tienen WHEN — retornan NULL
    END AS descripcion_estado
FROM returns r;

-- VERSIÓN CORRECTA: con ELSE explícito
SELECT
    r.return_id,
    CASE
        WHEN r.status = 'approved' THEN 'Devolución válida'
        WHEN r.status = 'refunded' THEN 'Reembolso completado'
        WHEN r.status = 'pending'  THEN 'Pendiente de revisión'
        WHEN r.status = 'rejected' THEN 'Devolución rechazada'
        ELSE 'Estado desconocido'   -- captura cualquier valor inesperado
    END AS descripcion_estado
FROM returns r;
```

---

## 4. CASOS DE USO REALES

**Caso 1 — Auditoría de completitud de datos (el uso más frecuente de IS NULL)**
Antes de cualquier análisis de negocio, un analista verifica qué campos tienen NULLs y en qué proporción. `COUNT(*) - COUNT(columna)` es la fórmula estándar para detectar completitud. Es la primera query que corre un analista sobre una tabla nueva.
*Rol que lo usa: Data Analyst, Data Engineer, Analytics Engineer.*

**Caso 2 — Valores por defecto en reportes con COALESCE**
Los dashboards y reportes tienen que ser legibles por personas que no son técnicas. `COALESCE(valor, 'N/D')` convierte NULLs en texto significativo. En reportes de ventas: `COALESCE(discount_code, 'Sin descuento')`. En reportes de clientes: `COALESCE(phone, 'No registrado')`.
*Rol que lo usa: Data Analyst, BI Developer.*

**Caso 3 — Denominadores seguros con NULLIF (prevención de errores en producción)**
Cualquier cálculo de tasa, porcentaje o promedio tiene un denominador. En datos reales, ese denominador puede ser cero en subcategorías o segmentos pequeños. `NULLIF(denominador, 0)` convierte el error de "division by zero" (que detiene la query) en un NULL (que es manejable). Es una práctica obligatoria en código que va a producción.
*Rol que lo usa: Data Analyst, Data Engineer, Backend Developer.*

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico
**Contexto (Briefing 4.2):** Diego está auditando el proceso de devoluciones. Necesita la lista completa de devoluciones donde el motivo no fue registrado, más el total de esos registros.

Escribe una query que retorne `return_id`, `order_id`, `product_id`, `returned_at` y `status` de las devoluciones con `reason IS NULL`. Ordena de más reciente a más antigua. Incluye también el conteo total de esas devoluciones (puedes usar una segunda query o una subquery escalar en el SELECT).

**Tablas necesarias:** `returns`

**Resultado esperado:** Las filas de devoluciones sin motivo, ordenadas descendente por fecha. Si no hay ninguna, 0 filas (resultado válido).

**Criterio de éxito:** Usas `IS NULL` (no `= NULL`). El orden es correcto. La query no retorna devoluciones que sí tienen motivo registrado.

---

### Ejercicio Intermedio
**Contexto (Briefing 4.7):** Ana de Finanzas necesita calcular el revenue perdido por devoluciones reembolsadas en Q3 2025 (julio–septiembre), por categoría de producto. Las categorías sin ningún reembolso en ese período deben aparecer con valor cero — no deben desaparecer del resultado.

Escribe la query que retorne: categoría, revenue_reembolsado_q3. Usa `COALESCE` para mostrar cero en las categorías sin reembolsos. Usa `NULLIF` en algún cálculo de ratio si corresponde. Ordena por revenue reembolsado descendente.

**Tablas necesarias:** `categories`, `products`, `order_items`, `returns`

**Resultado esperado:** Todas las categorías del catálogo, con su revenue reembolsado en Q3 2025. Las que no tuvieron reembolsos muestran 0.00.

**Criterio de éxito:** Todas las categorías aparecen en el resultado. Los NULLs están reemplazados por cero. El filtro de fecha y status es correcto. Usas LEFT JOIN para preservar las categorías sin reembolsos.

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
SELECT
    r.return_id,
    r.order_id,
    r.product_id,
    r.returned_at,
    r.status,
    (SELECT COUNT(*) FROM returns WHERE reason IS NULL) AS total_sin_motivo
FROM returns r
WHERE r.reason IS NULL
ORDER BY r.returned_at DESC;
```

Alternativa con dos queries separadas:
```sql
-- Query 1: conteo total
SELECT COUNT(*) AS total_sin_motivo FROM returns WHERE reason IS NULL;

-- Query 2: detalle
SELECT return_id, order_id, product_id, returned_at, status
FROM returns
WHERE reason IS NULL
ORDER BY returned_at DESC;
```

**Solución Ejercicio Intermedio:**
```sql
SELECT
    cat.name                                               AS categoria,
    ROUND(
        SUM(CASE WHEN r.return_id IS NOT NULL
                 THEN oi.quantity * oi.unit_price
                 ELSE 0
            END),
        2
    )                                                      AS revenue_reembolsado_q3
FROM categories cat
INNER JOIN products p ON p.category_id = cat.category_id
LEFT JOIN order_items oi ON oi.product_id = p.product_id
LEFT JOIN returns r ON r.product_id = p.product_id
                    AND r.order_id   = oi.order_id
                    AND r.status     = 'refunded'
                    AND r.returned_at >= '2025-07-01'
                    AND r.returned_at <  '2025-10-01'
GROUP BY cat.category_id, cat.name
ORDER BY revenue_reembolsado_q3 DESC;
```

Nota: el filtro de `r.status` y de fecha va en el `ON` del LEFT JOIN (no en el WHERE). Si fuera en el WHERE, las categorías sin reembolsos serían excluidas (porque `r.status IS NULL` cuando no hay match, y `NULL = 'refunded'` es FALSE). Al ponerlo en el ON, las categorías sin reembolsos siguen apareciendo — con NULL en las columnas de `returns`.

El `CASE WHEN r.return_id IS NOT NULL` es la clave: para las categorías sin devoluciones, el LEFT JOIN produce `r.return_id = NULL`, y el CASE devuelve 0. Sin esta condición, `SUM(oi.quantity * oi.unit_price)` sumaría el revenue total de ventas de esa categoría (todas las filas de order_items), no el revenue reembolsado — un número que parece plausible pero es numéricamente falso.

</details>

---

## 6. ERRORES COMUNES

**Error 1 — Comparar con NULL usando = en lugar de IS NULL**

```sql
-- INCORRECTO: siempre retorna 0 filas (NULL = NULL es NULL, no TRUE)
SELECT * FROM returns WHERE reason = NULL;

-- INCORRECTO: también 0 filas (NULL <> NULL es NULL, no TRUE)
SELECT * FROM returns WHERE reason <> NULL;

-- CORRECTO:
SELECT * FROM returns WHERE reason IS NULL;
SELECT * FROM returns WHERE reason IS NOT NULL;
```

Error mental: tratar NULL como un valor normal que se puede comparar con `=`. NULL es la ausencia de valor — no puede ser "igual" a nada porque no tiene valor con qué compararse.

**Error 2 — COUNT(*) vs COUNT(columna) — el conteo silenciosamente incorrecto**

```sql
-- Si hay 847 devoluciones y 155 no tienen reason:
SELECT COUNT(reason)  FROM returns;   -- retorna 692 (ignora NULLs)
SELECT COUNT(*)       FROM returns;   -- retorna 847 (cuenta todas las filas)

-- Error típico: usar COUNT(reason) cuando querías el total de devoluciones
-- El resultado parece plausible pero está subestimado en 155
```

Error mental: asumir que `COUNT(columna)` cuenta filas. Cuenta valores no-NULL de esa columna. Para contar filas siempre, usa `COUNT(*)`.

**Error 3 — Filtro en WHERE que excluye las filas NULL en un LEFT JOIN**

```sql
-- INCORRECTO: el WHERE convierte el LEFT JOIN en INNER JOIN para la categoría 'Ropa'
SELECT cat.name, COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS revenue
FROM categories cat
LEFT JOIN products p ON p.category_id = cat.category_id
LEFT JOIN order_items oi ON oi.product_id = p.product_id
LEFT JOIN returns r ON r.product_id = p.product_id
WHERE r.status = 'refunded'         -- <-- aquí está el error
  AND r.returned_at >= '2025-07-01'
GROUP BY cat.name;
-- Las categorías sin reembolsos tienen r.status = NULL → NULL = 'refunded' → FALSE → desaparecen
```

```sql
-- CORRECTO: el filtro va en el ON del LEFT JOIN
LEFT JOIN returns r ON r.product_id  = p.product_id
                    AND r.status     = 'refunded'
                    AND r.returned_at >= '2025-07-01'
-- Ahora las categorías sin reembolsos tienen NULL en las columnas de returns
-- pero siguen apareciendo en el resultado, y COALESCE las muestra como 0
```

**Error 4 — Olvidar el ELSE en un CASE WHEN y no detectar los NULLs resultantes**

```sql
-- QUERY que parece correcta pero silenciosamente produce NULLs en algunas filas:
SELECT
    return_id,
    CASE
        WHEN status = 'approved' THEN 1
        WHEN status = 'refunded' THEN 1
        -- 'pending' y 'rejected' retornan NULL — no 0
    END AS es_exitosa
FROM returns;

-- Si luego haces SUM(es_exitosa), los NULLs se ignoran — correcto
-- Pero si haces AVG(es_exitosa), el denominador excluye las filas NULL
-- (AVG solo sobre approved + refunded, no sobre el total)
-- Esto puede producir una tasa artificialmente alta

-- CORRECTO: siempre usar ELSE
    CASE
        WHEN status IN ('approved', 'refunded') THEN 1
        ELSE 0
    END AS es_exitosa
-- Ahora SUM da el total de exitosas y AVG da la tasa real sobre todas las filas
```

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

Ya tienes las tres herramientas del análisis de clientes: subqueries correlacionadas para comparar filas contra su grupo, operadores de conjuntos para comparar listas de clientes, y el manejo de NULLs para trabajar con datos incompletos del mundo real.

La última lección del nivel combina todo esto con la tabla nueva: `returns`. Es el análisis completo que el equipo de ShopSphere necesitaba desde julio — las tasas de devolución por categoría, los productos problemáticos, los clientes afectados y si volvieron a comprar. Es la primera vez en el curso que usas todas las tablas disponibles en un análisis narrativo completo.
