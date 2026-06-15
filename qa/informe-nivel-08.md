# Informe QA — Nivel 8: SQL Profesional
**Fecha:** 2026-06-02
**Generado por:** sql-data-analyst (Modo QA)
**Archivos revisados:**
- `modulos/nivel-08-profesional/leccion-01.md`
- `modulos/nivel-08-profesional/leccion-02.md`
- `modulos/nivel-08-profesional/leccion-03.md`
- `modulos/nivel-08-profesional/leccion-04.md`
- `modulos/nivel-08-profesional/ejercicios-nivel-08.sql`
- `contenido/briefings-nivel-08.md`
- `dataset/expected-results-nivel-08.json` — ARCHIVO NO ENCONTRADO (solo existe template)

---

## Veredicto General

**APROBADO CON OBSERVACIONES**

El Nivel 8 es el material de mayor calidad técnica del curso hasta ahora. Las cuatro lecciones son correctas en SQL, pedagógicamente progresivas y coherentes con el schema canónico. Los 25 ejercicios y sus soluciones están bien construidos. No hay hallazgos CRÍTICOS que bloqueen la publicación. Se registran cuatro hallazgos IMPORTANTES y seis SUGERENCIAS.

---

## Resumen de Hallazgos

| ID | Severidad | Archivo | Descripción breve |
|---|---|---|---|
| IMP-N8-01 | IMPORTANTE | leccion-01.md | payments.method en schema de lección no coincide con schema canónico ni con briefings |
| IMP-N8-02 | IMPORTANTE | leccion-03.md | Solución ejercicio básico: COMMIT seguido de ROLLBACK es lógicamente incoherente como código de producción |
| IMP-N8-03 | IMPORTANTE | ejercicios-nivel-08.sql | Solución 13: misma incoherencia COMMIT + ROLLBACK — el ROLLBACK después de COMMIT no tiene efecto |
| IMP-N8-04 | IMPORTANTE | leccion-01.md / briefings | El schema de payments en la lección introduce columnas (`debit_card`, `cash`, `country`) que no están en el schema canónico del curso |
| SUG-N8-01 | SUGERENCIA | leccion-02.md | Anti-patrón 2: la subquery correlacionada del ejemplo tiene un error de indentación que puede confundir |
| SUG-N8-02 | SUGERENCIA | leccion-04.md | Vista v_resumen_mensual_ejecutivo: no hace JOIN a orders/customers — clientes_activos no puede calcularse solo con payments |
| SUG-N8-03 | SUGERENCIA | ejercicios-nivel-08.sql | Solución 17: el HAVING del Componente 1 tiene una condición redundante |
| SUG-N8-04 | SUGERENCIA | ejercicios-nivel-08.sql | Solución 19 (Vista v_inconsistencias_datos): el tipo 1 usa GROUP BY + HAVING pero la vista podría usar LEFT JOIN + IS NULL para ser consistente con los tipos 2 y 3 |
| SUG-N8-05 | SUGERENCIA | ejercicios-nivel-08.sql | Solución 24: CTEs en UNION ALL con ORDER BY en los CTEs individuales — comportamiento no garantizado en SQLite |
| SUG-N8-06 | SUGERENCIA | contenido/briefings-nivel-08.md | Briefing 8.2 menciona `paypal`, `bank_transfer`, `crypto` como métodos — inconsistente con la lección que lista `credit_card`, `debit_card`, `transfer`, `cash` |

---

## Hallazgos Detallados

---

### [IMP-N8-01] — Hallazgo #1

**Componente:** `leccion-01.md`, Sección 2 (Sintaxis), definición de la tabla `payments`

**Problema:** La lección documenta el schema de `payments` con los siguientes valores para `method`:

```sql
method  TEXT,  -- 'credit_card', 'debit_card', 'transfer', 'cash'
```

Y para `status`:
```sql
status  TEXT,  -- 'completed', 'failed', 'pending', 'refunded'
```

Además, la lección agrega una columna `country TEXT` que NO existe en el schema canónico del curso:

```sql
country TEXT  -- país del pago (del cliente o del método)
```

El schema canónico define:
```sql
CREATE TABLE payments (
    payment_id   INT PRIMARY KEY,
    order_id     INT REFERENCES orders(order_id),
    amount       DECIMAL(10, 2) NOT NULL,
    method       VARCHAR(50) CHECK (method IN ('credit_card','paypal','bank_transfer','crypto')),
    status       VARCHAR(20) CHECK (status IN ('pending','completed','failed','refunded')),
    paid_at      TIMESTAMP
);
```

Hay tres discrepancias:
1. Los valores de `method` no coinciden: la lección usa `'debit_card'`, `'transfer'`, `'cash'`; el schema canónico usa `'paypal'`, `'bank_transfer'`, `'crypto'`. Ningún valor excepto `'credit_card'` es común a ambos.
2. La lección incluye `country TEXT` como columna de `payments`, pero esa columna no existe en el schema canónico. El país del cliente se obtiene navegando `payments → orders → customers`.
3. El Briefing 8.2 en `contenido/briefings-nivel-08.md` menciona correctamente `'credit_card'`, `'paypal'`, `'bank_transfer'`, `'crypto'` — en línea con el schema canónico, pero en desacuerdo con la lección.

**Impacto:** Los ejemplos de la lección (Query 3 — Anomalía Chile) muestran filas con `method = 'debit_card'` y `method = 'cash'` en el output esperado. Cuando un estudiante ejecute esas queries sobre el dataset real (que tiene `'paypal'`, `'bank_transfer'`, `'crypto'`), el output será diferente al mostrado, generando confusión. La columna `country` en la definición de la tabla es más grave pedagógicamente: induce al estudiante a creer que puede obtener el país directamente de `payments` cuando en realidad necesita el JOIN a `orders` y `customers`.

**Corrección:** Actualizar la definición de `payments` en la Sección 2 para que coincida con el schema canónico:

```sql
payments (
    payment_id  INTEGER,         -- identificador único del intento de pago
    order_id    INTEGER,         -- FK a orders — un pedido puede tener N intentos
    method      TEXT,            -- 'credit_card', 'paypal', 'bank_transfer', 'crypto'
    status      TEXT,            -- 'completed', 'failed', 'pending', 'refunded'
    amount      DECIMAL(10,2),   -- monto del intento
    paid_at     TIMESTAMP        -- fecha/hora del pago — NULL si no está completado
    -- NOTA: no hay columna 'country' en payments.
    -- El país del cliente se obtiene: payments → orders → customers
)
```

Actualizar también los outputs esperados de la Query 3 para usar los métodos correctos (`'paypal'`, `'bank_transfer'`, `'crypto'` en lugar de `'debit_card'`, `'transfer'`, `'cash'`).

---

### [IMP-N8-02] — Hallazgo #2

**Componente:** `leccion-03.md`, Sección 5 (Ejercicio Propuesto — Solución Ejercicio Básico), líneas finales de la transacción

**Problema:** La solución del Ejercicio Básico termina con:

```sql
COMMIT;

-- Limpiar el dataset del curso (en entorno de prueba):
ROLLBACK;
```

Un `ROLLBACK` después de un `COMMIT` no tiene efecto alguno: una vez que se ejecuta `COMMIT`, la transacción finalizó y todos sus cambios son permanentes. El `ROLLBACK` posterior no deshace nada — simplemente inicia y cierra inmediatamente una nueva transacción vacía (en modo autocommit).

El propósito declarado es "no modificar permanentemente el dataset del curso", pero el `COMMIT` previo ya lo modificó. Para lograr ese propósito, el código debería terminar en `ROLLBACK` en lugar de `COMMIT`.

**Impacto:** Un estudiante que copie y ejecute esta solución en el Playground terminará con el `order_id=99001` insertado permanentemente en `orders` y el stock de `product_id=1` decrementado en 2 unidades. El comentario "Limpiar el dataset del curso" es engañoso porque el ROLLBACK posterior no limpia nada. Esto crea una percepción falsa de seguridad: el estudiante cree que revirtió los cambios cuando no lo hizo.

**Corrección:** Reemplazar la secuencia `COMMIT + ROLLBACK` por solo `ROLLBACK` al final, con una nota clara:

```sql
-- Para verificar la lógica sin modificar permanentemente el dataset:
ROLLBACK;  -- Deshace el INSERT y el UPDATE — como si nada hubiera ocurrido

-- NOTA: En producción real, este ROLLBACK se reemplaza por COMMIT
-- cuando el código de aplicación verifica que ambas operaciones exitosas.
```

Si el propósito pedagógico es mostrar primero el COMMIT y luego la alternativa para el Playground, presentarlos como dos bloques separados y mutuamente excluyentes:

```sql
-- OPCIÓN A: en producción, cuando todo sale bien
COMMIT;

-- OPCIÓN B: en el Playground del curso (para no modificar datos)
-- Reemplaza el COMMIT de arriba por:
-- ROLLBACK;
```

---

### [IMP-N8-03] — Hallazgo #3

**Componente:** `ejercicios-nivel-08.sql`, Solución 13 (líneas 1300–1333)

**Problema:** La misma incoherencia lógica del hallazgo IMP-N8-02 aparece en el archivo de ejercicios. La Solución 13 termina con:

```sql
COMMIT;

-- Limpiar el dataset del curso en el Playground:
ROLLBACK;
```

El ROLLBACK posterior al COMMIT no tiene efecto. Los datos insertados y actualizados por la transacción quedan persistidos.

**Impacto:** Idéntico al de IMP-N8-02. El archivo de ejercicios es el que los estudiantes ejecutan directamente en el Playground — el impacto aquí es mayor que en la lección (que puede leerse sin ejecutar). Un estudiante que ejecute la Solución 13 en el Playground tendrá `order_id=99001` en su dataset y el stock decrementado, y creerá erróneamente que no fue así.

**Corrección:** Aplicar la misma corrección que en IMP-N8-02. El enunciado del Ejercicio 13 ya pide correctamente un `ROLLBACK al final para no modificar el dataset del curso` — la solución debe honrar ese criterio de éxito terminando en ROLLBACK, no en COMMIT.

---

### [IMP-N8-04] — Hallazgo #4

**Componente:** `leccion-01.md`, outputs esperados de la Query 3 (Anomalía Chile); `contenido/briefings-nivel-08.md`, Briefing 8.2

**Problema:** Los outputs simulados de la Query 3 en la lección muestran filas con los métodos `'credit_card'`, `'transfer'`, `'debit_card'`, `'cash'`. El schema canónico del curso define `method CHECK (method IN ('credit_card','paypal','bank_transfer','crypto'))`. Los métodos `'transfer'`, `'debit_card'` y `'cash'` no existen en el schema canónico.

De forma adicional, el Briefing 8.2 menciona: "Total de pagos por método (credit_card, paypal, bank_transfer, crypto)" — lo que es correcto según el schema canónico, pero contradice los outputs de la lección que muestran `debit_card`, `transfer`, `cash`.

**Impacto:** El estudiante ve outputs de la lección con cuatro métodos que no coinciden con los cuatro métodos reales. Cuando ejecute la query, el output tendrá `'paypal'`, `'bank_transfer'`, `'crypto'` en lugar de `'debit_card'`, `'transfer'`, `'cash'`. La narrativa pedagógica (identificar que `credit_card` en Chile tiene tasa de fallo del 40%) se mantiene, pero con nombres incorrectos de los otros métodos.

**Corrección:** Actualizar los outputs simulados para usar los métodos del schema canónico. El output de la Query 3 debería mostrar:

```
| grupo_pais      | metodo        | total_pagos | pagos_fallidos | tasa_fallo_pct |
|-----------------|---------------|-------------|----------------|----------------|
| Chile           | credit_card   | 380         | 152            | 40,00          |
| Chile           | paypal        | 210         | 25             | 11,90          |
| Chile           | bank_transfer | 195         | 18             | 9,23           |
| Chile           | crypto        | 88          | 6              | 6,82           |
```

---

## Hallazgos — SUGERENCIAS

---

### [SUG-N8-01] — Hallazgo #5

**Componente:** `leccion-02.md`, Sección 2 (Anti-patrones), Anti-patrón 2 — Subquery correlacionada

**Problema:** En el ejemplo del Anti-patrón 2, la subquery correlacionada tiene una indentación inconsistente que puede dificultar la lectura:

```sql
SELECT
    customer_id,
    (SELECT SUM(amount)
     FROM payments p
     WHERE p.order_id IN (
         SELECT order_id FROM orders o WHERE o.customer_id = c.customer_id
     )) AS total_pagado
FROM customers c;
```

La tabla `payments` se alias como `p` en el SELECT exterior de la subquery, pero luego se vuelve a referenciar como `p.order_id` en el IN. La lógica es correcta (es una subquery dentro de una subquery), pero visualmente puede leerse como que `p` de la subquery exterior y el `p` en el WHERE del IN son el mismo alias — cuando en realidad hay dos niveles de subquery aquí.

**Sugerencia:** Cambiar el alias interno para evitar la ambigüedad visual:

```sql
SELECT
    customer_id,
    (SELECT SUM(p.amount)
     FROM payments p
     INNER JOIN orders o ON o.order_id = p.order_id
     WHERE o.customer_id = c.customer_id
    ) AS total_pagado
FROM customers c;
```

Este ajuste también es más fiel al patrón real de subquery correlacionada y más consistente con la versión correcta (LEFT JOIN) que sigue.

---

### [SUG-N8-02] — Hallazgo #6

**Componente:** `leccion-04.md`, Sección 3, Vista `v_resumen_mensual_ejecutivo` (Query de producción 2)

**Problema:** La vista incluye una CTE `pagos_mes` y una CTE `pedidos_mes` separadas, que luego se unen por `mes`. Esto es correcto. Sin embargo, la CTE `pagos_mes` calcula `COUNT(DISTINCT p.order_id) AS pedidos_con_pago` pero el SELECT final usa `pe.total_pedidos` de la CTE `pedidos_mes`. Las dos cuentas de pedidos son conceptualmente distintas (pedidos con pago registrado vs. pedidos activos por fecha de pedido) y está bien tenerlas separadas.

El punto de mejora: la vista nombra la columna `pedidos_con_pago` en la CTE `pagos_mes` pero la descarta silenciosamente en el SELECT final (no aparece en el output). Un lector de la vista puede no notar que hay dos conteos distintos.

**Sugerencia:** O usar `pedidos_con_pago` en el output final (como métrica adicional útil) o eliminarlo de `pagos_mes` para mantener la CTE enfocada en montos. También agregar un comentario que explique por qué `pedidos_mes` usa `ordered_at` (fecha de creación) mientras `pagos_mes` usa `paid_at` (fecha de pago).

---

### [SUG-N8-03] — Hallazgo #7

**Componente:** `ejercicios-nivel-08.sql`, Solución 17 (Componente 1: pedidos sin pago)

**Problema:** La CTE `pedidos_sin_pago` usa:

```sql
FROM orders o
LEFT JOIN payments p
    ON  p.order_id = o.order_id
    AND p.status   = 'completed'
WHERE o.status   = 'delivered'
GROUP BY o.order_id
HAVING SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) = 0
```

Dado que el JOIN ya filtra por `AND p.status = 'completed'`, la condición `HAVING SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) = 0` es equivalente a `HAVING COUNT(p.payment_id) = 0` (o simplemente `HAVING p.order_id IS NULL` si se agrega la condición al WHERE como un LEFT JOIN + IS NULL). La lógica es correcta pero el HAVING es redundante con la condición de JOIN.

**Sugerencia:** Simplificar a:

```sql
FROM orders o
LEFT JOIN payments p
    ON  p.order_id = o.order_id
    AND p.status   = 'completed'
WHERE o.status   = 'delivered'
GROUP BY o.order_id
HAVING COUNT(p.payment_id) = 0
```

O, más legiblemente aún (sin GROUP BY), usar el patrón de la Auditoría 1 de la Lección 3:

```sql
FROM orders o
LEFT JOIN payments p
    ON  p.order_id = o.order_id
    AND p.status   = 'completed'
WHERE o.status    = 'delivered'
  AND p.payment_id IS NULL
```

---

### [SUG-N8-04] — Hallazgo #8

**Componente:** `ejercicios-nivel-08.sql`, Solución 19 (Vista `v_inconsistencias_datos`), Tipo 1

**Problema:** Los tipos 2 y 3 de la vista usan el patrón `LEFT JOIN + IS NULL` (sin GROUP BY), que es el patrón más directo para detectar ausencias. El tipo 1 usa GROUP BY + HAVING, que también es correcto pero introduce inconsistencia de estilo dentro de la misma vista UNION ALL.

El tipo 1 podría reescribirse con el mismo patrón LEFT JOIN + IS NULL para mantener coherencia:

```sql
-- Tipo 1 alternativo: más consistente con tipos 2 y 3
SELECT
    'pedido_entregado_sin_pago'     AS tipo_inconsistencia,
    o.order_id                      AS entidad_id,
    'Pedido delivered sin pago completed' AS detalle
FROM orders o
LEFT JOIN payments p
    ON  p.order_id = o.order_id
    AND p.status   = 'completed'
WHERE o.status   = 'delivered'
  AND p.payment_id IS NULL
```

**Sugerencia:** Si el tipo 1 necesita GROUP BY para agregar información adicional (como contar intentos), mantenerlo con GROUP BY + HAVING es correcto. Si el propósito es solo detectar la ausencia, el patrón LEFT JOIN + IS NULL es más directo y consistente con el estilo de los otros dos tipos.

---

### [SUG-N8-05] — Hallazgo #9

**Componente:** `ejercicios-nivel-08.sql`, Solución 24 (5 insights ejecutivos), CTEs `insight2`, `insight4`, `insight5`

**Problema:** Las CTEs `insight2`, `insight4` e `insight5` contienen `ORDER BY` y `LIMIT 1` dentro de la definición del CTE:

```sql
insight2 AS (
    SELECT ...
    FROM payments p
    INNER JOIN orders o ...
    INNER JOIN customers c ...
    GROUP BY c.country
    ORDER BY ... DESC
    LIMIT 1
),
```

En SQLite, `ORDER BY` y `LIMIT` dentro de un CTE están técnicamente permitidos y funcionan en la mayoría de las versiones recientes. Sin embargo, el estándar SQL no garantiza que el ORDER BY dentro de un CTE se preserve cuando el CTE se consume desde el SELECT exterior. En versiones más restrictivas de PostgreSQL, esto puede generar advertencias o comportamiento no determinístico.

**Sugerencia:** Usar una subquery con LIMIT en el SELECT exterior o usar `ROW_NUMBER()` para mayor portabilidad:

```sql
insight2 AS (
    SELECT
        c.country,
        SUM(...) AS revenue_neto
    FROM payments p
    INNER JOIN orders o ...
    INNER JOIN customers c ...
    GROUP BY c.country
),
insight2_top AS (
    SELECT country, revenue_neto
    FROM insight2
    ORDER BY revenue_neto DESC
    LIMIT 1
)
```

---

### [SUG-N8-06] — Hallazgo #10

**Componente:** `contenido/briefings-nivel-08.md`, Briefing 8.2

**Problema:** El Briefing 8.2 lista los métodos de pago a analizar como: `'credit_card'`, `'paypal'`, `'bank_transfer'`, `'crypto'`, que corresponde al schema canónico. Sin embargo, la Lección 1 (que es lo que el estudiante estudia antes de leer el briefing) documenta los métodos como `'credit_card'`, `'debit_card'`, `'transfer'`, `'cash'`. Esta inconsistencia entre lección y briefing puede confundir al estudiante sobre qué valores existen realmente en la tabla.

**Sugerencia:** Una vez corregida la Lección 1 (como se indica en IMP-N8-01), los briefings quedarán automáticamente consistentes con la lección corregida. No requiere corrección independiente si se aplica IMP-N8-01.

---

## Verificaciones de Corrección Técnica

### Lección 1 — Correctas

**Revenue neto con SUM condicional:** El patrón `SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END) - SUM(CASE WHEN p.status = 'refunded' THEN p.amount ELSE 0 END)` es técnicamente correcto para revenue neto. El uso de ELSE 0 en lugar de ELSE NULL es correcto para que el SUM no excluya filas — aunque en este caso ELSE NULL también sería correcto porque SUM ignora NULLs, el ELSE 0 es más explícito y pedagógicamente más claro.

**NULLIF en denominadores:** Presente en todas las tasas. `NULLIF(total_cobrado, 0)` en el denominador de `pct_reembolsado` y `NULLIF(COUNT(*), 0)` en la tasa de fallo. Correcto.

**JOIN chain payments → orders → customers:** Correcto. El país del cliente se navega a través de `payments.order_id → orders.customer_id → customers.country`. El uso de INNER JOIN es adecuado para excluir pagos huérfanos (sin pedido correspondiente).

**Filtro de período con rango:** `WHERE p.paid_at >= '2026-01-01' AND p.paid_at < '2026-04-01'` — correcto. El límite superior es exclusivo (<), lo que captura correctamente todo el mes de marzo sin incluir el 1 de abril.

**paid_at IS NULL para pending/failed:** La explicación de que `paid_at` es NULL para pagos no completados es técnicamente correcta según las reglas de negocio declaradas en el schema.

### Lección 2 — Correctas

**EXPLAIN QUERY PLAN sintaxis SQLite:** Correcto. `EXPLAIN QUERY PLAN <query>` es la sintaxis de SQLite. La distinción con `EXPLAIN ANALYZE` de PostgreSQL está documentada en la lección y en los errores comunes.

**Creación de índices:** `CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id)` — sintaxis correcta para SQLite. El uso de `IF NOT EXISTS` es la práctica correcta para scripts reutilizables.

**Índice parcial:** `CREATE INDEX IF NOT EXISTS idx_payments_failed ON payments(order_id, paid_at) WHERE status = 'failed'` — sintaxis correcta para SQLite (y PostgreSQL). La nota sobre incompatibilidad con MySQL es correcta.

**Anti-patrón NOT IN con NULLs:** La explicación es técnicamente correcta. Si la subquery contiene un NULL, la comparación `x NOT IN (lista_con_NULL)` devuelve NULL para cada valor de x, no FALSE. La alternativa `NOT EXISTS` maneja NULLs correctamente.

**Anti-patrón función en columna del WHERE:** `STRFTIME('%Y', paid_at) = '2026'` impide el uso del índice. La alternativa con rango explícito es correcta.

**Cardinalidad y utilidad de índices:** La explicación sobre por qué un índice en `status` (4 valores posibles) es menos útil que un índice en `paid_at` (alta cardinalidad) es técnicamente correcta.

### Lección 3 — Correctas

**Propiedades ACID explicadas correctamente:** Las cuatro propiedades están bien descritas. La priorización para analistas (Atomicidad y Consistencia sobre Aislamiento y Durabilidad) es apropiada.

**BEGIN / COMMIT / ROLLBACK sintaxis:** Correcta para SQLite y PostgreSQL.

**SAVEPOINT y ROLLBACK TO SAVEPOINT:** Correctos. La descripción de que ROLLBACK TO SAVEPOINT deja la transacción abierta (no la cierra) es correcta y está bien explicada en los errores comunes.

**ON CONFLICT DO UPDATE (upsert):** Correcto. La advertencia sobre la necesidad de UNIQUE constraint en `product_id` es correcta y está bien señalada. La nota sobre compatibilidad con MySQL es correcta.

**Queries de auditoría LEFT JOIN + IS NULL:** Las tres auditorías de la Sección 3 son lógicamente correctas. El patrón de poner la condición de filtro del lado derecho en el ON (no en el WHERE) para el LEFT JOIN es el patrón correcto.

**Auditoría 1 con HAVING:** La query de "pedidos entregados sin pago completado" usa correctamente `LEFT JOIN payments p ON p.order_id = o.order_id` (sin filtrar en el ON) y luego `HAVING SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) = 0`. Esta es la versión más completa porque también devuelve pedidos sin ningún intento de pago (donde `p.payment_id IS NULL`).

### Lección 4 — Correctas

**CREATE VIEW con DROP VIEW IF EXISTS:** Correcto para SQLite. La lección documenta explícitamente que `CREATE OR REPLACE VIEW` no existe en SQLite.

**LAG() para variación MoM:** El uso de `LAG(cobrado - reembolsado) OVER (ORDER BY nro_mes)` es correcto. El NULLIF en el denominador del cálculo de variación porcentual está presente.

**STRFTIME en SQLite:** `STRFTIME('%Y-%m', p.paid_at)` para agrupar por mes es la sintaxis correcta de SQLite. El nivel usa consistentemente STRFTIME en lugar de DATE_TRUNC (PostgreSQL) — correcto para el dialecto del Playground.

**Checklist de producción:** Los 10 ítems del checklist son todos válidos como criterios de calidad para queries de producción. No hay criterios incorrectos.

**Error 3 (vista con DATE('now', '-12 months')):** La advertencia sobre que las vistas con fechas relativas producen resultados diferentes en cada ejecución es técnicamente correcta y pedagogicamente valiosa.

### Ejercicios Nivel 8 — Verificaciones específicas

**Soluciones 01–06 (Bloque A — Revenue):** Todas correctas. Los patrones de CTE + SUM condicional + NULLIF son consistentes y correctos.

**Solución 07 (EXPLAIN + CREATE INDEX):** Los tres bloques son correctos. Los comentarios de justificación para los índices son precisos.

**Solución 08 (NOT IN vs NOT EXISTS):** Correcta. La explicación de por qué NOT IN falla con NULLs es técnicamente precisa.

**Solución 09 (función en WHERE → rango):** Correcta. La reescritura con rango explícito es equivalente y permite el uso del índice.

**Soluciones 10–12:** Correctas.

**Solución 14 (auditoría delivered sin pago):** Correcta. El patrón LEFT JOIN + HAVING es lógicamente correcto.

**Soluciones 15–16 (auditoría huérfanos):** Correctas. El patrón LEFT JOIN + IS NULL es el correcto para detectar ausencias.

**Solución 17 (revenue en riesgo):** Lógicamente correcta, con la observación de redundancia del HAVING señalada en SUG-N8-03.

**Soluciones 18–25:** Correctas, con las sugerencias de mejora señaladas en SUG-N8-04, SUG-N8-05.

**Archivo no encontrado:** `dataset/expected-results-nivel-08.json` — solo existe el template (`dataset/expected-results-nivel-08-template.json`). Los expected results reales aún no han sido generados con el dataset del curso.

---

## Aspectos Positivos

**Coherencia de schema en la mayoría del material:** Con la excepción del schema de `payments` en la Lección 1 (hallazgo IMP-N8-01), todas las columnas referenciadas existen en el schema canónico del curso. Ninguna tabla se usa antes de su nivel de desbloqueo. El Nivel 8 tiene acceso a todas las tablas y las usa correctamente.

**La narrativa de Ana/Valentina/Diego es el andamiaje pedagógico más efectivo del curso:** Los briefings están bien integrados con los ejercicios. Cada ejercicio tiene un contexto de negocio claro y la solución corresponde exactamente al enunciado.

**NULLIF en todos los denominadores sin excepción:** En 25 ejercicios con docenas de tasas y porcentajes, no se encontró ningún denominador sin NULLIF. Este es el criterio que más consistentemente falla en niveles anteriores.

**Los errores comunes son todos reales y las correcciones son técnicamente correctas:** Los 16 errores documentados en las cuatro lecciones (4 por lección) cubren los errores más frecuentes en trabajo con `payments`: confundir orders.status con payments.status, no usar COUNT DISTINCT, aplicar funciones en columnas indexadas, olvidar el NULLIF.

**La distinción EXPLAIN QUERY PLAN (SQLite) vs EXPLAIN ANALYZE (PostgreSQL) está bien documentada:** La nota sobre dialectos en la Lección 2 es correcta y está ubicada en el lugar correcto (al inicio de la sección, no al final como advertencia tardía). Es una mejora respecto al patrón visto en el Nivel 7 con CREATE OR REPLACE VIEW.

**La Solución 21 (segmentación LTV con first-touch):** El patrón de tres CTEs (`primera_sesion → canal_cliente → canal_todos`) para manejar clientes sin sesiones es el patrón correcto. El `COALESCE(cc.canal_adquisicion, 'sin sesion')` para clientes sin ninguna sesión es la forma correcta de evitar pérdida de clientes en el análisis.

**La Solución 25 (vista `v_dashboard_inversores`):** La query más compleja del nivel. Las cuatro CTEs están bien separadas por responsabilidad. El cálculo de `indicador_riesgo_chile` dentro del SELECT final (no como CTE adicional) es elegante y correcto. El `NULLIF` en todos los denominadores de la vista está presente.

**El checklist de calidad de la Lección 4:** Los 10 criterios son todos válidos, están en el orden correcto (de más impacto a más estético), y son accionables. Es el mejor recurso de referencia para analistas que el curso ha producido.

---

## Archivos No Encontrados

- `dataset/expected-results-nivel-08.json` — No existe. Solo hay un template (`expected-results-nivel-08-template.json`). Los expected results reales deben generarse ejecutando las soluciones del nivel contra el dataset real del curso. Sin estos expected results, el sistema de auto-corrección del Playground no puede validar los ejercicios del Nivel 8.

---

## Próximos Pasos

**Correcciones bloqueantes antes de publicar:**

1. **[IMP-N8-01] Actualizar schema de payments en Lección 1** para usar los valores canónicos (`'paypal'`, `'bank_transfer'`, `'crypto'` en lugar de `'debit_card'`, `'transfer'`, `'cash'`) y eliminar la columna `country` de la definición de la tabla. Actualizar los outputs simulados de la Query 3.

2. **[IMP-N8-02 + IMP-N8-03] Corregir la secuencia COMMIT + ROLLBACK** en la Solución del Ejercicio Básico de la Lección 3 y en la Solución 13 del archivo de ejercicios. El código debe terminar en ROLLBACK solo (o presentar COMMIT y ROLLBACK como opciones mutuamente excluyentes).

**Correcciones importantes antes de publicar:**

3. **[IMP-N8-04] Actualizar outputs simulados** de la Query 3 (Anomalía Chile) en la Lección 1 para usar los métodos correctos del schema canónico.

**Acciones pendientes no bloqueantes:**

4. Generar `dataset/expected-results-nivel-08.json` ejecutando las soluciones contra el dataset real. Sin este archivo, los ejercicios del Nivel 8 no son auto-verificables en el Playground.

5. Aplicar las sugerencias SUG-N8-03 y SUG-N8-04 para mayor elegancia en las soluciones de auditoría (opcionales, no afectan corrección).

6. Verificar que el sistema de ejercicios tiene `validation_mode = "manual_review"` para los ejercicios con EXPLAIN QUERY PLAN (EJ07, EJ11) y `validation_mode = "schema_match"` para las vistas (EJ19, EJ20, EJ25).
