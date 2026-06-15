# QA — Nivel 7: SQL para Business Intelligence
**Fecha:** 2026-06-02
**Auditor:** sql-data-analyst (Modo QA)
**Veredicto general:** REQUIERE CORRECCIONES

---

## Resumen

| Archivo | Veredicto | Criticos | Importantes |
|---|---|---|---|
| leccion-01.md | APROBADO | 0 | 0 |
| leccion-02.md | APROBADO | 0 | 0 |
| leccion-03.md | REQUIERE CORRECCIONES | 1 | 1 |
| leccion-04.md | APROBADO CON OBSERVACIONES | 0 | 1 |
| ejercicios-nivel-07.sql | REQUIERE CORRECCIONES | 1 | 0 |

---

## Correcciones criticas

### [CRIT-N7-01] v_clientes_perfil — revenue_total inflado por multiplicacion silenciosa en triple LEFT JOIN

**Archivo:** `modulos/nivel-07-bi/leccion-03.md` (Vista 2, secciones 3 y 5) y `modulos/nivel-07-bi/ejercicios-nivel-07.sql` (Soluciones 13 y 16)

**Componente:** Definicion de la vista `v_clientes_perfil` con triple LEFT JOIN: `customers → orders → order_items` mas `customers → website_sessions`.

**Problema:** La vista realiza cuatro LEFT JOINs en cascada sobre `customers`:

```sql
FROM customers c
LEFT JOIN orders o         ON o.customer_id  = c.customer_id
LEFT JOIN order_items oi   ON oi.order_id    = o.order_id
LEFT JOIN website_sessions ws ON ws.customer_id = c.customer_id
```

Cuando un cliente tiene N order_items (a traves de sus pedidos) y M sesiones, el JOIN produce N x M filas por cliente. La expresion `SUM(oi.quantity * oi.unit_price)` dentro del GROUP BY suma las N x M filas, no las N filas de order_items. El resultado: `revenue_total` queda multiplicado por M (el numero de sesiones del cliente).

Ejemplo concreto: cliente con 4 order_items en sus pedidos y 5 sesiones → 20 filas en el producto cartesiano → revenue_total = 5 veces el revenue real. El `COALESCE(..., 0)` no protege contra esta inflacion — solo convierte NULL a 0, pero el dato ya llego inflado.

Este error es silencioso: la query ejecuta sin errores, los numeros parecen plausibles (son positivos y del orden correcto), pero son incorrectos. El COUNT DISTINCT en `total_pedidos` y `total_sesiones` es correcto porque DISTINCT elimina los duplicados para esas columnas. Sin embargo, el SUM no tiene esa proteccion.

**Impacto:** Cualquier analisis de revenue que use `v_clientes_perfil` producira resultados incorrectos. La vista se declara como infraestructura critica reutilizable en el Capstone — si se construye mal aqui, todos los analisis del Capstone que dependan de `revenue_total` estaran equivocados. La Leccion 4 y el EJ21/22 tambien usaran esta vista.

**Correccion — dos alternativas:**

**Opcion A (recomendada): Calcular revenue en una subquery separada antes del JOIN con website_sessions**

```sql
DROP VIEW IF EXISTS v_clientes_perfil;
CREATE VIEW v_clientes_perfil AS
WITH revenue_por_cliente AS (
    -- Revenue calculado ANTES del JOIN con website_sessions
    -- para evitar la multiplicacion de filas
    SELECT
        o.customer_id,
        COUNT(DISTINCT o.order_id)              AS total_pedidos,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS revenue_total,
        MIN(o.ordered_at)                       AS primer_pedido_at,
        MAX(o.ordered_at)                       AS ultimo_pedido_at
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.order_id
    GROUP BY o.customer_id
),
sesiones_por_cliente AS (
    SELECT
        ws.customer_id,
        COUNT(DISTINCT ws.session_id)           AS total_sesiones,
        COUNT(DISTINCT CASE WHEN ws.converted = TRUE THEN ws.session_id END) AS sesiones_convertidas
    FROM website_sessions ws
    GROUP BY ws.customer_id
)
SELECT
    c.customer_id,
    c.country,
    c.registered_at,
    COALESCE(rpc.total_pedidos, 0)              AS total_pedidos,
    COALESCE(rpc.revenue_total, 0)              AS revenue_total,
    rpc.primer_pedido_at,
    rpc.ultimo_pedido_at,
    COALESCE(spc.total_sesiones, 0)             AS total_sesiones,
    COALESCE(spc.sesiones_convertidas, 0)       AS sesiones_convertidas
FROM customers c
LEFT JOIN revenue_por_cliente rpc  ON rpc.customer_id = c.customer_id
LEFT JOIN sesiones_por_cliente spc ON spc.customer_id = c.customer_id;
```

**Opcion B: subquery escalar para revenue dentro de la vista**

```sql
DROP VIEW IF EXISTS v_clientes_perfil;
CREATE VIEW v_clientes_perfil AS
SELECT
    c.customer_id,
    c.country,
    c.registered_at,
    COUNT(DISTINCT o.order_id)                                           AS total_pedidos,
    COALESCE(
        (SELECT SUM(oi.quantity * oi.unit_price)
         FROM order_items oi
         INNER JOIN orders o2 ON o2.order_id = oi.order_id
         WHERE o2.customer_id = c.customer_id),
        0
    )                                                                    AS revenue_total,
    MIN(o.ordered_at)                                                    AS primer_pedido_at,
    MAX(o.ordered_at)                                                    AS ultimo_pedido_at,
    COUNT(DISTINCT ws.session_id)                                        AS total_sesiones,
    COUNT(DISTINCT CASE WHEN ws.converted = TRUE THEN ws.session_id END) AS sesiones_convertidas
FROM customers c
LEFT JOIN orders o         ON o.customer_id  = c.customer_id
LEFT JOIN website_sessions ws ON ws.customer_id = c.customer_id
GROUP BY
    c.customer_id,
    c.country,
    c.registered_at;
```

La Opcion A es mas eficiente y mas clara pedagogicamente (muestra el patron correcto de separar agregados independientes antes de joinearlos). La Opcion B mantiene la estructura de la vista original pero la subquery escalar es menos eficiente para datasets grandes.

**Nota sobre consistencia:** La Leccion 3 correctamente advierte que `v_funnel_adquisicion` genera N x M filas y que se debe usar COUNT DISTINCT al consultarla. Sin embargo, `v_clientes_perfil` agrega internamente con SUM sin esa proteccion — el problema no esta en quien consulta la vista, sino en la vista misma. La advertencia de la leccion cubre la vista de sesiones pero no la de perfil.

---

## Correcciones importantes

### [IMP-N7-01] Leccion 3 Seccion 2 — CREATE OR REPLACE VIEW presentada como forma principal sin advertencia inmediata de incompatibilidad SQLite

**Archivo:** `modulos/nivel-07-bi/leccion-03.md`

**Componente:** Seccion 2 (Sintaxis), bloque "CREATE OR REPLACE VIEW: la version de produccion"

**Problema:** La seccion 2 presenta `CREATE OR REPLACE VIEW` con el titulo "la version de produccion" y la etiqueta "Usar siempre esta forma", antes de agregar — en un bloque separado — que no funciona en SQLite y que la alternativa es `DROP VIEW IF EXISTS + CREATE VIEW`. Un estudiante del curso que copie el bloque "usar siempre esta forma" directamente al Playground obtendra un error.

El problema no es que la advertencia este ausente — esta, pero llega despues. El problema es la jerarquia visual: "usar siempre" y "version de produccion" son instrucciones directas que el estudiante seguira, y la excepcion SQLite aparece como un bloque posterior que puede pasarse por alto.

Los ejercicios y soluciones del nivel (EJ13, EJ16) usan correctamente `DROP VIEW IF EXISTS + CREATE VIEW`. La seccion de Errores Comunes (Error 4) tambien lo documenta bien. Solo la Seccion 2 tiene esta inconsistencia de presentacion.

**Impacto:** El estudiante puede ejecutar `CREATE OR REPLACE VIEW` en el Playground (SQLite) y recibir un error confuso, cuando el material le dijo explicitamente que "use siempre esta forma".

**Correccion:** Reorganizar el bloque de Sintaxis de la siguiente manera:

```markdown
### CREATE VIEW con patron SQLite (el Playground usa SQLite)

-- Patron correcto para el Playground:
DROP VIEW IF EXISTS nombre_vista;
CREATE VIEW nombre_vista AS
SELECT ...;

### CREATE OR REPLACE VIEW (PostgreSQL y otros motores de produccion)

-- En PostgreSQL, MySQL 8+, Snowflake, BigQuery:
-- Si la vista ya existe, la reemplaza. Si no existe, la crea.
CREATE OR REPLACE VIEW nombre_vista AS
SELECT ...;

-- NOTA: Este patron NO funciona en SQLite (el motor del Playground).
-- En el Playground, usa siempre DROP VIEW IF EXISTS + CREATE VIEW.
```

Alternativamente: invertir el orden — presentar la forma SQLite primero como la forma del curso, y `CREATE OR REPLACE VIEW` como "en produccion con PostgreSQL".

---

### [IMP-N7-02] Leccion 4 Soluciones — primera_sesion del cliente en EJ20 filtra campaign_id IS NOT NULL antes de ROW_NUMBER, sesgando el first-touch para clientes con primera sesion organica

**Archivo:** `modulos/nivel-07-bi/ejercicios-nivel-07.sql` y `modulos/nivel-07-bi/leccion-04.md`

**Componente:** Solucion del Ejercicio 20 (Revenue por campana con first-touch) y el patron de atribucion en Leccion 4 Secciones 2 y 3.

**Problema:** La CTE `primera_sesion` en la Solucion 20 aplica `WHERE ws.campaign_id IS NOT NULL` antes del ROW_NUMBER:

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
    WHERE ws.campaign_id IS NOT NULL  -- <- filtra ANTES del ROW_NUMBER
),
```

Para un cliente cuya primera sesion real fue organica (campaign_id IS NULL) pero cuya segunda sesion fue por una campana de email, la CTE excluye la sesion organica y asigna rn=1 a la sesion de email. El cliente queda atribuido a email cuando en realidad su primer contacto fue organico. Esto no es first-touch attribution — es "first paid-touch attribution".

El enunciado del EJ20 dice explicitamente "Solo clientes cuya primera sesion fue por campana (campaign_id no nulo)" — por lo tanto el comportamiento es intencional y documentado en ese ejercicio especifico.

El problema es que la Leccion 4 Seccion 2 presenta el patron de first-touch attribution sin este filtro (correcto), pero la Solucion 20 introduce el filtro sin explicar que esto cambia la semantica del modelo. Un estudiante que use la Solucion 20 como base para otros analisis puede no notar que esta calculando first-paid-touch, no first-touch.

**Impacto:** Pedagogico — el estudiante puede confundir los dos modelos. No hay un error que rompa la query.

**Correccion:** Agregar un comentario explicito en la Solucion 20 y en el enunciado del EJ20:

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
    WHERE ws.campaign_id IS NOT NULL
    -- NOTA: al filtrar campaign_id IS NOT NULL ANTES del ROW_NUMBER,
    -- estamos calculando "first PAID-touch attribution", no "first-touch" puro.
    -- Si la primera sesion real del cliente fue organica, ese cliente
    -- queda atribuido a su primer canal pagado, no a su primer contacto.
    -- El EJ25 (Integrador) usa el patron completo sin este filtro.
),
```

---

## Aspectos positivos

**Leccion 1 — Correcto:**
- El patron `COUNT(CASE WHEN condicion THEN 1 END)` esta bien explicado con las dos formas equivalentes (COUNT vs SUM) y la razon de preferir COUNT.
- `NULLIF(COUNT(*), 0)` en el denominador: presente en todas las tasas de conversion sin excepcion. La explicacion del por que es correcta ("si el grupo no tiene sesiones").
- `* 100.0` (con decimal): correctamente explicado como prevencion de division entera, con la nota de que ROUND no rescata un cociente ya truncado.
- El uso de `LEFT JOIN` con `COALESCE(mc.channel, 'organic')` para incluir sesiones organicas es pedagogicamente impecable — se explica antes del JOIN, no despues del error.
- Los cuatro errores comunes son todos reales, frecuentes, y las correcciones son correctas.

**Leccion 2 — Correcto:**
- El concepto de multiplicacion de filas por JOIN N:M entre sesiones y pedidos esta explicado con un ejemplo numerico concreto (10 sesiones x 3 pedidos = 30 filas) — exactamente como debe enseñarse.
- `COUNT DISTINCT` en session_id y order_id: aplicado en todos los puntos de la leccion sin excepcion.
- Las CTEs de periodo separadas para sesiones y pedidos es el patron correcto — explica bien por que el filtro de fechas debe aplicarse en ambas tablas.
- La advertencia sobre `converted = TRUE != pedido` (Error 3) es un concepto critico de BI que muy pocas lecciones de SQL explican.
- El analisis de sesiones previas al primer pedido (Query 3) usa correctamente `AND ws.started_at < pp.fecha_primer_pedido` como condicion de JOIN temporal.

**Leccion 3 — Correcto:**
- La comparacion CTE vs Vista en tabla (duracion, visibilidad, cuando usar) es un recurso pedagogico excelente.
- La advertencia sobre COUNT(*) vs COUNT DISTINCT al consultar `v_funnel_adquisicion` es correcta y esta bien ubicada.
- Error 4 (CREATE VIEW sin DROP en SQLite) correctamente documentado en la seccion de errores.
- La subquery escalar para `order_total` dentro de la vista es tecnicamente correcta.

**Leccion 4 — Correcto:**
- El patron ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY started_at ASC) para first-touch es la implementacion correcta.
- `COALESCE(SUM(rc.revenue), 0)` en el JOIN final de revenue por canal: correcto.
- La nota sobre la limitacion del modelo first-touch vs last-touch vs linear es honesta y pedagogicamente valiosa.
- `SUM(SUM(revenue_total)) OVER ()` explicado con claridad en la Seccion 2.
- El Ejercicio Integrador (EJ25 completo equivalente) incluye correctamente `COALESCE(co.canal, 'sin sesion')` para clientes sin ninguna sesion.

**Ejercicios — Correcto:**
- EJ04 usa `STRFTIME('%Y-%m', started_at)` — correcto para SQLite (no DATE_TRUNC).
- EJ24 usa `JULIANDAY()` para diferencia de dias — correcto para SQLite.
- EJ25 (Integrador) usa `STRFTIME('%Y-%m', ...)` y `DATE(..., '+1 month')` — correcto para SQLite.
- Bloque A (EJ01-06): todas las queries usan solo `website_sessions` y `marketing_campaigns` — tablas correctas para Nivel 7.
- Bloque B (EJ07-12): joins por customer_id con COUNT DISTINCT correctamente aplicado.
- Bloque C (EJ13-19): sintaxis SQLite correcta en todas las creaciones de vistas (DROP IF EXISTS + CREATE).
- Bloque D (EJ20-25): ROW_NUMBER para first-touch, CASE WHEN para segmentacion, NULLIF en todos los denominadores.
- La nota del archivo sobre dialecto SQLite al inicio del archivo de ejercicios es excelente practica.
- EJ09 correctamente indica que usa `orders.status` como proxy de pago y que el analisis real se hara con `payments` en Nivel 8.
- Solucion 24: el doble paso (primera_sesion_cliente → primera_sesion_ft con ROW_NUMBER) es correcto, aunque tiene un comentario que advierte del potencial problema de multiples campanas por cliente.

---

## Proxima revision recomendada

1. **BLOQUEANTE — aplicar antes de publicar:** Corregir CRIT-N7-01 (revenue_total inflado en v_clientes_perfil). Esta es la correccion mas urgente porque la vista se declara como infraestructura del Capstone.

2. **Antes de publicar:** Reorganizar la Seccion 2 de Leccion 3 para que el patron SQLite aparezca primero (IMP-N7-01).

3. **Opcional — mejora de claridad:** Agregar comentario en Solucion 20 sobre la distincion first-touch vs first-paid-touch (IMP-N7-02).

4. **Para el Capstone:** Verificar que todos los analisis que referencian `v_clientes_perfil.revenue_total` se ajusten a la version corregida de la vista.

5. **Nota tecnica para el sistema de ejercicios:** EJ13 y EJ16 (CREATE VIEW) requieren `validation_mode = "schema_match"` en el sistema de auto-correccion — no `exact_ordered`. Documentar en el archivo de configuracion del nivel.
