# Nivel 1 — Exploración de Datos
## Lección 2: WHERE — Filtrar filas para responder preguntas precisas

> Tablas disponibles en este nivel: `customers`, `categories`, `products`

---

## 1. INTRODUCCIÓN CONCEPTUAL

### El problema que WHERE resuelve

Han pasado dos días en ShopSphere. Valentina te manda el primer pedido real:

> *"Necesito la lista de productos activos con precio mayor a $50. Marco quiere saber qué tenemos en el rango medio-alto antes de la reunión de esta tarde."*

Sin `WHERE`, tu única opción es traer los 80 productos y filtrarlos manualmente. Con `WHERE`, la base de datos hace ese trabajo por ti — y lo hace en milisegundos aunque la tabla tuviera 8 millones de productos.

**¿Qué hace WHERE?** Es una condición. Le dices a la base de datos: "de todas las filas de esta tabla, quiero solo las que cumplen esta condición". Las filas que no la cumplen simplemente no aparecen en el resultado.

**La analogía del buscador:** `SELECT * FROM products` es como entrar a una biblioteca y pedir todos los libros. `WHERE price > 50` es el filtro de búsqueda: "muéstrame solo los libros que cuestan más de $50". El buscador no mueve los libros de lugar — solo te muestra los que cumplen tu criterio.

---

## 2. SINTAXIS

### Forma canónica

```sql
SELECT columna1, columna2
FROM tabla
WHERE condicion;
```

La cláusula `WHERE` siempre va después de `FROM` y antes de `ORDER BY`, `GROUP BY` o `LIMIT`.

### Operadores de comparación

| Operador | Significado | Ejemplo |
|---|---|---|
| `=` | Igual a | `country = 'Mexico'` |
| `<>` o `!=` | Diferente de | `status <> 'cancelled'` |
| `>` | Mayor que | `price > 100` |
| `<` | Menor que | `price < 50` |
| `>=` | Mayor o igual que | `price >= 100` |
| `<=` | Menor o igual que | `price <= 50` |

### Operadores lógicos: AND, OR, NOT

```sql
-- AND: ambas condiciones deben cumplirse
WHERE price > 50 AND is_active = TRUE

-- OR: al menos una condición debe cumplirse
WHERE country = 'Mexico' OR country = 'Colombia'

-- NOT: invierte la condición
WHERE NOT is_active = TRUE
-- equivalente a:
WHERE is_active = FALSE
```

**Precedencia:** `NOT` se evalúa primero, luego `AND`, luego `OR`. Usa paréntesis para ser explícito:

```sql
-- Sin paréntesis: puede dar resultados inesperados
WHERE country = 'Mexico' OR country = 'Colombia' AND price > 100

-- Con paréntesis: intención clara
WHERE (country = 'Mexico' OR country = 'Colombia') AND price > 100
```

### BETWEEN: rangos inclusivos

```sql
WHERE price BETWEEN 50 AND 200
-- equivalente a: WHERE price >= 50 AND price <= 200
-- BETWEEN incluye ambos extremos (50 y 200)
```

Funciona con números, fechas y texto:
```sql
WHERE registered_at BETWEEN '2024-01-01' AND '2024-12-31'
```

### IN: lista de valores posibles

```sql
WHERE country IN ('Mexico', 'Colombia', 'Chile')
-- equivalente a: WHERE country = 'Mexico' OR country = 'Colombia' OR country = 'Chile'
-- mucho más legible cuando la lista es larga
```

También funciona con la negación:
```sql
WHERE country NOT IN ('Spain', 'USA')
```

### LIKE: patrones en texto

```sql
WHERE email LIKE '%@gmail.com'       -- termina en @gmail.com
WHERE name LIKE 'Smart%'             -- empieza con 'Smart'
WHERE email LIKE '%outlook%'         -- contiene 'outlook' en cualquier posición
WHERE first_name LIKE '_a%'          -- segunda letra es 'a' (_ representa exactamente un carácter)
```

`%` = cualquier cantidad de caracteres (incluyendo cero)
`_` = exactamente un carácter

**Nota sobre mayúsculas:** `LIKE` es sensible a mayúsculas en PostgreSQL. `LIKE 'smart%'` no encuentra 'Smartphone'. Usa `ILIKE` (PostgreSQL) o `LOWER(name) LIKE 'smart%'` para búsqueda sin distinción de mayúsculas.

### IS NULL / IS NOT NULL

```sql
WHERE city IS NULL         -- filas donde city no tiene valor
WHERE city IS NOT NULL     -- filas donde city sí tiene valor
```

**Nunca uses `= NULL`** — en SQL, `NULL = NULL` no es TRUE, es NULL. La única forma de comparar con NULL es con `IS NULL`.

---

## 3. EJEMPLO PRÁCTICO

### Contexto: Los primeros pedidos de análisis de Marco y Sofía

**Query 1 — Productos activos con precio mayor a $50 (pedido de Valentina para Marco)**

```sql
SELECT name, price, category_id
FROM products
WHERE is_active = TRUE
  AND price > 50
ORDER BY price DESC;
```

Output (primeras 5 filas):

| name | price | category_id |
|---|---|---|
| Laptop Lenovo IdeaPad 3 15" | 549.99 | 1 |
| Smartphone Samsung Galaxy A54 | 349.99 | 1 |
| Smartphone Xiaomi Redmi Note 13 | 219.99 | 1 |
| Monitor 24" LG Full HD | 219.99 | 1 |
| Reloj Deportivo Garmin Forerunner | 199.99 | 3 |

**Query 2 — Clientes registrados en México o Colombia (Sofía prepara una campaña regional)**

```sql
SELECT first_name, last_name, email, country
FROM customers
WHERE country IN ('Mexico', 'Colombia')
ORDER BY country, last_name;
```

Output (primeras 4 filas):

| first_name | last_name | email | country |
|---|---|---|---|
| Juan | Chavez | juan.chavez@outlook.com | Colombia |
| Jason | Green | jason.green@protonmail.com | Colombia |
| Paola | Lopez | paola.lopez@icloud.com | Colombia |
| Raul | Jimenez | raul.jimenez@yahoo.com | Colombia |

**Query 3 — Productos en rango de precio medio ($20 a $100) y activos**

```sql
SELECT name, price
FROM products
WHERE price BETWEEN 20 AND 100
  AND is_active = TRUE
ORDER BY price;
```

**Query 4 — Clientes sin ciudad registrada (diagnóstico de calidad de datos)**

```sql
SELECT customer_id, first_name, last_name, country
FROM customers
WHERE city IS NULL
ORDER BY country;
```

Este tipo de query es el primero que haría Diego Morales si necesita enviar comunicaciones geo-segmentadas: antes de segmentar, verifica cuántos registros tienen datos incompletos.

**Query 5 — Productos cuyo nombre contiene "Bluetooth" o empieza con "Smart"**

```sql
SELECT name, price
FROM products
WHERE name LIKE '%Bluetooth%'
   OR name LIKE 'Smart%';
```

Output:

| name | price |
|---|---|
| Auriculares Bluetooth JBL Tune 510 | 49.99 |
| Parlante Bluetooth Sony SRS-XB13 | 59.99 |
| Smartwatch ProX 3 Ultra | 89.99 |
| Smartwatch Samsung Galaxy Watch 4 | 149.99 |
| Smartband Xiaomi Mi Band 8 | 39.99 |

---

## 4. CASOS DE USO REALES

**Caso 1 — Segmentación de clientes para una campaña**
Sofía de Marketing lanza una campaña de email para clientes de México y Colombia registrados en 2024. Sin `WHERE`, tendría que exportar todos los clientes y filtrar en Excel. Con `WHERE country IN ('Mexico', 'Colombia') AND registered_at >= '2024-01-01'`, la base de datos entrega exactamente la lista que necesita.
*Rol que lo usa: Marketing Analyst, CRM Manager.*

**Caso 2 — Detección de anomalías y calidad de datos**
Diego de Operaciones nota que algunos reportes geográficos dan números inconsistentes. Sospecha que hay registros con datos faltantes. `WHERE city IS NULL` le dice exactamente cuántos clientes no tienen ciudad — y ese número informa la decisión de si vale la pena hacer una campaña de actualización de datos.
*Rol que lo usa: Data Analyst, Data Engineer.*

**Caso 3 — Revisión de catálogo antes de una reunión**
Marco quiere saber qué productos tiene ShopSphere en el segmento de precio medio antes de una reunión con un inversor. `WHERE price BETWEEN 30 AND 150 AND is_active = TRUE` entrega en segundos la respuesta que en Excel tomaría varios minutos de filtrado y riesgo de error.
*Rol que lo usa: Business Analyst, Product Manager.*

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico
**Contexto:** Valentina quiere revisar todos los productos de la categoría de Audio (category_id = 2) que estén activos.

Escribe una query que retorne el `name` y el `price` de todos los productos activos de la categoría 2 (Audio), ordenados del más barato al más caro.

**Resultado esperado:** Una tabla con productos de audio activos, con su nombre y precio, ordenados por precio ascendente. Deberías ver entre 7 y 9 productos.

**Criterio de éxito:** Solo aparecen productos de category_id = 2, todos tienen is_active = TRUE, y están ordenados de menor a mayor precio.

---

### Ejercicio Intermedio
**Contexto:** Sofía de Marketing está preparando una campaña para clientes nuevos de Latinoamérica. Define "Latinoamérica" como: Mexico, Colombia, Chile, Argentina, Peru, Bolivia. Quiere contactar a clientes registrados en 2024 que tengan su ciudad completada (no NULL), para enviar comunicación personalizada.

Escribe una query que retorne el `first_name`, `last_name`, `city`, `country` y `registered_at` de estos clientes. Ordena por país y luego por fecha de registro de más reciente a más antigua.

**Resultado esperado:** Una tabla con clientes latinoamericanos registrados en 2024 con ciudad conocida. Deben cumplirse todas las condiciones simultáneamente.

**Criterio de éxito:** No hay clientes de países fuera de la lista. No hay filas con city = NULL. Todos tienen registered_at en 2024. El orden es por country (A-Z) y dentro de cada país, por registered_at de más reciente a más antigua.

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
SELECT name, price
FROM products
WHERE category_id = 2
  AND is_active = TRUE
ORDER BY price ASC;
```

**Solución Ejercicio Intermedio:**
```sql
SELECT first_name, last_name, city, country, registered_at
FROM customers
WHERE country IN ('Mexico', 'Colombia', 'Chile', 'Argentina', 'Peru', 'Bolivia')
  AND registered_at >= '2024-01-01'
  AND registered_at < '2025-01-01'
  AND city IS NOT NULL
ORDER BY country ASC, registered_at DESC;
```

Nota sobre las fechas: `registered_at BETWEEN '2024-01-01' AND '2024-12-31'` también funciona y es igualmente correcto.

</details>

---

## 6. ERRORES COMUNES

**Error 1 — Usar `= NULL` en lugar de `IS NULL`**

```sql
-- INCORRECTO
SELECT * FROM customers WHERE city = NULL;
```
Resultado: 0 filas (aunque haya muchos NULLs en city).

Por qué falla: en SQL, cualquier comparación con NULL retorna NULL (no TRUE ni FALSE). La condición `NULL = NULL` es NULL, que es "desconocido", por lo tanto ninguna fila pasa el filtro.

```sql
-- CORRECTO
SELECT * FROM customers WHERE city IS NULL;
```

**Error 2 — Poner WHERE después de ORDER BY**

```sql
-- INCORRECTO
SELECT name, price FROM products
ORDER BY price
WHERE price > 100;
```
Error típico: `ERROR: syntax error at or near "WHERE"`

El orden obligatorio es: `SELECT ... FROM ... WHERE ... ORDER BY`. `WHERE` siempre va antes de `ORDER BY`.

**Error 3 — Comparar texto con números sin comillas**

```sql
-- INCORRECTO
SELECT * FROM customers WHERE country = Mexico;
```
Error típico: `ERROR: column "mexico" does not exist`

SQL interpreta `Mexico` (sin comillas) como el nombre de una columna, no como un valor de texto. Los valores de texto siempre van entre comillas simples: `'Mexico'`.

**Error 4 — AND/OR sin paréntesis en condiciones mixtas**

```sql
-- INTENCIÓN: productos de Electronics (cat 1) activos, O cualquier producto de Audio (cat 2)
-- INCORRECTO — la precedencia de AND hace que lea diferente a lo esperado
SELECT * FROM products
WHERE category_id = 1 OR category_id = 2 AND is_active = TRUE;
-- SQL lee esto como: category_id = 1 OR (category_id = 2 AND is_active = TRUE)
-- Devuelve TODOS los productos de cat 1, activos o no

-- CORRECTO — paréntesis explícitos
SELECT * FROM products
WHERE (category_id = 1 OR category_id = 2) AND is_active = TRUE;
```

La regla es simple: cuando mezclas `AND` y `OR`, siempre usa paréntesis. No confíes en la precedencia implícita.

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

Con `SELECT`, `FROM` y `WHERE` ya puedes extraer exactamente las filas y columnas que necesitas. Pero los resultados todavía pueden ser difíciles de interpretar: imagina que Valentina te pide los 10 productos más caros — sin poder ordenar el resultado y cortarlo en los primeros 10, tendrías que revisar toda la lista visualmente.

La Lección 3 introduce `ORDER BY`, `LIMIT` y `OFFSET`: el control del orden y la paginación. Son las herramientas que convierten un resultado correcto en un resultado presentable y usable.
