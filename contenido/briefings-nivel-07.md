# Briefings — Nivel 7: SQL para Business Intelligence

---

## Briefing 7.1 — Sofía | Tasa de conversión por campaña

**Canal:** Email
**De:** Sofía Ramírez
**Para:** [estudiante]
**CC:** Valentina Torres
**Asunto:** Tasa de conversión Día de Madres — necesito el dato antes del cierre de mes

Hola,

Necesito entender si la campaña de Día de Madres (5–10 de mayo) trajo tráfico de calidad o solo volumen. Tenemos los datos de sesiones en `website_sessions` — quiero saber, de todas las sesiones que llegaron a través de esa campaña en esos días, qué porcentaje terminó en conversión (campo `converted = true`).

Lo que necesito:

- Total de sesiones de la campaña en ese período
- Sesiones que convirtieron
- Tasa de conversión (como porcentaje, no decimal)

Si la tasa está por debajo del 3% hay un problema. Si está arriba del 6% hay algo que vale la pena escalar.

Para hoy si puedes.

Sofía

---

## Briefing 7.2 — Sofía | Comparativo de conversión por canal

**Canal:** Email
**De:** Sofía Ramírez
**Para:** [estudiante]
**CC:** Valentina Torres
**Asunto:** ¿Cuál de nuestros canales convierte mejor?

Hola,

Hace meses que discutimos esto en reunión y nadie tenía el número. Quiero saber, mirando todo el histórico de `website_sessions`, cuál es la tasa de conversión por tipo de campaña (email, paid_search, social, organic — lo que sea que tengamos en los datos).

Lo que necesito:

- Canal (campo de la campaña)
- Total de sesiones
- Sesiones convertidas
- Tasa de conversión
- Ordenado de mayor a menor tasa

Necesito esto para el deck de presupuesto Q3. Valentina ya sabe.

Sofía

---

## Briefing 7.3 — Sofía | Funnel completo: sesión → conversión → pedido entregado

**Canal:** Slack
**De:** sofia.ramirez
**Para:** [usuario de Slack del estudiante]

oye necesito algo más detallado para la reunión con Valentina del jueves

quiero ver el funnel completo de adquisición para el Q1 2026:

1. cuántas sesiones totales hubo
2. cuántas convirtieron (converted = true)
3. de esas, cuántas terminaron en un pedido real (join con orders)
4. de esos pedidos, cuántos llegaron entregados (status = 'delivered')

básicamente quiero ver en qué etapa estamos perdiendo más gente. si convirtieron pero el pedido no se concretó, eso es un problema de checkout. si el pedido se hizo pero no se entregó, es un problema de ops.

el rango es enero–marzo 2026. gracias

---

## Briefing 7.4 — Sofía | Conversión por dispositivo

**Canal:** Email
**De:** Sofía Ramírez
**Para:** [estudiante]
**CC:** Valentina Torres
**Asunto:** Mobile vs. Desktop — ¿dónde estamos perdiendo conversiones?

Hola,

Tengo una hipótesis que quiero validar: creo que los usuarios de mobile ven más productos pero compran menos. Si es así, tenemos un problema de experiencia móvil que hay que llevarle a producto.

Necesito la tasa de conversión desglosada por `device_type` (desktop, mobile, tablet):

- Sesiones totales por dispositivo
- Sesiones convertidas por dispositivo
- Tasa de conversión por dispositivo
- Promedio de páginas vistas por dispositivo (como proxy de engagement)

Si mobile tiene alta cantidad de páginas vistas pero baja conversión, la hipótesis se confirma.

Sofía

---

## Briefing 7.5 — Valentina | Vista reutilizable para el equipo de BI

**Canal:** Email
**De:** Valentina Torres
**Para:** [estudiante]
**Asunto:** Vista para Power BI — antes del viernes

El equipo de BI del fondo chileno va a conectar Power BI directamente a nuestra base. Necesito que crees una vista llamada `v_funnel_adquisicion` que encapsule la lógica del funnel para que ellos puedan consultarla sin tocar las tablas base.

La vista debe tener, por sesión:

- `session_id`
- `customer_id`
- `campaign_id`
- `device_type`
- `started_at`
- `converted` (el booleano original)
- `order_id` (NULL si no generó pedido)
- `order_status` (NULL si no hay pedido)
- `order_total` (NULL si no hay pedido)

El join entre sesiones y pedidos va por `customer_id`. Usa LEFT JOIN para no perder sesiones que no convirtieron.

Cuando la vista esté creada, haz una consulta rápida encima para confirmar que devuelve datos.

— Vale

---

## Briefing 7.6 — Valentina | Vista de clientes para segmentación

**Canal:** Email
**De:** Valentina Torres
**Para:** [estudiante]
**Asunto:** Vista `v_clientes_perfil` — para la semana que viene

Necesito una segunda vista para el dashboard de los fondos. Esta es de perfil de cliente — una fila por customer_id con el contexto completo que necesita cualquier análisis de segmentación.

Debe incluir:

- `customer_id`, `country`, `registered_at`
- `total_pedidos` — cantidad de pedidos distintos
- `revenue_total` — suma de order_total
- `primer_pedido_at` — fecha del primer pedido
- `ultimo_pedido_at` — fecha del pedido más reciente
- `total_sesiones` — count de sesiones en website_sessions
- `sesiones_convertidas` — count de sesiones donde converted = true

Llámala `v_clientes_perfil`. Esta vista la vamos a usar en el capstone también, así que hazla bien.

— Vale

---

## Briefing 7.7 — Valentina | Segmentación de sesiones por engagement

**Canal:** Email
**De:** Valentina Torres
**Para:** [estudiante]
**Asunto:** Clasificar sesiones por nivel de engagement

El equipo de producto preguntó algo interesante: ¿podemos clasificar las sesiones según cuánto exploró el usuario antes de convertir (o no)?

Quiero una columna calculada con CASE WHEN que clasifique cada sesión así:

- `pages_viewed = 1` → "rebote"
- `pages_viewed` entre 2 y 4 → "exploración baja"
- `pages_viewed` entre 5 y 9 → "exploración media"
- `pages_viewed >= 10` → "exploración alta"

Con esa columna, necesito ver la tasa de conversión por categoría de engagement. La hipótesis es que "exploración alta" convierte más — pero necesito el número, no la intuición.

— Vale

---

## Briefing 7.8 — Marco | ¿De dónde vienen los clientes que más compran?

**Canal:** Slack
**De:** marco.jimenez
**Para:** Valentina Torres (en copia al estudiante)

Vale, pregunta rápida: tenemos idea de qué campañas o canales traen a los clientes que realmente gastan plata? No los que entran una vez — los que se quedan y compran de nuevo.

necesito esto para la reunión con los fondos. algo simple, no necesito un informe

Gracias / M

---

*Nota interna de Valentina (Slack, directo al estudiante):*

"M preguntó algo que no tenemos respondido formalmente. Necesito que cruces `website_sessions` con `orders` via `customer_id`: para cada campaña, calcula el revenue total generado por clientes que llegaron a través de esa campaña. Ordena por revenue total desc. Eso es lo que le respondo a Marco."

— Vale

---

## Briefing 7.9 — Marco | Cuántas sesiones necesita un cliente antes de comprar

**Canal:** Email
**De:** Marco Jiménez
**Para:** Valentina Torres
**Asunto:** Una pregunta

Vale,

una cosa que me preguntaron en Chile: cuántas veces visita alguien nuestro sitio antes de comprar por primera vez? pregunta simple pero no sé si la tenemos respondida

si la puedes responder antes de la reunión del mes que viene sería ideal

Gracias / M

---

*Nota de Valentina al estudiante:*

"Necesito el promedio de sesiones por cliente antes de su primer pedido. Filtra solo clientes que hayan comprado al menos una vez. El join va por customer_id, y tienes que contar sesiones anteriores a la fecha de su primer pedido."

— Vale

---

## Briefing 7.10 — Ana | Funnel financiero: sesiones → pedidos → pagos completados en Chile

**Canal:** Email
**De:** Ana Castillo
**Para:** [estudiante]
**CC:** Valentina Torres
**Asunto:** Análisis de funnel — Chile, marzo–abril 2026

Buenas tardes,

Como saben, en marzo y abril detectamos un aumento atípico de pagos fallidos en Chile concentrado en tickets superiores a CLP 80.000. Necesito entender el funnel completo para cuantificar el impacto real.

Para Chile, en el período marzo–abril 2026, necesito:

1. Total de sesiones
2. Sesiones que marcaron `converted = true` (el usuario llegó a intentar comprar)
3. Pedidos efectivamente creados en ese período
4. Pedidos con `payment_status = 'completed'`
5. Pedidos con `payment_status = 'failed'`

Lo que me interesa es la brecha entre punto 2 y punto 4: cuántas intenciones de compra no se materializaron en pago exitoso. Si esa brecha es mayor en Chile que en otros países en el mismo período, confirma la hipótesis del fallo sistémico.

Necesito el resultado con nota si encuentras algo fuera de lo esperado.

Ana Castillo
Head of Finance, ShopSphere

---

## Briefing 7.11 — Ana | Clasificación de clientes por valor para reporte a inversores

**Canal:** Email
**De:** Ana Castillo
**Para:** [estudiante]
**CC:** Valentina Torres
**Asunto:** Segmentación de clientes por revenue — reporte fondos

Para el reporte al comité, necesito clasificar nuestra base de clientes en segmentos de valor usando CASE WHEN:

- Revenue total = 0 → "sin compras"
- Revenue total entre 1 y 100 → "comprador ocasional"
- Revenue total entre 101 y 500 → "comprador recurrente"
- Revenue total > 500 → "cliente de alto valor"

Necesito saber cuántos clientes hay en cada segmento y qué porcentaje del revenue total representa cada uno.

Esto va directo a la presentación de Marco con los fondos. Formato limpio: segmento, cantidad de clientes, revenue total del segmento, % sobre revenue total.

Ana Castillo

---

## Briefing 7.12 — Diego | Devoluciones por canal de adquisición

**Canal:** Email
**De:** Diego Morales
**Para:** [estudiante]
**Asunto:** Devoluciones por canal — necesito el dato esta semana

Tengo una hipótesis de operaciones: los clientes que llegaron por paid_search devuelven más que los que llegaron por email o de forma orgánica. Si es así, no es un problema de producto sino de expectativa — están llegando con una promesa que el producto no cumple.

Necesito cruzar la campaña de origen del cliente (de `website_sessions`) con su historial de devoluciones (de `returns`). Para cada canal de adquisición:

- Cantidad de clientes distintos
- Cantidad de devoluciones totales
- Tasa de devolución (devoluciones / pedidos)

El canal de adquisición lo defines como el tipo de campaña de la primera sesión del cliente. Si no tiene sesión registrada, lo marcas como "sin datos".

Para el viernes.

Diego
