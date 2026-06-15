# Introducción — Nivel 8: SQL Profesional

Ana Castillo lleva semanas esperando el análisis de pagos fallidos en Chile. Lo mencionó en el proyecto del Nivel 7. Lo volvió a mencionar por email el lunes. Esta semana lo necesita para cerrar el informe de Q1 2026 que va a la junta directiva.

El problema no es que el análisis no se pueda hacer. El problema es que la query que calcula el revenue neto tarda 45 segundos en correr. Y hay un campo en la tabla de pagos que tiene NULLs donde no debería haberlos — datos sucios que nadie ha limpiado porque nadie sabía que estaban ahí.

Hasta este punto del curso construiste el SQL que responde las preguntas. Este nivel es diferente. Aquí aprendes a construir el SQL que no rompe la empresa cuando alguien lo ejecuta en producción.

Los índices hacen que una query de 45 segundos corra en 0.3. EXPLAIN ANALYZE te dice exactamente por qué es lenta antes de que la optimices. Las transacciones garantizan que cuando actualizas el stock y registras un pedido al mismo tiempo, o suceden las dos cosas o no sucede ninguna. Eso no es un detalle técnico — es la diferencia entre un sistema confiable y uno que genera inconsistencias que nadie puede rastrear.

La tabla `payments` que entra en este nivel es la fuente de verdad financiera de ShopSphere. Con ella calculas el revenue real: no lo que se facturó, sino lo que efectivamente se cobró. Y la anomalía de Chile — esa concentración de pagos fallidos en marzo y abril — tiene un patrón que el análisis va a revelar.

Este es el nivel donde el SQL pasa de ser una herramienta analítica a ser una responsabilidad profesional.
