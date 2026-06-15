# Proyecto Nivel 8 — Informe financiero Q1 2026 para la junta directiva

---

**De:** Ana Castillo
**Para:** [estudiante]
**CC:** Valentina Torres
**Asunto:** Proyecto — Informe financiero Q1 2026

Buenas tardes,

La junta directiva se reúne el jueves 18 de junio. Los inversores — el fondo chileno y el fondo mexicano — van a recibir el informe financiero de Q1 2026 antes de esa reunión. Es el primer informe trimestral que ShopSphere presenta con análisis de pagos desagregado por método y por país. La audiencia es exigente y tiene contexto propio sobre el mercado chileno.

Necesito el análisis completo. No estimaciones — números exactos, con fuente clara y nota si hay anomalías.

---

## Lo que necesitas entregar

**1. Revenue neto del trimestre por país**

Calcula el revenue neto Q1 2026 (enero–marzo) por país. Revenue neto = pagos con `status = 'completed'` menos pagos con `status = 'refunded'`, cruzando `payments` con `orders` via `order_id`. Incluye también el total consolidado al final.

**2. Análisis de la anomalía de Chile**

Para Chile en el período marzo–abril 2026: tasa de fallo por método de pago versus el promedio de los otros cuatro países en el mismo período. Identifica si el problema está concentrado en un método específico y en qué rango de monto de ticket (`amount` en `payments`). Este hallazgo necesita una nota de interpretación, no solo el número.

**3. Integridad de los datos de pagos**

Antes de cerrar los números, verifica cuántos registros tienen `status = 'completed'` con `paid_at` IS NULL. Si el monto total de esos registros supera el 1% del revenue neto calculado en el punto 1, el informe debe incluir una nota de advertencia sobre la cifra.

**4. Evolución mensual del revenue neto**

Revenue neto mes a mes durante Q1 2026 (enero, febrero, marzo), para todos los países combinados. Incluye la variación porcentual mes a mes. Este gráfico de tendencia es lo primero que van a ver en la presentación.

**5. Concentración de pagos por método**

Para el Q1 completo: distribución de transacciones completadas por método de pago. Si un solo método concentra más del 50% del volumen, inclúyelo como observación de riesgo de concentración en el informe.

**6. Transacción de ajuste contable**

Durante la auditoría de datos, Valentina identificó tres pagos duplicados del 15 de febrero que deben marcarse como `refunded` en la tabla `payments`. Este ajuste debe ejecutarse dentro de una transacción: BEGIN, UPDATE de los tres registros, verificación del resultado con SELECT, y COMMIT si los tres registros se actualizaron correctamente o ROLLBACK si alguno no se encontró. Documenta la transacción en el entregable.

---

## Consideraciones

Los fondos conocen los números de Chile mejor que nosotros. Si la anomalía de pagos en marzo–abril muestra un patrón claro — un método específico, un rango de monto específico — es mejor que lo nombremos en el informe antes de que ellos lo pregunten en la reunión.

El informe tiene que poder leerse sin el SQL. Cada resultado va acompañado de una línea de interpretación: qué dice el número y qué implica para la empresa.

Plazo: miércoles 17 de junio al mediodía.

Ana Castillo
Head of Finance, ShopSphere
