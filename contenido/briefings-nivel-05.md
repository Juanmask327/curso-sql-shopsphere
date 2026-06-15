# Briefings — Nivel 5: CTEs y Window Functions

> Ejercicios con CTEs simples, CTEs múltiples encadenadas, CTEs recursivas, y Window Functions: OVER(), PARTITION BY, ORDER BY dentro de OVER, ROW_NUMBER(), RANK(), DENSE_RANK() y NTILE(n).
> La tabla `inventory` es nueva en este nivel: inventory_id, product_id, stock, updated_at.
> Diego tiene peso alto porque el inventario es su tabla. Marco pide el análisis de clientes por país que no pudo responder con herramientas anteriores.

---

## Briefing 5.1

**De:** Diego Morales
**Para:** [Estudiante]
**Asunto:** Stock crítico — lista rankeada por urgencia

Antes de la reunión mensual con compras necesito saber qué productos tienen stock por debajo de 10 unidades, ordenados de menor a mayor stock. Los de stock cero primero — esos son los críticos.

Nombre del producto, categoría, stock actual y su posición en el ranking de urgencia. Si hay empate en stock, el criterio de desempate es el nombre del producto en orden alfabético.

Para el miércoles.

— Diego

---

## Briefing 5.2

**De:** Diego Morales
**Para:** [Estudiante]
**Asunto:** Ranking de stock por categoría

Quiero ver el estado del inventario por categoría. Para cada categoría, necesito saber qué producto tiene el stock más bajo — o sea, el más crítico dentro de ese grupo.

No me interesa el listado completo. Solo el producto con menor stock dentro de cada categoría, con su stock actual. Si hay dos productos con el mismo stock mínimo dentro de una categoría, muéstrame los dos.

— Diego

---

## Briefing 5.3

**De:** Diego Morales
**Para:** [Estudiante]
**Asunto:** Cuartiles de inventario — cuáles son candidatos a revisión

Necesito entender la distribución del stock en todo el catálogo. Divide los productos en cuatro grupos iguales por nivel de stock (de menor a mayor). El primer grupo son los de stock más bajo — esos son los candidatos a revisar primero.

Para cada producto del cuartil inferior: nombre, categoría y stock actual. Ordénalos por stock ascendente dentro del grupo.

— Diego

---

## Briefing 5.4

**De:** Valentina Torres
**Para:** [Estudiante]
**Asunto:** Ranking de productos por revenue dentro de cada categoría

Marco preguntó la semana pasada cuáles son los mejores productos de cada categoría. Necesito el ranking de productos por revenue total generado, pero dentro de su categoría — no en el catálogo general.

Para cada producto: nombre, categoría, revenue total y su posición dentro de la categoría (1 = mayor revenue). Solo los primeros tres de cada categoría.

— Vale

---

## Briefing 5.5

**De:** Valentina Torres
**Para:** [Estudiante]
**Asunto:** Primer pedido de cada cliente

Para un análisis de cohortes necesito identificar la fecha del primer pedido de cada cliente. No la cantidad de pedidos — solo la fecha exacta y el monto de ese primer pedido.

Nombre del cliente, país, fecha del primer pedido y monto de ese primer pedido. Todos los clientes que tienen al menos un pedido completado.

— Vale

---

## Briefing 5.6

**De:** Valentina Torres
**Para:** [Estudiante]
**Asunto:** Productos por encima del promedio de su categoría

Necesito identificar los productos que generan más revenue que el promedio de su categoría. La idea es simple: calcula el revenue promedio de los productos dentro de cada categoría, y dame la lista de los que están por encima de ese promedio.

Para cada producto: nombre, categoría, su revenue total y el promedio de la categoría. Ordénalos por categoría y dentro de cada categoría por revenue descendente.

— Vale

---

## Briefing 5.7

**De:** Marco Jiménez
**Para:** Valentina Torres
**Asunto:** Top 3 clientes por país

Vale, la semana pasada me diste el ranking general de clientes. Pero quiero saber quiénes son los tres mejores en cada país. México tiene su propio top 3, Colombia el suyo, etc.

Por cliente: nombre, país, revenue total y su posición dentro del país. Solo el top 3 de cada uno.

Gracias / M

---

## Briefing 5.8

**De:** Marco Jiménez
**Para:** Valentina Torres
**Asunto:** ¿Qué tan concentradas están nuestras ventas?

Una cosa que me pregunto: ¿qué porcentaje del revenue total viene del 25% de productos que más venden?

Quiero entender si dependemos mucho de pocos productos o si tenemos una base más distribuida. Dame el revenue que concentra el cuartil superior de productos vs. el resto.

M

---

## Briefing 5.9

**De:** Ana Castillo
**Para:** [Estudiante]
**CC:** Valentina Torres
**Asunto:** Concentración de revenue — top 20% de productos

Estoy preparando el análisis de riesgo de portafolio para el cierre de mayo. Necesito saber qué porcentaje del revenue total de ShopSphere proviene del 20% de productos con mayor revenue.

El procedimiento: primero rankea todos los productos por revenue total. Luego identifica los que caen en el quintil superior. Finalmente, calcula qué porcentaje del revenue total representan esos productos.

Un solo número como resultado, con el detalle del cálculo para que pueda verificarlo.

Gracias,
Ana Castillo

---

## Briefing 5.10

**De:** Ana Castillo
**Para:** [Estudiante]
**CC:** Valentina Torres
**Asunto:** Ranking de países por revenue neto (descontando devoluciones)

Para el informe de cierre Q1 2026 necesito el ranking de los cinco países donde operamos, ordenados por revenue neto. Revenue neto = revenue bruto de pedidos completados menos el monto de devoluciones con status 'refunded'.

Para cada país: revenue bruto, total reembolsado, revenue neto y su posición en el ranking. Si el revenue neto de algún país es negativo, quiero verlo igual — eso sería una anomalía que necesito documentar.

Gracias,
Ana Castillo

---

## Briefing 5.11

**De:** Sofía Ramírez
**Para:** [Estudiante]
**CC:** Valentina Torres
**Asunto:** Ranking de categorías para la campaña de invierno

Estoy definiendo en qué categorías vamos a concentrar el presupuesto de la campaña de invierno (junio–julio). Necesito saber el ranking de categorías por revenue en los últimos seis meses, pero quiero también ver el revenue de cada mes dentro de esa ventana — no solo el total.

Para cada categoría: su posición en el ranking general por revenue total últimos 6 meses, y el revenue mes a mes dentro del período. Así veo si una categoría tuvo picos puntuales o crecimiento sostenido.

Sofía

---

## Briefing 5.12

**De:** Sofía Ramírez
**Para:** [Estudiante]
**Asunto:** Clientes nuevos: ¿cuánto compraron en su primer mes?

Para entender qué tan bien estamos convirtiendo a clientes nuevos en compradores recurrentes, necesito analizar el comportamiento del primer mes de cada cliente.

Quiero saber: de cada cliente que se registró en los últimos 12 meses, cuánto gastó dentro de los primeros 30 días desde su registro. Luego rankéalos por ese monto. Los que están en el cuartil superior son los que mejor convirtieron desde el inicio — quiero perfilar qué tienen en común (país, primera categoría que compraron).

Sofía
