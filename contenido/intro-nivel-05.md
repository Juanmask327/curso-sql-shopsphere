# Introducción — Nivel 5: CTEs y Window Functions

Cuando Marco vio el análisis de clientes del Nivel 4, su respuesta fue previsible: "Está bien, pero quiero saber quiénes son nuestros mejores clientes en cada país, no en total."

Esa pregunta parece pequeña. Cambiar "en general" por "en cada país" multiplica la complejidad del análisis por cinco. Con las herramientas de los niveles anteriores puedes escribir cinco queries separadas — una por país — y pegar los resultados en Excel. Funciona. Pero no es cómo trabaja un analista senior.

Las Window Functions resuelven exactamente eso: calcular rankings, posiciones y comparaciones dentro de grupos definidos por ti, en una sola query. ROW_NUMBER, RANK, DENSE_RANK te permiten decirle a la base de datos "dame los tres mejores de cada país" sin necesidad de repetir el análisis cinco veces. NTILE te permite dividir cualquier conjunto en cuartiles — los productos del primer cuartil de ventas vs. el último, los clientes de alto valor vs. los que compran poco.

Las CTEs, por su parte, cambian la forma de estructurar el pensamiento: en lugar de anidar una query dentro de otra hasta que el código sea ilegible, defines pasos intermedios con nombre. Primero calculo el revenue por producto. Luego filtro sobre ese cálculo. Dos pasos, dos nombres, un resultado claro.

Diego también tiene algo pendiente: hay productos en inventario por debajo del mínimo de stock, y quiere verlos rankeados por urgencia antes de su reunión mensual con el equipo de compras.

Al terminar este nivel, podrás construir análisis que antes habrían requerido múltiples pasos en Excel — y hacerlo en una sola query.
