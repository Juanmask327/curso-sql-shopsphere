# Briefings — Nivel 4: Subqueries, operaciones de conjuntos y NULLs

> Ejercicios con subqueries escalares y de tabla, EXISTS / NOT EXISTS, IN con subquery, UNION / INTERSECT / EXCEPT, IS NULL / IS NOT NULL, COALESCE y NULLIF.
> El disparador narrativo es el spike de devoluciones de julio 2025. Diego lidera el nivel porque las devoluciones son su territorio.
> La tabla `returns` es nueva en este nivel. Incluye return_id, order_id, product_id, returned_at, reason y status (pending / approved / rejected / refunded).

---

## Briefing 4.1

**De:** Diego Morales
**Para:** [Estudiante]
**Asunto:** Clientes que devolvieron en julio — lista completa

Necesito revisar qué clientes tuvieron devoluciones en julio 2025. Quiero una lista con nombre del cliente, email, país y la cantidad de devoluciones que registró ese mes.

Solo los que devolvieron algo — no me interesa el universo completo de clientes.

— Diego

---

## Briefing 4.2

**De:** Diego Morales
**Para:** [Estudiante]
**Asunto:** Devoluciones sin razón registrada

Estoy auditando el proceso de devoluciones. Hay registros donde el campo de razón está vacío — o sea, el cliente devolvió pero no quedó asentado el motivo.

Necesito la lista de devoluciones donde `reason` es NULL: order_id, product_id, fecha de devolución y status actual. Ordénalas por fecha, de más reciente a más antigua.

Si son muchas, dime el total también.

— Diego

---

## Briefing 4.3

**De:** Diego Morales
**Para:** [Estudiante]
**Asunto:** Productos sin ninguna devolución aprobada

Para la reunión con el área de calidad quiero identificar los productos que nunca generaron una devolución aprobada. Esos son nuestros productos más confiables desde el punto de vista del cliente.

Lista de productos (nombre, categoría, precio) que no aparecen en ningún registro de devolución con status 'approved' o 'refunded'. Ordénalos por precio descendente — los de mayor precio primero, porque son los que más me interesan validar.

Para el viernes.

— Diego

---

## Briefing 4.4

**De:** Valentina Torres
**Para:** [Estudiante]
**Asunto:** Clientes de alto valor que devolvieron en julio

Necesito entender el perfil de los clientes que tuvieron devoluciones en julio 2025. Específicamente: ¿alguno de ellos tiene un revenue total acumulado (en todos sus pedidos históricos) por encima del promedio de clientes?

Quiero la lista de clientes que cumplan las dos condiciones a la vez: que hayan devuelto algo en julio 2025 y que su revenue histórico total sea mayor al promedio general de clientes. Incluye nombre, email, país y su revenue total acumulado.

Esto me va a decir si el problema de julio afectó a clientes que nos importa retener.

— Vale

---

## Briefing 4.5

**De:** Valentina Torres
**Para:** [Estudiante]
**Asunto:** Clientes que nunca han devuelto nada

Para un análisis de segmentación necesito identificar el grupo de clientes que tienen al menos un pedido completado pero nunca registraron ninguna devolución. Esos son nuestros clientes sin fricciones.

Nombre, email, país y total de pedidos completados. Ordénalos por total de pedidos completados, de mayor a menor.

— Vale

---

## Briefing 4.6

**De:** Valentina Torres
**Para:** [Estudiante]
**Asunto:** Motivo de devolución más frecuente

Necesito saber cuál es el motivo de devolución más frecuente en toda la historia de la tabla de devoluciones, excluyendo los registros donde el motivo no está cargado.

Un resultado: el motivo y cuántas veces aparece. Solo el primero.

— Vale

---

## Briefing 4.7

**De:** Ana Castillo
**Para:** [Estudiante]
**CC:** Valentina Torres
**Asunto:** Revenue perdido por devoluciones reembolsadas — Q3 2025

Estoy cerrando el análisis retroactivo de Q3 2025 (julio–septiembre). Necesito calcular el revenue que se perdió efectivamente por devoluciones con status 'refunded' en ese trimestre.

Por categoría de producto: cuánto revenue se reembolsó en total. Si una categoría no tuvo ningún reembolso en ese período, muéstrala igualmente con valor cero — no quiero que desaparezca de la tabla porque eso también es información.

Formato: categoría | revenue reembolsado Q3 2025. Ordenado por revenue reembolsado descendente.

Gracias,
Ana Castillo

---

## Briefing 4.8

**De:** Ana Castillo
**Para:** [Estudiante]
**CC:** Valentina Torres
**Asunto:** Órdenes donde el monto devuelto supera el 80% del pedido

Estoy revisando casos extremos de devolución para el análisis de riesgo financiero. Necesito identificar órdenes donde el valor total de los ítems devueltos (con status 'refunded') representa más del 80% del valor total del pedido.

Para cada caso: order_id, fecha del pedido, nombre del cliente, valor total del pedido, valor devuelto y el porcentaje que representa. Ordénalos por porcentaje descendente.

Si encuentras órdenes donde el valor devuelto supera el 100% del pedido, márcalos — eso indicaría un error de registro que necesito investigar por separado.

Gracias,
Ana Castillo

---

## Briefing 4.9

**De:** Sofía Ramírez
**Para:** [Estudiante]
**CC:** Valentina Torres
**Asunto:** Clientes que compraron en Q3 2025 pero no en Q4 2025

Hola, estoy diseñando la campaña de recuperación para el primer semestre 2026. Necesito entender cuántos clientes compraron durante el tercer trimestre de 2025 (julio–septiembre) pero no volvieron a comprar en el cuarto trimestre (octubre–diciembre).

Lista de esos clientes: nombre, email y país. Son el target principal de la campaña.

Sofía

---

## Briefing 4.10

**De:** Sofía Ramírez
**Para:** [Estudiante]
**Asunto:** Clientes activos en Q3 y Q4 2025 — retención real

Complementando lo que pedí antes: ahora necesito los clientes que sí compraron en ambos trimestres, Q3 y Q4 de 2025. Esos son los que retuvimos.

Quiero compararlos con la lista anterior para tener la foto completa: cuántos perdimos, cuántos mantuvimos.

Solo nombre, email y país.

Sofía

---

## Briefing 4.11

**De:** Marco Jiménez
**Para:** Valentina Torres
**Asunto:** ¿Cuántos clientes no volvieron después de una devolución?

Vale, tengo curiosidad por algo. De los clientes que tuvieron una devolución aprobada o reembolsada en los últimos 12 meses, ¿cuántos no realizaron ningún pedido después de esa devolución?

Con el número total me alcanza para la reunión, pero si hay algo raro dime.

M

---

## Briefing 4.12

**De:** Marco Jiménez
**Para:** Valentina Torres
**Asunto:** Clientes que devolvieron Y siguen comprando

La otra cara de lo anterior: ¿cuántos clientes que devolvieron algo en los últimos 12 meses sí volvieron a comprar después? Esos me interesan — son los que tuvieron una mala experiencia pero no se fueron.

Si puedes dame el número y el país donde se concentran.

M
