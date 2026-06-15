# Proyecto — Nivel 5: Reporte de inventario crítico y rankings de producto

---

**De:** Diego Morales
**Para:** [Estudiante]
**Asunto:** Análisis para reunión con compras — junio 2026

El primer jueves de cada mes tengo reunión con el equipo de compras. Este mes llevo dos meses diciéndoles que el sistema de reposición tiene problemas — hay referencias que se quedan sin stock sin que nadie lo detecte a tiempo, y hay productos que seguimos comprando aunque no venden.

Necesito presentar datos que respalden los dos puntos. Acá está lo que quiero:

**1. Productos con stock crítico, rankeados por urgencia**
Define como crítico cualquier producto con stock menor a 10 unidades. Rankéalos de más urgente a menos urgente (menor stock = posición 1). Si hay empate en stock, el criterio de desempate es el revenue que ese producto generó en los últimos 3 meses — el que más vende tiene más urgencia. Para cada producto: nombre, categoría, stock actual, posición en el ranking y revenue reciente.

**2. Ranking de performance por categoría**
Para cada categoría, quiero ver el ranking de sus productos por revenue total histórico. Solo los primeros cinco de cada categoría. Con esto le mostramos a compras qué referencias son las que realmente mueven la categoría y cuáles están en el fondo.

**3. Productos en el cuartil inferior de ventas — candidatos a descontinuar**
Divide el catálogo completo en cuatro grupos iguales por revenue total. Los del primer cuartil (los que menos venden) son candidatos a revisar. Para cada uno: nombre, categoría, revenue total y stock actual. Si un producto tiene stock mayor a 20 unidades pero está en el cuartil inferior de ventas, márcalo — eso significa que compramos más de lo que vendemos.

**4. Categorías con mayor concentración de stock crítico**
¿Hay alguna categoría donde el problema de stock bajo se concentra más? Quiero saber, por categoría, cuántos productos tienen stock menor a 10 unidades y cuál es el stock promedio de esa categoría. Ordénalas por cantidad de productos críticos, de mayor a menor.

**5. Comparación: stock disponible vs. ventas recientes**
Para los productos con stock mayor a cero, quiero ver cuántos días de stock les quedan si el ritmo de ventas de los últimos 30 días se mantiene. El cálculo es: stock actual dividido por (unidades vendidas en los últimos 30 días). Si un producto no tuvo ventas en los últimos 30 días, márcalo como "sin movimiento reciente" — eso es igualmente relevante para compras.

**6. Top 3 productos con más revenue por país**
Compras quiere saber si los productos estrella varían por mercado o si son los mismos en todos los países. Dame el top 3 de productos por revenue en cada uno de los cinco países. Si un producto aparece en el top 3 de tres o más países, es un candidato prioritario para asegurar stock.

---

El entregable son las seis queries con sus resultados. Si los datos te muestran algo que no pedí pero que es relevante para la reunión con compras, inclúyelo con una nota breve. El análisis de inventario siempre tiene sorpresas.

— Diego
