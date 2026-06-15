# Nivel 1 — Exploración de Datos
## Lección 4: Funciones Escalares — Transformar valores en el resultado

> Tablas disponibles en este nivel: `customers`, `categories`, `products`

---

## 1. INTRODUCCIÓN CONCEPTUAL

### El salto de "ver datos" a "transformar datos"

Llevas varios días explorando ShopSphere. Ya sabes recuperar, filtrar y ordenar. Pero Valentina te acaba de mandar una tarea nueva:

> *"Necesito el catálogo de productos formateado para un reporte externo. Los nombres en mayúsculas, los precios redondeados a un decimal, y quiero saber el año de registro de cada cliente para un análisis de cohortes. ¿Lo puedes preparar?"*

Nada de eso está guardado así en la base de datos: los nombres están en formato mixto, los precios tienen dos decimales, y el año no es una columna — está dentro de la fecha. Necesitas **transformar** los datos al momento de la consulta.

**¿Qué son las funciones escalares?** Son operaciones que toman un valor de entrada y devuelven un valor transformado. Se aplican fila por fila — para cada registro de la tabla, la función toma el valor de esa fila y produce un resultado. No agrupan, no cuentan, no suman — solo transforman.

**La analogía del procesador de texto:** Cuando en Word escribes "convertir a mayúsculas", el texto cambia de apariencia sin que el archivo original se modifique. Las funciones escalares en SQL hacen lo mismo con los datos: los transforman en el resultado de la query, sin tocar lo que está almacenado en la tabla.

---

## 2. SINTAXIS

### Estructura general

```sql
SELECT FUNCION(columna) AS alias
FROM tabla;
```

Las funciones se anidan: `UPPER(TRIM(first_name))` primero elimina espacios, luego convierte a mayúsculas.

---

### Funciones de texto

| Función | Qué hace | Ejemplo |
|---|---|---|
| `UPPER(texto)` | Convierte a mayúsculas | `UPPER('hello')` → `'HELLO'` |
| `LOWER(texto)` | Convierte a minúsculas | `LOWER('HOLA')` → `'hola'` |
| `LENGTH(texto)` | Cuenta caracteres | `LENGTH('hola')` → `4` |
| `TRIM(texto)` | Elimina espacios al inicio y final | `TRIM('  hola  ')` → `'hola'` |
| `CONCAT(a, b, ...)` | Une cadenas de texto | `CONCAT('Hola', ' ', 'Mundo')` → `'Hola Mundo'` |
| `\|\|` (operador) | Une cadenas (alternativa a CONCAT) | `'Hola' \|\| ' ' \|\| 'Mundo'` → `'Hola Mundo'` |
| `SUBSTRING(texto, inicio, largo)` | Extrae una parte del texto | `SUBSTRING('Hola', 1, 2)` → `'Ho'` |
| `REPLACE(texto, buscar, reemplazar)` | Reemplaza texto | `REPLACE('hola mundo', 'mundo', 'SQL')` → `'hola SQL'` |
| `LEFT(texto, n)` | Primeros n caracteres | `LEFT('Hola', 2)` → `'Ho'` |
| `RIGHT(texto, n)` | Últimos n caracteres | `RIGHT('Hola', 2)` → `'la'` |

---

### Funciones numéricas

| Función | Qué hace | Ejemplo |
|---|---|---|
| `ROUND(número, decimales)` | Redondea | `ROUND(149.999, 1)` → `150.0` |
| `ROUND(número)` | Redondea al entero más cercano | `ROUND(149.6)` → `150` |
| `FLOOR(número)` | Redondea hacia abajo | `FLOOR(149.9)` → `149` |
| `CEIL(número)` | Redondea hacia arriba | `CEIL(149.1)` → `150` |
| `ABS(número)` | Valor absoluto | `ABS(-45)` → `45` |
| `MOD(número, divisor)` | Resto de la división | `MOD(10, 3)` → `1` |

---

### Funciones de fecha y hora

| Función | Qué hace | Ejemplo |
|---|---|---|
| `NOW()` | Fecha y hora actual | `NOW()` → `2026-05-31 14:23:00` |
| `CURRENT_DATE` | Fecha actual (sin hora) | `CURRENT_DATE` → `2026-05-31` |
| `EXTRACT(parte FROM fecha)` | Extrae componente de una fecha | `EXTRACT(YEAR FROM '2024-11-15')` → `2024` |
| `DATE_TRUNC('parte', fecha)` | Trunca fecha a la unidad indicada | `DATE_TRUNC('month', '2024-11-15')` → `2024-11-01` |
| `DATE_PART('parte', fecha)` | Alternativa a EXTRACT | `DATE_PART('month', '2024-11-15')` → `11` |
| `AGE(fecha)` | Edad desde esa fecha hasta hoy | `AGE('2020-01-01')` → intervalo de ~6 años |

**Partes válidas para EXTRACT / DATE_TRUNC:**
`year`, `quarter`, `month`, `week`, `day`, `hour`, `minute`, `second`, `dow` (day of week, 0=Sunday)

---

## 3. EJEMPLO PRÁCTICO

### Contexto: Valentina prepara tres reportes para diferentes audiencias

**Query 1 — Catálogo formateado para reporte externo (nombres en mayúsculas, precios redondeados)**

```sql
SELECT
    UPPER(name)         AS nombre_producto,
    ROUND(price, 1)     AS precio_redondeado,
    category_id
FROM products
WHERE is_active = TRUE
ORDER BY nombre_producto;
```

Output (primeras 3 filas):

| nombre_producto | precio_redondeado | category_id |
|---|---|---|
| ATOMIC HABITS - JAMES CLEAR | 19.0 | 7 |
| AUDIFONOS NOISE CANCEL ANKER Q20 | 40.0 | 2 |
| AUDIFONOS SONY WH-CH520 | 60.0 | 2 |

**Query 2 — Lista de clientes con nombre completo concatenado**

```sql
SELECT
    customer_id,
    first_name || ' ' || last_name     AS nombre_completo,
    LOWER(email)                        AS email_normalizado,
    country
FROM customers
ORDER BY last_name, first_name;
```

Output (primeras 3 filas):

| customer_id | nombre_completo | email_normalizado | country |
|---|---|---|---|
| 34 | Marcela Aguilar | marcela.aguilar@gmail.com | Ecuador |
| 27 | Marcela Aguilar | marcela.aguilar@icloud.com | Peru |
| 11 | Ronald Harris | ronald.harris@protonmail.com | Ecuador |

Nota: `LOWER(email)` es útil para normalizar antes de comparaciones — en datos reales, a veces los emails tienen mayúsculas inconsistentes.

**Query 3 — Análisis de año y mes de registro (preparación para cohortes)**

```sql
SELECT
    first_name,
    last_name,
    registered_at,
    EXTRACT(YEAR FROM registered_at)    AS anio_registro,
    EXTRACT(MONTH FROM registered_at)   AS mes_registro,
    DATE_TRUNC('month', registered_at)  AS inicio_mes
FROM customers
ORDER BY registered_at DESC
LIMIT 10;
```

Output (primeras 3 filas):

| first_name | last_name | registered_at | anio_registro | mes_registro | inicio_mes |
|---|---|---|---|---|---|
| Isabella | Ramirez | 2024-11-20 | 2024 | 11 | 2024-11-01 |
| Lorena | Torres | 2024-11-18 | 2024 | 11 | 2024-11-01 |
| Pablo | Aguilar | 2024-11-07 | 2024 | 11 | 2024-11-01 |

`DATE_TRUNC('month', registered_at)` trunca la fecha al primer día del mes — todos los clientes de noviembre 2024 quedan agrupados bajo `2024-11-01`. Esto es la base del análisis de cohortes que Valentina va a pedir más adelante.

**Query 4 — Longitud de emails y dominios (calidad de datos)**

```sql
SELECT
    email,
    LENGTH(email)   AS longitud_email,
    -- POSITION('@' IN email) da el índice del '@' (ej: 8 para 'juan@gmail.com')
    -- LENGTH(email) - POSITION('@') = caracteres que quedan después del '@'
    -- RIGHT toma esa cantidad de chars desde el final → el dominio
    RIGHT(email, LENGTH(email) - POSITION('@' IN email))  AS dominio
FROM customers
ORDER BY longitud_email DESC
LIMIT 5;
```

Output (primeras 3 filas):

| email | longitud_email | dominio |
|---|---|---|
| elizabeth.anderson@outlook.com | 30 | outlook.com |
| guadalupe.fernandez@hotmail.com | 31 | hotmail.com |
| natalia.guerrero@gmail.com | 26 | gmail.com |

**Query 5 — Calcular cuántos días lleva cada cliente registrado**

```sql
SELECT
    first_name,
    last_name,
    registered_at,
    CURRENT_DATE - registered_at::DATE     AS dias_como_cliente
FROM customers
ORDER BY dias_como_cliente DESC
LIMIT 10;
```

El operador `-` entre dos fechas devuelve el número de días de diferencia. `::DATE` convierte el timestamp a fecha pura para la resta.

---

## 4. CASOS DE USO REALES

**Caso 1 — Normalización de datos para reportes**
Los reportes que Valentina envía a Marco o a inversores no pueden mostrar los datos en bruto con el formato de la base de datos. `UPPER()` para nombres de productos, `ROUND()` para precios, `first_name || ' ' || last_name` para nombres completos — todo esto es el trabajo de formateo que hace que un reporte sea presentable. Los analistas lo hacen decenas de veces por semana.
*Rol que lo usa: Data Analyst, BI Developer.*

**Caso 2 — Extracción de componentes de fecha para agrupación**
`EXTRACT(YEAR FROM registered_at)` y `DATE_TRUNC('month', registered_at)` son la base del análisis temporal. Valentina usará estas funciones para saber cuántos clientes se registraron por mes, cuánto revenue generó cada trimestre, cómo evolucionaron las ventas semana a semana. Aunque la agregación real viene en el Nivel 2, la extracción de la componente temporal es el paso previo.
*Rol que lo usa: Data Analyst, Growth Analyst.*

**Caso 3 — Detección de patrones en texto**
`LENGTH(email)` puede detectar emails sospechosamente cortos. `POSITION('@' IN email)` puede verificar que todos los emails tienen arroba. `LOWER(email)` normaliza antes de comparar. En proyectos de calidad de datos, estas funciones de texto son las primeras herramientas de diagnóstico.
*Rol que lo usa: Data Engineer, Data Analyst en tareas de data quality.*

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico
**Contexto:** Sofía necesita un listado de clientes de Colombia para una campaña. El sistema de email marketing al que va a importar la lista requiere el nombre en mayúsculas y el apellido en minúsculas, separados por un espacio.

Escribe una query que retorne para cada cliente colombiano: su email y un campo llamado `nombre_formato` que combine `UPPER(first_name)`, un espacio, y `LOWER(last_name)`.

**Resultado esperado:** Una tabla con dos columnas (`email`, `nombre_formato`) para todos los clientes de Colombia. Por ejemplo: `juan.chavez@outlook.com | JUAN chavez`.

**Criterio de éxito:** Solo clientes de Colombia. El campo `nombre_formato` tiene el formato correcto. La columna se llama `nombre_formato`.

---

### Ejercicio Intermedio
**Contexto:** Valentina está construyendo un análisis de antigüedad de clientes. Para cada cliente quiere saber: el año en que se registró, el mes de registro (como número), y cuántos días lleva como cliente hasta hoy (usando `CURRENT_DATE`). Quiere ver los 15 clientes con mayor antigüedad.

Escribe una query que retorne: `first_name`, `last_name`, `registered_at`, `anio_registro` (EXTRACT del año), `mes_registro` (EXTRACT del mes), `dias_activo` (diferencia entre CURRENT_DATE y la fecha de registro). Ordena por `dias_activo` descendente y limita a 15.

**Resultado esperado:** 15 filas con los clientes más antiguos. `dias_activo` debe ser el número de días desde `registered_at` hasta hoy.

**Criterio de éxito:** Las columnas de año y mes son números (no texto). `dias_activo` es un número positivo y decreciente de fila a fila (el primero tiene más días). Los 15 registros corresponden a los clientes con `registered_at` más antigua.

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
SELECT
    email,
    UPPER(first_name) || ' ' || LOWER(last_name)  AS nombre_formato
FROM customers
WHERE country = 'Colombia'
ORDER BY last_name;
```

**Solución Ejercicio Intermedio:**
```sql
SELECT
    first_name,
    last_name,
    registered_at,
    EXTRACT(YEAR FROM registered_at)    AS anio_registro,
    EXTRACT(MONTH FROM registered_at)   AS mes_registro,
    CURRENT_DATE - registered_at::DATE  AS dias_activo
FROM customers
ORDER BY dias_activo DESC
LIMIT 15;
```

Nota sobre la conversión de tipo: `registered_at` en ShopSphere es tipo DATE, por lo que la resta directa `CURRENT_DATE - registered_at` ya funciona. La notación `::DATE` es útil si la columna fuera TIMESTAMP: `CURRENT_DATE - ordered_at::DATE`.

</details>

---

## 6. ERRORES COMUNES

**Error 1 — Confundir EXTRACT con DATE_TRUNC**

```sql
-- EXTRACT retorna un NÚMERO (el componente)
SELECT EXTRACT(MONTH FROM registered_at) FROM customers;
-- Resultado: 11, 3, 8, 11...  (números)

-- DATE_TRUNC retorna una FECHA (truncada al inicio del período)
SELECT DATE_TRUNC('month', registered_at) FROM customers;
-- Resultado: 2024-11-01, 2024-03-01, 2024-08-01...  (fechas)
```

`EXTRACT` es para obtener "¿en qué mes?". `DATE_TRUNC` es para agrupar: "todos los que caen en noviembre 2024 quedan bajo la misma etiqueta `2024-11-01`".

**Error 2 — Aplicar funciones de texto a columnas numéricas sin conversión**

```sql
-- INCORRECTO: LENGTH no opera sobre numbers directamente en todos los contextos
SELECT LENGTH(price) FROM products;
-- Error en algunos motores: function length(numeric) does not exist
```

Si necesitas tratar un número como texto, primero conviértelo: `LENGTH(price::TEXT)` o `LENGTH(CAST(price AS TEXT))`.

**Error 3 — CONCAT con NULL devuelve NULL**

```sql
-- Si city es NULL, este CONCAT devuelve NULL, no 'Paris, NULL'
SELECT CONCAT(city, ', ', country) FROM customers;
```

Para manejar NULLs en concatenación, usa `COALESCE`:
```sql
SELECT CONCAT(COALESCE(city, 'Ciudad desconocida'), ', ', country) FROM customers;
```
**Nota:** el operador `||` tiene exactamente el mismo comportamiento — `'hola' || NULL` también devuelve NULL. Tanto `CONCAT` como `||` propagan NULL; la solución no es cambiar el operador de concatenación, sino envolver el campo que puede ser NULL con `COALESCE`.

**Error 4 — ROUND con número de decimales negativo (comportamiento inesperado)**

```sql
-- ROUND con decimales negativos redondea a la decena, centena, etc.
SELECT ROUND(149.99, -1);   -- Resultado: 150 (redondea a la decena)
SELECT ROUND(149.99, -2);   -- Resultado: 100 (redondea a la centena)
```

Esto es comportamiento válido de SQL, pero muchos estudiantes lo descubren por accidente y se confunden. Si tu intención era redondear a dos decimales, el argumento correcto es `ROUND(149.99, 2)`, no `-2`.

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

Las funciones escalares transforman valores individuales — operan sobre cada fila de forma independiente. Pero Valentina pronto va a pedirte algo diferente: "¿Cuántos clientes tenemos en total?", "¿Cuál es el precio promedio de nuestros productos?", "¿Cuánto revenue generamos en el último mes?".

Esas preguntas requieren **colapsar múltiples filas en un solo número**. Para eso existen las funciones de agregación: `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`. Son el puente entre explorar datos y producir métricas de negocio — y son el corazón del Nivel 2.
