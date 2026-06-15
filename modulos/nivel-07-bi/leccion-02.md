# Nivel 7 — SQL para Business Intelligence
## Lección 2: Funnel de adquisición con LEFT JOIN encadenado

> Tablas disponibles en este nivel: `customers`, `categories`, `products`, `orders`, `order_items`, `returns`, `inventory`, `marketing_campaigns`, `website_sessions`

---

## 1. INTRODUCCIÓN CONCEPTUAL

### La pregunta que desencadenó todo

En el canal de Slack, Sofía escribe a las 9 AM del martes antes de la reunión con Valentina:

> *"oye necesito algo más detallado. quiero ver el funnel completo de adquisición para Q1 2026: cuántas sesiones hubo, cuántas convirtieron, cuántas terminaron en un pedido real, cuántos pedidos se entregaron. básicamente quiero ver en qué etapa estamos perdiendo más gente."*

Lo que Sofía describe es un **funnel de adquisición**: una secuencia de etapas donde en cada paso se pierde una fracción de los usuarios. Cada tasa de conversión entre etapas revela un problema diferente:

```
Sesiones
    ↓ (tasa sesión → conversión: problema de contenido/campaña si es bajo)
Conversiones (converted = TRUE)
    ↓ (tasa conversión → pedido: problema de checkout si es bajo)
Pedidos creados
    ↓ (tasa pedido → entregado: problema de operaciones/logística si es bajo)
Pedidos entregados
```

Para construir este funnel necesitas conectar `website_sessions` con `orders`. El desafío: estas dos tablas no tienen una columna `session_id` en `orders` ni un `order_id` en `website_sessions`. El puente es `customer_id`.

### La advertencia del puente por customer_id

Conectar sesiones con pedidos por `customer_id` es correcto — pero genera un riesgo silencioso: la multiplicación de filas.

Imagina un cliente que en Q1 2026 tuvo 10 sesiones y 3 pedidos. Si haces un JOIN directo entre `website_sessions` y `orders` por `customer_id`, obtienes 10 × 3 = 30 filas para ese cliente. Si luego haces `COUNT(order_id)`, obtienes 30 en lugar de 3.

La solución: **siempre `COUNT DISTINCT` cuando el JOIN puede multiplicar filas**.

```sql
-- INCORRECTO: inflado por la multiplicación de filas
COUNT(o.order_id) AS pedidos

-- CORRECTO: cada order_id se cuenta una sola vez, sin importar cuántas
-- sesiones haya del mismo cliente
COUNT(DISTINCT o.order_id) AS pedidos
```

Este patrón es no-negociable en análisis de funnel. Lo repetirás en cada ejercicio de este bloque.

---

## 2. SINTAXIS

### Funnel en una sola query con CTEs

El patrón estándar para un funnel multi-etapa:

```sql
-- Paso 1: CTE para el período de análisis
WITH sesiones_periodo AS (
    SELECT session_id, customer_id, converted
    FROM website_sessions
    WHERE started_at >= 'fecha_inicio'
      AND started_at <  'fecha_fin'
),
-- Paso 2: CTE para pedidos del mismo período
pedidos_periodo AS (
    SELECT order_id, customer_id, status
    FROM orders
    WHERE ordered_at >= 'fecha_inicio'
      AND ordered_at <  'fecha_fin'
)
-- Paso 3: LEFT JOIN de sesiones con pedidos por customer_id
--         COUNT DISTINCT para evitar inflación de filas
SELECT
    COUNT(DISTINCT s.session_id)                            AS total_sesiones,
    COUNT(DISTINCT CASE WHEN s.converted = TRUE
                         THEN s.session_id END)             AS sesiones_convertidas,
    COUNT(DISTINCT p.order_id)                              AS pedidos_generados,
    COUNT(DISTINCT CASE WHEN p.status = 'delivered'
                         THEN p.order_id END)               AS pedidos_entregados
FROM sesiones_periodo s
LEFT JOIN pedidos_periodo p ON p.customer_id = s.customer_id;
```

### Tasas entre etapas

Las tasas de conversión entre etapas usan el mismo patrón de la Lección 1, pero aplicado a los conteos del funnel:

```sql
-- Tasa sesión → conversión
ROUND(
    COUNT(DISTINCT CASE WHEN s.converted = TRUE THEN s.session_id END) * 100.0
    / NULLIF(COUNT(DISTINCT s.session_id), 0),
    2
) AS tasa_sesion_a_conversion,

-- Tasa conversión → pedido
ROUND(
    COUNT(DISTINCT p.order_id) * 100.0
    / NULLIF(COUNT(DISTINCT CASE WHEN s.converted = TRUE THEN s.session_id END), 0),
    2
) AS tasa_conversion_a_pedido,

-- Tasa pedido → entregado
ROUND(
    COUNT(DISTINCT CASE WHEN p.status = 'delivered' THEN p.order_id END) * 100.0
    / NULLIF(COUNT(DISTINCT p.order_id), 0),
    2
) AS tasa_pedido_a_entregado
```

### Funnel por dimensión (país, canal, dispositivo)

Para analizar el funnel por país o canal, agrega `GROUP BY` y las columnas de dimensión en las CTEs:

```sql
WITH sesiones_periodo AS (
    SELECT ws.session_id, ws.customer_id, ws.converted, c.country
    FROM website_sessions ws
    INNER JOIN customers c ON c.customer_id = ws.customer_id
    WHERE ws.started_at >= '2026-01-01'
      AND ws.started_at <  '2026-04-01'
),
pedidos_periodo AS (
    SELECT o.order_id, o.customer_id, o.status
    FROM orders o
    WHERE o.ordered_at >= '2026-01-01'
      AND o.ordered_at <  '2026-04-01'
)
SELECT
    s.country,
    COUNT(DISTINCT s.session_id)                            AS total_sesiones,
    COUNT(DISTINCT p.order_id)                              AS pedidos_generados,
    ROUND(
        COUNT(DISTINCT p.order_id) * 100.0
        / NULLIF(COUNT(DISTINCT s.session_id), 0),
        2
    )                                                       AS tasa_sesion_a_pedido
FROM sesiones_periodo s
LEFT JOIN pedidos_periodo p ON p.customer_id = s.customer_id
GROUP BY s.country
ORDER BY tasa_sesion_a_pedido DESC;
```

---

## 3. EJEMPLO PRÁCTICO

### Contexto: el funnel completo de Q1 2026

Sofía necesita los números para su reunión del jueves. Marco quiere saber "en qué etapa estamos perdiendo más gente".

**Query 1 — Funnel simple Q1 2026, una sola fila de resumen**

```sql
-- Funnel de adquisición Q1 2026
-- LEFT JOIN por customer_id: conserva sesiones sin pedido
-- COUNT DISTINCT: evita inflación por la relación N:N sesiones-pedidos
WITH sesiones_q1 AS (
    SELECT
        ws.session_id,
        ws.customer_id,
        ws.converted
    FROM website_sessions ws
    WHERE ws.started_at >= '2026-01-01'
      AND ws.started_at <  '2026-04-01'
),
pedidos_q1 AS (
    SELECT
        o.order_id,
        o.customer_id,
        o.status
    FROM orders o
    WHERE o.ordered_at >= '2026-01-01'
      AND o.ordered_at <  '2026-04-01'
)
SELECT
    COUNT(DISTINCT s.session_id)                                        AS total_sesiones,
    COUNT(DISTINCT CASE WHEN s.converted = TRUE THEN s.session_id END)  AS sesiones_convertidas,
    COUNT(DISTINCT p.order_id)                                          AS pedidos_generados,
    COUNT(DISTINCT CASE WHEN p.status = 'delivered' THEN p.order_id END) AS pedidos_entregados,
    -- Tasas entre etapas
    ROUND(
        COUNT(DISTINCT CASE WHEN s.converted = TRUE THEN s.session_id END) * 100.0
        / NULLIF(COUNT(DISTINCT s.session_id), 0),
        2
    )                                                                   AS tasa_sesion_a_conversion,
    ROUND(
        COUNT(DISTINCT p.order_id) * 100.0
        / NULLIF(COUNT(DISTINCT CASE WHEN s.converted = TRUE
                                      THEN s.session_id END), 0),
        2
    )                                                                   AS tasa_conversion_a_pedido,
    ROUND(
        COUNT(DISTINCT CASE WHEN p.status = 'delivered' THEN p.order_id END) * 100.0
        / NULLIF(COUNT(DISTINCT p.order_id), 0),
        2
    )                                                                   AS tasa_pedido_a_entregado
FROM sesiones_q1 s
LEFT JOIN pedidos_q1 p ON p.customer_id = s.customer_id;
```

Output esperado (una fila):

| total_sesiones | sesiones_convertidas | pedidos_generados | pedidos_entregados | tasa_sesion_a_conversion | tasa_conversion_a_pedido | tasa_pedido_a_entregado |
|---|---|---|---|---|---|---|
| 1.850 | 370 | 280 | 196 | 20.00 | 75.68 | 70.00 |

Valentina lee el resultado: "El 75% de los que marcan conversión terminan haciendo un pedido real — eso está bien. El problema es que solo el 70% de los pedidos se entrega. Diego, ese número te corresponde a ti."

**Query 2 — Funnel por país para Q1 2026**

```sql
-- Funnel por país: ¿en qué países la tasa sesión→pedido es más baja?
WITH sesiones_q1 AS (
    SELECT
        ws.session_id,
        ws.customer_id,
        ws.converted,
        c.country
    FROM website_sessions ws
    INNER JOIN customers c ON c.customer_id = ws.customer_id
    WHERE ws.started_at >= '2026-01-01'
      AND ws.started_at <  '2026-04-01'
),
pedidos_q1 AS (
    SELECT
        o.order_id,
        o.customer_id,
        o.status
    FROM orders o
    WHERE o.ordered_at >= '2026-01-01'
      AND o.ordered_at <  '2026-04-01'
)
SELECT
    s.country,
    COUNT(DISTINCT s.session_id)                                         AS total_sesiones,
    COUNT(DISTINCT CASE WHEN s.converted = TRUE THEN s.session_id END)   AS sesiones_convertidas,
    COUNT(DISTINCT p.order_id)                                           AS pedidos_generados,
    ROUND(
        COUNT(DISTINCT p.order_id) * 100.0
        / NULLIF(COUNT(DISTINCT s.session_id), 0),
        2
    )                                                                    AS tasa_sesion_a_pedido
FROM sesiones_q1 s
LEFT JOIN pedidos_q1 p ON p.customer_id = s.customer_id
GROUP BY s.country
ORDER BY tasa_sesion_a_pedido ASC;
```

Esta query aparece ordenada ascendente a propósito — los países con peor conversión aparecen primero. Exactamente lo que le interesa a Marco para la reunión con los fondos.

**Query 3 — Sesiones previas al primer pedido de un cliente**

Marco pregunta cuántas veces visita alguien el sitio antes de comprar por primera vez. Esta es una pregunta de atribución temporal que requiere comparar fechas:

```sql
-- ¿Cuántas sesiones tiene un cliente antes de su primer pedido?
WITH primer_pedido AS (
    SELECT
        customer_id,
        MIN(ordered_at)  AS fecha_primer_pedido
    FROM orders
    WHERE status != 'cancelled'
    GROUP BY customer_id
),
sesiones_previas AS (
    SELECT
        pp.customer_id,
        COUNT(ws.session_id)  AS sesiones_antes_de_comprar
    FROM primer_pedido pp
    INNER JOIN website_sessions ws
        ON  ws.customer_id = pp.customer_id
        AND ws.started_at  < pp.fecha_primer_pedido  -- solo sesiones ANTERIORES al pedido
    GROUP BY pp.customer_id
)
SELECT
    ROUND(AVG(sesiones_antes_de_comprar), 2)   AS promedio_sesiones_previas,
    MIN(sesiones_antes_de_comprar)             AS minimo,
    MAX(sesiones_antes_de_comprar)             AS maximo,
    COUNT(*)                                   AS clientes_con_sesiones_previas
FROM sesiones_previas;
```

Output esperado (una fila):

| promedio_sesiones_previas | minimo | maximo | clientes_con_sesiones_previas |
|---|---|---|---|
| 3.20 | 1 | 18 | 380 |

Esto le dice a Marco: "En promedio, un cliente visita el sitio 3 veces antes de hacer su primera compra. Para remarketing, ese es el horizonte de touchpoints que importa."

---

## 4. CASOS DE USO REALES

**Caso 1 — Diagnóstico de funnel para optimización de conversión (Growth Analyst)**
El análisis de funnel es la herramienta principal del Growth team para decidir dónde invertir el esfuerzo de optimización. Si la caída más grande es entre "sesión" y "conversión", el problema es la landing page o la campaña. Si es entre "conversión" y "pedido", el problema es el checkout o el precio. Si es entre "pedido" y "entregado", es logística. Sin el funnel, cada equipo apunta en una dirección diferente.

**Caso 2 — Análisis de touchpoints para remarketing (Marketing Analyst)**
Saber cuántas sesiones previas necesita un cliente antes de comprar define la estrategia de remarketing. Si el promedio es 1.5, los clientes son decisivos y la primera impresión lo es todo. Si es 5+, los clientes necesitan múltiples touchpoints — eso justifica campañas de retargeting de 7 días, no de 1 día.

**Caso 3 — Funnel geográfico para expansión (Business Analyst, CFO)**
Marco necesita saber si el funnel falla de manera diferente en Chile vs. México vs. Argentina. Si Chile tiene tasa de sesión→pedido de 8% y Argentina de 18%, puede haber un problema local: precios en moneda local, opciones de pago, costos de envío. El análisis de funnel por país es la primera consulta de cualquier análisis de expansión geográfica.

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico
**Contexto (Briefing 7.3 — Sofía Ramírez, Slack):** Sofía quiere el funnel completo de adquisición para Q1 2026 (enero-marzo). Necesita saber en qué etapa se pierde más volumen.

Escribe la query que retorne en una sola fila: `total_sesiones`, `sesiones_convertidas`, `pedidos_generados`, `pedidos_entregados`, `tasa_sesion_a_conversion`, `tasa_conversion_a_pedido` y `tasa_pedido_a_entregado`. Usa el período enero-marzo 2026 para ambas tablas. Aplica COUNT DISTINCT en todas las métricas.

**Tablas necesarias:** `website_sessions`, `orders`

**Resultado esperado:** 1 fila. Las tres tasas son porcentajes redondeados a 2 decimales. Las sesiones conectadas con pedidos usan el LEFT JOIN por `customer_id`.

**Criterio de éxito:** Dos CTEs (una por tabla). LEFT JOIN de sesiones a pedidos por `customer_id`. COUNT DISTINCT en session_id y order_id. NULLIF en todos los denominadores. 1 fila en el resultado.

---

### Ejercicio Intermedio
**Contexto (Briefing 7.9 — Marco Jiménez):** Marco quiere saber cuántas veces visita alguien el sitio antes de comprar por primera vez. La respuesta informa cuántos touchpoints de remarketing tiene sentido usar.

Escribe la query que retorne el promedio de sesiones previas al primer pedido (redondeado a 2 decimales), el mínimo, el máximo y la cantidad de clientes que tuvieron al menos 1 sesión antes de su primer pedido. Excluye pedidos cancelados del cálculo del primer pedido. Solo incluye clientes que hayan tenido sesiones ANTES de su primer pedido (los que compraron sin sesión previa quedan excluidos).

**Tablas necesarias:** `orders`, `website_sessions`

**Resultado esperado:** 1 fila con 4 columnas. El promedio probablemente esté entre 2 y 6 sesiones — si el seed tiene datos realistas.

**Criterio de éxito:** CTE para el primer pedido por cliente (MIN de ordered_at). JOIN con website_sessions usando la condición `started_at < fecha_primer_pedido`. COUNT de sesiones por cliente. AVG sobre esos conteos. 1 fila final.

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
WITH sesiones_q1 AS (
    SELECT
        ws.session_id,
        ws.customer_id,
        ws.converted
    FROM website_sessions ws
    WHERE ws.started_at >= '2026-01-01'
      AND ws.started_at <  '2026-04-01'
),
pedidos_q1 AS (
    SELECT
        o.order_id,
        o.customer_id,
        o.status
    FROM orders o
    WHERE o.ordered_at >= '2026-01-01'
      AND o.ordered_at <  '2026-04-01'
)
SELECT
    COUNT(DISTINCT s.session_id)                                        AS total_sesiones,
    COUNT(DISTINCT CASE WHEN s.converted = TRUE THEN s.session_id END)  AS sesiones_convertidas,
    COUNT(DISTINCT p.order_id)                                          AS pedidos_generados,
    COUNT(DISTINCT CASE WHEN p.status = 'delivered' THEN p.order_id END) AS pedidos_entregados,
    ROUND(
        COUNT(DISTINCT CASE WHEN s.converted = TRUE THEN s.session_id END) * 100.0
        / NULLIF(COUNT(DISTINCT s.session_id), 0),
        2
    )                                                                   AS tasa_sesion_a_conversion,
    ROUND(
        COUNT(DISTINCT p.order_id) * 100.0
        / NULLIF(COUNT(DISTINCT CASE WHEN s.converted = TRUE
                                      THEN s.session_id END), 0),
        2
    )                                                                   AS tasa_conversion_a_pedido,
    ROUND(
        COUNT(DISTINCT CASE WHEN p.status = 'delivered' THEN p.order_id END) * 100.0
        / NULLIF(COUNT(DISTINCT p.order_id), 0),
        2
    )                                                                   AS tasa_pedido_a_entregado
FROM sesiones_q1 s
LEFT JOIN pedidos_q1 p ON p.customer_id = s.customer_id;
```

**Solución Ejercicio Intermedio:**
```sql
WITH primer_pedido AS (
    SELECT
        customer_id,
        MIN(ordered_at)  AS fecha_primer_pedido
    FROM orders
    WHERE status != 'cancelled'
    GROUP BY customer_id
),
sesiones_previas AS (
    SELECT
        pp.customer_id,
        COUNT(ws.session_id)  AS sesiones_antes_de_comprar
    FROM primer_pedido pp
    INNER JOIN website_sessions ws
        ON  ws.customer_id = pp.customer_id
        AND ws.started_at  < pp.fecha_primer_pedido
    GROUP BY pp.customer_id
)
SELECT
    ROUND(AVG(sesiones_antes_de_comprar), 2)   AS promedio_sesiones_previas,
    MIN(sesiones_antes_de_comprar)             AS minimo,
    MAX(sesiones_antes_de_comprar)             AS maximo,
    COUNT(*)                                   AS clientes_con_sesiones_previas
FROM sesiones_previas;
```

</details>

---

## 6. ERRORES COMUNES

**Error 1 — COUNT sin DISTINCT: la trampa del producto cartesiano**

```sql
-- INCORRECTO: un cliente con 10 sesiones y 3 pedidos genera 30 filas
-- COUNT(order_id) retorna 30 en lugar de 3
SELECT COUNT(p.order_id) AS pedidos_generados
FROM sesiones_q1 s
LEFT JOIN pedidos_q1 p ON p.customer_id = s.customer_id;

-- CORRECTO: COUNT DISTINCT elimina la duplicación
SELECT COUNT(DISTINCT p.order_id) AS pedidos_generados
FROM sesiones_q1 s
LEFT JOIN pedidos_q1 p ON p.customer_id = s.customer_id;
```

Error mental: asumir que el LEFT JOIN produce una relación uno a uno. En e-commerce, un cliente puede tener muchas sesiones y muchos pedidos — el JOIN por `customer_id` genera todas las combinaciones posibles.

**Error 2 — No filtrar los pedidos por el mismo período que las sesiones**

```sql
-- INCORRECTO: si no filtras pedidos por fecha, un cliente que sesionó en Q1
-- pero compró en Q4 aparece como "conversión" en el funnel de Q1
WITH sesiones_q1 AS (
    SELECT session_id, customer_id, converted
    FROM website_sessions
    WHERE started_at >= '2026-01-01' AND started_at < '2026-04-01'
)
SELECT COUNT(DISTINCT p.order_id) AS pedidos
FROM sesiones_q1 s
LEFT JOIN orders p ON p.customer_id = s.customer_id  -- sin filtro de fecha en orders!

-- CORRECTO: pedidos también filtrados por Q1
WITH sesiones_q1 AS ( ... ),
pedidos_q1 AS (
    SELECT order_id, customer_id, status
    FROM orders
    WHERE ordered_at >= '2026-01-01' AND ordered_at < '2026-04-01'
)
```

Error mental: pensar que el filtro de fecha en la CTE de sesiones "contamina" la CTE de pedidos. No lo hace — cada CTE es independiente.

**Error 3 — Confundir `converted = TRUE` con "hizo un pedido"**

`converted = TRUE` no significa que el cliente hizo un pedido. Significa que realizó una acción de conversión definida en el sistema de tracking — puede ser llegar al checkout, agregar al carrito, o iniciar el proceso de pago. Un cliente puede marcar `converted = TRUE` y luego abandonar el carrito sin hacer un pedido. Por eso el funnel tiene etapas separadas: conversión → pedido son dos conteos diferentes.

**Error 4 — Incluir pedidos cancelados en el denominador de la tasa de entrega**

```sql
-- INCORRECTO: si incluyes pedidos cancelados en el denominador,
-- la tasa de "pedidos entregados" parece más baja de lo real
ROUND(
    COUNT(DISTINCT CASE WHEN p.status = 'delivered' THEN p.order_id END) * 100.0
    / NULLIF(COUNT(DISTINCT p.order_id), 0),  -- denominador incluye cancelados
    2
) AS tasa_pedido_a_entregado

-- Más preciso: comparar entregados vs pedidos no cancelados
ROUND(
    COUNT(DISTINCT CASE WHEN p.status = 'delivered' THEN p.order_id END) * 100.0
    / NULLIF(COUNT(DISTINCT CASE WHEN p.status != 'cancelled' THEN p.order_id END), 0),
    2
) AS tasa_pedido_a_entregado
```

La decisión sobre qué incluir en el denominador es analítica — documentarla siempre en el código.

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

El funnel que construiste en esta lección existe solo mientras dure la query. Cada vez que Valentina o el equipo de los fondos quiera verlo, alguien tiene que ejecutarlo de nuevo. Y si alguien cambia la lógica, todas las queries que dependen de esa lógica quedan desactualizadas.

Lo que el equipo de BI de los fondos necesita no es una query — necesita una **vista**: una tabla virtual que encapsula la lógica del funnel y siempre devuelve datos actualizados, sin que nadie tenga que reescribir nada. Con `CREATE VIEW`, el funnel deja de ser tu query personal y se convierte en infraestructura que todos pueden consultar.
