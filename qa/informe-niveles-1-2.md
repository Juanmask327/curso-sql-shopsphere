## INFORME QA — Niveles 1 y 2
**Agente revisado:** `sql-teacher`
**Fecha de revisión:** 2026-06-01
**Veredicto Nivel 1:** ⚠️ APROBADO CON OBSERVACIONES
**Veredicto Nivel 2:** ⚠️ APROBADO CON OBSERVACIONES

---

## RESUMEN EJECUTIVO

El Nivel 1 (Exploración de Datos) está bien construido pedagógicamente: las queries son sintácticamente correctas, las columnas corresponden exactamente al schema canónico, y los 7 pasos del formato están presentes en las 4 lecciones. Se detecta un error de redacción confuso en los Errores Comunes de la Lección 3 que puede desorientar al estudiante.

El Nivel 2 (Métricas de Negocio) presenta un hallazgo crítico: la Lección 1 referencia la tabla `order_items` en su sección de Errores Comunes, tabla que pertenece al Nivel 3 y no está disponible en Nivel 2. Fuera de eso, el nivel está bien ejecutado: las queries de GROUP BY incluyen todas las columnas no agregadas, HAVING usa correctamente funciones de agregación, DATE_TRUNC y EXTRACT están bien empleados, y la columna `ordered_at` se usa consistentemente en los ejercicios temporales.

---

## HALLAZGOS NIVEL 1

### 🔵 SUGERENCIA — Hallazgo #1
**Componente:** `leccion-01.md` — Sección 5 (Ejercicio Propuesto), enunciado básico
**Problema:** El ejercicio básico pide "ordenadas alfabéticamente por nombre", pero el enunciado no menciona la cláusula `ORDER BY` como parte de lo que el estudiante debe aprender a escribir. A un estudiante de Lección 1 que aún no conoce `ORDER BY` (que se introduce formalmente en la Lección 3), el ejercicio le pide una cláusula que todavía no le fue enseñada.
**Impacto:** Puede generar confusión o frustración. El estudiante sabe `SELECT` y `FROM` (tema de la lección) pero no `ORDER BY`.
**Corrección:** Dos opciones: (a) eliminar el requisito de ordenamiento del ejercicio básico de Lección 1, o (b) añadir una nota breve que diga "Para ordenar, usa `ORDER BY columna ASC` — lo estudiaremos en detalle en la Lección 3". La solución (b) mantiene la integridad del ejercicio.

---

### 🟡 IMPORTANTE — Hallazgo #2
**Componente:** `leccion-03.md` — Sección 6 (Errores Comunes), Error 4
**Problema:** El comentario del bloque de código contiene una contradicción textual que confundirá al estudiante:
```sql
-- INCORRECTO: OFFSET 10 salta los primeros 10, mostrando registros 11-20 (correcto)
-- Pero muchos estudiantes usan OFFSET igual al número de página:
SELECT * FROM products LIMIT 10 OFFSET 2;  -- Esto muestra registros 3-12, no página 2
```
La línea 1 dice "INCORRECTO" pero luego añade "(correcto)" describiendo el comportamiento de `OFFSET 10`. El error real que se está mostrando es `OFFSET 2` (la segunda línea del bloque), no `OFFSET 10`. La estructura lógica del ejemplo está invertida: el código etiquetado "INCORRECTO" en realidad sería el correcto para página 2.
**Impacto:** Un estudiante que lea los comentarios con atención llegará a una conclusión errónea sobre cuándo `OFFSET 10` es correcto vs. incorrecto.
**Corrección:**
```sql
-- INTENCIÓN: mostrar la página 2 con 10 ítems por página

-- INCORRECTO: muchos estudiantes usan OFFSET igual al número de página
SELECT * FROM products LIMIT 10 OFFSET 2;
-- Esto muestra registros 3-12, no la página 2

-- CORRECTO: OFFSET 10 salta los primeros 10 registros, mostrando registros 11-20
SELECT * FROM products LIMIT 10 OFFSET 10;
```
La fórmula correcta siempre es: `OFFSET = (número_de_página - 1) * items_por_página`.

---

### 🔵 SUGERENCIA — Hallazgo #3
**Componente:** `leccion-04.md` — Sección 3 (Ejemplo Práctico), Query 4
**Problema:** La query de extracción de dominio de email es técnicamente correcta pero inusualmente compleja para Nivel 1:
```sql
RIGHT(email, LENGTH(email) - POSITION('@' IN email))  AS dominio
```
La lógica es válida: `POSITION('@' IN email)` devuelve la posición 1-based del `@`, y `LENGTH - POSITION` da los caracteres después del `@`. Sin embargo, anida 3 funciones (RIGHT, LENGTH, POSITION) sin explicar el razonamiento. En nivel introductorio, un ejemplo tan complejo puede oscurecer el punto pedagógico.
**Impacto:** El estudiante puede memorizar el patrón sin entenderlo. No rompe nada, pero reduce la claridad pedagógica.
**Corrección (sugerencia):** Añadir una línea de comentario que explique la lógica:
```sql
-- POSITION('@' IN email) devuelve la posicion del @, e.g. 18 para un email de 27 chars
-- LENGTH - POSITION = cuantos caracteres hay DESPUES del @
RIGHT(email, LENGTH(email) - POSITION('@' IN email))  AS dominio
```

---

### 🔵 SUGERENCIA — Hallazgo #4
**Componente:** `leccion-04.md` — Sección 6 (Errores Comunes), Error 3
**Problema:** La nota sobre `||` dice que "en PostgreSQL propaga NULL igual que CONCAT". Esta afirmación es técnicamente incorrecta. En PostgreSQL, el operador `||` con NULL devuelve NULL (igual que CONCAT sin COALESCE). La oración puede entenderse como que ambas se comportan igual (lo cual es cierto), pero el estudiante podría interpretar que existe alguna diferencia que no se está explicando.
**Impacto:** Confusión menor sobre el comportamiento de `||` vs `CONCAT` con NULLs.
**Corrección:** Reformular para que sea inequívoco:
```
O usa el operador ||, que en PostgreSQL también propaga NULL — el mismo comportamiento que CONCAT.
En ambos casos, COALESCE es la solución para NULLs.
```

---

### 🔵 SUGERENCIA — Hallazgo #5
**Componente:** `ejercicios-nivel-01.sql` — Ejercicio 03
**Problema:** El enunciado pide "la lista de emails únicos de todos los clientes para un proceso de verificación". El criterio dice "sin valores repetidos". En el schema canónico, `email` tiene constraint `UNIQUE NOT NULL`, lo que hace que `DISTINCT email` y `email` sean equivalentes. El ejercicio no es incorrecto, pero el criterio "sin valores repetidos" puede confundir: ¿hay duplicados de email posibles? No, por el constraint.
**Impacto:** Confusión conceptual menor. No es un error de SQL, es una ambigüedad de diseño de ejercicio.
**Corrección (opcional):** Cambiar el criterio de éxito a: "Una columna (email), 500 filas — todos los emails del sistema. En este caso DISTINCT no cambia el resultado porque email es único por constraint, pero el uso de DISTINCT es buena práctica defensiva."

---

## HALLAZGOS NIVEL 2

### 🔴 CRÍTICO — Hallazgo #6
**Componente:** `nivel-02-metricas/leccion-01.md` — Sección 6 (Errores Comunes), Error 3
**Problema:** El ejemplo de error usa la tabla `order_items`, que pertenece al Nivel 3 (no está disponible en Nivel 2):
```sql
-- Error 3 — AVG de enteros truncado inesperadamente
SELECT AVG(quantity) FROM order_items;
```
El encabezado del archivo declara correctamente: "Tablas disponibles en este nivel: customers, categories, products, orders". La tabla `order_items` se desbloquea en el Nivel 3. Mostrarla en Nivel 2 viola el sistema de desbloqueo progresivo del curso.
**Impacto:** El estudiante ve una tabla que no debería existir todavía en su universo. Si intenta ejecutar la query, obtendrá un error de tabla no encontrada (o peor: si ya tiene la tabla disponible en su entorno, creerá que está en el nivel correcto). Pedagógicamente invalida el sistema de progresión.
**Corrección:** Reemplazar el ejemplo con una tabla disponible en Nivel 2. La columna numérica más natural es `price` en `products`:
```sql
-- Error 3 — AVG de enteros truncado inesperadamente
-- En algunos motores (no en PostgreSQL, pero si en SQL Server y SQLite):
SELECT AVG(price) FROM products;
-- price es DECIMAL(10,2) en ShopSphere, por lo que PostgreSQL devuelve correctamente NUMERIC.
-- Pero si la columna fuera INTEGER, algunos motores truncan el resultado:
-- AVG de [1, 2, 3] puede dar 2 en lugar de 2.0

-- La solucion portable es hacer cast explicito:
SELECT AVG(price::DECIMAL) FROM products;
-- O para columnas enteras hipoteticas:
-- SELECT AVG(columna_entera::DECIMAL) FROM tabla;
```
Nota: el concepto sigue siendo válido y útil — solo hay que ejemplificarlo con `products.price` o crear un ejemplo hipotético sin referenciar `order_items`.

---

### 🟡 IMPORTANTE — Hallazgo #7
**Componente:** `nivel-02-metricas/leccion-02.md` — Sección 3 (Ejemplo Práctico), Query 1
**Problema:** La query de "pedidos por status" incluye una window function (`SUM(COUNT(*)) OVER ()`) en el código principal del ejemplo antes de inmediatamente descartarla con una nota:
```sql
SELECT
    status,
    COUNT(*)                    AS total_pedidos,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS pct_del_total
FROM orders
GROUP BY status
ORDER BY total_pedidos DESC;

Nota: La parte SUM(COUNT(*)) OVER () usa una window function para calcular el porcentaje
— técnica de Nivel 5. Por ahora, la versión sin porcentaje:
```
El problema no es la nota aclaratoria (que es bienvenida), sino que el código erróneamente aparece como versión principal antes de ser descartado. Un estudiante que copie el primer bloque sin leer la nota obtendrá un error de sintaxis si su motor no soporta window functions anidadas, o una query funcionalmente correcta pero que no entiende.
**Impacto:** Confusión sobre qué debe aprender en este nivel. El ejemplo principal de un tema debería ser siempre el código que el estudiante puede escribir con lo que conoce hasta ahora.
**Corrección:** Invertir el orden: presentar primero la versión sin porcentaje como código principal, y mover la versión con window function a una nota al pie o a un recuadro "Adelanto: Nivel 5":
```sql
-- Version que puedes escribir ahora (Nivel 2):
SELECT
    status,
    COUNT(*) AS total_pedidos
FROM orders
GROUP BY status
ORDER BY total_pedidos DESC;

-- Adelanto (Nivel 5 - Window Functions): para agregar el % del total en la misma query:
-- ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS pct_del_total
```

---

### 🟡 IMPORTANTE — Hallazgo #8
**Componente:** `nivel-02-metricas/leccion-03.md` — Sección 6 (Errores Comunes), Error 2
**Problema:** La lección afirma que usar el alias de SELECT en HAVING "funciona en PostgreSQL". Esto es incorrecto: PostgreSQL NO permite usar alias definidos en SELECT dentro de HAVING. Los aliases de SELECT sí funcionan en ORDER BY en PostgreSQL (como extensión), pero no en HAVING.
```sql
-- INCORRECTO en SQL estándar (funciona en PostgreSQL pero no en todos los motores)
SELECT country, COUNT(*) AS total
FROM customers
GROUP BY country
HAVING total > 20;    -- 'total' puede no estar definido aquí en algunos motores
```
**Impacto:** El estudiante aprende que puede usar el alias en HAVING en PostgreSQL, lo intenta, y obtiene un error. La confianza en la lección queda comprometida.
**Corrección:**
```sql
-- INCORRECTO en todos los motores SQL estándar, incluyendo PostgreSQL
SELECT country, COUNT(*) AS total
FROM customers
GROUP BY country
HAVING total > 20;    -- ERROR: columna "total" no existe en PostgreSQL

-- CORRECTO en todos los motores: repetir la expresion de agregacion
SELECT country, COUNT(*) AS total
FROM customers
GROUP BY country
HAVING COUNT(*) > 20;
```
La nota aclaratoria debe decir: "A diferencia de ORDER BY (donde PostgreSQL sí permite usar aliases definidos en SELECT), HAVING no acepta aliases en ningún motor SQL estándar."

---

### 🔵 SUGERENCIA — Hallazgo #9
**Componente:** `nivel-02-metricas/leccion-04.md` — Sección 3 (Ejemplo Práctico), Query 2
**Problema:** La columna `mes_numero = 12` muestra `pedidos_2024 = NULL` en el output de ejemplo. Esto es un dato de diciembre que puede o no estar en el dataset según la fecha de corte. El output no incluye ninguna nota que explique por qué diciembre 2024 podría ser NULL — si el seed efectivamente tiene datos hasta 2024-12-01, el estudiante verá un valor, no NULL.
**Impacto:** Confusión menor: el estudiante ve NULL en el ejemplo pero puede obtener un valor al ejecutar la misma query. No hay error técnico.
**Corrección (opcional):** Añadir una nota debajo del output: "Nota: diciembre 2024 puede mostrar NULL si el dataset no tiene pedidos de ese mes, o un valor si los tiene. El seed de ShopSphere tiene datos hasta 2024-12-01."

---

### 🔵 SUGERENCIA — Hallazgo #10
**Componente:** `nivel-02-metricas/ejercicios-nivel-02.sql` — Ejercicio 01
**Problema:** El criterio dice "Debe ser 2000." — número exacto que asume un dataset específico. Si el seed se regenera o cambia, el criterio quedará desactualizado. Los criterios de ejercicio son más robustos cuando describen propiedades (estructura, coherencia) en lugar de valores exactos.
**Impacto:** Bajo — es un criterio, no una query. Pero puede generar confusión si el dataset cambia.
**Corrección (opcional):** Cambiar a: "Una sola fila, una sola columna llamada 'total_pedidos'. El número debe coincidir con el total de registros en la tabla orders." O simplemente eliminar el número fijo y dejar que el estudiante valide contra sus datos.

---

## ASPECTOS POSITIVOS

**Nivel 1:**

- Adherencia perfecta al schema: todas las queries de los 4 archivos usan exclusivamente columnas documentadas en el schema canónico (`first_name`, `last_name`, `email`, `city`, `country`, `registered_at`, `category_id`, `name`, `description`, `product_id`, `price`, `is_active`). Cero usos de columnas inventadas o de otros niveles.

- La lección de NULL (Lección 2, `IS NULL / IS NOT NULL`) es técnicamente sólida y pedagógicamente muy clara. La frase "en SQL, `NULL = NULL` no es TRUE, es NULL" es exactamente la formulación correcta y difícil de malinterpretar.

- El sistema de soluciones al final de `ejercicios-nivel-01.sql` está bien estructurado: un bloque comentado `/* ... */` que separa claramente la zona de práctica de las respuestas. Los 20 ejercicios cubren uniformemente las 4 lecciones y progresan en complejidad dentro de cada bloque.

- El manejo de ORDER BY con alias en Lección 1 (Solución Ejercicio Intermedio) incluye correctamente la nota sobre portabilidad entre motores: es un detalle técnico valioso que el teacher incorpora en el lugar correcto.

- La analogía del menú (SELECT/FROM) y la del buscador (WHERE) son claras y no sobreexplican. La analogía de la lista de reproducción (LIMIT/OFFSET) es especialmente efectiva para el estudiante moderno.

**Nivel 2:**

- El orden de evaluación SQL (FROM > WHERE > GROUP BY > HAVING > SELECT > ORDER BY > LIMIT) está correctamente documentado en la Lección 2 con las 7 etapas completas, y las consecuencias prácticas (por qué no puedes usar un alias de SELECT en GROUP BY) están bien explicadas.

- La distinción WHERE vs HAVING se enseña tres veces a lo largo del nivel (en Lección 2 y dos veces en Lección 3) desde ángulos diferentes — repetición espaciada del concepto más difícil del nivel. Es el patrón pedagógico correcto.

- `COUNT(*) FILTER (WHERE ...)` se introduce consistentemente en Nivel 2 junto con la alternativa `SUM(CASE WHEN ...)`. Ofrecer ambas formas con la nota de portabilidad es una decisión pedagógica correcta y profesional.

- Los ejercicios de `ejercicios-nivel-02.sql` usan consistentemente `ordered_at` (columna correcta) y nunca `order_date` o variantes incorrectas. El ejercicio 25 (integrador) combina correctamente WHERE + GROUP BY + FILTER + HAVING + ORDER BY — es el ejercicio de cierre de nivel más completo revisado hasta la fecha.

- La advertencia sobre división entera (Lección 4, Error 4 y nota de la solución del ejercicio intermedio) con el uso explícito de `100.0` para forzar división decimal es técnicamente correcta y está bien ubicada donde el estudiante la necesita.

---

## PROXIMOS PASOS

### Correcciones bloqueantes (aplicar antes de publicar el nivel)

1. **[Hallazgo #6 - CRÍTICO]** Reemplazar `order_items` en el Error 3 de N2-L1 con un ejemplo usando `products`. Es la única corrección obligatoria antes de que el material sea usado por estudiantes.

2. **[Hallazgo #8 - IMPORTANTE]** Corregir la afirmación de que aliases en HAVING funcionan en PostgreSQL. Es factualmente incorrecta y el estudiante la va a verificar inmediatamente al ejecutar la query.

### Correcciones de calidad (aplicar en la siguiente revisión)

3. **[Hallazgo #2 - IMPORTANTE]** Corregir la redacción del Error 4 de N1-L3 (contradicción INCORRECTO / (correcto) en el mismo comentario).

4. **[Hallazgo #7 - IMPORTANTE]** Invertir el orden del ejemplo en N2-L2 Query 1: poner primero la versión sin window function como código principal.

### Mejoras opcionales

5. **[Hallazgo #1]** Agregar nota en el ejercicio básico de N1-L1 sobre ORDER BY, que aún no fue enseñado formalmente.

6. **[Hallazgos #3, #4, #5, #9, #10]** Mejoras menores de claridad pedagógica — ninguna altera la corrección técnica del material.

---

*Revisado por: `sql-data-analyst` (Modo QA)*
*Archivos revisados: 4 lecciones N1 + archivo de ejercicios N1 + 4 lecciones N2 + archivo de ejercicios N2 = 10 archivos*
