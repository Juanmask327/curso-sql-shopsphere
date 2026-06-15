# Introducción — Nivel 4: Análisis de comportamiento de clientes

En julio del año pasado la tasa de devolución de ShopSphere llegó al 8.3%. El doble del histórico. Diego actuó rápido — identificó al proveedor de calzado en Colombia, negoció, retiró las referencias problemáticas. La crisis operativa se resolvió en tres semanas.

Pero nadie analizó el patrón completo.

¿Qué clientes devolvieron ese mes? ¿Cuántos de ellos tenían historial de compras frecuentes y simplemente tuvieron una mala experiencia? ¿Hay clientes de alto valor que desde julio no han vuelto a comprar? ¿El problema fue solo calzado o hubo otras categorías con devoluciones silenciosas en ese mismo período?

Con los JOINs que aprendiste en el Nivel 3 puedes cruzar tablas. Pero para responder estas preguntas necesitas algo más: consultar dentro de consultas, comparar conjuntos de clientes, identificar ausencias en lugar de presencias. El cliente que nunca devolvió nada no aparece en la tabla de devoluciones — tienes que detectarlo por lo que no está.

Eso es lo que cambia en el Nivel 4.

Las subqueries te permiten anidar una pregunta dentro de otra. UNION te deja combinar dos listas distintas en un solo resultado. EXISTS te dice si algo ocurrió sin necesidad de traer todos los datos. Y el manejo de NULLs te permite encontrar exactamente los registros donde falta información — como las devoluciones sin razón registrada.

Al terminar este nivel podrás hacer el análisis que nadie hizo en julio. Y detectar el próximo problema antes de que Diego tenga que llamar a un proveedor.
