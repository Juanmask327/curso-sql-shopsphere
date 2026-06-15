# Nivel 0 — Fundamentos
## Lección 2: WHERE — Filtrar datos con precisión quirúrgica

> Tablas disponibles en este nivel: `customers`, `orders`, `products`, `categories`

---

## 1. INTRODUCCIÓN CONCEPTUAL

### El problema de negocio: Valentina necesita los clientes de Argentina

Es lunes por la mañana y Sofía Ramírez, Head of Marketing, te manda un mensaje directo:

*"Necesito la lista de clientes de Argentina lo antes posible. Estamos lanzando una campaña local el miércoles y tenemos que armar el segmento de envío de emails."*

Tú ya sabes cómo traer todos los clientes:

```sql
SELECT first_name, last_name, email
FROM customers;
```

Pero eso te da los 500 clientes de ShopSphere — de Venezuela, España, México, Colombia y todos los demás países. Sofía solo necesita los de Argentina. Mandarte los 500 y decirle "filtra vos" no es análisis, es delegación hacia arriba.

Necesitas una herramienta para decirle a la base de datos: *"Tráeme solo las filas que cumplen esta condición."*

Esa herramienta se llama `WHERE`.

### ¿Qué es WHERE y por qué existe?

`WHERE` es una cláusula que va después de `FROM` y que le indica a la base de datos qué condición debe cumplir cada fila para aparecer en el resultado. Las filas que no cumplen la condición simplemente no se incluyen.

**La analogía del filtro de café:** Imagina que la tabla completa es el agua caliente pasando por el café molido. `WHERE` es el filtro: deja pasar solo lo que cumple la condición (el café filtrado) y retiene el resto (el molido). Tú defines las mallas del filtro.

Sin `WHERE`, ves todo. Con `WHERE`, ves exactamente lo que buscas.

### Cuándo lo vas a necesitar

`WHERE` es la cláusula que más vas a usar en tu trabajo como analista en ShopSphere. Casi ninguna pregunta de negocio involucra todos los datos a la vez:

- "Clientes de Argentina" — WHERE country
- "Pedidos del último mes" — WHERE order_date
- "Productos con precio mayor a $100" — WHERE price
- "Órdenes canceladas" — WHERE status

Si `SELECT` y `FROM` son la base de toda query, `WHERE` es lo que hace que esa query responda una pregunta específica.

---

## 2. SINTAXIS

### Forma canónica

```sql
SELECT columna1, columna2
FROM tabla
WHERE condicion;
```

**Parámetros obligatorios:**
- La condición después de `WHERE` (una expresión que evalúa a verdadero o falso)

**Orden de las cláusulas — esto es no negociable:**
```sql
SELECT  -- 1ro: qué columnas
FROM    -- 2do: de qué tabla
WHERE   -- 3ro: qué condición deben cumplir las filas
```

Si pones `WHERE` antes de `FROM`, la query falla con error de sintaxis.

---

### Operadores de comparación

Estos son los operadores que usas dentro de la condición `WHERE`:

| Operador | Significado | Ejemplo |
|----------|------------|---------|
| `=` | igual a | `country = 'Argentina'` |
| `!=` o `<>` | distinto de | `status != 'cancelled'` |
| `>` | mayor que | `price > 100` |
| `<` | menor que | `price < 50` |
| `>=` | mayor o igual que | `price >= 100` |
| `<=` | menor o igual que | `price <= 49.99` |

**Importante para texto en SQLite:** Los valores de texto van siempre entre comillas simples `'valor'`. Nunca comillas dobles para valores. El texto es case-sensitive en SQLite: `'Argentina'` y `'argentina'` son cosas distintas.

---

### Combinar condiciones: AND, OR, NOT

Puedes combinar múltiples condiciones con operadores lógicos:

**AND** — ambas condiciones deben ser verdaderas:
```sql
WHERE country = 'Argentina' AND segment = 'premium'
```

**OR** — al menos una condición debe ser verdadera:
```sql
WHERE country = 'Argentina' OR country = 'Chile'
```

**NOT** — niega la condición:
```sql
WHERE NOT country = 'Spain'
-- equivalente a:
WHERE country != 'Spain'
```

---

### Paréntesis para controlar la prioridad

Cuando mezclas `AND` y `OR`, los paréntesis son críticos. Sin ellos, SQL evalúa `AND` antes que `OR` — lo que puede darte resultados completamente distintos a los que esperabas.

```sql
-- Sin paréntesis: AND se evalúa primero
-- Esto filtra: (Argentina Y premium) O Chile (cualquier segmento)
WHERE country = 'Argentina' AND segment = 'premium' OR country = 'Chile'

-- Con paréntesis: intención explícita
-- Esto filtra: (Argentina O Chile) Y que sea premium
WHERE (country = 'Argentina' OR country = 'Chile') AND segment = 'premium'
```

**Regla:** cuando tengas dudas, pon paréntesis. Son gratuitos y eliminan la ambigüedad.

---

## 3. EJEMPLO PRÁCTICO

### Ejemplo 1 — El pedido de Sofía: clientes de Argentina

```sql
SELECT first_name, last_name, email
FROM customers
WHERE country = 'Argentina';
```

Output (primeras 3 filas):

| first_name | last_name | email |
|---|---|---|
| Luciana | Fernandez | luciana.fernandez@gmail.com |
| Matias | Lopez | matias.lopez@outlook.com |
| Agustina | Martínez | agustina.martinez@yahoo.com |

La base de datos evaluó cada uno de los 500 registros de `customers` y devolvió solo los que tienen `country = 'Argentina'`. El resto no existe en el resultado.

---

### Ejemplo 2 — Filtro numérico: productos caros

Valentina quiere revisar los productos premium antes de una reunión con proveedores:

```sql
SELECT name, price
FROM products
WHERE price > 500;
```

Output (ejemplo):

| name | price |
|---|---|
| Laptop Lenovo IdeaPad 3 15" | 549.99 |
| Monitor LG 27" 4K | 699.99 |
| Smartphone Samsung Galaxy A54 | 349.99 |

---

### Ejemplo 3 — Combinar condiciones con AND

Sofía refina su pedido: ahora quiere solo los clientes de Argentina que pertenezcan al segmento 'premium':

```sql
SELECT first_name, last_name, email, segment
FROM customers
WHERE country = 'Argentina'
  AND segment = 'premium';
```

Las dos condiciones deben cumplirse para que una fila aparezca. Un cliente argentino que sea 'standard' no aparece. Un cliente 'premium' de Chile tampoco.

---

### Ejemplo 4 — Condición con OR y paréntesis

El equipo de operaciones quiere ver los pedidos que todavía están activos — es decir, los que están en estado 'pending' o 'shipped':

```sql
SELECT order_id, customer_id, order_date, status
FROM orders
WHERE status = 'pending'
   OR status = 'shipped';
```

Output (ejemplo):

| order_id | customer_id | order_date | status |
|---|---|---|---|
| 101 | 42 | 2024-11-15 | pending |
| 205 | 17 | 2024-11-18 | shipped |
| 307 | 89 | 2024-11-20 | pending |

---

### Ejemplo 5 — NOT para excluir

Diego de Operaciones quiere ver todos los pedidos que *no* están cancelados:

```sql
SELECT order_id, customer_id, order_date, status
FROM orders
WHERE status != 'cancelled';
```

Esto incluye 'pending', 'shipped' y 'delivered' — cualquier estado que no sea 'cancelled'.

---

### Ejemplo 6 — Condición compleja con paréntesis

Sofía quiere los clientes premium de Argentina o Chile para una campaña regional:

```sql
SELECT first_name, last_name, country, segment
FROM customers
WHERE (country = 'Argentina' OR country = 'Chile')
  AND segment = 'premium';
```

Los paréntesis aseguran que primero se evalúa el grupo de países, y luego se filtra por segmento dentro de ese grupo. Sin paréntesis, el resultado sería incorrecto.

---

## 4. CASOS DE USO REALES

**Caso 1 — Segmentación para campañas de marketing**
Sofía necesita crear listas de emails por país y por segmento para campañas de CRM. Combina `WHERE country = 'X'` con `AND segment = 'Y'` para construir audiencias precisas. Lo usa a diario un Marketing Analyst.

**Caso 2 — Monitoreo operacional**
Diego revisa cada mañana los pedidos en estado 'pending' que llevan más de 48 horas sin actualizarse. Filtra por `status = 'pending'` y por fecha. Sin `WHERE`, tendría que revisar miles de pedidos manualmente. Lo usa un Operations Analyst o un Data Analyst con rol operacional.

**Caso 3 — Control de calidad de datos**
Ana de Finanzas detecta que algunos registros tienen valores de precio negativos o en cero, que son claramente errores de carga. Con `WHERE price <= 0` identifica esos registros para escalarlos al equipo técnico. Lo usa un Data Analyst o Data Engineer en tareas de data quality.

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico

**Contexto:** Sofía está preparando una campaña para el mercado español. Necesita los nombres y emails de todos los clientes de España.

Escribe una query que retorne `first_name`, `last_name` y `email` de todos los clientes cuyo país sea España.

**Pista:** El valor exacto del país en la base de datos es `'Spain'`. Recuerda que SQLite distingue mayúsculas y minúsculas.

**Resultado esperado:** Una tabla con tres columnas y solo los clientes cuyo `country` es 'Spain'.

**Criterio de éxito:** Todas las filas del resultado tienen `country = 'Spain'` (aunque `country` no aparezca en el SELECT, puedes verificarlo agregándola temporalmente).

---

### Ejercicio Intermedio

**Contexto:** Valentina quiere revisar los productos que están en un rango de precio accesible para una promoción: entre $50 y $200, sin incluir esos extremos. Necesita el nombre del producto y su precio.

Escribe una query que retorne `name` y `price` de los productos cuyo precio sea estrictamente mayor a 50 y estrictamente menor a 200, ordenados de mayor a menor precio.

**Pistas:**
1. Necesitas dos condiciones conectadas con `AND`
2. Para ordenar, usa `ORDER BY price DESC` al final (lo estudias en detalle en la Lección 3)

**Resultado esperado:** Una tabla con dos columnas, solo productos dentro del rango de precio indicado, ordenados de más caro a más barato.

**Criterio de éxito:** Ningún producto en el resultado tiene precio de exactamente 50, exactamente 200, o fuera de ese rango.

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
SELECT first_name, last_name, email
FROM customers
WHERE country = 'Spain';
```

**Solución Ejercicio Intermedio:**
```sql
SELECT name, price
FROM products
WHERE price > 50
  AND price < 200
ORDER BY price DESC;
```

Nota: Este ejercicio se puede resolver también con `BETWEEN 50 AND 200`, pero ese operador incluye los extremos. Para excluirlos, los operadores `>` y `<` son más precisos.

</details>

---

## 6. ERRORES COMUNES

**Error 1 — Usar comillas dobles para valores de texto**

```sql
-- INCORRECTO en SQLite
SELECT first_name, last_name
FROM customers
WHERE country = "Argentina";
```

En SQLite, las comillas dobles `"..."` se usan para identificadores (nombres de columnas o tablas con caracteres especiales), no para valores de texto. Los valores siempre van entre comillas simples `'...'`.

```sql
-- CORRECTO
SELECT first_name, last_name
FROM customers
WHERE country = 'Argentina';
```

---

**Error 2 — Case sensitivity: texto en mayúsculas o minúsculas distintas**

```sql
-- INCORRECTO: SQLite es case-sensitive con texto
SELECT first_name, last_name
FROM customers
WHERE country = 'argentina';  -- minúscula
```

Si el valor almacenado es `'Argentina'` (con mayúscula), esta query no devuelve nada. No hay error en la consola — simplemente no hay resultados, lo cual puede confundirse con "no hay clientes en Argentina".

```sql
-- CORRECTO: el texto debe coincidir exactamente
SELECT first_name, last_name
FROM customers
WHERE country = 'Argentina';
```

**Tip:** Cuando no sabes el valor exacto, primero haz un `SELECT DISTINCT country FROM customers` para ver los valores reales almacenados.

---

**Error 3 — AND/OR sin paréntesis produce resultados inesperados**

```sql
-- INCORRECTO: la intención es clientes premium de Argentina o Chile
-- Pero SQL lo lee como: (Argentina Y premium) O (cualquier cliente de Chile)
SELECT first_name, country, segment
FROM customers
WHERE country = 'Argentina' AND segment = 'premium' OR country = 'Chile';
```

```sql
-- CORRECTO: paréntesis explicitan la intención
SELECT first_name, country, segment
FROM customers
WHERE (country = 'Argentina' OR country = 'Chile')
  AND segment = 'premium';
```

El error mental detrás de esto: se asume que SQL procesa las condiciones de izquierda a derecha como en el lenguaje natural. En realidad, AND tiene mayor precedencia que OR, como la multiplicación sobre la suma en matemáticas.

---

**Error 4 — Comparar con NULL usando = en lugar de IS NULL**

```sql
-- INCORRECTO: no devuelve los clientes sin ciudad
SELECT first_name, city
FROM customers
WHERE city = NULL;
```

Esta query no devuelve ninguna fila aunque existan clientes con `city` vacía. En SQL, `NULL = NULL` no es `TRUE` — es `NULL` (desconocido). La comparación con NULL nunca evalúa a verdadero usando `=`.

```sql
-- CORRECTO
SELECT first_name, city
FROM customers
WHERE city IS NULL;
```

Estudiaremos NULL en profundidad en el Nivel 4, pero conviene conocer esta trampa desde el principio.

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

Ya puedes filtrar filas con precisión. Pero los resultados llegan en el orden que la base de datos quiere darte — que generalmente no es el orden que necesitas para un reporte o un análisis.

La Lección 3 te enseña `ORDER BY`, `LIMIT` y `OFFSET`: las herramientas para controlar el orden y la cantidad de resultados. Con ellas podrás construir rankings ("los 10 productos más caros"), paginar resultados y ordenar reportes cronológicamente. Son la diferencia entre un dump de datos y un reporte usable.
