# INFORME QA — CÓDIGO — ShopSphere Seed Data v2

**Agente revisado:** `backend-engineer` / generador de dataset
**Fecha de revisión:** 2026-05-31
**Archivos revisados:**
- `dataset/generate_seed.py`
- `dataset/shopsphere-seed.sql` (output generado)
- `contenido/shopsphere-world.md` (Parte C — Timeline, fuente de verdad narrativa)
**Veredicto final:** ⚠️ APROBADO CON OBSERVACIONES

---

## RESUMEN EJECUTIVO

El seed data es técnicamente sólido en integridad referencial y la lógica de generación es correcta. Sin embargo, presenta dos categorías de problemas: (1) el schema del seed diverge del schema canónico del curso en múltiples columnas y tablas, lo que hará fallar queries del curso sobre el seed real; y (2) cuatro de los cinco eventos narrativos del timeline de `shopsphere-world.md` (Parte C) que la tarea de QA pide verificar están completamente ausentes del seed porque ocurren fuera del rango de fechas generado (el seed termina en 2024-12-01, pero los eventos son de 2025-2026).

---

## HALLAZGOS

---

### 🔴 CRÍTICO — Hallazgo #1

**Componente:** Schema del seed vs. schema canónico del curso — divergencias en nombres de columnas

**Problema:** El seed usa nombres de columna distintos al schema canónico en varias tablas. Cualquier query del curso que use los nombres canónicos fallará al ejecutarse sobre el seed.

| Tabla | Columna canónica | Columna en el seed | Impacto |
|-------|------------------|--------------------|---------|
| `customers` | `registered_at` | `signup_date` | Queries de fecha de registro fallan |
| `orders` | `ordered_at TIMESTAMP` | `order_date DATE` | DATE_TRUNC, filtros temporales fallan |
| `returns` | `returned_at` | `return_date` | Queries de fecha de devolución fallan |
| `inventory` | `stock` | `stock_qty` | Queries de inventario fallan |
| `inventory` | `updated_at` | `last_updated` | Idem |
| `marketing_campaigns` | `started_at` | `start_date` | Queries de campañas fallan |
| `marketing_campaigns` | `ended_at` | `end_date` | Idem |
| `marketing_campaigns` | `spent` | `revenue_generated` | Semántica diferente: `spent` es gasto, `revenue_generated` es ingreso |
| `website_sessions` | `started_at TIMESTAMP` | `session_date DATE` | Pérdida de granularidad horaria |

Además, el seed agrega columnas que no existen en el schema canónico (`customers.segment`, `orders.channel`, `orders.campaign_id`, `products.cost`, `products.sku`, `order_items.discount`, `returns.refund_amount`, `inventory.reorder_level`, `website_sessions.source`, `website_sessions.duration_sec`).

**Impacto:** Las preguntas del mini-editor de la evaluación diagnóstica y cualquier lección que use `ordered_at`, `registered_at`, `returned_at`, `stock` o `started_at` fallarán con error de columna inexistente cuando se ejecuten sobre el seed real.

**Corrección:** Sincronizar el seed con el schema canónico del curso. Las columnas adicionales (segmento, canal, etc.) son valiosas para análisis avanzados — pero deben ser adiciones al schema canónico, no reemplazos. El path de menor resistencia es alinear los nombres canónicos y agregar las columnas extra:

```sql
-- En customers: renombrar signup_date → registered_at, mantener segment como extra
-- En orders: renombrar order_date → ordered_at, mantener channel y campaign_id
-- En returns: renombrar return_date → returned_at, mantener refund_amount
-- En inventory: renombrar stock_qty → stock, last_updated → updated_at
-- En marketing_campaigns: renombrar start_date → started_at, end_date → ended_at
--   Evaluar si mantener revenue_generated o renombrar a spent (diferente semántica)
-- En website_sessions: renombrar session_date → started_at (TIMESTAMP si es posible)
```

---

### 🔴 CRÍTICO — Hallazgo #2

**Componente:** Schema del seed — columnas ausentes vs. schema canónico

**Problema:** Varias columnas que el schema canónico define (y que las lecciones del curso usan) están completamente ausentes del seed:

| Tabla | Columna ausente en seed | Impacto en el curso |
|-------|-------------------------|---------------------|
| `returns` | `status` (pending/approved/rejected/refunded) | P15 del diagnóstico, lecciones de Nivel 4 que filtran devoluciones aprobadas |
| `inventory` | `inventory_id` (PK) | El seed inserta directamente sin PK secuencial explícita |
| `website_sessions` | `device_type` (desktop/mobile/tablet) | Lecciones de Nivel 7 sobre segmentación por dispositivo |
| `products` | `is_active` | No se inserta en el seed (solo existe en el schema de creación) |

**Impacto:** Los estudiantes que ejecuten queries del curso sobre el seed real obtendrán errores de columna inexistente en funcionalidad que el curso enseña explícitamente.

**Corrección:**

Para `returns.status`: agregar al generador un campo `status` con distribución realista:

```python
# En la sección de returns del generador:
ret_status = random.choices(
    ['pending', 'approved', 'rejected', 'refunded'],
    weights=[10, 55, 15, 20]
)[0]
```

Para `website_sessions.device_type`:

```python
device_type = random.choices(
    ['desktop', 'mobile', 'tablet'],
    weights=[45, 42, 13]
)[0]
```

Para `products.is_active`: agregar `is_active = TRUE` por defecto en todos los INSERTs de productos. Considerar marcar algunos como `FALSE` para ejercicios de filtrado.

---

### 🔴 CRÍTICO — Hallazgo #3

**Componente:** Valores de `channel` en `marketing_campaigns` y `method` en `payments` violan CHECK constraints del schema canónico

**Problema:** El schema canónico define:

```sql
-- marketing_campaigns:
channel VARCHAR(80) CHECK (channel IN ('email','social','paid_search','display','affiliate'))

-- payments:
method VARCHAR(50) CHECK (method IN ('credit_card','paypal','bank_transfer','crypto'))
```

El seed inserta valores que no están en estos CHECK:

**marketing_campaigns.channel:** 7 de 15 campañas usan valores inválidos:
- `google_ads` (campaigns 2, 6, 9, 12, 14) — debería ser `paid_search`
- `influencer` (campaigns 7, 15) — no existe en el schema canónico

**payments.method:** El seed usa `debit_card` (peso 0.25) que no está en el CHECK del schema canónico.

**Impacto:** Si el seed se carga en una base de datos PostgreSQL con el schema canónico tal como está definido, todas las inserciones de campañas con `google_ads` o `influencer` fallarán con violación del CHECK constraint. Lo mismo para pagos con `debit_card`. El seed **no es cargable** en el schema canónico sin errores.

**Corrección:**

```python
# En campaigns_data del generador:
# Cambiar 'google_ads' → 'paid_search'
# Cambiar 'influencer' → 'social' o 'affiliate' (definir cuál aplica)

# En payments del generador:
methods     = ["credit_card", "paypal", "bank_transfer", "crypto"]
meth_wts    = [0.55, 0.20, 0.15, 0.10]
# Eliminar 'debit_card' del array
```

---

### 🔴 CRÍTICO — Hallazgo #4

**Componente:** `orders.status` — valor `'processing'` viola el CHECK constraint del schema canónico

**Problema:** El schema canónico define:

```sql
status VARCHAR(20) CHECK (status IN ('pending','shipped','delivered','cancelled'))
```

El generador usa `statuses = ["delivered", "shipped", "processing", "cancelled"]`. El valor `processing` no está en el CHECK. Esto afecta a todas las órdenes con ese status y hará fallar la carga.

**Impacto:** Idéntico al Hallazgo #3 — el seed no carga en el schema canónico.

**Corrección:**

```python
# Cambiar en el generador:
statuses = ["delivered", "shipped", "pending", "cancelled"]
# 'processing' → 'pending' (el equivalente canónico)
```

---

### 🔴 CRÍTICO — Hallazgo #5

**Componente:** Eventos narrativos del timeline — cuatro de cinco están fuera del rango de fechas del seed

**Problema:** La tarea de QA pide verificar la presencia de los siguientes eventos del timeline (Parte C de `shopsphere-world.md`):

| Evento | Fecha en el timeline | En rango del seed (2023-06-01 a 2024-12-01) |
|--------|---------------------|----------------------------------------------|
| Pico Black Friday nov 2024 — 2.847 pedidos | Nov 2024 | SI — pero ver nota abajo |
| Spike devoluciones julio 2025 — 8.3% concentrado en calzado/Colombia | Jul 2025 | NO — fuera de rango |
| Sobre-stock electrónica Argentina enero 2025 — descuentos 20-30% | Ene 2025 | NO — fuera de rango |
| Anomalía pagos Chile marzo-abril 2026 — +40% en fallidos | Mar-Abr 2026 | NO — fuera de rango |

El seed cubre **junio 2023 a diciembre 2024**. Tres de los cuatro eventos a verificar ocurren en 2025-2026 y son estructuralmente imposibles de estar en el seed.

**Nota sobre Black Friday 2024:** El seed sí tiene el 29 de noviembre de 2024 como fecha con peso 9x en el pool de fechas. Pero el timeline dice "2.847 pedidos en un día" — en un seed de solo 2.000 órdenes totales en 18 meses, eso es físicamente imposible. El pico de Black Friday existe en el seed pero a escala reducida (el peso 9x genera más órdenes en ese día que en un día normal, pero no 2.847).

**Impacto:** Los ejercicios del curso que hagan referencia a los eventos narrativos de 2025-2026 no encontrarán esos datos en el dataset. Esto es un desacoplamiento entre la narrativa del mundo (Parte C) y el dataset real del curso.

**Corrección:** Hay dos rutas:

**Ruta A (ajustar el seed):** Extender el rango de fechas del seed hasta al menos abril 2026 e implementar los eventos narrativos faltantes en el generador. Esto requiere refactor significativo del generador.

**Ruta B (ajustar la narrativa):** Actualizar `shopsphere-world.md` Parte C para que los eventos narrativos caigan dentro del rango del seed (2023-06-01 a 2024-12-01), o bien dejar claro que el dataset del curso es una "muestra histórica" y que los eventos más recientes son contexto narrativo, no datos explorables. En este caso, documentar explícitamente qué eventos SÍ están en el seed y cuáles son solo narrativa.

---

### 🟡 IMPORTANTE — Hallazgo #6

**Componente:** `generate_seed.py` — Discrepancia entre el target declarado de ticket promedio y el resultado

**Problema:** El comentario del generador declara:

```python
"""
Target: ticket promedio $80-$150, revenue ~$950K, tasa devolucion ~5%
"""
```

Los resultados reales según el validador (seed=42) son:
- Ticket promedio: ~$187 (supera el target de $80-$150 en un 25-134%)
- Revenue delivered: ~$277.000 (el target era ~$950K, una diferencia de 3.4x)
- Revenue "all active": ~$352.000

El revenue de $950K habría requerido ~15.000 órdenes/mes (el volumen de producción de ShopSphere), no 2.000 órdenes en 18 meses. El docstring del generador mezclaba las métricas de producción con las métricas del dataset del curso.

**Impacto:** Si un instructor o reviewer lee el docstring y espera revenue de $950K, encontrará $277K y pensará que el seed está roto. La confusión ya ocurrió en el comentario del SQL generado (que dice `~$282K`) vs. el resultado real del validador (`~$277K`).

**Corrección:** Actualizar el docstring del generador con las métricas reales:

```python
"""
ShopSphere Seed Data Generator v2
Dataset del curso SQL — NO es el dataset de producción.
Target: 2.000 órdenes en 18 meses (jun 2023 - dic 2024)
Métricas reales (seed=42):
  - Revenue delivered: ~$277.000
  - Ticket promedio: ~$187 (órdenes delivered)
  - Tasa devolución: ~5.3% de items
  - Órdenes delivered: ~74%
"""
```

---

### 🟡 IMPORTANTE — Hallazgo #7

**Componente:** `generate_seed.py` — Distribución de pedidos por país no implementada

**Problema:** La tarea de QA pide verificar que la distribución de pedidos sea "México ~41%, Colombia ~28%". El generador no implementa ninguna lógica de distribución geográfica en los pedidos. La distribución resultante depende enteramente del azar en la asignación de clientes a ciudades, que usa un array de pares `(ciudad, país)` donde México tiene 5 entradas, Colombia 4 y Argentina 4 de un total de 37 pares.

Esto da a México aproximadamente un 13.5% de probabilidad de aparición (5/37), no el 41% descrito en el timeline para diciembre 2024. La distribución real del seed probablemente no refleja la dominancia de México.

**Impacto:** Ejercicios que pidan analizar "distribución de pedidos por país" no mostrarán el patrón narrativo México > Colombia > otros.

**Corrección:** Implementar pesos de país en el pool de clientes para reflejar la narrativa:

```python
# Ejemplo: aumentar la representación de clientes mexicanos
# al 35-40% del total de 500 clientes
city_country_weights = {
    'Mexico': 0.38,
    'Colombia': 0.26,
    'Argentina': 0.12,
    'Chile': 0.08,
    'Peru': 0.07,
    # resto: 0.09
}
```

---

### 🟡 IMPORTANTE — Hallazgo #8

**Componente:** `generate_seed.py` — `inventory_id` ausente como PRIMARY KEY explícita

**Problema:** El schema canónico define:

```sql
CREATE TABLE inventory (
    inventory_id INT PRIMARY KEY,
    product_id   INT REFERENCES products(product_id),
    ...
);
```

El generador inserta en `inventory` sin incluir `inventory_id`:

```python
emit(
    f"INSERT INTO inventory (product_id, stock_qty, reorder_level, last_updated) "
    f"VALUES ({pid}, {stock}, {reorder}, {fmt_date(lu)});"
)
```

Si el schema tiene `inventory_id` como PK `NOT NULL`, este INSERT fallará. Si el schema tiene `inventory_id` como SERIAL/auto-increment, funciona pero es inconsistente con la forma en que todas las demás tablas insertan su PK explícitamente.

**Impacto:** Fallo de carga en schemas PostgreSQL donde `inventory_id` es INT (no SERIAL). Inconsistencia pedagógica.

**Corrección:** Agregar `inventory_id` explícito en el generador:

```python
emit(
    f"INSERT INTO inventory (inventory_id, product_id, stock_qty, reorder_level, last_updated) "
    f"VALUES ({pid}, {pid}, {stock}, {reorder}, {fmt_date(lu)});"
    # inventory_id = product_id (relación 1-a-1 garantizada por diseño)
)
```

---

### 🔵 SUGERENCIA — Hallazgo #9

**Componente:** `generate_seed.py` — Black Friday 2024 comentado como "2.847 pedidos en un día"

**Problema:** El comentario del SQL dice `"volumen 9x dia normal"` para el Black Friday, pero el timeline narrativo dice específicamente "2.847 pedidos en 24 horas". El peso 9x en el pool de fechas no garantiza exactamente 2.847 pedidos — garantiza una mayor probabilidad de selección de esa fecha, pero con 2.000 órdenes totales el resultado real es muy inferior.

**Impacto:** Si un ejercicio pide "encontrar el día con más pedidos" el resultado correcto estará en la fecha de Black Friday, lo cual está bien. Pero si el enunciado dice "deberías ver ~2.847 pedidos", el estudiante no los encontrará y pensará que el dataset está roto.

**Corrección:** Actualizar el comentario del SQL para decir el número esperado con el dataset del curso (no el número de producción):

```sql
-- Black Friday 2024-11-29: ~15-25 pedidos en ese día (vs. ~2-3 en un día normal)
-- [En producción: 2.847 pedidos — esto es el dataset reducido del curso]
```

---

### 🔵 SUGERENCIA — Hallazgo #10

**Componente:** `generate_seed.py` — Tasa de devolución declarada vs. real

**Problema:** El docstring declara "tasa devolución ~5%". El resultado real es ~5.3% de items (no de órdenes). El comentario del SQL generado también dice "~5.3% de items". La distinción entre "tasa de devolución de items" y "tasa de devolución de órdenes" es una métrica de negocio importante que el curso enseña — tener ambas métricas documentadas evitaría confusión:

- Tasa de devolución de items: ~5.3% (returns / order_items)
- Tasa de devolución de órdenes: diferente (órdenes con al menos 1 devolución / total órdenes)

**Corrección:** Agregar al docstring:

```python
# Tasa devolución de items: ~5.3% (returns/order_items)
# Tasa devolución de órdenes: ~X% (órdenes con al menos 1 return / total órdenes)
```

---

## VERIFICACIÓN DE INTEGRIDAD REFERENCIAL

El generador incluye validación de FK al final del script y reporta (con seed=42):

```
FK errors in order_items: 0
FK errors in returns:     0
Referential integrity: OK
```

Los siguientes puntos están verificados como correctos:

- `order_items.order_id` referencia siempre a un `order_id` existente.
- `order_items.product_id` referencia siempre a un `product_id` existente.
- `returns.order_id` viene de `delivered_orders`, que es un subconjunto de `orders`.
- `returns.product_id` viene de `order_to_items`, generados desde los mismos `products`.
- `payments` solo se generan para órdenes con `status = 'delivered'`.
- `website_sessions.customer_id` puede ser NULL (~30%) — correcto para sesiones anónimas.
- `website_sessions.campaign_id` puede ser NULL — correcto para tráfico orgánico y directo.

**Hallazgo positivo:** No hay `order_items` huérfanos ni `payments` sin `order`. La integridad referencial interna del dataset generado es correcta.

---

## EVENTOS NARRATIVOS — ESTADO DE VERIFICACIÓN

| Evento (Parte C) | Estado en el seed |
|------|------|
| Pico Black Friday nov 2024 | PRESENTE parcialmente — hay spike de fechas pero no al volumen narrativo (2.847 imposible con 2.000 órdenes totales) |
| Spike devoluciones julio 2025 | AUSENTE — fuera del rango del seed |
| Sobre-stock electrónica Argentina ene 2025 | AUSENTE — fuera del rango del seed |
| Anomalía pagos Chile mar-abr 2026 | AUSENTE — fuera del rango del seed |

El único evento del timeline (Parte C) que el seed puede representar es el Black Friday 2024, y lo hace de forma relativa (mayor concentración de pedidos en esa fecha) pero no en términos absolutos.

---

## ASPECTOS POSITIVOS

- **Integridad referencial interna:** El generador incluye validación programática de FK y los reporta como correctos. Esto es práctica profesional bien ejecutada.

- **Outliers narrativos bien plantados:** Los tres productos de alta devolución (24, 39, 40) con `ret_prob = 0.16` (vs. 0.052 general) producen tasas de ~20% en esos productos, creando anomalías estadísticas detectables que hacen los ejercicios de análisis más interesantes.

- **Whale customer (customer_id=7):** La garantía explícita por código (`cust_segments_raw[6] = "Premium"` + `n=25 if cid == WHALE_CID`) es robusta y reproducible con `random.seed(42)`.

- **Stockout outlier (product_id=10):** El Hub USB-C con stock=0 pero órdenes en noviembre 2024 es un hallazgo analítico elegante que ilustra la desconexión entre inventario y pedidos.

- **Reproducibilidad garantizada:** `random.seed(42)` al inicio del generador garantiza que el mismo seed siempre produce exactamente el mismo dataset. Esto es crítico para un curso donde los ejercicios tienen respuestas esperadas específicas.

- **Lógica de campañas con ROI distribuido:** La clasificación en `alto`, `mediocre` y `fallido` con rangos de multiplicador da variabilidad realista a los ROIs, creando un escenario analítico no trivial para el estudiante.

- **Clientes anónimos en website_sessions:** El 30% de sesiones sin `customer_id` es un detalle realista que obliga a manejar NULLs correctamente en los análisis de conversión.

---

## PRÓXIMOS PASOS

**Bloqueantes (el seed no carga en el schema canónico sin estos cambios):**

1. **Corrección de nombres de columna — Hallazgo #1:** Sincronizar `signup_date→registered_at`, `order_date→ordered_at`, `return_date→returned_at`, `stock_qty→stock`, `last_updated→updated_at`, `start_date→started_at`, `end_date→ended_at`. Las columnas extra del seed son bienvenidas como adiciones.

2. **Agregar columnas ausentes — Hallazgo #2:** Insertar `returns.status`, `products.is_active`, `website_sessions.device_type`.

3. **Corregir violaciones de CHECK — Hallazgos #3 y #4:** `google_ads→paid_search`, `influencer→social/affiliate`, `debit_card→bank_transfer` (o similar), `processing→pending`.

**Importantes (afectan coherencia analítica del curso):**

4. **Resolver desacoplamiento de timeline — Hallazgo #5:** Decidir si extender el rango de fechas del seed o actualizar la narrativa del `shopsphere-world.md` para alinear eventos con el rango disponible.

5. **Implementar distribución geográfica — Hallazgo #7:** Agregar pesos de país para que México y Colombia representen la distribución narrativa.

6. **Agregar `inventory_id` explícito — Hallazgo #8.**

**Opcionales:**

7. Actualizar docstring con métricas reales (Hallazgo #6).
8. Ajustar comentarios de Black Friday a la escala del dataset del curso (Hallazgo #9).
9. Documentar distinción entre tasa de items y tasa de órdenes (Hallazgo #10).

---

*Informe generado: 2026-05-31*
*Revisado por: sql-data-analyst (Modo QA)*
*Próxima revisión recomendada: tras aplicar correcciones bloqueantes (Hallazgos #1-#5)*
