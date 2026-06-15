# Nivel 1 — Exploración de Datos
## Lección 1: SELECT y FROM — Tu primera conversación con la base de datos

> Tablas disponibles en este nivel: `customers`, `categories`, `products`

---

## 1. INTRODUCCIÓN CONCEPTUAL

### El momento en que los datos dejan de ser un archivo y se vuelven respuestas

Llevas tu primera semana en ShopSphere. Valentina Torres te acaba de dar acceso a la base de datos PostgreSQL y te manda un Slack escueto: *"Antes de cualquier análisis, familiarízate con los datos. Explora customers y products. Mañana te pido cosas."*

No sabes cuántos clientes hay. No sabes qué productos están en el catálogo. No sabes nada todavía — pero tienes la herramienta para descubrirlo.

Esa herramienta se llama `SELECT`.

**¿Qué hace SELECT?** Le pregunta a la base de datos qué columnas quieres ver. **¿Qué hace FROM?** Le dice de qué tabla vienen esos datos.

Juntos, `SELECT` y `FROM` forman la estructura mínima de toda query en SQL. No existe ninguna consulta de recuperación de datos que no las tenga. Son el sujeto y el verbo de tu idioma nuevo.

**La analogía del menú:** Imagina que la base de datos es un restaurante. `FROM` es elegir a qué restaurante entras (la tabla). `SELECT` es elegir qué pedir del menú (las columnas). Sin saber en qué restaurante estás no puedes pedir nada. Sin pedir nada específico, no llega nada a tu mesa.

---

## 2. SINTAXIS

### Forma canónica

```sql
SELECT columna1, columna2, columna3
FROM nombre_de_la_tabla;
```

**Parámetros obligatorios:**
- Al menos una columna (o el comodín `*`) después de `SELECT`
- El nombre de la tabla después de `FROM`
- El punto y coma `;` al final (buena práctica — algunos clientes SQL lo requieren)

**Variantes importantes:**

**Variante 1 — Seleccionar todas las columnas con `*`**
```sql
SELECT *
FROM customers;
```
El asterisco `*` significa "dame todas las columnas de la tabla". Útil para explorar, pero evítalo en producción: si la tabla cambia y se agregan columnas, tu query devuelve cosas inesperadas.

**Variante 2 — Seleccionar columnas específicas**
```sql
SELECT first_name, last_name, email
FROM customers;
```
Selecciona exactamente las columnas que necesitas. Más eficiente, más explícito, más profesional.

**Variante 3 — Alias con AS**
```sql
SELECT first_name AS nombre, last_name AS apellido
FROM customers;
```
`AS` renombra una columna en el resultado. El alias no cambia el nombre en la tabla — solo en la salida de esa query. Es clave para que los reportes sean legibles.

**Variante 4 — DISTINCT para eliminar duplicados**
```sql
SELECT DISTINCT country
FROM customers;
```
`DISTINCT` elimina filas repetidas del resultado. Si 80 clientes son de México, `DISTINCT country` muestra "Mexico" una sola vez.

**Reglas que generan errores frecuentes:**
- Los nombres de columna van separados por comas — si falta una coma, la query falla
- El nombre de la tabla debe existir tal cual en la base de datos — mayúsculas importan en algunos sistemas
- `SELECT` sin `FROM` solo funciona para expresiones literales (`SELECT 1+1`) — no para columnas de tablas

---

## 3. EJEMPLO PRÁCTICO

### Contexto: Valentina te pide un primer vistazo al catálogo

Es tu primera mañana. Antes de cualquier análisis, necesitas saber con qué estás trabajando. Estas tres queries son tu exploración inicial.

**Query 1 — ¿Qué estructura tiene la tabla de clientes?**
```sql
SELECT *
FROM customers;
```

Output (primeras 3 filas de 500):

| customer_id | first_name | last_name | email | city | country | registered_at |
|---|---|---|---|---|---|---|
| 1 | Fernanda | Guerrero | fernanda.guerrero@yahoo.com | NULL | Venezuela | 2024-08-20 |
| 2 | Sofia | Sanchez | sofia.sanchez@outlook.com | NULL | Spain | 2024-11-02 |
| 3 | Natalia | Guerrero | natalia.guerrero@gmail.com | NULL | USA | 2024-03-02 |

Lo primero que notas: `city` tiene muchos NULL. Eso significa que muchos clientes no ingresaron su ciudad al registrarse. Es información importante para cualquier análisis geográfico.

**Query 2 — Solo los datos relevantes para un reporte de contacto**
```sql
SELECT first_name, last_name, email, country
FROM customers;
```

Output (primeras 3 filas):

| first_name | last_name | email | country |
|---|---|---|---|
| Fernanda | Guerrero | fernanda.guerrero@yahoo.com | Venezuela |
| Sofia | Sanchez | sofia.sanchez@outlook.com | Spain |
| Natalia | Guerrero | natalia.guerrero@gmail.com | USA |

**Query 3 — ¿En cuántos países opera ShopSphere?**
```sql
SELECT DISTINCT country
FROM customers
ORDER BY country;
```

Output (primeras 5 de los países presentes):

| country |
|---|
| Argentina |
| Bolivia |
| Chile |
| Colombia |
| Costa Rica |
| ... |

**Query 4 — Catálogo de productos con alias legibles**
```sql
SELECT
    product_id     AS id,
    name           AS producto,
    price          AS precio_usd,
    is_active      AS activo
FROM products;
```

Output (primeras 3 filas):

| id | producto | precio_usd | activo |
|---|---|---|---|
| 1 | Smartphone Samsung Galaxy A54 | 349.99 | true |
| 2 | Smartphone Xiaomi Redmi Note 13 | 219.99 | true |
| 3 | Laptop Lenovo IdeaPad 3 15" | 549.99 | true |

Los alias hacen que el reporte sea legible para alguien que no conoce la estructura de la tabla.

---

## 4. CASOS DE USO REALES

**Caso 1 — Exploración inicial de un dataset nuevo**
Todo proyecto de análisis empieza con `SELECT *` para entender la estructura. Antes de responder cualquier pregunta de negocio, un analista necesita ver qué columnas existen, qué tipos de datos hay, si hay NULLs visibles. Esta etapa se llama "data familiarization" y `SELECT *` es la herramienta de entrada.
*Rol que lo usa: Data Analyst, Data Scientist en la fase de exploración.*

**Caso 2 — Extracción de datos para un reporte**
Valentina tiene una reunión con Marco en una hora y necesita la lista de emails de todos los clientes de Colombia para una campaña urgente. `SELECT email FROM customers WHERE country = 'Colombia'` (lo veremos con `WHERE` en la Lección 2) es exactamente eso: extraer solo lo necesario para un propósito específico. No se trae toda la tabla — solo las columnas que el caso requiere.
*Rol que lo usa: Data Analyst, Marketing Analyst.*

**Caso 3 — Verificación de datos después de una carga**
Cuando el equipo técnico carga datos nuevos en ShopSphere (por ejemplo, un nuevo lote de productos), el analista verifica que la carga fue correcta con `SELECT *` sobre los registros nuevos. `DISTINCT` sobre categorías o países ayuda a detectar typos o valores inesperados (por ejemplo, "Mexco" en lugar de "Mexico").
*Rol que lo usa: Data Engineer, Data Analyst en tareas de data quality.*

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico
**Contexto:** Marco quiere saber qué categorías de producto tiene ShopSphere en su catálogo.

Escribe una query que retorne el `category_id` y el `name` de todas las categorías, ordenadas alfabéticamente por nombre.

*Nota: Para ordenar, usa `ORDER BY columna ASC` — lo estudiaremos en detalle en la Lección 3.*

**Resultado esperado:** Una tabla con 10 filas (ShopSphere tiene 10 categorías), con dos columnas: `category_id` y `name`, ordenada de A a Z.

**Criterio de éxito:** Tu query no tiene errores, muestra exactamente 10 filas y las categorías aparecen en orden alfabético.

---

### Ejercicio Intermedio
**Contexto:** Sofía de Marketing quiere preparar una segmentación geográfica básica. Necesita saber en qué países hay clientes registrados, pero sin repeticiones — solo la lista única de países presentes en la base de datos.

Escribe una query que retorne:
1. La lista de países únicos donde hay clientes de ShopSphere
2. Con la columna renombrada a `pais` (usando un alias)
3. Ordenada de Z a A (orden descendente)

**Resultado esperado:** Una tabla con una columna llamada `pais`, con los países únicos, en orden descendente.

**Criterio de éxito:** No hay países duplicados. La columna se llama `pais`, no `country`. El orden es descendente (Venezuela primero, Argentina cerca del final).

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
SELECT category_id, name
FROM categories
ORDER BY name ASC;
```

**Solución Ejercicio Intermedio:**
```sql
SELECT DISTINCT country AS pais
FROM customers
ORDER BY pais DESC;
```

Nota: En el `ORDER BY` puedes usar el alias `pais` porque PostgreSQL lo permite en este contexto. En otros motores SQL puede ser necesario repetir `country` en el `ORDER BY`.

</details>

---

## 6. ERRORES COMUNES

**Error 1 — Olvidar la coma entre columnas**

```sql
-- INCORRECTO
SELECT first_name last_name email
FROM customers;
```
Error típico: `ERROR: syntax error at or near "last_name"`

SQL interpreta `last_name` como un alias de `first_name` y luego no sabe qué hacer con `email`. Siempre separa columnas con comas.

```sql
-- CORRECTO
SELECT first_name, last_name, email
FROM customers;
```

**Error 2 — Nombre de tabla o columna mal escrito**

```sql
-- INCORRECTO
SELECT first_name, last_name
FROM customer;
```
Error típico: `ERROR: relation "customer" does not exist`

La tabla se llama `customers` (plural). PostgreSQL distingue entre `customer` y `customers`. Revisa el nombre exacto de la tabla.

**Error 3 — Usar el alias en el SELECT de la misma query**

```sql
-- INCORRECTO (en la mayoría de los motores SQL)
SELECT first_name AS nombre, UPPER(nombre)
FROM customers;
```
Error típico: `ERROR: column "nombre" does not exist`

El alias `nombre` definido en el `SELECT` no está disponible dentro del mismo `SELECT`. El motor no lo ha calculado todavía. Repite la expresión original: `UPPER(first_name)`.

**Error 4 — Confundir DISTINCT con una función**

```sql
-- INCORRECTO
SELECT DISTINCT(country), first_name
FROM customers;
```
Este no da error, pero el resultado es incorrecto. `DISTINCT` aplica a toda la fila, no solo a `country`. Estás eliminando duplicados de la combinación `(country, first_name)`, no de `country` solo. Si quieres países únicos, selecciona solo `country`.

```sql
-- CORRECTO para países únicos
SELECT DISTINCT country
FROM customers;
```

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

`SELECT` y `FROM` te permiten ver datos — todos los datos de una tabla. Pero en ShopSphere, la tabla `customers` tiene 500 registros. Nadie necesita ver los 500 clientes a la vez: Marco quiere ver solo los de México, Sofía solo los registrados este año, Diego solo los que tienen pedidos pendientes.

La Lección 2 te da el control para decirle a la base de datos exactamente qué filas quieres: `WHERE`. Es el filtro que convierte una tabla completa en la respuesta precisa a una pregunta de negocio.
