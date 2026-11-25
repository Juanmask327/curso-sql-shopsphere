# Nivel 2 — Métricas de Negocio
## Lección 4: Análisis Temporal — Series de tiempo y comparaciones de período

> Tablas disponibles en este nivel: `customers`, `categories`, `products`, `orders`

> **Nota de dialecto:** Algunos ejemplos de esta lección usan sintaxis de PostgreSQL (`DATE_TRUNC`, `EXTRACT`, `INTERVAL`, `::DATE`) que **no funciona en el Playground**, porque el Playground corre SQLite. Equivalentes en SQLite: `strftime('%Y-%m-01', fecha)` en lugar de `DATE_TRUNC('month', fecha)`; `CAST(strftime('%Y', fecha) AS INTEGER)` en lugar de `EXTRACT(YEAR FROM fecha)` (`'%m'` para el mes); `date('now', '-90 days')` en lugar de `CURRENT_DATE - INTERVAL '90 days'`; `date('2026-01-01')` en lugar de `'2026-01-01'::DATE`. Los ejercicios se validan con la sintaxis SQLite.

---

## 1. INTRODUCCIÓN CONCEPTUAL

### Por qué el tiempo cambia todo

Valentina entra al standup del lunes con un problema concreto:

> *"Marco le dijo a los inversores que ShopSphere creció un 35% en 2024 respecto a 2023. Un inversor preguntó cómo evolucionó mes a mes. Yo no tenía la respuesta porque nadie había hecho ese análisis. Esta semana necesito una serie de tiempo de pedidos por mes desde que empezamos."*

El análisis que Valentina pide no es un número — es una secuencia de números en el tiempo. Eso se llama **serie de tiempo** y es el tipo de análisis más común en negocio: tendencias, estacionalidad, comparaciones de período.

**¿Por qué es especial el análisis temporal?** Porque las fechas en SQL son datos que contienen estructura interna: un timestamp tiene año, trimestre, mes, semana, día, hora, minuto. Para analizar por mes, tienes que extraer el mes de cada fecha. Para agrupar por trimestre, tienes que calcular el trimestre de cada fecha. Eso es lo que hacen `DATE_TRUNC` y `EXTRACT`.

**La analogía del calendario:** Tienes una hoja con los 2.000 pedidos de ShopSphere. Cada fila tiene una fecha. Agrupar por mes es como tomar esa hoja, dividirla en 18 columnas (una por mes), y apilar los pedidos de cada mes en su columna. `DATE_TRUNC('month', ordered_at)` hace exactamente eso: asigna a cada fila la etiqueta del mes al que pertenece, para poder luego agrupar y contar.

---

## 2. SINTAXIS

### Las herramientas temporales del analista

**DATE_TRUNC — La herramienta principal de agrupación temporal**

```sql
DATE_TRUNC('parte', columna_de_fecha)
```

Devuelve la fecha truncada al inicio del período indicado:

| Invocación | Input | Output |
|---|---|---|
| `DATE_TRUNC('year', ...)` | 2024-11-24 | 2024-01-01 |
| `DATE_TRUNC('quarter', ...)` | 2024-11-24 | 2024-10-01 |
| `DATE_TRUNC('month', ...)` | 2024-11-24 | 2024-11-01 |
| `DATE_TRUNC('week', ...)` | 2024-11-24 | 2024-11-18 |
| `DATE_TRUNC('day', ...)` | 2024-11-24 15:30 | 2024-11-24 |

Todos los registros del mismo mes quedan con la misma "etiqueta" (`2024-11-01`), lo que permite agruparlos con `GROUP BY`.

**EXTRACT — Para obtener el componente numérico**

```sql
EXTRACT(YEAR FROM columna_de_fecha)     -- número: 2024
EXTRACT(QUARTER FROM columna_de_fecha)  -- número: 4 (octubre-diciembre)
EXTRACT(MONTH FROM columna_de_fecha)    -- número: 11
EXTRACT(WEEK FROM columna_de_fecha)     -- número: 48
EXTRACT(DOW FROM columna_de_fecha)      -- número: 0=domingo, 6=sábado
```

`EXTRACT` devuelve un número — útil para filtros (`WHERE EXTRACT(YEAR FROM...) = 2024`) y para ordenar. `DATE_TRUNC` devuelve una fecha — útil para etiquetas y para agrupar con orden cronológico natural.

**Comparación entre períodos — el patrón WHERE + rango de fechas**

```sql
-- Pedidos de 2023
WHERE ordered_at >= '2023-01-01' AND ordered_at < '2024-01-01'

-- Pedidos de Q4 2024 (octubre-diciembre)
WHERE ordered_at >= '2024-10-01' AND ordered_at < '2025-01-01'

-- Pedidos de los últimos 30 días (relativo a hoy)
WHERE ordered_at >= CURRENT_DATE - INTERVAL '30 days'

-- Pedidos de noviembre 2024
WHERE ordered_at >= '2024-11-01' AND ordered_at < '2024-12-01'
-- equivalente a:
WHERE DATE_TRUNC('month', ordered_at) = '2024-11-01'
```

**Preferir `>=` y `<` sobre `BETWEEN` para fechas con horas:** `BETWEEN '2024-11-01' AND '2024-11-30'` puede perder registros del 30 de noviembre que tengan hora (`2024-11-30 23:59:00` está incluido, pero `2024-12-01 00:00:00` no). Usando `>= '2024-11-01' AND < '2024-12-01'` no tienes ese problema.

---

## 3. EJEMPLO PRÁCTICO

### Contexto: La serie de tiempo que Valentina necesita para el martes

**Query 1 — Serie de tiempo de pedidos por mes (la base de todo análisis temporal)**

```sql
SELECT
    DATE_TRUNC('month', ordered_at)  AS mes,
    COUNT(*)                          AS total_pedidos,
    COUNT(DISTINCT customer_id)       AS clientes_distintos
FROM orders
GROUP BY DATE_TRUNC('month', ordered_at)
ORDER BY mes ASC;
```

Output (primeras 6 filas):

| mes | total_pedidos | clientes_distintos |
|---|---|---|
| 2023-06-01 | 45 | 43 |
| 2023-07-01 | 62 | 58 |
| 2023-08-01 | 78 | 71 |
| 2023-09-01 | 95 | 86 |
| 2023-10-01 | 88 | 81 |
| 2023-11-01 | 143 | 127 |

Valentina mira el dato de noviembre 2023: "143 pedidos. Ese es el primer Black Friday de ShopSphere — ya hay un patrón estacional claro."

**Query 2 — Comparación 2023 vs 2024 (análisis año sobre año)**

```sql
SELECT
    EXTRACT(MONTH FROM ordered_at)                      AS mes_numero,
    COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM ordered_at) = 2023)  AS pedidos_2023,
    COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM ordered_at) = 2024)  AS pedidos_2024
FROM orders
GROUP BY EXTRACT(MONTH FROM ordered_at)
ORDER BY mes_numero;
```

Output:

| mes_numero | pedidos_2023 | pedidos_2024 |
|---|---|---|
| 6 | 45 | 112 |
| 7 | 62 | 134 |
| 8 | 78 | 167 |
| 9 | 95 | 198 |
| 10 | 88 | 245 |
| 11 | 143 | 387 |
| 12 | 198 | NULL |

Nota: diciembre 2024 puede mostrar datos parciales o NULL dependiendo del rango del dataset. Este patrón de "pivot por año" es muy útil para comparaciones estacionales.

"Ahí está el 35% de crecimiento que mencionó Marco", dice Valentina. "Todos los meses de 2024 son mayores que el mismo mes de 2023. Y noviembre 2024 fue casi el triple de noviembre 2023."

**Query 3 — Pedidos por trimestre (vista más comprimida para ejecutivos)**

```sql
SELECT
    EXTRACT(YEAR FROM ordered_at)     AS anio,
    EXTRACT(QUARTER FROM ordered_at)  AS trimestre,
    COUNT(*)                           AS pedidos,
    COUNT(DISTINCT customer_id)        AS clientes_activos
FROM orders
GROUP BY
    EXTRACT(YEAR FROM ordered_at),
    EXTRACT(QUARTER FROM ordered_at)
ORDER BY anio, trimestre;
```

Output:

| anio | trimestre | pedidos | clientes_activos |
|---|---|---|---|
| 2023 | 2 | 45 | 43 |
| 2023 | 3 | 235 | 216 |
| 2023 | 4 | 354 | 314 |
| 2024 | 1 | 287 | 254 |
| 2024 | 2 | 334 | 297 |
| 2024 | 3 | 378 | 340 |
| 2024 | 4 | 446 | 391 |

"El Q4 2024 fue el mejor trimestre de la historia", dice Marco cuando ve esto. "Pero noto que el Q1 siempre cae respecto al Q4. ¿Es estacionalidad o hay otra razón?" — esa es la pregunta que LAG y las window functions (Nivel 6) van a responder con precisión.

**Query 4 — El Black Friday 2024: análisis del día a día de noviembre**

```sql
SELECT
    DATE_TRUNC('day', ordered_at)  AS dia,
    COUNT(*)                        AS pedidos_del_dia
FROM orders
WHERE ordered_at >= '2024-11-01'
  AND ordered_at < '2024-12-01'
GROUP BY DATE_TRUNC('day', ordered_at)
ORDER BY pedidos_del_dia DESC
LIMIT 5;
```

Output (los 5 días más activos de noviembre):

| dia | pedidos_del_dia |
|---|---|
| 2024-11-29 | 312 |
| 2024-11-30 | 89 |
| 2024-11-28 | 67 |
| 2024-11-27 | 54 |
| 2024-11-15 | 43 |

La caída del 30 de noviembre es exactamente lo que el timeline de ShopSphere documenta: el sistema de pagos falló ese día y se perdieron ~340 transacciones que en condiciones normales se habrían aprobado.

**Query 5 — Nuevos clientes por semana del año 2024**

```sql
SELECT
    DATE_TRUNC('week', registered_at)  AS semana,
    COUNT(*)                            AS clientes_nuevos
FROM customers
WHERE registered_at >= '2024-01-01'
  AND registered_at < '2025-01-01'
GROUP BY DATE_TRUNC('week', registered_at)
HAVING COUNT(*) >= 5
ORDER BY semana;
```

---

## 4. CASOS DE USO REALES

**Caso 1 — Series de tiempo para dashboards de negocio**
Todo dashboard ejecutivo tiene una gráfica de "pedidos por mes" o "revenue por semana". `DATE_TRUNC('month', fecha) + GROUP BY` es la query que alimenta esa gráfica. Valentina la usa todas las semanas para el reporte que le manda a Marco. Sin esta query, ese reporte no existe.
*Rol que lo usa: Data Analyst, BI Developer.*

**Caso 2 — Análisis de estacionalidad**
ShopSphere tiene picos en noviembre (Black Friday), diciembre (navidad) y caídas en enero (post-fiestas). Eso es estacionalidad. `EXTRACT(MONTH FROM fecha)` permite comparar "todos los noviembres" o "todos los Q4" a lo largo de los años para confirmar si el patrón se repite. Ana de Finanzas usa esto para proyectar el presupuesto del próximo año.
*Rol que lo usa: Finance Analyst, Data Analyst.*

**Caso 3 — Detección de anomalías temporales**
El spike del Black Friday y la caída del 30 de noviembre de 2024 son anomalías que solo son visibles cuando analizas el dato a nivel de día o incluso de hora. `DATE_TRUNC('day', ordered_at)` con `HAVING COUNT(*) > umbral` detecta los días estadísticamente inusuales. Diego usa esto para planificar la capacidad operativa antes de períodos de alta demanda.
*Rol que lo usa: Operations Analyst, Data Analyst.*

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico
**Contexto:** Valentina quiere ver cómo fue la incorporación de clientes en ShopSphere a lo largo del tiempo. Necesita una tabla con el total de clientes nuevos por mes, ordenada cronológicamente.

Escribe una query que muestre: el mes (como fecha usando DATE_TRUNC), el total de clientes registrados ese mes. Ordena de más antiguo a más reciente.

**Resultado esperado:** Una fila por cada mes donde hubo registros de clientes. La columna de mes es una fecha (primer día del mes). Ordenado de menor a mayor fecha.

**Criterio de éxito:** Si sumas todos los valores de la columna de conteo, el total debe ser 500 (todos los clientes). La primera fila corresponde al mes más antiguo del dataset.

---

### Ejercicio Intermedio
**Contexto:** Marco quiere comparar el desempeño de ShopSphere por trimestre. Necesita una tabla que muestre para cada trimestre (año + número de trimestre): el total de pedidos, el total de pedidos entregados, y el porcentaje de pedidos entregados sobre el total (como número entre 0 y 100, redondeado a 1 decimal). Solo incluye trimestres con más de 50 pedidos totales.

Escribe la query. Ordena por año y trimestre ascendente.

**Resultado esperado:** Una fila por trimestre con suficientes pedidos. Las columnas muestran el año, el trimestre (número del 1 al 4), el total, los entregados, y el porcentaje.

**Criterio de éxito:** El porcentaje de entregados está entre 0 y 100. Todos los trimestres tienen más de 50 pedidos totales. El porcentaje se calcula correctamente como `(entregados / total) * 100`.

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
SELECT
    DATE_TRUNC('month', registered_at)  AS mes,
    COUNT(*)                             AS clientes_nuevos
FROM customers
GROUP BY DATE_TRUNC('month', registered_at)
ORDER BY mes ASC;
```

**Solución Ejercicio Intermedio:**
```sql
SELECT
    EXTRACT(YEAR FROM ordered_at)                                        AS anio,
    EXTRACT(QUARTER FROM ordered_at)                                     AS trimestre,
    COUNT(*)                                                             AS total_pedidos,
    COUNT(*) FILTER (WHERE status = 'delivered')                        AS pedidos_entregados,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'delivered') * 100.0 / COUNT(*),
        1
    )                                                                    AS pct_entregados
FROM orders
GROUP BY
    EXTRACT(YEAR FROM ordered_at),
    EXTRACT(QUARTER FROM ordered_at)
HAVING COUNT(*) > 50
ORDER BY anio ASC, trimestre ASC;
```

Nota sobre el cálculo de porcentaje: multiplicar por `100.0` (no `100`) asegura la división decimal en PostgreSQL. Sin el `.0`, si ambos operandos son enteros, la división es entera y el resultado queda truncado.

</details>

---

## 6. ERRORES COMUNES

**Error 1 — BETWEEN con timestamps puede perder el último día**

```sql
-- POTENCIALMENTE INCORRECTO para timestamps
WHERE ordered_at BETWEEN '2024-11-01' AND '2024-11-30'
-- Incluye el 2024-11-30 00:00:00 pero NO el 2024-11-30 23:59:59
```

Si `ordered_at` es TIMESTAMP (con hora), pedidos del 30 de noviembre después de la medianoche se perderían. Usa siempre `>=` y `<` con el inicio del día siguiente:

```sql
-- CORRECTO para timestamps
WHERE ordered_at >= '2024-11-01' AND ordered_at < '2024-12-01'
```

**Error 2 — Olvidar el orden en GROUP BY con múltiples componentes de fecha**

```sql
-- Si agrupas por año Y mes, debes incluir ambos en GROUP BY
SELECT
    EXTRACT(YEAR FROM ordered_at)   AS anio,
    EXTRACT(MONTH FROM ordered_at)  AS mes,
    COUNT(*)
FROM orders
GROUP BY EXTRACT(YEAR FROM ordered_at)  -- ERROR: falta el mes
ORDER BY anio, mes;
```

Todos los meses de distintos años con el mismo número (enero 2023 y enero 2024 son ambos "mes 1") se colapsarían en un solo grupo. Hay que incluir tanto el año como el mes en GROUP BY.

**Error 3 — Confundir el resultado de DATE_TRUNC con el resultado de EXTRACT**

```sql
-- DATE_TRUNC devuelve una FECHA: 2024-11-01
-- EXTRACT devuelve un NÚMERO: 11

-- Si ordenas por EXTRACT(MONTH), enero (1) de 2024 va antes de febrero (2) de 2023
-- Eso mezcla años. Para orden cronológico correcto, usa DATE_TRUNC o incluye el año.
SELECT EXTRACT(MONTH FROM ordered_at) AS mes, COUNT(*)
FROM orders
GROUP BY EXTRACT(MONTH FROM ordered_at)
ORDER BY mes;
-- PROBLEMA: muestra todos los enerors juntos (2023 y 2024), todos los febreros juntos...
```

Para series de tiempo cronológicas, siempre usa `DATE_TRUNC` o agrupa por (año, mes/trimestre/semana).

**Error 4 — Calcular porcentajes con división entera**

```sql
-- INCORRECTO en PostgreSQL cuando ambos valores son enteros
SELECT COUNT(*) FILTER (WHERE status = 'delivered') / COUNT(*) * 100 AS pct
FROM orders;
-- Resultado: puede ser 0 si el resultado de la división es < 1 antes de multiplicar
```

Multiplica por `100.0` (decimal) antes de dividir, o hace casting explícito:
```sql
-- CORRECTO
SELECT COUNT(*) FILTER (WHERE status = 'delivered') * 100.0 / COUNT(*) AS pct
FROM orders;
```

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

El Nivel 2 te dio el lenguaje de las métricas: puedes contar, sumar, promediar, agrupar y filtrar grupos. Pero has estado trabajando siempre con una tabla a la vez. La pregunta "¿cuántos pedidos tuvo cada país?" no puede responderse correctamente aún porque `orders` no tiene el país del cliente — ese dato está en `customers`.

Para cruzar información de dos tablas tienes que **unirlas**: eso es un `JOIN`. Y el Nivel 3 está completamente dedicado a ese concepto — el más poderoso y el más usado en SQL profesional. Un analista que sabe hacer JOINs puede responder preguntas que cruzan toda la base de datos de ShopSphere.
