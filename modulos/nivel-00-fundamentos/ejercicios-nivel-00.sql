-- ============================================================
-- SHOPSPHERE — NIVEL 0: FUNDAMENTOS SELECT
-- Ejercicios progresivos: SELECT, WHERE, ORDER BY, LIMIT, OFFSET, Aliases
-- Motor: SQLite
-- Tablas disponibles: customers, orders, products, categories
-- ============================================================
--
-- SCHEMA DE REFERENCIA RÁPIDA
--
-- customers  (customer_id, first_name, last_name, email, city, country, registered_at)
-- orders     (order_id, customer_id, ordered_at, status)
-- products   (product_id, name, category_id, price, is_active)
-- categories (category_id, name, description)
--
-- ============================================================


-- ============================================================
-- EJERCICIO 1: Ver todos los clientes
-- Dificultad: easy
-- Conceptos: SELECT *, FROM
-- Tablas: customers
-- ============================================================
--
-- Valentina acaba de darte acceso a la base de datos de ShopSphere.
-- Tu primer paso es explorar la tabla de clientes para entender
-- qué información está disponible antes de cualquier análisis.
--
-- PREGUNTA:
-- Escribe una query que retorne TODAS las columnas y TODOS los
-- registros de la tabla customers.
--
-- PISTAS:
-- 1. Usa el comodín * para seleccionar todas las columnas.
-- 2. No necesitas WHERE ni ORDER BY — queres ver todo.
--
-- Tu query aquí:


-- SOLUCIÓN:
SELECT *
FROM customers;


-- ============================================================
-- EJERCICIO 2: Ver columnas específicas de clientes
-- Dificultad: easy
-- Conceptos: SELECT columnas específicas, FROM
-- Tablas: customers
-- ============================================================
--
-- Sofía de Marketing necesita preparar una lista de contacto
-- básica. No necesita toda la información del cliente, solo
-- los datos imprescindibles para comunicarse con ellos.
--
-- PREGUNTA:
-- Escribe una query que retorne solo first_name, last_name,
-- email y country de todos los clientes.
--
-- PISTAS:
-- 1. Lista las columnas separadas por comas después de SELECT.
-- 2. El orden en que las listas determina el orden en el output.
--
-- Tu query aquí:


-- SOLUCIÓN:
SELECT first_name, last_name, email, country
FROM customers;


-- ============================================================
-- EJERCICIO 3: Usar alias AS para renombrar columnas
-- Dificultad: easy
-- Conceptos: AS alias, SELECT
-- Tablas: customers
-- ============================================================
--
-- Valentina necesita compartir el listado de clientes con el
-- equipo de ventas, que no conoce la base de datos. Los nombres
-- técnicos como "first_name" no les dicen nada.
--
-- PREGUNTA:
-- Escribe una query que retorne first_name, last_name, email
-- y country con aliases en español:
-- - first_name  → nombre
-- - last_name   → apellido
-- - email       → correo
-- - country     → pais
--
-- PISTAS:
-- 1. Usa AS después de cada nombre de columna para asignar el alias.
-- 2. Los aliases sin espacios no necesitan comillas.
--
-- Tu query aquí:


-- SOLUCIÓN:
SELECT
    first_name  AS nombre,
    last_name   AS apellido,
    email       AS correo,
    country     AS pais
FROM customers;


-- ============================================================
-- EJERCICIO 4: Limitar resultados con LIMIT
-- Dificultad: easy
-- Conceptos: LIMIT
-- Tablas: products
-- ============================================================
--
-- El catálogo de ShopSphere tiene muchos productos. Marco quiere
-- ver solo una muestra rápida de los primeros registros para
-- confirmar que el catálogo está cargado correctamente.
--
-- PREGUNTA:
-- Escribe una query que retorne las primeras 10 filas de la
-- tabla products, mostrando todas las columnas.
--
-- PISTAS:
-- 1. Usa LIMIT al final de la query.
-- 2. Sin ORDER BY, los "primeros" son los que el motor devuelve
--    por defecto — para exploración rápida está bien.
--
-- Tu query aquí:


-- SOLUCIÓN:
SELECT *
FROM products
LIMIT 10;


-- ============================================================
-- EJERCICIO 5: WHERE para filtrar por país
-- Dificultad: easy
-- Conceptos: WHERE, operador =, texto
-- Tablas: customers
-- ============================================================
--
-- Sofía está coordinando una campaña de email marketing para
-- el mercado mexicano. Necesita la lista de todos los clientes
-- de México con sus datos de contacto.
--
-- PREGUNTA:
-- Escribe una query que retorne first_name, last_name y email
-- de todos los clientes cuyo país sea México.
--
-- PISTAS:
-- 1. El valor del país en la base de datos es 'Mexico' (sin tilde).
-- 2. El texto en SQLite es case-sensitive: 'Mexico' != 'mexico'.
-- 3. Los valores de texto van entre comillas simples.
--
-- Tu query aquí:


-- SOLUCIÓN:
SELECT first_name, last_name, email
FROM customers
WHERE country = 'Mexico';


-- ============================================================
-- EJERCICIO 6: WHERE con texto — filtrar por status de pedido
-- Dificultad: easy
-- Conceptos: WHERE, operador =, texto
-- Tablas: orders
-- ============================================================
--
-- Diego de Operaciones necesita ver todos los pedidos que fueron
-- entregados exitosamente para calcular la tasa de entrega.
--
-- PREGUNTA:
-- Escribe una query que retorne order_id, customer_id, ordered_at
-- y status de todos los pedidos cuyo status sea 'delivered'.
--
-- PISTAS:
-- 1. El valor exacto del status es 'delivered' (en minúsculas).
-- 2. Los valores disponibles de status son:
--    'pending', 'shipped', 'delivered', 'cancelled'
--
-- Tu query aquí:


-- SOLUCIÓN:
SELECT order_id, customer_id, ordered_at, status
FROM orders
WHERE status = 'delivered';


-- ============================================================
-- EJERCICIO 7: WHERE con != — productos que NO son de una categoría
-- Dificultad: easy
-- Conceptos: WHERE, operador !=
-- Tablas: products
-- ============================================================
--
-- Ana de Finanzas está revisando el catálogo y quiere ver todos
-- los productos que NO pertenecen a la categoría 1, para analizar
-- la distribución del catálogo fuera de la categoría principal.
--
-- PREGUNTA:
-- Escribe una query que retorne product_id, name y category_id
-- de todos los productos cuyo category_id sea distinto de 1.
--
-- PISTAS:
-- 1. Usa el operador != (o <>) para "distinto de".
-- 2. category_id es un número — no necesita comillas.
--
-- Tu query aquí:


-- SOLUCIÓN:
SELECT product_id, name, category_id
FROM products
WHERE category_id != 1;


-- ============================================================
-- EJERCICIO 8: WHERE con AND — filtro combinado
-- Dificultad: easy
-- Conceptos: WHERE, AND
-- Tablas: customers
-- ============================================================
--
-- Sofía quiere enfocar la próxima campaña en clientes de Argentina
-- que además tengan ciudad registrada — para poder hacer envíos
-- con dirección completa.
--
-- PREGUNTA:
-- Escribe una query que retorne first_name, last_name, email
-- y city de los clientes que sean de Argentina Y que tengan
-- ciudad registrada (city no es NULL).
--
-- PISTAS:
-- 1. Necesitas dos condiciones en el WHERE unidas por AND.
-- 2. Ambas condiciones deben cumplirse al mismo tiempo.
-- 3. Para verificar que un valor no es nulo: columna IS NOT NULL
--
-- Tu query aquí:


-- SOLUCIÓN:
SELECT first_name, last_name, email, city
FROM customers
WHERE country = 'Argentina'
  AND city IS NOT NULL;


-- ============================================================
-- EJERCICIO 9: WHERE con OR — pedidos de múltiples canales
-- Dificultad: easy
-- Conceptos: WHERE, OR
-- Tablas: orders
-- ============================================================
--
-- El equipo de analytics necesita ver los pedidos que todavía
-- están en movimiento: los que están 'shipped' (enviados)
-- O los que están 'pending' (pendientes de procesamiento).
--
-- PREGUNTA:
-- Escribe una query que retorne order_id, status y ordered_at
-- de los pedidos cuyo status sea 'shipped' o 'pending'.
--
-- PISTAS:
-- 1. Usa OR para combinar las dos condiciones.
-- 2. Con OR, basta con que UNA de las condiciones sea verdadera.
--
-- Tu query aquí:


-- SOLUCIÓN:
SELECT order_id, status, ordered_at
FROM orders
WHERE status = 'shipped'
   OR status = 'pending';


-- ============================================================
-- EJERCICIO 10: WHERE con NOT — clientes fuera de un país
-- Dificultad: easy
-- Conceptos: WHERE, NOT, !=
-- Tablas: customers
-- ============================================================
--
-- Sofía está preparando una campaña global y quiere ver todos
-- los clientes excepto los de España, que tienen un equipo local
-- que los atiende por separado.
--
-- PREGUNTA:
-- Escribe una query que retorne first_name, last_name y country
-- de todos los clientes que NO sean de España.
--
-- PISTAS:
-- 1. Podés usar NOT con = o directamente usar el operador !=.
-- 2. El valor del país es 'Spain'.
-- 3. Ambas formas son equivalentes: NOT country = 'Spain' ó country != 'Spain'
--
-- Tu query aquí:


-- SOLUCIÓN:
SELECT first_name, last_name, country
FROM customers
WHERE country != 'Spain';


-- ============================================================
-- EJERCICIO 11: WHERE con comparación numérica — productos caros
-- Dificultad: easy
-- Conceptos: WHERE, operadores > < >= <=
-- Tablas: products
-- ============================================================
--
-- Ana de Finanzas quiere analizar los productos del segmento alto.
-- Considera que un producto es "caro" si su precio supera los $100.
--
-- PREGUNTA:
-- Escribe una query que retorne name y price de todos los
-- productos cuyo precio sea mayor a 100.
--
-- PISTAS:
-- 1. Usa el operador > para "estrictamente mayor que".
-- 2. Los números no llevan comillas: price > 100, no price > '100'.
--
-- Tu query aquí:


-- SOLUCIÓN:
SELECT name, price
FROM products
WHERE price > 100;


-- ============================================================
-- EJERCICIO 12: WHERE combinado AND/OR con paréntesis
-- Dificultad: medium
-- Conceptos: WHERE, AND, OR, paréntesis para prioridad
-- Tablas: products
-- ============================================================
--
-- Valentina está buscando productos económicos de categorías
-- específicas para incluir en una sección de "ofertas accesibles"
-- en el sitio. Quiere productos con precio menor a $50 que
-- pertenezcan a la categoría 2 O a la categoría 3.
--
-- PREGUNTA:
-- Escribe una query que retorne name, price y category_id de
-- los productos cuyo precio sea menor a 50, y que además
-- pertenezcan a la categoría 2 o a la categoría 3.
--
-- PISTAS:
-- 1. Necesitás AND para combinar el filtro de precio con el de categoría.
-- 2. Necesitás OR dentro de paréntesis para las dos categorías.
-- 3. Sin paréntesis, AND se evalúa antes que OR — el resultado sería incorrecto.
--
-- Tu query aquí:


-- SOLUCIÓN:
SELECT name, price, category_id
FROM products
WHERE price < 50
  AND (category_id = 2 OR category_id = 3);


-- ============================================================
-- EJERCICIO 13: ORDER BY ASC — clientes en orden alfabético
-- Dificultad: easy
-- Conceptos: ORDER BY, ASC
-- Tablas: customers
-- ============================================================
--
-- El equipo administrativo necesita la lista de clientes ordenada
-- alfabéticamente por apellido para un informe impreso. Cuando
-- el apellido es el mismo, deben ordenarse por nombre.
--
-- PREGUNTA:
-- Escribe una query que retorne first_name, last_name y email
-- de todos los clientes, ordenados por last_name de A a Z.
-- Si el apellido es igual, ordenar por first_name de A a Z.
--
-- PISTAS:
-- 1. Usa ORDER BY con múltiples columnas separadas por coma.
-- 2. ASC es el default — podés escribirlo o no, el resultado es el mismo.
--
-- Tu query aquí:


-- SOLUCIÓN:
SELECT first_name, last_name, email
FROM customers
ORDER BY last_name ASC, first_name ASC;


-- ============================================================
-- EJERCICIO 14: ORDER BY DESC — productos más caros primero
-- Dificultad: easy
-- Conceptos: ORDER BY, DESC
-- Tablas: products
-- ============================================================
--
-- Marco quiere revisar la política de precios del catálogo.
-- Necesita ver todos los productos ordenados de mayor a menor
-- precio para identificar rápidamente el segmento premium.
--
-- PREGUNTA:
-- Escribe una query que retorne name y price de todos los
-- productos, ordenados por precio de mayor a menor.
--
-- PISTAS:
-- 1. Usa ORDER BY price con la dirección DESC.
-- 2. DESC invierte el orden: los valores más altos aparecen primero.
--
-- Tu query aquí:


-- SOLUCIÓN:
SELECT name, price
FROM products
ORDER BY price DESC;


-- ============================================================
-- EJERCICIO 15: ORDER BY múltiple — pedidos por fecha y status
-- Dificultad: medium
-- Conceptos: ORDER BY, múltiples columnas, ASC/DESC combinados
-- Tablas: orders
-- ============================================================
--
-- Diego necesita ver todos los pedidos ordenados primero por
-- fecha (los más recientes primero), y cuando la fecha es la
-- misma, ordenados por status en orden alfabético ascendente.
-- Esto le permite ver rápidamente qué pasó en cada día.
--
-- PREGUNTA:
-- Escribe una query que retorne order_id, ordered_at y status
-- de todos los pedidos, ordenados por ordered_at descendente
-- (los más recientes primero) y luego por status ascendente.
--
-- PISTAS:
-- 1. Listá las dos columnas en ORDER BY separadas por coma.
-- 2. Cada columna puede tener su propia dirección ASC o DESC.
--
-- Tu query aquí:


-- SOLUCIÓN:
SELECT order_id, ordered_at, status
FROM orders
ORDER BY ordered_at DESC, status ASC, order_id ASC;


-- ============================================================
-- EJERCICIO 16: LIMIT + ORDER BY — top 5 más caros
-- Dificultad: easy
-- Conceptos: ORDER BY, LIMIT
-- Tablas: products
-- ============================================================
--
-- Ana de Finanzas quiere un reporte ejecutivo con los 5 productos
-- más caros del catálogo para revisar los márgenes del segmento
-- premium en la próxima reunión del directorio.
--
-- PREGUNTA:
-- Escribe una query que retorne name y price de los
-- 5 productos con mayor precio, ordenados de más caro a más barato.
--
-- PISTAS:
-- 1. Primero ordená por precio descendente.
-- 2. Luego limitá el resultado a 5 filas.
-- 3. ORDER BY va antes de LIMIT.
--
-- Tu query aquí:


-- SOLUCIÓN:
SELECT name, price
FROM products
ORDER BY price DESC
LIMIT 5;


-- ============================================================
-- EJERCICIO 17: Alias de tabla — notación tabla.columna
-- Dificultad: medium
-- Conceptos: alias de tabla, notación c.columna, AS en tabla
-- Tablas: customers
-- ============================================================
--
-- Valentina te pide que adoptes la convención de aliases de tabla
-- en todas tus queries, porque el equipo está empezando a trabajar
-- con JOINs y necesitan que el código sea consistente.
-- La convención es usar la inicial de la tabla como alias.
--
-- PREGUNTA:
-- Escribe una query que retorne first_name, last_name, country
-- y city de los clientes, usando 'c' como alias de la tabla
-- customers. Accedé a cada columna con la notación c.columna.
-- Filtrá solo los clientes de Mexico.
--
-- PISTAS:
-- 1. Asigná el alias en FROM: FROM customers AS c (o FROM customers c)
-- 2. En el SELECT y WHERE, usá c.first_name, c.country, etc.
-- 3. El alias hace que la query sea más explícita sobre el origen de cada dato.
--
-- Tu query aquí:


-- SOLUCIÓN:
SELECT c.first_name, c.last_name, c.country, c.city
FROM customers AS c
WHERE c.country = 'Mexico';


-- ============================================================
-- EJERCICIO 18: Concatenación — nombre completo
-- Dificultad: medium
-- Conceptos: concatenación ||, AS, SELECT expresiones
-- Tablas: customers
-- ============================================================
--
-- Marco necesita un reporte con el nombre completo de cada cliente
-- en una sola columna, no en dos separadas. El formato debe ser
-- "Nombre Apellido" (con un espacio entre los dos).
--
-- PREGUNTA:
-- Escribe una query que retorne:
-- - Una columna llamada 'nombre_completo' con first_name + ' ' + last_name
-- - El email del cliente (columna: correo)
-- - El país del cliente (columna: pais)
-- Filtrá solo los clientes de Colombia, ordenados alfabéticamente
-- por nombre_completo.
--
-- PISTAS:
-- 1. Usa el operador || para concatenar en SQLite.
-- 2. El espacio entre nombre y apellido es: ' ' (un espacio entre comillas simples).
-- 3. La sintaxis es: first_name || ' ' || last_name AS nombre_completo
--
-- Tu query aquí:


-- SOLUCIÓN:
SELECT
    first_name || ' ' || last_name  AS nombre_completo,
    email                           AS correo,
    country                         AS pais
FROM customers
WHERE country = 'Colombia'
ORDER BY nombre_completo ASC;


-- ============================================================
-- EJERCICIO 19: BETWEEN — productos en rango de precio
-- Dificultad: medium
-- Conceptos: BETWEEN, WHERE, rango numérico
-- Tablas: products
-- ============================================================
--
-- Sofía está diseñando una sección de "productos de valor medio"
-- en el sitio web — aquellos con precio entre $50 y $200 inclusive.
-- Quiere ver el nombre y precio de esos productos ordenados
-- de más barato a más caro.
--
-- PREGUNTA:
-- Escribe una query que retorne name y price de los productos
-- cuyo precio esté entre 50 y 200 (incluyendo esos valores extremos),
-- ordenados de menor a mayor precio.
--
-- PISTAS:
-- 1. BETWEEN incluye los extremos: BETWEEN 50 AND 200 equivale a >= 50 AND <= 200.
-- 2. La sintaxis es: WHERE price BETWEEN 50 AND 200
-- 3. También podés resolverlo con >= y <= combinados con AND.
--
-- Tu query aquí:


-- SOLUCIÓN:
SELECT name, price
FROM products
WHERE price BETWEEN 50 AND 200
ORDER BY price ASC;


-- ============================================================
-- EJERCICIO 20: Integrador — SELECT + WHERE + ORDER BY + LIMIT + Alias
-- Dificultad: medium
-- Conceptos: todos los conceptos del Nivel 0
-- Tablas: customers
-- ============================================================
--
-- Es el cierre del sprint y Valentina necesita un reporte final
-- para enviarle a Marco. El reporte debe mostrar los 20 clientes
-- Premium de Latinoamérica (Argentina, Colombia y México) que se
-- registraron más recientemente, con columnas en español y el
-- nombre completo en una sola columna.
--
-- PREGUNTA:
-- Escribe una query que retorne:
-- - nombre_completo: first_name || ' ' || last_name
-- - correo: email
-- - pais: country
-- - registro: registered_at
--
-- Filtrando por:
-- - Solo clientes de Argentina, Colombia o Mexico
-- - Solo los que tienen ciudad registrada (city IS NOT NULL)
--
-- Ordenados por registered_at descendente (más recientes primero)
-- y limitado a los primeros 20 resultados.
--
-- Incluí un comentario al inicio de la query explicando su propósito.
--
-- PISTAS:
-- 1. Usá paréntesis para el grupo de países con OR.
-- 2. Combiná AND para el segmento con el grupo de países.
-- 3. Concatená nombre y apellido con ||.
-- 4. ORDER BY + LIMIT al final.
--
-- Tu query aquí:


-- SOLUCIÓN:
-- Reporte: Top 20 clientes premium de Latinoamérica más recientes
-- Solicitado por: Valentina Torres para reunión con Marco Jiménez

SELECT
    first_name || ' ' || last_name  AS nombre_completo,
    email                           AS correo,
    country                         AS pais,
    registered_at                   AS registro
FROM customers
WHERE (
      country = 'Argentina'
   OR country = 'Colombia'
   OR country = 'Mexico'
  )
  AND city IS NOT NULL
ORDER BY registered_at DESC
LIMIT 20;
