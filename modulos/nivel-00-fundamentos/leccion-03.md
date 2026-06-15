# Nivel 0 — Fundamentos
## Lección 3: ORDER BY, LIMIT y OFFSET — Controlar el orden y la cantidad

> Tablas disponibles en este nivel: `customers`, `orders`, `products`, `categories`

---

## 1. INTRODUCCIÓN CONCEPTUAL

### El problema de negocio: el equipo necesita el top 10 de productos más caros

Valentina te manda un email a las 9:00 AM:

*"Buenos días. Marco quiere revisar nuestra política de precios en el segmento premium antes de la reunión del jueves. Necesito el top 10 de productos más caros del catálogo — nombre y precio. Para las 10 AM si es posible."*

Ya sabes traer productos con `SELECT` y filtrar con `WHERE`. Pero si haces:

```sql
SELECT name, price
FROM products;
```

...obtienes todos los productos en el orden en que fueron insertados en la base de datos — que no es ni cronológico, ni alfabético, ni por precio. Es esencialmente aleatorio desde el punto de vista del negocio.

Para responder la pregunta de Marco necesitas dos cosas:
1. Ordenar los productos de mayor a menor precio
2. Quedarte solo con los primeros 10

Esas dos cosas las resuelven `ORDER BY` y `LIMIT`.

### ¿Por qué las bases de datos no tienen un orden "natural"?

Aquí hay un concepto importante que confunde a muchos principiantes: **las tablas en una base de datos relacional no tienen un orden garantizado**. El motor de base de datos almacena las filas de la manera más eficiente para sus operaciones internas — no necesariamente en el orden en que fueron insertadas, ni en ningún otro orden predecible.

Si corres la misma query dos veces sin `ORDER BY`, podrías obtener las filas en distinto orden. Esto no es un bug — es una propiedad del modelo relacional. El orden solo existe cuando lo defines explícitamente con `ORDER BY`.

**Regla práctica:** Si el orden de los resultados importa para tu análisis o reporte, siempre usá `ORDER BY`. Nunca asumas que el orden es el "correcto" sin definirlo.

---

## 2. SINTAXIS

### ORDER BY — Controlar el orden

```sql
SELECT columna1, columna2
FROM tabla
WHERE condicion
ORDER BY columna [ASC | DESC];
```

- `ASC` = orden ascendente (de menor a mayor, de A a Z, de más antiguo a más reciente). Es el **default** — si no lo escribes, SQL asume ASC.
- `DESC` = orden descendente (de mayor a menor, de Z a A, de más reciente a más antiguo).

**Orden con múltiples columnas:**
```sql
ORDER BY columna1 DESC, columna2 ASC
```

SQL ordena primero por `columna1`. Cuando dos filas tienen el mismo valor en `columna1`, las ordena por `columna2`. Podés agregar tantas columnas de orden como necesites, separadas por comas.

---

### LIMIT — Quedarse con los primeros N resultados

```sql
SELECT columna1, columna2
FROM tabla
ORDER BY columna DESC
LIMIT 10;
```

`LIMIT N` dice: "del resultado completo, dame solo las primeras N filas". Siempre se aplica **después** de que el orden ya está definido por `ORDER BY`. Si usás `LIMIT` sin `ORDER BY`, no sabés cuáles N filas te va a devolver — el resultado es impredecible.

---

### OFFSET — Saltar las primeras N filas (paginación)

```sql
SELECT columna1, columna2
FROM tabla
ORDER BY columna ASC
LIMIT 10 OFFSET 20;
```

`OFFSET N` le dice a SQL que se salte las primeras N filas antes de empezar a contar el `LIMIT`. Se usa principalmente para **paginación**: si tenés 100 resultados y querés mostrarlos de a 10, la página 1 tiene `LIMIT 10 OFFSET 0`, la página 2 tiene `LIMIT 10 OFFSET 10`, la página 3 tiene `LIMIT 10 OFFSET 20`, y así.

---

### El orden completo de cláusulas (hasta ahora)

```sql
SELECT   -- 1: qué columnas
FROM     -- 2: de qué tabla
WHERE    -- 3: filtro de filas
ORDER BY -- 4: cómo ordenar
LIMIT    -- 5: cuántas filas máximo
OFFSET;  -- 6: desde qué posición
```

Este orden es obligatorio. SQL falla si las cláusulas van en distinto orden.

---

## 3. EJEMPLO PRÁCTICO

### Ejemplo 1 — El pedido de Valentina: top 10 productos más caros

```sql
SELECT name, price
FROM products
ORDER BY price DESC
LIMIT 10;
```

Output (ejemplo con los 10 más caros):

| name | price |
|---|---|
| Monitor LG 27" 4K | 699.99 |
| Laptop Lenovo IdeaPad 3 15" | 549.99 |
| Smartphone Samsung Galaxy A54 | 349.99 |
| Tablet Samsung Galaxy Tab A8 | 279.99 |
| Smartphone Xiaomi Redmi Note 13 | 219.99 |
| ... (hasta 10 filas) | ... |

`ORDER BY price DESC` ordena de mayor a menor precio. `LIMIT 10` corta el resultado en los primeros 10. Marco tiene exactamente lo que necesita para la reunión.

---

### Ejemplo 2 — Ordenar por texto: clientes alfabéticamente

```sql
SELECT first_name, last_name, country
FROM customers
ORDER BY last_name ASC;
```

Output (primeras 3 filas):

| first_name | last_name | country |
|---|---|---|
| Valentina | Aguilar | Colombia |
| Marcela | Aguilar | Ecuador |
| Carlos | Alvarado | Mexico |

`ASC` es el default para texto — de A a Z. Si dos personas tienen el mismo apellido, aparecen en el orden en que estén en la tabla (a menos que agregues una segunda columna de orden).

---

### Ejemplo 3 — Orden múltiple: apellido y luego nombre

Cuando hay apellidos repetidos, el segundo criterio de orden desempata:

```sql
SELECT first_name, last_name, country
FROM customers
ORDER BY last_name ASC, first_name ASC;
```

Ahora si hay dos "García", el de nombre "Ana" aparece antes que el de nombre "Lucía".

---

### Ejemplo 4 — Ordenar pedidos por fecha (más reciente primero)

Diego quiere ver los pedidos más recientes primero para hacer seguimiento:

```sql
SELECT order_id, customer_id, order_date, status
FROM orders
ORDER BY order_date DESC;
```

Output (primeras 3 filas):

| order_id | customer_id | order_date | status |
|---|---|---|---|
| 487 | 312 | 2024-11-22 | pending |
| 492 | 156 | 2024-11-21 | shipped |
| 479 | 78 | 2024-11-20 | delivered |

Los pedidos más recientes aparecen primero — orden cronológico invertido.

---

### Ejemplo 5 — Combinar ORDER BY, LIMIT y WHERE

Valentina quiere el top 5 de productos más baratos entre los activos:

```sql
SELECT name, price
FROM products
WHERE is_active = 1
ORDER BY price ASC
LIMIT 5;
```

Nota SQLite: en SQLite, los valores booleanos se almacenan como enteros. `TRUE` se guarda como `1` y `FALSE` como `0`. Por eso la condición es `is_active = 1` y no `is_active = TRUE`.

Output (ejemplo):

| name | price |
|---|---|
| Cable USB-C 1m | 8.99 |
| Funda Silicona iPhone | 12.99 |
| Adaptador HDMI | 15.99 |
| Auriculares con cable | 19.99 |
| Teclado inalámbrico compacto | 24.99 |

---

### Ejemplo 6 — OFFSET para paginación

El equipo de soporte quiere ver clientes de a 10. La primera página:

```sql
SELECT customer_id, first_name, last_name
FROM customers
ORDER BY customer_id ASC
LIMIT 10 OFFSET 0;
```

La segunda página (clientes 11 al 20):

```sql
SELECT customer_id, first_name, last_name
FROM customers
ORDER BY customer_id ASC
LIMIT 10 OFFSET 10;
```

La tercera página (clientes 21 al 30):

```sql
SELECT customer_id, first_name, last_name
FROM customers
ORDER BY customer_id ASC
LIMIT 10 OFFSET 20;
```

La fórmula general es: `OFFSET = (número_de_página - 1) * tamaño_de_página`.

---

## 4. CASOS DE USO REALES

**Caso 1 — Rankings de producto o cliente**
Marco quiere saber cuáles son los 10 productos más caros para revisar la política de precios premium. Sofía quiere ver los 20 clientes que más compran. Diego quiere los 5 proveedores con mayor tasa de devoluciones. Todo eso es `ORDER BY + LIMIT`. Lo usan Data Analysts y Business Analysts en reportes ejecutivos.

**Caso 2 — Reportes ordenados para presentaciones**
Valentina necesita un reporte de categorías ordenado alfabéticamente para enviarlo al directorio. Ana necesita los productos ordenados de mayor a menor margen para el informe financiero trimestral. Los reportes deben tener un orden coherente — `ORDER BY` es lo que lo garantiza. Lo usan todos los roles que generan reportes.

**Caso 3 — Paginación en aplicaciones y dashboards**
La plataforma de ShopSphere muestra el catálogo de productos de a 20 por página. El backend usa `LIMIT 20 OFFSET (pagina * 20)` para generar cada página. Si tenés 200 productos, la página 5 es `LIMIT 20 OFFSET 80`. Lo usan desarrolladores backend y data engineers que construyen APIs o exportaciones.

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico

**Contexto:** Ana de Finanzas necesita un listado de los 5 productos más costosos del catálogo para una revisión de márgenes. Quiere ver el nombre del producto, su precio y su costo.

Escribe una query que retorne `name`, `price` y `cost` de los 5 productos con mayor precio, ordenados de más caro a más barato.

**Resultado esperado:** Una tabla con 3 columnas y exactamente 5 filas, ordenada de mayor a menor por `price`.

**Criterio de éxito:** El producto con mayor precio aparece en la primera fila. Hay exactamente 5 filas en el resultado.

---

### Ejercicio Intermedio

**Contexto:** El equipo de operaciones está revisando los clientes para una campaña de reactivación. Quieren ver los clientes de México en orden cronológico inverso — es decir, los que se registraron más recientemente primero. Por limitaciones del sistema, necesitan verlos de a 10, y ahora quieren ver el segundo grupo (posiciones 11 a 20).

Escribe una query que retorne `first_name`, `last_name`, `email` y `signup_date` de los clientes de México, ordenados por `signup_date` de más reciente a más antiguo, mostrando solo del registro 11 al 20.

**Pistas:**
1. Primero filtrá por país con `WHERE`
2. Luego ordená por fecha con `ORDER BY signup_date DESC`
3. Usá `LIMIT` y `OFFSET` para la paginación

**Resultado esperado:** Una tabla con 4 columnas y hasta 10 filas, con clientes mexicanos del 11 al 20 según el orden de `signup_date` descendente.

**Criterio de éxito:** Todas las filas son de México. Las fechas van de más reciente a más antigua. Hay máximo 10 filas (puede haber menos si hay menos de 20 clientes mexicanos en total).

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
SELECT name, price, cost
FROM products
ORDER BY price DESC
LIMIT 5;
```

**Solución Ejercicio Intermedio:**
```sql
SELECT first_name, last_name, email, signup_date
FROM customers
WHERE country = 'Mexico'
ORDER BY signup_date DESC
LIMIT 10 OFFSET 10;
```

Nota: La cláusula `WHERE` filtra primero, luego `ORDER BY` ordena el subconjunto filtrado, y finalmente `LIMIT` + `OFFSET` cortan el resultado paginado.

</details>

---

## 6. ERRORES COMUNES

**Error 1 — LIMIT sin ORDER BY: resultados impredecibles**

```sql
-- PELIGROSO: ¿cuáles son los "primeros" 10?
SELECT name, price
FROM products
LIMIT 10;
```

Sin `ORDER BY`, no hay garantía de qué 10 productos aparecen. El motor devuelve los 10 que le resultan más convenientes según su plan de ejecución interno. En bases de datos pequeñas puede parecer que siempre son los mismos, pero con bases grandes o después de operaciones de mantenimiento el orden puede cambiar.

```sql
-- CORRECTO: el orden está definido explícitamente
SELECT name, price
FROM products
ORDER BY price DESC
LIMIT 10;
```

---

**Error 2 — Poner ORDER BY antes de WHERE**

```sql
-- INCORRECTO: error de sintaxis
SELECT name, price
FROM products
ORDER BY price DESC
WHERE price > 100;
```

Error típico: `ERROR: syntax error at or near "WHERE"`

El orden de las cláusulas es fijo: `SELECT → FROM → WHERE → ORDER BY → LIMIT`. No se puede alterar.

```sql
-- CORRECTO
SELECT name, price
FROM products
WHERE price > 100
ORDER BY price DESC;
```

---

**Error 3 — OFFSET sin LIMIT**

```sql
-- INCORRECTO en SQLite (aunque válido en algunos otros motores)
SELECT name, price
FROM products
ORDER BY price DESC
OFFSET 10;
```

En SQLite, `OFFSET` requiere que `LIMIT` esté presente. Si querés saltar los primeros 10 y traer todo el resto, usá un número muy grande en `LIMIT` o reestructurá la query.

```sql
-- CORRECTO: saltear 10 y traer los siguientes 1000
SELECT name, price
FROM products
ORDER BY price DESC
LIMIT 1000 OFFSET 10;
```

---

**Error 4 — Confundir el índice de OFFSET (empieza en 0, no en 1)**

```sql
-- ERROR CONCEPTUAL: para ver del registro 1 al 10 (primera página)
LIMIT 10 OFFSET 1  -- incorrecto: saltea el primer registro y muestra del 2 al 11
```

`OFFSET 0` significa "no saltes nada — empieza desde el principio". Para la primera página de 10 resultados, el offset es 0. El error mental es pensar que los índices arrancan en 1 como en la vida cotidiana, cuando en bases de datos y en programación generalmente arrancan en 0.

```sql
-- CORRECTO
LIMIT 10 OFFSET 0  -- primera página: registros 1 al 10
LIMIT 10 OFFSET 10 -- segunda página: registros 11 al 20
LIMIT 10 OFFSET 20 -- tercera página: registros 21 al 30
```

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

Ya controlás qué columnas traer, qué filas incluir y en qué orden presentar los resultados. Tus queries funcionan, pero los nombres de las columnas en el output son los mismos que en la base de datos — `first_name`, `last_name`, `price` — que no siempre son legibles para quien va a recibir el reporte.

La Lección 4 te enseña a darle un aspecto profesional a tus resultados: `AS` para renombrar columnas con nombres descriptivos, la concatenación para combinar campos en una sola columna, y las convenciones que diferencian a un analista junior de uno senior. También cubre los comentarios en el código SQL — imprescindibles cuando tus queries crecen en complejidad.
