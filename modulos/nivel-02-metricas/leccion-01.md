# Nivel 2 — Métricas de Negocio
## Lección 1: Funciones de Agregación — COUNT, SUM, AVG, MIN, MAX

> Tablas disponibles en este nivel: `customers`, `categories`, `products`, `orders`

---

## 1. INTRODUCCIÓN CONCEPTUAL

### El momento en que SQL deja de ser exploración y se vuelve análisis

Llevas dos semanas en ShopSphere. Valentina acaba de entrar a tu espacio de trabajo en Slack:

> *"Marco tiene reunión con los inversores el viernes. Necesita tres números: cuántos pedidos tuvimos en total, cuánto revenue generamos en el año, y cuál es el ticket promedio por pedido. ¿Lo puedes tener para mañana?"*

Con lo que sabes hasta ahora, puedes ver todos los pedidos, filtrarlos, ordenarlos. Pero calcular el total, sumar el revenue, encontrar el promedio — eso requiere una operación diferente: **colapsar múltiples filas en un solo número**.

Eso es exactamente lo que hacen las funciones de agregación. En lugar de operar fila por fila (como las funciones escalares del Nivel 1), toman un conjunto de filas y producen un único valor de resumen.

**¿Por qué existen?** Porque las preguntas de negocio casi nunca son sobre filas individuales. Nadie le pregunta a Valentina "¿cuánto gastó el cliente 47 en el pedido 234?". Le preguntan: "¿cuánto gastamos en total?", "¿cuál es el promedio?", "¿cuál fue el máximo?". Esas son preguntas de agregación.

**La analogía de la calculadora del cajero:** Cuando el cajero suma tu compra en el supermercado, no te dice el precio de cada ítem — te dice el total. `SUM` hace exactamente eso, pero sobre una columna completa de una tabla. `COUNT` te dice cuántos ítems había. `AVG` te dice el precio promedio. `MIN` y `MAX` te dicen el más barato y el más caro.

---

## 2. SINTAXIS

### Las cinco funciones de agregación fundamentales

```sql
COUNT(*)              -- cuenta el total de filas
COUNT(columna)        -- cuenta filas donde la columna NO es NULL
COUNT(DISTINCT col)   -- cuenta valores únicos no-NULL

SUM(columna)          -- suma todos los valores numéricos
AVG(columna)          -- promedio de todos los valores numéricos
MIN(columna)          -- el valor mínimo (funciona con números, fechas, texto)
MAX(columna)          -- el valor máximo (funciona con números, fechas, texto)
```

### Forma básica — agregación de toda la tabla

```sql
SELECT COUNT(*) AS total_pedidos
FROM orders;
```

```sql
SELECT
    COUNT(*)            AS total_pedidos,
    COUNT(customer_id)  AS pedidos_con_cliente,
    MIN(ordered_at)     AS primer_pedido,
    MAX(ordered_at)     AS ultimo_pedido
FROM orders;
```

### Combinada con WHERE — agregación filtrada

```sql
-- Solo pedidos entregados
SELECT COUNT(*) AS pedidos_entregados
FROM orders
WHERE status = 'delivered';
```

### COUNT(*) vs COUNT(columna) — la diferencia crítica

```sql
-- COUNT(*): cuenta TODAS las filas, incluyendo las que tienen NULLs
SELECT COUNT(*) FROM customers;               -- 500 (todas las filas)

-- COUNT(columna): cuenta filas donde esa columna NO es NULL
SELECT COUNT(city) FROM customers;            -- menor a 500 si hay NULLs en city

-- COUNT(DISTINCT columna): cuenta valores únicos no-NULL
SELECT COUNT(DISTINCT country) FROM customers;  -- número de países distintos
```

---

## 3. EJEMPLO PRÁCTICO

### Contexto: Los tres números que Marco necesita para la reunión de inversores

**Query 1 — El dashboard básico de ShopSphere (una sola query, varios números)**

```sql
SELECT
    COUNT(*)                        AS total_pedidos,
    COUNT(DISTINCT customer_id)     AS clientes_con_pedidos,
    MIN(ordered_at)                 AS primer_pedido_fecha,
    MAX(ordered_at)                 AS ultimo_pedido_fecha
FROM orders;
```

Output:

| total_pedidos | clientes_con_pedidos | primer_pedido_fecha | ultimo_pedido_fecha |
|---|---|---|---|
| 2000 | 458 | 2023-06-01 | 2024-12-01 |

Valentina lee el resultado: "2.000 pedidos totales. 458 clientes distintos han pedido algo en algún momento — tenemos 500 registrados, así que 42 nunca compraron. Marco va a preguntar sobre esos 42 eventualmente."

**Query 2 — Total de pedidos entregados vs. cancelados (por status)**

```sql
SELECT
    COUNT(*) FILTER (WHERE status = 'delivered')    AS entregados,
    COUNT(*) FILTER (WHERE status = 'cancelled')    AS cancelados,
    COUNT(*) FILTER (WHERE status = 'pending')      AS pendientes,
    COUNT(*) FILTER (WHERE status = 'shipped')      AS en_transito
FROM orders;
```

Nota: La sintaxis `FILTER (WHERE ...)` es PostgreSQL. Es más legible que varias subqueries.

Output (aproximado según el seed):

| entregados | cancelados | pendientes | en_transito |
|---|---|---|---|
| 1480 | 287 | 145 | 88 |

**Query 3 — Precios del catálogo: mínimo, máximo, promedio**

```sql
SELECT
    COUNT(*)                AS total_productos,
    COUNT(*) FILTER (WHERE is_active = TRUE)  AS productos_activos,
    MIN(price)              AS precio_minimo,
    MAX(price)              AS precio_maximo,
    ROUND(AVG(price), 2)    AS precio_promedio
FROM products;
```

Output:

| total_productos | productos_activos | precio_minimo | precio_maximo | precio_promedio |
|---|---|---|---|---|
| 80 | 80 | 9.99 | 549.99 | 61.24 |

Marco mira el ticket promedio de $61.24 y dice: "¿Eso incluye los productos baratos como los cables? ¿Cuál es el promedio si excluimos todo lo que cuesta menos de $20?" Esa es exactamente la pregunta que WHERE resuelve:

```sql
SELECT ROUND(AVG(price), 2) AS precio_promedio_sin_basicos
FROM products
WHERE price >= 20
  AND is_active = TRUE;
```

**Query 4 — Conteo de clientes por estado de ciudad (diagnóstico de datos)**

```sql
SELECT
    COUNT(*)            AS total_clientes,
    COUNT(city)         AS con_ciudad,
    COUNT(*) - COUNT(city)  AS sin_ciudad
FROM customers;
```

Output:

| total_clientes | con_ciudad | sin_ciudad |
|---|---|---|
| 500 | 292 | 208 |

"208 clientes sin ciudad — el 41.6% de la base. Diego va a querer saber eso antes de segmentar por geografía."

---

## 4. CASOS DE USO REALES

**Caso 1 — KPIs ejecutivos para reuniones de inversores**
Marco necesita números de alto nivel para el viernes: total de pedidos, revenue del año, ticket promedio, clientes activos. Todas esas métricas son funciones de agregación simples aplicadas a las tablas correctas. Un analista puede producir el "deck de números" de una reunión de inversores en menos de 10 minutos con las herramientas de este capítulo.
*Rol que lo usa: Data Analyst, Business Analyst.*

**Caso 2 — Control de calidad de datos**
Antes de cualquier análisis serio, Valentina verifica la completitud de los datos: `COUNT(*) vs COUNT(columna_crítica)` detecta cuántos registros tienen valores faltantes. Si el 40% de los clientes no tiene ciudad, cualquier análisis geográfico estará distorsionado — y hay que saberlo antes de presentar el reporte.
*Rol que lo usa: Data Analyst, Data Engineer.*

**Caso 3 — Benchmarks de producto y pricing**
Ana de Finanzas necesita saber si el rango de precios de ShopSphere es competitivo: `MIN(price)`, `MAX(price)`, `AVG(price)` por categoría dan el marco de referencia. `AVG` con un `WHERE` filtrando outliers da el promedio "real" sin distorsión por productos extremos.
*Rol que lo usa: Finance Analyst, Product Manager.*

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico
**Contexto:** El equipo de producto quiere saber cuántos productos tiene ShopSphere en total y cuántos están activos. También quieren el precio mínimo y máximo del catálogo activo.

Escribe una query que retorne en una sola fila: el total de productos (activos e inactivos), el total de productos activos, el precio mínimo y el precio máximo de los productos activos.

**Resultado esperado:** Una sola fila con cuatro columnas con alias claros.

**Criterio de éxito:** El total de productos es 80. Los valores de precio mínimo y máximo corresponden solo a productos activos.

---

### Ejercicio Intermedio
**Contexto:** Marco quiere entender la distribución de pedidos en ShopSphere. Necesita saber:
1. El total de pedidos en la base de datos
2. Cuántos pedidos distintos de customers diferentes hay (para detectar si hay clientes que piden muchas veces)
3. El pedido más antiguo y el más reciente (fechas)
4. Cuántos pedidos NO tienen status 'delivered' (los que no llegaron al destino final)

Todo en una sola query.

**Resultado esperado:** Una sola fila con al menos 4 columnas, todas con alias descriptivos.

**Criterio de éxito:** Los números son coherentes entre sí. El conteo de pedidos con status distinto de 'delivered' debe ser menor que el total.

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
SELECT
    COUNT(*)                                    AS total_productos,
    COUNT(*) FILTER (WHERE is_active = TRUE)    AS productos_activos,
    MIN(price) FILTER (WHERE is_active = TRUE)  AS precio_minimo,
    MAX(price) FILTER (WHERE is_active = TRUE)  AS precio_maximo
FROM products;
```

Alternativa sin FILTER (más portable entre motores SQL):
```sql
SELECT COUNT(*) AS total_productos FROM products;

SELECT
    COUNT(*)    AS productos_activos,
    MIN(price)  AS precio_minimo,
    MAX(price)  AS precio_maximo
FROM products
WHERE is_active = TRUE;
```

**Solución Ejercicio Intermedio:**
```sql
SELECT
    COUNT(*)                        AS total_pedidos,
    COUNT(DISTINCT customer_id)     AS clientes_distintos,
    MIN(ordered_at)                 AS pedido_mas_antiguo,
    MAX(ordered_at)                 AS pedido_mas_reciente,
    COUNT(*) FILTER (WHERE status <> 'delivered')  AS no_entregados
FROM orders;
```

</details>

---

## 6. ERRORES COMUNES

**Error 1 — Mezclar columnas normales con funciones de agregación sin GROUP BY**

```sql
-- INCORRECTO
SELECT country, COUNT(*)
FROM customers;
```

Error típico: `ERROR: column "customers.country" must appear in the GROUP BY clause or be used in an aggregate function`

Cuando usas una función de agregación (`COUNT`), todas las columnas que no están dentro de una función de agregación **deben ir en GROUP BY**. Si quieres `country` y `COUNT(*)`, necesitas `GROUP BY country` — que es el tema de la Lección 2 de este nivel.

**Error 2 — COUNT(*) vs COUNT(columna) — esperar el mismo resultado**

```sql
-- Si city tiene 208 NULLs, estos dan resultados diferentes:
SELECT COUNT(*) FROM customers;       -- 500 (todas las filas)
SELECT COUNT(city) FROM customers;    -- 292 (solo las no-NULL)
```

Muchos estudiantes asumen que `COUNT(columna)` y `COUNT(*)` dan el mismo número. Solo es así cuando la columna no tiene NULLs.

**Error 3 — AVG de enteros truncado inesperadamente**

```sql
-- En algunos motores (no PostgreSQL, pero sí SQLite con columnas INTEGER):
SELECT AVG(price) FROM products;
-- price es DECIMAL(10,2) en ShopSphere, así que PostgreSQL devuelve NUMERIC correctamente.
-- Pero si la columna fuera INTEGER pura, algunos motores truncan:
-- AVG de [1, 2, 3] puede dar 2 en lugar de 2.0

-- La solución portable es hacer cast explícito:
SELECT AVG(price::DECIMAL) FROM products;
```

En PostgreSQL esto no es problema para columnas DECIMAL como `price` en ShopSphere, porque `AVG` siempre retorna NUMERIC. Pero es una trampa real en otros motores cuando la columna es de tipo entero. La solución portable es `AVG(columna::DECIMAL)` o `AVG(CAST(columna AS DECIMAL))`.

**Error 4 — Filtrar después de agregar usando WHERE en lugar de HAVING**

```sql
-- INCORRECTO: WHERE no puede usar funciones de agregación
SELECT status, COUNT(*)
FROM orders
WHERE COUNT(*) > 100   -- ERROR: no puedes filtrar agregaciones con WHERE
GROUP BY status;
```

Error típico: `ERROR: aggregate functions are not allowed in WHERE`

Para filtrar resultados de agregaciones necesitas `HAVING` — que es exactamente el tema de la Lección 3.

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

Con las funciones de agregación puedes calcular totales, promedios y extremos. Pero hasta ahora los has aplicado a toda la tabla o con un filtro simple. Valentina ya tiene una pregunta más sofisticada: "Dame el conteo de pedidos **por status**" — no el total global, sino uno por cada valor de status. Y luego: "Dame el revenue **por país**", "el precio promedio **por categoría**".

Esa es la función de `GROUP BY`: dividir la tabla en grupos según un criterio, y aplicar la función de agregación a cada grupo por separado. `GROUP BY` transforma un número global en una tabla de métricas — y es el corazón del análisis de datos empresarial.
