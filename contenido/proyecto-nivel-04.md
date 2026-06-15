# Proyecto — Nivel 4: Análisis post-crisis de devoluciones

---

**De:** Valentina Torres
**Para:** [Estudiante]
**Asunto:** Análisis formal — devoluciones julio 2025

Han pasado tres meses desde el spike de julio. Diego resolvió la parte operativa en su momento, pero nunca hicimos el análisis de fondo. Ahora que tenemos distancia y los datos completos de Q3 y Q4, quiero que lo hagamos bien.

No es urgente — es trabajo de investigación. No hay presentación el lunes. Lo que necesito es un análisis limpio que podamos usar como referencia cuando pase algo similar.

Estas son las preguntas que quiero responder:

**1. Clientes afectados y su valor**
¿Qué clientes tuvieron devoluciones con status 'approved' o 'refunded' durante julio 2025? Para cada uno, incluye su revenue total acumulado en toda su historia como cliente. Quiero ver si el problema concentró en clientes de alto valor o fue distribuido.

**2. Razones de devolución — completitud del registro**
Del total de devoluciones registradas en julio 2025, ¿cuántas tienen razón registrada y cuántas no? Muéstrame el conteo de cada razón disponible (usando el texto real del campo) más el total de registros sin razón. Si el campo está vacío, reemplázalo con la etiqueta 'Sin razón registrada' en el resultado.

**3. Revenue reembolsado por categoría en Q3 2025**
¿Cuánto revenue se reembolsó efectivamente (status 'refunded') por categoría en el trimestre completo julio–septiembre 2025? Incluye todas las categorías — las que no tuvieron reembolsos deben aparecer con valor 0, no omitirse.

**4. Clientes que devolvieron en julio y no volvieron a comprar**
De los clientes que tuvieron al menos una devolución en julio 2025, ¿cuáles no realizaron ningún pedido entre agosto y diciembre de 2025? Lista con nombre, email, país y su revenue histórico total. Esos son los que potencialmente perdimos.

**5. Clientes que devolvieron en julio y sí volvieron a comprar**
El contrapunto: ¿cuáles de los mismos clientes sí compraron después de su devolución de julio? Misma información. Quiero comparar los dos grupos.

**6. Productos de calzado con devoluciones — patrón por razón**
Filtra las devoluciones de productos en la categoría Calzado durante julio 2025. Para cada razón registrada, ¿cuántas devoluciones hubo? ¿Hay razones que se repiten de forma clara? Si alguna devolución de calzado no tiene razón registrada, inclúyela en el conteo como 'Sin razón registrada'.

---

El entregable es un documento con las seis queries y los resultados. Si encuentras algo que no te pedí pero que parece relevante, inclúyelo con una nota breve explicando qué es y por qué lo señalas.

— Vale
