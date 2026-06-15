# Nivel 6 — Analítica de Negocio
## Lección 3: Análisis de Campañas de Marketing — ROI, CAC y eficiencia por canal

> Tablas disponibles en este nivel: `customers`, `categories`, `products`, `orders`, `order_items`, `returns`, `inventory`, `marketing_campaigns`

> **Nota de dialecto:** Las funciones de fecha de esta lección (`DATE_TRUNC`, `EXTRACT`, `DATE_PART`) son de PostgreSQL y **no funcionan en el Playground** (que corre SQLite). Los equivalentes SQLite son: `strftime('%Y-%m-01', fecha)` en lugar de `DATE_TRUNC('month', ...)`, y `CAST(strftime('%Y', fecha) AS INT)` en lugar de `EXTRACT(YEAR FROM ...)`. Los ejercicios del nivel ya usan la sintaxis SQLite correcta.

---

## 1. INTRODUCCIÓN CONCEPTUAL

### La tabla nueva: marketing_campaigns

Sofía lleva semanas repitiendo la misma pregunta en cada reunión: "¿Cuánto generó la campaña de Regreso a Clases comparado con lo que gastamos?" El problema es que hasta ahora nadie en ShopSphere podía responderla con datos — porque los datos de campañas vivían en una hoja de Excel separada del sistema transaccional.

Con el Nivel 6 se desbloquea la tabla `marketing_campaigns`. Esta tabla conecta el gasto de marketing con las operaciones de venta, y permite calcular el ROI de cada campaña y comparar la eficiencia por canal.

### La estructura de marketing_campaigns

```sql
CREATE TABLE marketing_campaigns (
    campaign_id  INT PRIMARY KEY,
    name         VARCHAR(150) NOT NULL,
    channel      VARCHAR(80) CHECK (channel IN ('email','social','paid_search','display','affiliate')),
    started_at   DATE NOT NULL,
    ended_at     DATE,          -- NULL si la campaña sigue activa
    budget       DECIMAL(12, 2),
    spent        DECIMAL(12, 2) -- lo que se gastó realmente (puede diferir del budget)
);
```

Las métricas clave de esta tabla:
- `budget`: presupuesto asignado a la campaña
- `spent`: gasto ejecutado real — es el denominador del ROI
- `started_at / ended_at`: el período activo de la campaña — define qué pedidos se "atribuyen" a ella

### El modelo de atribución directa

La atribución es el problema central del marketing analytics: ¿qué revenue podemos asignar a una campaña? La forma más simple — y la que usamos en este nivel — es la **atribución directa por período**: todos los pedidos realizados durante el período activo de la campaña se atribuyen a ella.

Este es un modelo simplificado (el modelo real de atribución requiere `website_sessions`, que se introduce en el Nivel 7), pero es suficiente para calcular el ROI de primer orden y tomar decisiones de presupuesto.

### ROI y CAC — las dos métricas de marketing más importantes

```
ROI = (revenue_atribuible - spent) / spent * 100
```
- ROI > 0: la campaña generó más de lo que costó
- ROI = 0: break-even — recuperamos exactamente lo gastado
- ROI < 0: la campaña costó más de lo que generó

```
CAC = spent / clientes_nuevos_adquiridos
```
- CAC (Customer Acquisition Cost): cuánto cuesta adquirir un cliente nuevo
- Comparar CAC con LTV: si LTV >> CAC, la unidad de negocio es positiva

---

## 2. SINTAXIS

### JOIN de campañas con pedidos por período

La lógica de atribución usa `BETWEEN` o comparación de fechas para vincular pedidos con campañas activas:

```sql
FROM marketing_campaigns mc
INNER JOIN orders o ON o.ordered_at::DATE BETWEEN mc.started_at
                                               AND COALESCE(mc.ended_at, CURRENT_DATE)
```

El `COALESCE(mc.ended_at, CURRENT_DATE)` maneja campañas sin fecha de fin registrada (aún activas). Sin él, las campañas sin `ended_at` no harían match con ningún pedido porque `date BETWEEN start AND NULL` siempre es NULL.

### ROI calculado en SQL

```sql
ROUND(
    (SUM(oi.quantity * oi.unit_price) - mc.spent)
    * 100.0
    / NULLIF(mc.spent, 0),
    2
) AS roi_pct
```

### Comparación de canales con GROUP BY

```sql
SELECT
    mc.channel,
    COUNT(DISTINCT mc.campaign_id)           AS num_campanas,
    SUM(mc.spent)                            AS gasto_total,
    SUM(oi.quantity * oi.unit_price)         AS revenue_atribuible,
    ROUND(
        (SUM(oi.quantity * oi.unit_price) - SUM(mc.spent))
        * 100.0
        / NULLIF(SUM(mc.spent), 0),
        2
    )                                        AS roi_canal_pct
FROM marketing_campaigns mc
INNER JOIN orders      o  ON o.ordered_at::DATE BETWEEN mc.started_at
                                                    AND COALESCE(mc.ended_at, CURRENT_DATE)
INNER JOIN order_items oi ON oi.order_id = o.order_id
WHERE o.status <> 'cancelled'
GROUP BY mc.channel
ORDER BY roi_canal_pct DESC;
```

---

## 3. EJEMPLO PRÁCTICO

### Contexto: Sofía analiza el ROI de las campañas del último año

**Query 1 — La forma mínima: revenue atribuible por campaña**

```sql
SELECT
    mc.campaign_id,
    mc.name                                          AS campana,
    mc.channel,
    mc.started_at,
    mc.ended_at,
    mc.spent,
    ROUND(SUM(oi.quantity * oi.unit_price), 2)       AS revenue_atribuible
FROM marketing_campaigns mc
INNER JOIN orders      o  ON o.ordered_at::DATE BETWEEN mc.started_at
                                                    AND COALESCE(mc.ended_at, CURRENT_DATE)
INNER JOIN order_items oi ON oi.order_id = o.order_id
WHERE o.status          <> 'cancelled'
  AND mc.started_at     >= '2025-01-01'
GROUP BY mc.campaign_id, mc.name, mc.channel, mc.started_at, mc.ended_at, mc.spent
ORDER BY revenue_atribuible DESC;
```

Output (fragmento):

| campaign_id | campana | channel | started_at | spent | revenue_atribuible |
|---|---|---|---|---|---|
| 12 | Black Friday 2025 | email | 2025-11-25 | 45.000,00 | 892.400,00 |
| 8 | Hogar Premium Sep | social | 2025-09-01 | 28.000,00 | 412.300,00 |
| 5 | Regreso a Clases | paid_search | 2025-03-01 | 35.000,00 | 198.200,00 |

**Query 2 — ROI completo por campaña (Briefing 6.3 — Sofía Ramírez)**

```sql
WITH revenue_campanas AS (
    SELECT
        mc.campaign_id,
        mc.name                                           AS campana,
        mc.channel,
        mc.started_at,
        mc.ended_at,
        mc.budget,
        mc.spent,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)        AS revenue_atribuible,
        COUNT(DISTINCT o.customer_id)                     AS clientes_en_periodo
    FROM marketing_campaigns mc
    INNER JOIN orders      o  ON o.ordered_at::DATE BETWEEN mc.started_at
                                                        AND COALESCE(mc.ended_at, CURRENT_DATE)
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status      <> 'cancelled'
      AND mc.started_at >= '2025-01-01'
    GROUP BY mc.campaign_id, mc.name, mc.channel,
             mc.started_at, mc.ended_at, mc.budget, mc.spent
)
SELECT
    campana,
    channel,
    started_at,
    ended_at,
    budget,
    spent,
    revenue_atribuible,
    ROUND(revenue_atribuible - spent, 2)                  AS margen_bruto,
    ROUND(
        (revenue_atribuible - spent) * 100.0
        / NULLIF(spent, 0),
        2
    )                                                     AS roi_pct,
    -- Bandera para campañas con ROI negativo
    CASE WHEN revenue_atribuible < spent THEN 'ROI NEGATIVO' ELSE '' END AS alerta,
    ROUND(spent / NULLIF(clientes_en_periodo, 0), 2)      AS cac
FROM revenue_campanas
ORDER BY roi_pct DESC NULLS LAST;
```

Output (fragmento):

| campana | channel | spent | revenue_atribuible | roi_pct | alerta | cac |
|---|---|---|---|---|---|---|
| Black Friday 2025 | email | 45.000,00 | 892.400,00 | 1883,11 | | 8,20 |
| Hogar Premium Sep | social | 28.000,00 | 412.300,00 | 1372,50 | | 14,30 |
| Regreso a Clases | paid_search | 35.000,00 | 198.200,00 | 466,29 | | 27,80 |
| Display Q2 | display | 18.000,00 | 12.400,00 | -31,11 | ROI NEGATIVO | 45,60 |

Sofía ve la tabla y la procesa en segundos: "Black Friday tuvo ROI 18x. Hogar Premium 13x. Regreso a Clases solo 4x — y gastamos $35.000. Display Q2 fue pérdida directa. Para Q3, todo el presupuesto va a email y social."

**Query 3 — Comparación de canales: eficiencia por tipo (Briefing 6.2 — Sofía)**

```sql
SELECT
    mc.channel,
    COUNT(DISTINCT mc.campaign_id)                AS num_campanas,
    ROUND(SUM(mc.spent), 2)                       AS gasto_total,
    ROUND(SUM(oi.quantity * oi.unit_price), 2)    AS revenue_total,
    ROUND(
        (SUM(oi.quantity * oi.unit_price) - SUM(mc.spent))
        * 100.0
        / NULLIF(SUM(mc.spent), 0),
        2
    )                                             AS roi_canal_pct,
    -- Revenue promedio por dólar gastado
    ROUND(
        SUM(oi.quantity * oi.unit_price)
        / NULLIF(SUM(mc.spent), 0),
        2
    )                                             AS revenue_por_dolar
FROM marketing_campaigns mc
INNER JOIN orders      o  ON o.ordered_at::DATE BETWEEN mc.started_at
                                                    AND COALESCE(mc.ended_at, CURRENT_DATE)
INNER JOIN order_items oi ON oi.order_id = o.order_id
WHERE o.status <> 'cancelled'
GROUP BY mc.channel
ORDER BY roi_canal_pct DESC;
```

Output:

| channel | num_campanas | gasto_total | revenue_total | roi_canal_pct | revenue_por_dolar |
|---|---|---|---|---|---|
| email | 4 | 120.000,00 | 2.180.000,00 | 1716,67 | 18,17 |
| social | 3 | 85.000,00 | 980.000,00 | 1052,94 | 11,53 |
| paid_search | 3 | 95.000,00 | 780.000,00 | 721,05 | 8,21 |
| affiliate | 2 | 40.000,00 | 180.000,00 | 350,00 | 4,50 |
| display | 2 | 35.000,00 | 95.000,00 | 171,43 | 2,71 |

Email genera $18 por cada $1 gastado. Display genera $2.71. La distribución de presupuesto Q3 se escribe sola.

**Query 4 — Análisis de la Campaña de Regreso a Clases (Briefing 6.1 — Sofía)**

```sql
-- ¿Cuál de los tres canales de la campaña rindió peor?
WITH regreso_clases AS (
    SELECT
        mc.campaign_id,
        mc.channel,
        mc.started_at,
        mc.ended_at,
        mc.spent,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)  AS revenue_atribuible,
        COUNT(DISTINCT o.customer_id)               AS clientes
    FROM marketing_campaigns mc
    INNER JOIN orders      o  ON o.ordered_at::DATE BETWEEN mc.started_at
                                                        AND COALESCE(mc.ended_at, CURRENT_DATE)
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status <> 'cancelled'
      AND mc.name LIKE '%Regreso a Clases%'    -- todos los canales de esta campaña
    GROUP BY mc.campaign_id, mc.channel, mc.started_at, mc.ended_at, mc.spent
)
SELECT
    channel,
    spent,
    revenue_atribuible,
    ROUND((revenue_atribuible - spent) * 100.0 / NULLIF(spent, 0), 2)  AS roi_pct,
    ROUND(spent / NULLIF(clientes, 0), 2)                               AS cac,
    clientes
FROM regreso_clases
ORDER BY roi_pct DESC;
```

Output:

| channel | spent | revenue_atribuible | roi_pct | cac | clientes |
|---|---|---|---|---|---|
| email | 10.000,00 | 89.400,00 | 794,00 | 18,50 | 541 |
| social | 12.000,00 | 71.200,00 | 493,33 | 31,20 | 385 |
| paid_search | 13.000,00 | 37.600,00 | 189,23 | 65,80 | 198 |

Sofía lo ve: "Paid search fue el canal más caro y el de menor retorno en esa campaña. Email funcionó 4 veces mejor por dólar. Para junio, Regreso a Clases va solo en email."

---

## 4. CASOS DE USO REALES

**Caso 1 — Evaluación de ROI para aprobación de presupuesto (el uso más directo)**
Antes de aprobar el presupuesto Q3, Valentina pide el ROI de cada campaña del último año. La query de ROI por campaña es el insumo principal de esa decisión. En empresas donde el marketing es el mayor gasto operativo, esta query puede impactar directamente en millones de dólares de asignación presupuestaria.
*Rol que lo usa: Marketing Analyst, Financial Analyst, CMO.*

**Caso 2 — Comparación de eficiencia por canal para estrategia de mix de medios**
No todas las empresas tienen el mismo canal más eficiente. Para ShopSphere es email. Para otra empresa podría ser paid search. La comparación de ROI por canal define el "media mix" — la distribución del presupuesto entre canales. Esta query, ejecutada cada trimestre, es la base de la estrategia de medios.
*Rol que lo usa: Marketing Analyst, Growth Analyst.*

**Caso 3 — CAC para calibrar LTV/CAC — la métrica de salud del negocio**
El ratio LTV/CAC es una de las métricas de salud más usadas en startups y e-commerce. Si LTV = $1.000 y CAC = $150, el ratio es 6.7x — saludable. Si el CAC sube a $500 con el mismo LTV, el negocio está perdiendo dinero en adquisición. Combinar el CAC de esta lección con el LTV de la Lección 2 da el análisis completo de economía unitaria.
*Rol que lo usa: CFO, Growth Analyst, Data Analyst.*

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico
**Contexto (Briefing 6.3 — Sofía Ramírez):** Sofía necesita el ROI de todas las campañas activas en 2025. Quiere: nombre, canal, gasto ejecutado (spent), revenue atribuible, ROI porcentual y una columna de alerta que diga 'ROI NEGATIVO' si el revenue fue menor al gasto. Ordena por ROI descendente.

Escribe la query. El revenue atribuible son todos los pedidos no cancelados durante el período activo de cada campaña. Usa COALESCE para manejar campañas sin `ended_at`. Usa NULLIF en el denominador del ROI.

**Tablas necesarias:** `marketing_campaigns`, `orders`, `order_items`

**Resultado esperado:** Una fila por campaña. Las campañas con ROI negativo aparecen al final con la alerta activa. El ROI positivo más alto es el de Black Friday 2025.

**Criterio de éxito:** JOIN por período con BETWEEN. NULLIF en denominador. CASE WHEN para la alerta. GROUP BY por todas las columnas de campaign. ORDER BY roi_pct DESC NULLS LAST.

---

### Ejercicio Intermedio
**Contexto (Briefing 6.9 — Ana Castillo — ADAPTADO):** Ana detectó un spike de pedidos cancelados en Chile durante marzo-abril 2026. Como los datos de pago pertenecen a un sistema separado que aún no está integrado (se verá en el Nivel 8), se usa `orders.status = 'cancelled'` como proxy de "transacción no completada". Ana quiere: por mes para los últimos 6 meses (diciembre 2025 a mayo 2026), el total de pedidos, los pedidos cancelados, la tasa de cancelación porcentual y la tasa del mes anterior para ver la tendencia. Solo para Chile.

Escribe la query con una CTE que calcule la tasa por mes, luego aplica LAG sobre ella. Usa NULLIF en el denominador de la tasa. La tasa se define como `cancelados / total * 100`.

**Nota pedagógica:** En el Nivel 8, cuando se integre la tabla `payments`, este análisis se reemplazará por la tasa real de pagos fallidos desagregada por método de pago. Por ahora, `orders.status = 'cancelled'` es el mejor proxy disponible.

**Tablas necesarias:** `orders`, `customers`

**Resultado esperado:** 6 filas (dic 2025 a may 2026). Chile muestra una tasa de cancelación significativamente más alta en marzo-abril 2026. El primer mes (diciembre) tiene NULL en tasa_mes_anterior.

**Criterio de éxito:** CTE para la tasa mensual. LAG sobre la tasa con ORDER BY mes. JOIN con customers para filtrar por country = 'Chile'. NULLIF en denominador. Filtro de fecha correcto para 6 meses.

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
WITH revenue_campanas AS (
    SELECT
        mc.campaign_id,
        mc.name                                           AS campana,
        mc.channel,
        mc.spent,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)        AS revenue_atribuible
    FROM marketing_campaigns mc
    INNER JOIN orders      o  ON o.ordered_at::DATE BETWEEN mc.started_at
                                                        AND COALESCE(mc.ended_at, CURRENT_DATE)
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status      <> 'cancelled'
      AND mc.started_at >= '2025-01-01'
      AND mc.started_at <  '2026-01-01'
    GROUP BY mc.campaign_id, mc.name, mc.channel, mc.spent
)
SELECT
    campana,
    channel,
    spent,
    revenue_atribuible,
    ROUND(
        (revenue_atribuible - spent) * 100.0
        / NULLIF(spent, 0),
        2
    )                                                     AS roi_pct,
    CASE WHEN revenue_atribuible < spent THEN 'ROI NEGATIVO' ELSE '' END AS alerta
FROM revenue_campanas
ORDER BY roi_pct DESC NULLS LAST;
```

**Solución Ejercicio Intermedio:**
```sql
WITH pedidos_chile_mes AS (
    SELECT
        DATE_TRUNC('month', o.ordered_at)::DATE       AS mes,
        COUNT(*)                                        AS total_pedidos,
        SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END)
                                                        AS pedidos_cancelados
    FROM orders o
    INNER JOIN customers c ON c.customer_id = o.customer_id
    WHERE c.country = 'Chile'
      AND o.ordered_at >= '2025-12-01'
      AND o.ordered_at <  '2026-06-01'
    GROUP BY DATE_TRUNC('month', o.ordered_at)
),
tasa_cancelacion AS (
    SELECT
        mes,
        total_pedidos,
        pedidos_cancelados,
        ROUND(
            pedidos_cancelados * 100.0
            / NULLIF(total_pedidos, 0),
            2
        )                                              AS tasa_cancelacion_pct
    FROM pedidos_chile_mes
)
SELECT
    mes,
    total_pedidos,
    pedidos_cancelados,
    tasa_cancelacion_pct,
    LAG(tasa_cancelacion_pct) OVER (ORDER BY mes)  AS tasa_mes_anterior
FROM tasa_cancelacion
ORDER BY mes;

-- NOTA: Este análisis usa orders.status = 'cancelled' como proxy de pagos fallidos.
-- Los datos reales de métodos de pago están en la tabla payments (Nivel 8).
-- En el Nivel 8 este ejercicio se reemplaza con la tasa de payments.status = 'failed'
-- desagregada por payments.method para Chile.
```

</details>

---

## 6. ERRORES COMUNES

**Error 1 — JOIN de campañas sin manejar ended_at NULL**

```sql
-- INCORRECTO: campañas sin ended_at no hacen match con ningún pedido
-- porque date BETWEEN start AND NULL siempre es NULL (falso)
INNER JOIN orders o ON o.ordered_at::DATE BETWEEN mc.started_at AND mc.ended_at

-- CORRECTO: COALESCE para usar la fecha actual cuando la campaña sigue activa
INNER JOIN orders o ON o.ordered_at::DATE BETWEEN mc.started_at
                                               AND COALESCE(mc.ended_at, CURRENT_DATE)
```

Error mental: asumir que `ended_at` siempre tiene un valor. En datos reales, las campañas activas no tienen fecha de fin registrada — y `BETWEEN X AND NULL` no evalúa a `TRUE`, sino a `NULL` (equivalente a `FALSE` en la cláusula ON).

**Error 2 — Doble conteo cuando un pedido cae en el período de dos campañas activas**

```sql
-- El modelo de atribución directa por período puede asignar el mismo pedido
-- a múltiples campañas si sus períodos se solapan.
-- Esto infla el revenue atribuible si no se controla.

-- DIAGNÓSTICO: verificar si hay solapamiento entre campañas
SELECT a.campaign_id, b.campaign_id, a.channel, b.channel
FROM marketing_campaigns a
INNER JOIN marketing_campaigns b
    ON a.campaign_id < b.campaign_id
   AND a.started_at <= COALESCE(b.ended_at, CURRENT_DATE)
   AND COALESCE(a.ended_at, CURRENT_DATE) >= b.started_at;
-- Si retorna filas, hay campañas con períodos solapados
```

En ShopSphere asumimos que las campañas del mismo canal no se solapan. En la práctica, si hay solapamiento, el modelo de atribución necesita reglas adicionales (primer toque, último toque, distribución proporcional).

**Error 3 — Confundir budget con spent en el ROI**

```sql
-- INCORRECTO: el ROI debe calcularse sobre lo que se gastó realmente,
-- no sobre el presupuesto asignado
ROI = (revenue - budget) / budget * 100   -- budget puede ser distinto al gasto real

-- CORRECTO: usar spent (gasto ejecutado)
ROI = (revenue - spent) / spent * 100     -- spent = lo que realmente salió de la cuenta
```

Error mental: usar el presupuesto planeado en lugar del gasto ejecutado. En marketing, las campañas raramente gastan exactamente el budget — pueden gastarse antes, gastar de más o quedarse cortas. El ROI real usa `spent`.

**Error 4 — ROI positivo no implica campaña rentable si el CAC es mayor al LTV**

```sql
-- ROI del 200% parece bueno:
-- gastamos $10.000, revenue $30.000 → ROI = 200%
-- Pero si adquirimos 200 clientes y el LTV promedio es $50:
-- CAC = $10.000 / 200 = $50
-- LTV/CAC = 50/50 = 1 → break-even en el largo plazo
-- La campaña NO fue rentable si consideramos el ciclo de vida completo

-- SIEMPRE combinar ROI de corto plazo con LTV/CAC para la decisión completa
```

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

Con ROI y cohortes tienes el análisis completo de lo que pasó en ShopSphere en 2025. Pero Valentina tiene una pregunta más: "¿Hay meses del año donde sistemáticamente vendemos más, más allá del año?" Eso es análisis de estacionalidad — y para responderlo necesitas comparar el mismo mes en distintos años, calcular promedios históricos y detectar cuándo un mes se desvía demasiado del patrón histórico. La Lección 4 te enseña exactamente eso.
