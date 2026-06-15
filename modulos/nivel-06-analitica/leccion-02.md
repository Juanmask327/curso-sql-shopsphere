# Nivel 6 — Analítica de Negocio
## Lección 2: FIRST_VALUE, LAST_VALUE y Análisis de Cohortes

> Tablas disponibles en este nivel: `customers`, `categories`, `products`, `orders`, `order_items`, `returns`, `inventory`, `marketing_campaigns`

> **Nota de dialecto:** Las funciones de fecha de esta lección (`DATE_TRUNC`, `EXTRACT`, `DATE_PART`) son de PostgreSQL y **no funcionan en el Playground** (que corre SQLite). Los equivalentes SQLite son: `strftime('%Y-%m-01', fecha)` en lugar de `DATE_TRUNC('month', ...)`, y `CAST(strftime('%Y', fecha) AS INT)` en lugar de `EXTRACT(YEAR FROM ...)`. Los ejercicios del nivel ya usan la sintaxis SQLite correcta.

---

## 1. INTRODUCCIÓN CONCEPTUAL

### La pregunta que Valentina lleva a los inversores

Valentina tiene un problema. El fondo mexicano preguntó en la última call: "¿cuánto vale un cliente de ShopSphere en promedio a lo largo de su ciclo de vida?" Y luego preguntó algo más difícil: "¿Los clientes que adquirieron en la campaña de hogar premium de septiembre 2025 volvieron a comprar?"

Esa segunda pregunta es la más importante: no cuántos clientes tienes, sino cuántos se quedan. Eso se llama análisis de cohortes.

Una **cohorte** es un grupo de clientes que comparten el mismo momento de su primera compra. Los clientes que compraron por primera vez en enero 2025 son la cohorte de enero. Los de febrero son la cohorte de febrero. El análisis de cohortes compara qué porcentaje de cada cohorte volvió a comprar en los meses siguientes — eso mide la retención real, no la percibida.

Para construir un análisis de cohortes necesitas dos herramientas que trabajan juntas:

**FIRST_VALUE** — retorna el primer valor de un grupo ordenado. Lo usas para asignar a cada cliente su mes de primera compra, sin importar cuántas compras tenga después.

**LAST_VALUE** — retorna el último valor del marco de ventana. Requiere especificar el marco explícitamente para que funcione correctamente.

**LTV (Lifetime Value)** — el revenue total que un cliente generó desde su primera compra hasta hoy. Con window functions puedes calcularlo acumulativamente: el LTV de cada cliente a los 30 días, a los 60, a los 90.

---

## 2. SINTAXIS

### FIRST_VALUE — el primer valor del marco

```sql
FIRST_VALUE(columna) OVER (
    [PARTITION BY columna_de_agrupacion]
    ORDER BY columna_de_orden
    [ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW]  -- marco por defecto
)
```

`FIRST_VALUE` retorna el valor de la primera fila del marco de ventana. Con el marco por defecto (todas las filas desde el inicio de la partición hasta la fila actual), siempre retorna el primer valor de la partición — lo cual es lo que normalmente quieres.

**Uso típico:** asignar a cada fila el valor de la primera ocurrencia en su grupo.

```sql
-- Asignar a cada pedido la fecha del primer pedido del cliente
FIRST_VALUE(ordered_at) OVER (
    PARTITION BY customer_id
    ORDER BY ordered_at
)
```

### LAST_VALUE — el último valor del marco (requiere marco explícito)

```sql
LAST_VALUE(columna) OVER (
    [PARTITION BY columna_de_agrupacion]
    ORDER BY columna_de_orden
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING  -- OBLIGATORIO
)
```

**Atención crítica:** `LAST_VALUE` con el marco por defecto (`UNBOUNDED PRECEDING AND CURRENT ROW`) devuelve el valor de la fila actual — no el último de la partición. Para obtener el último valor real, debes especificar el marco completo: `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`.

```sql
-- INCORRECTO: marco por defecto — devuelve el valor actual, no el último
LAST_VALUE(ordered_at) OVER (PARTITION BY customer_id ORDER BY ordered_at)

-- CORRECTO: marco explícito que incluye todas las filas de la partición
LAST_VALUE(ordered_at) OVER (
    PARTITION BY customer_id
    ORDER BY ordered_at
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
)
```

### Análisis de cohortes — el patrón estándar

```sql
-- Paso 1: asignar el mes de primera compra a cada cliente
WITH primer_pedido AS (
    SELECT
        customer_id,
        DATE_TRUNC('month', MIN(ordered_at))::DATE  AS cohorte
    FROM orders
    WHERE status <> 'cancelled'
    GROUP BY customer_id
),
-- Paso 2: cruzar cada pedido con la cohorte del cliente
pedidos_con_cohorte AS (
    SELECT
        o.customer_id,
        pc.cohorte,
        DATE_TRUNC('month', o.ordered_at)::DATE  AS mes_pedido,
        -- número de meses desde la primera compra:
        -- 0 = mes de adquisición, 1 = primer mes de retención, etc.
        (DATE_TRUNC('month', o.ordered_at) - pc.cohorte) / 30  AS mes_desde_adquisicion
    FROM orders o
    INNER JOIN primer_pedido pc ON pc.customer_id = o.customer_id
    WHERE o.status <> 'cancelled'
)
-- Paso 3: tabla de retención
SELECT
    cohorte,
    mes_desde_adquisicion,
    COUNT(DISTINCT customer_id)  AS clientes_activos
FROM pedidos_con_cohorte
GROUP BY cohorte, mes_desde_adquisicion
ORDER BY cohorte, mes_desde_adquisicion;
```

---

## 3. EJEMPLO PRÁCTICO

### Contexto: Valentina necesita el análisis de cohortes de 2025

**Query 1 — La forma mínima: asignar cohorte a cada cliente con FIRST_VALUE**

```sql
-- FIRST_VALUE para asignar la fecha de primera compra a cada pedido del cliente
SELECT
    o.customer_id,
    o.order_id,
    o.ordered_at,
    FIRST_VALUE(o.ordered_at) OVER (
        PARTITION BY o.customer_id
        ORDER BY o.ordered_at
    )::DATE                               AS primera_compra,
    DATE_TRUNC('month',
        FIRST_VALUE(o.ordered_at) OVER (
            PARTITION BY o.customer_id
            ORDER BY o.ordered_at
        )
    )::DATE                               AS cohorte
FROM orders o
WHERE o.status <> 'cancelled'
ORDER BY o.customer_id, o.ordered_at
LIMIT 15;
```

Output (fragmento):

| customer_id | order_id | ordered_at | primera_compra | cohorte |
|---|---|---|---|---|
| 1 | 101 | 2025-01-15 | 2025-01-15 | 2025-01-01 |
| 1 | 284 | 2025-03-22 | 2025-01-15 | 2025-01-01 |
| 1 | 891 | 2025-11-08 | 2025-01-15 | 2025-01-01 |
| 2 | 156 | 2025-02-03 | 2025-02-03 | 2025-02-01 |
| 2 | 672 | 2025-06-17 | 2025-02-03 | 2025-02-01 |

El cliente 1 pertenece a la cohorte de enero (su primera compra fue el 15 de enero). Todos sus pedidos posteriores conservan esa etiqueta de cohorte.

**Query 2 — Análisis de retención: porcentaje de cada cohorte que volvió al mes siguiente**

Esta es la query que responde al pedido de Valentina (Briefing 6.6):

```sql
WITH primer_pedido AS (
    SELECT
        customer_id,
        DATE_TRUNC('month', MIN(ordered_at))::DATE  AS cohorte
    FROM orders
    WHERE status <> 'cancelled'
    GROUP BY customer_id
),
retenciones AS (
    SELECT
        pp.cohorte,
        pp.customer_id,
        -- ¿volvió a comprar en el mes siguiente a su cohorte?
        MAX(CASE
            WHEN DATE_TRUNC('month', o.ordered_at)::DATE
                 = (pp.cohorte + INTERVAL '1 month')::DATE
            THEN 1
            ELSE 0
        END)                                         AS retuvo_mes_2
    FROM primer_pedido pp
    LEFT JOIN orders o ON o.customer_id = pp.customer_id
                       AND o.status     <> 'cancelled'
    GROUP BY pp.cohorte, pp.customer_id
)
SELECT
    cohorte,
    COUNT(*)                                              AS clientes_nuevos,
    SUM(retuvo_mes_2)                                    AS retuvieron_mes_2,
    ROUND(
        SUM(retuvo_mes_2) * 100.0
        / NULLIF(COUNT(*), 0),
        1
    )                                                    AS tasa_retencion_pct
FROM retenciones
WHERE cohorte >= '2025-01-01'
  AND cohorte <  '2026-01-01'
GROUP BY cohorte
ORDER BY tasa_retencion_pct DESC;
```

Output (2025):

| cohorte | clientes_nuevos | retuvieron_mes_2 | tasa_retencion_pct |
|---|---|---|---|
| 2025-09-01 | 523 | 187 | 35,8 |
| 2025-11-01 | 641 | 218 | 34,0 |
| 2025-04-01 | 489 | 159 | 32,5 |
| 2025-03-01 | 398 | 78 | 19,6 |

Valentina mira septiembre: "35.8% — es la cohorte con mejor retención del año. La campaña de hogar premium trajo clientes de calidad." Y mira marzo: "19.6% — la Campaña de Regreso a Clases trajo clientes que no volvieron. Eso explica por qué el revenue cayó en abril."

**Query 3 — LTV acumulado por cliente con running total**

El LTV (Lifetime Value) acumulado muestra cuánto ha generado un cliente desde su primera compra:

```sql
WITH compras_por_mes AS (
    SELECT
        o.customer_id,
        DATE_TRUNC('month', o.ordered_at)::DATE    AS mes,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)  AS revenue_mes
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status <> 'cancelled'
    GROUP BY o.customer_id, DATE_TRUNC('month', o.ordered_at)
)
SELECT
    customer_id,
    mes,
    revenue_mes,
    -- LTV acumulado: suma de todos los meses anteriores + el actual
    SUM(revenue_mes) OVER (
        PARTITION BY customer_id
        ORDER BY mes
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    )                                               AS ltv_acumulado
FROM compras_por_mes
ORDER BY customer_id, mes
LIMIT 20;
```

Output (fragmento, cliente 1):

| customer_id | mes | revenue_mes | ltv_acumulado |
|---|---|---|---|
| 1 | 2025-01-01 | 284,00 | 284,00 |
| 1 | 2025-03-01 | 156,50 | 440,50 |
| 1 | 2025-11-01 | 389,00 | 829,50 |

**Query 4 — LTV promedio por país (Briefing 6.7 — Valentina)**

Para la presentación a inversores, el LTV promedio por país con mediana:

```sql
WITH ltv_por_cliente AS (
    SELECT
        o.customer_id,
        c.country,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)  AS ltv_total
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id   = o.order_id
    INNER JOIN customers   c  ON c.customer_id = o.customer_id
    WHERE o.status <> 'cancelled'
    GROUP BY o.customer_id, c.country
)
SELECT
    country,
    COUNT(DISTINCT customer_id)                   AS clientes_activos,
    ROUND(AVG(ltv_total), 2)                      AS ltv_promedio,
    ROUND(PERCENTILE_CONT(0.5)
          WITHIN GROUP (ORDER BY ltv_total), 2)   AS ltv_mediana,
    ROUND(MIN(ltv_total), 2)                      AS ltv_minimo,
    ROUND(MAX(ltv_total), 2)                      AS ltv_maximo
FROM ltv_por_cliente
GROUP BY country
ORDER BY ltv_promedio DESC;
```

Output (fragmento):

| country | clientes_activos | ltv_promedio | ltv_mediana | ltv_minimo | ltv_maximo |
|---|---|---|---|---|---|
| Chile | 892 | 1.284,50 | 890,00 | 45,00 | 18.400,00 |
| Colombia | 1.241 | 1.102,30 | 780,00 | 30,00 | 15.200,00 |
| Mexico | 1.890 | 987,60 | 720,00 | 25,00 | 22.800,00 |

La mediana es significativamente menor al promedio en todos los países — hay clientes de muy alto valor que tiran el promedio hacia arriba. Valentina lo usa para contextualizar: "El cliente promedio vale $987 en México, pero la mitad de los clientes valen menos de $720."

---

## 4. CASOS DE USO REALES

**Caso 1 — Análisis de retención y churn por cohorte**
El análisis de cohortes es el estándar de la industria para medir la calidad de la adquisición de clientes. Startups de e-commerce lo usan para comparar si las cohortes nuevas retienen mejor o peor que las antiguas — un deterioro en la retención es señal temprana de problemas de producto o experiencia.
*Rol que lo usa: Growth Analyst, Product Analyst, Data Analyst.*

**Caso 2 — LTV para decisiones de presupuesto de marketing**
Si el LTV promedio de un cliente es $1.000, y adquirir un cliente nuevo cuesta $150, la empresa tiene un payback period razonable. Sofía lo usa para justificar el presupuesto de campañas de adquisición frente a Marco. Si el LTV cae, el presupuesto de adquisición tiene que bajar también.
*Rol que lo usa: Marketing Analyst, Financial Analyst.*

**Caso 3 — FIRST_VALUE para análisis de "primer toque" en atribución**
En marketing de performance, el "primer canal de adquisición" de un cliente es valioso. `FIRST_VALUE(channel)` sobre las sesiones de un usuario (ordenadas por fecha) da el primer canal que lo trajo al sitio — la base del modelo de atribución de primer toque. Esto se amplía en la Lección 3 con la tabla `marketing_campaigns`.
*Rol que lo usa: Marketing Analyst, Data Analyst.*

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico
**Contexto (Briefing 6.6 — Valentina Torres):** Valentina quiere el análisis de cohortes básico de 2025: por cada mes de primera compra, el total de clientes nuevos, cuántos volvieron el mes siguiente y la tasa de retención. Ordena de mayor a menor tasa de retención.

Escribe la query. Define "primera compra" usando MIN(ordered_at) agrupado por customer_id. Define "volvió en el mes siguiente" como cualquier pedido en el mes `cohorte + 1 mes`. Excluye pedidos cancelados.

**Tablas necesarias:** `orders`

**Resultado esperado:** 12 filas (una por mes de 2025). La tasa de retención varía entre meses. La cohorte de marzo 2025 debería mostrar una tasa inferior a la media (consecuencia de la campaña de Regreso a Clases).

**Criterio de éxito:** Usas MIN(ordered_at) en una CTE. El cálculo de retención usa `cohorte + INTERVAL '1 month'`. NULLIF en el denominador de la tasa. Ordenas por tasa de retención descendente.

---

### Ejercicio Intermedio
**Contexto (Briefing 6.7 — Valentina Torres):** El fondo mexicano preguntó cuánto vale un cliente de ShopSphere por país. Valentina necesita el LTV promedio y la mediana por país, con el número de clientes activos para dar contexto.

Escribe la query usando `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ltv_total)` para la mediana. El LTV de cada cliente es la suma total de `quantity * unit_price` en todos sus pedidos no cancelados. Incluye solo clientes que tienen al menos un pedido no cancelado. Ordena por LTV promedio descendente.

**Tablas necesarias:** `customers`, `orders`, `order_items`

**Resultado esperado:** Una fila por país. El promedio es mayor a la mediana en todos los países (por clientes de alto valor). El número de clientes activos es distinto por país.

**Criterio de éxito:** CTE para calcular LTV por cliente. Outer query agrupa por país. PERCENTILE_CONT para la mediana. ROUND a 2 decimales. Ordenas por ltv_promedio DESC.

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
WITH primer_pedido AS (
    SELECT
        customer_id,
        DATE_TRUNC('month', MIN(ordered_at))::DATE  AS cohorte
    FROM orders
    WHERE status <> 'cancelled'
    GROUP BY customer_id
),
retenciones AS (
    SELECT
        pp.cohorte,
        pp.customer_id,
        MAX(CASE
            WHEN DATE_TRUNC('month', o.ordered_at)::DATE
                 = (pp.cohorte + INTERVAL '1 month')::DATE
            THEN 1
            ELSE 0
        END)                                         AS retuvo_mes_2
    FROM primer_pedido pp
    LEFT JOIN orders o ON o.customer_id = pp.customer_id
                       AND o.status     <> 'cancelled'
    GROUP BY pp.cohorte, pp.customer_id
)
SELECT
    cohorte,
    COUNT(*)                                              AS clientes_nuevos,
    SUM(retuvo_mes_2)                                    AS retuvieron_mes_2,
    ROUND(
        SUM(retuvo_mes_2) * 100.0
        / NULLIF(COUNT(*), 0),
        1
    )                                                    AS tasa_retencion_pct
FROM retenciones
WHERE cohorte >= '2025-01-01'
  AND cohorte <  '2026-01-01'
GROUP BY cohorte
ORDER BY tasa_retencion_pct DESC;
```

**Solución Ejercicio Intermedio:**
```sql
WITH ltv_por_cliente AS (
    SELECT
        o.customer_id,
        c.country,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)  AS ltv_total
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id   = o.order_id
    INNER JOIN customers   c  ON c.customer_id = o.customer_id
    WHERE o.status <> 'cancelled'
    GROUP BY o.customer_id, c.country
)
SELECT
    country,
    COUNT(DISTINCT customer_id)                   AS clientes_activos,
    ROUND(AVG(ltv_total), 2)                      AS ltv_promedio,
    ROUND(PERCENTILE_CONT(0.5)
          WITHIN GROUP (ORDER BY ltv_total), 2)   AS ltv_mediana
FROM ltv_por_cliente
GROUP BY country
ORDER BY ltv_promedio DESC;
```

</details>

---

## 6. ERRORES COMUNES

**Error 1 — LAST_VALUE devuelve el valor actual en lugar del último**

```sql
-- INCORRECTO: marco por defecto devuelve el valor de la fila actual
-- (no el último de la partición)
LAST_VALUE(ordered_at) OVER (
    PARTITION BY customer_id
    ORDER BY ordered_at
)

-- CORRECTO: especificar el marco completo
LAST_VALUE(ordered_at) OVER (
    PARTITION BY customer_id
    ORDER BY ordered_at
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
)
```

Error mental: asumir que `LAST_VALUE` funciona simétricamente a `FIRST_VALUE`. No lo hace: el marco por defecto incluye filas desde el inicio hasta la fila actual, por lo que `LAST_VALUE` siempre retorna la fila actual. Hay que expandir el marco explícitamente.

**Error 2 — Confundir "primera compra" con MIN en una subquery vs. FIRST_VALUE**

```sql
-- Ambas formas son válidas, pero la primera es más legible para análisis de cohortes:

-- FORMA 1 (recomendada para cohortes): MIN en GROUP BY
WITH primer_pedido AS (
    SELECT customer_id, MIN(ordered_at) AS primera_compra
    FROM orders WHERE status <> 'cancelled'
    GROUP BY customer_id
)
-- Esta forma ya tiene un registro por cliente — más eficiente para JOIN posterior

-- FORMA 2 (con FIRST_VALUE): útil cuando necesitas mantener todas las filas
FIRST_VALUE(ordered_at) OVER (
    PARTITION BY customer_id ORDER BY ordered_at
) AS primera_compra
-- Esta forma repite la fecha en cada fila del cliente — útil para comparar
-- cada pedido contra la primera compra en la misma fila
```

No es un error técnico, sino de elección: usa MIN en CTE para análisis de cohortes (un registro por cliente), y FIRST_VALUE cuando necesitas la primera fecha en cada fila de una tabla de transacciones.

**Error 3 — Cohorte calculada en meses vs. en días produce resultados distintos**

```sql
-- INCORRECTO para cohortes mensuales: usa días en lugar de mes truncado
DATE_TRUNC('month', MIN(ordered_at)) -- CORRECTO: trunca al inicio del mes

-- Bug común: si la primera compra fue el 15 de enero y la segunda el 3 de febrero,
-- calcular la diferencia en días (19 días) y dividir por 30 da 0 meses —
-- lo que asigna la segunda compra al mismo "mes de cohorte" erróneamente.
-- Siempre trunca ambas fechas al mes antes de calcular la diferencia.

-- CORRECTO:
(DATE_TRUNC('month', o.ordered_at) - DATE_TRUNC('month', primera_compra))
-- Esto da un INTERVAL de meses exactos: 0, 1, 2, 3...
```

**Error 4 — Incluir pedidos cancelados en el LTV o en el análisis de cohortes**

```sql
-- INCORRECTO: incluye pedidos cancelados en el LTV
SUM(oi.quantity * oi.unit_price)  -- sin filtrar status

-- CORRECTO: excluir cancelados — no generaron revenue real
WHERE o.status <> 'cancelled'
-- o: AND o.status IN ('delivered', 'shipped')
```

Error mental: no filtrar por status en el análisis de cohortes. Un pedido cancelado no debe contar como "cliente activo en ese mes" ni como revenue — incluirlo infla el LTV y distorsiona las tasas de retención.

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

Ya sabes cómo medir la retención de clientes y su valor acumulado. La pregunta natural que sigue es: ¿qué impulsó esa retención? ¿Fue una campaña de marketing específica? ¿Un canal mejor que otro? La Lección 3 introduce la tabla `marketing_campaigns` y te enseña a calcular el ROI de cada campaña — conectando el gasto de marketing con el revenue que generó, y respondiendo por qué la Campaña de Regreso a Clases de marzo 2025 resultó en la peor tasa de retención del año.
