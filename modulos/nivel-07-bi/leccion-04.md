# Nivel 7 — SQL para Business Intelligence
## Lección 4: Atribución de canal y segmentación de clientes por valor

> Tablas disponibles en este nivel: `customers`, `categories`, `products`, `orders`, `order_items`, `returns`, `inventory`, `marketing_campaigns`, `website_sessions`

---

## 1. INTRODUCCIÓN CONCEPTUAL

### La pregunta que los inversores van a hacer primero

Marco escribe en Slack a las 8 AM del lunes, en copia a Valentina:

> *"tenemos idea de qué campañas o canales traen a los clientes que realmente gastan plata? No los que entran una vez — los que se quedan y compran de nuevo. necesito esto para la reunión con los fondos."*

Esta pregunta tiene dos partes:
1. ¿Cuál fue el canal que trajo a cada cliente? (atribución)
2. ¿Cuánto gastó ese cliente en total? (revenue)

La primera parte requiere identificar la **primera sesión de cada cliente** — porque esa sesión es la que lo introdujo a ShopSphere. El canal de esa sesión es el canal de adquisición. Si un cliente llegó primero por email y luego visitó el sitio 4 veces por búsqueda orgánica antes de comprar, el canal de adquisición es email. Este modelo se llama **first-touch attribution** (atribución de primer contacto).

Para identificar la primera sesión usamos una técnica que ya conoces del Nivel 5: `ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY started_at ASC)`. La primera sesión tiene `rn = 1`.

### Segmentación por valor con CASE WHEN

La segunda parte del análisis — clasificar clientes por cuánto gastan — es una segmentación. Ya usaste CASE WHEN para clasificar sesiones por engagement en la Lección 1. Aquí lo aplicamos sobre el revenue total de cada cliente.

Ana necesita esta segmentación para el reporte al comité de inversores:

| Revenue total | Segmento |
|---|---|
| 0 | 'sin compras' |
| 1 a 100 | 'comprador ocasional' |
| 101 a 500 | 'comprador recurrente' |
| > 500 | 'cliente de alto valor' |

El resultado final — el que Marco va a llevar a la reunión con los fondos — combina atribución con segmentación: por cada canal, cuántos clientes adquirió, cuánto revenue generaron, y cuántos de esos clientes son de alto valor.

---

## 2. SINTAXIS

### Primer contacto con ROW_NUMBER

```sql
-- Identificar la primera sesión de cada cliente
WITH primera_sesion AS (
    SELECT
        ws.customer_id,
        ws.campaign_id,
        ws.started_at,
        ROW_NUMBER() OVER (
            PARTITION BY ws.customer_id
            ORDER BY ws.started_at ASC
        ) AS rn
    FROM website_sessions ws
),
canal_origen AS (
    -- Solo la fila con rn = 1 es la primera sesión
    SELECT
        ps.customer_id,
        COALESCE(mc.channel, 'organic') AS canal_adquisicion
    FROM primera_sesion ps
    LEFT JOIN marketing_campaigns mc ON mc.campaign_id = ps.campaign_id
    WHERE ps.rn = 1
)
SELECT * FROM canal_origen;
```

El `COALESCE(mc.channel, 'organic')` aparece aquí porque la primera sesión puede ser orgánica (`campaign_id IS NULL`). En ese caso el LEFT JOIN no encuentra campaña y `mc.channel` es NULL. El COALESCE convierte ese NULL en 'organic'.

### Segmentación con CASE WHEN sobre un agregado

```sql
-- Segmentar clientes por revenue total
WITH revenue_cliente AS (
    SELECT
        c.customer_id,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS revenue_total
    FROM customers c
    LEFT JOIN orders o       ON o.customer_id = c.customer_id
                             AND o.status = 'delivered'
    LEFT JOIN order_items oi ON oi.order_id = o.order_id
    GROUP BY c.customer_id
),
segmentos AS (
    SELECT
        customer_id,
        revenue_total,
        CASE
            WHEN revenue_total = 0                   THEN 'sin compras'
            WHEN revenue_total BETWEEN 1 AND 100     THEN 'comprador ocasional'
            WHEN revenue_total BETWEEN 101 AND 500   THEN 'comprador recurrente'
            WHEN revenue_total > 500                 THEN 'cliente de alto valor'
        END AS segmento
    FROM revenue_cliente
)
SELECT
    segmento,
    COUNT(*)                        AS cantidad_clientes,
    ROUND(SUM(revenue_total), 2)    AS revenue_del_segmento
FROM segmentos
GROUP BY segmento;
```

### Porcentaje del revenue total con window function

Para saber qué % del revenue total representa cada segmento, usamos `SUM OVER ()` sin partición:

```sql
ROUND(
    SUM(revenue_total) * 100.0
    / NULLIF(SUM(SUM(revenue_total)) OVER (), 0),
    2
) AS pct_revenue_total
```

La construcción `SUM(SUM(revenue_total)) OVER ()` es una window function sobre un agregado: primero agrupa (el SUM interno calcula el total por segmento en el GROUP BY), luego la window function suma todos esos totales para obtener el gran total. Es equivalente a calcular el total en una CTE separada y dividir, pero más conciso.

---

## 3. EJEMPLO PRÁCTICO

### Contexto: Marco quiere saber de dónde vienen los clientes que más gastan

Valentina le pasa la pregunta de Marco al equipo analítico con una nota directa:

> *"Necesito que cruces website_sessions con orders via customer_id: para cada campaña, calcula el revenue total generado por clientes que llegaron a través de esa campaña (primera sesión). Ordena por revenue total desc."*

**Query 1 — Canal de adquisición por primera sesión: la atribución**

```sql
-- Atribución first-touch: el canal de la primera sesión de cada cliente
WITH primera_sesion AS (
    SELECT
        ws.customer_id,
        ws.campaign_id,
        ROW_NUMBER() OVER (
            PARTITION BY ws.customer_id
            ORDER BY ws.started_at ASC
        ) AS rn
    FROM website_sessions ws
),
canal_origen AS (
    SELECT
        ps.customer_id,
        COALESCE(mc.channel, 'organic')  AS canal
    FROM primera_sesion ps
    LEFT JOIN marketing_campaigns mc ON mc.campaign_id = ps.campaign_id
    WHERE ps.rn = 1
)
SELECT
    canal,
    COUNT(DISTINCT customer_id)  AS clientes_adquiridos
FROM canal_origen
GROUP BY canal
ORDER BY clientes_adquiridos DESC;
```

Output esperado (fragmento):

| canal | clientes_adquiridos |
|---|---|
| organic | 145 |
| email | 132 |
| paid_search | 98 |
| social | 87 |
| display | 64 |
| affiliate | 52 |

**Query 2 — Revenue atribuido por canal (la pregunta de Marco)**

```sql
-- Revenue total generado por clientes según su canal de adquisición
WITH primera_sesion AS (
    SELECT
        ws.customer_id,
        ws.campaign_id,
        ROW_NUMBER() OVER (
            PARTITION BY ws.customer_id
            ORDER BY ws.started_at ASC
        ) AS rn
    FROM website_sessions ws
),
canal_origen AS (
    SELECT
        ps.customer_id,
        COALESCE(mc.channel, 'organic')  AS canal
    FROM primera_sesion ps
    LEFT JOIN marketing_campaigns mc ON mc.campaign_id = ps.campaign_id
    WHERE ps.rn = 1
),
revenue_por_cliente AS (
    SELECT
        o.customer_id,
        SUM(oi.quantity * oi.unit_price)  AS revenue
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status = 'delivered'
    GROUP BY o.customer_id
)
SELECT
    co.canal,
    COUNT(DISTINCT co.customer_id)              AS clientes_adquiridos,
    COALESCE(SUM(rc.revenue), 0)                AS revenue_total_atribuido
FROM canal_origen co
LEFT JOIN revenue_por_cliente rc ON rc.customer_id = co.customer_id
GROUP BY co.canal
ORDER BY revenue_total_atribuido DESC;
```

Output esperado:

| canal | clientes_adquiridos | revenue_total_atribuido |
|---|---|---|
| email | 132 | 85.340,00 |
| organic | 145 | 72.180,00 |
| paid_search | 98 | 68.920,00 |
| social | 87 | 51.200,00 |
| display | 64 | 28.400,00 |
| affiliate | 52 | 21.700,00 |

Marco lo ve y escribe: "email tiene menos clientes que organic pero genera más revenue — eso tiene sentido, son usuarios más comprometidos. Esto va a la presentación."

**Nota sobre la limitación del modelo first-touch:** Este análisis asume que el canal de la primera sesión es el responsable de todo el revenue posterior del cliente. Es una simplificación. En la industria existen modelos más sofisticados: last-touch (el canal de la última sesión antes de comprar), linear (todos los canales reciben crédito proporcional), o data-driven (basado en machine learning). Para los propósitos de esta reunión, first-touch es suficiente.

> **Variante: first paid-touch attribution.** En el Ejercicio 20 encontrarás una variante de este modelo llamada *first paid-touch attribution*, donde solo se consideran sesiones asociadas a una campaña (con `campaign_id IS NOT NULL`). La diferencia práctica: si un cliente llegó primero de forma orgánica y luego a través de una campaña, el modelo de esta lección atribuye la adquisición al canal orgánico, mientras que el first paid-touch la atribuye a la campaña. Ninguno es más "correcto" en abstracto — dependen de la pregunta de negocio: ¿quieres entender todos los puntos de entrada, o solo evaluar el rendimiento de tus campañas pagadas?

**Query 3 — Segmentación completa para el reporte de Ana**

```sql
-- Segmentación de clientes por valor — reporte para el comité de inversores
WITH revenue_cliente AS (
    SELECT
        c.customer_id,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0)  AS revenue_total
    FROM customers c
    LEFT JOIN orders o       ON o.customer_id = c.customer_id
                             AND o.status = 'delivered'
    LEFT JOIN order_items oi ON oi.order_id = o.order_id
    GROUP BY c.customer_id
),
segmentos AS (
    SELECT
        customer_id,
        revenue_total,
        CASE
            WHEN revenue_total = 0                  THEN 'sin compras'
            WHEN revenue_total BETWEEN 1 AND 100    THEN 'comprador ocasional'
            WHEN revenue_total BETWEEN 101 AND 500  THEN 'comprador recurrente'
            WHEN revenue_total > 500                THEN 'cliente de alto valor'
        END AS segmento
    FROM revenue_cliente
)
SELECT
    segmento,
    COUNT(*)                                                AS cantidad_clientes,
    ROUND(SUM(revenue_total), 2)                            AS revenue_del_segmento,
    ROUND(
        SUM(revenue_total) * 100.0
        / NULLIF(SUM(SUM(revenue_total)) OVER (), 0),
        2
    )                                                       AS pct_revenue_total
FROM segmentos
GROUP BY segmento
ORDER BY
    CASE segmento
        WHEN 'sin compras'          THEN 1
        WHEN 'comprador ocasional'  THEN 2
        WHEN 'comprador recurrente' THEN 3
        WHEN 'cliente de alto valor'THEN 4
    END;
```

Output esperado:

| segmento | cantidad_clientes | revenue_del_segmento | pct_revenue_total |
|---|---|---|---|
| sin compras | 82 | 0,00 | 0,00 |
| comprador ocasional | 198 | 8.450,00 | 2,84 |
| comprador recurrente | 165 | 47.800,00 | 16,08 |
| cliente de alto valor | 55 | 241.200,00 | 81,08 |

Ana lo lleva a la reunión: "55 clientes generan el 81% del revenue. Si perdemos esos 55 clientes, el negocio cambia fundamentalmente."

---

## 4. CASOS DE USO REALES

**Caso 1 — Atribución de marketing para decisiones de presupuesto (Marketing Analyst, CMO)**
Saber qué canal adquiere los clientes que más gastan es la base para la asignación de presupuesto. Si email adquiere clientes con LTV 3x más alto que display, el presupuesto debería moverse hacia email. Sin atribución, el presupuesto se asigna por volumen de tráfico, que es la métrica equivocada.

**Caso 2 — Segmentación para retención y fidelización (CRM Analyst)**
Los segmentos de valor definen estrategias de retención distintas: los "clientes de alto valor" reciben atención personalizada, los "compradores ocasionales" reciben campañas de activación, los "sin compras" reciben un flujo de onboarding diferente. Sin segmentación, todos los clientes reciben la misma campaña — y el ROI de retención es bajo.

**Caso 3 — Reportes a inversores (CFO, CEO, Data Analyst)**
Los inversores de Serie A quieren ver concentración de revenue (cuánto % viene del top X% de clientes), métricas de cohort (los clientes de cierto canal retienen mejor), y eficiencia de adquisición (cuánto revenue genera cada dólar invertido por canal). Estas tres preguntas se responden con las queries de esta lección. El reporte de Ana para el comité es exactamente esto.

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico
**Contexto (Briefing 7.11 — Ana Castillo):** Ana necesita clasificar la base de clientes en segmentos de valor para el reporte al comité. Los segmentos son: 'sin compras' (revenue = 0), 'comprador ocasional' (1-100), 'comprador recurrente' (101-500) y 'cliente de alto valor' (>500). Solo cuenta pedidos entregados (`status = 'delivered'`).

Escribe la query que retorne: `segmento`, `cantidad_clientes`, `revenue_del_segmento` (redondeado a 2 dec) y `pct_revenue_total` (redondeado a 2 dec). Ordena de menor a mayor valor (sin compras primero, alto valor último).

**Tablas necesarias:** `customers`, `orders`, `order_items`

**Resultado esperado:** 4 filas. El segmento 'sin compras' tiene `revenue_del_segmento = 0.00`. El segmento 'cliente de alto valor' probablemente representa el mayor % de revenue con el menor número de clientes.

**Criterio de éxito:** CTE para el revenue por cliente con `COALESCE(..., 0)`. CASE WHEN para la segmentación. `SUM(SUM(...)) OVER ()` para el porcentaje. ORDER BY con CASE WHEN (no alfabético).

---

### Ejercicio Integrador
**Contexto (Briefings 7.8 + 7.11 combinados — Marco y Ana):** Marco quiere saber qué canal adquiere los clientes de mayor valor. La respuesta combina atribución de primer contacto con segmentación por revenue.

Escribe la query que retorne, para cada canal de adquisición (incluyendo 'organic' y 'sin sesion' para clientes sin ninguna sesión registrada):
- `canal`: el canal de la primera sesión del cliente, o 'organic' si la primera sesión fue sin campaña, o 'sin sesion' si el cliente no tiene ninguna sesión
- `total_clientes`: cantidad de clientes distintos adquiridos por ese canal
- `clientes_alto_valor`: cuántos de esos clientes tienen revenue > 500 (status 'delivered')
- `revenue_total_atribuido`: suma del revenue de todos los clientes de ese canal (redondeado a 2 dec)
- `pct_alto_valor`: qué % de los clientes del canal son de alto valor (redondeado a 1 dec)

**Tablas necesarias:** `customers`, `website_sessions`, `marketing_campaigns`, `orders`, `order_items`

**Resultado esperado:** Una fila por canal. El número de filas depende de cuántos canales distintos existen más 'organic' más 'sin sesion'. Ordenado por `revenue_total_atribuido` descendente.

**Criterio de éxito:** CTE para la primera sesión por cliente con `ROW_NUMBER()`. LEFT JOIN para conservar clientes sin sesión. COALESCE para el canal ('organic' si campaign_id es NULL, 'sin sesion' si no hay sesión). COUNT DISTINCT para clientes. NULLIF en el denominador del porcentaje.

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
WITH revenue_cliente AS (
    SELECT
        c.customer_id,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0)  AS revenue_total
    FROM customers c
    LEFT JOIN orders o       ON o.customer_id = c.customer_id
                             AND o.status = 'delivered'
    LEFT JOIN order_items oi ON oi.order_id = o.order_id
    GROUP BY c.customer_id
),
segmentos AS (
    SELECT
        customer_id,
        revenue_total,
        CASE
            WHEN revenue_total = 0                  THEN 'sin compras'
            WHEN revenue_total BETWEEN 1 AND 100    THEN 'comprador ocasional'
            WHEN revenue_total BETWEEN 101 AND 500  THEN 'comprador recurrente'
            WHEN revenue_total > 500                THEN 'cliente de alto valor'
        END AS segmento
    FROM revenue_cliente
)
SELECT
    segmento,
    COUNT(*)                                                AS cantidad_clientes,
    ROUND(SUM(revenue_total), 2)                            AS revenue_del_segmento,
    ROUND(
        SUM(revenue_total) * 100.0
        / NULLIF(SUM(SUM(revenue_total)) OVER (), 0),
        2
    )                                                       AS pct_revenue_total
FROM segmentos
GROUP BY segmento
ORDER BY
    CASE segmento
        WHEN 'sin compras'           THEN 1
        WHEN 'comprador ocasional'   THEN 2
        WHEN 'comprador recurrente'  THEN 3
        WHEN 'cliente de alto valor' THEN 4
    END;
```

**Solución Ejercicio Integrador:**
```sql
WITH primera_sesion AS (
    SELECT
        ws.customer_id,
        ws.campaign_id,
        ROW_NUMBER() OVER (
            PARTITION BY ws.customer_id
            ORDER BY ws.started_at ASC
        ) AS rn
    FROM website_sessions ws
),
canal_origen AS (
    SELECT
        ps.customer_id,
        COALESCE(mc.channel, 'organic')  AS canal
    FROM primera_sesion ps
    LEFT JOIN marketing_campaigns mc ON mc.campaign_id = ps.campaign_id
    WHERE ps.rn = 1
),
-- Todos los clientes: los que tienen sesión y los que no
todos_clientes AS (
    SELECT
        c.customer_id,
        COALESCE(co.canal, 'sin sesion')  AS canal
    FROM customers c
    LEFT JOIN canal_origen co ON co.customer_id = c.customer_id
),
revenue_cliente AS (
    SELECT
        o.customer_id,
        SUM(oi.quantity * oi.unit_price)  AS revenue
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status = 'delivered'
    GROUP BY o.customer_id
)
SELECT
    tc.canal,
    COUNT(DISTINCT tc.customer_id)                                   AS total_clientes,
    COUNT(DISTINCT CASE WHEN COALESCE(rc.revenue, 0) > 500
                         THEN tc.customer_id END)                    AS clientes_alto_valor,
    ROUND(COALESCE(SUM(rc.revenue), 0), 2)                           AS revenue_total_atribuido,
    ROUND(
        COUNT(DISTINCT CASE WHEN COALESCE(rc.revenue, 0) > 500
                             THEN tc.customer_id END) * 100.0
        / NULLIF(COUNT(DISTINCT tc.customer_id), 0),
        1
    )                                                                AS pct_alto_valor
FROM todos_clientes tc
LEFT JOIN revenue_cliente rc ON rc.customer_id = tc.customer_id
GROUP BY tc.canal
ORDER BY revenue_total_atribuido DESC;
```

</details>

---

## 6. ERRORES COMUNES

**Error 1 — Olvidar clientes sin ninguna sesión en el análisis de atribución**

```sql
-- INCORRECTO: clientes sin sesión desaparecen del análisis
WITH primera_sesion AS ( ... )
SELECT co.canal, COUNT(*) AS clientes
FROM primera_sesion ps
LEFT JOIN marketing_campaigns mc ON mc.campaign_id = ps.campaign_id
-- solo incluye clientes que tienen al menos una sesión

-- CORRECTO: partir desde customers para incluir todos
SELECT
    COALESCE(co.canal, 'sin sesion') AS canal,
    COUNT(*) AS clientes
FROM customers c
LEFT JOIN canal_origen co ON co.customer_id = c.customer_id
```

Error mental: asumir que todos los clientes tienen sesiones. En e-commerce, puede haber clientes captados por canales offline (tienda física, call center) que no tienen sesiones web. Si los excluyes, el "sin sesion" desaparece del análisis y el revenue de esos clientes queda sin atribuir.

**Error 2 — Tomar cualquier sesión como canal de adquisición, no la primera**

```sql
-- INCORRECTO: si un cliente tiene 10 sesiones de 3 canales distintos,
-- este JOIN produce 10 filas por cliente — el canal "de adquisición"
-- quedaría inflado o sería inconsistente
FROM website_sessions ws
LEFT JOIN marketing_campaigns mc ON mc.campaign_id = ws.campaign_id
-- sin ROW_NUMBER o MIN para identificar la primera sesión

-- CORRECTO: ROW_NUMBER para seleccionar solo la primera sesión
WITH primera_sesion AS (
    SELECT customer_id, campaign_id,
           ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY started_at ASC) AS rn
    FROM website_sessions
)
SELECT * FROM primera_sesion WHERE rn = 1
```

Error mental: usar cualquier sesión del cliente como canal de adquisición produce una mezcla inconsistente. El modelo first-touch requiere específicamente la primera sesión cronológica.

**Error 3 — ORDER BY alfabético en segmentos con nombres que no ordenan bien**

```sql
-- INCORRECTO: orden alfabético de los segmentos
-- "cliente de alto valor" < "comprador ocasional" < "comprador recurrente" < "sin compras"
-- El orden resultante no refleja la progresión de valor
ORDER BY segmento;

-- CORRECTO: ORDER BY con CASE WHEN para controlar el orden
ORDER BY
    CASE segmento
        WHEN 'sin compras'           THEN 1
        WHEN 'comprador ocasional'   THEN 2
        WHEN 'comprador recurrente'  THEN 3
        WHEN 'cliente de alto valor' THEN 4
    END;
```

Error mental: confiar en el orden alfabético para strings que tienen un orden semántico. Siempre que los segmentos tengan una progresión lógica (bajo → alto), controlar el orden explícitamente con CASE WHEN.

**Error 4 — Incluir pedidos de todos los status en el revenue**

```sql
-- INCORRECTO: incluye revenue de pedidos cancelados, pendientes o en tránsito
-- Infla el revenue real del cliente
SUM(oi.quantity * oi.unit_price) AS revenue_total

-- CORRECTO: solo pedidos entregados representan revenue realizado
LEFT JOIN orders o ON o.customer_id = c.customer_id
    AND o.status = 'delivered'  -- filtro en la condición del JOIN
```

Error mental: asumir que todos los pedidos representan revenue. Un pedido cancelado no cobró — incluirlo en el revenue total distorsiona la segmentación hacia arriba.

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

En este nivel construiste la infraestructura analítica que el equipo de BI necesita: vistas reutilizables, análisis de funnel, atribución de canal y segmentación de clientes. Esos son los pilares de cualquier dashboard ejecutivo.

El Nivel 8 agrega la última tabla del schema de ShopSphere: `payments`. Con ella podrás responder con precisión la pregunta que Ana dejó abierta en el Briefing 7.10: cuántos pagos fallaron en Chile en marzo-abril 2026 y por qué método de pago. Pero antes de los pagos, el Nivel 8 también te enseñará cómo estas queries se comportan en producción — índices, transacciones y planes de ejecución: la diferencia entre una query que funciona y una query que escala.
