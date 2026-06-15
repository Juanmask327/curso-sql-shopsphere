# Nivel 7 — SQL para Business Intelligence
## Lección 3: Vistas (CREATE VIEW) — infraestructura analítica reutilizable

> Tablas disponibles en este nivel: `customers`, `categories`, `products`, `orders`, `order_items`, `returns`, `inventory`, `marketing_campaigns`, `website_sessions`

---

## 1. INTRODUCCIÓN CONCEPTUAL

### El problema que las vistas resuelven

El equipo de BI del fondo chileno se conecta directamente a la base de datos de ShopSphere con Power BI. Valentina les mandó la query del funnel. Al día siguiente el analista del fondo escribe:

> *"Oye, la query del funnel que nos pasaste tiene un error — le cambié el filtro de fecha y ya no funciona igual."*

Este es exactamente el problema que predijo Valentina: si la lógica del funnel vive en una query suelta, cualquiera que la copie puede romperla sin darse cuenta. Cada analista tiene su propia versión. Los números divergen. Nadie confía en los datos.

La solución es encapsular esa lógica en una **vista**: un objeto persistente en la base de datos que funciona como una tabla virtual. Cuando el analista del fondo consulta `v_funnel_adquisicion`, siempre obtiene los datos correctos, calculados con la lógica que tú definiste, sin necesitar copiar ni entender la query subyacente.

Una vista:
- Se crea una sola vez y queda disponible para todos
- Siempre devuelve los datos más recientes (no es una copia estática)
- Encapsula la lógica compleja: JOINs, cálculos, filtros
- Se consulta exactamente igual que una tabla: `SELECT * FROM v_funnel_adquisicion`

### La analogía con las CTEs

Ya conoces las CTEs del Nivel 5. Una vista y una CTE hacen algo similar: ambas dan nombre a una query y te permiten consultarla como si fuera una tabla. La diferencia fundamental:

| | CTE | Vista |
|---|---|---|
| Duración | Solo dentro de esa query | Persiste en la base de datos |
| Visibilidad | Solo tú, en esa query | Todos los usuarios con acceso |
| Cuándo usar | Lógica intermedia en una sola query | Lógica compartida entre muchas queries |

**Regla práctica:** Si vas a usar la misma lógica en más de una query, o si otra persona va a usar esa lógica, usa una vista. Si la lógica es solo un paso intermedio de tu query actual, usa una CTE.

---

## 2. SINTAXIS

### CREATE VIEW: la forma canónica

```sql
CREATE VIEW nombre_vista AS
SELECT ...;
```

El nombre de la vista sigue siendo una convención: `v_` como prefijo (para distinguirla de tablas reales), luego un nombre descriptivo en snake_case.

### DROP VIEW IF EXISTS + CREATE VIEW: la forma del curso

El Playground usa SQLite, que no soporta `CREATE OR REPLACE VIEW`. La forma correcta para este curso — y para cualquier script que deba ser repetible sin errores — es:

```sql
-- Eliminar la vista si ya existe, luego crearla desde cero.
-- Compatible con SQLite y con PostgreSQL.
DROP VIEW IF EXISTS nombre_vista;
CREATE VIEW nombre_vista AS
SELECT ...;
```

Esta secuencia es idempotente: si la vista no existe, el `DROP IF EXISTS` no hace nada y el `CREATE` la crea. Si ya existe, la elimina y la recrea con la lógica actualizada.

### CREATE OR REPLACE VIEW: alternativa en PostgreSQL

En entornos de producción con PostgreSQL, existe una forma compacta que combina ambos pasos:

```sql
-- Solo disponible en PostgreSQL (y otros RDBMS, no en SQLite).
-- Equivalente a DROP + CREATE, pero en una sola instrucción.
CREATE OR REPLACE VIEW nombre_vista AS
SELECT ...;
```

Cuando trabajes en PostgreSQL en producción, puedes usar esta forma. En el Playground y en los ejercicios del curso, siempre usarás `DROP VIEW IF EXISTS` + `CREATE VIEW`.

### Consultar una vista

Exactamente igual que una tabla:

```sql
-- Consulta simple
SELECT * FROM v_funnel_adquisicion;

-- Con filtro
SELECT *
FROM v_funnel_adquisicion
WHERE device_type = 'mobile';

-- Con agregación
SELECT
    device_type,
    COUNT(*) AS total_sesiones
FROM v_funnel_adquisicion
GROUP BY device_type;
```

### Verificar que la vista fue creada

```sql
-- En SQLite: verificar en el catálogo
SELECT name FROM sqlite_master
WHERE type = 'view'
  AND name = 'v_funnel_adquisicion';

-- En PostgreSQL: verificar en information_schema
SELECT table_name FROM information_schema.views
WHERE table_name = 'v_funnel_adquisicion';
```

---

## 3. EJEMPLO PRÁCTICO

### Contexto: Valentina necesita dos vistas para Power BI

El equipo de BI del fondo chileno va a conectar Power BI directamente a la base. Necesitan dos vistas: una de funnel y una de perfil de clientes.

**Vista 1 — v_funnel_adquisicion: una fila por sesión con contexto completo**

```sql
-- Vista base del dashboard de adquisición
-- Una fila por sesión, con el pedido asociado si existe
-- LEFT JOIN: preserva sesiones sin pedido (la mayoría)
-- JOIN por customer_id: el único puente entre sesiones y pedidos
DROP VIEW IF EXISTS v_funnel_adquisicion;
CREATE VIEW v_funnel_adquisicion AS
SELECT
    ws.session_id,
    ws.customer_id,
    ws.campaign_id,
    ws.device_type,
    ws.started_at,
    ws.converted,
    o.order_id,
    o.status            AS order_status,
    -- order_total: suma de los items del pedido (subquery escalar)
    (
        SELECT SUM(oi.quantity * oi.unit_price)
        FROM order_items oi
        WHERE oi.order_id = o.order_id
    )                   AS order_total
FROM website_sessions ws
LEFT JOIN orders o ON o.customer_id = ws.customer_id;
```

Inmediatamente después, una SELECT de validación:

```sql
-- Verificar que la vista devuelve datos y tiene las columnas correctas
SELECT *
FROM v_funnel_adquisicion
LIMIT 5;
```

**Una advertencia sobre esta vista:** Como el JOIN va por `customer_id`, un cliente con 5 sesiones y 3 pedidos genera 15 filas en la vista (5 × 3). Esto es correcto — cada combinación sesión-pedido es una fila. Cuando consultes la vista y necesites contar sesiones únicas o pedidos únicos, usa `COUNT DISTINCT`.

```sql
-- Al consultar la vista: siempre COUNT DISTINCT para evitar inflación
SELECT
    COALESCE(mc.channel, 'organic')                    AS canal,
    COUNT(DISTINCT vf.session_id)                       AS total_sesiones,
    COUNT(DISTINCT vf.order_id)                         AS pedidos_generados,
    ROUND(
        COUNT(DISTINCT vf.order_id) * 100.0
        / NULLIF(COUNT(DISTINCT vf.session_id), 0),
        2
    )                                                   AS tasa_conversion
FROM v_funnel_adquisicion vf
LEFT JOIN marketing_campaigns mc ON mc.campaign_id = vf.campaign_id
GROUP BY COALESCE(mc.channel, 'organic')
ORDER BY tasa_conversion DESC;
```

**Vista 2 — v_clientes_perfil: una fila por cliente con su historial completo**

Esta vista es la que alimentará cualquier análisis de segmentación. Una fila por cliente, con todo lo que necesita saber un analista sobre ese cliente.

> **El problema de la multiplicación silenciosa en JOINs encadenados**
>
> Hay un error muy común al construir esta vista que produce números incorrectos sin ningún mensaje de error: la multiplicación silenciosa por JOIN triple.
>
> Imagina un cliente que tiene 3 ítems en sus pedidos (3 filas en `order_items`) y 4 sesiones en `website_sessions` (4 filas). Si escribes el JOIN directamente así:
>
> ```sql
> -- INCORRECTO: produce 3×4 = 12 filas por este cliente
> FROM customers c
> LEFT JOIN orders o          ON o.customer_id = c.customer_id
> LEFT JOIN order_items oi    ON oi.order_id = o.order_id
> LEFT JOIN website_sessions ws ON ws.customer_id = c.customer_id
> ```
>
> El motor cruza cada una de las 3 filas de `order_items` con cada una de las 4 sesiones: obtienes 12 filas. Cuando aplicas `SUM(oi.quantity * oi.unit_price)`, estás sumando las mismas 3 líneas de pedido 4 veces — el revenue queda multiplicado por 4. El número parece plausible, no hay error, y el dashboard muestra cifras infladas que nadie cuestiona hasta que se comparan con el sistema de pagos.
>
> La regla es: **nunca agregar a través de dos dimensiones independientes en el mismo JOIN**. `order_items` y `website_sessions` son dimensiones independientes de un cliente — ninguna tiene relación directa con la otra. La solución es calcularlas por separado en CTEs y unir los resultados ya agregados.

```sql
DROP VIEW IF EXISTS v_clientes_perfil;
CREATE VIEW v_clientes_perfil AS
WITH revenue_por_cliente AS (
    SELECT
        o.customer_id,
        COUNT(DISTINCT o.order_id)                    AS total_pedidos,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS revenue_total,
        MIN(o.ordered_at)                             AS primer_pedido_at,
        MAX(o.ordered_at)                             AS ultimo_pedido_at
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.order_id
    GROUP BY o.customer_id
),
sesiones_por_cliente AS (
    SELECT
        ws.customer_id,
        COUNT(DISTINCT ws.session_id)                                        AS total_sesiones,
        COUNT(DISTINCT CASE WHEN ws.converted = TRUE THEN ws.session_id END) AS sesiones_convertidas
    FROM website_sessions ws
    GROUP BY ws.customer_id
)
SELECT
    c.customer_id,
    c.country,
    c.registered_at,
    COALESCE(rpc.total_pedidos, 0)        AS total_pedidos,
    COALESCE(rpc.revenue_total, 0)        AS revenue_total,
    rpc.primer_pedido_at,
    rpc.ultimo_pedido_at,
    COALESCE(spc.total_sesiones, 0)       AS total_sesiones,
    COALESCE(spc.sesiones_convertidas, 0) AS sesiones_convertidas
FROM customers c
LEFT JOIN revenue_por_cliente rpc  ON rpc.customer_id = c.customer_id
LEFT JOIN sesiones_por_cliente spc ON spc.customer_id = c.customer_id;
```

Validación:

```sql
-- Confirmar que incluye clientes sin pedidos (revenue_total = 0)
-- y clientes sin sesiones (total_sesiones = 0)
SELECT *
FROM v_clientes_perfil
LIMIT 10;

-- Verificar conteos globales
SELECT
    COUNT(*)                                            AS total_clientes,
    COUNT(CASE WHEN total_pedidos = 0 THEN 1 END)       AS sin_pedidos,
    COUNT(CASE WHEN total_sesiones = 0 THEN 1 END)      AS sin_sesiones,
    ROUND(AVG(revenue_total), 2)                        AS revenue_promedio
FROM v_clientes_perfil;
```

**Por qué `COALESCE(SUM(...), 0)` en revenue_total:** Un cliente sin pedidos tiene NULL en todas las columnas de `order_items` (porque el LEFT JOIN no encontró filas). `SUM(NULL)` = NULL. Pero para este cliente, el revenue no es desconocido — es cero. `COALESCE(..., 0)` convierte ese NULL en 0, que es el valor semánticamente correcto.

---

## 4. CASOS DE USO REALES

**Caso 1 — Vistas base para dashboards de BI (BI Developer, Analytics Engineer)**
Herramientas como Power BI, Tableau y Looker se conectan a tablas y vistas de la base de datos. El equipo de BI no escribe SQL — consulta vistas que alguien construyó. La calidad del dashboard depende directamente de la calidad de las vistas subyacentes. Una vista mal construida (con COUNT en lugar de COUNT DISTINCT, sin manejar NULLs) produce números erróneos que nadie cuestiona hasta que aparece en una reunión de directorio.

**Caso 2 — Estandarización de métricas entre equipos (Data Analyst, Data Engineer)**
Cuando cinco analistas calculan "revenue total" con cinco queries diferentes, obtienes cinco números ligeramente distintos en cada reunión. Una vista centraliza la definición: `revenue_total` es exactamente como está definido en `v_clientes_perfil`, y todos usan esa vista. La discusión deja de ser "¿cuál de los números es correcto?" y pasa a ser "¿qué decidimos que significa revenue total?".

**Caso 3 — Simplificación de queries complejas (Data Analyst)**
Sin la vista `v_clientes_perfil`, un analista que quiera segmentar clientes por revenue necesita escribir un triple LEFT JOIN con cuatro tablas cada vez. Con la vista, la query es: `SELECT * FROM v_clientes_perfil WHERE total_pedidos > 5`. La complejidad está encapsulada — el analista puede enfocarse en el análisis, no en la plomería del JOIN.

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico
**Contexto (Briefing 7.5 — Valentina Torres):** Valentina necesita que crees la vista `v_funnel_adquisicion` para que el equipo de BI del fondo chileno pueda consultarla desde Power BI. La vista debe tener una fila por sesión con el pedido asociado si existe.

Crea la vista `v_funnel_adquisicion` con las columnas: `session_id`, `customer_id`, `campaign_id`, `device_type`, `started_at`, `converted`, `order_id`, `order_status` y `order_total`. Usa `LEFT JOIN` de `website_sessions` a `orders` por `customer_id`. Después de crear la vista, escribe una `SELECT` que muestre las 5 primeras filas como validación.

**Tablas necesarias:** `website_sessions`, `orders`, `order_items`

**Resultado esperado:** La vista se crea sin error. La SELECT de validación devuelve hasta 5 filas. Las filas donde no hay pedido muestran NULL en `order_id`, `order_status` y `order_total`.

**Criterio de éxito:** `DROP VIEW IF EXISTS` antes del `CREATE VIEW`. `LEFT JOIN` por `customer_id`. El `order_total` se calcula con una subquery escalar sobre `order_items`. SELECT de validación incluida.

---

### Ejercicio Intermedio
**Contexto (Briefing 7.6 — Valentina Torres):** Valentina necesita la segunda vista: `v_clientes_perfil`, que tendrá una fila por cliente con todo el perfil necesario para segmentación. Esta vista se usará también en el Capstone.

Crea la vista con las columnas: `customer_id`, `country`, `registered_at`, `total_pedidos`, `revenue_total`, `primer_pedido_at`, `ultimo_pedido_at`, `total_sesiones`, `sesiones_convertidas`. Usa `COALESCE` para que `revenue_total` sea 0 (no NULL) para clientes sin compras. Después de crear la vista, valida consultando los 10 clientes con mayor `revenue_total`.

**Tablas necesarias:** `customers`, `orders`, `order_items`, `website_sessions`

**Resultado esperado:** La vista se crea sin error. La consulta de validación muestra 10 clientes con sus métricas. Clientes sin pedidos aparecen con `revenue_total = 0` y `total_pedidos = 0`.

**Criterio de éxito:** Dos CTEs pre-agregadas (`revenue_por_cliente` y `sesiones_por_cliente`) unidas a `customers` con dos LEFT JOINs separados. `COUNT DISTINCT` en todos los conteos. `COALESCE(SUM(...), 0)` para revenue dentro de la CTE. `COALESCE` en el SELECT final para clientes sin pedidos o sin sesiones.

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
DROP VIEW IF EXISTS v_funnel_adquisicion;
CREATE VIEW v_funnel_adquisicion AS
SELECT
    ws.session_id,
    ws.customer_id,
    ws.campaign_id,
    ws.device_type,
    ws.started_at,
    ws.converted,
    o.order_id,
    o.status          AS order_status,
    (
        SELECT SUM(oi.quantity * oi.unit_price)
        FROM order_items oi
        WHERE oi.order_id = o.order_id
    )                 AS order_total
FROM website_sessions ws
LEFT JOIN orders o ON o.customer_id = ws.customer_id;

-- Validación
SELECT * FROM v_funnel_adquisicion LIMIT 5;
```

**Solución Ejercicio Intermedio:**
```sql
DROP VIEW IF EXISTS v_clientes_perfil;
CREATE VIEW v_clientes_perfil AS
WITH revenue_por_cliente AS (
    SELECT
        o.customer_id,
        COUNT(DISTINCT o.order_id)                    AS total_pedidos,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS revenue_total,
        MIN(o.ordered_at)                             AS primer_pedido_at,
        MAX(o.ordered_at)                             AS ultimo_pedido_at
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.order_id
    GROUP BY o.customer_id
),
sesiones_por_cliente AS (
    SELECT
        ws.customer_id,
        COUNT(DISTINCT ws.session_id)                                        AS total_sesiones,
        COUNT(DISTINCT CASE WHEN ws.converted = TRUE THEN ws.session_id END) AS sesiones_convertidas
    FROM website_sessions ws
    GROUP BY ws.customer_id
)
SELECT
    c.customer_id,
    c.country,
    c.registered_at,
    COALESCE(rpc.total_pedidos, 0)        AS total_pedidos,
    COALESCE(rpc.revenue_total, 0)        AS revenue_total,
    rpc.primer_pedido_at,
    rpc.ultimo_pedido_at,
    COALESCE(spc.total_sesiones, 0)       AS total_sesiones,
    COALESCE(spc.sesiones_convertidas, 0) AS sesiones_convertidas
FROM customers c
LEFT JOIN revenue_por_cliente rpc  ON rpc.customer_id = c.customer_id
LEFT JOIN sesiones_por_cliente spc ON spc.customer_id = c.customer_id;

-- Validación: top 10 clientes por revenue
SELECT *
FROM v_clientes_perfil
ORDER BY revenue_total DESC
LIMIT 10;
```

</details>

---

## 6. ERRORES COMUNES

**Error 1 — GROUP BY incompleto: olvidar columnas no agregadas**

```sql
-- INCORRECTO: country y registered_at no están en el GROUP BY
-- ERROR: column "c.country" must appear in the GROUP BY clause
CREATE VIEW v_clientes_perfil AS
SELECT
    c.customer_id,
    c.country,           -- <- no agregada, debe ir en GROUP BY
    c.registered_at,     -- <- no agregada, debe ir en GROUP BY
    COUNT(DISTINCT o.order_id) AS total_pedidos
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
GROUP BY c.customer_id;  -- <- falta country y registered_at

-- CORRECTO:
GROUP BY c.customer_id, c.country, c.registered_at;
```

Error mental: pensar que `customer_id` es la clave primaria y por eso las demás columnas de esa tabla son "dependientes". El motor SQL no infiere esa relación — exige que toda columna en el SELECT esté en el GROUP BY o sea un agregado.

**Error 2 — Consultar una vista con COUNT(*) en lugar de COUNT DISTINCT**

```sql
-- INCORRECTO al consultar v_funnel_adquisicion
-- Un cliente con 5 sesiones y 3 pedidos produce 15 filas en la vista
SELECT
    COUNT(*) AS total_sesiones  -- <- cuenta las 15 filas, no las 5 sesiones
FROM v_funnel_adquisicion;

-- CORRECTO
SELECT
    COUNT(DISTINCT session_id) AS total_sesiones,
    COUNT(DISTINCT order_id)   AS pedidos_generados
FROM v_funnel_adquisicion;
```

Error mental: asumir que la vista ya "corrigió" la multiplicación. La vista preserva la relación N:N — esa es exactamente su función (mostrar todas las combinaciones). La responsabilidad del COUNT DISTINCT está en quien consulta la vista.

**Error 3 — Usar NULL en lugar de COALESCE para clientes sin datos**

```sql
-- INCORRECTO: revenue_total = NULL para clientes sin pedidos
-- El analista del fondo no puede sumar NULLs correctamente
SUM(oi.quantity * oi.unit_price) AS revenue_total

-- CORRECTO: revenue_total = 0 para clientes sin pedidos
COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS revenue_total
```

Error mental: confundir "dato desconocido" (NULL) con "valor cero". Para un cliente que nunca compró, el revenue no es desconocido — es cero. COALESCE expresa esa semántica correctamente.

**Error 4 — CREATE VIEW sin DROP VIEW IF EXISTS en SQLite**

```sql
-- INCORRECTO en SQLite: si la vista ya existe, da error
CREATE VIEW v_funnel_adquisicion AS SELECT ...;
-- ERROR: table v_funnel_adquisicion already exists

-- CORRECTO en SQLite: eliminar primero si existe
DROP VIEW IF EXISTS v_funnel_adquisicion;
CREATE VIEW v_funnel_adquisicion AS SELECT ...;

-- Alternativa en PostgreSQL (no disponible en SQLite):
CREATE OR REPLACE VIEW v_funnel_adquisicion AS SELECT ...;
```

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

Tienes las dos vistas que necesita Valentina. Pero hay una pregunta que Marco preguntó en Slack y que las vistas aún no responden: "¿de dónde vienen los clientes que realmente gastan plata?"

Para responderla no basta con saber qué canal tuvo más sesiones. Necesitas identificar, para cada cliente, **cuál fue la primera sesión que registró** — porque ese es el canal que lo adquirió. Luego cruzas eso con su revenue total. Eso es atribución de primer contacto (first-touch attribution), y combina ROW_NUMBER (que ya conoces del Nivel 5) con COALESCE y CASE WHEN para segmentar clientes por valor de negocio.
