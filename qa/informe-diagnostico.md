# INFORME QA — LECCIÓN — Evaluación Diagnóstica v1.0

**Agente revisado:** `sql-teacher`
**Fecha de revisión:** 2026-05-31
**Archivo revisado:** `evaluaciones/diagnostico.md`
**Veredicto final:** ❌ REQUIERE CORRECCIONES

---

## RESUMEN EJECUTIVO

La evaluación diagnóstica está bien estructurada pedagógicamente: la progresión de niveles es lógica, el algoritmo de scoring es internamente coherente y las explicaciones son claras. Sin embargo, la respuesta modelo principal de la Pregunta 15 contiene un error crítico de schema que la hace sintácticamente inválida — referencia a una columna (`oi.customer_id`) que no existe en `order_items`. Este error debe corregirse antes de que el archivo sea usado, porque la respuesta "alternativa" (que es la correcta) está etiquetada de forma inversa.

---

## HALLAZGOS

---

### 🔴 CRÍTICO — Hallazgo #1

**Componente:** Pregunta 15 — Respuesta modelo principal (primera query del UNION)

**Problema:** La segunda parte del UNION referencia `oi.customer_id`, columna que no existe en `order_items`. El schema canónico de `order_items` es `(item_id, order_id, product_id, quantity, unit_price)`. Esta query falla en ejecución con el error: `column oi.customer_id does not exist`.

```sql
-- RESPUESTA MODELO PRINCIPAL — INCORRECTA
SELECT DISTINCT o.customer_id
FROM orders o
WHERE o.status = 'delivered'

UNION

SELECT DISTINCT oi.customer_id       -- ERROR: order_items no tiene customer_id
FROM order_items oi
INNER JOIN returns r ON r.order_id = oi.order_id
                     AND r.product_id = oi.product_id
WHERE r.status = 'approved';
```

**Impacto:** Un estudiante que copie la respuesta modelo para verificar su solución en el mini-editor recibirá un error de ejecución. Más grave aún: aprende que `order_items` tiene una columna `customer_id`, lo que es incorrecto.

**Corrección:** Invertir el orden de las respuestas: promover la "alternativa" como modelo principal y detallar la incorrecta como contraejemplo o eliminarla. La respuesta correcta es:

```sql
-- RESPUESTA MODELO CORRECTA
SELECT customer_id
FROM orders
WHERE status = 'delivered'

UNION

SELECT o.customer_id
FROM orders o
INNER JOIN returns r ON r.order_id = o.order_id
WHERE r.status = 'approved';
```

Esta versión es más simple, completamente correcta y pedagógicamente más clara que la original. El `DISTINCT` es redundante en ambas partes porque `UNION` (sin `ALL`) ya elimina duplicados — puede mantenerse por claridad o removerse.

---

### 🔴 CRÍTICO — Hallazgo #2

**Componente:** Schema del seed vs. schema canónico del curso — impacto en mini-editores

**Problema:** El seed data generado (`dataset/shopsphere-seed.sql`) usa un schema que difiere del schema canónico enseñado en el curso en múltiples columnas críticas. Si el mini-editor de la evaluación ejecuta contra el seed real, las siguientes preguntas tienen problemas de ejecución:

| Columna referenciada en la evaluación | Schema canónico | Schema del seed |
|---------------------------------------|-----------------|-----------------|
| `orders.ordered_at` (P9, P17, P19, P20) | `ordered_at TIMESTAMP` | `order_date DATE` |
| `customers.registered_at` (referencia implícita) | `registered_at DATE` | `signup_date DATE` |
| `returns.status` (P15) | columna existe | columna NO insertada en el seed |
| `returns.returned_at` | `returned_at DATE` | `return_date DATE` |

El impacto más grave es `orders.ordered_at` → `order_date` (afecta P9, P17, P19, P20) y la ausencia de `returns.status` (afecta P15).

**Impacto:** Las preguntas de mini-editor (P12, P15, P20) no ejecutan correctamente si el seed es la fuente de datos del mini-editor. El estudiante recibiría errores que no están relacionados con su nivel de SQL sino con inconsistencia entre el schema enseñado y el schema cargado.

**Corrección:** Hay dos rutas:
1. Hacer que el mini-editor ejecute contra el schema canónico del curso (con datos de ejemplo mínimos generados ad-hoc), no contra el seed de producción con su schema extendido.
2. Sincronizar el schema del seed con el schema canónico antes de finalizar el archivo de seed. Este es el ajuste de más alto impacto y se documenta con detalle en el Informe QA de Seed Data.

---

### 🟡 IMPORTANTE — Hallazgo #3

**Componente:** Pregunta 15 — Enunciado lista `order_items` como tabla disponible pero no es necesaria

**Problema:** El enunciado de P15 lista `orders`, `returns`, y `order_items` como tablas disponibles. La nota explicativa dice que "La segunda parte requiere pasar por `order_items` porque `returns` no tiene `customer_id`". Sin embargo, `returns` sí tiene `order_id`, y `orders` sí tiene `customer_id`. El JOIN directo `orders JOIN returns` es la ruta correcta y más simple. `order_items` no es necesaria.

```sql
-- Para obtener customer_id de returns, la ruta directa es:
FROM orders o
INNER JOIN returns r ON r.order_id = o.order_id
-- No se necesita order_items en absoluto
```

**Impacto:** La nota explicativa enseña una ruta innecesariamente compleja y técnicamente errónea. Un estudiante podría concluir que siempre necesita pasar por `order_items` para relacionar `returns` con `customers`, lo cual es una concepción incorrecta de las relaciones.

**Corrección:** Eliminar la mención de `order_items` de las tablas disponibles de P15 o reescribir la nota para aclarar que la ruta es `returns → orders → customers` (sin `order_items`):

> "La segunda parte requiere obtener el `customer_id` desde `returns`, que no lo tiene directamente. La ruta es: `returns.order_id → orders.order_id → orders.customer_id`. Se necesita un JOIN entre `returns` y `orders`."

---

### 🟡 IMPORTANTE — Hallazgo #4

**Componente:** Bloque E (Niveles 5-6) — Header de tablas disponibles inconsistente con las preguntas

**Problema:** El header del Bloque E declara como disponibles: `customers, products, categories, orders, order_items, returns, inventory` y en el bloque de schema también lista `marketing_campaigns`. Sin embargo, las preguntas 16 a 20 usan exclusivamente la tabla `orders`. El estudiante que lea el header podría esperar preguntas sobre `inventory` o `marketing_campaigns`, lo que puede generar confusión o sesgar su lectura de las preguntas.

**Impacto:** Confusión pedagógica menor. No es un error de SQL pero sí un ruido en la experiencia del estudiante durante la evaluación.

**Corrección:** Dos opciones:
1. Reemplazar la lista por: "Todas las tablas de Niveles 0-5 están disponibles. Estas preguntas se enfocan en `orders`."
2. Incorporar al menos una pregunta que use `inventory` o `marketing_campaigns` para dar uso real al contexto del bloque.

---

### 🟡 IMPORTANTE — Hallazgo #5

**Componente:** Pregunta 20 — Respuesta modelo: `LAG()` calculado tres veces

**Problema:** La respuesta modelo de P20 llama a `LAG(pedidos_mes) OVER (ORDER BY mes)` tres veces en la misma query: una para la columna `pedidos_mes_anterior`, dos veces dentro del cálculo de `pct_cambio`. Aunque PostgreSQL optimiza esto correctamente en la mayoría de los casos, es una práctica que dificulta la lectura y el mantenimiento:

```sql
-- Actual: LAG() repetido 3 veces (difícil de leer)
ROUND(
    (pedidos_mes - LAG(pedidos_mes) OVER (ORDER BY mes))::DECIMAL
    / NULLIF(LAG(pedidos_mes) OVER (ORDER BY mes), 0) * 100,
    2
) AS pct_cambio
```

**Impacto:** El estudiante aprende que repetir window functions en el mismo SELECT es la forma normal de hacer esto. No es un error, pero no es la forma más clara de escribirlo.

**Corrección:** La forma más legible (y lo que se debería enseñar como buena práctica) es usar el alias ya calculado mediante una segunda CTE o subquery:

```sql
WITH pedidos_mensuales AS (
    SELECT DATE_TRUNC('month', ordered_at) AS mes,
           COUNT(*) AS pedidos_mes
    FROM orders
    GROUP BY DATE_TRUNC('month', ordered_at)
),
con_anterior AS (
    SELECT mes,
           pedidos_mes,
           LAG(pedidos_mes) OVER (ORDER BY mes) AS pedidos_mes_anterior
    FROM pedidos_mensuales
)
SELECT mes,
       pedidos_mes,
       pedidos_mes_anterior,
       ROUND(
           (pedidos_mes - pedidos_mes_anterior)::DECIMAL
           / NULLIF(pedidos_mes_anterior, 0) * 100,
           2
       ) AS pct_cambio
FROM con_anterior
ORDER BY mes;
```

---

### 🔵 SUGERENCIA — Hallazgo #6

**Componente:** Pregunta 5 — Puntuación parcial para opción A

**Problema:** La evaluación acepta la opción A como "parcialmente correcta" (2 puntos sobre 4) por la distinción entre `>/<` y `BETWEEN` (inclusivo vs. exclusivo). Esta es una distinción válida, pero el documento la presenta con tres etiquetas distintas (`**Respuesta correcta:** D (tambien A...`, `**Respuesta correcta primaria:** D`, `**Respuesta alternativa aceptada:** A`) lo que puede confundir al implementador del sistema.

**Impacto:** Complejidad de implementación innecesaria en el sistema de scoring.

**Corrección:** Consolidar en un formato único:

```
Respuesta correcta (4 pts): D
Respuesta parcial (2 pts): A — correcta para el propósito práctico, pero BETWEEN incluye
                            los extremos (50 y 200), mientras que > y < los excluye.
Opciones incorrectas: B (OR en lugar de AND), C (error de sintaxis: dos cláusulas WHERE)
```

---

### 🔵 SUGERENCIA — Hallazgo #7

**Componente:** Pregunta 12 — Respuesta alternativa con GROUP BY por nombre

**Problema:** La respuesta alternativa aceptada dice: "Usar `p.product_id, c.category_id` en el GROUP BY en lugar de los nombres". Sin embargo, la respuesta modelo usa `GROUP BY p.name, c.name`. El GROUP BY por IDs es técnicamente más robusto (evita colisiones si dos productos tienen el mismo nombre) pero ambos son aceptados. El criterio de evaluación debería aclarar cuándo se prefiere uno sobre otro.

**Impacto:** Menor. El evaluador del mini-editor necesita saber que ambas son equivalentes para el caso de datos únicos.

**Corrección:** Agregar una nota:

> "Nota: GROUP BY p.product_id, c.category_id es más robusto si dos productos pudieran tener el mismo nombre. En este dataset los nombres son únicos, por lo que ambas formas son equivalentes."

---

## ASPECTOS POSITIVOS

- **Algoritmo de scoring bien calculado:** La suma de pesos por nivel (Niveles 0-8) totaliza exactamente 112 puntos, coincidiendo con la tabla declarada en el documento. No hay errores aritméticos.

- **Las 4 Reglas Especiales del algoritmo son pedagógicamente sólidas:** La Regla 2 (no saltar más de 2 niveles), la Regla 4 (80% en X AND 60% en X+1 para saltear) y el manejo del patrón de caída brusca son decisiones de diseño bien fundamentadas que evitan problemas clásicos de diagnósticos adaptativos.

- **P13: mención del riesgo de NULLs en NOT IN es valiosa:** Señalar que `NOT IN` puede comportarse inesperadamente cuando la subquery retorna NULLs es exactamente el tipo de matiz que diferencia un curso de calidad.

- **P11: explicación de COUNT(columna) vs. COUNT(*) con LEFT JOIN es correcta:** La aclaración de que `COUNT(p.product_id)` retorna 0 para categorías sin productos (porque cuenta solo no-NULLs) es técnicamente precisa.

- **P20: uso de NULLIF para división por cero está bien enseñado:** `NULLIF(denominador, 0)` es la práctica estándar en SQL para evitar divisiones por cero, y está aplicado correctamente.

- **Estructura de 6 bloques progresivos:** La organización de la evaluación refleja fielmente la progresión del curso (Niveles 0-8 + Capstone), lo que hace que el resultado del diagnóstico sea directamente accionable.

- **Mensajes de resultado al estudiante:** Los mensajes están calibrados con el tono correcto — no condescendientes para niveles bajos, orientados al valor del siguiente nivel para niveles medios y altos.

---

## PRÓXIMOS PASOS

**Bloqueantes (deben corregirse antes de usar el archivo):**

1. **Corregir P15 — Hallazgo #1 (CRÍTICO):** Promover la respuesta alternativa como respuesta modelo principal. Opcionalmente, eliminar la primera versión o convertirla en un ejemplo de "solución incorrecta" con su explicación.

2. **Resolver la discrepancia de schema mini-editor — Hallazgo #2 (CRÍTICO):** Definir si el mini-editor ejecuta contra el schema canónico del sistema-prompt o contra el schema del seed. Si es el schema del seed, actualizar `ordered_at → order_date` en todas las queries de la evaluación, e insertar `returns.status` en el seed o remover esa condición de P15.

**Importantes (deben corregirse antes del lanzamiento):**

3. **Corregir nota explicativa de P15 — Hallazgo #3:** Reescribir para eliminar la referencia a `order_items` como intermediario necesario.

4. **Ajustar header del Bloque E — Hallazgo #4:** Clarificar las tablas disponibles vs. las usadas en las preguntas del bloque.

5. **Mejorar respuesta modelo de P20 — Hallazgo #5:** Refactorizar usando segunda CTE para evitar LAG() repetido.

**Opcionales:**

6. Consolidar el formato de puntuación de P5 (Hallazgo #6).
7. Agregar nota sobre GROUP BY por ID vs. por nombre en P12 (Hallazgo #7).

---

*Informe generado: 2026-05-31*
*Revisado por: sql-data-analyst (Modo QA)*
*Próxima revisión recomendada: tras aplicar correcciones bloqueantes*
