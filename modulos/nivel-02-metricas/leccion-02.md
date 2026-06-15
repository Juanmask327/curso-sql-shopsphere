# Nivel 2 — Métricas de Negocio
## Lección 2: GROUP BY — Métricas por segmento

> Tablas disponibles en este nivel: `customers`, `categories`, `products`, `orders`

---

## 1. INTRODUCCIÓN CONCEPTUAL

### De "el total" a "el total por X"

Valentina entra a tu escritorio virtual con un mensaje más largo que de costumbre:

> *"Los números globales que me mandaste están bien para Marco. Pero el viernes también va a preguntar: ¿cuáles son los países con más pedidos? ¿Cuántos pedidos están en cada estado (delivered, cancelled, etc.)? ¿Cuántos clientes se registraron por mes? Eso es lo que realmente les interesa a los inversores — ver la distribución, no solo el total."*

Lo que Valentina pide es el mismo `COUNT(*)` de la Lección 1, pero aplicado a un subconjunto diferente de filas para cada respuesta. Para el país México: count de pedidos de México. Para Colombia: count de pedidos de Colombia. Para cada mes: count de clientes de ese mes.

Podrías escribir una query separada con `WHERE country = 'Mexico'`, otra con `WHERE country = 'Colombia'`, etc. Pero eso escala mal: si hay 15 países, son 15 queries.

`GROUP BY` hace todo eso en una sola query. Le dice a la base de datos: "divide las filas en grupos según este criterio, y aplica la función de agregación a cada grupo por separado".

**La analogía de las carpetas:** Imagina que tienes 2.000 facturas mezcladas en una pila. `GROUP BY status` es como organizarlas en carpetas por estado (una carpeta "delivered", una "cancelled", etc.) y luego contar cuántas hay en cada carpeta. No copias facturas — las redistribuyes temporalmente para contarlas por grupo.

---

## 2. SINTAXIS

### Forma canónica

```sql
SELECT columna_de_grupo, FUNCION_AGREGACION(columna)
FROM tabla
WHERE condicion_opcional
GROUP BY columna_de_grupo
ORDER BY orden_opcional;
```

**La regla fundamental del GROUP BY:**
En el `SELECT`, toda columna que NO esté dentro de una función de agregación **debe aparecer en el GROUP BY**. No hay excepciones.

```sql
-- CORRECTO: country está en GROUP BY
SELECT country, COUNT(*) AS total_clientes
FROM customers
GROUP BY country;

-- INCORRECTO: country en SELECT pero no en GROUP BY
SELECT country, COUNT(*) AS total_clientes
FROM customers;  -- ERROR
```

### GROUP BY con múltiples columnas

```sql
-- Agrupa por la combinación de country + año de registro
SELECT
    country,
    EXTRACT(YEAR FROM registered_at)  AS anio,
    COUNT(*)                           AS clientes_ese_anio
FROM customers
GROUP BY country, EXTRACT(YEAR FROM registered_at)
ORDER BY country, anio;
```

Cada combinación única de (country, año) forma un grupo separado.

### GROUP BY con expresiones

```sql
-- Puedes agrupar por expresiones, no solo columnas
SELECT
    DATE_TRUNC('month', ordered_at)  AS mes,
    COUNT(*)                          AS pedidos_del_mes
FROM orders
GROUP BY DATE_TRUNC('month', ordered_at)
ORDER BY mes;
```

### GROUP BY y el orden de evaluación en SQL

El orden lógico de evaluación de una query es:
1. `FROM` — identifica las tablas
2. `WHERE` — filtra filas individuales
3. `GROUP BY` — forma los grupos
4. `HAVING` — filtra grupos (Lección 3)
5. `SELECT` — calcula las columnas del resultado
6. `ORDER BY` — ordena el resultado
7. `LIMIT/OFFSET` — corta el resultado

**Consecuencia práctica:** No puedes usar un alias definido en `SELECT` dentro de `GROUP BY` (porque `SELECT` se evalúa después). En PostgreSQL esto está permitido como extensión, pero no es estándar SQL:

```sql
-- En PostgreSQL funciona, pero no es estándar:
SELECT DATE_TRUNC('month', ordered_at) AS mes, COUNT(*) AS total
FROM orders
GROUP BY mes;  -- usa el alias

-- La forma estándar y portable:
SELECT DATE_TRUNC('month', ordered_at) AS mes, COUNT(*) AS total
FROM orders
GROUP BY DATE_TRUNC('month', ordered_at);  -- repite la expresión
```

---

## 3. EJEMPLO PRÁCTICO

### Contexto: La distribución que los inversores quieren ver

**Query 1 — Pedidos por status (la pregunta más obvia sobre orders)**

```sql
-- Version que puedes escribir ahora (Nivel 2):
SELECT
    status,
    COUNT(*) AS total_pedidos
FROM orders
GROUP BY status
ORDER BY total_pedidos DESC;
```

-- Adelanto (Nivel 5 - Window Functions): para agregar el % del total en la misma query:
-- ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS pct_del_total

Output (aproximado):

| status | total_pedidos |
|---|---|
| delivered | 1480 |
| cancelled | 287 |
| pending | 145 |
| shipped | 88 |

"El 74% de los pedidos fueron entregados", dice Valentina. "Marco va a preguntar por qué el 14% se canceló. Eso es una tarea para el análisis de clientes que viene después."

**Query 2 — Clientes registrados por mes (cohortes de adquisición)**

```sql
SELECT
    DATE_TRUNC('month', registered_at)  AS mes_registro,
    COUNT(*)                             AS clientes_nuevos
FROM customers
GROUP BY DATE_TRUNC('month', registered_at)
ORDER BY mes_registro;
```

Output (primeras 4 filas):

| mes_registro | clientes_nuevos |
|---|---|
| 2023-06-01 | 12 |
| 2023-07-01 | 18 |
| 2023-08-01 | 22 |
| 2023-09-01 | 31 |

Sofía mira esto y dice: "noviembre 2024 tuvo un pico de clientes nuevos, ¿verdad? Eso fue el Black Friday. ¿Cuántos se registraron ese mes?"

```sql
SELECT COUNT(*) AS clientes_noviembre_2024
FROM customers
WHERE registered_at >= '2024-11-01'
  AND registered_at < '2024-12-01';
```

**Query 3 — Conteo de productos activos por categoría**

```sql
SELECT
    category_id,
    COUNT(*)        AS total_productos,
    MIN(price)      AS precio_minimo,
    MAX(price)      AS precio_maximo,
    ROUND(AVG(price), 2) AS precio_promedio
FROM products
WHERE is_active = TRUE
GROUP BY category_id
ORDER BY total_productos DESC;
```

Output:

| category_id | total_productos | precio_minimo | precio_maximo | precio_promedio |
|---|---|---|---|---|
| 1 | 15 | 14.99 | 549.99 | 112.49 |
| 5 | 10 | 14.99 | 89.99 | 57.99 |
| 2 | 8 | 34.99 | 79.99 | 52.49 |

Marco ve esto y pregunta: "¿Por qué me muestras category_id y no el nombre de la categoría?" Valentina responde: "porque todavía no hemos unido las dos tablas. Eso es el Nivel 3, los JOINs." Pero por ahora puedes cruzar el ID con la tabla `categories` manualmente.

**Query 4 — Pedidos por año y trimestre (análisis temporal)**

```sql
SELECT
    EXTRACT(YEAR FROM ordered_at)     AS anio,
    EXTRACT(QUARTER FROM ordered_at)  AS trimestre,
    COUNT(*)                           AS pedidos,
    COUNT(DISTINCT customer_id)        AS clientes_distintos
FROM orders
GROUP BY
    EXTRACT(YEAR FROM ordered_at),
    EXTRACT(QUARTER FROM ordered_at)
ORDER BY anio, trimestre;
```

Output:

| anio | trimestre | pedidos | clientes_distintos |
|---|---|---|---|
| 2023 | 2 | 45 | 43 |
| 2023 | 3 | 198 | 182 |
| 2023 | 4 | 312 | 274 |
| 2024 | 1 | 287 | 251 |
| 2024 | 2 | 334 | 298 |
| 2024 | 3 | 378 | 331 |
| 2024 | 4 | 446 | 387 |

El crecimiento trimestre a trimestre es visible directamente en los datos. Valentina sonríe: "esto es lo que Marco necesitaba. La tendencia es clara."

---

## 4. CASOS DE USO REALES

**Caso 1 — Distribución de ventas para reportes estratégicos**
Marco quiere saber en qué países está creciendo ShopSphere. `GROUP BY country` aplicado sobre `orders` da el conteo de pedidos por país. Combinado con `COUNT(DISTINCT customer_id)`, da también la base de clientes activa por país. En diez líneas de SQL, se produce el insumo para una decisión de inversión geográfica.
*Rol que lo usa: Data Analyst, Business Analyst.*

**Caso 2 — Análisis de cohortes de adquisición**
`GROUP BY DATE_TRUNC('month', registered_at)` sobre `customers` muestra cuántos clientes nuevos llegaron cada mes. Valentina usa esto para evaluar si las campañas de marketing de Sofía están trayendo clientes. El pico de noviembre 2024 (Black Friday) debería ser claramente visible en los datos y confirmar que la campaña funcionó.
*Rol que lo uso: Growth Analyst, Marketing Analyst.*

**Caso 3 — Segmentación de catálogo para pricing**
`GROUP BY category_id` sobre `products` con `MIN/MAX/AVG(price)` da el rango de precios de cada categoría. Ana de Finanzas usa esto para verificar que los márgenes por categoría son coherentes con la estrategia de pricing. Los outliers (un producto muy caro o muy barato dentro de una categoría) son visibles inmediatamente.
*Rol que lo usa: Finance Analyst, Product Manager.*

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico
**Contexto:** Sofía está preparando un reporte de distribución geográfica de la base de clientes para presentarlo en la reunión de marketing del jueves.

Escribe una query que muestre, para cada país, el número de clientes registrados. Ordena el resultado de mayor a menor número de clientes.

**Resultado esperado:** Una fila por cada país presente en la tabla `customers`, con el conteo de clientes de ese país. El país con más clientes aparece primero.

**Criterio de éxito:** El número total de clientes si sumas todos los conteos debe ser 500. Cada país aparece exactamente una vez. El ordenamiento es descendente.

---

### Ejercicio Intermedio
**Contexto:** Valentina quiere un análisis de la actividad de pedidos de ShopSphere por año y status. Necesita saber, para cada combinación de año y status de pedido: cuántos pedidos hubo y cuántos clientes distintos realizaron esos pedidos. Solo quiere ver los años 2023 y 2024, y ordena el resultado por año y luego por cantidad de pedidos descendente.

**Resultado esperado:** Múltiples filas combinando (anio, status). Cada fila tiene el año, el status, el conteo de pedidos y el conteo de clientes distintos. Máximo 8 combinaciones (4 status x 2 años), aunque pueden ser menos si alguna combinación no existe.

**Criterio de éxito:** Hay exactamente dos valores en la columna de año (2023 y 2024). Los status son solo los que existen en la tabla. El conteo de clientes distintos es siempre menor o igual al conteo de pedidos.

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
SELECT
    country,
    COUNT(*) AS total_clientes
FROM customers
GROUP BY country
ORDER BY total_clientes DESC;
```

**Solución Ejercicio Intermedio:**
```sql
SELECT
    EXTRACT(YEAR FROM ordered_at)   AS anio,
    status,
    COUNT(*)                         AS total_pedidos,
    COUNT(DISTINCT customer_id)      AS clientes_distintos
FROM orders
WHERE EXTRACT(YEAR FROM ordered_at) IN (2023, 2024)
GROUP BY
    EXTRACT(YEAR FROM ordered_at),
    status
ORDER BY anio ASC, total_pedidos DESC;
```

</details>

---

## 6. ERRORES COMUNES

**Error 1 — Columna en SELECT que no está en GROUP BY**

```sql
-- INCORRECTO
SELECT country, city, COUNT(*)
FROM customers
GROUP BY country;
-- ERROR: column "customers.city" must appear in the GROUP BY clause
```

`city` está en el SELECT pero no en el GROUP BY. Cada "grupo" de México podría tener múltiples ciudades — ¿cuál mostraría la base de datos? Como no sabe, rechaza la query. Soluciones: agregar `city` al GROUP BY (más grupos) o usar `MAX(city)` o `MIN(city)` para colapsar.

**Error 2 — Ordenar por un alias que no funciona en GROUP BY**

```sql
-- Confusión frecuente: el alias SÍ funciona en ORDER BY pero NO en GROUP BY estándar
SELECT DATE_TRUNC('month', ordered_at) AS mes, COUNT(*) AS pedidos
FROM orders
GROUP BY mes        -- puede funcionar en PostgreSQL pero no es estándar
ORDER BY mes;       -- esto SÍ es estándar y funciona
```

En PostgreSQL los alias en GROUP BY están permitidos como extensión. En MySQL 5.7+ también. En SQL Server no. Para código portable, repite la expresión en GROUP BY.

**Error 3 — GROUP BY sin función de agregación (resultado inesperado)**

```sql
-- VÁLIDO pero posiblemente no lo que quieres
SELECT country
FROM customers
GROUP BY country;
```

Esto funciona — es equivalente a `SELECT DISTINCT country`. Pero generalmente cuando usas GROUP BY quieres una función de agregación. Si solo quieres valores únicos, usa `DISTINCT` — es más claro para quien lee el código.

**Error 4 — Confundir WHERE y HAVING para filtrar grupos**

```sql
-- INCORRECTO: WHERE no puede filtrar resultados de funciones de agregación
SELECT country, COUNT(*) AS total
FROM customers
GROUP BY country
WHERE COUNT(*) > 10;   -- ERROR: WHERE se evalúa ANTES de GROUP BY
```

`WHERE` filtra filas individuales antes de que se formen los grupos. Para filtrar los grupos después de formados (por ejemplo, "países con más de 10 clientes"), necesitas `HAVING`. Ese es exactamente el tema de la próxima lección.

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

`GROUP BY` te permite ver la distribución: cuántos pedidos por país, cuántos clientes por mes, cuántos productos por categoría. Pero ahora Valentina tiene una pregunta que `GROUP BY` solo no puede responder: "Muéstrame solo los países que tienen más de 20 clientes" o "Dame solo los meses donde tuvimos más de 100 pedidos".

Para eso existe `HAVING`: un filtro que se aplica **después** de que los grupos están formados. Es el `WHERE` de las agregaciones. Y entender la diferencia entre `WHERE` (filtra filas antes de agrupar) y `HAVING` (filtra grupos después de agrupar) es uno de los conceptos más importantes del SQL para análisis de datos.
