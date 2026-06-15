# Nivel 8 — SQL Profesional
## Lección 3: Transacciones — atomicidad y consistencia de datos

> Tablas disponibles en este nivel: `customers`, `categories`, `products`, `orders`, `order_items`, `returns`, `inventory`, `marketing_campaigns`, `website_sessions`, `payments`

---

## 1. INTRODUCCIÓN CONCEPTUAL

### El problema de Diego

Diego Morales envía un email que empieza con "Tenemos un problema que necesito resolver antes de que escale":

> *"Cuando se registra un pedido, hay dos operaciones que deben suceder juntas: se descuenta el stock del producto en `inventory` y se inserta el registro en `orders`. Si el sistema falla entre las dos operaciones — lo que ya pasó dos veces este año — queda el pedido registrado pero sin descuento de stock, o el stock descontado pero sin pedido."*

Dos veces este año el sistema quedó en un estado inconsistente. Alguien vendió un producto sin stock. Alguien descontó stock de un pedido que nunca existió. Los dos estados son incorrectos y difíciles de detectar porque no hay un error visible — la base de datos simplemente tiene datos que no reflejan la realidad.

El problema de Diego no es un problema de SQL — es un problema de **atomicidad**: la garantía de que un conjunto de operaciones se ejecuta en su totalidad o no se ejecuta en absoluto. No existe un estado intermedio observable.

Las **transacciones** son la herramienta que da esa garantía.

### Las propiedades ACID para un analista de datos

ACID es el acrónimo de las cuatro propiedades que garantizan la fiabilidad de las transacciones en bases de datos relacionales. Como analista, lo que te interesa entender de forma práctica:

**Atomicidad (Atomicity):** O todas las operaciones de la transacción se completan, o ninguna. Si hay un error en el paso 3 de 5, los pasos 1 y 2 se deshacen automáticamente. Los datos vuelven al estado anterior como si nada hubiera ocurrido.

**Consistencia (Consistency):** Una transacción lleva la base de datos de un estado válido a otro estado válido. Las restricciones (PRIMARY KEY, FOREIGN KEY, CHECK) se verifican al hacer COMMIT — si alguna falla, la transacción se rechaza.

**Aislamiento (Isolation):** Dos transacciones concurrentes no se ven mutuamente hasta que hacen COMMIT. Si dos analistas ejecutan queries al mismo tiempo, cada uno ve un snapshot consistente de los datos.

**Durabilidad (Durability):** Una vez que la transacción hace COMMIT, los cambios persisten aunque el servidor se caiga inmediatamente después. La base de datos escribe en disco antes de confirmar el éxito.

Como analista de datos, lo que más te importa en el trabajo cotidiano es la **Atomicidad** (proteger operaciones multi-paso) y la **Consistencia** (detectar estados inválidos). El Aislamiento y la Durabilidad son principalmente responsabilidad del DBA y el backend.

### Transacciones como analista vs. como desarrollador

Un desarrollador de backend usa transacciones en el código de la aplicación: cada operación de negocio (registrar un pedido, procesar un pago, actualizar el inventario) va envuelta en una transacción.

Como analista de datos, usas transacciones en dos contextos:

1. **Scripts de actualización de datos:** cuando corriges datos de producción (ajustes contables, correcciones de migración) y necesitas poder deshacer si algo sale mal
2. **Auditoría de consistencia:** queries que buscan estados imposibles en los datos — pedidos entregados sin pago, returns sin order válido, items con product_id inexistente

La segunda es más frecuente para un analista. Aprender a escribir queries de auditoría que detectan inconsistencias es tan importante como aprender las transacciones en sí.

---

## 2. SINTAXIS

### El bloque básico de una transacción

```sql
BEGIN;

    -- Operación 1
    INSERT INTO orders (order_id, customer_id, ordered_at, status)
    VALUES (99001, 42, '2026-06-01 10:00:00', 'pending');

    -- Operación 2
    UPDATE inventory
    SET    stock      = stock - 1,
           updated_at = '2026-06-01 10:00:00'
    WHERE  product_id = 1
      AND  stock >= 1;

COMMIT;
```

Si alguna de las operaciones falla entre `BEGIN` y `COMMIT`, la transacción queda abierta. En ese punto puedes ejecutar `ROLLBACK` para deshacer todo lo que ya ocurrió dentro de la transacción:

```sql
ROLLBACK;
```

### SAVEPOINT: punto de restauración parcial

Un SAVEPOINT permite hacer rollback parcial — deshacer solo una parte de la transacción sin cancelar todo:

```sql
BEGIN;

    INSERT INTO orders (order_id, customer_id, ordered_at, status)
    VALUES (99001, 42, '2026-06-01 10:00:00', 'pending');

    SAVEPOINT antes_del_descuento;  -- punto de restauración

    UPDATE inventory
    SET    stock      = stock - 1,
           updated_at = '2026-06-01 10:00:00'
    WHERE  product_id = 1
      AND  stock >= 1;

    -- Si el UPDATE de stock falló, puedes revertir solo ese paso:
    -- ROLLBACK TO SAVEPOINT antes_del_descuento;
    -- Esto deshace el UPDATE pero mantiene el INSERT

COMMIT;
```

Diego explicitamente pidió el SAVEPOINT porque hay casos donde quiere poder revertir el descuento de stock sin perder el registro del pedido.

### INSERT ... ON CONFLICT DO UPDATE (upsert)

Para el caso de Diego donde el sistema externo puede enviar el mismo `product_id` dos veces, la operación correcta es un **upsert**: insertar si no existe, actualizar si ya existe.

```sql
-- Si product_id ya tiene un registro en inventory, actualiza el stock
-- Si no existe, inserta el nuevo registro
INSERT INTO inventory (inventory_id, product_id, stock, updated_at)
VALUES (9001, 1, 150, '2026-06-01 10:00:00')
ON CONFLICT (product_id)
DO UPDATE SET
    stock      = EXCLUDED.stock,
    updated_at = EXCLUDED.updated_at;
```

`EXCLUDED` es una pseudo-tabla que referencia los valores que se intentaron insertar (los del VALUES). Permite actualizar con el nuevo valor sin tener que escribirlo dos veces.

**Nota:** `ON CONFLICT (product_id)` requiere que `product_id` tenga un constraint UNIQUE o sea PRIMARY KEY. Si el schema no lo tiene, el upsert fallará con un error de sintaxis.

**Compatibilidad:** `INSERT ... ON CONFLICT` funciona en PostgreSQL (desde 9.5) y SQLite (desde 3.24.0). En MySQL el equivalente es `INSERT ... ON DUPLICATE KEY UPDATE`.

### Queries de auditoría de consistencia

El patrón de auditoría más común es el LEFT JOIN + IS NULL: encontrar registros en una tabla que deberían tener correspondencia en otra pero no la tienen.

```sql
-- Pedidos con status='delivered' pero sin ningún pago 'completed'
SELECT
    o.order_id,
    o.customer_id,
    o.ordered_at,
    o.status
FROM orders o
LEFT JOIN payments p
    ON  p.order_id = o.order_id
    AND p.status   = 'completed'
WHERE o.status  = 'delivered'
  AND p.payment_id IS NULL;  -- <- no existe ningún pago completado para este pedido
```

---

## 3. EJEMPLO PRÁCTICO

### Contexto 1: la transacción de Diego

Diego necesita que el registro de pedidos y el descuento de stock sean atómicos. Si el sistema falla en el medio, ninguno de los dos debe quedar en la base de datos.

```sql
-- Transacción para registrar un pedido y descontar el stock
-- Diego Morales — Briefing 8.8
-- ADVERTENCIA: ejecutar en entorno de prueba — modifica datos reales

BEGIN;

-- Paso 1: registrar el pedido nuevo
INSERT INTO orders (order_id, customer_id, ordered_at, status)
VALUES (99001, 42, '2026-06-01 10:00:00', 'pending');

-- Punto de restauración: permite rollback parcial del descuento de stock
-- sin deshacer el INSERT del pedido (caso específico de Diego)
SAVEPOINT antes_del_descuento;

-- Paso 2: descontar el stock del producto
-- La condición stock >= 1 es la regla de negocio:
-- si no hay stock, el UPDATE no modifica ninguna fila
-- En producción, el código de aplicación verificaría cuántas filas
-- fueron afectadas y haría ROLLBACK si el resultado es 0
UPDATE inventory
SET    stock      = stock - 1,
       updated_at = '2026-06-01 10:00:00'
WHERE  product_id = 1
  AND  stock >= 1;

-- Si el UPDATE de stock falló (stock insuficiente):
--   ROLLBACK TO SAVEPOINT antes_del_descuento;  -- revierte solo el UPDATE
--   o
--   ROLLBACK;  -- revierte todo, incluido el INSERT del pedido

-- Si todo está bien:
COMMIT;
```

Para no contaminar el dataset del curso, siempre hacer ROLLBACK al final en el Playground:
```sql
-- Después de verificar que la lógica funciona, deshacer el cambio
ROLLBACK;
```

### Contexto 2: las tres formas de resolución de una transacción

```sql
-- Forma A: flujo normal — todo sale bien
BEGIN;
  INSERT INTO orders ...;
  SAVEPOINT sp1;
  UPDATE inventory ...;
COMMIT;  -- ambas operaciones persisten

-- Forma B: rollback parcial — solo deshacer el descuento de stock
BEGIN;
  INSERT INTO orders ...;
  SAVEPOINT sp1;
  UPDATE inventory ...;  -- falló (stock insuficiente)
ROLLBACK TO SAVEPOINT sp1;  -- deshace el UPDATE, mantiene el INSERT
-- La transacción sigue abierta — se puede continuar o hacer COMMIT del INSERT
COMMIT;

-- Forma C: rollback completo — deshacer todo
BEGIN;
  INSERT INTO orders ...;
  SAVEPOINT sp1;
  UPDATE inventory ...;  -- error crítico
ROLLBACK;  -- deshace TODO (INSERT + UPDATE) — como si nada hubiera ocurrido
```

### Contexto 3: auditoría de consistencia

Una parte del trabajo de un analista de datos en este nivel es encontrar estados imposibles en los datos. Aquí hay tres queries de auditoría sobre ShopSphere:

**Auditoría 1: pedidos entregados sin pago completado**

```sql
-- Pedidos con status='delivered' sin ningún pago con status='completed'
-- Estos son estados imposibles en un sistema íntegro
SELECT
    o.order_id,
    o.customer_id,
    o.ordered_at,
    o.status                                           AS estado_pedido,
    COUNT(p.payment_id)                                AS intentos_de_pago,
    MAX(p.status)                                      AS ultimo_status_pago
FROM orders o
LEFT JOIN payments p ON p.order_id = o.order_id
WHERE o.status = 'delivered'
GROUP BY o.order_id, o.customer_id, o.ordered_at, o.status
HAVING SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) = 0
ORDER BY o.ordered_at DESC;
```

**Auditoría 2: returns sin order_id válido en orders**

```sql
-- Returns que referencian pedidos que no existen en orders
-- Esto viola la integridad referencial y no debería ocurrir
SELECT
    r.return_id,
    r.order_id,
    r.returned_at,
    r.status
FROM returns r
LEFT JOIN orders o ON o.order_id = r.order_id
WHERE o.order_id IS NULL
ORDER BY r.returned_at DESC;
```

**Auditoría 3: order_items con product_id inexistente**

```sql
-- Items en pedidos que referencian productos que no existen en la tabla products
-- Puede indicar productos eliminados sin limpiar los items relacionados
SELECT
    oi.item_id,
    oi.order_id,
    oi.product_id,
    oi.quantity,
    oi.unit_price
FROM order_items oi
LEFT JOIN products p ON p.product_id = oi.product_id
WHERE p.product_id IS NULL
ORDER BY oi.order_id;
```

---

## 4. CASOS DE USO REALES

**Caso 1 — Ajustes contables y correcciones de datos (Finance Analyst, Controller)**
Cuando un auditor identifica registros incorrectos en producción (pagos duplicados, importes erróneos), el analista que ejecuta la corrección la envuelve en una transacción: si algo sale mal durante la actualización, nada queda a medias. El patrón del Briefing 8.3 (marcar pagos duplicados como 'refunded') es exactamente este caso.

**Caso 2 — Carga de datos desde sistemas externos (Data Engineer)**
Los procesos de ETL que insertan datos desde sistemas externos (el sistema de bodega que actualiza el inventario, el sistema de pagos que registra transacciones) usan transacciones para garantizar que si la carga falla a mitad, los datos parciales no quedan en la base de datos.

**Caso 3 — Auditoría de calidad de datos (Data Analyst, Data Quality Engineer)**
Las queries de auditoría (LEFT JOIN + IS NULL para detectar registros huérfanos) son parte del trabajo regular de mantenimiento de calidad de datos. En equipos maduros, estas queries se ejecutan automáticamente como parte de un pipeline de data quality y generan alertas cuando detectan inconsistencias.

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico
**Contexto (Briefing 8.8 — Diego Morales):** Diego necesita la transacción que envuelve el INSERT en `orders` y el UPDATE en `inventory`. Escribe la transacción completa con BEGIN, el INSERT del pedido (usa order_id=99001, customer_id=42, ordered_at='2026-06-01 10:00:00', status='pending'), un SAVEPOINT entre las dos operaciones, el UPDATE de inventory (descuenta 2 unidades del product_id=1, con condición de stock suficiente), y COMMIT. Incluye también los comentarios que explican cuándo usar ROLLBACK TO SAVEPOINT versus ROLLBACK completo.

Al final del ejercicio, incluye un `ROLLBACK` para no modificar permanentemente el dataset del curso.

**Criterio de éxito:** BEGIN antes de la primera operación. INSERT antes del SAVEPOINT. SAVEPOINT entre INSERT y UPDATE. UPDATE con condición `stock >= 2` (descuenta 2 unidades). Comentarios que explican los tres escenarios de resolución. ROLLBACK final para limpiar.

---

### Ejercicio Intermedio
**Contexto (Proyecto Nivel 8 — Punto 3 de auditoría):** Antes de cerrar el informe financiero Q1 2026, necesitas verificar la integridad de los datos de pagos. Escribe una sola query que retorne los pedidos con `status = 'delivered'` que no tienen ningún pago con `status = 'completed'`. Columnas: `order_id`, `customer_id`, `ordered_at`, `total_intentos_de_pago`, `estados_de_pago` (GROUP_CONCAT o equivalente de los status encontrados, o NULL si no hay intentos). Ordena por `ordered_at` descendente. Limita a 20 filas.

**Tablas necesarias:** `orders`, `payments`

**Criterio de éxito:** LEFT JOIN de orders a payments. WHERE o.status = 'delivered'. HAVING que verifica que ningún pago del grupo tiene status='completed'. GROUP BY en order_id. COUNT para los intentos. LIMIT 20.

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
-- Transacción: INSERT en orders + UPDATE en inventory
-- Diego Morales — Briefing 8.8

BEGIN;

-- Paso 1: registrar el pedido
INSERT INTO orders (order_id, customer_id, ordered_at, status)
VALUES (99001, 42, '2026-06-01 10:00:00', 'pending');

-- Punto de restauración después del INSERT, antes del UPDATE de stock
SAVEPOINT antes_del_descuento;

-- Paso 2: descontar 2 unidades del producto 1
-- La condición stock >= 2 garantiza que no se descuenta si no hay suficiente stock
UPDATE inventory
SET    stock      = stock - 2,
       updated_at = '2026-06-01 10:00:00'
WHERE  product_id = 1
  AND  stock >= 2;

-- Escenarios de resolución:
-- A) Todo bien → ejecutar: COMMIT  (persisten INSERT + UPDATE)
-- B) Descuento falló (stock insuficiente) → ejecutar:
--    ROLLBACK TO SAVEPOINT antes_del_descuento
--    (deshace solo el UPDATE, mantiene el INSERT; transacción sigue abierta)
-- C) Error crítico en cualquier paso → ejecutar: ROLLBACK
--    (deshace TODO: INSERT + UPDATE, estado original restaurado)

-- En el Playground usamos ROLLBACK para no modificar el dataset del curso.
-- Si quisieras persistir los cambios en un entorno real, usarías COMMIT en su lugar.
ROLLBACK;
```

**Solución Ejercicio Intermedio:**
```sql
-- Auditoría: pedidos 'delivered' sin pago 'completed'
SELECT
    o.order_id,
    o.customer_id,
    o.ordered_at,
    COUNT(p.payment_id)                                     AS total_intentos_de_pago,
    GROUP_CONCAT(DISTINCT p.status)                         AS estados_de_pago
FROM orders o
LEFT JOIN payments p ON p.order_id = o.order_id
WHERE o.status = 'delivered'
GROUP BY o.order_id, o.customer_id, o.ordered_at
HAVING SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) = 0
ORDER BY o.ordered_at DESC
LIMIT 20;
```

</details>

---

## 6. ERRORES COMUNES

**Error 1 — Olvidar el BEGIN y hacer cambios no protegidos**

```sql
-- INCORRECTO: sin BEGIN, cada sentencia es su propia transacción
-- Si la segunda operación falla, la primera ya se confirmó y no puede deshacerse
UPDATE inventory SET stock = stock - 1 WHERE product_id = 1;
INSERT INTO orders (order_id, ...) VALUES (99001, ...);  -- si esto falla, el stock ya está descontado

-- CORRECTO: ambas operaciones dentro de la misma transacción
BEGIN;
  UPDATE inventory SET stock = stock - 1 WHERE product_id = 1;
  INSERT INTO orders (order_id, ...) VALUES (99001, ...);
COMMIT;
```

Error mental: creer que SQL "recuerda" que las operaciones son relacionadas sin que tú lo explicites con BEGIN.

**Error 2 — Hacer ROLLBACK TO SAVEPOINT cuando se quería ROLLBACK completo**

```sql
-- SAVEPOINT sp1 está DESPUÉS del INSERT — ROLLBACK TO sp1 mantiene el INSERT
BEGIN;
  INSERT INTO orders ...;        -- este INSERT queda en pie
  SAVEPOINT sp1;
  UPDATE inventory ...;          -- este UPDATE se revierte
ROLLBACK TO SAVEPOINT sp1;       -- solo deshace lo de después del SAVEPOINT
-- ¡El INSERT sigue pendiente! Necesitas COMMIT o ROLLBACK completo para cerrarlo

-- Si quieres deshacer TODO:
ROLLBACK;  -- esto sí deshace todo, incluyendo el INSERT
```

Error mental: confundir ROLLBACK TO SAVEPOINT (parcial) con ROLLBACK (total). El primero no cierra la transacción — esta sigue abierta.

**Error 3 — ON CONFLICT sin UNIQUE constraint en la columna de conflicto**

```sql
-- INCORRECTO: ON CONFLICT (product_id) requiere que product_id tenga UNIQUE o sea PK
-- Si no tiene el constraint, este ON CONFLICT falla en tiempo de compilación
INSERT INTO inventory (inventory_id, product_id, stock, updated_at)
VALUES (9001, 1, 150, NOW())
ON CONFLICT (product_id)  -- ← ERROR si product_id no tiene constraint UNIQUE
DO UPDATE SET stock = EXCLUDED.stock;

-- Solución: asegurarse que el schema tiene el constraint
-- o agregar el constraint si se tiene permiso
-- ALTER TABLE inventory ADD CONSTRAINT uq_inventory_product_id UNIQUE (product_id);
```

Error mental: no verificar el schema antes de usar ON CONFLICT. El playground puede dar un error críptico que no menciona el constraint faltante.

**Error 4 — Auditoría con INNER JOIN en lugar de LEFT JOIN + IS NULL**

```sql
-- INCORRECTO: INNER JOIN solo retorna orders que SÍ tienen pagos
-- Nunca encontrará pedidos sin ningún intento de pago
SELECT o.order_id
FROM orders o
INNER JOIN payments p ON p.order_id = o.order_id
WHERE o.status = 'delivered'
  AND p.status != 'completed';  -- ← solo encuentra pagos no-completados, no ausencia de pago

-- CORRECTO: LEFT JOIN detecta pedidos sin ningún pago
SELECT o.order_id
FROM orders o
LEFT JOIN payments p
    ON  p.order_id = o.order_id
    AND p.status   = 'completed'
WHERE o.status   = 'delivered'
  AND p.payment_id IS NULL;  -- ← detecta ausencia de pago completado
```

Error mental: confundir "filtrar por un valor específico" (INNER JOIN + WHERE) con "verificar la ausencia de un registro" (LEFT JOIN + IS NULL). El primero no sirve para detectar ausencias.

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

Ahora tienes las tres herramientas fundamentales de SQL profesional: revenue neto real con `payments`, queries optimizadas con índices, y operaciones seguras con transacciones.

La última lección de este nivel integra todo esto en el producto final: los datos que van a la junta directiva. Ana necesita un informe que pueda leerse sin SQL, con números exactos, columnas con nombres en español para el CEO, y queries que cualquier analista del equipo pueda mantener en producción el año que viene. Eso requiere vistas documentadas, comentarios que explican la lógica, y un estándar de calidad que va más allá de "la query funciona".
