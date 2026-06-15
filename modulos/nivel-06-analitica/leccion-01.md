# Nivel 6 — Analítica de Negocio
## Lección 1: LAG y LEAD — Comparación período a período

> Tablas disponibles en este nivel: `customers`, `categories`, `products`, `orders`, `order_items`, `returns`, `inventory`, `marketing_campaigns`

> **Nota de dialecto:** Las funciones de fecha de esta lección (`DATE_TRUNC`, `EXTRACT`, `DATE_PART`) son de PostgreSQL y **no funcionan en el Playground** (que corre SQLite). Los equivalentes SQLite son: `strftime('%Y-%m-01', fecha)` en lugar de `DATE_TRUNC('month', ...)`, y `CAST(strftime('%Y', fecha) AS INT)` en lugar de `EXTRACT(YEAR FROM ...)`. Los ejercicios del nivel ya usan la sintaxis SQLite correcta.

---

## 1. INTRODUCCIÓN CONCEPTUAL

### El problema que nadie había podido resolver en ShopSphere

En la reunión de noviembre 2025, Sofía entró con cara de funeral y Ana entró con cara de satisfacción. Las dos miraban el mismo mes. Sofía veía 15% menos pedidos que en noviembre 2024. Ana veía el margen neto más alto del año. Ninguna estaba equivocada — y ese fue exactamente el problema: ShopSphere no tenía una métrica acordada para comparar cualquier período contra su anterior.

Valentina lo resumió así:

> *"Necesito el revenue total por mes de todo 2025, con la variación porcentual respecto al mes anterior calculada en la misma tabla. Si hay meses con variación negativa, no los escondas."*

Antes de las window functions, responder esto requería una self-join o una subquery correlacionada por cada mes. Con **LAG y LEAD**, se hace en una sola pasada sobre los datos.

**LAG** accede al valor de la fila que está N posiciones antes de la fila actual, dentro del orden definido en la cláusula `OVER`. Si la fila actual es marzo 2025, `LAG(revenue, 1)` devuelve el revenue de febrero 2025.

**LEAD** hace lo opuesto: accede al valor de la fila N posiciones después. Si la fila actual es marzo, `LEAD(revenue, 1)` devuelve el de abril.

La aplicación más frecuente es el análisis MoM (month-over-month) y YoY (year-over-year): para cada período, mostrar el valor del período anterior en la misma fila — sin subqueries, sin self-joins, en una sola query.

---

## 2. SINTAXIS

### LAG — acceder a la fila anterior dentro de la partición

```sql
LAG(columna, n, valor_por_defecto) OVER (
    [PARTITION BY columna_de_agrupacion]
    ORDER BY columna_de_orden
)
```

Parámetros:
- `columna`: el valor que quieres recuperar de la fila anterior
- `n` (opcional, por defecto 1): cuántas posiciones hacia atrás
- `valor_por_defecto` (opcional): qué devolver cuando no hay fila anterior (sin este parámetro, devuelve NULL)

### LEAD — acceder a la fila siguiente dentro de la partición

```sql
LEAD(columna, n, valor_por_defecto) OVER (
    [PARTITION BY columna_de_agrupacion]
    ORDER BY columna_de_orden
)
```

Los mismos parámetros que LAG, pero mira hacia adelante en lugar de hacia atrás.

### El patrón MoM completo — con variación porcentual

```sql
-- Plantilla de análisis month-over-month
SELECT
    periodo,
    metrica_actual,
    LAG(metrica_actual) OVER (ORDER BY periodo)   AS metrica_anterior,
    ROUND(
        (metrica_actual - LAG(metrica_actual) OVER (ORDER BY periodo))
        * 100.0
        / NULLIF(LAG(metrica_actual) OVER (ORDER BY periodo), 0),
        2
    )                                              AS variacion_pct
FROM tabla_de_metricas_por_periodo;
```

El `NULLIF(denominador, 0)` es obligatorio: si el mes anterior tuvo revenue cero (por ejemplo, el primer mes del negocio), la división produce un error. `NULLIF` convierte ese cero en NULL, y la división produce NULL en lugar de error.

### PARTITION BY con LAG — análisis por segmento

Cuando los datos tienen una dimensión de agrupación (por país, por canal, por categoría), `PARTITION BY` garantiza que LAG no "cruce" entre grupos:

```sql
-- Sin PARTITION BY: el LAG de enero de Colombia tomará el valor de
-- diciembre de Argentina si esa fue la última fila
LAG(revenue) OVER (ORDER BY mes)

-- Con PARTITION BY: cada país tiene su propia secuencia independiente
LAG(revenue) OVER (PARTITION BY country ORDER BY mes)
```

Sin `PARTITION BY`, el primer mes de cada país "mira hacia atrás" y encuentra el último mes de otro país — un resultado silenciosamente incorrecto.

### PARTITION BY — regla obligatoria

Si tu análisis tiene varias series independientes (por canal, por país, por categoría), **siempre** incluye `PARTITION BY`. Si omites el `PARTITION BY`, LAG asume que todas las filas son una sola serie y el resultado cruza entre grupos sin advertencia.

---

## 3. EJEMPLO PRÁCTICO

### Contexto: Valentina necesita el análisis MoM de revenue de 2025

**Query 1 — La forma mínima: LAG para revenue del mes anterior**

Antes de calcular la variación, primero construimos la serie mensual:

```sql
-- Paso 1: agregar el revenue mensual
SELECT
    DATE_TRUNC('month', o.ordered_at)::DATE   AS mes,
    ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue
FROM orders o
INNER JOIN order_items oi ON oi.order_id = o.order_id
WHERE o.ordered_at >= '2025-01-01'
  AND o.ordered_at <  '2026-01-01'
  AND o.status     <> 'cancelled'
GROUP BY DATE_TRUNC('month', o.ordered_at)
ORDER BY mes;
```

Output (fragmento):

| mes | revenue |
|---|---|
| 2025-01-01 | 284.320,00 |
| 2025-02-01 | 271.890,00 |
| 2025-03-01 | 230.650,00 |
| 2025-04-01 | 258.100,00 |

La caída de marzo es visible — pero ¿cuánto fue exactamente? Para responder la pregunta de Valentina necesitamos la variación porcentual. Ahí entra LAG.

**Query 2 — LAG en CTE: análisis MoM completo**

```sql
-- El patrón estándar: CTE para la agregación, window function en el SELECT externo
WITH revenue_mensual AS (
    SELECT
        DATE_TRUNC('month', o.ordered_at)::DATE    AS mes,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)  AS revenue
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.ordered_at >= '2025-01-01'
      AND o.ordered_at <  '2026-01-01'
      AND o.status     <> 'cancelled'
    GROUP BY DATE_TRUNC('month', o.ordered_at)
)
SELECT
    mes,
    revenue                                             AS revenue_actual,
    LAG(revenue) OVER (ORDER BY mes)                    AS revenue_mes_anterior,
    ROUND(
        (revenue - LAG(revenue) OVER (ORDER BY mes))
        * 100.0
        / NULLIF(LAG(revenue) OVER (ORDER BY mes), 0),
        2
    )                                                   AS variacion_pct
FROM revenue_mensual
ORDER BY mes;
```

Output (2025, fragmento):

| mes | revenue_actual | revenue_mes_anterior | variacion_pct |
|---|---|---|---|
| 2025-01-01 | 284.320,00 | NULL | NULL |
| 2025-02-01 | 271.890,00 | 284.320,00 | -4,37 |
| 2025-03-01 | 230.650,00 | 271.890,00 | -15,17 |
| 2025-04-01 | 258.100,00 | 230.650,00 | +11,90 |

Enero aparece con NULL en `revenue_mes_anterior` — es el primer mes de la serie, no hay fila anterior. Ese NULL es correcto: no hay dato con qué comparar. Si prefieres mostrar cero en lugar de NULL, usa el tercer parámetro: `LAG(revenue, 1, 0) OVER (ORDER BY mes)`.

Valentina mira el resultado: "Marzo 2025 cayó 15% — eso coincide exactamente con la campaña de Regreso a Clases que mencionó Sofía."

**Query 3 — LEAD para análisis prospectivo: tasa de devolución con tendencia**

LEAD es útil cuando quieres saber si la métrica del mes siguiente fue mejor o peor — por ejemplo, para analizar si un spike de devoluciones se recuperó:

```sql
WITH devoluciones_mensuales AS (
    SELECT
        DATE_TRUNC('month', r.returned_at)::DATE  AS mes,
        COUNT(r.return_id)                         AS total_devoluciones
    FROM returns r
    WHERE r.returned_at >= '2025-01-01'
      AND r.returned_at <  '2026-06-01'
    GROUP BY DATE_TRUNC('month', r.returned_at)
)
SELECT
    mes,
    total_devoluciones,
    LAG(total_devoluciones)  OVER (ORDER BY mes)  AS mes_anterior,
    LEAD(total_devoluciones) OVER (ORDER BY mes)  AS mes_siguiente
FROM devoluciones_mensuales
ORDER BY mes;
```

Output (fragmento con el spike de julio 2025):

| mes | total_devoluciones | mes_anterior | mes_siguiente |
|---|---|---|---|
| 2025-06-01 | 312 | 298 | 6.067 |
| 2025-07-01 | 6.067 | 312 | 341 |
| 2025-08-01 | 341 | 6.067 | 329 |

Diego lo ve y respira: "El spike de julio fue puntual. Agosto ya volvió al rango normal."

**Query 4 — LAG con PARTITION BY: análisis MoM por canal de marketing**

Cuando el análisis tiene múltiples series independientes, `PARTITION BY` separa el LAG por grupo:

```sql
WITH revenue_por_canal AS (
    SELECT
        mc.channel,
        DATE_TRUNC('month', o.ordered_at)::DATE    AS mes,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)  AS revenue
    FROM marketing_campaigns mc
    INNER JOIN orders      o  ON o.ordered_at BETWEEN mc.started_at AND COALESCE(mc.ended_at, CURRENT_DATE)
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.ordered_at >= '2025-01-01'
      AND o.ordered_at <  '2026-01-01'
      AND o.status     <> 'cancelled'
    GROUP BY mc.channel, DATE_TRUNC('month', o.ordered_at)
)
SELECT
    channel,
    mes,
    revenue,
    LAG(revenue) OVER (PARTITION BY channel ORDER BY mes)  AS revenue_mes_anterior,
    ROUND(
        (revenue - LAG(revenue) OVER (PARTITION BY channel ORDER BY mes))
        * 100.0
        / NULLIF(LAG(revenue) OVER (PARTITION BY channel ORDER BY mes), 0),
        2
    )                                                       AS variacion_pct
FROM revenue_por_canal
ORDER BY channel, mes;
```

El `PARTITION BY channel` garantiza que enero de `email` mira hacia el diciembre de `email` del año anterior — no hacia el último mes de `affiliate`.

> **Modelo de atribución:** Este JOIN asigna el revenue a una campaña si el pedido ocurrió durante su período activo (`BETWEEN started_at AND ended_at`). Es un modelo de **atribución por ventana temporal** — la campaña recibe todo el crédito si el pedido cae en su rango de fechas, sin importar si hubo una sesión directa. En el Nivel 7 aprenderemos modelos más sofisticados basados en sesiones de usuario (`website_sessions`) que permiten rastrear el canal exacto que originó cada compra.

---

## 4. CASOS DE USO REALES

**Caso 1 — Análisis MoM de revenue (el uso más frecuente de LAG)**
Cualquier informe ejecutivo que muestre "crecimiento respecto al mes anterior" usa LAG. En e-commerce se calcula sobre revenue, pedidos, clientes nuevos y tasa de conversión. Es la query que Valentina lleva a cada reunión con el comité de inversores. LAG sobre una CTE preagregada es el patrón estándar de producción.
*Rol que lo usa: Data Analyst, Analytics Engineer, BI Developer.*

**Caso 2 — Detección de spikes y anomalías (LAG para comparación con umbral)**
En lugar de comparar con el período anterior, puedes comparar con un promedio histórico. LAG ayuda a construir la baseline: si la variación respecto al mes anterior supera cierto umbral (por ejemplo, +200%), hay una anomalía que investigar. Diego lo usa para monitorear la tasa de devoluciones.
*Rol que lo usa: Data Analyst, Operations Analyst.*

**Caso 3 — Forecast y planificación (LEAD para mostrar tendencia futura)**
LEAD se usa en dashboards de planificación para mostrar, junto al valor actual, el valor del período siguiente ya conocido (en datos históricos completados). En análisis de campañas, LEAD muestra el revenue del mes después del fin de la campaña — para evaluar si el efecto persiste.
*Rol que lo usa: Marketing Analyst, Financial Analyst.*

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico
**Contexto (Briefing 6.5 — Valentina Torres):** Valentina necesita el revenue total por mes de todo 2025, con la variación porcentual respecto al mes anterior. Formato: mes, revenue_actual, revenue_mes_anterior, variacion_pct. Marco tiene una call con los fondos y quiere ver la tendencia.

Escribe la query. Usa una CTE para la agregación mensual, luego LAG en el SELECT externo. Excluye pedidos cancelados. Redondea la variación a 2 decimales. El primer mes debe mostrar NULL en revenue_mes_anterior — no uses COALESCE para ocultarlo.

**Tablas necesarias:** `orders`, `order_items`

**Resultado esperado:** 12 filas (una por mes de 2025). Enero muestra NULL en variación. Marzo 2025 muestra variación negativa de aproximadamente -15%. La query no tiene errores de división por cero.

**Criterio de éxito:** Usas CTE para preagregación. LAG con ORDER BY mes. NULLIF en el denominador del porcentaje. El resultado está ordenado por mes ascendente.

---

### Ejercicio Intermedio
**Contexto (Briefing 6.11 — Diego Morales):** Diego necesita la tasa de devolución mensual (devoluciones / total pedidos) para cada mes desde enero 2025 hasta mayo 2026. Junto a cada mes quiere la tasa del mes anterior para ver si mejora o empeora. El spike de julio 2025 debe aparecer visible — es el punto de referencia.

Escribe la query con dos CTEs: una para el total de pedidos por mes y otra para el total de devoluciones por mes. Luego únelas y aplica LAG sobre la tasa. La tasa de devolución se define como: `devoluciones_aprobadas / total_pedidos * 100`. Usa solo devoluciones con status IN ('approved', 'refunded') y excluye pedidos cancelados.

**Tablas necesarias:** `orders`, `returns`

**Resultado esperado:** Una fila por mes. El mes de julio 2025 muestra una tasa significativamente más alta que los meses adyacentes. La columna `tasa_mes_anterior` es NULL para el primer mes de la serie.

**Criterio de éxito:** Dos CTEs encadenadas. LAG con `PARTITION BY` omitido (es una sola serie temporal). NULLIF en el denominador de la tasa. JOIN entre las dos CTEs por mes.

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
WITH revenue_mensual AS (
    SELECT
        DATE_TRUNC('month', o.ordered_at)::DATE    AS mes,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)  AS revenue
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.ordered_at >= '2025-01-01'
      AND o.ordered_at <  '2026-01-01'
      AND o.status     <> 'cancelled'
    GROUP BY DATE_TRUNC('month', o.ordered_at)
)
SELECT
    mes,
    revenue                                             AS revenue_actual,
    LAG(revenue) OVER (ORDER BY mes)                    AS revenue_mes_anterior,
    ROUND(
        (revenue - LAG(revenue) OVER (ORDER BY mes))
        * 100.0
        / NULLIF(LAG(revenue) OVER (ORDER BY mes), 0),
        2
    )                                                   AS variacion_pct
FROM revenue_mensual
ORDER BY mes;
```

**Solución Ejercicio Intermedio:**
```sql
WITH pedidos_mes AS (
    SELECT
        DATE_TRUNC('month', o.ordered_at)::DATE  AS mes,
        COUNT(*)                                  AS total_pedidos
    FROM orders o
    WHERE o.ordered_at >= '2025-01-01'
      AND o.ordered_at <  '2026-06-01'
      AND o.status     <> 'cancelled'
    GROUP BY DATE_TRUNC('month', o.ordered_at)
),
devoluciones_mes AS (
    SELECT
        DATE_TRUNC('month', r.returned_at)::DATE  AS mes,
        COUNT(*)                                   AS total_devoluciones
    FROM returns r
    WHERE r.returned_at >= '2025-01-01'
      AND r.returned_at <  '2026-06-01'
      AND r.status IN ('approved', 'refunded')
    GROUP BY DATE_TRUNC('month', r.returned_at)
),
tasa_mensual AS (
    SELECT
        p.mes,
        p.total_pedidos,
        COALESCE(d.total_devoluciones, 0)                  AS total_devoluciones,
        ROUND(
            COALESCE(d.total_devoluciones, 0) * 100.0
            / NULLIF(p.total_pedidos, 0),
            2
        )                                                  AS tasa_devolucion_pct
    FROM pedidos_mes p
    LEFT JOIN devoluciones_mes d ON d.mes = p.mes
)
SELECT
    mes,
    total_pedidos,
    total_devoluciones,
    tasa_devolucion_pct,
    LAG(tasa_devolucion_pct) OVER (ORDER BY mes)  AS tasa_mes_anterior
FROM tasa_mensual
ORDER BY mes;
```

</details>

---

## 6. ERRORES COMUNES

**Error 1 — Omitir PARTITION BY cuando hay múltiples series**

```sql
-- INCORRECTO: el LAG de enero de 'email' tomará el valor de
-- diciembre de 'affiliate' si ese fue el último canal en orden
LAG(revenue) OVER (ORDER BY mes)

-- CORRECTO: cada canal tiene su propia secuencia
LAG(revenue) OVER (PARTITION BY channel ORDER BY mes)
```

Error mental: pensar que el `ORDER BY` dentro del `OVER` es suficiente para separar los grupos. No lo es — sin `PARTITION BY`, LAG opera sobre todas las filas como si fueran una sola serie.

**Error 2 — División por cero al calcular la variación porcentual**

```sql
-- INCORRECTO: si el mes anterior tuvo revenue 0, produce ERROR: division by zero
ROUND(
    (revenue - LAG(revenue) OVER (ORDER BY mes))
    * 100.0
    / LAG(revenue) OVER (ORDER BY mes),
    2
)

-- CORRECTO: NULLIF convierte el cero en NULL y evita el error
ROUND(
    (revenue - LAG(revenue) OVER (ORDER BY mes))
    * 100.0
    / NULLIF(LAG(revenue) OVER (ORDER BY mes), 0),
    2
)
```

Error mental: asumir que el mes anterior siempre tendrá un valor mayor a cero. En el primer mes de una nueva categoría o país, el denominador puede ser cero.

**Error 3 — Aplicar LAG directamente sobre una tabla sin preagregación**

```sql
-- INCORRECTO: LAG sobre una tabla de transacciones no tiene sentido
-- (hay múltiples filas por mes — LAG mira la fila ANTERIOR en la tabla,
-- no el mes anterior)
SELECT
    ordered_at,
    quantity * unit_price AS revenue,
    LAG(quantity * unit_price) OVER (ORDER BY ordered_at) AS anterior
FROM order_items;
-- El "anterior" aquí es la línea anterior de la tabla, no el mes anterior
```

```sql
-- CORRECTO: primero agregar por período, luego aplicar LAG
WITH revenue_mensual AS (
    SELECT DATE_TRUNC('month', o.ordered_at)::DATE AS mes,
           SUM(oi.quantity * oi.unit_price) AS revenue
    FROM orders o INNER JOIN order_items oi ON oi.order_id = o.order_id
    GROUP BY DATE_TRUNC('month', o.ordered_at)
)
SELECT mes, revenue, LAG(revenue) OVER (ORDER BY mes) AS revenue_anterior
FROM revenue_mensual;
```

Error mental: aplicar LAG sobre los datos crudos en lugar de sobre el resultado de la agregación. LAG opera sobre filas, no sobre períodos — la preagregación es obligatoria para análisis temporales.

**Error 4 — Confundir LAG(col, 1) con LAG(col, 12) en análisis YoY**

```sql
-- Para análisis MoM (mes anterior): n = 1
LAG(revenue, 1) OVER (ORDER BY mes)

-- Para análisis YoY (mismo mes del año anterior): n = 12
LAG(revenue, 12) OVER (ORDER BY mes)
-- Requiere tener al menos 12 meses de historia — de lo contrario, devuelve NULL
```

Error mental: usar `LAG(revenue, 1)` cuando el negocio pide "comparar con el mismo mes del año pasado". El análisis YoY siempre necesita `n = 12` en series mensuales, `n = 4` en series trimestrales.

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

LAG y LEAD te dan el valor de un período concreto — el anterior, el siguiente, el de hace 12 meses. Pero hay análisis que necesitan el valor del primer o último evento dentro de un grupo: ¿cuándo fue la primera compra de este cliente? ¿cuál fue el revenue máximo de esta categoría? ¿qué porcentaje del revenue acumulado representa este mes?

FIRST_VALUE y LAST_VALUE responden esas preguntas, y son la puerta de entrada al análisis de cohortes — la técnica que permite a Valentina responder si los clientes que adquirimos en una campaña realmente se quedaron, o si compraron una vez y desaparecieron.
