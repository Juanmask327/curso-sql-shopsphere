# Nivel 8 — SQL Profesional
## Lección 4: SQL de producción — vistas documentadas, calidad de datos y cierre del curso

> Tablas disponibles en este nivel: `customers`, `categories`, `products`, `orders`, `order_items`, `returns`, `inventory`, `marketing_campaigns`, `website_sessions`, `payments`

---

## 1. INTRODUCCIÓN CONCEPTUAL

### El último entregable antes de la junta

La reunión con los inversores es el jueves. Ana envió el proyecto con seis puntos de análisis. Marco necesita los números para la presentación. El fondo chileno ya sabe que hay algo raro en Chile — quiere que ShopSphere lo nombre antes de que ellos lo pregunten.

El SQL que has escrito durante el nivel 8 responde todas las preguntas. Pero hay una diferencia entre una query que responde una pregunta y una query que puede mantenerse en producción el año que viene.

Una query de producción tiene tres características que la distinguen de una query de análisis ad-hoc:

1. **Es reproducible:** otro analista puede ejecutarla en seis meses y entender qué hace sin preguntarte a ti
2. **Es robusta:** maneja casos borde (divisiones por cero, valores NULL, períodos sin datos) sin producir resultados silenciosamente incorrectos
3. **Comunica su intención:** los nombres de columnas, los comentarios y la estructura hacen que el resultado sea interpretable sin documento adicional

Este nivel no termina cuando la query "funciona" — termina cuando la query está lista para producción.

### Por qué las vistas importan para un analista de datos

En el Nivel 7 aprendiste a crear vistas como infraestructura para Power BI. En este nivel las vistas tienen un papel adicional: encapsular la lógica compleja de `payments` para que las queries de análisis que vienen encima sean simples y legibles.

Sin vista:
```sql
-- Cada vez que alguien quiere revenue neto necesita recordar todos los JOINs,
-- los filtros de status, el NULLIF, y cómo manejar paid_at NULL
SELECT c.country,
       SUM(CASE WHEN p.status='completed' THEN p.amount ELSE 0 END)
       - SUM(CASE WHEN p.status='refunded' THEN p.amount ELSE 0 END)
FROM payments p
INNER JOIN orders o ON o.order_id = p.order_id
INNER JOIN customers c ON c.customer_id = o.customer_id
WHERE p.paid_at IS NOT NULL
GROUP BY c.country;
```

Con vista:
```sql
-- La lógica está encapsulada — quien consulta la vista no necesita saber el detalle
SELECT pais, revenue_neto FROM v_revenue_neto_por_pais WHERE anio = 2026;
```

La vista no hace la query más rápida (en la mayoría de los casos). La hace más mantenible, más reutilizable y menos propensa a errores cuando distintos analistas reproducen el mismo cálculo.

---

## 2. SINTAXIS

### Comentarios SQL como documentación

SQL tiene dos tipos de comentarios:

```sql
-- Comentario de una línea: explica una línea específica

/*
   Comentario de bloque: explica la query completa.
   Incluir: propósito, quién la creó, cuándo, para qué sistema o reporte.
   Ejemplo:
   Propósito: revenue neto Q1 2026 para informe de junta directiva
   Creado: 2026-06-01 | Autor: [analista]
   Tablas: payments, orders, customers
   Notas: paid_at IS NOT NULL excluye pagos pending sin fecha
*/
```

Comentarios que son obligatorios en queries de producción:

1. **Encabezado de la query:** propósito, autor, fecha, tablas involucradas
2. **Decisiones no obvias:** por qué LEFT JOIN en lugar de INNER JOIN, por qué NULLIF en ese denominador, por qué ese filtro de fecha
3. **Notas sobre limitaciones:** qué casos quedan excluidos y por qué

### Formatear outputs para no-técnicos

```sql
-- Nombres de columna en español legible para el CEO
SELECT
    c.country                                     AS pais,
    ROUND(revenue_neto, 2)                        AS revenue_neto_usd,
    ROUND(pct_reembolsado, 2)                     AS porcentaje_reembolsado,
    CASE
        WHEN pct_reembolsado > 5 THEN 'ALERTA'
        ELSE 'Normal'
    END                                           AS indicador_riesgo

-- ROUND siempre antes de mostrar decimales financieros
-- CAST cuando el tipo de dato del output importa para la herramienta de destino
CAST(revenue_neto AS INTEGER)                     AS revenue_redondeado_usd
```

### CREATE VIEW en SQLite (sin OR REPLACE)

```sql
-- SQLite no soporta CREATE OR REPLACE VIEW
-- Usar DROP VIEW IF EXISTS antes del CREATE VIEW
DROP VIEW IF EXISTS v_revenue_neto_mensual;
CREATE VIEW v_revenue_neto_mensual AS
SELECT
    STRFTIME('%Y-%m', p.paid_at)          AS mes,
    ROUND(
        SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END)
        - SUM(CASE WHEN p.status = 'refunded'  THEN p.amount ELSE 0 END),
        2
    )                                     AS revenue_neto
FROM payments p
WHERE p.paid_at IS NOT NULL
GROUP BY STRFTIME('%Y-%m', p.paid_at);
```

### El checklist de calidad de una query de producción

Antes de entregar cualquier query de producción, verifica:

```
[ ] ¿Tiene NULLIF en todos los denominadores?
[ ] ¿Usa COUNT DISTINCT donde el JOIN puede duplicar filas?
[ ] ¿Los filtros de fecha usan rangos (>= y <) en lugar de funciones en la columna?
[ ] ¿Los nombres de columna son legibles para el destinatario final?
[ ] ¿El ROUND tiene los decimales correctos para el contexto (2 para montos)?
[ ] ¿El LEFT JOIN está justificado o debería ser INNER JOIN?
[ ] ¿Hay un comentario que explique qué hace la query y por qué?
[ ] ¿Los valores NULL en el output son intencionales o indican un problema?
[ ] ¿La query funciona si el período no tiene datos (resultado vacío vs. error)?
[ ] ¿La query puede ejecutarse dos veces y producir el mismo resultado?
```

---

## 3. EJEMPLO PRÁCTICO

### Contexto: construir el informe financiero Q1 2026 para la junta

El proyecto del Nivel 8 pide seis entregables. Aquí construimos los dos más complejos como queries de producción listas para entregar.

**Query de producción 1 — Revenue neto mensual Q1 2026 con variación MoM**

```sql
/*
 * Revenue neto mensual Q1 2026 con variación mes a mes
 * Propósito: gráfico de tendencia para apertura de presentación a inversores
 * Briefing: Proyecto Nivel 8, punto 4 — Ana Castillo
 * Tablas: payments
 * Notas: paid_at IS NOT NULL excluye pending sin fecha (ver auditoría EJ03).
 *        Si los pagos con paid_at NULL son materiales, el revenue puede estar
 *        subestimado. Verificar con la query de auditoría antes de presentar.
 */
WITH revenue_mensual AS (
    SELECT
        -- Número de mes para ordenar correctamente
        CAST(STRFTIME('%m', p.paid_at) AS INTEGER)   AS nro_mes,
        -- Nombre de mes legible para la presentación
        CASE CAST(STRFTIME('%m', p.paid_at) AS INTEGER)
            WHEN 1 THEN 'Enero 2026'
            WHEN 2 THEN 'Febrero 2026'
            WHEN 3 THEN 'Marzo 2026'
        END                                          AS mes_nombre,
        SUM(CASE WHEN p.status = 'completed'
                 THEN p.amount ELSE 0 END)           AS cobrado,
        SUM(CASE WHEN p.status = 'refunded'
                 THEN p.amount ELSE 0 END)           AS reembolsado
    FROM payments p
    WHERE p.paid_at >= '2026-01-01'
      AND p.paid_at <  '2026-04-01'
      -- paid_at IS NOT NULL está implícito por el rango de fechas
    GROUP BY CAST(STRFTIME('%m', p.paid_at) AS INTEGER)
)
SELECT
    mes_nombre                                       AS mes,
    ROUND(cobrado - reembolsado, 2)                  AS revenue_neto,
    -- LAG trae el revenue_neto del mes anterior para calcular la variación
    ROUND(
        LAG(cobrado - reembolsado) OVER (ORDER BY nro_mes),
        2
    )                                                AS revenue_neto_mes_anterior,
    -- Variación porcentual vs. mes anterior (NULL en el primer mes)
    ROUND(
        (
            (cobrado - reembolsado)
            - LAG(cobrado - reembolsado) OVER (ORDER BY nro_mes)
        ) * 100.0
        / NULLIF(
            LAG(cobrado - reembolsado) OVER (ORDER BY nro_mes),
            0
        ),
        2
    )                                                AS variacion_pct
FROM revenue_mensual
ORDER BY nro_mes;
```

Output esperado (valores simulados):

| mes           | revenue_neto | revenue_neto_mes_anterior | variacion_pct |
|---------------|-------------|--------------------------|---------------|
| Enero 2026    | 85.400,00   | NULL                     | NULL          |
| Febrero 2026  | 88.200,00   | 85.400,00                | 3,28          |
| Marzo 2026    | 76.300,00   | 88.200,00                | -13,49        |

Marzo muestra una caída del 13,49% respecto a febrero — exactamente el período donde la anomalía de Chile en credit_card impacta el revenue. Ese es el dato que abre la presentación de Ana.

**Query de producción 2 — Vista ejecutiva de resumen mensual completo**

Esta vista consolida las métricas principales en una sola estructura reutilizable:

```sql
/*
 * Vista v_resumen_mensual_ejecutivo
 * Propósito: métricas consolidadas para dashboard ejecutivo y reportes a inversores
 * Tablas: payments, orders, order_items, returns, customers
 * Notas: revenue_neto excluye pagos con paid_at NULL
 *        tasa_fallo_pago = pagos failed / total intentos del mes
 *        tasa_devolucion = returns aprobados / pedidos del mes
 */
DROP VIEW IF EXISTS v_resumen_mensual_ejecutivo;
CREATE VIEW v_resumen_mensual_ejecutivo AS
WITH pagos_mes AS (
    SELECT
        STRFTIME('%Y-%m', p.paid_at)              AS mes,
        COUNT(DISTINCT p.order_id)                AS pedidos_con_pago,
        SUM(CASE WHEN p.status = 'completed'
                 THEN p.amount ELSE 0 END)        AS total_cobrado,
        SUM(CASE WHEN p.status = 'refunded'
                 THEN p.amount ELSE 0 END)        AS total_reembolsado,
        -- Tasa de fallo: pagos fallidos / total intentos
        ROUND(
            SUM(CASE WHEN p.status = 'failed'
                     THEN 1 ELSE 0 END) * 100.0
            / NULLIF(COUNT(*), 0),
            2
        )                                         AS tasa_fallo_pago_pct
    FROM payments p
    WHERE p.paid_at IS NOT NULL
    GROUP BY STRFTIME('%Y-%m', p.paid_at)
),
pedidos_mes AS (
    SELECT
        STRFTIME('%Y-%m', o.ordered_at)           AS mes,
        COUNT(DISTINCT o.order_id)                AS total_pedidos,
        COUNT(DISTINCT o.customer_id)             AS clientes_activos
    FROM orders o
    WHERE o.status != 'cancelled'
    GROUP BY STRFTIME('%Y-%m', o.ordered_at)
),
devoluciones_mes AS (
    SELECT
        STRFTIME('%Y-%m', r.returned_at)          AS mes,
        COUNT(DISTINCT r.return_id)               AS total_devoluciones
    FROM returns r
    WHERE r.status IN ('approved', 'refunded')
    GROUP BY STRFTIME('%Y-%m', r.returned_at)
)
SELECT
    pm.mes                                        AS mes,
    COALESCE(pe.total_pedidos, 0)                 AS total_pedidos,
    COALESCE(pe.clientes_activos, 0)              AS clientes_activos,
    ROUND(COALESCE(pm.total_cobrado, 0)
          - COALESCE(pm.total_reembolsado, 0),
          2)                                      AS revenue_neto,
    COALESCE(pm.tasa_fallo_pago_pct, 0)           AS tasa_fallo_pago_pct,
    -- Tasa de devolución: devoluciones aprobadas / pedidos del mes
    ROUND(
        COALESCE(dm.total_devoluciones, 0) * 100.0
        / NULLIF(COALESCE(pe.total_pedidos, 0), 0),
        2
    )                                             AS tasa_devolucion_pct
FROM pagos_mes pm
LEFT JOIN pedidos_mes pe      ON pe.mes      = pm.mes
LEFT JOIN devoluciones_mes dm ON dm.mes      = pm.mes
ORDER BY pm.mes;

-- Validar la vista
SELECT * FROM v_resumen_mensual_ejecutivo
WHERE mes >= '2026-01'
ORDER BY mes;
```

Esta vista es la infraestructura central del dashboard ejecutivo. Cualquier analista del equipo puede consultar `v_resumen_mensual_ejecutivo` sin necesidad de recordar cómo se calculan las métricas. Y si mañana cambia la definición de "tasa de devolución", se actualiza la vista una sola vez y todas las queries que la usan reflejan el cambio automáticamente.

---

## 4. CASOS DE USO REALES

**Caso 1 — Reportes ejecutivos recurrentes (Senior Data Analyst, BI Developer)**
Los reportes que van a la junta directiva cada trimestre se basan en queries que se ejecutan con un cambio mínimo (actualizar el rango de fechas). Si esas queries están bien documentadas y encapsuladas en vistas, el analista tarda 30 minutos en preparar el informe. Si no, tarda un día redescubriendo la lógica.

**Caso 2 — Transferencia de conocimiento (Team Lead, Data Manager)**
Cuando un analista deja el equipo, sus queries van con él a menos que estén documentadas. Las vistas con comentarios detallados son el mecanismo de transferencia de conocimiento más efectivo en equipos de datos. Un nuevo analista puede leer la vista y entender la lógica sin necesitar una reunión.

**Caso 3 — Fuente única de verdad para métricas de negocio (Data Analyst, Business Analyst)**
En empresas donde múltiples equipos calculan el mismo KPI de formas distintas ("nuestro revenue es diferente al de finanzas"), las vistas centralizadas resuelven el problema. Una sola vista define cómo se calcula el revenue neto — todos los dashboards la usan y el número es siempre el mismo.

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico
**Contexto (Proyecto Nivel 8 — Punto 5):** Ana necesita la distribución de transacciones completadas por método de pago en Q1 2026. Si un solo método concentra más del 50% del volumen, debe incluirse como observación de riesgo.

Escribe una query con la siguiente estructura:
- Solo pagos con `status = 'completed'` en Q1 2026 (enero–marzo)
- Columnas: `metodo`, `transacciones`, `monto_total` (redondeado a 2 dec), `pct_transacciones` (% sobre el total de transacciones completadas del período, redondeado a 2 dec)
- Ordena por `transacciones` descendente
- Incluye un comentario SQL de encabezado con: propósito, tabla usada, período

**Tablas necesarias:** `payments`

**Criterio de éxito:** Filtro de período correcto con rango de fechas. CTE o SUM OVER () para calcular el porcentaje sobre el total. NULLIF en el denominador. Comentario de encabezado presente.

---

### Ejercicio Intermedio
**Contexto (Proyecto Nivel 8 — Cierre del portafolio):** Valentina necesita la vista `v_resumen_financiero_pais` para el dashboard de los fondos. Esta vista debe mostrar, por país, las métricas financieras clave del último año completo.

Crea la vista con estas columnas:
- `pais` (country del cliente, vía orders y customers)
- `total_pedidos` (COUNT DISTINCT de order_id en payments)
- `revenue_cobrado` (SUM de payments completed, redondeado a 2 dec)
- `revenue_reembolsado` (SUM de payments refunded, redondeado a 2 dec)
- `revenue_neto` (cobrado - reembolsado, redondeado a 2 dec)
- `tasa_reembolso_pct` (reembolsado / cobrado * 100, redondeado a 2 dec)
- `tasa_fallo_pago_pct` (pagos failed / total intentos * 100, redondeado a 2 dec)

Solo incluye el último año de datos (paid_at >= fecha hace 12 meses) y solo registros con `paid_at IS NOT NULL`. Ordena por `revenue_neto` descendente.

Después de crear la vista, escribe el SELECT de validación.

**Tablas necesarias:** `payments`, `orders`, `customers`

**Criterio de éxito:** DROP VIEW IF EXISTS. CREATE VIEW con la lógica correcta. JOIN payments → orders → customers. NULLIF en todos los denominadores. Comentario de encabezado. SELECT de validación al final.

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
/*
 * Concentración de métodos de pago — Q1 2026
 * Propósito: identificar riesgo de concentración para sección de riesgos del informe
 * Tabla: payments
 * Período: enero–marzo 2026 (solo pagos completados con paid_at en rango)
 * Nota: si un método supera el 50% del volumen, Ana lo incluye como alerta
 */
WITH pagos_q1 AS (
    SELECT
        method,
        amount
    FROM payments
    WHERE status  = 'completed'
      AND paid_at >= '2026-01-01'
      AND paid_at <  '2026-04-01'
),
totales AS (
    SELECT COUNT(*) AS total_transacciones
    FROM pagos_q1
)
SELECT
    pc.method                                                    AS metodo,
    COUNT(*)                                                     AS transacciones,
    ROUND(SUM(pc.amount), 2)                                     AS monto_total,
    ROUND(
        COUNT(*) * 100.0 / NULLIF(t.total_transacciones, 0),
        2
    )                                                            AS pct_transacciones
FROM pagos_q1 pc
CROSS JOIN totales t
GROUP BY pc.method, t.total_transacciones
ORDER BY transacciones DESC;
```

**Solución Ejercicio Intermedio:**
```sql
/*
 * Vista v_resumen_financiero_pais
 * Propósito: métricas financieras por país para dashboard de inversores
 * Tablas: payments, orders, customers
 * Período: últimos 12 meses desde la fecha de ejecución
 * Notas: paid_at IS NOT NULL excluye intentos sin fecha (pending sin procesar)
 *        tasa_fallo_pago_pct incluye TODOS los intentos del período (no solo los de paid_at IS NOT NULL
 *        para eso se necesitaría cruzar por ordered_at — simplificación aceptable para este reporte)
 */
DROP VIEW IF EXISTS v_resumen_financiero_pais;
CREATE VIEW v_resumen_financiero_pais AS
WITH pagos_por_pais AS (
    SELECT
        c.country,
        COUNT(DISTINCT p.order_id)                               AS total_pedidos,
        SUM(CASE WHEN p.status = 'completed'
                 THEN p.amount ELSE 0 END)                       AS cobrado,
        SUM(CASE WHEN p.status = 'refunded'
                 THEN p.amount ELSE 0 END)                       AS reembolsado,
        SUM(CASE WHEN p.status = 'failed'
                 THEN 1 ELSE 0 END)                              AS fallos,
        COUNT(*)                                                  AS total_intentos
    FROM payments p
    INNER JOIN orders o    ON o.order_id    = p.order_id
    INNER JOIN customers c ON c.customer_id = o.customer_id
    WHERE p.paid_at IS NOT NULL
      AND p.paid_at >= DATE('now', '-12 months')
    GROUP BY c.country
)
SELECT
    country                                                       AS pais,
    total_pedidos,
    ROUND(cobrado, 2)                                             AS revenue_cobrado,
    ROUND(reembolsado, 2)                                         AS revenue_reembolsado,
    ROUND(cobrado - reembolsado, 2)                               AS revenue_neto,
    ROUND(
        reembolsado * 100.0 / NULLIF(cobrado, 0),
        2
    )                                                             AS tasa_reembolso_pct,
    ROUND(
        fallos * 100.0 / NULLIF(total_intentos, 0),
        2
    )                                                             AS tasa_fallo_pago_pct
FROM pagos_por_pais
ORDER BY revenue_neto DESC;

-- Validación de la vista
SELECT * FROM v_resumen_financiero_pais;
```

</details>

---

## 6. ERRORES COMUNES

**Error 1 — Nombres de columna técnicos en outputs para no-técnicos**

```sql
-- INCORRECTO: un CEO no sabe qué es "pct_reembolsado_completed_vs_total"
SELECT
    country,
    pct_reembolsado_completed_vs_total

-- CORRECTO: nombre que comunica sin ambigüedad
SELECT
    country                AS pais,
    pct_reembolsado        AS porcentaje_reembolsado,
    CASE
        WHEN pct_reembolsado > 5 THEN 'Alerta: supera umbral del 5%'
        ELSE 'Normal'
    END                    AS estado
```

Error mental: escribir nombres de columna pensando en el programador que escribió la query, no en la persona que va a leer el resultado.

**Error 2 — Crear una vista sin DROP VIEW IF EXISTS en SQLite**

```sql
-- INCORRECTO en SQLite: CREATE OR REPLACE VIEW no existe
CREATE OR REPLACE VIEW v_resumen AS SELECT ...;
-- Error: "near 'OR': syntax error"

-- CORRECTO en SQLite: siempre DROP antes de CREATE
DROP VIEW IF EXISTS v_resumen;
CREATE VIEW v_resumen AS SELECT ...;
```

Error mental: asumir que SQLite soporta la misma sintaxis que PostgreSQL. La diferencia `CREATE OR REPLACE` vs `DROP + CREATE` es uno de los dialectos más frecuentes en el curso.

**Error 3 — Vista con lógica de fecha relativa que produce resultados distintos en cada ejecución**

```sql
-- POTENCIALMENTE CONFUSO: DATE('now', '-12 months') cambia con el tiempo
-- Una vista creada hoy devuelve diferentes resultados que la misma vista ejecutada en 6 meses
CREATE VIEW v_revenue_anual AS
SELECT ... FROM payments WHERE paid_at >= DATE('now', '-12 months');

-- MEJOR PRÁCTICA para reportes puntuales: fijar el período en el SELECT
-- y dejar la vista sin filtro de fecha, o pasarla como parámetro
CREATE VIEW v_revenue_por_pais AS
SELECT c.country, p.paid_at, p.amount, p.status
FROM payments p INNER JOIN orders o ON o.order_id = p.order_id
INNER JOIN customers c ON c.customer_id = o.customer_id;

-- El filtro de fecha va en la query sobre la vista, no en la vista
SELECT country, SUM(amount) FROM v_revenue_por_pais
WHERE paid_at >= '2026-01-01' AND status = 'completed';
```

Error mental: meter lógica de negocio variable (fechas, umbrales) dentro de la vista. Las vistas deberían encapsular la estructura y los JOINs, no la lógica temporal que cambia con cada reporte.

**Error 4 — Documentar qué hace la query sin documentar por qué**

```sql
-- INSUFICIENTE: explica el "qué" pero no el "por qué"
-- Calcular revenue neto con NULLIF
SELECT ROUND(cobrado - reembolsado, 2) / NULLIF(total, 0) ...

-- CORRECTO: documenta la decisión
-- NULLIF(total, 0): protege contra división por cero en países con
-- datos de reembolso pero sin cobros registrados en el período
-- (puede ocurrir por procesos de ajuste contable asincrónico)
SELECT ROUND(cobrado - reembolsado, 2) / NULLIF(total, 0) ...
```

Error mental: documentar para describir el código en lugar de documentar para explicar las decisiones no obvias. El código se explica solo; los comentarios deben explicar el razonamiento.

---

## 7. CIERRE DEL CURSO — NIVEL 8 COMPLETADO

### Lo que construiste en este nivel

En el Nivel 8 completaste el ciclo completo de SQL profesional:

**Lección 1:** Introdujiste `payments` y calculaste revenue neto real — la diferencia entre lo facturado y lo efectivamente cobrado. Detectaste la anomalía de Chile con análisis comparativo por método de pago.

**Lección 2:** Diagnosticaste queries lentas con `EXPLAIN QUERY PLAN`, creaste índices que convierten scans completos en búsquedas directas, y aprendiste los anti-patrones que impiden que los índices se usen.

**Lección 3:** Protegiste operaciones multi-paso con transacciones, implementaste upserts idempotentes con `ON CONFLICT`, y escribiste queries de auditoría que detectan estados inconsistentes en los datos.

**Lección 4:** Construiste SQL de producción — queries documentadas, vistas reutilizables, outputs formateados para la audiencia correcta.

### Dónde continuar

El Capstone que sigue integra todo lo aprendido en un análisis completo de ShopSphere. Pero el SQL profesional va mucho más allá del curso — estos son los próximos pasos naturales:

**PostgreSQL en la nube:** Los conceptos de este nivel (índices, transacciones, EXPLAIN ANALYZE) alcanzan todo su potencial en PostgreSQL sobre datasets reales de millones de filas. Amazon RDS, Google Cloud SQL y Azure Database son los puntos de entrada más comunes.

**Python + SQL:** `pandas`, `SQLAlchemy` y `psycopg2` conectan el poder de Python con la expresividad de SQL. Para análisis que requieren transformaciones iterativas o machine learning, la combinación Python + SQL es el estándar de la industria.

**dbt (data build tool):** Si las vistas de este nivel te resultaron útiles, dbt las lleva al siguiente nivel: versiona tus modelos SQL como código, agrega tests automáticos de calidad de datos, genera documentación, y orquesta el pipeline de transformación completo.

**Power BI / Tableau:** Las vistas que construiste en los Niveles 7 y 8 son exactamente la infraestructura que estas herramientas consumen. Conectar Power BI a una base de datos con vistas bien estructuradas es el puente entre el SQL que escribiste y los dashboards que usan los ejecutivos.

El Capstone es donde todo esto converge. Nos vemos ahí.
