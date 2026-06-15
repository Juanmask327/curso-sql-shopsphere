# Mini-Proyecto Nivel 3: Top productos — análisis para la reunión de proveedores

---

**De:** Diego Morales
**Para:** [Estudiante]
**CC:** Valentina Torres
**Asunto:** Análisis de proveedores — reunión en 3 días

Tenemos reunión con los principales proveedores el próximo jueves. Vienen cuatro: el de electrónica (nuestro mayor proveedor en volumen), el de hogar, el que maneja calzado y deportes, y el nuevo de hogar premium que entramos en septiembre. Cada uno va a querer saber cómo le está yendo con nosotros y yo tengo que ir con los números encima de la mesa antes de que me pidan cosas.

Necesito que me prepares un análisis de desempeño por producto y categoría. Son cinco preguntas concretas. Si no tienes algo listo para el miércoles al mediodía, entro a esa reunión sin datos — y eso no es una opción.

---

**1. ¿Qué categorías generan más revenue y cuáles más volumen de unidades?**

Quiero ver las dos métricas juntas: revenue total y unidades vendidas, agrupadas por categoría, para toda la historia de la base de datos. No siempre el que más factura es el que más vende en unidades — necesito ver esa diferencia. Ordenado por revenue descendente.

**2. ¿Cuáles son los 15 productos con mayor revenue total?**

Nombre del producto, categoría a la que pertenece y revenue total generado (precio unitario × unidades vendidas, acumulado). Esto es lo que le voy a mostrar a cada proveedor para que vean cuáles de sus productos están jalando. Ordenado por revenue descendente.

**3. ¿Qué productos tienen volumen alto pero revenue bajo?**

Hay productos que se venden mucho en unidades pero generan poco revenue — eso normalmente indica un precio mal configurado o un descuento permanente que nadie revisó. Necesito los productos donde el total de unidades vendidas está en el cuartil superior pero el revenue total está en el cuartil inferior. No tiene que ser estadísticamente perfecto — con los 10 productos que más unidades vendieron pero menos revenue generaron me sirve para empezar la conversación.

**4. ¿Qué categorías no tuvieron ventas en los últimos 60 días?**

Si hay una categoría entera sin movimiento en dos meses, hay un problema — puede ser de stock, de visibilidad en la plataforma o de demanda. Necesito la lista de categorías que no aparecen en ninguna orden de los últimos 60 días. Si todas las categorías tienen ventas recientes, dímelo también.

**5. ¿Cuál es el revenue promedio por ítem vendido en cada categoría?**

Revenue total de la categoría dividido entre el total de ítems vendidos. Esto me da el precio promedio real de venta — no el precio de lista, sino lo que el cliente efectivamente pagó en promedio por cada unidad. Lo necesito para comparar contra los precios que los proveedores nos están cotizando para el próximo semestre.

---

**Formato esperado:** cinco tablas separadas, una por pregunta. Números sin redondear. Si encuentras algo que no cuadre — un producto con revenue negativo, una categoría con datos que parecen incorrectos, cualquier anomalía — inclúyelo con una nota antes de que yo llegue a la reunión sin saberlo.

— Diego
