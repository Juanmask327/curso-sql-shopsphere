# Nivel 8 — SQL Profesional
## Lección 2: EXPLAIN QUERY PLAN e índices — por qué una query es lenta y cómo arreglarla

> Tablas disponibles en este nivel: `customers`, `categories`, `products`, `orders`, `order_items`, `returns`, `inventory`, `marketing_campaigns`, `website_sessions`, `payments`

---

## 1. INTRODUCCIÓN CONCEPTUAL

### El problema de Valentina

Valentina envía un mensaje en Slack a las 9:15 de la mañana:

> *"La query que cruza orders con payments filtrando por fecha y país está tardando 45 segundos. La corrí con EXPLAIN ANALYZE y vi un Seq Scan sobre payments con filter — no hay índice en order_id ni en paid_at. Necesito que identifiques qué columnas justifican un índice y los crees."*

45 segundos para una query de análisis financiero es demasiado. El equipo de BI del fondo chileno ya está conectado al sistema. Si un analista ejecuta esa query en Power BI, el dashboard muestra una rueda girando durante casi un minuto antes de cargar. Con el crecimiento proyectado de ShopSphere — pasando de 31.000 a 10 millones de registros en 18 meses — esa query tardaría horas sin intervención.

El SQL no está mal. La lógica es correcta. El problema es que la base de datos está haciendo su trabajo de la manera más ineficiente posible: revisando cada fila de la tabla de 31.000 registros una por una para encontrar las que cumplen el filtro. Eso se llama un **Sequential Scan** (Seq Scan en PostgreSQL, SCAN en SQLite).

La solución son los **índices** — estructuras de datos que permiten a la base de datos saltar directamente a las filas que necesita, como el índice de un libro que te dice en qué página está cada tema en lugar de obligarte a leer todo el libro desde el principio.

### Analogía: el índice de un libro

Imagina una biblioteca con 31.000 libros sin sistema de organización. Para encontrar todos los libros de un autor específico, tendrías que revisar cada libro uno por uno. Eso es un Seq Scan.

Ahora imagina que la biblioteca tiene un catálogo organizado por autor. Para encontrar los libros de un autor, vas directo al catálogo, buscas el apellido, y el catálogo te dice exactamente qué estantes revisar. Eso es un Index Scan.

Los índices en SQL funcionan igual: son una estructura auxiliar (normalmente un árbol B+ ordenado) que permite a la base de datos encontrar filas por el valor de una columna sin recorrer toda la tabla.

### Lo que EXPLAIN te dice

`EXPLAIN QUERY PLAN` (en SQLite) y `EXPLAIN ANALYZE` (en PostgreSQL) te muestran el **plan de ejecución** de una query: qué pasos sigue la base de datos para responderla, en qué orden, y qué estructuras usa. Es la herramienta de diagnóstico fundamental para cualquier problema de performance.

**Nota importante sobre dialectos:**
- En **SQLite** (el Playground): `EXPLAIN QUERY PLAN <query>`
- En **PostgreSQL** (producción): `EXPLAIN <query>` o `EXPLAIN ANALYZE <query>` (ANALYZE ejecuta la query y muestra tiempos reales)
- Las dos herramientas muestran conceptos similares con sintaxis diferente — en esta lección usamos la sintaxis de SQLite para el Playground, con notas sobre las diferencias

---

## 2. SINTAXIS

### EXPLAIN QUERY PLAN en SQLite

```sql
EXPLAIN QUERY PLAN
SELECT ...
FROM ...
WHERE ...;
```

El resultado es una tabla con columnas `id`, `parent`, `notused` y `detail`. La columna `detail` es la que lees para entender el plan.

### Los dos patrones que debes reconocer

**SCAN (Seq Scan en PostgreSQL):**
```
SCAN payments
```
La base de datos revisó cada fila de `payments`. Si `payments` tiene 31.000 filas, revisó 31.000 filas. Cuando ves SCAN en una tabla grande en el WHERE o JOIN de una query filtrada, hay un problema de performance que un índice puede resolver.

**SEARCH usando índice:**
```
SEARCH payments USING INDEX idx_payments_order_id (order_id=?)
```
La base de datos usó un índice para encontrar directamente las filas que necesitaba. En lugar de revisar 31.000 filas, revisó quizás 50 (las que tienen el order_id buscado). Eso es órdenes de magnitud más rápido.

### Crear un índice

```sql
-- Forma básica: índice en una columna
CREATE INDEX idx_payments_order_id ON payments(order_id);

-- Con IF NOT EXISTS para evitar error si el índice ya existe
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at);

-- Índice compuesto: más de una columna
-- Útil cuando el WHERE filtra por varias columnas juntas
CREATE INDEX IF NOT EXISTS idx_payments_status_paid_at ON payments(status, paid_at);

-- Índice parcial: solo indexa filas que cumplen una condición
-- Más eficiente que un índice general cuando el patrón de consulta es específico
CREATE INDEX IF NOT EXISTS idx_payments_failed
    ON payments(order_id, paid_at)
    WHERE status = 'failed';
```

### Convenciones de nomenclatura

El prefijo `idx_` seguido de `tabla_columna(s)` es la convención estándar. Un nombre descriptivo evita confusiones cuando hay docenas de índices en producción.

### Anti-patrones que matan la performance

Antes de llegar a los índices, hay errores de escritura de queries que impiden que los índices existentes se usen. Debes reconocerlos y eliminarlos:

**Anti-patrón 1 — Función en la columna del WHERE:**
```sql
-- INCORRECTO: la función STRFTIME impide el uso del índice en paid_at
WHERE STRFTIME('%Y', paid_at) = '2026'

-- CORRECTO: rango de fechas que permite usar el índice
WHERE paid_at >= '2026-01-01'
  AND paid_at <  '2027-01-01'
```

Cuando aplicas una función a una columna en el WHERE, la base de datos no puede usar el índice de esa columna — tendría que calcular la función para cada fila y luego comparar. El rango de fechas explícito permite el Index Scan.

**Anti-patrón 2 — Subquery correlacionada en SELECT:**
```sql
-- INCORRECTO: esta subquery se ejecuta una vez por cada fila del resultado externo
-- Si hay 500 clientes, se ejecuta 500 veces
SELECT
    customer_id,
    (SELECT SUM(amount)
     FROM payments p
     WHERE p.order_id IN (
         SELECT order_id FROM orders o WHERE o.customer_id = c.customer_id
     )) AS total_pagado
FROM customers c;

-- CORRECTO: un solo JOIN calcula todo en un pase
SELECT
    c.customer_id,
    COALESCE(SUM(p.amount), 0)  AS total_pagado
FROM customers c
LEFT JOIN orders o    ON o.customer_id = c.customer_id
LEFT JOIN payments p  ON p.order_id    = o.order_id
                      AND p.status     = 'completed'
GROUP BY c.customer_id;
```

**Anti-patrón 3 — NOT IN con posibles NULLs:**
```sql
-- PELIGROSO: si algún order_id en payments es NULL,
-- la comparación NOT IN con NULL devuelve NULL (no TRUE ni FALSE)
-- El resultado puede ser una tabla vacía cuando esperas filas
WHERE order_id NOT IN (SELECT order_id FROM payments WHERE status = 'failed')

-- CORRECTO: NOT EXISTS maneja NULLs correctamente
WHERE NOT EXISTS (
    SELECT 1 FROM payments p
    WHERE p.order_id = o.order_id
      AND p.status   = 'failed'
)
```

---

## 3. EJEMPLO PRÁCTICO

### Contexto: la query de revenue tarda 45 segundos

Valentina pide diagnosticar y optimizar la query de revenue que cruza `payments`, `orders` y `customers`.

**Fase 1 — Ver el plan de ejecución actual (sin índices)**

```sql
-- Paso 1: ver el plan ANTES de crear índices
EXPLAIN QUERY PLAN
SELECT
    c.country,
    SUM(p.amount)  AS revenue_bruto
FROM payments p
INNER JOIN orders o    ON o.order_id    = p.order_id
INNER JOIN customers c ON c.customer_id = o.customer_id
WHERE p.paid_at  >= '2026-01-01'
  AND p.paid_at  <  '2026-04-01'
  AND p.status   = 'completed'
GROUP BY c.country;
```

Output típico en SQLite sin índices en payments:
```
id  parent  detail
--  ------  ---------------------------------------------------------------
2   0       SCAN payments                          ← problema: revisa todo
3   0       SEARCH orders USING INTEGER PRIMARY KEY (rowid=?)
4   0       SEARCH customers USING INTEGER PRIMARY KEY (rowid=?)
```

El `SCAN payments` sin ninguna restricción de índice es la fuente del problema. La base de datos revisa los 31.000 registros de payments para encontrar los que cumplen el filtro de `paid_at` y `status`. Los JOINs con `orders` y `customers` son eficientes porque usan las claves primarias (que siempre tienen índice automático).

**Fase 2 — Identificar qué columnas necesitan índice**

La pregunta es: ¿qué columnas están en el WHERE o en los JOINs de payments?

```
WHERE p.paid_at >= '2026-01-01'  → columna: paid_at  (búsqueda por rango)
  AND p.paid_at <  '2026-04-01'  → columna: paid_at  (misma)
  AND p.status  = 'completed'    → columna: status    (búsqueda exacta)
JOIN orders o ON o.order_id = p.order_id  → columna: order_id (JOIN)
```

Las tres candidatas son `paid_at`, `status` y `order_id`. El razonamiento para priorizar:

- `order_id` en payments es clave foránea que se usa en todos los JOINs con orders — siempre útil, alta prioridad
- `paid_at` es una columna de rango con alta cardinalidad (muchos valores distintos) — un índice de rango es muy selectivo, alta prioridad
- `status` solo tiene 4 valores posibles — baja cardinalidad, un índice en status solo ayuda cuando filtramos un status muy minoritario

**Fase 3 — Crear los índices**

```sql
-- Índice en order_id: acelera todos los JOINs payments → orders
CREATE INDEX IF NOT EXISTS idx_payments_order_id
    ON payments(order_id);

-- Índice en paid_at: acelera todos los filtros por período
CREATE INDEX IF NOT EXISTS idx_payments_paid_at
    ON payments(paid_at);
```

**Fase 4 — Verificar el plan después de crear los índices**

```sql
-- Mismo EXPLAIN, misma query, después de crear los índices
EXPLAIN QUERY PLAN
SELECT
    c.country,
    SUM(p.amount)  AS revenue_bruto
FROM payments p
INNER JOIN orders o    ON o.order_id    = p.order_id
INNER JOIN customers c ON c.customer_id = o.customer_id
WHERE p.paid_at  >= '2026-01-01'
  AND p.paid_at  <  '2026-04-01'
  AND p.status   = 'completed'
GROUP BY c.country;
```

Output esperado después de crear los índices:
```
id  parent  detail
--  ------  ----------------------------------------------------------------
2   0       SEARCH payments USING INDEX idx_payments_paid_at (paid_at>? AND paid_at<?)
3   0       SEARCH orders USING INTEGER PRIMARY KEY (rowid=?)
4   0       SEARCH customers USING INTEGER PRIMARY KEY (rowid=?)
```

El `SCAN payments` se convirtió en `SEARCH payments USING INDEX`. La base de datos ya no revisa 31.000 filas — salta directamente a las filas de payments donde `paid_at` está en el rango de Q1 2026.

### El índice parcial para la anomalía de Chile

Valentina tiene un request adicional: Ana va a ejecutar el análisis de pagos fallidos de Chile repetidamente durante varias semanas. Un índice parcial optimiza específicamente ese patrón:

```sql
-- Un índice parcial indexa SOLO las filas que cumplen la condición WHERE
-- Es más eficiente que un índice general en status porque:
-- (a) ocupa menos espacio: solo indexa las filas donde status='failed'
--     (aproximadamente 20% del total si la tasa de fallo es 20%)
-- (b) para la consulta específica de Ana (pagos fallidos), el índice
--     es extremadamente selectivo — filtra inmediatamente el 80% de filas
-- (c) un índice general en status tiene baja cardinalidad (4 valores posibles)
--     y sería menos útil para el optimizador

CREATE INDEX IF NOT EXISTS idx_payments_failed
    ON payments(order_id, paid_at)
    WHERE status = 'failed';
```

**Nota sobre compatibilidad:** Los índices parciales con `WHERE` son compatibles con PostgreSQL y SQLite. MySQL no soporta índices parciales — en ese dialecto, la alternativa es una tabla particionada o un índice general con baja selectividad.

---

## 4. CASOS DE USO REALES

**Caso 1 — Optimización de dashboards en producción (Data Engineer, DBA)**
Los dashboards de BI se refrescan automáticamente cada 15-30 minutos. Si las queries base tardan 45 segundos, el dashboard tarda 45 segundos en cargar. Los índices bien elegidos son la primera intervención antes de considerar cachés, pre-agregaciones o réplicas de lectura.

**Caso 2 — Diagnóstico de queries lentas en reporte (Data Analyst, Senior)**
Un analista senior no solo escribe queries — también diagnostica por qué las queries de otros son lentas. EXPLAIN es la herramienta central de ese diagnóstico. Saber leer un plan de ejecución y distinguir un SCAN evitable de uno inevitable es una habilidad diferenciadora en equipos de datos.

**Caso 3 — Revisión de queries antes de deploy (Backend Engineer)**
Antes de hacer merge de una feature que agrega una nueva query a la aplicación, el equipo revisa el plan de ejecución esperado. Si la query tiene un SCAN sobre una tabla de millones de filas, bloquea el merge hasta que se añade el índice correspondiente. Es parte del proceso estándar de code review en equipos maduros.

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico
**Contexto (Briefing 8.5 — Valentina Torres):** Valentina pide que ejecutes `EXPLAIN QUERY PLAN` sobre la query de revenue neto que cruza `payments`, `orders` y `customers` filtrada por Q1 2026 y `status = 'completed'`. Luego crea los índices necesarios en `payments` y vuelve a ejecutar el EXPLAIN para confirmar que el plan cambió.

Escribe los tres bloques:
1. `EXPLAIN QUERY PLAN` de la query de revenue antes de crear índices
2. Los `CREATE INDEX` que justificas con base en el plan
3. `EXPLAIN QUERY PLAN` de la misma query después de crear los índices

Para cada índice que crees, incluye un comentario de una línea explicando por qué esa columna específica.

**Resultado esperado:** El plan antes debe mostrar `SCAN payments`. El plan después debe mostrar `SEARCH payments USING INDEX`. Los comentarios explican el razonamiento, no solo el resultado.

**Criterio de éxito:** Tres bloques bien estructurados. Al menos dos índices creados con justificación. El EXPLAIN post-índice muestra un SEARCH en lugar de SCAN.

---

### Ejercicio Intermedio
**Contexto:** Una query del Nivel 5 calcula el revenue total de cada cliente usando una subquery correlacionada en el SELECT. Reescríbela usando LEFT JOIN para eliminar el anti-patrón.

Query original (lenta):
```sql
SELECT
    c.customer_id,
    c.first_name || ' ' || c.last_name    AS nombre,
    (
        SELECT COALESCE(SUM(p.amount), 0)
        FROM payments p
        INNER JOIN orders o ON o.order_id = p.order_id
        WHERE o.customer_id = c.customer_id
          AND p.status = 'completed'
    )                                     AS total_pagado
FROM customers c
ORDER BY total_pagado DESC
LIMIT 10;
```

Reescribe esta query usando JOINs en lugar de la subquery correlacionada. El resultado debe ser idéntico: `customer_id`, `nombre` y `total_pagado` (redondeado a 2 decimales), ORDER BY total_pagado DESC, LIMIT 10.

**Criterio de éxito:** Sin subquery correlacionada en el SELECT. LEFT JOIN de customers → orders → payments. COALESCE para clientes sin pagos. GROUP BY en customer_id y nombre. Mismo resultado que la versión original.

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
-- FASE 1: plan de ejecución sin índices en payments
EXPLAIN QUERY PLAN
SELECT
    c.country,
    ROUND(SUM(p.amount), 2)    AS revenue_bruto
FROM payments p
INNER JOIN orders o    ON o.order_id    = p.order_id
INNER JOIN customers c ON c.customer_id = o.customer_id
WHERE p.paid_at >= '2026-01-01'
  AND p.paid_at <  '2026-04-01'
  AND p.status  = 'completed'
GROUP BY c.country;
-- Resultado esperado: SCAN payments (revisa toda la tabla)

-- FASE 2: crear los índices justificados
-- paid_at: columna de rango con alta cardinalidad, usada en todos los filtros de período
CREATE INDEX IF NOT EXISTS idx_payments_paid_at
    ON payments(paid_at);

-- order_id: clave foránea usada en todos los JOINs payments → orders
CREATE INDEX IF NOT EXISTS idx_payments_order_id
    ON payments(order_id);

-- FASE 3: plan de ejecución después de crear los índices
EXPLAIN QUERY PLAN
SELECT
    c.country,
    ROUND(SUM(p.amount), 2)    AS revenue_bruto
FROM payments p
INNER JOIN orders o    ON o.order_id    = p.order_id
INNER JOIN customers c ON c.customer_id = o.customer_id
WHERE p.paid_at >= '2026-01-01'
  AND p.paid_at <  '2026-04-01'
  AND p.status  = 'completed'
GROUP BY c.country;
-- Resultado esperado: SEARCH payments USING INDEX idx_payments_paid_at
```

**Solución Ejercicio Intermedio:**
```sql
-- Versión optimizada: subquery correlacionada → LEFT JOIN
SELECT
    c.customer_id,
    c.first_name || ' ' || c.last_name             AS nombre,
    ROUND(COALESCE(SUM(p.amount), 0), 2)            AS total_pagado
FROM customers c
LEFT JOIN orders o    ON o.customer_id = c.customer_id
LEFT JOIN payments p  ON p.order_id    = o.order_id
                      AND p.status     = 'completed'
GROUP BY c.customer_id, c.first_name, c.last_name
ORDER BY total_pagado DESC
LIMIT 10;
```

</details>

---

## 6. ERRORES COMUNES

**Error 1 — Crear un índice en una columna de baja cardinalidad y esperar mejora significativa**

```sql
-- POCO ÚTIL: status solo tiene 4 valores posibles
-- El optimizador puede preferir un Seq Scan sobre un índice que elimina
-- solo el 25% de las filas (si los 4 valores están distribuidos por igual)
CREATE INDEX idx_payments_status ON payments(status);

-- MEJOR: si el caso de uso es siempre buscar 'failed' o 'completed'
-- un índice parcial es más selectivo y más compacto
CREATE INDEX idx_payments_failed ON payments(order_id) WHERE status = 'failed';
```

Error mental: creer que más índices siempre es mejor. Los índices tienen costo de escritura (cada INSERT y UPDATE actualiza los índices). Un índice de baja cardinalidad puede no compensar ese costo.

**Error 2 — Aplicar función a columna indexada en el WHERE**

```sql
-- INCORRECTO: el índice en paid_at no se usa porque hay una función en la columna
WHERE STRFTIME('%Y-%m', paid_at) = '2026-01'

-- CORRECTO: rango explícito que sí permite usar el índice
WHERE paid_at >= '2026-01-01'
  AND paid_at <  '2026-02-01'
```

Error mental: pensar que la base de datos es lo suficientemente inteligente para "ver a través" de la función. No lo es — si la columna tiene una función aplicada, el índice sobre esa columna no aplica.

**Error 3 — Confundir EXPLAIN con EXPLAIN ANALYZE en PostgreSQL**

```sql
-- EXPLAIN: muestra el plan estimado sin ejecutar la query (rápido, sin efecto secundario)
EXPLAIN SELECT ...;

-- EXPLAIN ANALYZE: ejecuta la query Y muestra el plan con tiempos reales
-- Útil para comparar estimaciones vs. realidad
-- ADVERTENCIA: si es un UPDATE o DELETE, lo ejecuta de verdad
EXPLAIN ANALYZE SELECT ...;
```

Error mental: usar EXPLAIN ANALYZE en una query de modificación de datos sin darse cuenta de que ejecuta el cambio. En el Playground de SQLite esto no aplica (`EXPLAIN QUERY PLAN` no ejecuta la query), pero en PostgreSQL de producción hay que tener cuidado.

**Error 4 — Asumir que el índice se usará automáticamente**

Los índices no se usan automáticamente en todos los casos. El optimizador puede elegir ignorar un índice si estima que un Seq Scan es más eficiente (por ejemplo, si el filtro es poco selectivo y va a retornar el 80% de las filas de todas formas). Ver un SCAN en el plan después de crear un índice no siempre es un problema — puede ser la decisión correcta del optimizador.

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

Ahora sabes hacer queries rápidas. Pero Valentina tiene un problema diferente: cuando actualizan el stock en `inventory` y registran el pedido en `orders`, a veces el sistema falla entre las dos operaciones. El resultado es un estado inconsistente — el pedido quedó registrado pero el stock no se descontó, o al revés.

Un índice no puede ayudar con eso. La solución es una **transacción**: un bloque de SQL que garantiza que múltiples operaciones se ejecutan todas juntas o no se ejecuta ninguna. Si el sistema falla en el medio, la base de datos deshace automáticamente todo lo que ya había hecho. Eso es lo que aprenderás en la próxima lección.
