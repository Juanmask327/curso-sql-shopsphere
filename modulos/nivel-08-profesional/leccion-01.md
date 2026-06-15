# Nivel 8 — SQL Profesional
## Lección 1: La tabla `payments` y el revenue neto real

> Tablas disponibles en este nivel: `customers`, `categories`, `products`, `orders`, `order_items`, `returns`, `inventory`, `marketing_campaigns`, `website_sessions`, `payments` (NUEVA)

---

## 1. INTRODUCCIÓN CONCEPTUAL

### El número que Ana necesita antes de la junta

Ana Castillo lleva dos días enviando el mismo email con distintas palabras:

> *"Necesito el revenue neto real. No lo que se facturó — lo que efectivamente ingresó a la empresa, descontando lo que tuvimos que devolver."*

Hasta este nivel, ShopSphere calculaba revenue usando `orders` y `order_items`. Era una buena aproximación: suma los items de los pedidos entregados y tienes el revenue. El problema es que esa cifra es el revenue **bruto facturado** — lo que el cliente debía pagar. No lo que pagó. No lo que la empresa recibió en la cuenta.

La diferencia importa porque entre "debía pagar" y "pagó" hay tres cosas que pueden pasar:

1. El pago **falla** (tarjeta rechazada, error de red, saldo insuficiente) — el pedido puede quedarse en un estado intermedio o cancelarse
2. El pago **queda pendiente** — el cliente inició el pago pero no se procesó aún
3. El pago se **reembolsa** después de completado — la empresa devuelve dinero por un reclamo o devolución aprobada

Ninguna de estas tres situaciones queda registrada en `orders`. La tabla `orders` registra el estado del **pedido** (si se entregó, si se canceló). Pero el estado del **pago** es una cosa distinta, y eso es lo que registra `payments`.

La tabla `payments` es la fuente de verdad financiera de ShopSphere. Con ella, por primera vez, puedes calcular el revenue que realmente entró a la empresa.

### La diferencia conceptual entre orders.status y payments.status

Este es el punto más importante de toda la lección y el que más confunde al principio. Visualízalo así:

```
orders.status = 'delivered'   →  el pedido llegó al cliente
payments.status = 'completed' →  el dinero llegó a ShopSphere
```

Son dos eventos distintos que deberían correlacionarse pero no siempre lo hacen. Un pedido puede tener `status = 'delivered'` y aun así no tener un pago `status = 'completed'` (fraude, error de sistema, pago pendiente que nunca se resolvió). Y a la inversa: puede haber un pago `status = 'completed'` para un pedido que luego fue cancelado por un reclamo posterior.

Además, un mismo pedido puede tener **múltiples registros en payments**. Si el primer intento de pago falla, el sistema registra ese intento (status='failed') y el cliente puede intentar de nuevo con otra tarjeta, generando un segundo registro. La tabla `payments` es un log de intentos de pago — cada fila es un intento, no un pedido.

```
order_id = 1001
  └── payment_id = 5001, status = 'failed',    amount = 150.00  ← primer intento
  └── payment_id = 5002, status = 'completed', amount = 150.00  ← segundo intento (exitoso)
```

Esto tiene consecuencias directas en cómo escribes las queries: nunca puedes hacer `COUNT(*) FROM payments` esperando contar pedidos — estarías contando intentos de pago.

---

## 2. SINTAXIS

### La tabla payments

```sql
payments (
    payment_id  INTEGER,         -- identificador único del intento de pago
    order_id    INTEGER,         -- FK a orders — un pedido puede tener N intentos
    method      TEXT,            -- 'credit_card', 'bank_transfer', 'paypal', 'crypto'
    status      TEXT,            -- 'completed', 'failed', 'pending', 'refunded'
    amount      DECIMAL(10,2),   -- monto del intento
    paid_at     TIMESTAMP        -- fecha/hora del pago — NULL si no está completado
)
```

Dos reglas de negocio críticas que debes memorizar:

**Regla 1:** `paid_at` es NULL cuando `status != 'completed'`. Un pago fallido o pendiente no tiene fecha de pago. Esto tiene consecuencias en los filtros por fecha: si filtras `WHERE paid_at >= '2026-01-01'`, estás excluyendo automáticamente todos los pagos no completados. A veces eso es lo que quieres; a veces no.

**Regla 2:** Para calcular revenue real, solo usas `status = 'completed'`. Para calcular revenue neto, restas además `status = 'refunded'`.

### El JOIN payments → orders → customers

Para obtener el país del cliente o cualquier dato del pedido, necesitas navegar la cadena de relaciones:

```sql
payments p
  INNER JOIN orders o    ON o.order_id    = p.order_id
  INNER JOIN customers c ON c.customer_id = o.customer_id
```

**Advertencia sobre el tipo de JOIN:** Si usas `INNER JOIN orders`, excluyes los pagos cuyo `order_id` no existe en `orders` — lo que normalmente es correcto (no debería haber pagos huérfanos). Si por alguna razón de integridad de datos hay pagos sin pedido correspondiente, INNER JOIN los eliminaría silenciosamente. En un contexto de auditoría, usa `LEFT JOIN` para detectar esas anomalías.

### Revenue neto: la fórmula

```sql
-- Revenue bruto: lo que se cobró (sin considerar reembolsos)
SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END) AS total_cobrado

-- Reembolsos: lo que se devolvió
SUM(CASE WHEN p.status = 'refunded'  THEN p.amount ELSE 0 END) AS total_reembolsado

-- Revenue neto: lo que efectivamente quedó en la empresa
SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END)
- SUM(CASE WHEN p.status = 'refunded'  THEN p.amount ELSE 0 END) AS revenue_neto
```

El patrón `SUM(CASE WHEN ... THEN amount ELSE 0 END)` es el equivalente de SUM con filtro que ya conoces del Nivel 7. Aquí lo aplicamos sobre montos en lugar de conteos.

### Tasa de fallo de pago

```sql
-- Tasa de fallo: pagos fallidos / total de intentos
ROUND(
    SUM(CASE WHEN p.status = 'failed' THEN 1 ELSE 0 END) * 100.0
    / NULLIF(COUNT(*), 0),
    2
) AS tasa_fallo_pct
```

Siempre `NULLIF(COUNT(*), 0)` en el denominador. Si un grupo no tiene intentos de pago, `COUNT(*) = 0` y la división produce error.

---

## 3. EJEMPLO PRÁCTICO

### Contexto: Ana necesita el revenue neto Q1 2026

Ana envía el briefing el lunes por la mañana:

> *"Para el cierre del informe de Q1 necesito el revenue neto real de ShopSphere: lo que efectivamente ingresó a la empresa. El cálculo: suma de pagos completados menos suma de pagos reembolsados, para enero–marzo 2026, desagregado por país."*

**Query 1 — Exploración inicial de payments (siempre empieza aquí)**

Antes de escribir la query final, explora la estructura de los datos:

```sql
-- ¿Cuántos registros hay? ¿Cómo se distribuyen los status?
SELECT
    status,
    COUNT(*)                          AS total_intentos,
    ROUND(SUM(amount), 2)             AS monto_total,
    ROUND(AVG(amount), 2)             AS monto_promedio
FROM payments
GROUP BY status
ORDER BY total_intentos DESC;
```

Output esperado (valores aproximados):

| status    | total_intentos | monto_total   | monto_promedio |
|-----------|---------------|---------------|----------------|
| completed | 20.500        | 2.850.000,00  | 139,02         |
| failed    | 6.200         | 890.000,00    | 143,55         |
| pending   | 2.800         | 380.000,00    | 135,71         |
| refunded  | 1.500         | 195.000,00    | 130,00         |

Esta primera exploración te dice tres cosas importantes antes de escribir cualquier query de negocio: (1) cuántos intentos hay en total por status, (2) el monto promedio por status para detectar si los fallos se concentran en tickets altos o bajos, (3) si la distribución parece razonable.

**Query 2 — Revenue neto Q1 2026 por país**

```sql
-- Revenue neto Q1 2026 por país
-- Ana Castillo — Briefing 8.1
-- paid_at filtra el período; solo pagos con fecha (excluye pending sin fecha)
WITH pagos_q1 AS (
    SELECT
        p.payment_id,
        p.order_id,
        p.amount,
        p.status,
        c.country
    FROM payments p
    INNER JOIN orders o    ON o.order_id    = p.order_id
    INNER JOIN customers c ON c.customer_id = o.customer_id
    WHERE p.paid_at >= '2026-01-01'
      AND p.paid_at <  '2026-04-01'
),
revenue_por_pais AS (
    SELECT
        country,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) AS total_cobrado,
        SUM(CASE WHEN status = 'refunded'  THEN amount ELSE 0 END) AS total_reembolsado
    FROM pagos_q1
    GROUP BY country
)
SELECT
    country                                                  AS pais,
    ROUND(total_cobrado, 2)                                  AS total_cobrado,
    ROUND(total_reembolsado, 2)                              AS total_reembolsado,
    ROUND(total_cobrado - total_reembolsado, 2)              AS revenue_neto,
    ROUND(
        total_reembolsado * 100.0
        / NULLIF(total_cobrado, 0),
        2
    )                                                        AS pct_reembolsado
FROM revenue_por_pais
ORDER BY revenue_neto DESC;
```

Output esperado (valores simulados para ilustración):

| pais      | total_cobrado | total_reembolsado | revenue_neto | pct_reembolsado |
|-----------|--------------|-------------------|--------------|-----------------|
| Mexico    | 85.200,00    | 2.850,00          | 82.350,00    | 3,34            |
| Argentina | 72.400,00    | 2.100,00          | 70.300,00    | 2,90            |
| Colombia  | 68.900,00    | 1.950,00          | 66.950,00    | 2,83            |
| Peru      | 61.300,00    | 1.800,00          | 59.500,00    | 2,93            |
| Chile     | 48.200,00    | 3.100,00          | 45.100,00    | 6,43            |

Nota lo que revela la columna `pct_reembolsado`: Chile tiene una tasa del 6,43% — por encima del umbral del 5% que Ana indicó en su briefing. Eso va como nota al margen en el informe.

**Línea de interpretación para Ana:** "El revenue neto consolidado de Q1 2026 es X. Chile es el único país donde la tasa de reembolso supera el 5% (6,43%), lo que indica que los problemas de pagos en Chile no son solo de fallos en el momento del cobro — también hay reembolsos posteriores que reducen el revenue neto."

**Query 3 — Análisis de la anomalía de Chile**

Ana tiene una hipótesis más específica: el problema en Chile está concentrado en un método de pago particular durante marzo y abril 2026.

```sql
-- Anomalía Chile: tasa de fallo por método vs. resto de países
-- Período: marzo–abril 2026
-- Ana Castillo — Briefing 8.2
WITH pagos_periodo AS (
    SELECT
        p.payment_id,
        p.amount,
        p.method,
        p.status,
        CASE
            WHEN c.country = 'Chile' THEN 'Chile'
            ELSE 'Resto de paises'
        END AS grupo_pais
    FROM payments p
    INNER JOIN orders o    ON o.order_id    = p.order_id
    INNER JOIN customers c ON c.customer_id = o.customer_id
    WHERE p.paid_at >= '2026-03-01'
      AND p.paid_at <  '2026-05-01'
)
SELECT
    grupo_pais,
    method                                                          AS metodo,
    COUNT(*)                                                        AS total_pagos,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)             AS pagos_fallidos,
    ROUND(
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) * 100.0
        / NULLIF(COUNT(*), 0),
        2
    )                                                               AS tasa_fallo_pct
FROM pagos_periodo
GROUP BY grupo_pais, method
ORDER BY grupo_pais, tasa_fallo_pct DESC;
```

Output esperado (valores simulados):

| grupo_pais      | metodo        | total_pagos | pagos_fallidos | tasa_fallo_pct |
|-----------------|---------------|-------------|----------------|----------------|
| Chile           | credit_card   | 380         | 152            | 40,00          |
| Chile           | bank_transfer | 210         | 25             | 11,90          |
| Chile           | paypal        | 195         | 18             | 9,23           |
| Chile           | crypto        | 88          | 6              | 6,82           |
| Resto de paises | credit_card   | 2.850       | 256            | 8,98           |
| Resto de paises | bank_transfer | 1.920       | 154            | 8,02           |
| Resto de paises | paypal        | 1.780       | 138            | 7,75           |
| Resto de paises | crypto        | 890         | 65             | 7,30           |

El patrón es claro: la tasa de fallo de `credit_card` en Chile (40%) es más del **cuádruple** de la tasa para el mismo método en el resto de países (8,98%). Los otros métodos en Chile tienen tasas similares al promedio regional. Esto confirma la hipótesis de Ana: el problema no es de demanda — es un problema de infraestructura específico de `credit_card` en Chile.

---

## 4. CASOS DE USO REALES

**Caso 1 — Cierre financiero trimestral (Finance Analyst, CFO)**
El revenue de los estados financieros de una empresa no es el revenue facturado — es el revenue reconocido: lo cobrado menos lo devuelto. Los equipos de finanzas recalculan este número con cada cierre trimestral usando exactamente el patrón de esta lección: SUM condicional por status sobre la tabla de pagos.

**Caso 2 — Detección de anomalías en pagos (Data Analyst, Risk)**
Las tablas de pagos son la primera señal de problemas sistémicos: un proveedor de pagos que empieza a fallar, una región con fraude creciente, un método de pago con problemas de integración. Monitorear la tasa de fallo por método/país/período es una tarea recurrente en equipos de riesgo y finanzas.

**Caso 3 — Reconciliación contable (Controller, Auditor)**
Los auditores necesitan verificar que el monto en la tabla de pagos coincide con los movimientos bancarios reales. Para eso, calculan el total cobrado por período y lo comparan con los extractos bancarios. La discrepancia entre ambos revela errores de sistema, pagos duplicados o registros corruptos — como los que Ana detectó en el briefing 8.3.

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico
**Contexto (Briefing 8.3 — Ana Castillo):** Ana recibió un reporte interno que indica que hay registros en `payments` con `status = 'completed'` y `paid_at` IS NULL. Eso es incoherente: un pago completado debe tener fecha. Antes de calcular el revenue del Q1, necesita cuantificar el impacto de estos registros sucios.

Escribe una query que retorne en una sola fila: `registros_problematicos` (COUNT de pagos con status='completed' y paid_at NULL), `pedidos_afectados` (COUNT DISTINCT de order_id de esos registros) y `monto_total_impactado` (SUM del amount de esos registros, redondeado a 2 decimales).

**Tablas necesarias:** `payments`

**Resultado esperado:** 1 fila. Si el monto total impactado es mayor que el 1% del revenue neto de Q1, el informe debe incluir una nota de advertencia.

**Criterio de éxito:** Filtro `WHERE status = 'completed' AND paid_at IS NULL`. COUNT DISTINCT en order_id. SUM en amount. Sin JOINs — payments tiene todo lo necesario.

---

### Ejercicio Intermedio
**Contexto (Briefing 8.4 — Ana Castillo):** Ana necesita entender la distribución de métodos de pago por rango de ticket para la sección de riesgos del informe. La hipótesis: los tickets altos se concentran en uno o dos métodos, lo que genera exposición si alguno falla.

Para pagos con `status = 'completed'`, clasifica cada pago por rango de monto:
- `amount < 50` → 'bajo (< 50)'
- `amount BETWEEN 50 AND 200` → 'medio (50-200)'
- `amount > 200` → 'alto (> 200)'

Retorna: `rango_monto`, `metodo`, `transacciones`, `pct_en_rango` (% de transacciones de ese método dentro del rango, redondeado a 2 decimales) y `monto_promedio` (redondeado a 2 decimales). Ordena por rango (bajo, medio, alto) y dentro de cada rango por `pct_en_rango` descendente.

**Tablas necesarias:** `payments`

**Resultado esperado:** Hasta 12 filas (3 rangos × 4 métodos). Si `credit_card` o `bank_transfer` concentran más del 60% de los tickets altos, eso confirma el riesgo de concentración.

**Criterio de éxito:** CTE con la clasificación de rangos. CTE auxiliar con totales por rango para calcular el porcentaje. JOIN entre ambas CTEs. ORDER BY con CASE WHEN para el orden correcto de los rangos (no alfabético).

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
-- Auditoría: pagos 'completed' con paid_at NULL
-- Briefing 8.3 — Ana Castillo
SELECT
    COUNT(*)                    AS registros_problematicos,
    COUNT(DISTINCT order_id)    AS pedidos_afectados,
    ROUND(SUM(amount), 2)       AS monto_total_impactado
FROM payments
WHERE status = 'completed'
  AND paid_at IS NULL;
```

**Solución Ejercicio Intermedio:**
```sql
-- Distribución de métodos de pago por rango de monto
-- Briefing 8.4 — Ana Castillo
WITH pagos_clasificados AS (
    SELECT
        payment_id,
        amount,
        method,
        CASE
            WHEN amount < 50                THEN 'bajo (< 50)'
            WHEN amount BETWEEN 50 AND 200  THEN 'medio (50-200)'
            WHEN amount > 200               THEN 'alto (> 200)'
        END AS rango_monto
    FROM payments
    WHERE status = 'completed'
),
totales_por_rango AS (
    SELECT
        rango_monto,
        COUNT(*) AS total_rango
    FROM pagos_clasificados
    GROUP BY rango_monto
)
SELECT
    pc.rango_monto,
    pc.method                                                        AS metodo,
    COUNT(*)                                                         AS transacciones,
    ROUND(
        COUNT(*) * 100.0 / NULLIF(t.total_rango, 0),
        2
    )                                                                AS pct_en_rango,
    ROUND(AVG(pc.amount), 2)                                         AS monto_promedio
FROM pagos_clasificados pc
INNER JOIN totales_por_rango t ON t.rango_monto = pc.rango_monto
GROUP BY pc.rango_monto, pc.method, t.total_rango
ORDER BY
    CASE pc.rango_monto
        WHEN 'bajo (< 50)'    THEN 1
        WHEN 'medio (50-200)' THEN 2
        WHEN 'alto (> 200)'   THEN 3
    END,
    pct_en_rango DESC;
```

</details>

---

## 6. ERRORES COMUNES

**Error 1 — Confundir orders.status con payments.status**

```sql
-- INCORRECTO: esto filtra pedidos entregados, no pagos completados
-- Un pedido 'delivered' puede tener el pago 'pending' o 'failed'
SELECT SUM(oi.quantity * oi.unit_price) AS revenue
FROM orders o
INNER JOIN order_items oi ON oi.order_id = o.order_id
WHERE o.status = 'delivered';  -- <- revenue facturado, no cobrado

-- CORRECTO: para revenue cobrado, filtrar por payments.status
SELECT SUM(p.amount) AS revenue_cobrado
FROM payments p
WHERE p.status = 'completed';
```

Error mental: asumir que si el pedido fue entregado, el pago ya fue procesado. En sistemas reales, el flujo de entrega y el flujo de pagos son pipelines separados que pueden estar desincronizados.

**Error 2 — Contar intentos de pago como si fueran pedidos**

```sql
-- INCORRECTO: cuenta intentos de pago, no pedidos únicos
-- Si un pedido tuvo 3 intentos (2 fallidos + 1 exitoso), cuenta 3
SELECT COUNT(*) AS total_pedidos_pagados
FROM payments
WHERE status = 'completed';

-- CORRECTO: contar pedidos únicos con pago completado
SELECT COUNT(DISTINCT order_id) AS total_pedidos_pagados
FROM payments
WHERE status = 'completed';
```

Error mental: no recordar que payments es un log de intentos. Este error infla artificialmente los conteos de transacciones exitosas.

**Error 3 — Filtrar por paid_at y perder pagos pendientes/fallidos**

```sql
-- INCORRECTO si el objetivo es analizar TODOS los intentos del período
-- paid_at es NULL para pagos no completados →  se excluyen silenciosamente
SELECT COUNT(*), status
FROM payments
WHERE paid_at >= '2026-01-01'  -- <- elimina todos los failed y pending
GROUP BY status;

-- CORRECTO para incluir todos los intentos en un período:
-- filtra por la fecha de la orden relacionada, no por paid_at
SELECT COUNT(*), p.status
FROM payments p
INNER JOIN orders o ON o.order_id = p.order_id
WHERE o.ordered_at >= '2026-01-01'
  AND o.ordered_at <  '2026-04-01'
GROUP BY p.status;
```

Error mental: asumir que paid_at tiene valor para todos los registros. Siempre verifica si la columna de fecha puede ser NULL antes de usarla como filtro de período.

**Error 4 — Olvidar el NULLIF al calcular tasas de reembolso**

```sql
-- INCORRECTO: si total_cobrado = 0, hay error de división por cero
ROUND(total_reembolsado * 100.0 / total_cobrado, 2) AS pct_reembolsado

-- CORRECTO: NULLIF protege el caso donde no hubo pagos completados
ROUND(total_reembolsado * 100.0 / NULLIF(total_cobrado, 0), 2) AS pct_reembolsado
```

Error mental: "si hay reembolsos, seguro hubo cobros". En datasets reales puede haber países o períodos con reembolsos pero sin cobros (procesamiento asincrónico, ajustes manuales). NULLIF es siempre obligatorio en denominadores.

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

Ya puedes calcular el revenue neto real de ShopSphere y detectar anomalías como la de Chile. Pero Ana tiene un problema adicional: la query que calcula ese revenue tarda 45 segundos en ejecutarse.

El problema no es el SQL — la lógica es correcta. El problema es que la base de datos está revisando cada fila de `payments` una por una sin una estructura de acceso rápido. Con 31.000 registros el tiempo es tolerable. Con 10 millones de registros, esa query tardaría horas.

En la próxima lección aprendes a diagnosticar por qué una query es lenta usando `EXPLAIN QUERY PLAN`, y cómo crear **índices** que reducen el tiempo de ejecución en órdenes de magnitud — sin cambiar una sola línea del SQL que ya escribiste.
