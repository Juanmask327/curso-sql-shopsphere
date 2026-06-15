# Informe QA — Capstone: Proyecto Final Integrador
**Fecha:** 2026-06-02
**Generado por:** sql-data-analyst (Modo QA)
**Archivos revisados:**
- `modulos/capstone/README.md`
- `modulos/capstone/parte-01-exploracion.sql`
- `contenido/capstone-brief.md`
- `qa/informe-nivel-07.md` (referencia: estado de v_clientes_perfil)
- `dataset/expected-results-capstone-template.json` (solo template — sin expected results reales)

---

## Veredicto General

**APROBADO CON OBSERVACIONES**

El Capstone está bien estructurado como proyecto integrador. El brief de Valentina establece claramente el objetivo y el alcance, los ejercicios de la Parte 1 son técnicamente correctos, y las soluciones están bien comentadas. No hay hallazgos CRÍTICOS de SQL incorrecto. Se registran tres hallazgos IMPORTANTES, de los cuales uno tiene implicaciones directas sobre la corrección del análisis, y cuatro SUGERENCIAS.

El hallazgo más relevante es de tipo arquitectónico: el Capstone hereda un schema de tablas parcialmente inconsistente con el schema canónico del curso (columnas extra en `customers`, `products`, `orders`, `payments`), y esta inconsistencia es visible en el `README.md` del Capstone. Si el dataset real usa el schema canónico, los ejercicios que referencian columnas extras (como `customers.segment`, `orders.total_amount`, `payments.country`) fallarán en ejecución.

---

## Resumen de Hallazgos

| ID | Severidad | Archivo | Descripción breve |
|---|---|---|---|
| IMP-CAP-01 | IMPORTANTE | README.md | Schema documentado en el Capstone tiene columnas que no existen en el schema canónico del curso |
| IMP-CAP-02 | IMPORTANTE | README.md | payments.method y returns.status usan valores distintos al schema canónico |
| IMP-CAP-03 | IMPORTANTE | capstone-brief.md | Pregunta 2 pide segmentación por LTV pero no referencia payments — con solo orders/order_items el revenue está mal calculado para clientes con pagos fallidos |
| SUG-CAP-01 | SUGERENCIA | README.md | El schema del README omite columnas canónicas importantes (products.is_active, inventory.updated_at) |
| SUG-CAP-02 | SUGERENCIA | parte-01-exploracion.sql | EJ01: el período H1 2026 para devoluciones usa returns.returned_at pero la CTE no está alineada con el período de payments (ambos deberían cubrir el mismo H1) |
| SUG-CAP-03 | SUGERENCIA | parte-01-exploracion.sql | EJ03: la tasa de devolución por país mezcla denominadores (pedidos de payments vs retorns de returns) sin documentar el desfase temporal entre ambas tablas |
| SUG-CAP-04 | SUGERENCIA | capstone-brief.md | La Pregunta 5 (cohorte Q3 2025) asume que el dataset tiene suficientes pedidos de octubre-diciembre 2025 para calcular retención — verificar contra el seed real |

---

## Hallazgos Detallados

---

### [IMP-CAP-01] — Hallazgo #1

**Componente:** `modulos/capstone/README.md`, Sección "Esquema completo disponible"

**Problema:** El schema documentado en el README del Capstone contiene columnas que no existen en el schema canónico del curso:

| Tabla | Columnas en README del Capstone | Estado en schema canónico |
|---|---|---|
| `customers` | `name`, `segment` | No existen. El schema canónico tiene `first_name`, `last_name`, sin `segment` |
| `products` | `cost`, `sku`, `stock` | No existen. El schema canónico tiene solo `product_id`, `name`, `category_id`, `price`, `is_active` |
| `orders` | `total_amount`, `country` | No existen. El schema canónico tiene `order_id`, `customer_id`, `ordered_at`, `status` |
| `categories` | `parent_id` | No existe. El schema canónico tiene solo `category_id`, `name`, `description` |
| `payments` | `country` | No existe. El schema canónico no tiene `country` en `payments` |
| `website_sessions` | `ended_at` | No existe. El schema canónico no tiene `ended_at` en `website_sessions` |

Adicionalmente, el README usa `name` en `customers` (columna única) cuando el schema canónico tiene `first_name` y `last_name` separadas.

**Impacto:** Si el Capstone se ejecuta contra el dataset real del curso (que sigue el schema canónico), cualquier ejercicio que referencie `customers.name`, `customers.segment`, `orders.country`, `orders.total_amount`, `products.cost`, `payments.country` o `categories.parent_id` fallará con "no such column". El README es la referencia que el estudiante usa para escribir sus queries — si el schema que documenta no coincide con el dataset real, el estudiante tendrá errores de ejecución que no podrá diagnosticar.

**Contexto de las memorias del proyecto:** Existe un registro en la memoria de agente sobre esta divergencia. El seed data generado originalmente (2026-05-31) usó un schema extendido con estas columnas extras. El informe de seed validación y el informe de niveles 1-2 documentaron esta inconsistencia. El Capstone fue escrito con el schema extendido, no con el schema canónico del curso.

**Corrección — Dos opciones:**

**Opción A (recomendada):** Actualizar el README del Capstone para que el schema documentado corresponda al schema canónico del curso:

```sql
customers   (customer_id, first_name, last_name, email, city, country, registered_at)
categories  (category_id, name, description)
products    (product_id, name, category_id, price, is_active)
orders      (order_id, customer_id, ordered_at, status)
order_items (item_id, order_id, product_id, quantity, unit_price)
returns     (return_id, order_id, product_id, returned_at, reason, status)
inventory   (inventory_id, product_id, stock, updated_at)
marketing_campaigns (campaign_id, name, channel, started_at, ended_at, budget, spent)
website_sessions (session_id, customer_id, campaign_id, started_at, pages_viewed, converted, device_type)
payments    (payment_id, order_id, method, status, amount, paid_at)
```

**Opción B:** Si el dataset real fue actualizado para incluir las columnas extras del README (segment, cost, parent_id, etc.), entonces el schema canónico del curso debe actualizarse para reflejar esas columnas y todos los niveles anteriores deben revisarse para consistencia.

---

### [IMP-CAP-02] — Hallazgo #2

**Componente:** `modulos/capstone/README.md`, Sección "Esquema completo disponible", definiciones de `payments` y `returns`

**Problema:** El schema de `payments` en el README lista los métodos y status:

```
payments (payment_id, order_id, method, status, amount, paid_at, country)
         -- method: 'credit_card','debit_card','transfer','cash'
         -- status: 'completed','failed','pending','refunded'
```

El schema canónico define:
```sql
method VARCHAR(50) CHECK (method IN ('credit_card','paypal','bank_transfer','crypto'))
```

Los métodos del README (`'debit_card'`, `'transfer'`, `'cash'`) no coinciden con los del schema canónico (`'paypal'`, `'bank_transfer'`, `'crypto'`). Esta es la misma discrepancia detectada en IMP-N8-01 para la Lección 1 del Nivel 8.

Adicionalmente, el README de `returns` documenta:
```
returns (..., status)
        -- status: 'pending','approved','rejected'
```

El schema canónico define:
```sql
status VARCHAR(20) CHECK (status IN ('pending','approved','rejected','refunded'))
```

El valor `'refunded'` está ausente en la documentación del README, aunque el status existe en el schema y es referenciado en varios ejercicios del Capstone (incluyendo la Solución EJ04 del parte-01-exploracion.sql: `WHERE r.status = 'approved'`).

**Impacto:** Los ejercicios del Capstone que analicen pagos por método (como la Pregunta 7 del capstone-brief.md: "anomalía Chile por método de pago") producirán resultados con métodos inesperados si el estudiante asume `'debit_card'` y `'cash'` de los docs pero el dataset tiene `'paypal'` y `'crypto'`.

**Corrección:** Actualizar el README para usar los métodos canónicos y agregar `'refunded'` a los status de `returns`.

---

### [IMP-CAP-03] — Hallazgo #3

**Componente:** `contenido/capstone-brief.md`, Sección 1 "La base del negocio", Pregunta 2

**Problema:** La Pregunta 2 del brief pide segmentar la base de clientes en cuatro niveles de valor:

> "sin compras / ocasional / recurrente / alto valor. Para cada segmento: cantidad de clientes, revenue total, porcentaje sobre el revenue total de la empresa."

El brief no especifica cómo calcular el "revenue" del cliente para esta segmentación. Si el estudiante usa `order_items` (revenue facturado) en lugar de `payments` (revenue cobrado), obtendrá el revenue bruto facturado incluyendo pedidos con pagos fallidos o pendientes — no el revenue real cobrado.

Esta ambigüedad es funcionalmente relevante porque:
1. El resto del Capstone define "revenue neto real" usando `payments` como fuente de verdad (introducida en Nivel 8).
2. Un análisis de segmentación de clientes por valor que use `order_items` es incoherente con un informe de revenue neto que use `payments`.

Adicionalmente, el README del Capstone en la Parte 02 "Clientes y retención" menciona: "cohortes, segmentación RFM, LTV, churn y análisis Pareto" con "técnicas: NTILE, ventanas temporales con LAG, subqueries para denominadores fijos". Si se usa NTILE sobre el revenue de `order_items`, la segmentación puede diferir de la misma segmentación hecha sobre el revenue de `payments`. El análisis resultante puede ser internamente inconsistente.

**Impacto:** Pedagógico y analítico. Un estudiante avanzado usará `payments` (correcto); un estudiante menos avanzado usará `order_items` (sub-óptimo). La coherencia interna del informe puede verse afectada si la misma métrica se calcula de forma distinta en distintas partes.

**Corrección:** Agregar una nota explícita en el brief de la Pregunta 2:

> "Para segmentar por valor, usa el revenue cobrado: suma de `payments.amount` donde `status = 'completed'`, navegando `payments → orders` para obtener el `customer_id`. Esto es consistente con el revenue neto calculado en la Pregunta 1."

---

## Hallazgos — SUGERENCIAS

---

### [SUG-CAP-01] — Hallazgo #4

**Componente:** `modulos/capstone/README.md`, Sección "Esquema completo disponible"

**Problema:** El README omite algunas columnas canónicas que son relevantes para los ejercicios del Capstone:
- `products.is_active` — relevante para filtrar productos activos vs inactivos
- `inventory.updated_at` — relevante para análisis de stock crítico
- `returns.product_id` — relevante para joins en el análisis de devoluciones por producto
- `website_sessions.pages_viewed` — mencionado en el schema canónico pero ausente en el README

**Sugerencia:** Completar el schema del README con todas las columnas canónicas relevantes para el Capstone, una vez resuelta la discrepancia principal de IMP-CAP-01.

---

### [SUG-CAP-02] — Hallazgo #5

**Componente:** `modulos/capstone/parte-01-exploracion.sql`, EJ01 (Resumen ejecutivo H1 2026)

**Problema:** En el EJ01, las tres CTEs usan períodos definidos como:
- `pedidos_h1`: `ordered_at >= '2026-01-01' AND ordered_at < '2026-07-01'`
- `pagos_h1`: `paid_at >= '2026-01-01' AND paid_at < '2026-07-01'`
- `devoluciones_h1`: `returned_at >= '2026-01-01' AND returned_at < '2026-07-01'`

Cada CTE usa su propia columna de fecha. Esto es correcto — cada tabla tiene su propio timestamp de evento y usar la fecha del evento propio es la práctica correcta. Sin embargo, el enunciado no documenta explícitamente esta decisión analítica.

En particular, hay un desfase temporal potencial que merece mención: un pedido creado el 15 de enero (ordenado en H1) puede tener su pago procesado el 17 de enero (también en H1) — pero si el pago se procesa el 2 de julio (fuera de H1), ese pago no entrará en el revenue_neto de H1. Esta diferencia entre "pedidos de H1" y "pagos procesados en H1" puede generar una discrepancia entre `total_pedidos` y el revenue neto del mismo período.

El comentario en la CTE `pagos_h1` menciona "Pagos procesados en H1 2026 (por fecha efectiva de pago)" — esta documentación existe y es correcta. La sugerencia es hacerla más visible en el enunciado del ejercicio.

**Sugerencia:** Agregar en el enunciado o en el comentario de la solución una nota de negocio explicando que `total_pedidos` y `revenue_neto` pueden diferir porque el primero filtra por fecha del pedido y el segundo por fecha del pago.

---

### [SUG-CAP-03] — Hallazgo #6

**Componente:** `modulos/capstone/parte-01-exploracion.sql`, EJ03 (Top 5 países por revenue neto)

**Problema:** El EJ03 calcula `tasa_devolucion_pct` como:

```sql
ROUND(
    COALESCE(dp.devoluciones_aprobadas, 0) * 100.0
    / NULLIF(pp.pedidos, 0),
    2
) AS tasa_devolucion_pct
```

Donde `pp.pedidos` es `COUNT(DISTINCT p.order_id)` de `payments` (pedidos con al menos un intento de pago en H1) y `dp.devoluciones_aprobadas` es el conteo de returns de `returns` (con `returned_at` en H1).

Los dos denominadores usan criterios distintos: "pedidos con pago en H1" vs "devoluciones con returned_at en H1". Un pedido creado en diciembre 2025 que tiene su devolución en enero 2026 aparece en el numerador de H1 pero no en el denominador (que cuenta pedidos con paid_at en H1, no ordered_at). Esto puede inflar la tasa si las devoluciones de períodos anteriores se procesan con retraso.

La solución de la Solución EJ03 no documenta este desfase potencial.

**Sugerencia:** Agregar un comentario en la Solución EJ03 que documente este desfase:

```sql
-- NOTA: 'pedidos' cuenta order_ids con al menos un intento de pago en H1 2026.
-- 'devoluciones_aprobadas' cuenta returns procesados en H1 2026 (por returned_at).
-- El desfase entre ordered_at, paid_at y returned_at puede afectar la tasa
-- en períodos cortos. Para una tasa más precisa, alinear todos los períodos
-- por ordered_at o aceptar este desfase como un proxy razonable.
```

---

### [SUG-CAP-04] — Hallazgo #7

**Componente:** `contenido/capstone-brief.md`, Sección 3 "Retención y ciclo de vida", Pregunta 5

**Problema:** La Pregunta 5 pide la cohorte de clientes con primera compra en Q3 2025 (julio–septiembre) y su retención mensual en los tres meses siguientes (octubre, noviembre, diciembre 2025). Según los metadatos del seed registrados en la memoria del agente, el dataset real del seed cubre datos hasta `2024-12-01` (18 meses desde `2023-06-01`). Sin datos de 2025, no hay clientes con primera compra en Q3 2025 ni actividad de retención de octubre a diciembre 2025.

Sin embargo, los briefings del Nivel 8 y las lecciones hablan de "Q1 2026", "marzo-abril 2026", y el EJ01 del Capstone cubre H1 2026. Esto sugiere que el seed fue actualizado (o generado con un rango extendido) para cubrir 2025-2026. El seed transaccional (`shopsphere-seed-transaccional.sql`) puede contener datos de 2025-2026 que extienden el seed base.

**Sugerencia:** Verificar contra el seed real que existe actividad en julio-septiembre 2025 (primera compra) y en octubre-diciembre 2025 (retención) antes de publicar el Capstone. Si el seed real no cubre esos meses, la Pregunta 5 debe ajustar el período a la cohorte más reciente disponible en los datos.

---

## Verificaciones de Corrección Técnica — Capstone

### README.md — Estructura pedagógica

**Objetivo del Capstone claramente definido:** El README establece explícitamente que el Capstone "integra todo lo aprendido" y que el entregable tiene tres componentes (query, resultado, interpretación). La instrucción de que "un número sin interpretación no es análisis" es la frase clave del brief y está bien ubicada.

**Cinco partes bien diferenciadas:** Las cinco partes tienen objetivos distintos, técnicas señaladas y estimación de tiempo. La progresión (Exploración → Clientes → Marketing → Operaciones → Dashboard) es lógica y coherente con el orden en que las técnicas se enseñaron en el curso.

**Criterios de evaluación explícitos y correctos:** Los tres ejes (corrección técnica 40%, claridad del código 30%, interpretación de negocio 30%) son apropiados para el nivel y el contexto del proyecto. Los criterios de corrección técnica son todos válidos.

### capstone-brief.md — Preguntas de negocio

**Las ocho preguntas están bien formuladas:** Cada pregunta tiene un objetivo de negocio claro, una fuente de datos implícita, y un criterio de éxito narrativo. Las preguntas no son ambiguas en cuanto a qué tablas usar (excepto la Pregunta 2 señalada en IMP-CAP-03).

**Pregunta 7 (anomalía Chile):** Bien estructurada. Pide explícitamente tres componentes del análisis: tasa de fallo por método vs resto de países, concentración por rango de ticket, e impacto en revenue neto de Q1. Esta pregunta integra correctamente los conceptos de las Lecciones 1, 2 y la Query 3 del Nivel 8.

**Pregunta 8 (integridad de datos):** Es una de las mejores preguntas del brief. Pide explícitamente verificar la integridad de `payments` antes de la auditoría externa — lo que es exactamente el tipo de trabajo que hace un analista de datos en contexto real. Los dos tipos de anomalía pedidos (pagos completed con paid_at NULL, y pedidos sin registro en payments) son los detectados en la Lección 1 y Lección 3 del Nivel 8.

### parte-01-exploracion.sql — Corrección técnica de las soluciones

**EJ01 (Resumen ejecutivo H1 2026):** La solución usa CROSS JOIN de tres CTEs escalares (cada una devuelve 1 fila) para combinar los cuatro KPIs en una sola fila. Este patrón es correcto y es el mismo documentado en la Lección 4 del Nivel 8. El NULLIF está presente en ambos denominadores.

**EJ02 (Tendencia mensual con LAG):** La solución es técnicamente idéntica a la Solución 05 del archivo de ejercicios del Nivel 8 (que también fue verificada como correcta). LAG sobre la CTE de revenue mensual, NULLIF en el denominador de variacion_pct.

**EJ03 (Top 5 países):** Técnicamente correcta. Los dos JOINs de payments → orders → customers para el revenue y returns → orders → customers para las devoluciones son el patrón correcto para navegar estas relaciones.

**EJ04 (Top 10 productos):** La aproximación del revenue neto mediante "precio promedio por unidad × devoluciones aprobadas" está correctamente documentada como una aproximación, no un cálculo exacto. La nota técnica en el comentario es honesta: "returns no tiene campo de monto". El NULLIF está en el denominador de precio_promedio. La lógica es correcta dadas las limitaciones del schema.

**EJ05 (Distribución por status):** La window function `SUM(COUNT(*)) OVER ()` para el total global (sin PARTITION BY) es correcta y es el patrón más limpio para calcular porcentajes sobre el total sin subquery adicional.

**EJ06 (Anomalía por país-mes):** La window function `AVG(revenue_neto) OVER (PARTITION BY country)` sobre la CTE de revenue mensual por país es el uso correcto. El NULLIF no aplica aquí (no hay división en el denominador de la window function). El `ABS()` para desviación absoluta es correcto. La clasificación spike/caida/normal con ±20% del promedio como umbral es coherente con la narrativa del briefing.

### Dependencia de v_clientes_perfil

El README del Capstone y el brief de capstone-brief.md no referencian explícitamente la vista `v_clientes_perfil` del Nivel 7. Ninguno de los ejercicios visibles (parte-01-exploracion.sql) la usa directamente. Sin embargo, la Parte 02 del Capstone cubre "cohortes, segmentación RFM, LTV" — temas que en el Nivel 7 se construían parcialmente sobre `v_clientes_perfil`.

Si alguna de las partes 02-05 del Capstone (no disponibles en los archivos revisados) usa `v_clientes_perfil`, el hallazgo CRIT-N7-01 (revenue_total inflado) aplicaría directamente. Esta dependencia debe verificarse cuando se revisen las partes restantes del Capstone.

---

## Archivos No Encontrados / Incompletos

**`dataset/expected-results-capstone-template.json`:** El archivo existe pero solo como template. Los expected results reales del Capstone no pueden generarse hasta que el schema del Capstone (IMP-CAP-01) esté resuelto, ya que las queries dependen de si el dataset usa el schema canónico o el schema extendido.

**Partes 02 a 05 del Capstone:** Solo existe `parte-01-exploracion.sql`. Los archivos `parte-02-clientes.sql`, `parte-03-marketing.sql`, `parte-04-operaciones.sql` y `parte-05-dashboard.sql` no fueron encontrados en el repositorio. No se puede hacer QA de las partes pendientes.

---

## Aspectos Positivos

**La narrativa del brief es la más efectiva del curso:** La carta de Valentina ("No es un ejercicio. Es el análisis que va a determinar si los inversores confían en la calidad de nuestra data") establece las apuestas del proyecto con claridad. El contexto de Serie B es el arco narrativo que conecta todos los niveles del curso y cierra apropiadamente aquí.

**Las ocho preguntas del brief cubren el ciclo analítico completo:** Revenue → Clientes → Adquisición → Retención → Riesgo → Auditoría. No hay solapamiento entre preguntas y la progresión sigue una lógica de "primero entiende el negocio, luego investiga los riesgos". Es el mejor diseño de análisis integrador del curso.

**EJ06 (anomalía por desviación estadística):** Es el ejercicio más avanzado del Capstone disponible para revisión. El uso de `AVG OVER (PARTITION BY country)` para calcular el promedio histórico del país y luego comparar cada mes-país contra ese promedio es exactamente el tipo de análisis exploratorio que diferencia a un analista avanzado de uno básico. El enunciado pide que Chile en marzo-abril aparezca como "caida" — lo que verificaría que el dataset tiene el outlier narrativo plantado.

**La instrucción de coherencia entre ejercicios:** "Si el EJ01 no cuadra con los subtotales de las partes siguientes, algo está mal — el analista excelente lo detecta antes de entregar" — es una instrucción de calidad analítica que enseña algo más que SQL: enseña validación cruzada de resultados. Es pedagógicamente valiosa.

**La sección de criterios de evaluación del README:** La distinción entre "análisis suficiente" y "análisis excelente" está bien articulada y da al estudiante criterios concretos para autoevaluarse.

---

## Próximos Pasos

**Bloqueantes antes de publicar:**

1. **[IMP-CAP-01] Resolver la discrepancia de schema:** El README del Capstone debe documentar el mismo schema que usa el dataset real. Si el dataset real es el schema canónico del curso, el README debe actualizarse para eliminar las columnas extras (`segment`, `cost`, `parent_id`, `country` en payments, `ended_at` en website_sessions). Verificar también que ningún ejercicio de las partes 02-05 referencie esas columnas.

2. **[IMP-CAP-02] Actualizar los métodos de payments:** Los métodos documentados en el README deben coincidir con el schema canónico (`'credit_card'`, `'paypal'`, `'bank_transfer'`, `'crypto'`). Agregar `'refunded'` a los status de `returns`.

**Correcciones importantes antes de publicar:**

3. **[IMP-CAP-03] Clarificar la fuente de datos para segmentación de clientes:** Agregar nota en la Pregunta 2 del brief especificando que el "revenue" del cliente para segmentación debe calcularse desde `payments.status = 'completed'`, no desde `order_items`.

**Acciones pendientes estructurales:**

4. **Crear los archivos de las partes 02-05:** `parte-02-clientes.sql`, `parte-03-marketing.sql`, `parte-04-operaciones.sql`, `parte-05-dashboard.sql` no existen. El Capstone está incompleto — solo la Parte 01 está disponible para revisión.

5. **Verificar que las partes 02-05 no usen `v_clientes_perfil.revenue_total` sin corregir:** Si alguna parte usa la vista del Nivel 7, debe usar la versión corregida (con CTEs separadas para revenue y sesiones) según la corrección propuesta en CRIT-N7-01 del informe de Nivel 7.

6. **Verificar disponibilidad de datos para EJ de la Parte 02:** Confirmar que el seed real tiene datos de Q3 2025 (jul-sep) y Q4 2025 (oct-dic) para que la Pregunta 5 de retención de cohortes sea ejecutable.

7. **Generar `dataset/expected-results-capstone.json`** una vez estabilizados el schema y las partes 02-05. Sin este archivo el sistema de validación del Playground no puede auto-verificar ningún ejercicio del Capstone.
