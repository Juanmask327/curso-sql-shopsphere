# Nivel 0 — Fundamentos
## Lección 4: Aliases, comentarios y buenas prácticas — SQL que otros pueden leer

> Tablas disponibles en este nivel: `customers`, `orders`, `products`, `categories`

---

## 1. INTRODUCCIÓN CONCEPTUAL

### El problema de negocio: preparar un reporte limpio para Marco

Valentina te llama y te explica el contexto:

*"Marco necesita un reporte de clientes argentinos con su nombre completo, email y cuándo se registraron. Lo va a presentar en una reunión con inversores el viernes. No puede tener nombres de columnas técnicos como `first_name` o `signup_date` — tiene que verse como un reporte profesional."*

Tu query actual funciona correctamente:

```sql
SELECT first_name, last_name, email, signup_date
FROM customers
WHERE country = 'Argentina'
ORDER BY signup_date DESC;
```

Pero el output tiene este aspecto:

| first_name | last_name | email | signup_date |
|---|---|---|---|
| Luciana | Fernandez | luciana.fernandez@gmail.com | 2024-10-15 |

Para una reunión con inversores, ese resultado necesita verse así:

| Nombre | Apellido | Email de Contacto | Fecha de Registro |
|---|---|---|---|
| Luciana | Fernandez | luciana.fernandez@gmail.com | 2024-10-15 |

Y mejor todavía, el nombre completo en una sola columna:

| Cliente | Email de Contacto | Fecha de Registro |
|---|---|---|
| Luciana Fernandez | luciana.fernandez@gmail.com | 2024-10-15 |

Eso es lo que te permite hacer esta lección: transformar el output técnico en algo comunicable.

### ¿Por qué importan las buenas prácticas en SQL?

SQL no es solo para que lo ejecute la máquina. Lo leen personas: tus compañeros de equipo, tu jefa, analistas que vienen después que vos. Una query que solo vos podés entender no es un activo — es una deuda técnica.

Las tres herramientas de esta lección (aliases, comentarios y convenciones de formato) no hacen que tu query devuelva más datos. Hacen que tu query sea entendible, mantenible y profesional.

---

## 2. SINTAXIS

### 2.1 Aliases con AS — Renombrar columnas en el output

```sql
SELECT columna AS nombre_descriptivo
FROM tabla;
```

`AS` crea un alias: un nombre alternativo para una columna en el resultado. El alias **no modifica la base de datos** — solo cambia cómo se llama esa columna en el output de esa query específica.

**Aliases con y sin AS:**
```sql
-- Con AS (explícito, recomendado)
SELECT first_name AS nombre
FROM customers;

-- Sin AS (implícito, funciona pero es menos claro)
SELECT first_name nombre
FROM customers;
```

Ambas formas son válidas en SQLite. La forma con `AS` es más explícita y más legible — úsala siempre.

**Aliases con espacios — requieren comillas dobles:**
```sql
SELECT first_name AS "Nombre del Cliente"
FROM customers;
```

Si el alias tiene espacios, va entre comillas dobles. Pero en la práctica, es mejor usar guion bajo en lugar de espacios: `nombre_del_cliente`. Los aliases con espacios pueden causar problemas en herramientas que procesan el resultado automáticamente.

**Aliases en tablas:**
```sql
SELECT c.first_name, c.last_name
FROM customers c;
-- o equivalentemente:
FROM customers AS c;
```

También podés ponerle un alias a la tabla. Esto es especialmente útil cuando la query se vuelve larga y repetir el nombre completo de la tabla cada vez es tedioso. Se estudia más a fondo en el nivel de JOINs.

---

### 2.2 Concatenación — Combinar texto de múltiples columnas

En SQLite, el operador de concatenación de texto es `||` (doble pipe):

```sql
SELECT first_name || ' ' || last_name AS nombre_completo
FROM customers;
```

Esto une `first_name`, un espacio `' '` y `last_name` en una sola cadena de texto.

**Ejemplos de concatenación:**
```sql
-- Nombre completo
first_name || ' ' || last_name AS nombre_completo

-- Email con dominio
first_name || '@shopsphere.com' AS email_interno

-- Concatenar más de dos campos
'ID-' || customer_id || ': ' || first_name AS identificador
```

**Nota importante:** Si cualquiera de los valores concatenados es `NULL`, el resultado completo es `NULL`. Si `last_name` es NULL, `first_name || ' ' || last_name` devuelve NULL — no el primer nombre solo. Esto se maneja con `COALESCE`, que estudiaremos en el Nivel 4.

---

### 2.3 Comentarios — Documentar el código SQL

**Comentario de una línea:**
```sql
-- Esto es un comentario de una línea
SELECT first_name  -- también puede ir al final de una línea de código
FROM customers;
```

**Comentario de bloque:**
```sql
/*
  Este es un comentario de bloque.
  Puede ocupar múltiples líneas.
  Útil para describir el propósito de toda una query.
*/
SELECT first_name, last_name
FROM customers;
```

Los comentarios son ignorados completamente por el motor de base de datos — no afectan la ejecución ni el resultado. Solo existen para los humanos que leen el código.

---

### 2.4 El orden completo de cláusulas (consolidado)

```sql
SELECT   col1 AS alias1, col2 AS alias2  -- qué mostrar y cómo llamarlo
FROM     tabla t                          -- de dónde
WHERE    condicion                        -- qué filas
ORDER BY col1 DESC                        -- en qué orden
LIMIT    N                               -- cuántas filas máximo
OFFSET   M;                              -- desde cuál posición
```

---

## 3. EJEMPLO PRÁCTICO

### Ejemplo 1 — El reporte para Marco: nombre completo con alias descriptivos

```sql
SELECT
    first_name || ' ' || last_name  AS "Cliente",
    email                           AS "Email de Contacto",
    signup_date                     AS "Fecha de Registro"
FROM customers
WHERE country = 'Argentina'
ORDER BY signup_date DESC;
```

Output:

| Cliente | Email de Contacto | Fecha de Registro |
|---|---|---|
| Luciana Fernandez | luciana.fernandez@gmail.com | 2024-10-15 |
| Matias Lopez | matias.lopez@outlook.com | 2024-09-28 |
| Agustina Martínez | agustina.martinez@yahoo.com | 2024-08-03 |

El reporte ahora tiene columnas con nombres que cualquier persona puede leer sin conocer la estructura de la base de datos.

---

### Ejemplo 2 — Alias en tabla y en columnas

Cuando una query es larga, el alias de tabla reduce el ruido visual:

```sql
SELECT
    c.first_name  AS nombre,
    c.last_name   AS apellido,
    c.country     AS pais
FROM customers AS c
WHERE c.segment = 'premium'
ORDER BY c.last_name ASC;
```

El alias `c` es más corto que `customers`. La notación `c.columna` deja claro de qué tabla viene cada columna — esto se vuelve imprescindible en el Nivel 3 cuando combines múltiples tablas con JOINs.

---

### Ejemplo 3 — Comentarios para documentar una query de negocio

```sql
/*
  Reporte: Top 10 productos más caros del catálogo activo
  Solicitado por: Valentina Torres (Head of Analytics)
  Fecha: 2024-11-18
  Propósito: Revisión de política de precios para el segmento premium
*/

SELECT
    name    AS producto,       -- nombre del producto
    price   AS precio_usd,    -- precio en USD
    cost    AS costo_usd,     -- costo del producto
    sku     AS codigo_sku     -- código identificador
FROM products
WHERE is_active = 1           -- solo productos activos
ORDER BY price DESC           -- más caros primero
LIMIT 10;                     -- top 10 únicamente
```

Este nivel de documentación puede parecer excesivo para una query simple, pero cuando vuelvas a esta query en tres meses — o cuando alguien más la use — vas a agradecer haber escrito esas líneas.

---

### Ejemplo 4 — Concatenación con identificador

El equipo de soporte necesita un identificador único legible para cada cliente:

```sql
SELECT
    'CUST-' || customer_id          AS codigo_cliente,
    first_name || ' ' || last_name  AS nombre_completo,
    email                           AS contacto
FROM customers
ORDER BY customer_id ASC
LIMIT 20;
```

Output (primeras 3 filas):

| codigo_cliente | nombre_completo | contacto |
|---|---|---|
| CUST-1 | Fernanda Guerrero | fernanda.guerrero@yahoo.com |
| CUST-2 | Sofia Sanchez | sofia.sanchez@outlook.com |
| CUST-3 | Natalia Guerrero | natalia.guerrero@gmail.com |

---

### Ejemplo 5 — Query completa con todas las herramientas

Este es el tipo de query que ya podés escribir combinando todo lo aprendido en el Nivel 0:

```sql
/*
  Clientes premium de Latinoamérica para campaña de Sofía
  Solo Argentina, Colombia y México
  Ordenados por fecha de registro (más recientes primero)
*/

SELECT
    first_name || ' ' || last_name  AS nombre_completo,
    email                           AS email_contacto,
    country                         AS pais,
    signup_date                     AS fecha_registro
FROM customers
WHERE segment = 'premium'
  AND (
      country = 'Argentina'
   OR country = 'Colombia'
   OR country = 'Mexico'
  )
ORDER BY signup_date DESC
LIMIT 50;
```

Esta query está escrita para ser leída por otra persona. La indentación, los alias, los comentarios y los paréntesis explícitos comunican la intención — no solo el resultado.

---

## 4. CASOS DE USO REALES

**Caso 1 — Reportes para audiencias no técnicas**
Marco, Sofía y Ana no conocen la estructura de la base de datos. Cuando reciben un reporte con columnas llamadas `first_name`, `signup_date` o `is_active`, necesitan tiempo extra para interpretarlas. Los aliases convierten el output técnico en un documento comunicable. Lo usan Data Analysts que generan reportes ejecutivos.

**Caso 2 — Mantenimiento de queries en producción**
ShopSphere tiene queries que corren automáticamente todos los días para generar reportes operacionales. Cuando algo falla o necesita ajustarse, otro analista tiene que entender qué hace esa query sin haber estado en la reunión original donde se escribió. Los comentarios son la diferencia entre una hora de trabajo y un día entero de reversa de ingeniería. Lo usan Data Analysts y Data Engineers que mantienen pipelines.

**Caso 3 — Integración con herramientas de BI**
Power BI, Tableau y Metabase usan los nombres de columna del resultado SQL como etiquetas en gráficos y dashboards. Si la columna se llama `first_name`, el gráfico dice "first_name". Si se llama `Nombre del Cliente` (con alias), el gráfico ya tiene el label correcto. Los aliases en la query ahorran trabajo de configuración en la herramienta de BI. Lo usan Data Analysts y BI Developers.

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico

**Contexto:** Valentina necesita un reporte limpio del catálogo de categorías para una presentación. Quiere ver el ID de la categoría y su nombre, pero con columnas en español y descriptivas.

Escribe una query sobre la tabla `categories` que retorne:
- `category_id` con alias `id_categoria`
- `name` con alias `nombre_categoria`

Ordenadas alfabéticamente por nombre.

**Resultado esperado:** Una tabla con 2 columnas cuyos encabezados son `id_categoria` y `nombre_categoria`, con las 10 categorías ordenadas de A a Z.

**Criterio de éxito:** Los encabezados de columna son exactamente `id_categoria` y `nombre_categoria`. Hay 10 filas en orden alfabético.

---

### Ejercicio Intermedio

**Contexto:** Marco necesita un reporte para la reunión con el equipo comercial. Quiere ver los 15 productos más caros con:
1. Un código identificador en formato `PROD-{product_id}` (columna: `codigo`)
2. El nombre del producto (columna: `producto`)
3. El precio en USD (columna: `precio_usd`)
4. Solo productos activos (`is_active = 1`)

Incluí un comentario al inicio de la query explicando su propósito.

**Resultado esperado:** Una tabla con 3 columnas (`codigo`, `producto`, `precio_usd`), 15 filas con los productos activos más caros, ordenados de mayor a menor precio.

**Criterio de éxito:** La columna `codigo` tiene el formato `PROD-1`, `PROD-2`, etc. Solo aparecen productos activos. Hay exactamente 15 filas. Hay al menos un comentario en el código.

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
SELECT
    category_id  AS id_categoria,
    name         AS nombre_categoria
FROM categories
ORDER BY name ASC;
```

**Solución Ejercicio Intermedio:**
```sql
-- Reporte: Top 15 productos más caros del catálogo activo
-- Para: Marco Jiménez (CEO) — reunión equipo comercial

SELECT
    'PROD-' || product_id  AS codigo,
    name                   AS producto,
    price                  AS precio_usd
FROM products
WHERE is_active = 1
ORDER BY price DESC
LIMIT 15;
```

</details>

---

## 6. ERRORES COMUNES

**Error 1 — Usar el alias en el WHERE de la misma query**

```sql
-- INCORRECTO
SELECT
    price * 0.85 AS precio_con_descuento
FROM products
WHERE precio_con_descuento < 100;  -- el alias no existe todavía aquí
```

Error típico: `ERROR: no such column: precio_con_descuento`

El motor ejecuta las cláusulas en este orden interno: `FROM → WHERE → SELECT → ORDER BY`. Cuando evalúa `WHERE`, el alias todavía no fue calculado porque `SELECT` viene después. Para filtrar por un valor calculado, repetí la expresión completa:

```sql
-- CORRECTO
SELECT
    price * 0.85 AS precio_con_descuento
FROM products
WHERE price * 0.85 < 100;
```

Nota: en SQLite, a diferencia de PostgreSQL, sí se puede usar el alias en el `ORDER BY` — pero no en el `WHERE`.

---

**Error 2 — Alias con espacios sin comillas dobles**

```sql
-- INCORRECTO
SELECT first_name AS Nombre del Cliente
FROM customers;
```

Error típico: `ERROR: syntax error at or near "del"`

SQL interpreta `Nombre` como el alias y `del` como otra cosa — falla la sintaxis.

```sql
-- CORRECTO: comillas dobles para aliases con espacios
SELECT first_name AS "Nombre del Cliente"
FROM customers;

-- MEJOR PRÁCTICA: usar guion bajo, sin comillas
SELECT first_name AS nombre_del_cliente
FROM customers;
```

---

**Error 3 — Concatenar un número sin convertirlo a texto**

```sql
-- PUEDE DAR RESULTADOS INESPERADOS en algunos contextos
SELECT 'PROD-' || product_id AS codigo
FROM products;
```

En SQLite, la concatenación con `||` convierte automáticamente los números a texto, así que esto funciona. Pero en otros motores (PostgreSQL, MySQL) puede requerir una conversión explícita como `CAST(product_id AS TEXT)` o `product_id::TEXT`. Si en algún momento migrás esta query a otro sistema, recordá verificar este punto.

---

**Error 4 — Creer que el alias cambia el nombre de la columna en la tabla**

Un error conceptual común: pensar que `SELECT first_name AS nombre FROM customers` renombra la columna `first_name` a `nombre` en la tabla `customers`.

No. El alias es temporal y local a esa query. La tabla `customers` sigue teniendo la columna `first_name`. Si alguien más corre `SELECT first_name FROM customers` después, sigue funcionando igual. El alias solo existe en el resultado de esa query específica.

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

Ya tenés todas las herramientas del SQL de exploración: `SELECT`, `FROM`, `WHERE`, `ORDER BY`, `LIMIT`, `OFFSET`, aliases y comentarios. Con ellas podés explorar datos, filtrar con precisión y construir reportes legibles.

El paso siguiente introduce algo que cambia cualitativamente lo que podés responder: las **funciones de agregación**. Hasta ahora, cada fila de tu resultado corresponde a una fila de la tabla — un cliente, un producto, un pedido. Con `COUNT`, `SUM`, `AVG`, `MIN` y `MAX`, podés colapsar múltiples filas en un solo número. "¿Cuántos clientes hay en Argentina?" "¿Cuál es el precio promedio de los productos activos?" "¿Cuál es el monto total de pedidos este mes?" Esas preguntas no se pueden responder fila a fila — requieren agregar. Eso es el Nivel 2.
