-- =============================================================
-- EJERCICIOS NIVEL 1 — Exploración de Datos
-- ShopSphere SQL Course
-- Tablas disponibles: customers, categories, products
-- =============================================================
-- Instrucciones:
--   1. Escribe tu query debajo de cada enunciado.
--   2. Ejecuta la query y verifica que el resultado coincide
--      con el criterio de éxito descrito en el comentario.
--   3. Las soluciones están al final del archivo (¡intenta
--      resolverlos antes de mirar!).
-- =============================================================


-- ---------------------------------------------------------------
-- BLOQUE A: SELECT y FROM (Lección 1)
-- ---------------------------------------------------------------

-- Ejercicio 01
-- Enunciado: Valentina quiere ver todo el contenido de la tabla
--   categories para entender cómo están estructuradas las
--   categorías de ShopSphere.
-- Criterio: Retorna todas las columnas y todas las filas de
--   categories. Deberías ver 10 filas.

-- Tu query aquí:


-- Ejercicio 02
-- Enunciado: Marco le pide a Valentina una lista limpia del
--   catálogo de productos. Solo necesita el product_id, el
--   nombre del producto y el precio. Sin columnas extras.
-- Criterio: 3 columnas exactas (product_id, name, price),
--   80 filas (todos los productos).

-- Tu query aquí:


-- Ejercicio 03
-- Enunciado: El equipo legal de ShopSphere necesita la lista
--   de emails únicos de todos los clientes para un proceso
--   de verificación. No pueden haber duplicados.
-- Criterio: Una columna (email), sin valores repetidos.
--   Cada email aparece exactamente una vez.

-- Tu query aquí:


-- Ejercicio 04
-- Enunciado: Sofía de Marketing quiere saber en cuántos países
--   diferentes opera ShopSphere (tiene clientes). Solo necesita
--   ver los nombres de los países, sin repeticiones, ordenados
--   alfabéticamente.
-- Criterio: Una columna (country), valores únicos, orden A-Z.

-- Tu query aquí:


-- Ejercicio 05
-- Enunciado: Para un reporte interno, Valentina necesita ver
--   el product_id, el nombre del producto renombrado como
--   'producto', y el precio renombrado como 'precio_usd'.
--   Solo de la tabla products.
-- Criterio: Dos columnas con alias: 'producto' y 'precio_usd'.
--   El product_id también aparece. 80 filas.

-- Tu query aquí:


-- ---------------------------------------------------------------
-- BLOQUE B: WHERE y filtros (Lección 2)
-- ---------------------------------------------------------------

-- Ejercicio 06
-- Enunciado: Diego de Operaciones necesita identificar todos
--   los productos inactivos del catálogo para una auditoría.
-- Criterio: Solo productos donde is_active = FALSE.
--   Columnas: name, price, is_active.

-- Tu query aquí:


-- Ejercicio 07
-- Enunciado: Marco quiere ver todos los productos cuyo precio
--   sea exactamente $14.99. Son productos en el rango más bajo
--   del catálogo.
-- Criterio: Solo filas con price = 14.99.

-- Tu query aquí:


-- Ejercicio 08
-- Enunciado: Sofía prepara una campaña para los países del
--   Cono Sur: Argentina, Chile y Uruguay. Necesita los emails
--   de todos los clientes de esos países.
-- Criterio: Solo clientes de Argentina, Chile o Uruguay.
--   Columnas: first_name, last_name, email, country.

-- Tu query aquí:


-- Ejercicio 09
-- Enunciado: Valentina quiere ver todos los productos activos
--   con precio entre $25 y $75 (inclusive en ambos extremos).
--   Estos son los productos de "rango medio" del catálogo.
-- Criterio: is_active = TRUE, price entre 25 y 75 inclusive.
--   Columnas: name, price, category_id.

-- Tu query aquí:


-- Ejercicio 10
-- Enunciado: El equipo de datos detectó que hay clientes sin
--   ciudad registrada. Valentina quiere ver cuántos son y de
--   qué países vienen. Lista todos esos clientes.
-- Criterio: Solo clientes donde city IS NULL.
--   Columnas: customer_id, first_name, last_name, country.

-- Tu query aquí:


-- Ejercicio 11
-- Enunciado: Sofía busca productos relacionados con auriculares
--   o audífonos para una campaña de audio. El nombre del
--   producto puede empezar con 'Auricular' o 'Audifonos'.
-- Criterio: Productos cuyo name empieza con 'Auricular' O
--   con 'Audifonos'. Columnas: name, price.

-- Tu query aquí:


-- Ejercicio 12
-- Enunciado: El equipo de Marketing quiere contactar clientes
--   con email de Gmail (terminan en '@gmail.com') que sean
--   de Mexico o Colombia, para una campaña digital dirigida.
-- Criterio: email LIKE '%@gmail.com', country en (Mexico, Colombia).
--   Columnas: first_name, last_name, email, country.

-- Tu query aquí:


-- Ejercicio 13
-- Enunciado: Valentina quiere ver todos los productos de las
--   categorías de Electrónica (1) y Audio (2) que estén activos
--   y cuesten más de $30.
-- Criterio: category_id IN (1,2), is_active = TRUE, price > 30.
--   Columnas: name, price, category_id.

-- Tu query aquí:


-- ---------------------------------------------------------------
-- BLOQUE C: ORDER BY, LIMIT y OFFSET (Lección 3)
-- ---------------------------------------------------------------

-- Ejercicio 14
-- Enunciado: Marco quiere saber cuáles son los 10 productos
--   más caros del catálogo completo (activos e inactivos).
--   En caso de empate en precio, ordena por nombre A-Z.
-- Criterio: 10 filas, ordenadas por price DESC, name ASC.
--   Columnas: name, price.

-- Tu query aquí:


-- Ejercicio 15
-- Enunciado: Valentina quiere ver los 5 clientes registrados
--   más recientemente, para un análisis de clientes nuevos.
-- Criterio: 5 filas, ordered por registered_at DESC.
--   Columnas: first_name, last_name, country, registered_at.

-- Tu query aquí:


-- Ejercicio 16
-- Enunciado: El catálogo web de ShopSphere muestra 8 productos
--   por página, ordenados por precio de mayor a menor. Escribe
--   la query que corresponde a la página 2 del catálogo,
--   solo con productos activos.
-- Criterio: 8 filas (o menos si no hay suficientes), registros
--   9-16 cuando se ordena por price DESC. Solo is_active = TRUE.

-- Tu query aquí:


-- Ejercicio 17
-- Enunciado: Sofía necesita los 3 productos activos más baratos
--   de la categoría de Libros (category_id = 7) para un
--   bundle de regalo económico.
-- Criterio: 3 filas, category_id = 7, is_active = TRUE,
--   ordenados por price ASC. Columnas: name, price.

-- Tu query aquí:


-- ---------------------------------------------------------------
-- BLOQUE D: Funciones escalares (Lección 4)
-- ---------------------------------------------------------------

-- Ejercicio 18
-- Enunciado: Para un reporte de marketing, Valentina necesita
--   el nombre completo de cada cliente (first_name + ' ' +
--   last_name) en una sola columna llamada 'nombre_completo',
--   junto con su email y país. Solo clientes de México.
-- Criterio: Columnas: nombre_completo, email, country.
--   Solo México. nombre_completo concatena las dos partes.

-- Tu query aquí:


-- Ejercicio 19
-- Enunciado: El equipo de contenido necesita el nombre de
--   cada producto en mayúsculas, el precio redondeado al
--   entero más cercano (sin decimales), y el category_id.
--   Solo productos activos. Ordena por el nombre en mayúsculas.
-- Criterio: Columnas: nombre_producto (UPPER), precio_entero
--   (ROUND sin decimales), category_id. Solo activos.

-- Tu query aquí:


-- Ejercicio 20
-- Enunciado: Valentina quiere construir un análisis de cohortes
--   por mes de registro. Necesita, para cada cliente de
--   Argentina: el nombre completo, el año de registro
--   (como número), el mes de registro (como número), y
--   el inicio del mes de registro (DATE_TRUNC) llamado
--   'cohorte'. Ordena por cohorte ascendente.
-- Criterio: Solo clientes de Argentina. Columnas:
--   nombre_completo, anio_registro, mes_registro, cohorte.
--   cohorte es una fecha (primer día del mes).

-- Tu query aquí:


-- =============================================================
-- SOLUCIONES
-- (Intenta resolver los ejercicios antes de leer esto)
-- =============================================================

/*
--- Solución 01 ---
SELECT *
FROM categories;

--- Solución 02 ---
SELECT product_id, name, price
FROM products;

--- Solución 03 ---
SELECT DISTINCT email
FROM customers;

--- Solución 04 ---
SELECT DISTINCT country
FROM customers
ORDER BY country ASC;

--- Solución 05 ---
SELECT product_id,
       name  AS producto,
       price AS precio_usd
FROM products;

--- Solución 06 ---
SELECT name, price, is_active
FROM products
WHERE is_active = FALSE;

--- Solución 07 ---
SELECT *
FROM products
WHERE price = 14.99;

--- Solución 08 ---
SELECT first_name, last_name, email, country
FROM customers
WHERE country IN ('Argentina', 'Chile', 'Uruguay')
ORDER BY country, last_name;

--- Solución 09 ---
SELECT name, price, category_id
FROM products
WHERE is_active = TRUE
  AND price BETWEEN 25 AND 75
ORDER BY price;

--- Solución 10 ---
SELECT customer_id, first_name, last_name, country
FROM customers
WHERE city IS NULL
ORDER BY country, last_name;

--- Solución 11 ---
SELECT name, price
FROM products
WHERE name LIKE 'Auricular%'
   OR name LIKE 'Audifonos%'
ORDER BY name;

--- Solución 12 ---
SELECT first_name, last_name, email, country
FROM customers
WHERE email LIKE '%@gmail.com'
  AND country IN ('Mexico', 'Colombia')
ORDER BY country, last_name;

--- Solución 13 ---
SELECT name, price, category_id
FROM products
WHERE category_id IN (1, 2)
  AND is_active = TRUE
  AND price > 30
ORDER BY category_id, price DESC;

--- Solución 14 ---
SELECT name, price
FROM products
ORDER BY price DESC, name ASC
LIMIT 10;

--- Solución 15 ---
SELECT first_name, last_name, country, registered_at
FROM customers
ORDER BY registered_at DESC
LIMIT 5;

--- Solución 16 ---
SELECT name, price
FROM products
WHERE is_active = TRUE
ORDER BY price DESC
LIMIT 8
OFFSET 8;

--- Solución 17 ---
SELECT name, price
FROM products
WHERE category_id = 7
  AND is_active = TRUE
ORDER BY price ASC
LIMIT 3;

--- Solución 18 ---
SELECT
    first_name || ' ' || last_name  AS nombre_completo,
    email,
    country
FROM customers
WHERE country = 'Mexico'
ORDER BY last_name;

--- Solución 19 ---
SELECT
    UPPER(name)          AS nombre_producto,
    ROUND(price)         AS precio_entero,
    category_id
FROM products
WHERE is_active = TRUE
ORDER BY nombre_producto;

--- Solución 20 ---
SELECT
    first_name || ' ' || last_name                     AS nombre_completo,
    EXTRACT(YEAR FROM registered_at)                   AS anio_registro,
    EXTRACT(MONTH FROM registered_at)                  AS mes_registro,
    DATE_TRUNC('month', registered_at)                 AS cohorte
FROM customers
WHERE country = 'Argentina'
ORDER BY cohorte ASC;
*/
