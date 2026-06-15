# Nivel 2 — Métricas de Negocio
## Lección 3: HAVING — Filtrar sobre grupos formados

> Tablas disponibles en este nivel: `customers`, `categories`, `products`, `orders`

---

## 1. INTRODUCCIÓN CONCEPTUAL

### El problema que WHERE no puede resolver

Valentina te acaba de mandar esta tarea:

> *"Del análisis de países que me mandaste, Marco solo quiere ver los países con más de 20 clientes. Los demás no son relevantes para la presentación."*

Tienes esta query del ejercicio anterior:
```sql
SELECT country, COUNT(*) AS total_clientes
FROM customers
GROUP BY country;
```

Tu primer instinto es agregar un `WHERE`:
```sql
-- INTENTO (que va a fallar)
SELECT country, COUNT(*) AS total_clientes
FROM customers
WHERE COUNT(*) > 20   -- esto no funciona
GROUP BY country;
```

El problema: `WHERE` se evalúa **antes** de que `GROUP BY` forme los grupos. En el momento en que `WHERE` intenta filtrar, el `COUNT(*)` todavía no existe — los grupos no se han calculado. La base de datos no puede filtrar por un valor que aún no ha calculado.

`HAVING` resuelve esto. Es un filtro que se aplica **después** de que los grupos están formados y las funciones de agregación están calculadas.

**La analogía de las carpetas (continuación de la Lección 2):** Ya organizaste las facturas en carpetas por país y contaste cuántas hay en cada una. `HAVING COUNT(*) > 20` es cuando vas y tiras al archivo las carpetas con 20 o menos — las dejas fuera del reporte. Ese paso de descarte solo puede ocurrir **después** de haber contado.

**La distinción más importante del Nivel 2:**
- `WHERE` filtra filas individuales **antes** de agrupar
- `HAVING` filtra grupos **después** de agrupar

---

## 2. SINTAXIS

### Forma canónica

```sql
SELECT columna_de_grupo, FUNCION_AGREGACION(columna) AS alias
FROM tabla
WHERE condicion_de_fila_opcional
GROUP BY columna_de_grupo
HAVING condicion_de_agregacion
ORDER BY orden_opcional;
```

`HAVING` siempre va después de `GROUP BY` y antes de `ORDER BY`.

### Lo que puede ir en HAVING

```sql
-- Condición con función de agregación
HAVING COUNT(*) > 100
HAVING SUM(price) >= 1000
HAVING AVG(price) BETWEEN 50 AND 200
HAVING MAX(price) <> MIN(price)   -- grupos donde no todos los precios son iguales

-- Múltiples condiciones
HAVING COUNT(*) > 50 AND AVG(price) > 100
```

### WHERE y HAVING juntos — el patrón más útil

```sql
-- WHERE filtra primero (elimina filas irrelevantes antes de calcular)
-- HAVING filtra después (elimina grupos que no cumplen el umbral)
SELECT
    country,
    COUNT(*) AS clientes_activos
FROM customers
WHERE registered_at >= '2024-01-01'   -- solo clientes de 2024
GROUP BY country
HAVING COUNT(*) > 5                    -- solo países con más de 5 clientes de 2024
ORDER BY clientes_activos DESC;
```

Este patrón es el que Valentina usa en el 80% de sus análisis de segmentación.

### HAVING sin GROUP BY (caso especial)

```sql
-- Filtra el resultado agregado de toda la tabla
SELECT COUNT(*) AS total_pedidos
FROM orders
HAVING COUNT(*) > 1000;
-- Muestra el resultado solo si hay más de 1000 pedidos; si no, devuelve 0 filas
```

Útil pero poco frecuente. Más común en validaciones de datos.

---

## 3. EJEMPLO PRÁCTICO

### Contexto: Valentina filtra los análisis para hacer los reportes de Marco presentables

**Query 1 — Países con más de 20 clientes (el pedido original)**

```sql
SELECT
    country,
    COUNT(*) AS total_clientes
FROM customers
GROUP BY country
HAVING COUNT(*) > 20
ORDER BY total_clientes DESC;
```

Output (aproximado):

| country | total_clientes |
|---|---|
| Mexico | 68 |
| Colombia | 54 |
| Venezuela | 52 |
| Argentina | 41 |
| Peru | 39 |
| USA | 37 |
| Chile | 35 |

Valentina dice: "perfecto. Esos 7 países son el núcleo del negocio. Para la presentación de Marco, el resto son mercados incipientes."

**Query 2 — Categorías con precio promedio mayor a $60 (pricing analysis)**

```sql
SELECT
    category_id,
    COUNT(*)            AS productos_activos,
    ROUND(AVG(price), 2) AS precio_promedio
FROM products
WHERE is_active = TRUE
GROUP BY category_id
HAVING AVG(price) > 60
ORDER BY precio_promedio DESC;
```

Output:

| category_id | productos_activos | precio_promedio |
|---|---|---|
| 1 | 15 | 112.49 |
| 3 | 7 | 109.99 |
| 9 | 6 | 79.99 |
| 10 | 5 | 62.99 |

Ana de Finanzas mira esto: "Las categorías 1 (Electronics) y 3 (Wearables) tienen los tickets más altos. ¿Cuántos pedidos vienen de esas categorías? Eso es lo que necesito para el análisis de margen." — esa pregunta requiere `order_items`, que se desbloquea en el Nivel 3.

**Query 3 — WHERE + HAVING: clientes de 2024 por país, solo países con 10+ clientes nuevos**

```sql
SELECT
    country,
    COUNT(*)  AS clientes_nuevos_2024
FROM customers
WHERE registered_at >= '2024-01-01'
  AND registered_at < '2025-01-01'
GROUP BY country
HAVING COUNT(*) >= 10
ORDER BY clientes_nuevos_2024 DESC;
```

La diferencia entre este resultado y el sin `WHERE`: el total sin filtro incluye todos los clientes históricos. Con `WHERE`, solo cuenta los de 2024. Con `HAVING`, solo muestra los países que tienen al menos 10 clientes nuevos ese año específico.

**Query 4 — Meses con más de 100 pedidos (detección de picos de actividad)**

```sql
SELECT
    DATE_TRUNC('month', ordered_at)  AS mes,
    COUNT(*)                          AS pedidos_del_mes,
    COUNT(DISTINCT customer_id)       AS clientes_distintos
FROM orders
GROUP BY DATE_TRUNC('month', ordered_at)
HAVING COUNT(*) > 100
ORDER BY pedidos_del_mes DESC;
```

Output (los meses más activos):

| mes | pedidos_del_mes | clientes_distintos |
|---|---|---|
| 2024-11-01 | 387 | 331 |
| 2024-10-01 | 245 | 219 |
| 2024-09-01 | 198 | 178 |
| 2024-08-01 | 167 | 152 |

El pico de noviembre 2024 es claramente el Black Friday. "Ese es el outlier que Marco siempre menciona en las presentaciones", dice Valentina. "El 24 de noviembre de 2024 fue el mejor día en la historia de ShopSphere: 2.847 pedidos en un solo día. Con `GROUP BY` por día lo verías claramente."

---

## 4. CASOS DE USO REALES

**Caso 1 — Segmentación de mercados relevantes vs. incipientes**
Marco quiere concentrar los recursos de expansión en los países donde ya hay masa crítica de clientes. `HAVING COUNT(*) > umbral` separa automáticamente los mercados establecidos de los incipientes. Este patrón se usa en toda decisión de asignación de presupuesto: "solo los segmentos donde ya tenemos volumen suficiente".
*Rol que lo usa: Business Analyst, Strategy Analyst.*

**Caso 2 — Control de calidad: identificar grupos con anomalías**
Si una categoría de producto tiene un precio promedio 3 veces más alto que las demás, es una anomalía que vale revisar. `HAVING AVG(price) > N` permite aislar esos grupos directamente desde SQL. En análisis de datos reales, los grupos que están fuera del rango esperado son los más informativos.
*Rol que lo usa: Data Analyst, Finance Analyst.*

**Caso 3 — Thresholds de negocio para reportes ejecutivos**
Sofía solo quiere ver en su reporte de campaña los canales de marketing que trajeron más de 50 pedidos — los demás son estadísticamente irrelevantes. `HAVING COUNT(*) >= 50` aplica ese umbral directamente en la query, sin necesidad de filtrado posterior en Excel. Esto es "análisis sin fricción": el resultado que sale de la query ya está listo para la presentación.
*Rol que lo usa: Marketing Analyst, Data Analyst.*

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico
**Contexto:** Marco quiere saber qué países tienen más de 30 clientes registrados en ShopSphere. Solo le interesan los mercados con presencia significativa.

Escribe una query que muestre el país y el total de clientes para cada país con más de 30 clientes. Ordena de mayor a menor.

**Resultado esperado:** Solo los países que superan los 30 clientes. El número de filas debe ser considerablemente menor que el total de países en la tabla.

**Criterio de éxito:** Ninguna fila tiene un total menor o igual a 30. El resultado está ordenado descendentemente.

---

### Ejercicio Intermedio
**Contexto:** Valentina está analizando los patrones de actividad de pedidos. Quiere identificar los meses donde ShopSphere tuvo alto volumen de actividad: meses con más de 150 pedidos totales, combinando todos los status. Para cada uno de esos meses, quiere ver el total de pedidos, cuántos fueron entregados específicamente, y cuántos clientes distintos compraron.

Escribe la query. Ordena por mes ascendente para ver la tendencia cronológica.

**Resultado esperado:** Una fila por mes donde el total de pedidos supera 150. Cada fila muestra: mes (primer día del mes como fecha), total de pedidos, pedidos entregados (filtrado con FILTER o subquery), clientes distintos.

**Criterio de éxito:** El total de pedidos en todas las filas retornadas es mayor a 150. Los pedidos entregados son siempre menores o iguales al total de pedidos de ese mes. El mes está en formato de fecha (resultado de DATE_TRUNC).

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
HAVING COUNT(*) > 30
ORDER BY total_clientes DESC;
```

**Solución Ejercicio Intermedio:**
```sql
SELECT
    DATE_TRUNC('month', ordered_at)                             AS mes,
    COUNT(*)                                                    AS total_pedidos,
    COUNT(*) FILTER (WHERE status = 'delivered')               AS pedidos_entregados,
    COUNT(DISTINCT customer_id)                                 AS clientes_distintos
FROM orders
GROUP BY DATE_TRUNC('month', ordered_at)
HAVING COUNT(*) > 150
ORDER BY mes ASC;
```

Alternativa sin FILTER (más portable):
```sql
SELECT
    DATE_TRUNC('month', ordered_at)  AS mes,
    COUNT(*)                          AS total_pedidos,
    SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END)  AS pedidos_entregados,
    COUNT(DISTINCT customer_id)       AS clientes_distintos
FROM orders
GROUP BY DATE_TRUNC('month', ordered_at)
HAVING COUNT(*) > 150
ORDER BY mes ASC;
```

</details>

---

## 6. ERRORES COMUNES

**Error 1 — Poner la condición de HAVING en WHERE**

```sql
-- INCORRECTO
SELECT country, COUNT(*) AS total
FROM customers
WHERE COUNT(*) > 20    -- ERROR: aggregate functions not allowed in WHERE
GROUP BY country;
```

La distinción es de timing: `WHERE` ocurre antes del cálculo de grupos. Muévelo a `HAVING`:

```sql
-- CORRECTO
SELECT country, COUNT(*) AS total
FROM customers
GROUP BY country
HAVING COUNT(*) > 20;
```

**Error 2 — Usar el alias de SELECT en HAVING**

```sql
-- INCORRECTO en todos los motores SQL estándar, incluyendo PostgreSQL
SELECT country, COUNT(*) AS total
FROM customers
GROUP BY country
HAVING total > 20;    -- ERROR: column "total" does not exist en PostgreSQL
```

PostgreSQL NO permite aliases de SELECT en HAVING. Si intentas esta query obtendrás:
`ERROR: column "total" does not exist`

La forma correcta en todos los motores es repetir la expresión de agregación:
```sql
-- CORRECTO en todos los motores
SELECT country, COUNT(*) AS total
FROM customers
GROUP BY country
HAVING COUNT(*) > 20;
```

Nota: a diferencia de ORDER BY (donde PostgreSQL sí permite usar aliases de SELECT como extensión), HAVING no acepta aliases en ningún motor SQL estándar. Son dos cláusulas con comportamiento distinto en este aspecto.

**Error 3 — Confundir qué columnas pueden ir en HAVING**

```sql
-- INCORRECTO: country no es una función de agregación, pero sí puede ir en HAVING
-- si también está en GROUP BY
SELECT country, COUNT(*) AS total
FROM customers
GROUP BY country
HAVING country = 'Mexico';   -- esto es válido pero ineficiente
```

Aunque válido, usar `HAVING` para filtrar por columnas del GROUP BY es ineficiente. Esa condición debería ir en `WHERE` porque filtra antes de calcular los grupos (menos trabajo para la base de datos):

```sql
-- CORRECTO Y EFICIENTE
SELECT country, COUNT(*) AS total
FROM customers
WHERE country = 'Mexico'   -- filtra ANTES de agrupar
GROUP BY country;
```

**Error 4 — Olvidar que HAVING no elimina NULL del GROUP BY**

Si una columna de agrupamiento tiene NULLs, NULL forma su propio grupo. `HAVING COUNT(*) > 1` puede retornar el grupo NULL si hay más de 1 fila con ese valor. Para excluir NULLs del análisis, usa `WHERE columna IS NOT NULL` antes del GROUP BY.

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

Con `SELECT`, `WHERE`, `GROUP BY`, `HAVING` y las funciones de agregación, ya tienes las herramientas para producir métricas de negocio completas de tablas individuales. Pero el análisis de negocio real vive en el tiempo: Marco no quiere solo "cuántos pedidos tuvo ShopSphere" — quiere ver cómo evolucionó mes a mes, cuándo fue el pico de 2024, cuánto creció el Q4 respecto al Q3.

La Lección 4 completa el Nivel 2 con el análisis temporal: cómo agrupar por períodos de tiempo (mes, semana, trimestre), cómo comparar períodos entre sí, y cómo usar `DATE_TRUNC` de manera sistemática para producir series de tiempo — el tipo de análisis que aparece en todos los dashboards de negocio.
