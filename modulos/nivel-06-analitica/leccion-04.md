# Nivel 6 — Analítica de Negocio
## Lección 4: Análisis Temporal Avanzado — Estacionalidad, YoY y Rolling Average

> Tablas disponibles en este nivel: `customers`, `categories`, `products`, `orders`, `order_items`, `returns`, `inventory`, `marketing_campaigns`

> **Nota de dialecto:** Las funciones de fecha de esta lección (`DATE_TRUNC`, `EXTRACT`, `DATE_PART`) son de PostgreSQL y **no funcionan en el Playground** (que corre SQLite). Los equivalentes SQLite son: `strftime('%Y-%m-01', fecha)` en lugar de `DATE_TRUNC('month', ...)`, y `CAST(strftime('%Y', fecha) AS INT)` en lugar de `EXTRACT(YEAR FROM ...)`. Los ejercicios del nivel ya usan la sintaxis SQLite correcta.

---

## 1. INTRODUCCIÓN CONCEPTUAL

### La pregunta que viene antes de cualquier decisión de inversión

Marco Jiménez tiene una reunión con fondos el lunes y le acaba de escribir a Valentina:

> *"¿Cuánto creció ShopSphere en 2025 comparado con 2024? No el total — por país."*

Y Valentina tiene su propia pregunta pendiente:

> *"¿Hay meses del año donde ShopSphere vende más sistemáticamente, más allá del año?"*

Estas son las preguntas del análisis temporal avanzado: no comparar un mes con el anterior, sino comparar períodos equivalentes en distintos años, promediar el comportamiento histórico de cada mes calendario y detectar cuándo un mes se desvía significativamente del patrón normal.

Las tres técnicas de esta lección son:

**Estacionalidad** — comparar el mismo mes a lo largo de múltiples años usando `EXTRACT(MONTH FROM fecha)` como clave de agrupación. Revela si noviembre siempre es el mes pico o si hay meses de caída sistemática que nadie había notado.

**YoY (Year-over-Year)** — el equivalente del MoM pero a 12 meses de distancia. `LAG(revenue, 12)` sobre una serie mensual da el revenue del mismo mes del año anterior. Es la métrica que Marco lleva a los fondos.

**Rolling Average (promedio móvil)** — el promedio de los últimos N períodos. Suaviza la volatilidad mensual y revela la tendencia de fondo. Si el revenue de un mes sube pero el rolling average de 3 meses baja, la tendencia real es negativa aunque el mes fue bueno.

---

## 2. SINTAXIS

### Estacionalidad — EXTRACT para agrupar por mes del año

```sql
-- Agrupar por número de mes (1 = enero, 12 = diciembre) ignorando el año
GROUP BY EXTRACT(MONTH FROM fecha)

-- Con nombre del mes para legibilidad
SELECT
    EXTRACT(MONTH FROM ordered_at)                AS mes_numero,
    TO_CHAR(ordered_at, 'Month')                  AS mes_nombre,
    ROUND(AVG(revenue_por_mes), 2)                AS revenue_promedio_historico
```

### YoY — LAG a 12 períodos sobre serie mensual

```sql
-- En una serie mensual, LAG con n=12 da el mismo mes del año anterior
LAG(revenue, 12) OVER (ORDER BY mes)              AS revenue_mismo_mes_anno_anterior

-- Variación YoY porcentual
ROUND(
    (revenue - LAG(revenue, 12) OVER (ORDER BY mes))
    * 100.0
    / NULLIF(LAG(revenue, 12) OVER (ORDER BY mes), 0),
    2
)                                                 AS variacion_yoy_pct
```

Requiere al menos 12 meses de historia para que el primer período tenga un valor anterior. Los primeros 12 meses de la serie aparecerán con NULL en la columna YoY — es el comportamiento correcto.

### Rolling Average — SUM/AVG con marco de ventana deslizante

```sql
-- Promedio móvil de 3 meses (mes actual + 2 anteriores)
AVG(revenue) OVER (
    ORDER BY mes
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
)

-- También se puede expresar como rolling sum dividida:
ROUND(
    SUM(revenue) OVER (
        ORDER BY mes
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ) / 3.0,
    2
)
```

La clave es `ROWS BETWEEN N PRECEDING AND CURRENT ROW`: la ventana incluye las N filas anteriores más la fila actual, y se desliza hacia adelante con cada fila.

### YoY por país con PARTITION BY

```sql
-- YoY separado por país: el LAG mira 12 meses atrás dentro del mismo país
LAG(revenue, 12) OVER (
    PARTITION BY country
    ORDER BY mes
)
```

Sin `PARTITION BY`, el LAG de enero 2025 de Chile podría tomar el valor de enero 2024 de México si esa fue la última fila del año anterior en el orden global.

---

## 3. EJEMPLO PRÁCTICO

### Contexto: Marco necesita el análisis YoY y Valentina quiere la estacionalidad

**Query 1 — Estacionalidad: revenue promedio por mes del año (Briefing 6.12 — Valentina)**

```sql
WITH revenue_mensual AS (
    SELECT
        DATE_TRUNC('month', o.ordered_at)::DATE    AS mes,
        EXTRACT(MONTH FROM o.ordered_at)::INT       AS mes_numero,
        TO_CHAR(o.ordered_at, 'TMMonth')            AS mes_nombre,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)  AS revenue
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status <> 'cancelled'
    GROUP BY DATE_TRUNC('month', o.ordered_at),
             EXTRACT(MONTH FROM o.ordered_at),
             TO_CHAR(o.ordered_at, 'TMMonth')
)
SELECT
    mes_numero,
    mes_nombre,
    ROUND(AVG(revenue), 2)  AS revenue_promedio,
    COUNT(*)                AS anios_con_datos,
    ROUND(MIN(revenue), 2)  AS revenue_minimo,
    ROUND(MAX(revenue), 2)  AS revenue_maximo
FROM revenue_mensual
GROUP BY mes_numero, mes_nombre
ORDER BY revenue_promedio DESC;
```

Output:

| mes_numero | mes_nombre | revenue_promedio | anios_con_datos | revenue_minimo | revenue_maximo |
|---|---|---|---|---|---|
| 11 | noviembre | 892.400,00 | 3 | 780.000,00 | 1.020.000,00 |
| 12 | diciembre | 820.300,00 | 3 | 790.000,00 | 860.000,00 |
| 9 | septiembre | 412.800,00 | 3 | 380.000,00 | 450.000,00 |
| 3 | marzo | 238.200,00 | 3 | 198.000,00 | 285.000,00 |

Valentina lo ve: "Noviembre es el mes pico — siempre, todos los años. Marzo es el mes más débil — y la campaña de Regreso a Clases lo empeoró. Para la temporada 2026, el 40% del budget de campañas va a octubre-noviembre."

**Query 2 — YoY por país: crecimiento 2024 vs. 2025 (Briefing 6.10 — Marco)**

```sql
WITH revenue_pais_mes AS (
    SELECT
        c.country,
        DATE_TRUNC('month', o.ordered_at)::DATE    AS mes,
        EXTRACT(YEAR FROM o.ordered_at)::INT        AS anio,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)  AS revenue
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id   = o.order_id
    INNER JOIN customers   c  ON c.customer_id = o.customer_id
    WHERE o.status <> 'cancelled'
    GROUP BY c.country,
             DATE_TRUNC('month', o.ordered_at),
             EXTRACT(YEAR FROM o.ordered_at)
),
revenue_anual_pais AS (
    SELECT
        country,
        anio,
        ROUND(SUM(revenue), 2)                     AS revenue_anual
    FROM revenue_pais_mes
    GROUP BY country, anio
)
SELECT
    country,
    MAX(CASE WHEN anio = 2024 THEN revenue_anual END)  AS revenue_2024,
    MAX(CASE WHEN anio = 2025 THEN revenue_anual END)  AS revenue_2025,
    ROUND(
        (MAX(CASE WHEN anio = 2025 THEN revenue_anual END)
         - MAX(CASE WHEN anio = 2024 THEN revenue_anual END))
        * 100.0
        / NULLIF(MAX(CASE WHEN anio = 2024 THEN revenue_anual END), 0),
        2
    )                                                   AS crecimiento_yoy_pct,
    -- Participación en el revenue total 2025
    ROUND(
        MAX(CASE WHEN anio = 2025 THEN revenue_anual END) * 100.0
        / NULLIF(SUM(CASE WHEN anio = 2025 THEN revenue_anual END)
                 OVER (), 0),
        1
    )                                                   AS pct_revenue_2025
FROM revenue_anual_pais
WHERE anio IN (2024, 2025)
GROUP BY country
ORDER BY crecimiento_yoy_pct DESC NULLS LAST;
```

Output:

| country | revenue_2024 | revenue_2025 | crecimiento_yoy_pct | pct_revenue_2025 |
|---|---|---|---|---|
| Mexico | 2.840.000,00 | 3.920.000,00 | 38,03 | 41,2 |
| Colombia | 1.920.000,00 | 2.480.000,00 | 29,17 | 26,1 |
| Chile | 1.680.000,00 | 1.980.000,00 | 17,86 | 20,8 |
| Argentina | 890.000,00 | 1.120.000,00 | 25,84 | 11,8 |

Marco lo lee: "México creció 38% — es el mercado más dinámico. Chile creció 18% — está estancándose respecto al resto. Vamos a reforzar Chile en el plan de expansión de Q3."

**Query 3 — YoY mensual con LAG(12): serie completa 2024-2025**

```sql
WITH revenue_mensual AS (
    SELECT
        DATE_TRUNC('month', o.ordered_at)::DATE    AS mes,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)  AS revenue
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status <> 'cancelled'
    GROUP BY DATE_TRUNC('month', o.ordered_at)
)
SELECT
    mes,
    revenue,
    LAG(revenue, 12) OVER (ORDER BY mes)         AS revenue_mismo_mes_anterior,
    ROUND(
        (revenue - LAG(revenue, 12) OVER (ORDER BY mes))
        * 100.0
        / NULLIF(LAG(revenue, 12) OVER (ORDER BY mes), 0),
        2
    )                                            AS variacion_yoy_pct
FROM revenue_mensual
WHERE mes >= '2025-01-01'
  AND mes <  '2026-01-01'
ORDER BY mes;
```

**Query 4 — Rolling Average de 3 meses: tendencia suavizada vs. revenue actual**

```sql
WITH revenue_mensual AS (
    SELECT
        DATE_TRUNC('month', o.ordered_at)::DATE    AS mes,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)  AS revenue
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status          <> 'cancelled'
      AND o.ordered_at      >= '2025-01-01'
      AND o.ordered_at      <  '2026-06-01'
    GROUP BY DATE_TRUNC('month', o.ordered_at)
)
SELECT
    mes,
    revenue,
    ROUND(
        AVG(revenue) OVER (
            ORDER BY mes
            ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
        ),
        2
    )                                              AS rolling_avg_3m,
    -- Diferencia entre el valor actual y la tendencia suavizada
    ROUND(
        revenue - AVG(revenue) OVER (
            ORDER BY mes
            ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
        ),
        2
    )                                              AS desviacion_vs_tendencia
FROM revenue_mensual
ORDER BY mes;
```

Output (fragmento):

| mes | revenue | rolling_avg_3m | desviacion_vs_tendencia |
|---|---|---|---|
| 2025-01-01 | 284.320,00 | 284.320,00 | 0,00 |
| 2025-02-01 | 271.890,00 | 278.105,00 | -6.215,00 |
| 2025-03-01 | 230.650,00 | 262.287,00 | -31.637,00 |
| 2025-04-01 | 258.100,00 | 253.547,00 | +4.553,00 |

Marzo 2025: la desviación de -$31.637 respecto al rolling average confirma que no fue solo un mes débil — fue un mes significativamente por debajo de la tendencia de los 3 meses anteriores.

---

## 4. CASOS DE USO REALES

**Caso 1 — Estacionalidad para planificación de inventario**
Saber que noviembre es siempre el mes pico permite que el equipo de operaciones de ShopSphere pre-abastezca el inventario en octubre. La query de estacionalidad con AVG y MIN/MAX da el rango histórico de cada mes — útil para calcular el stock de seguridad necesario antes del Black Friday.
*Rol que lo usa: Operations Analyst, Supply Chain Analyst, Data Analyst.*

**Caso 2 — YoY para informes a inversores**
Los fondos de inversión no comparan mes contra mes — comparan trimestre contra trimestre del año anterior y año contra año. La métrica YoY es el lenguaje de las presentaciones financieras. Marco la usa en cada call con fondos. El análisis YoY por país es la base del plan de expansión geográfica.
*Rol que lo usa: Data Analyst, Financial Analyst, CFO.*

**Caso 3 — Rolling Average para dashboards de monitoreo**
Los dashboards de negocio en tiempo real muestran el rolling average de 7 o 30 días junto al valor diario para separar el "ruido" de la "señal". Un día con 0 ventas por mantenimiento técnico no debe alarmar a nadie — pero si el rolling average de 7 días baja consistentemente, hay un problema real. Diego lo usa para monitorear las devoluciones post-crisis.
*Rol que lo usa: Data Analyst, BI Developer, Operations Analyst.*

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico
**Contexto (Briefing 6.12 — Valentina Torres):** Valentina quiere saber en qué meses del año ShopSphere vende más, usando todos los datos históricos disponibles. Necesita: número de mes, nombre del mes, revenue promedio histórico y cantidad de años con datos. Ordena de mayor a menor revenue promedio.

Escribe la query. Usa `EXTRACT(MONTH FROM ordered_at)` para el número de mes y `TO_CHAR(ordered_at, 'TMMonth')` para el nombre. El revenue promedio es el promedio de los totales mensuales de cada año (no el promedio de transacciones individuales). Excluye pedidos cancelados.

**Tablas necesarias:** `orders`, `order_items`

**Resultado esperado:** 12 filas (una por mes del año). Noviembre y diciembre aparecen en los primeros lugares. Marzo aparece en los últimos.

**Criterio de éxito:** CTE para el revenue mensual. GROUP BY externo por mes del año (no por mes-año). AVG sobre los totales mensuales. Ordenas por revenue_promedio DESC.

---

### Ejercicio Intermedio
**Contexto (Briefing 6.10 — Marco Jiménez):** Marco necesita el crecimiento YoY por país: revenue de 2024 vs 2025 por país, con la variación porcentual y el peso de cada país en el revenue total de 2025.

Escribe la query. Usa `EXTRACT(YEAR FROM ordered_at)` para el año. El formato del resultado es: una fila por país con columnas `revenue_2024`, `revenue_2025`, `crecimiento_yoy_pct` y `pct_revenue_2025`. Excluye pedidos cancelados.

**Tablas necesarias:** `customers`, `orders`, `order_items`

**Resultado esperado:** Una fila por país. El país con mayor crecimiento YoY aparece primero. Los porcentajes de revenue 2025 suman 100%. Chile muestra el crecimiento más bajo del grupo.

**Criterio de éxito:** Pivoteo con MAX(CASE WHEN año = N THEN valor END). NULLIF en el denominador de YoY. SUM OVER() para el denominador del porcentaje de mezcla. Ordenas por crecimiento_yoy_pct DESC.

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
WITH revenue_mensual AS (
    SELECT
        EXTRACT(MONTH FROM o.ordered_at)::INT       AS mes_numero,
        TO_CHAR(o.ordered_at, 'TMMonth')            AS mes_nombre,
        DATE_TRUNC('month', o.ordered_at)::DATE     AS mes,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)  AS revenue
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status <> 'cancelled'
    GROUP BY EXTRACT(MONTH FROM o.ordered_at),
             TO_CHAR(o.ordered_at, 'TMMonth'),
             DATE_TRUNC('month', o.ordered_at)
)
SELECT
    mes_numero,
    mes_nombre,
    ROUND(AVG(revenue), 2)  AS revenue_promedio,
    COUNT(*)                AS anios_con_datos
FROM revenue_mensual
GROUP BY mes_numero, mes_nombre
ORDER BY revenue_promedio DESC;
```

**Solución Ejercicio Intermedio:**
```sql
WITH revenue_anual_pais AS (
    SELECT
        c.country,
        EXTRACT(YEAR FROM o.ordered_at)::INT        AS anio,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)  AS revenue_anual
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id   = o.order_id
    INNER JOIN customers   c  ON c.customer_id = o.customer_id
    WHERE o.status <> 'cancelled'
    GROUP BY c.country, EXTRACT(YEAR FROM o.ordered_at)
)
SELECT
    country,
    MAX(CASE WHEN anio = 2024 THEN revenue_anual END)          AS revenue_2024,
    MAX(CASE WHEN anio = 2025 THEN revenue_anual END)          AS revenue_2025,
    ROUND(
        (MAX(CASE WHEN anio = 2025 THEN revenue_anual END)
         - MAX(CASE WHEN anio = 2024 THEN revenue_anual END))
        * 100.0
        / NULLIF(MAX(CASE WHEN anio = 2024 THEN revenue_anual END), 0),
        2
    )                                                           AS crecimiento_yoy_pct,
    ROUND(
        MAX(CASE WHEN anio = 2025 THEN revenue_anual END) * 100.0
        / NULLIF(
            SUM(MAX(CASE WHEN anio = 2025 THEN revenue_anual END)) OVER (),
            0
        ),
        1
    )                                                           AS pct_revenue_2025
FROM revenue_anual_pais
WHERE anio IN (2024, 2025)
GROUP BY country
ORDER BY crecimiento_yoy_pct DESC NULLS LAST;
```

</details>

---

## 6. ERRORES COMUNES

**Error 1 — Confundir GROUP BY mes-año con GROUP BY mes del año**

```sql
-- Para estacionalidad: agrupa por mes del año (1-12), ignorando el año
-- INCORRECTO para estacionalidad: agrupa por mes-año (2025-01, 2025-02...)
GROUP BY DATE_TRUNC('month', ordered_at)     -- da una fila por mes de cada año

-- CORRECTO para estacionalidad: agrupa por número de mes
GROUP BY EXTRACT(MONTH FROM ordered_at)      -- da una fila por mes del calendario
```

Error mental: usar `DATE_TRUNC('month', fecha)` cuando se quiere estacionalidad. `DATE_TRUNC` preserva el año — da 2025-01-01 y 2024-01-01 como filas distintas. `EXTRACT(MONTH)` da solo el número 1 para ambos enero, que es lo que se quiere para el promedio histórico.

**Error 2 — LAG(revenue, 12) con menos de 12 meses de historia**

```sql
-- Si la serie solo tiene 8 meses, LAG(revenue, 12) retorna NULL en todas las filas
-- No es un error — es el comportamiento correcto cuando no hay datos

-- Para verificar que tienes suficiente historia:
SELECT MIN(ordered_at), MAX(ordered_at),
       EXTRACT(MONTH FROM AGE(MAX(ordered_at), MIN(ordered_at))) AS meses_de_historia
FROM orders;
-- Si meses_de_historia < 12, no puedes hacer YoY con LAG(12)
```

**Error 3 — Rolling average con marco fijo que produce promedios de menos filas al inicio**

```sql
-- Los primeros 2 meses de la serie tienen menos de 3 filas en la ventana:
-- Mes 1: promedio de 1 fila (solo el mes 1)
-- Mes 2: promedio de 2 filas (mes 1 y 2)
-- Mes 3 en adelante: promedio de 3 filas (los 3 meses anteriores)

-- Esto es correcto y esperado. Si quieres excluir los meses con ventana incompleta:
WHERE mes > (SELECT MIN(mes) + INTERVAL '2 months' FROM revenue_mensual)
-- Esto muestra solo los meses donde la ventana ya está completa
```

**Error 4 — YoY sobre datos acumulados en lugar de períodos discretos**

```sql
-- INCORRECTO para YoY: si acumulas el revenue antes de aplicar LAG(12),
-- el "mismo mes del año anterior" en realidad es el acumulado del año anterior
-- hasta ese mes — no el mes discreto

-- CORRECTO: calcular el revenue mensual discreto, luego aplicar LAG(12)
WITH revenue_mensual AS (
    SELECT mes, SUM(revenue_mes) AS revenue  -- mensual discreto
    FROM ...
    GROUP BY mes
)
SELECT mes, revenue,
       LAG(revenue, 12) OVER (ORDER BY mes)  -- mismo mes del año anterior (discreto)
```

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

Con el análisis temporal avanzado tienes el cuadro completo de ShopSphere a lo largo del tiempo: qué meses son sistemáticamente buenos, cómo creció cada país año a año, y cómo suavizar la volatilidad para ver la tendencia real. Pero hay un componente que falta: el comportamiento en el sitio web antes de que el cliente haga clic en "Comprar". En el Nivel 7 se desbloquea `website_sessions` — y con ella puedes analizar el funnel de conversión completo: cuántos visitantes llega cada campaña, cuántos convierten y por qué los que no convirtieron se fueron.
