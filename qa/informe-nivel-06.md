# Informe QA — Nivel 6: Analitica de Negocio
**Fecha:** 2026-06-02
**Generado por:** sql-data-analyst (Modo QA)
**Archivos revisados:**
- `modulos/nivel-06-analitica/leccion-01.md`
- `modulos/nivel-06-analitica/leccion-02.md`
- `modulos/nivel-06-analitica/leccion-03.md`
- `modulos/nivel-06-analitica/leccion-04.md`
- `modulos/nivel-06-analitica/ejercicios-nivel-06.sql`
- `contenido/briefings-nivel-06.md`
- `dataset/expected-results-nivel-06-template.json`

---

## Veredicto General

REQUIERE CORRECCIONES

---

## Resumen de Hallazgos

| ID | Severidad | Archivo | Descripcion breve |
|---|---|---|---|
| CRIT-N6-01 | CRITICO | `ejercicios-nivel-06.sql` | Solucion 19: SUM(MAX(...)) produce error de agregacion anidada en PostgreSQL — la query no ejecuta |
| CRIT-N6-02 | CRITICO | `ejercicios-nivel-06.sql` | Solucion 25: RANK() sobre conjunto que incluye 2024 — el ranking de meses de 2025 es incorrecto |
| CRIT-N6-03 | CRITICO | `ejercicios-nivel-06.sql` | Solucion 12: calculo de mes_vida con division /30 falla para febrero y meses de 28-29 dias |
| CRIT-06 | CRITICO | `expected-results-nivel-06-template.json` + `briefings-nivel-06.md` | Estado: CORREGIDO en lecciones y ejercicios, PENDIENTE en el template JSON |
| IMP-N6-01 | IMPORTANTE | `ejercicios-nivel-06.sql` | Solucion 18: CTE ltv_pais tiene INNER JOIN redundante con customers — mala practica de diseno |
| IMP-N6-02 | IMPORTANTE | `expected-results-nivel-06-template.json` | Template Ejercicio 2: referencia a website_sessions (Nivel 7), tabla no disponible en Nivel 6 |
| IMP-N6-03 | IMPORTANTE | `expected-results-nivel-06-template.json` | Template Ejercicio 3 y 9: referencia a website_sessions (Nivel 7) como tablas del ejercicio |
| SUG-N6-01 | SUGERENCIA | `leccion-01.md` | Query 4: JOIN de campaigns con orders por periodo es semanticamente impreciso — un pedido puede ser de cualquier cliente, no solo de clientes de la campana |
| SUG-N6-02 | SUGERENCIA | Todas las lecciones | DATE_TRUNC, EXTRACT, INTERVAL '1 month', PERCENTILE_CONT — no hay nota de dialecto como en Nivel 5 |
| SUG-N6-03 | SUGERENCIA | `ejercicios-nivel-06.sql` | Solucion 19: ademas del error CRIT-N6-01, la CTE clientes_cohorte_por_canal nunca se usa en el SELECT final |

---

## Estado de CRIT-06 (pre-existente)

El CRIT-06 documentado en `qa/correcciones-pendientes-sql-teacher.md` indicaba que el Briefing 6.9 y el Template del Ejercicio 12 pedian analizar pagos fallidos por metodo de pago usando la tabla `payments` (Nivel 8), no disponible en Nivel 6.

**Estado verificado en esta revision:**

- `leccion-03.md` — CORREGIDO: el Ejercicio Intermedio de la Leccion 3 usa `orders.status = 'cancelled'` como proxy. La nota pedagogica explica explicitamente que `payments` pertenece al Nivel 8. La solucion incluye comentario final que documenta el origen del cambio.
- `ejercicios-nivel-06.sql` — CORREGIDO: el Ejercicio 24 y su Solucion 24 usan exclusivamente `orders` y `customers`. Las notas pedagogicas en enunciado y solucion son claras sobre el proxy usado.
- `expected-results-nivel-06-template.json` — PENDIENTE: el Ejercicio 12 del template sigue referenciando `payments` como tabla requerida. Las tablas declaradas son `["payments", "orders", "customers"]` y la query de referencia usa `payments p INNER JOIN orders o`. Este archivo no fue actualizado con la correccion aplicada a lecciones y ejercicios.

El CRIT-06 esta PARCIALMENTE corregido. La correccion en lecciones y ejercicios es satisfactoria. El template JSON requiere actualizacion para reflejar la correccion (ver hallazgo vinculado en la seccion de hallazgos — el template sigue siendo inconsistente con el material publicable).

---

## Hallazgos Detallados

---

### [CRIT-N6-01] Solucion 19 — SUM(MAX(...)) produce error de agregacion anidada en PostgreSQL

**Archivo:** `modulos/nivel-06-analitica/ejercicios-nivel-06.sql`
**Seccion:** Solucion 19 (Integrador de Bloque C), CTEs `clientes_cohorte_por_canal`, `retencion_canal` y la subquery inline del SELECT final

**Problema:** La Solucion 19 intenta calcular la tasa de retencion por canal combinando un MAX por cliente con un SUM por canal en una sola capa de agregacion. Tres partes de la query usan la construccion `SUM(MAX(CASE ... END))`:

```sql
-- En la CTE clientes_cohorte_por_canal (lineas 1155-1160):
SUM(MAX(CASE
    WHEN DATE_TRUNC('month', o2.ordered_at)::DATE
         = (pp.cohorte + INTERVAL '1 month')::DATE
    THEN 1
    ELSE 0
END))  AS retuvieron_mes_2

-- GROUP BY mc.channel, pp.customer_id
```

Esta construccion es invalida en SQL estandar y en PostgreSQL. `SUM` y `MAX` son ambas funciones de agregacion (aggregate functions). No se puede usar una funcion de agregacion dentro de otra en el mismo nivel de GROUP BY. En PostgreSQL esto produce:

```
ERROR:  aggregate function calls cannot be nested
```

El comentario en la CTE incluso reconoce el problema: "Nota: este GROUP BY incluye customer_id para el MAX por cliente; necesita una segunda agrupacion para el canal". Esta nota describe la solucion correcta pero la query no la implementa.

El mismo patron invalido aparece otras dos veces: en la CTE `retencion_canal` (que tampoco se usa en el SELECT final) y en la subquery inline del LEFT JOIN del SELECT final.

**Impacto:** La Solucion 19 no ejecuta en PostgreSQL. Es el ejercicio integrador del Bloque C — el de mayor complejidad del nivel. Un estudiante que intente ejecutar la solucion recibe un error inmediato. Si el teacher usa este codigo como base para crear el expected_result, ese resultado tampoco sera correcto.

**Correccion propuesta:** Separar el calculo en dos capas de CTEs: una que calcula el MAX por (canal, cliente) y otra que aplica COUNT y SUM sobre esos resultados.

```sql
-- Paso 1: MAX por (canal, cliente) — cada cliente vale 0 o 1 para retencion
retencion_por_cliente_canal AS (
    SELECT
        mc.channel,
        pp.customer_id,
        MAX(CASE
            WHEN DATE_TRUNC('month', o2.ordered_at)::DATE
                 = (pp.cohorte + INTERVAL '1 month')::DATE
            THEN 1 ELSE 0
        END) AS retuvo_mes_2
    FROM marketing_campaigns mc
    INNER JOIN orders o      ON o.ordered_at::DATE BETWEEN mc.started_at
                                                       AND COALESCE(mc.ended_at, CURRENT_DATE)
    INNER JOIN primer_pedido pp ON pp.customer_id = o.customer_id
                                AND pp.cohorte    = DATE_TRUNC('month', o.ordered_at)::DATE
    LEFT JOIN  orders o2     ON o2.customer_id = pp.customer_id
                             AND o2.status     <> 'cancelled'
    WHERE mc.started_at >= '2025-01-01'
      AND mc.started_at <  '2026-01-01'
      AND o.status      <> 'cancelled'
    GROUP BY mc.channel, pp.customer_id
),
-- Paso 2: agregar por canal
retencion_canal AS (
    SELECT
        channel,
        COUNT(*)                                               AS clientes_nuevos_canal,
        SUM(retuvo_mes_2)                                     AS retuvieron_mes_2,
        ROUND(
            SUM(retuvo_mes_2) * 100.0
            / NULLIF(COUNT(*), 0),
            1
        )                                                     AS tasa_retencion_promedio
    FROM retencion_por_cliente_canal
    GROUP BY channel
)
```

---

### [CRIT-N6-02] Solucion 25 — RANK() sobre conjunto que incluye datos de 2024

**Archivo:** `modulos/nivel-06-analitica/ejercicios-nivel-06.sql`
**Seccion:** Solucion 25 (Integrador del Nivel 6), columna `ranking_mes_2025`

**Problema:** La CTE `revenue_serie_completa` incluye datos desde `2024-01-01` hasta `2025-12-31` (necesario para que `LAG(revenue, 12)` funcione). El SELECT final aplica `RANK() OVER (ORDER BY revenue DESC)` sobre el resultado de esa CTE, y luego filtra con `WHERE mes >= '2025-01-01'`.

El problema: la clausula `RANK() OVER (ORDER BY revenue DESC)` se evalua sobre **todas las filas de la CTE**, es decir, sobre los 24 meses (2024 + 2025). Cuando el `WHERE mes >= '2025-01-01'` filtra el resultado, los numeros de RANK ya fueron calculados incluyendo los meses de 2024. Si noviembre 2024 tuvo mas revenue que noviembre 2025, el RANK de noviembre 2025 no sera 1 — sera 2.

El comentario en el codigo lo reconoce explicitamente: "Ranking solo sobre 2025 — se aplica despues del filtro WHERE. Para RANK dentro del WHERE, usar una subquery o CTE adicional". El codigo documenta el problema pero **no lo corrige** — la implementacion produce rankings incorrectos cuando hay meses de 2024 con revenue mayor que su equivalente en 2025.

Esto es pedagogicamente peligroso: el enunciado pide `ranking_mes: rank del mes por revenue (1 = mejor)`, el comentario promete que es "ranking solo sobre 2025", pero el numero producido incluye la competencia de los meses de 2024. El estudiante recibe un resultado que parece razonable (los rankings son del 1 al 24, pero filtrados al rango 1-24 segun posicion relativa global).

**Impacto:** El ejercicio 25 es el ejercicio de cierre del Nivel 6. El enunciado pide `ranking_mes: rank del mes por revenue (1 = mejor)` — la expectativa del estudiante es que el rank 1 sea el mes de 2025 con mayor revenue. Si la solucion produce rangos sobre el conjunto 2024+2025, el resultado es inconsistente con el enunciado.

**Correccion propuesta:** Agregar una CTE intermedia que aplique el filtro temporal antes del RANK, o usar una subquery en el SELECT final.

```sql
-- Opcion A: CTE adicional para el ranking
WITH revenue_serie_completa AS (
    SELECT
        DATE_TRUNC('month', o.ordered_at)::DATE    AS mes,
        ROUND(SUM(oi.quantity * oi.unit_price), 2)  AS revenue
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.ordered_at >= '2024-01-01'
      AND o.ordered_at <  '2026-01-01'
      AND o.status     <> 'cancelled'
    GROUP BY DATE_TRUNC('month', o.ordered_at)
),
solo_2025 AS (
    SELECT mes, revenue
    FROM revenue_serie_completa
    WHERE mes >= '2025-01-01' AND mes < '2026-01-01'
)
SELECT
    rsc.mes,
    rsc.revenue                                          AS revenue_mensual,
    LAG(rsc.revenue, 1)  OVER (ORDER BY rsc.mes)         AS revenue_mes_anterior,
    -- ... (resto de las window functions sobre rsc)
    RANK() OVER (ORDER BY s25.revenue DESC)              AS ranking_mes_2025
FROM revenue_serie_completa rsc
INNER JOIN solo_2025 s25 ON s25.mes = rsc.mes
WHERE rsc.mes >= '2025-01-01'
ORDER BY rsc.mes;

-- Opcion B (mas simple): calcular ranking en subquery separada
-- y el RANK se aplica SOLO sobre los 12 meses de 2025
```

---

### [CRIT-N6-03] Solucion 12 — calculo de mes_vida con division /30 produce asignaciones incorrectas

**Archivo:** `modulos/nivel-06-analitica/ejercicios-nivel-06.sql`
**Seccion:** Solucion 12 (Integrador de Bloque B), CTE `revenue_por_mes_vida`, columna `mes_vida`

**Problema:** La formula para calcular el mes de vida del cliente es:

```sql
(DATE_TRUNC('month', o.ordered_at)
 - pp.cohorte::TIMESTAMP) / 30 + 1  AS mes_vida
```

Esta formula divide la diferencia de dias entre el mes del pedido y la fecha de cohorte por 30 (division entera), asumiendo que todos los meses tienen 30 dias. Esta suposicion falla para meses de 28 y 31 dias.

Casos demostrados donde la formula produce el resultado incorrecto:

| Cohorte | Mes del pedido | Dias de diferencia | Formula /30 | Resultado correcto |
|---|---|---|---|---|
| 2025-01-01 | 2025-03-01 | 59 dias | 59/30=1, +1=**2** | **3** |
| 2025-02-01 | 2025-04-01 | 59 dias | 59/30=1, +1=**2** | **3** |

Cuando la cohorte es de enero y hay compras en marzo, la formula los clasifica como "mes de vida 2" en lugar de "mes de vida 3". Esto afecta directamente las columnas `ltv_1_a_3` y `ltv_1_a_6` del resultado: los ingresos de marzo se acumulan en el bucket del mes 2 en lugar del mes 3, distorsionando el LTV acumulado a 3 y 6 meses.

En PostgreSQL, `DATE_TRUNC('month', ...)` retorna un TIMESTAMP. La resta de dos TIMESTAMP produce un INTERVAL (no un INTEGER de dias). La division de un INTERVAL por 30 en PostgreSQL no produce un INTEGER — produce un INTERVAL fraccionario, que cuando se trunca a entero puede producir el mismo error de redondeo.

**Impacto:** Los valores de LTV por mes de vida son semanticamente incorrectos para cohortes que tienen meses de 28 o 31 dias en su primer trimestre. El ejercicio integrador del Bloque B — el mas complejo de la seccion de cohortes — produce numeros que parecen correctos pero estan distorsionados.

**Correccion propuesta:** Usar diferencia de meses calendario exacta:

```sql
-- CORRECTO: diferencia de meses calendario
(
  (EXTRACT(YEAR  FROM DATE_TRUNC('month', o.ordered_at))
   - EXTRACT(YEAR  FROM pp.cohorte)) * 12
  + EXTRACT(MONTH FROM DATE_TRUNC('month', o.ordered_at))
  - EXTRACT(MONTH FROM pp.cohorte)
  + 1
)::INT  AS mes_vida
```

O usando `AGE()` de PostgreSQL:

```sql
-- Alternativa con AGE():
(EXTRACT(YEAR  FROM AGE(DATE_TRUNC('month', o.ordered_at), pp.cohorte)) * 12
 + EXTRACT(MONTH FROM AGE(DATE_TRUNC('month', o.ordered_at), pp.cohorte))
 + 1)::INT  AS mes_vida
```

---

### [IMP-N6-01] Solucion 18 — CTE ltv_pais tiene INNER JOIN redundante con la tabla customers

**Archivo:** `modulos/nivel-06-analitica/ejercicios-nivel-06.sql`
**Seccion:** Solucion 18, CTE `ltv_pais`

**Problema:** La CTE `ltv_pais` calcula el LTV promedio por pais con la siguiente estructura:

```sql
ltv_pais AS (
    SELECT c.country, ROUND(AVG(ltv_cliente), 2) AS ltv_promedio
    FROM (
        SELECT o.customer_id, c2.country, SUM(oi.quantity * oi.unit_price) AS ltv_cliente
        FROM orders o
        INNER JOIN order_items oi ON oi.order_id = o.order_id
        INNER JOIN customers c2 ON c2.customer_id = o.customer_id
        WHERE o.status <> 'cancelled'
        GROUP BY o.customer_id, c2.country
    ) AS subq
    INNER JOIN customers c ON c.country = subq.country  -- JOIN redundante
    GROUP BY c.country
)
```

El JOIN `INNER JOIN customers c ON c.country = subq.country` une el resultado del subquery (que ya tiene el pais correcto por cliente) con TODOS los clientes de ese pais. Para un pais con N clientes en la tabla `customers` y M clientes en el subquery (M <= N), cada fila del subquery se replica N veces en el producto cartesiano del JOIN. El resultado: `AVG(ltv_cliente)` promedia N*M filas en lugar de M filas.

El promedio se preserva cuando M = N (todos los clientes tienen pedidos), pero falla cuando hay clientes sin pedidos no cancelados (M < N): los LTV existentes se replican N/M veces y el promedio baja incorrectamente hacia el valor medio de los clientes con pedidos repetidos.

La correccion es eliminar el JOIN redundante: el subquery ya tiene el pais en `c2.country`. Solo hay que agrupar sobre el resultado del subquery directamente.

**Impacto:** La query produce resultados numericamente incorrectos cuando hay clientes sin pedidos no cancelados en algun pais. En ShopSphere, donde hay clientes registrados que nunca compraron, esto es un caso real. El ejercicio 18 es de los mas complejos del nivel y un estudiante que copie este patron aprende una tecnica de JOIN que infla denominadores de promedios de forma silenciosa.

**Correccion propuesta:**

```sql
ltv_pais AS (
    SELECT subq.country, ROUND(AVG(subq.ltv_cliente), 2) AS ltv_promedio
    FROM (
        SELECT o.customer_id, c2.country, SUM(oi.quantity * oi.unit_price) AS ltv_cliente
        FROM orders o
        INNER JOIN order_items oi ON oi.order_id = o.order_id
        INNER JOIN customers c2   ON c2.customer_id = o.customer_id
        WHERE o.status <> 'cancelled'
        GROUP BY o.customer_id, c2.country
    ) AS subq
    GROUP BY subq.country
)
```

---

### [IMP-N6-02] Template Ejercicio 2 — referencia a website_sessions (Nivel 7)

**Archivo:** `dataset/expected-results-nivel-06-template.json`
**Seccion:** Ejercicio 2 (`exercise_number: 2`)

**Problema:** El ejercicio 2 del template tiene como `tables_used: ["website_sessions", "marketing_campaigns"]` y la `reference_query` usa `website_sessions`. La tabla `website_sessions` no esta disponible en el Nivel 6 — se desbloquea en el Nivel 7.

El briefing correspondiente (6.2) pide "revenue generado por canal por mes". La nota en el template reconoce la ambiguedad: "la tabla website_sessions no tiene columna de revenue — tiene converted (BOOLEAN)". Esta ambiguedad debio haberse resuelto antes de fijar el template.

**Impacto:** Si el teacher escribe el ejercicio 2 usando website_sessions, un estudiante del Nivel 6 no podra ejecutarlo en su entorno. Ademas, la query propuesta no responde el briefing (usa conversiones, no revenue).

**Correccion propuesta:** El ejercicio 2 debe reformularse usando solo tablas de Nivel 6. El briefing 6.2 puede responderse usando `marketing_campaigns` + `orders` + `order_items` con el mismo patron de JOIN temporal que usan los ejercicios 3, 13, 14, 15: revenue atribuible por canal por mes. Esto es coherente con lo que la Leccion 3 ya ensenada. La `reference_query` del template debe actualizarse.

---

### [IMP-N6-03] Template Ejercicios 3 y 9 — referencias a website_sessions (Nivel 7)

**Archivo:** `dataset/expected-results-nivel-06-template.json`
**Seccion:** Ejercicios 3 (`exercise_number: 3`) y 9 (`exercise_number: 9`)

**Problema:** El ejercicio 3 del template tiene `tables_used: ["marketing_campaigns", "website_sessions", "orders", "order_items"]` y el ejercicio 9 tiene `tables_used: ["marketing_campaigns", "website_sessions"]`. Ambas queries de referencia usan `website_sessions` con un modelo de atribucion basado en sesiones convertidas.

Las lecciones y ejercicios del Nivel 6 ya resolvieron el problema correctamente usando el JOIN temporal por periodo activo de campana (sin `website_sessions`). El template no fue actualizado para reflejar la aproximacion finalmente elegida.

**Impacto:** Los templates son la fuente de verdad para los expected_results que se cargan en la base de datos. Si se generan los expected_results a partir de estos templates sin corregirlos, los ejercicios 2, 3 y 9 tendran expected_results calculados con queries que usan tablas del Nivel 7, mientras que el material ensenado en Nivel 6 usa la aproximacion sin website_sessions.

**Correccion propuesta:** Actualizar los ejercicios 2, 3 y 9 del template para que sus `tables_used` y `reference_query` usen exclusivamente `marketing_campaigns`, `orders` y `order_items`. El patron de JOIN temporal ya esta validado y es coherente con los ejercicios 3, 13, 14 y 15 del archivo SQL.

---

### [SUG-N6-01] Leccion 1, Query 4 — JOIN de campanas con pedidos es semanticamente impreciso

**Archivo:** `modulos/nivel-06-analitica/leccion-01.md`
**Seccion:** Seccion 3 (Ejemplo Practico), Query 4 — LAG con PARTITION BY canal

**Problema:** La Query 4 de la Leccion 1 atribuye todos los pedidos realizados durante el periodo activo de una campana a esa campana:

```sql
FROM marketing_campaigns mc
INNER JOIN orders o ON o.ordered_at BETWEEN mc.started_at
                                        AND COALESCE(mc.ended_at, CURRENT_DATE)
```

Este patron es el modelo de atribucion directa por periodo, que la Leccion 3 luego explica correctamente como "modelo simplificado". Sin embargo, la Leccion 1 lo presenta sin ninguna advertencia semantica: el estudiante puede asumir que este JOIN es una forma robusta de "vincular clientes con campanas", cuando en realidad atribuye a la campana pedidos de clientes que quiza nunca vieron la campana.

La Leccion 3 lo explica bien: "La forma mas simple — la atribucion directa por periodo — es suficiente para calcular el ROI de primer orden. El modelo real requiere website_sessions (Nivel 7)". El problema es que la Leccion 1 usa el patron antes de que se hayan explicado sus limitaciones.

**Impacto:** Menor — la Leccion 3 corrige la comprension. Pero el estudiante que lea la Query 4 de la Leccion 1 aislada puede asumir que el JOIN por periodo es equivalente a "campana -> cliente". Una nota breve en el codigo lo previene.

**Correccion sugerida:** Agregar un comentario al JOIN en la Query 4 de la Leccion 1:

```sql
-- Atribucion directa por periodo: todos los pedidos durante el periodo activo
-- de la campana. Simplificacion valida para el analisis de tendencia MoM.
-- En la Leccion 3 se explica el modelo completo con sus limitaciones.
FROM marketing_campaigns mc
INNER JOIN orders o ON o.ordered_at::DATE BETWEEN mc.started_at ...
```

---

### [SUG-N6-02] Falta de nota sobre dialecto SQL en queries PostgreSQL-especificas

**Archivos:** Todas las lecciones y ejercicios del Nivel 6
**Seccion:** Todas las queries de ejemplo y soluciones

**Problema:** Las queries del Nivel 6 usan extensivamente:
- `DATE_TRUNC('month', ...)` — no disponible en SQLite
- `EXTRACT(MONTH FROM ...)` — no disponible en SQLite (distinta sintaxis)
- `INTERVAL '1 month'` — no disponible en SQLite
- `PERCENTILE_CONT(0.5) WITHIN GROUP (...)` — no disponible en SQLite
- `::DATE`, `::INT`, `::TIMESTAMP` — cast con `::` es PostgreSQL, no SQLite ni MySQL
- `TO_CHAR(fecha, 'TMMonth')` — PostgreSQL, no SQLite

El Informe del Nivel 5 documento esta misma alerta como "NOTA SOBRE EL DIALECTO SQL" y la marco como alerta pre-existente. En el Nivel 6 la densidad de funciones PostgreSQL-especificas es aun mayor que en el Nivel 5.

Verificado: el Playground del curso usa SQLite (sql.js via WebAssembly). Las queries del Nivel 6 no son ejecutables en el Playground sin adaptacion.

**Impacto:** Si el teacher no advierte al estudiante sobre el dialecto, el estudiante que intente ejecutar las queries en el Playground recibira errores. Esto es especialmente problematico en los ejercicios de cohortes (usan `DATE_TRUNC` y `INTERVAL` extensivamente) y en el LTV por pais (usa `PERCENTILE_CONT`).

**Correccion sugerida:** Agregar una nota de dialecto al inicio de cada leccion y del archivo de ejercicios, similar a la que ya aparece documentada en el informe del Nivel 5. Ejemplo:

```
> Nota de dialecto: las queries de esta leccion usan sintaxis PostgreSQL.
> En el Playground (SQLite), DATE_TRUNC('month', fecha) se reemplaza por
> strftime('%Y-%m-01', fecha), INTERVAL '1 month' por "+1 month",
> y EXTRACT(MONTH FROM fecha) por CAST(strftime('%m', fecha) AS INT).
> PERCENTILE_CONT no esta disponible en SQLite — se puede aproximar con CTEs.
```

---

### [SUG-N6-03] Solucion 19 — la CTE clientes_cohorte_por_canal nunca se usa en el SELECT final

**Archivo:** `modulos/nivel-06-analitica/ejercicios-nivel-06.sql`
**Seccion:** Solucion 19, CTE `clientes_cohorte_por_canal`

**Problema:** La Solucion 19 define tres CTEs antes del SELECT: `revenue_canal`, `primer_pedido` y `clientes_cohorte_por_canal`. El SELECT final hace JOIN con `revenue_canal` (como `rc`) y con una subquery inline para la retencion. La CTE `clientes_cohorte_por_canal` nunca es referenciada.

Adicionalmente, la CTE `retencion_canal` (que tambien aparece definida) tampoco se referencia en el SELECT final — se define pero se descarta.

Esta es una evidencia adicional de que la Solucion 19 fue escrita de forma incremental y no fue limpiada antes de ser incluida en el material. La existencia de CTEs huerfanas indica que la solucion esta incompleta o fue refactorizada a medias.

**Impacto:** Menor en si mismo — una CTE no referenciada no produce un error en PostgreSQL (se ignora). Pero combinado con CRIT-N6-01, confirma que la Solucion 19 requiere una reescritura completa, no solo una correccion puntual.

**Nota:** este hallazgo se subsana automaticamente al aplicar la correccion de CRIT-N6-01.

---

## Aspectos Positivos

**1. CRIT-06 corregido en lecciones y ejercicios con calidad pedagogica:** La adaptacion del Briefing 6.9 usando `orders.status = 'cancelled'` como proxy es pedagogicamente solida. La nota en la Leccion 3 explica claramente por que se usa el proxy, y la solucion del Ejercicio 24 tiene dos comentarios bien colocados que documentan el origen del cambio y anticipan el Nivel 8. Es el patron correcto para ensenar limitaciones de datos.

**2. El LAST_VALUE con marco explicito esta correctamente implementado en la Leccion 2:** La explicacion de la trampa del marco por defecto es precisa y verificada: sin el marco `UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`, `LAST_VALUE` retorna el valor de la fila actual — no el ultimo de la particion. La Leccion 2 lo documenta tanto en la seccion de Sintaxis como en Errores Comunes, con el codigo correcto en todos sus ejemplos. Es una mejora clara respecto al tratamiento del mismo tema en el Nivel 4.

**3. NULLIF en todos los denominadores:** Las 25 soluciones del archivo de ejercicios y todos los ejemplos de las lecciones usan `NULLIF` en cada denominador de division. No hay ninguna division desprotegida en el nivel. El patron es consistente y correcto.

**4. La estructura de las cuatro lecciones tiene los 7 pasos pedagogicos completos:** Todas las lecciones tienen Introduccion Conceptual, Sintaxis, Ejemplo Practico, Casos de Uso Reales, Ejercicio Propuesto, Errores Comunes y Conexion con el Tema Siguiente. La Conexion con el Tema Siguiente de la Leccion 2 (que vincula cohortes con analisis de campanas) y de la Leccion 3 (que vincula ROI con estacionalidad) son especialmente buenas narrativamente.

**5. La narrativa de ShopSphere es coherente entre briefings y lecciones:** Los personajes, eventos y numeros de referencia son consistentes: la caida de marzo 2025, el spike de julio 2025, la campaña de hogar premium de septiembre, el Black Friday de noviembre. Los briefings tienen voz propia y las queries producen los patrones que los briefings describen. La cohesion narrativa del nivel es la mejor del curso hasta ahora.

**6. Los valores de CHECK constraint de marketing_campaigns.channel son correctos:** La Leccion 3 muestra el CREATE TABLE con `channel IN ('email','social','paid_search','display','affiliate')`, que coincide exactamente con el schema canonico. Las queries de todos los ejercicios usan estos valores consistentemente.

**7. Patron CTE preagregacion + window function bien establecido:** Todas las soluciones que aplican LAG o LEAD siguen el patron correcto: primero agregar en una CTE, luego aplicar la window function en el SELECT externo. El Error 3 de la Leccion 1 documenta explicitamente el anti-patron (LAG sobre datos crudos sin preagregacion).

**8. Solucion 25 — estructura conceptual correcta, salvo el RANK:** La Solucion 25 combina LAG(1), LAG(12), AVG OVER con marco deslizante y RANK en una sola query. La estructura de CTEs, el manejo del periodo historico para el YoY, y los NULLIF son todos correctos. Solo el RANK requiere correccion (CRIT-N6-02). Es la mejor query de cierre de nivel producida hasta ahora.

---

## Proximos Pasos

### Correcciones bloqueantes (antes de publicar)

1. **[CRIT-N6-01] Solucion 19:** Reescribir usando dos capas de CTEs para el calculo de retencion por canal. La estructura sugerida en la correccion propuesta es funcional y pedagogicamente mas clara que la version actual.

2. **[CRIT-N6-02] Solucion 25:** Agregar una CTE `solo_2025` que filtre los meses antes de aplicar `RANK()`. Actualizar el comentario en el codigo para que ya no diga "usar una subquery o CTE adicional" sino que lo implemente.

3. **[CRIT-N6-03] Solucion 12:** Reemplazar la formula `(DATE_TRUNC - cohorte::TIMESTAMP) / 30 + 1` por la formula de diferencia de meses calendario con `EXTRACT(YEAR)` y `EXTRACT(MONTH)`.

4. **[CRIT-06 pendiente] Template Ejercicio 12:** Actualizar `expected-results-nivel-06-template.json` para que el Ejercicio 12 use la aproximacion con `orders` y `customers` (sin `payments`) y sus `tables_used` reflejen esto.

### Correcciones importantes (aplicar en proxima sesion)

5. **[IMP-N6-01] Solucion 18:** Eliminar el `INNER JOIN customers c ON c.country = subq.country` de la CTE `ltv_pais`. Agrupar directamente sobre el subquery.

6. **[IMP-N6-02] y [IMP-N6-03] Template Ejercicios 2, 3 y 9:** Actualizar las `tables_used` y `reference_query` para que usen solo tablas de Nivel 6. El patron de JOIN temporal ya existe en otros ejercicios del template.

### Mejoras opcionales (no bloqueantes)

7. **[SUG-N6-01] Leccion 1, Query 4:** Agregar comentario sobre la naturaleza del modelo de atribucion directa por periodo.

8. **[SUG-N6-02] Nota de dialecto:** Agregar nota de compatibilidad SQLite en el encabezado de cada leccion y del archivo de ejercicios. La arquitectura del Playground usa SQLite y los estudiantes necesitan saber que adaptaciones hacer.
