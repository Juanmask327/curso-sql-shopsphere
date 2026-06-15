# Briefings — Nivel 8: SQL Profesional

---

## Briefing 8.1 — Ana | Revenue neto Q1 2026: pagos completados menos reembolsos

**Canal:** Email
**De:** Ana Castillo
**Para:** [estudiante]
**CC:** Valentina Torres
**Asunto:** Revenue neto Q1 2026 — necesito el dato verificado

Buenas tardes,

Para el cierre del informe de Q1 necesito el revenue neto real de ShopSphere: lo que efectivamente ingresó a la empresa, no lo que se facturó. La diferencia es importante para la junta.

El cálculo que necesito, para el período enero–marzo 2026:

- Suma de pagos con `status = 'completed'`
- Menos suma de pagos con `status = 'refunded'`
- Resultado: revenue neto del trimestre

Desagregado por país (campo en la tabla `orders`, que debes cruzar con `payments` via `order_id`).

Si el total de reembolsos supera el 5% del total cobrado en algún país, inclúyelo como nota al margen. Eso es información que la junta va a preguntar.

Ana Castillo
Head of Finance, ShopSphere

---

## Briefing 8.2 — Ana | Anomalía Chile: tasa de fallo por método de pago

**Canal:** Email
**De:** Ana Castillo
**Para:** [estudiante]
**CC:** Valentina Torres
**Asunto:** Análisis de pagos fallidos Chile — marzo y abril 2026

Buenas tardes,

Necesito aislar la anomalía de Chile. Sabemos que en marzo y abril de 2026 la tasa de pagos fallidos subió de forma atípica. Lo que no sabemos es si el problema es generalizado o si está concentrado en un método de pago específico.

Para Chile, en el período marzo–abril 2026, necesito:

- Total de pagos por método (`credit_card`, `paypal`, `bank_transfer`, `crypto`)
- Pagos fallidos por método
- Tasa de fallo por método (como porcentaje)
- Comparación con la tasa de fallo del mismo período para los otros cuatro países

Si la tasa de fallo de un método específico en Chile es más del doble que en el resto de países en el mismo período, eso confirma que el problema no es de demanda — es de infraestructura de pagos en ese método.

Esto es lo que presentamos como hallazgo central del informe de Q1.

Ana Castillo
Head of Finance, ShopSphere

---

## Briefing 8.3 — Ana | NULLs en paid_at: datos sucios antes del cierre

**Canal:** Email
**De:** Ana Castillo
**Para:** [estudiante]
**CC:** Valentina Torres
**Asunto:** Integridad de datos — tabla payments

Una cosa antes de cerrar el informe.

Me pasaron que hay registros en `payments` donde `paid_at` es NULL en pagos con `status = 'completed'`. Eso es incoherente: un pago completado debe tener fecha de pago. Si esos registros entran en el cálculo de revenue del Q1, los números están mal.

Necesito saber:

- Cuántos registros tienen `status = 'completed'` y `paid_at` IS NULL
- De esos, a cuántos pedidos corresponden y en qué países están concentrados
- El monto total que representan esos pagos (para saber si el impacto es material)

No calculamos nada de revenue hasta tener este número. Si el monto es relevante, lo escalo con Marco antes de la junta.

Ana Castillo

---

## Briefing 8.4 — Ana | Métodos de pago por ticket: ¿cuál se usa en compras grandes?

**Canal:** Email
**De:** Ana Castillo
**Para:** [estudiante]
**CC:** Valentina Torres
**Asunto:** Distribución de métodos de pago por rango de monto

Para la sección de riesgos del informe necesito entender cómo se distribuyen los métodos de pago según el tamaño del ticket. La hipótesis es que los tickets altos se concentran en uno o dos métodos, lo que genera exposición si alguno falla.

Necesito ver, para pagos con `status = 'completed'`:

- Rango de monto: bajo (menos de 50 USD), medio (50–200 USD), alto (más de 200 USD)
- Para cada rango: distribución por método de pago (% de transacciones)
- Monto promedio por método de pago en cada rango

Si `credit_card` o `bank_transfer` concentran más del 60% de los tickets altos, lo incluyo como observación de riesgo de concentración.

Formato de tabla. Fecha límite: jueves al mediodía.

Ana Castillo

---

## Briefing 8.5 — Valentina | La query del revenue tarda 45 segundos

**Canal:** Slack
**De:** vale.torres
**Para:** [usuario de Slack del estudiante]

necesito que hagas algo antes de que Ana siga ejecutando queries encima de payments

la query que cruza orders con payments filtrando por fecha y país está tardando 45 segundos. la corrí con EXPLAIN ANALYZE y vi un Seq Scan sobre payments con filter — no hay índice en `order_id` ni en `paid_at`

quiero que:
1. identifiques qué columnas de `payments` justifican un índice según los patrones de consulta que hemos tenido este nivel
2. crees los índices que correspondan
3. vuelvas a correr el EXPLAIN ANALYZE después para confirmar que el plan cambió

cuando termines me mandas los CREATE INDEX que usaste y el antes/después del plan de ejecución. no necesito el análisis completo, solo los números clave: estimated cost antes vs después

— Vale

---

## Briefing 8.6 — Valentina | EXPLAIN ANALYZE sobre la query de cohortes

**Canal:** Email
**De:** Valentina Torres
**Para:** [estudiante]
**Asunto:** Optimización — query de cohortes de clientes

La query del análisis de cohortes del Nivel 6 la volvimos a usar esta semana para el dashboard de los fondos y tarda más de lo que debería. Antes de que el equipo de BI la conecte a Power BI en producción, necesito que la analices.

Corre EXPLAIN ANALYZE sobre la query que calcula retención mensual por cohorte de adquisición. Lo que necesito interpretar:

- ¿Hay algún Seq Scan sobre tablas grandes que se pueda reemplazar con un Index Scan?
- ¿El Hash Join es el join más eficiente para el volumen que tenemos?
- ¿Qué índice crearías primero si solo pudieras crear uno?

Me interesa el razonamiento, no solo el resultado. Cuando propongas un índice, explica brevemente por qué esa columna y no otra.

— Vale

---

## Briefing 8.7 — Valentina | Índice parcial: solo pagos fallidos en Chile

**Canal:** Email
**De:** Valentina Torres
**Para:** [estudiante]
**Asunto:** Índice parcial — caso Chile

Ana va a seguir consultando los pagos fallidos de Chile durante las próximas semanas mientras investigamos la anomalía. Cada vez que ejecuta el análisis, la query hace un scan completo de `payments`.

Quiero que crees un índice parcial que acelere específicamente las consultas sobre pagos fallidos en Chile. Un índice parcial indexa solo las filas que cumplen una condición — en este caso, solo los registros donde `status = 'failed'` y el pedido asociado es de Chile.

Antes de crearlo, explica en un comentario SQL por qué un índice parcial es mejor que un índice general en `status` para este caso de uso específico. Esa explicación va en la documentación técnica del proyecto.

— Vale

---

## Briefing 8.8 — Diego | Actualizar stock y registrar pedido: operación atómica

**Canal:** Email
**De:** Diego Morales
**Para:** [estudiante]
**Asunto:** Integridad operacional — registro de pedidos

Tenemos un problema que necesito resolver antes de que escale. Cuando se registra un pedido en el sistema, hay dos operaciones que deben suceder juntas: se descuenta el stock del producto en `inventory` y se inserta el registro en `orders`. Si el sistema falla entre las dos operaciones — lo que ya pasó dos veces este año — queda el pedido registrado pero sin descuento de stock, o el stock descontado pero sin pedido. Los dos estados son incorrectos.

Necesito una transacción que envuelva las dos operaciones. Si alguna falla (por stock insuficiente, por ejemplo), debe hacer ROLLBACK completo. Si las dos se completan, COMMIT.

Incluye también un SAVEPOINT después del INSERT en `orders` pero antes del UPDATE en `inventory` — quiero poder hacer rollback solo del descuento de stock sin deshacer el registro del pedido en casos específicos que todavía estamos definiendo.

Para el miércoles.

Diego

---

## Briefing 8.9 — Diego | INSERT ... ON CONFLICT para actualización de inventario

**Canal:** Slack
**De:** diego.morales
**Para:** [usuario de Slack del estudiante]

una cosa de operaciones

el equipo de bodega actualiza el stock a mano desde un sistema externo que a veces manda el mismo `product_id` dos veces con valores distintos. cuando eso pasa, el segundo INSERT falla con un error de clave duplicada y el registro actualizado nunca entra

necesito que el INSERT en `inventory` maneje el conflicto automáticamente: si el `product_id` ya existe, que actualice el campo `stock` con el nuevo valor en lugar de fallar. eso se puede hacer con ON CONFLICT

cuando lo tengas, pruébalo con un ejemplo donde el product_id ya existe en la tabla

para esta semana

Diego

---

## Briefing 8.10 — Marco | ¿Cuánto dinero recibió realmente ShopSphere?

**Canal:** Email
**De:** Marco Jiménez
**Para:** Valentina Torres
**Asunto:** Una pregunta antes de la junta

Vale,

la junta es el jueves y me van a preguntar algo que no tengo claro: cuánto dinero recibió realmente la empresa. No lo que vendimos — lo que efectivamente entró a la cuenta, descontando lo que tuvimos que devolver.

necesito el número total, y si puedes desglosarlo por país y por trimestre del último año también está bien. quiero saber si hay algún país donde los reembolsos estén comiendo una parte relevante del revenue

si hay algo raro en chile que deba mencionar en la reunión, dímelo

Gracias / M

---

*Nota de Valentina al estudiante (Slack, directo):*

"Marco necesita el revenue neto histórico. Cruza `payments` con `orders` via `order_id`. Revenue neto = suma de pagos `completed` menos suma de pagos `refunded`, desagregado por `country` y por trimestre (usa DATE_TRUNC o EXTRACT según lo que tengas disponible). Período: últimos 12 meses desde hoy. Para Chile, si la tasa de reembolsos en Q1 2026 es materialmente distinta al promedio histórico de Chile, señálalo explícitamente. Marco lo va a mencionar en la junta aunque no entienda el SQL."

— Vale
