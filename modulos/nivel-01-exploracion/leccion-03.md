# Nivel 1 — Exploración de Datos
## Lección 3: ORDER BY, LIMIT y OFFSET — Ordenar y paginar resultados

> Tablas disponibles en este nivel: `customers`, `categories`, `products`

---

## 1. INTRODUCCIÓN CONCEPTUAL

### El problema del resultado sin orden

Marco acaba de preguntarle a Valentina: *"¿Cuáles son los 5 productos más caros que vendemos?"*

Valentina te lo traslada en 30 segundos. Tienes la base de datos abierta. Con `SELECT name, price FROM products WHERE is_active = TRUE` obtienes los 80 productos activos — pero en el orden en que la base de datos decide devolverlos, que puede ser el orden de inserción, el del índice interno, o cualquier cosa. Para encontrar los 5 más caros tendrías que revisar los 80 manualmente.

`ORDER BY` es la instrucción que le dice a la base de datos en qué orden quieres los resultados. `LIMIT` te permite quedarte con los primeros N. `OFFSET` te permite saltar los primeros M (útil para paginar resultados).

**La analogía de la lista de reproducción:** `ORDER BY` es cuando ordenas tus canciones por fecha de lanzamiento, por artista o por las que más escuchas. `LIMIT` es decir "solo los primeros 10". `OFFSET` es decir "empieza desde el número 21" — que es exactamente lo que hace Spotify cuando cargas la segunda página de resultados.

**Un punto crítico que confunde a muchos:** sin `ORDER BY`, el orden del resultado en SQL es **indefinido**. No es el orden de inserción, no es el orden del ID, no es ningún orden garantizado. Si el orden importa — y casi siempre importa — siempre usa `ORDER BY`.

---

## 2. SINTAXIS

### ORDER BY

```sql
SELECT columna1, columna2
FROM tabla
WHERE condicion
ORDER BY columna_de_orden [ASC | DESC];
```

`ASC` (ascendente) es el valor por defecto — de menor a mayor para números, de A a Z para texto, de más antigua a más nueva para fechas.
`DESC` (descendente) es el inverso.

**Ordenar por múltiples columnas:**
```sql
ORDER BY columna1 ASC, columna2 DESC
```
Primero ordena por `columna1`. Cuando hay empates (mismo valor en `columna1`), resuelve el desempate usando `columna2`.

**Ordenar por posición de columna (no recomendado, pero existe):**
```sql
ORDER BY 2 DESC   -- ordena por la segunda columna del SELECT
```
Evítalo en código de producción: si cambias el orden de columnas en el SELECT, el ORDER BY apunta a la columna incorrecta sin avisar.

**NULL en ORDER BY:**
- En PostgreSQL, `ASC` pone los NULL al final por defecto.
- `DESC` los pone al principio por defecto.
- Puedes controlar esto explícitamente: `ORDER BY city ASC NULLS FIRST` o `NULLS LAST`.

### LIMIT

```sql
SELECT columna1
FROM tabla
ORDER BY columna1 DESC
LIMIT 10;
```

`LIMIT N` corta el resultado a los primeros N registros del resultado ya ordenado. **Siempre combínalo con `ORDER BY`** — sin ordenamiento previo, los "primeros 10" son arbitrarios.

### OFFSET

```sql
SELECT columna1
FROM tabla
ORDER BY columna1 DESC
LIMIT 10
OFFSET 20;
```

`OFFSET N` salta los primeros N registros antes de aplicar el LIMIT. La combinación `LIMIT 10 OFFSET 20` significa: "dame 10 registros empezando desde el registro 21".

**Uso típico de paginación:**
- Página 1: `LIMIT 10 OFFSET 0`
- Página 2: `LIMIT 10 OFFSET 10`
- Página 3: `LIMIT 10 OFFSET 20`

---

## 3. EJEMPLO PRÁCTICO

### Contexto: Marco quiere rankings rápidos del catálogo

**Query 1 — Los 5 productos más caros de ShopSphere**

```sql
SELECT name, price
FROM products
WHERE is_active = TRUE
ORDER BY price DESC
LIMIT 5;
```

Output:

| name | price |
|---|---|
| Laptop Lenovo IdeaPad 3 15" | 549.99 |
| Smartphone Samsung Galaxy A54 | 349.99 |
| Silla de Oficina Ergonomica MiDesk | 149.99 |
| Smartwatch Samsung Galaxy Watch 4 | 149.99 |
| Gafas Inteligentes Ray-Ban Stories | 149.99 |

Valentina mira el resultado y dice: "perfecto, pero la silla y los dos wearables tienen el mismo precio. ¿Los ordenamos también por nombre para el reporte?" Eso requiere un desempate:

```sql
SELECT name, price
FROM products
WHERE is_active = TRUE
ORDER BY price DESC, name ASC
LIMIT 5;
```

Ahora cuando hay empate en precio, el orden alfabético por nombre resuelve la ambigüedad.

**Query 2 — Los 10 clientes registrados más recientemente**

```sql
SELECT first_name, last_name, country, registered_at
FROM customers
ORDER BY registered_at DESC
LIMIT 10;
```

Output (primeras 3 filas):

| first_name | last_name | country | registered_at |
|---|---|---|---|
| Isabella | Ramirez | Argentina | 2024-11-20 |
| Lorena | Torres | Peru | 2024-11-18 |
| Pablo | Aguilar | Mexico | 2024-11-07 |

**Query 3 — Paginación: segunda página de productos ordenados por precio**

Imagina que una interfaz muestra 15 productos por página, ordenados de menor a mayor precio. Para la segunda página:

```sql
SELECT name, price
FROM products
WHERE is_active = TRUE
ORDER BY price ASC
LIMIT 15
OFFSET 15;
```

Esta query devuelve los registros del 16 al 30 — exactamente lo que va en la segunda página.

**Query 4 — Los 3 productos más económicos de cada segmento de precio**

```sql
-- Los 3 más baratos del catálogo completo
SELECT name, price
FROM products
ORDER BY price ASC
LIMIT 3;
```

Output:

| name | price |
|---|---|
| Cuerda de Saltar PVC | 9.99 |
| Medias Pack x6 Hanes | 14.99 |
| Crema Hidratante Nivea Q10 200ml | 14.99 |

---

## 4. CASOS DE USO REALES

**Caso 1 — Rankings para reportes ejecutivos**
Marco siempre quiere "los top 10" de algo: los 10 productos más vendidos, los 10 clientes más valiosos, las 10 categorías con más devoluciones. `ORDER BY ... LIMIT 10` es la base de todos esos rankings. En cualquier dashboard ejecutivo, los límites de filas son esenciales para hacer la información digestible.
*Rol que lo usa: Data Analyst, BI Developer.*

**Caso 2 — Paginación en aplicaciones web**
El frontend de ShopSphere muestra el catálogo de productos paginado: 20 productos por página. El backend usa `LIMIT 20 OFFSET (página - 1) * 20` para cargar solo lo que el usuario necesita ver. Sin paginación, una sola llamada a la API devolvería 8.000 productos — un problema de rendimiento grave.
*Rol que lo usa: Backend Engineer (este es un punto donde tu trabajo como analista y el trabajo del backend-engineer se tocan).*

**Caso 3 — Identificar extremos del dataset (control de calidad)**
Antes de cualquier análisis, un buen analista revisa los extremos: `ORDER BY price DESC LIMIT 5` muestra los productos más caros (¿hay alguno con precio absurdo?). `ORDER BY registered_at ASC LIMIT 5` muestra los clientes más antiguos. `ORDER BY registered_at DESC LIMIT 5` muestra los más nuevos. Estos extremos a menudo revelan errores de carga o outliers que distorsionan los análisis.
*Rol que lo usa: Data Analyst, Data Engineer.*

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico
**Contexto:** Valentina quiere hacer un listado rápido de los 8 clientes que se registraron primero en ShopSphere (los "pioneros" de la plataforma).

Escribe una query que retorne el `first_name`, `last_name`, `country` y `registered_at` de los 8 clientes con la fecha de registro más antigua.

**Resultado esperado:** 8 filas ordenadas de más antigua a más reciente fecha de registro. Los clientes más "viejos" de ShopSphere.

**Criterio de éxito:** Exactamente 8 filas. La primera fila tiene la fecha de registro más antigua del dataset. La última de las 8 filas es más reciente que la primera pero más antigua que los demás clientes.

---

### Ejercicio Intermedio
**Contexto:** El equipo de marketing quiere implementar un sistema de paginación para el catálogo de productos. La página 3 del catálogo muestra 12 productos activos por página, ordenados por precio de mayor a menor. Cuando hay empate en precio, se ordena por nombre de producto de A a Z.

Escribe la query que devuelve exactamente los productos de la página 3 bajo estas condiciones.

**Resultado esperado:** 12 productos activos, correspondientes a los registros del 25 al 36 cuando el catálogo se ordena por precio descendente (con desempate por nombre). Máximo 12 filas.

**Criterio de éxito:** Exactamente 12 filas (o menos si el catálogo no tiene suficientes productos en esa página). Todos los productos tienen is_active = TRUE. Los precios están ordenados de mayor a menor. El OFFSET es el correcto para la página 3 con 12 productos por página.

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
SELECT first_name, last_name, country, registered_at
FROM customers
ORDER BY registered_at ASC
LIMIT 8;
```

**Solución Ejercicio Intermedio:**
```sql
SELECT name, price
FROM products
WHERE is_active = TRUE
ORDER BY price DESC, name ASC
LIMIT 12
OFFSET 24;
```

Explicación del OFFSET: página 1 muestra registros 1-12 (OFFSET 0), página 2 registros 13-24 (OFFSET 12), página 3 registros 25-36 (OFFSET 24). Fórmula general: `OFFSET = (número_de_página - 1) * items_por_página`.

</details>

---

## 6. ERRORES COMUNES

**Error 1 — LIMIT sin ORDER BY (el "top" arbitrario)**

```sql
-- PELIGROSO: "los 5 productos más caros" sin ORDER BY
SELECT name, price
FROM products
LIMIT 5;
```

Este código no da error, pero el resultado es incorrecto para el propósito: los primeros 5 registros que retorna la base de datos no son necesariamente los más caros. El orden sin `ORDER BY` es indefinido y puede cambiar con cada ejecución o con actualizaciones en la tabla.

```sql
-- CORRECTO
SELECT name, price
FROM products
ORDER BY price DESC
LIMIT 5;
```

**Error 2 — OFFSET sin LIMIT**

```sql
-- SINTÁCTICAMENTE VÁLIDO pero casi nunca útil
SELECT * FROM products OFFSET 10;
```

Esto retorna todos los productos excepto los primeros 10. En datasets grandes, devuelve millones de filas sin corte. Casi siempre quieres `LIMIT` junto con `OFFSET`.

**Error 3 — ORDER BY una columna que no está en el SELECT (confusión sobre cuándo aplica)**

```sql
SELECT name, price
FROM products
ORDER BY category_id;
```

Esto es perfectamente válido en SQL estándar: puedes ordenar por una columna que no aparece en el SELECT. Sin embargo, en queries con `DISTINCT` o `GROUP BY`, las restricciones cambian. Para evitar confusiones, es buena práctica incluir la columna de ordenamiento en el SELECT cuando puedas.

**Error 4 — Calcular el OFFSET incorrectamente**

```sql
-- INTENCIÓN: mostrar la página 2 con 10 ítems por página

-- INCORRECTO: muchos estudiantes usan OFFSET igual al número de página
SELECT * FROM products LIMIT 10 OFFSET 2;
-- Esto muestra registros 3-12, no la página 2

-- CORRECTO: OFFSET 10 salta los primeros 10 registros, mostrando registros 11-20
SELECT * FROM products LIMIT 10 OFFSET 10;
```

La fórmula correcta siempre es: `OFFSET = (numero_de_pagina - 1) * items_por_pagina`.

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

Ahora puedes recuperar datos, filtrarlos y ordenarlos. Con estas tres herramientas ya puedes responder preguntas como "¿qué productos tenemos?" o "¿quiénes son nuestros clientes de Chile?".

Pero Valentina tiene preguntas más sofisticadas: "¿cuál es el email de los clientes cuyo nombre empieza con 'M' en mayúscula?", "¿cuántos caracteres tiene la dirección de email más larga?", "¿en qué mes se registró cada cliente?". Para responder esas preguntas necesitas las **funciones escalares** — operaciones que transforman el valor de una columna antes de mostrarlo. La Lección 4 te da ese set de herramientas: funciones de texto, numéricas y de fecha.
