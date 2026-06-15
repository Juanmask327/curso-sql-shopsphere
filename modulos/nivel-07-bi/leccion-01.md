# Nivel 7 — SQL para Business Intelligence
## Lección 1: website_sessions y COUNT condicional para tasas de conversión

> Tablas disponibles en este nivel: `customers`, `categories`, `products`, `orders`, `order_items`, `returns`, `inventory`, `marketing_campaigns`, `website_sessions`

---

## 1. INTRODUCCIÓN CONCEPTUAL

### El dato que Sofía necesitaba desde hace meses

Sofía lleva semanas insistiendo en la misma pregunta en cada reunión de marketing:

> *"¿Cuál de nuestros canales convierte mejor? No cuál trae más tráfico — cuál trae gente que realmente compra."*

Hasta ahora nadie en ShopSphere podía responderla formalmente. Tenían los datos de campañas en `marketing_campaigns`. Tenían los datos de pedidos en `orders`. Pero el puente entre los dos — qué le pasó a cada usuario que llegó al sitio antes de comprar o no comprar — vivía en una tabla nueva que este nivel desbloquea: `website_sessions`.

Una fila en `website_sessions` representa una visita al sitio de ShopSphere. Cada visita tiene un resultado: el usuario convirtió (hizo una acción de compra) o no convirtió. La columna que captura ese resultado se llama `converted` — un valor booleano: TRUE o FALSE.

Para responderle a Sofía necesitamos dos cosas:
1. Contar las sesiones totales por canal
2. Contar solo las sesiones donde `converted = TRUE`
3. Dividir el segundo número entre el primero para obtener la tasa de conversión

El problema: no puedes filtrar con WHERE y luego contar — si filtras solo las sesiones convertidas, pierdes el denominador (las sesiones totales). Necesitas contar dos cosas diferentes dentro del mismo `GROUP BY`. Eso es exactamente lo que resuelve el **COUNT condicional con CASE WHEN**.

### La tabla website_sessions

Antes de escribir la primera query, entendamos qué tiene esta tabla:

```sql
website_sessions (
    session_id   INTEGER,      -- identificador único de la sesión
    customer_id  INTEGER,      -- FK a customers (puede ser NULL si no está logueado)
    campaign_id  INTEGER,      -- FK a marketing_campaigns (NULL = sesión orgánica)
    started_at   TIMESTAMP,    -- cuándo empezó la sesión
    pages_viewed INTEGER,      -- cuántas páginas vio el usuario (proxy de engagement)
    converted    BOOLEAN,      -- TRUE si el usuario realizó una conversión
    device_type  TEXT          -- 'desktop', 'mobile', 'tablet'
)
```

Dos detalles críticos que debes internalizar antes de escribir cualquier query sobre esta tabla:

**Detalle 1 — campaign_id puede ser NULL.** Una sesión con `campaign_id IS NULL` es una sesión orgánica: el usuario llegó directamente, por búsqueda orgánica, o por un canal no trackeado. Esto tiene consecuencias en los JOINs: si haces `INNER JOIN marketing_campaigns`, pierdes todas las sesiones orgánicas. Si haces `LEFT JOIN`, las conservas. Esta decisión es analítica y debes tomarla conscientemente en cada ejercicio.

**Detalle 2 — website_sessions no tiene order_id.** La tabla no sabe directamente qué pedido generó una sesión. El puente entre sesiones y pedidos es `customer_id`. Esto tiene implicaciones de precisión que exploraremos en la Lección 2.

---

## 2. SINTAXIS

### El patrón COUNT condicional

La forma canónica para contar filas que cumplen una condición dentro de un agregado:

```sql
COUNT(CASE WHEN condicion THEN 1 END)
```

Funciona porque `CASE WHEN` devuelve `1` cuando la condición es verdadera y `NULL` cuando no lo es. La función `COUNT` ignora los valores NULL — solo cuenta los no-nulos. Por eso, el resultado es exactamente la cantidad de filas donde la condición es verdadera.

### Las dos formas equivalentes

Hay dos maneras de escribir el mismo patrón. Ambas dan el mismo resultado:

```sql
-- Forma 1: COUNT con CASE WHEN (la más idiomática — recomendada)
COUNT(CASE WHEN ws.converted = TRUE THEN 1 END)

-- Forma 2: SUM con CASE WHEN (más explícita, más común en MySQL)
SUM(CASE WHEN ws.converted = TRUE THEN 1 ELSE 0 END)
```

La diferencia técnica: `COUNT` ignora NULLs por definición. `SUM` necesita el `ELSE 0` explícito para que los falsos sumen cero en lugar de NULL. En práctica analítica, la Forma 1 es preferida porque es más concisa y aprovecha el comportamiento natural de COUNT.

### Tasa de conversión: la fórmula completa

```sql
ROUND(
    COUNT(CASE WHEN ws.converted = TRUE THEN 1 END) * 100.0
    / NULLIF(COUNT(*), 0),
    2
) AS tasa_conversion_pct
```

Tres elementos obligatorios:
- `* 100.0` — multiplica por 100 para obtener porcentaje. Debe ser `100.0` (con decimal), no `100` (entero), para forzar división decimal. En SQLite y PostgreSQL, dividir dos enteros produce un entero — `3 / 10 = 0`, no `0.3`.
- `NULLIF(COUNT(*), 0)` — protege contra división por cero. Si el grupo no tiene sesiones, `COUNT(*)` es 0 y la división produciría un error. `NULLIF` convierte el 0 en NULL, y `NULL / N = NULL` (sin error).
- `ROUND(..., 2)` — redondea a 2 decimales para presentación.

### Combinación completa con GROUP BY

```sql
SELECT
    mc.channel                                                      AS canal,
    COUNT(*)                                                        AS total_sesiones,
    COUNT(CASE WHEN ws.converted = TRUE THEN 1 END)                 AS sesiones_convertidas,
    ROUND(
        COUNT(CASE WHEN ws.converted = TRUE THEN 1 END) * 100.0
        / NULLIF(COUNT(*), 0),
        2
    )                                                               AS tasa_conversion_pct
FROM website_sessions ws
LEFT JOIN marketing_campaigns mc ON mc.campaign_id = ws.campaign_id
GROUP BY mc.channel
ORDER BY tasa_conversion_pct DESC;
```

---

## 3. EJEMPLO PRÁCTICO

### Contexto: Sofía quiere saber cuál canal convierte mejor

Sofía envía un mensaje a las 11 AM:

> *"Hace meses que discutimos esto en reunión y nadie tenía el número. Quiero saber, mirando todo el histórico de website_sessions, cuál es la tasa de conversión por tipo de campaña. Ordena de mayor a menor tasa."*

**Query 1 — La forma mínima: solo website_sessions, sin JOIN**

Primero confirmamos que tenemos datos y entendemos la estructura:

```sql
-- ¿Cómo se distribuyen las sesiones y las conversiones en total?
SELECT
    COUNT(*)                                                AS total_sesiones,
    COUNT(CASE WHEN converted = TRUE THEN 1 END)           AS sesiones_convertidas,
    ROUND(
        COUNT(CASE WHEN converted = TRUE THEN 1 END) * 100.0
        / NULLIF(COUNT(*), 0),
        2
    )                                                      AS tasa_conversion_global_pct
FROM website_sessions;
```

Output esperado (una sola fila):

| total_sesiones | sesiones_convertidas | tasa_conversion_global_pct |
|---|---|---|
| 8.000 | ~1.400 | ~17.50 |

Esta es la tasa de conversión global — el benchmark. Todo análisis por canal se va a comparar contra este número.

**Query 2 — Con JOIN a marketing_campaigns: tasa por canal**

Ahora cruzamos con campañas para obtener el canal. Usamos `LEFT JOIN` para no perder sesiones orgánicas (`campaign_id IS NULL`), y `COALESCE` para etiquetar esas sesiones como 'organic':

```sql
-- Tasa de conversión histórica por canal de marketing
-- LEFT JOIN para conservar sesiones orgánicas (campaign_id NULL)
SELECT
    COALESCE(mc.channel, 'organic')                                AS canal,
    COUNT(*)                                                       AS total_sesiones,
    COUNT(CASE WHEN ws.converted = TRUE THEN 1 END)                AS sesiones_convertidas,
    ROUND(
        COUNT(CASE WHEN ws.converted = TRUE THEN 1 END) * 100.0
        / NULLIF(COUNT(*), 0),
        2
    )                                                              AS tasa_conversion_pct
FROM website_sessions ws
LEFT JOIN marketing_campaigns mc ON mc.campaign_id = ws.campaign_id
GROUP BY COALESCE(mc.channel, 'organic')
ORDER BY tasa_conversion_pct DESC;
```

Output esperado (fragmento):

| canal | total_sesiones | sesiones_convertidas | tasa_conversion_pct |
|---|---|---|---|
| email | 1.450 | 290 | 20.00 |
| social | 1.380 | 248 | 17.97 |
| paid_search | 1.200 | 192 | 16.00 |
| organic | 980 | 137 | 13.98 |
| display | 870 | 104 | 11.95 |
| affiliate | 1.120 | 134 | 11.96 |

Sofía ve el resultado y escribe en Slack: "Email. Siempre email. Ok, eso va al deck de presupuesto Q3."

**Query 3 — Análisis por device_type con páginas vistas**

Sofía tiene una hipótesis: mobile ve más páginas pero compra menos. Validamos con una query que no necesita ningún JOIN:

```sql
-- ¿Dónde perdemos conversiones por dispositivo?
-- pages_viewed como proxy de engagement
SELECT
    device_type                                                    AS dispositivo,
    COUNT(*)                                                       AS total_sesiones,
    COUNT(CASE WHEN converted = TRUE THEN 1 END)                   AS sesiones_convertidas,
    ROUND(
        COUNT(CASE WHEN converted = TRUE THEN 1 END) * 100.0
        / NULLIF(COUNT(*), 0),
        2
    )                                                              AS tasa_conversion_pct,
    ROUND(AVG(pages_viewed), 2)                                    AS promedio_paginas_vistas
FROM website_sessions
GROUP BY device_type
ORDER BY total_sesiones DESC;
```

Output esperado:

| dispositivo | total_sesiones | sesiones_convertidas | tasa_conversion_pct | promedio_paginas_vistas |
|---|---|---|---|---|
| desktop | 3.200 | 640 | 20.00 | 4.20 |
| mobile | 3.500 | 560 | 16.00 | 5.80 |
| tablet | 1.300 | 221 | 17.00 | 3.90 |

La hipótesis de Sofía se confirma: mobile tiene el promedio más alto de páginas vistas (5.80) pero la tasa de conversión más baja (16%). Esto va a producto.

---

## 4. CASOS DE USO REALES

**Caso 1 — Evaluación de calidad de tráfico por canal (Marketing Analyst)**
La tasa de conversión por canal es la métrica central para decidir dónde invertir el presupuesto de marketing. Un canal con 100.000 sesiones pero 2% de conversión puede rendir menos que uno con 10.000 sesiones y 15% de conversión. COUNT condicional es el patrón que produce esta comparación en una sola query.

**Caso 2 — Validación de hipótesis de UX (Product Analyst)**
El equipo de producto usa pages_viewed + converted para entender si la experiencia del usuario lleva a la compra. Si users con alto engagement (muchas páginas vistas) no convierten, hay un problema de checkout. Si usuarios de mobile tienen más páginas vistas pero menos conversiones, hay un problema de experiencia móvil. Este análisis alimenta la priorización del backlog de producto.

**Caso 3 — Segmentación de sesiones para reportes de BI (BI Developer, Data Analyst)**
En dashboards de Power BI o Tableau, las tasas de conversión se muestran como métricas calculadas. La fuente de esas métricas es una query con COUNT condicional, frecuentemente encapsulada en una vista o una tabla agregada. El BI Developer necesita que esta lógica sea correcta y eficiente antes de conectar la herramienta.

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico
**Contexto (Briefing 7.4 — Sofía Ramírez):** Sofía quiere validar su hipótesis sobre mobile: que los usuarios de mobile ven más páginas pero compran menos. Si la hipótesis se confirma, hay un problema de UX móvil que llevar a producto.

Escribe una query que retorne, para cada `device_type`: `dispositivo`, `total_sesiones`, `sesiones_convertidas`, `tasa_conversion_pct` (redondeado a 2 decimales) y `promedio_paginas_vistas` (redondeado a 2 decimales). Ordena por `total_sesiones` descendente.

**Tablas necesarias:** `website_sessions`

**Resultado esperado:** 3 filas (una por device_type). Si la hipótesis de Sofía es correcta, mobile debe mostrar el promedio más alto de páginas vistas y la tasa de conversión más baja.

**Criterio de éxito:** COUNT condicional para `sesiones_convertidas`. `100.0` (no `100`) en el numerador del porcentaje. `NULLIF(COUNT(*), 0)` en el denominador. `AVG(pages_viewed)` para el engagement. Sin JOINs — website_sessions tiene todo lo necesario.

---

### Ejercicio Intermedio
**Contexto (Briefing 7.7 — Valentina Torres):** El equipo de producto quiere clasificar las sesiones por nivel de engagement según páginas vistas y ver la tasa de conversión por categoría. La hipótesis: "exploración alta" convierte más. Pero Valentina quiere el número, no la intuición.

Clasifica cada sesión con CASE WHEN:
- `pages_viewed = 1` → 'rebote'
- `pages_viewed BETWEEN 2 AND 4` → 'exploracion baja'
- `pages_viewed BETWEEN 5 AND 9` → 'exploracion media'
- `pages_viewed >= 10` → 'exploracion alta'

Retorna `nivel_engagement`, `total_sesiones`, `sesiones_convertidas` y `tasa_conversion_pct`. Ordena del menor al mayor engagement (rebote primero, exploración alta último) — no uses ORDER BY alfabético sobre el string porque el orden sería incorrecto.

**Tablas necesarias:** `website_sessions`

**Resultado esperado:** 4 filas. El ORDER BY correcto requiere un segundo CASE WHEN que asigna un número de orden a cada categoría.

**Criterio de éxito:** CASE WHEN para crear la columna de clasificación (en CTE o subquery). COUNT condicional para la tasa. Un ORDER BY con CASE WHEN que ordena por número de engagement, no alfabéticamente. 4 filas en el resultado.

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
SELECT
    device_type                                                    AS dispositivo,
    COUNT(*)                                                       AS total_sesiones,
    COUNT(CASE WHEN converted = TRUE THEN 1 END)                   AS sesiones_convertidas,
    ROUND(
        COUNT(CASE WHEN converted = TRUE THEN 1 END) * 100.0
        / NULLIF(COUNT(*), 0),
        2
    )                                                              AS tasa_conversion_pct,
    ROUND(AVG(pages_viewed), 2)                                    AS promedio_paginas_vistas
FROM website_sessions
GROUP BY device_type
ORDER BY total_sesiones DESC;
```

**Solución Ejercicio Intermedio:**
```sql
WITH sesiones_clasificadas AS (
    SELECT
        session_id,
        converted,
        CASE
            WHEN pages_viewed = 1            THEN 'rebote'
            WHEN pages_viewed BETWEEN 2 AND 4 THEN 'exploracion baja'
            WHEN pages_viewed BETWEEN 5 AND 9 THEN 'exploracion media'
            WHEN pages_viewed >= 10           THEN 'exploracion alta'
        END AS nivel_engagement
    FROM website_sessions
)
SELECT
    nivel_engagement,
    COUNT(*)                                                       AS total_sesiones,
    COUNT(CASE WHEN converted = TRUE THEN 1 END)                   AS sesiones_convertidas,
    ROUND(
        COUNT(CASE WHEN converted = TRUE THEN 1 END) * 100.0
        / NULLIF(COUNT(*), 0),
        2
    )                                                              AS tasa_conversion_pct
FROM sesiones_clasificadas
GROUP BY nivel_engagement
ORDER BY
    CASE nivel_engagement
        WHEN 'rebote'           THEN 1
        WHEN 'exploracion baja' THEN 2
        WHEN 'exploracion media'THEN 3
        WHEN 'exploracion alta' THEN 4
    END;
```

</details>

---

## 6. ERRORES COMUNES

**Error 1 — División de enteros: usar `100` en lugar de `100.0`**

```sql
-- INCORRECTO: en SQLite y PostgreSQL, la división entera trunca el resultado
-- 14 / 100 = 0 (no 0.14)
COUNT(CASE WHEN converted = TRUE THEN 1 END) * 100
/ NULLIF(COUNT(*), 0)

-- CORRECTO: el 100.0 fuerza la división decimal
COUNT(CASE WHEN converted = TRUE THEN 1 END) * 100.0
/ NULLIF(COUNT(*), 0)
```

Error mental: asumir que la presencia de ROUND(...) corrige la división entera. No lo hace — ROUND opera sobre el resultado de la división, que ya llegó truncado.

**Error 2 — Omitir NULLIF y dividir por cero**

```sql
-- INCORRECTO: si un canal no tiene sesiones, COUNT(*) = 0 y hay error
COUNT(CASE WHEN converted = TRUE THEN 1 END) * 100.0
/ COUNT(*)

-- CORRECTO: NULLIF convierte 0 en NULL; NULL / N = NULL (sin error)
COUNT(CASE WHEN converted = TRUE THEN 1 END) * 100.0
/ NULLIF(COUNT(*), 0)
```

Error mental: "si hay un GROUP BY, cada grupo siempre tiene al menos una fila". No necesariamente — si filtras con WHERE sobre started_at y un canal no tiene sesiones en ese período, el grupo no aparece. Pero si la tabla llega vacía o el denominador es cero por otra razón, el error aparece. NULLIF es una protección defensiva obligatoria.

**Error 3 — Filtrar con WHERE y perder el denominador**

```sql
-- INCORRECTO: esto cuenta solo sesiones convertidas,
-- no hay denominador para calcular la tasa
SELECT
    mc.channel,
    COUNT(*) AS sesiones_convertidas  -- <- esto es sesiones convertidas, no total
FROM website_sessions ws
INNER JOIN marketing_campaigns mc ON mc.campaign_id = ws.campaign_id
WHERE ws.converted = TRUE
GROUP BY mc.channel;

-- CORRECTO: no filtrar con WHERE; usar COUNT condicional
SELECT
    mc.channel,
    COUNT(*) AS total_sesiones,
    COUNT(CASE WHEN ws.converted = TRUE THEN 1 END) AS sesiones_convertidas
FROM website_sessions ws
INNER JOIN marketing_campaigns mc ON mc.campaign_id = ws.campaign_id
GROUP BY mc.channel;
```

Error mental: querer "primero filtrar y luego contar". El COUNT condicional existe exactamente para contar dos poblaciones distintas dentro del mismo conjunto sin filtrar.

**Error 4 — Olvidar las sesiones orgánicas con INNER JOIN**

```sql
-- INCORRECTO: INNER JOIN excluye todas las sesiones donde campaign_id IS NULL
-- (sesiones orgánicas) — el análisis queda incompleto
FROM website_sessions ws
INNER JOIN marketing_campaigns mc ON mc.campaign_id = ws.campaign_id

-- CORRECTO para incluir orgánicas: LEFT JOIN + COALESCE
FROM website_sessions ws
LEFT JOIN marketing_campaigns mc ON mc.campaign_id = ws.campaign_id
-- y en el SELECT:
COALESCE(mc.channel, 'organic') AS canal
```

Error mental: no notar que `campaign_id` puede ser NULL. En e-commerce, el tráfico orgánico suele representar 20-40% del total. Excluirlo silenciosamente infla la tasa de conversión de los canales pagos.

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

Ahora sabes contar conversiones dentro de cada canal. Pero Sofía tiene una pregunta más profunda: de todas las sesiones que convirtieron, ¿cuántas terminaron en un pedido real? ¿Y de esos pedidos, cuántos se entregaron?

Una conversión (`converted = TRUE`) no es un pedido — es una intención. El usuario llegó al checkout, pero puede haber abandonado el carrito, fallado el pago, o simplemente cerrado la pestaña. Para medir cuántas intenciones se materializaron en pedidos entregados, necesitamos conectar `website_sessions` con `orders` en un flujo de múltiples etapas.

Eso es un **funnel de adquisición** — y se construye con LEFT JOIN encadenado entre tablas conectadas por `customer_id`.
