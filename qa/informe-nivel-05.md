# INFORME QA — LECCIÓN — Nivel 5: CTEs y Window Functions
**Agente revisado:** `sql-teacher`
**Fecha de revisión:** 2026-06-01
**Veredicto final:** APROBADO CON OBSERVACIONES

---

## RESUMEN EJECUTIVO

El Nivel 5 es el nivel técnicamente más sólido revisado hasta ahora. Las cuatro lecciones tienen los 7 pasos pedagógicos completos, las CTEs y Window Functions están explicadas con corrección técnica, el uso de `LAST_VALUE` incluye el marco explícito requerido, y las tablas usadas corresponden al nivel correcto en la totalidad del material. Se detectan 2 hallazgos IMPORTANTES y 4 SUGERENCIAS — no hay ningún hallazgo CRÍTICO. La solución 03 contiene el único punto que requiere atención antes de publicar: usa `COUNT(return_id)` en lugar de `SUM(quantity)` para calcular unidades devueltas, produciendo un resultado semánticamente incorrecto cuando un return cubre múltiples unidades del mismo ítem.

---

## HALLAZGOS

---

### IMPORTANTE — Hallazgo #1

**Componente:** `ejercicios-nivel-05.sql` — Solución 03, CTE `unidades_devueltas`

**Problema:** La CTE `unidades_devueltas` usa `COUNT(r.return_id)` para calcular el número de unidades devueltas por categoría:

```sql
unidades_devueltas AS (
    SELECT
        cat.name            AS categoria,
        COUNT(r.return_id)  AS unidades_devueltas  -- cuenta devoluciones, no unidades
    FROM returns r
    INNER JOIN order_items oi ON oi.order_id   = r.order_id
                              AND oi.product_id = r.product_id
    ...
)
```

`COUNT(r.return_id)` cuenta el número de registros de devolución, no las unidades físicas devueltas. Si un pedido tiene 3 unidades de un producto y se devuelven las 3, esto se cuenta como 1 devolución, no como 3 unidades. La CTE `unidades_vendidas` usa correctamente `SUM(oi.quantity)` — hay asimetría en la definición de la métrica.

**Impacto:** El ratio `unidades_devueltas / unidades_vendidas` es semánticamente incorrecto cuando los items de devolución tienen `quantity > 1`. En ese caso el denominador incluye todas las unidades vendidas y el numerador solo cuenta eventos de devolución. El porcentaje resultante subestima la tasa de devolución real. El estudiante aprende a calcular el ratio de devolución con una fórmula que parece razonable pero produce un número que no es lo que el enunciado describe.

**Corrección:**

```sql
unidades_devueltas AS (
    SELECT
        cat.name                AS categoria,
        SUM(oi.quantity)        AS unidades_devueltas  -- suma unidades, no eventos
    FROM returns r
    INNER JOIN order_items oi ON oi.order_id   = r.order_id
                              AND oi.product_id = r.product_id
    INNER JOIN products    p  ON p.product_id   = oi.product_id
    INNER JOIN categories  cat ON cat.category_id = p.category_id
    GROUP BY cat.name
)
```

**Nota adicional:** El schema de `returns` no tiene columna de cantidad devuelta — la mejor aproximación disponible con el schema canónico de ShopSphere es `SUM(oi.quantity)` del `order_item` correspondiente. Esto asume que se devuelve la totalidad del ítem pedido, lo cual es la misma asunción del Nivel 4. Si el teacher quiere documentar la limitación, puede añadir un comentario explicando por qué `SUM(oi.quantity)` es la métrica disponible más precisa con el schema actual.

---

### IMPORTANTE — Hallazgo #2

**Componente:** `ejercicios-nivel-05.sql` — Solución 21, filtro de fecha de registro

**Problema:** El enunciado del Ejercicio 21 especifica clientes registrados entre `2025-06-01` y `2026-05-31` ("últimos 12 meses"). La solución usa:

```sql
WHERE c.registered_at  >= '2025-06-01'
  AND c.registered_at  <  '2026-06-01'
```

El límite superior es `< '2026-06-01'`, que excluye correctamente el 1 de junio de 2026. Sin embargo, el enunciado dice "2026-05-31" como fecha límite — la traducción a SQL `< '2026-06-01'` es técnicamente equivalente para una columna `DATE` (el campo `registered_at` es `DATE` en el schema canónico), pero si el campo fuera `TIMESTAMP`, `< '2026-06-01'` excluiría registros del 1 de junio mientras que `<= '2026-05-31'` los excluiría también de manera más explícita. El patrón es correcto para `DATE`, pero no hay un comentario que explique por qué se usa `< fecha_siguiente` en lugar de `<= fecha_límite`.

**Impacto pedagógico:** El estudiante aprende el patrón `>= fecha_inicio AND < fecha_siguiente` sin entender por qué. En el Nivel 4 (L4) este patrón se enseñó explícitamente para columnas TIMESTAMP. En el Nivel 5 la solución lo aplica silenciosamente a una columna DATE sin el comentario pedagógico. Es una oportunidad perdida de reforzar el patrón.

**Corrección:** Añadir un comentario en la solución:

```sql
WHERE c.registered_at  >= '2025-06-01'
  AND c.registered_at  <  '2026-06-01'  -- equivale a <= '2026-05-31' para columna DATE;
                                         -- usar < fecha_siguiente es más seguro si el tipo
                                         -- fuera TIMESTAMP (evita perder las 23:59:59 del último día)
```

---

### SUGERENCIA — Hallazgo #3

**Componente:** `leccion-02.md` — Ejemplo práctico, Query 1 ("Base case solo: listar las categorías raíz")

**Problema:** El título de la Query 1 dice "Solo el base case" pero la query ya incluye el recursive case completo:

```sql
WITH RECURSIVE arbol_categorias AS (
    -- Solo el base case: categorías sin padre (las raíces)
    ...
    UNION ALL
    -- Recursive case: todavía vacío para verificar el base case
    SELECT
        c.category_id,
        ...
    FROM categories c
    INNER JOIN arbol_categorias ac ON c.parent_id = ac.category_id
)
```

El comentario "Recursive case: todavía vacío para verificar el base case" es contradictorio: el recursive case tiene código completo y funcional. El texto introductorio dice "Antes de añadir la recursión, verificamos que el base case funciona" pero la query mostrada ya incluye la recursión completa.

**Impacto:** El estudiante lee "solo el base case" y ve una query completa con recursión. El output de 10 filas (árbol completo, 3 niveles) confirma que la recursión sí ejecutó. Hay una desconexión entre lo que el texto promete mostrar y lo que muestra. Pedagogicamente sería más claro mostrar primero solo el base case (que retorna 2 filas: Tecnología y Hogar) y luego la query completa.

**Corrección sugerida:** Separar en dos queries claramente diferenciadas:

```sql
-- QUERY 1a: Solo el base case (para verificar el punto de partida)
WITH RECURSIVE arbol_categorias AS (
    SELECT category_id, name, parent_id, 1 AS nivel, name AS ruta
    FROM categories
    WHERE parent_id IS NULL
    UNION ALL
    SELECT c.category_id, c.name, c.parent_id, ac.nivel + 1, ac.ruta || ' > ' || c.name
    FROM categories c
    INNER JOIN arbol_categorias ac ON c.parent_id = ac.category_id
    WHERE 1 = 0  -- recursive case desactivado intencionalmente
)
SELECT * FROM arbol_categorias ORDER BY ruta;
```

O simplemente renombrar la query como "Árbol completo (base case + recursive case)" y actualizar el texto introductorio para que no prometa mostrar solo el base case.

---

### SUGERENCIA — Hallazgo #4

**Componente:** `leccion-04.md` — Query 2 (FIRST_VALUE y LAST_VALUE sobre inventory)

**Problema:** La query usa FIRST_VALUE y LAST_VALUE sobre la tabla `inventory` del schema canónico, pero el schema tiene **un solo registro por producto** (no múltiples snapshots históricos). La propia lección lo reconoce en una nota al pie:

> "Nota sobre la estructura: si el schema tiene un registro por producto en `inventory` (solo el estado actual), `FIRST_VALUE` y `LAST_VALUE` darían el mismo resultado."

Esta nota invalida el propósito pedagógico de la query: si FIRST_VALUE y LAST_VALUE devuelven el mismo valor para todos los productos (porque hay un solo registro por producto), el estudiante no puede ver la diferencia entre ambas funciones sobre datos reales.

**Impacto:** El estudiante ejecuta la query con datos reales y obtiene `stock_inicial = stock_actual` y `consumo_historico = 0` para todos los productos — lo cual no ilustra nada. La nota al pie lo admite pero no ofrece alternativa ejecutable.

**Corrección sugerida:** Reemplazar esta query por una que use datos donde FIRST_VALUE y LAST_VALUE tienen sentido real con el schema actual. Por ejemplo, el stock mínimo histórico por categoría usando los registros de `inventory` agrupados por categoría, o usar orders por fecha para ilustrar "primer pedido vs. último pedido" por cliente:

```sql
-- Alternativa ejecutable: primer y último pedido por cliente
SELECT
    c.first_name || ' ' || c.last_name  AS cliente,
    o.order_id,
    o.ordered_at,
    FIRST_VALUE(o.ordered_at) OVER (
        PARTITION BY o.customer_id
        ORDER BY o.ordered_at ASC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    )                                   AS fecha_primer_pedido,
    LAST_VALUE(o.ordered_at) OVER (
        PARTITION BY o.customer_id
        ORDER BY o.ordered_at ASC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    )                                   AS fecha_ultimo_pedido
FROM orders o
INNER JOIN customers c ON c.customer_id = o.customer_id
ORDER BY c.last_name, o.ordered_at;
```

Esta alternativa produce resultados visiblemente distintos en FIRST_VALUE vs LAST_VALUE para todos los clientes con más de un pedido.

---

### SUGERENCIA — Hallazgo #5

**Componente:** `leccion-03.md` — Tabla comparativa RANK vs DENSE_RANK

**Problema:** La tabla comparativa muestra 4 clientes con sus valores de ROW_NUMBER, RANK y DENSE_RANK:

| Datos | ROW_NUMBER() | RANK() | DENSE_RANK() |
|---|---|---|---|
| Cliente A — $1.200 | 1 | 1 | 1 |
| Cliente B — $1.200 | 2 | 1 | 1 |
| Cliente C — $900 | 3 | 3 | 2 |
| Cliente D — $750 | 4 | 4 | 3 |

Los valores son correctos. Sin embargo, la tabla usa "Cliente A", "Cliente B" (nombres genéricos) en lugar de los personajes de ShopSphere que aparecen en todos los demás ejemplos del curso. Esto rompe la coherencia narrativa que el course ha establecido consistentemente.

**Impacto:** Menor — no afecta la corrección técnica. Rompe la inmersión narrativa del curso que usa personajes consistentes (Diego, Valentina, Marco, Sofía, Ana).

**Corrección sugerida:** Reemplazar con nombres del universo ShopSphere:
- Cliente A → Ana García — $1.200
- Cliente B → Ana López — $1.200
- etc.

O usar datos del contexto del ejemplo que sigue (el ranking de productos por categoría).

---

### SUGERENCIA — Hallazgo #6

**Componente:** `ejercicios-nivel-05.sql` — Bloque de ejercicios en general

**Problema:** Los ejercicios 1-6 (Bloque A), 11-18 (Bloque C) y 19-25 (Bloque D) tienen enunciados en el archivo de ejercicios, y también tienen enunciados en las lecciones (como "Ejercicio Básico" y "Ejercicio Intermedio"). El Ejercicio 01 del archivo de ejercicios es idéntico al "Ejercicio Básico" de la Lección 1. El Ejercicio 12 del archivo es idéntico al "Ejercicio Básico" de la Lección 3. Esto es coherente y es una buena práctica pedagógica.

Sin embargo, los briefings referenciados en los enunciados de los ejercicios (Briefing 5.1, 5.2, etc.) no tienen un documento de referencia visible. El estudiante que llegue al archivo de ejercicios sin haber leído las lecciones no sabrá qué es el "Briefing 5.1".

**Corrección sugerida:** Añadir en el encabezado del archivo una línea que indique: "Los briefings referenciados (5.1, 5.2, etc.) corresponden a los contextos narrativos descritos en las lecciones 1-4 de este nivel." Esto no requiere crear un documento nuevo — solo una línea de aclaración al inicio del archivo.

---

## ASPECTOS POSITIVOS

**1. Uso de tablas — sin ningún error de nivel:** Este es el primer nivel que pasa el chequeo de desbloqueo al 100% en todas las lecciones y todos los ejercicios. Ninguna tabla fuera del schema del Nivel 5 aparece en código ejecutable. El Bloque B documenta explícitamente la tabla auxiliar `categories_jerarquia` con sus CREATE TABLE e INSERT completos, y aclara que es una extensión temporal — exactamente lo que se necesita para CTEs recursivas.

**2. LAST_VALUE con marco explícito:** La trampa de `LAST_VALUE` sin `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` está documentada en la Lección 4 tanto en la sección de Sintaxis como en Errores Comunes (Error 1). El ejemplo de la Lección 4 usa el marco correcto en todos los usos de `LAST_VALUE`. Esto es una corrección proactiva del error más frecuente con esta función.

**3. NULLIF en divisiones:** Todos los cálculos de ratios y divisiones en el material usan `NULLIF` en el denominador de forma consistente. No hay ninguna división desprotegida en las 4 lecciones ni en las 25 soluciones de ejercicios. Patrón de seguridad bien establecido.

**4. Patrón CTE + Window Function para filtrar por alias:** El error "no puedes filtrar por alias de window function en el mismo nivel" está explicado correctamente en la Lección 3 (Error 1) y todas las soluciones que requieren filtrar por el resultado de una window function lo hacen correctamente envolviendo en CTE. Las soluciones 12, 13, 14, 15, 16 siguen este patrón sin excepciones.

**5. Protección contra NULLs en NOT IN:** En la Lección 2 (Ejercicio Intermedio, solución) el NOT IN incluye `WHERE parent_id IS NOT NULL` como protección explícita. El comentario que explica la razón está presente. Este es el mismo patrón crítico que se detectó como error en el Nivel 4 — aquí está correctamente implementado.

**6. Los 7 pasos pedagógicos completos en las 4 lecciones:** Todas las lecciones tienen: Introducción Conceptual, Sintaxis, Ejemplo Práctico, Casos de Uso Reales, Ejercicio Propuesto, Errores Comunes y Conexión con el Tema Siguiente. La Conexión con el Tema Siguiente es especialmente buena en la Lección 2 (transición de CTEs a Window Functions) y en la Lección 3 (transición de ranking a análisis temporal).

**7. Soluciones del ejercicio integrador 25:** Las tres partes del ejercicio 25 (MoM, Top 3, cruce de cuartiles) están correctas. La Parte C en particular es elegante: usa dos `NTILE(4)` en el mismo `SELECT` con órdenes diferentes (stock ASC para cuartil de stock, revenue DESC para cuartil de revenue) y filtra donde ambos son 1. La lógica de negocio del "producto urgente e importante" está correctamente implementada.

**8. COALESCE en el cruce inventory/ventas:** En la Solución 20, el LEFT JOIN entre inventory y ventas_diarias usa `COALESCE` para tratar productos sin ventas en los últimos 90 días como si tuvieran ventas_diarias_prom = 0. Esto es correctísimo — sin este COALESCE, esos productos quedarían excluidos del ranking de urgencia, siendo que un producto con ventas históricas pero sin ventas recientes puede ser igualmente urgente.

---

## PRÓXIMOS PASOS

### Correcciones bloqueantes (antes de publicar)

1. **[IMP-14] Solución 03 — COUNT vs SUM en unidades_devueltas:** Reemplazar `COUNT(r.return_id)` por `SUM(oi.quantity)` en la CTE `unidades_devueltas`. Añadir comentario explicando la aproximación usada dado el schema de `returns`.

2. **[IMP-15] Solución 21 — Comentario pedagógico ausente en filtro de fecha:** Añadir comentario explicando el patrón `< fecha_siguiente` vs `<= fecha_límite` y cuándo importa la diferencia.

### Mejoras opcionales (no bloqueantes)

3. **[SUG-N5-01] Lección 2, Query 1 — Título contradictorio:** Renombrar "Solo el base case" a "Árbol completo" o ajustar el código para que sea realmente solo el base case. Actualizar el texto introductorio en consecuencia.

4. **[SUG-N5-02] Lección 4, Query 2 — FIRST_VALUE/LAST_VALUE sobre schema incompatible:** Reemplazar la query de inventory (un registro por producto) con una query que produzca resultados visiblemente distintos en FIRST_VALUE vs LAST_VALUE. La alternativa de primer/último pedido por cliente es ejecutable con el schema canónico.

5. **[SUG-N5-03] Lección 3, tabla comparativa — Nombres genéricos:** Reemplazar "Cliente A/B/C/D" con personajes del universo ShopSphere para mantener la coherencia narrativa del curso.

6. **[SUG-N5-04] Archivo de ejercicios — Aclaración de briefings:** Añadir una línea en el encabezado del archivo explicando que los briefings 5.1-5.12 corresponden a los contextos narrativos de las lecciones 1-4.

---

## NOTA SOBRE EL DIALECTO SQL

Confirmado desde la memoria del proyecto: hay una alerta previa sobre `INTERVAL '90 days'` y `DATE_TRUNC` en el Nivel 5 que no son disponibles en SQLite. Las soluciones del Nivel 5 usan:
- `CURRENT_DATE - INTERVAL '90 days'` (Soluciones 05 y 20) — PostgreSQL/MySQL, no SQLite
- `DATE_TRUNC('month', ...)` (Soluciones 19, 23, 25A) — PostgreSQL, no SQLite ni MySQL
- `o.ordered_at >= '2026-01-01'` con columna TIMESTAMP — portable

Esta alerta ya está registrada en la memoria del proyecto como alerta crítica del Nivel 5 (pre-existente a esta revisión). No se cataloga como nuevo hallazgo, pero se confirma que los archivos del Nivel 5 efectivamente usan ambas sintaxis. El teacher debe decidir el dialecto del curso antes de publicar este nivel.
