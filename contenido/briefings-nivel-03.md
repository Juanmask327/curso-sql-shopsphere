# Briefings — Nivel 3: JOINs y relaciones entre tablas

> Ejercicios de INNER JOIN, LEFT JOIN y JOINs de múltiples tablas sobre order_items, products, categories, orders y customers.
> Los personajes ahora pueden hacer preguntas que antes eran imposibles: revenue por producto, ventas por categoría, clientes que nunca compraron.
> Urgencia más alta que en niveles anteriores — estas preguntas tienen consecuencias concretas de negocio.

---

## Briefing 3.1

**De:** Valentina Torres
**Para:** [Estudiante]
**Asunto:** Revenue por producto — respuesta para Marco

Marco mandó un mensaje hace una hora preguntando qué productos generan más revenue. Necesito los 10 productos con mayor revenue total de toda la historia de la base de datos. No por cantidad de unidades vendidas — por revenue total (precio unitario × cantidad vendida, sumado).

Nombre del producto, categoría y revenue total. Ordenado de mayor a menor.

Lo necesito antes del mediodía.

— Vale

---

## Briefing 3.2

**De:** Sofía Ramírez
**Para:** [Estudiante]
**CC:** Valentina Torres
**Asunto:** Categorías más vendidas — campaña Día de Madres (revenue + unidades)

Hola, necesito una vista más completa de la campaña de Día de Madres (5 al 10 de mayo). En el análisis anterior viste el revenue por categoría, pero ahora necesito entender también el volumen de unidades.

Para cada categoría que tuvo ventas en esos 6 días, necesito:
- Revenue total generado
- Total de unidades vendidas
- Número de pedidos distintos que incluyeron esa categoría

Quiero ver si hay categorías que generan mucho revenue con pocas unidades (ticket alto) versus categorías con volumen alto pero revenue moderado. Eso me va a decir dónde concentrar la próxima campaña.

¿Lo puedes tener para el miércoles?

Sofía

---

## Briefing 3.3

**De:** Diego Morales
**Para:** [Estudiante]
**Asunto:** Productos sin movimiento en los últimos 90 días

Estoy revisando el catálogo activo para la reunión con proveedores. Necesito identificar qué productos del catálogo no registraron ninguna venta en los últimos 90 días.

No me interesa saber cuánto vendieron — me interesa saber si vendieron algo o no. Lista de productos (nombre, categoría, precio) que aparecen en el catálogo pero no tienen ningún ítem en las órdenes de los últimos 90 días.

Si son muchos, filtra a los que tienen precio mayor a 50 USD. Esos son los que me preocupan de verdad.

— Diego

---

## Briefing 3.4

**De:** Ana Castillo
**Para:** [Estudiante]
**CC:** Valentina Torres
**Asunto:** Revenue real vs. revenue bruto — diferencia por devoluciones

Estoy cerrando el análisis de Q1 2026 para la junta. Necesito calcular el revenue que efectivamente se cobró, descontando los pedidos que fueron devueltos.

Específicamente: revenue total de pedidos completados en Q1 2026, desglosado por categoría de producto. No quiero incluir pedidos en estado "devuelto" ni "cancelado" en este cálculo.

Formato tabla: categoría | revenue neto Q1 2026. Ordenado por revenue descendente.

Gracias,
Ana Castillo

---

## Briefing 3.5

**De:** Marco Jiménez
**Para:** Valentina Torres
**Asunto:** El producto estrella

Vale, pregunta rápida: ¿cuál es el producto que más hemos vendido en toda la historia de la empresa? No en plata — en unidades. Ese es nuestro producto estrella y quiero mencionarlo en la presentación de inversores de la próxima semana.

Con nombre del producto y total de unidades vendidas me alcanza.

M

---

## Briefing 3.6

**De:** Valentina Torres
**Para:** [Estudiante]
**Asunto:** Clientes sin ninguna compra

Necesito una lista de clientes registrados que nunca han realizado un pedido. Nombre, email y país. Sofía quiere usarla para una campaña de reactivación — son clientes que se registraron pero nunca convirtieron.

No hay apuro pero sí es para esta semana. Si el número es mayor a 500 clientes, avísame antes de pasarle la lista a Sofía.

— Vale

---

## Briefing 3.7

**De:** Sofía Ramírez
**Para:** [Estudiante]
**Asunto:** Top productos — Black Friday 2025

Estoy armando el brief de Black Friday 2026 y necesito entender qué se vendió en el de 2025 (28 de noviembre de 2025).

Dame los 10 productos más vendidos ese día en unidades. Nombre del producto, categoría y total de unidades. Quiero saber si hubo productos de hogar premium entre los top sellers o si fue todo tecnología como siempre.

Sofía

---

## Briefing 3.8

**De:** Diego Morales
**Para:** [Estudiante]
**Asunto:** Revenue por categoría — volumen de unidades también

Para la reunión con proveedores necesito ver el desempeño de cada categoría en lo que va del año (enero–abril 2026). Dos métricas juntas:

- Revenue total por categoría
- Total de unidades vendidas por categoría

Las quiero en la misma tabla. Así puedo ver qué categorías tienen revenue alto con pocas unidades (margen alto por unidad) versus las que necesitan volumen para generar revenue.

Esta semana si puede ser.

— Diego

---

## Briefing 3.9

**De:** Ana Castillo
**Para:** [Estudiante]
**CC:** Valentina Torres
**Asunto:** Categorías sin ventas en abril 2026

Estoy validando la cobertura del catálogo para el reporte de abril. Necesito saber si hubo alguna categoría de producto que no registró ninguna venta en ese mes.

Lista de categorías que no aparecen en ningún ítem de pedidos de abril 2026. Si todas las categorías vendieron algo, dímelo también — eso es un dato relevante.

Gracias,
Ana Castillo

---

## Briefing 3.10

**De:** Valentina Torres
**Para:** [Estudiante]
**Asunto:** Pedidos con su detalle — muestra para validación

Necesito validar que la tabla de order_items está bien relacionada con orders. Dame una muestra de los últimos 20 pedidos con su detalle completo: fecha del pedido, nombre del cliente, nombre del producto, cantidad comprada y precio unitario de cada ítem.

Es para una revisión de calidad de datos, no para un análisis de negocio. Pero necesito que la query funcione bien porque la vamos a usar como base para otras cosas.

— Vale

---

## Briefing 3.11

**De:** Sofía Ramírez
**Para:** [Estudiante]
**CC:** Valentina Torres
**Asunto:** ¿Qué compra la gente junto con tecnología?

Hola, tengo una hipótesis: los clientes que compran productos de tecnología también compran accesorios o productos de otras categorías en el mismo pedido. Si eso es verdad, podemos hacer bundles.

Necesito: de todos los pedidos que incluyeron al menos un producto de la categoría Tecnología, ¿cuáles fueron las otras categorías que aparecieron en esos mismos pedidos? Conteo de cuántas veces aparece cada categoría "acompañando" a tecnología.

Esto no es urgente, pero sí quiero tenerlo antes del cierre de la semana.

Sofía

---

## Briefing 3.12

**De:** Diego Morales
**Para:** [Estudiante]
**Asunto:** Ticket promedio real por categoría

El ticket promedio que tenemos calculado es a nivel de pedido completo. Pero un pedido puede tener ítems de varias categorías. Necesito el ticket promedio a nivel de ítem: cuánto paga un cliente en promedio por cada producto que compra, agrupado por categoría.

Total de revenue de la categoría dividido entre el total de ítems vendidos de esa categoría. Eso me da el precio promedio real de venta por unidad.

Para el viernes.

— Diego
