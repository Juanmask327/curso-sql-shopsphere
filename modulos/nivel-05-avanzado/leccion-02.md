# Nivel 5 — SQL Avanzado
## Lección 2: CTEs Recursivas — Navegar jerarquías y árboles

> Tablas disponibles en este nivel: `customers`, `categories`, `products`, `orders`, `order_items`, `returns`, `inventory`
>
> **Extensión temporal del schema:** Esta lección extiende `categories` con una columna `parent_id` para modelar subcategorías. Esta extensión es solo para ilustrar el concepto de CTEs recursivas — no forma parte del schema estándar de ShopSphere.

---

## 1. INTRODUCCIÓN CONCEPTUAL

### Cuando los datos se referencian a sí mismos

Imagina que ShopSphere decide expandir su catálogo con subcategorías:

- Tecnología
  - Smartphones
    - Android
    - iOS
  - Computadoras
    - Laptops
    - Desktops
- Hogar
  - Muebles
  - Decoración

Esta estructura es un árbol: cada nodo tiene un padre (excepto la raíz), y puede tener cualquier cantidad de hijos. En una base de datos relacional, se representa con una tabla que se referencia a sí misma — cada fila tiene una columna `parent_id` que apunta a otra fila de la misma tabla.

El problema: con SQL estándar no puedes recorrer un árbol de profundidad arbitraria en una sola query. Para llegar desde "Tecnología" hasta "Android" necesitas tres niveles de joins, y si el árbol puede tener cuatro o cinco niveles, necesitarías cuatro o cinco JOINs. No sabes de antemano cuántos niveles tiene el árbol.

La **CTE recursiva** resuelve exactamente eso: empieza desde la raíz del árbol (o desde cualquier nodo), y se llama a sí misma repetidamente para ir un nivel más profundo en cada iteración, hasta que no haya más nodos por recorrer.

**La analogía de la escalera:** Imagina que estás bajando una escalera y no sabes cuántos escalones tiene. Tu regla es: "si hay un escalón más abajo, bajalo, y repite la regla". La condición de parada es "no hay más escalones". Una CTE recursiva hace exactamente eso con filas de datos.

**Cuándo las necesitas:**
- Categorías con subcategorías de profundidad variable
- Estructuras organizacionales (empleado → manager → director → VP)
- Cadenas de suministro o BOM (Bill of Materials)
- Secuencias generadas (números, fechas) cuando no tienes una tabla de referencia
- Análisis de rutas o grafos (quién sigue a quién en una red social)

---

## 2. SINTAXIS

### Estructura obligatoria de la CTE recursiva

```sql
WITH RECURSIVE nombre_cte AS (
    -- PARTE 1: Base case (anchor)
    -- El punto de partida. Fila(s) iniciales. Se ejecuta una sola vez.
    SELECT columnas
    FROM tabla
    WHERE condicion_inicial

    UNION ALL

    -- PARTE 2: Recursive case
    -- Referencia a la propia CTE. Se ejecuta repetidamente
    -- hasta que no produce nuevas filas.
    SELECT columnas
    FROM tabla
    INNER JOIN nombre_cte ON tabla.parent_id = nombre_cte.id
    -- La condición de parada: cuando el JOIN no encuentra más filas,
    -- la recursión termina automáticamente.
)
SELECT * FROM nombre_cte;
```

**Los tres elementos obligatorios:**
1. `WITH RECURSIVE` — en lugar de solo `WITH`. Sin `RECURSIVE`, el motor no sabe que la CTE se referencia a sí misma.
2. `UNION ALL` — separa el base case del recursive case. No puede ser `UNION` (sin ALL) porque las filas intermedias no son duplicadas a eliminar — son el progreso de la recursión.
3. Una condición de parada implícita — la recursión termina cuando el recursive case no produce nuevas filas (el JOIN no encuentra más coincidencias). No hay una instrucción explícita de "parar aquí".

### Parámetros opcionales importantes

```sql
WITH RECURSIVE nombre_cte AS (
    -- Base case
    SELECT id, parent_id, nombre, 1 AS nivel        -- columna de nivel
    FROM tabla
    WHERE parent_id IS NULL                          -- raíz del árbol

    UNION ALL

    -- Recursive case
    SELECT t.id, t.parent_id, t.nombre, c.nivel + 1 -- nivel se incrementa
    FROM tabla t
    INNER JOIN nombre_cte c ON t.parent_id = c.id
    WHERE c.nivel < 10                               -- límite de seguridad explícito
)
SELECT * FROM nombre_cte;
```

**La columna de nivel** (`nivel` o `depth`): un entero que empieza en 1 en el base case y se incrementa en 1 en cada iteración. Sirve para saber en qué profundidad del árbol está cada nodo y para imponer un límite de seguridad.

**El límite de recursión:** En PostgreSQL, el límite por defecto es 100 iteraciones. Si el árbol tiene más profundidad, o si hay un ciclo (un nodo que apunta a su propio ancestro), la query falla con:
`ERROR: infinite recursion detected in recursive query`

Para protegerse: agregar `WHERE nivel < N` en el recursive case, donde N es la profundidad máxima esperada.

---

## 3. EJEMPLO PRÁCTICO

### Contexto: extension temporal del schema de categories

Para este ejemplo, extendemos temporalmente `categories` con una columna `parent_id`. Esta estructura no existe en el schema estándar del curso — se introduce solo para ilustrar CTEs recursivas.

```sql
-- Extensión temporal: categories con jerarquía
-- (No forma parte del schema estándar de ShopSphere)
CREATE TABLE categories (
    category_id  INT PRIMARY KEY,
    name         VARCHAR(80) NOT NULL,
    parent_id    INT REFERENCES categories(category_id)  -- NULL = categoría raíz
);

-- Datos de ejemplo
INSERT INTO categories VALUES
    (1,  'Tecnología',    NULL),   -- raíz
    (2,  'Hogar',         NULL),   -- raíz
    (3,  'Smartphones',   1),      -- hijo de Tecnología
    (4,  'Computadoras',  1),      -- hijo de Tecnología
    (5,  'Muebles',       2),      -- hijo de Hogar
    (6,  'Decoración',    2),      -- hijo de Hogar
    (7,  'Android',       3),      -- hijo de Smartphones
    (8,  'iOS',           3),      -- hijo de Smartphones
    (9,  'Laptops',       4),      -- hijo de Computadoras
    (10, 'Desktops',      4);      -- hijo de Computadoras
```

**Query 1 — Base case solo: listar las categorías raíz**

Antes de añadir la recursión, verificamos que el base case funciona:

```sql
WITH RECURSIVE arbol_categorias AS (
    -- Solo el base case: categorías sin padre (las raíces)
    SELECT
        category_id,
        name,
        parent_id,
        1            AS nivel,
        name         AS ruta
    FROM categories
    WHERE parent_id IS NULL

    UNION ALL

    -- Recursive case: todavía vacío para verificar el base case
    SELECT
        c.category_id,
        c.name,
        c.parent_id,
        ac.nivel + 1,
        ac.ruta || ' > ' || c.name
    FROM categories c
    INNER JOIN arbol_categorias ac ON c.parent_id = ac.category_id
)
SELECT category_id, name, nivel, ruta
FROM arbol_categorias
ORDER BY ruta;
```

Output completo (árbol de 3 niveles):

| category_id | name | nivel | ruta |
|---|---|---|---|
| 7 | Android | 3 | Tecnología > Smartphones > Android |
| 8 | iOS | 3 | Tecnología > Smartphones > iOS |
| 9 | Laptops | 3 | Tecnología > Computadoras > Laptops |
| 10 | Desktops | 3 | Tecnología > Computadoras > Desktops |
| 4 | Computadoras | 2 | Tecnología > Computadoras |
| 3 | Smartphones | 2 | Tecnología > Smartphones |
| 1 | Tecnología | 1 | Tecnología |
| 5 | Muebles | 2 | Hogar > Muebles |
| 6 | Decoración | 2 | Hogar > Decoración |
| 2 | Hogar | 1 | Hogar |

La columna `ruta` se construye concatenando los nombres nivel por nivel — un patrón muy útil para presentar jerarquías a usuarios de negocio.

**Query 2 — Solo los descendientes de "Tecnología" (partiendo desde un nodo específico)**

No siempre se empieza desde la raíz. Aquí empezamos desde "Tecnología" (category_id = 1) y recorremos todos sus descendientes:

```sql
WITH RECURSIVE descendientes_tecnologia AS (
    -- Base case: el nodo de partida
    SELECT
        category_id,
        name,
        1 AS nivel
    FROM categories
    WHERE category_id = 1    -- punto de partida: Tecnología

    UNION ALL

    -- Recursive case: todos los hijos directos del nodo actual
    SELECT
        c.category_id,
        c.name,
        dt.nivel + 1
    FROM categories c
    INNER JOIN descendientes_tecnologia dt ON c.parent_id = dt.category_id
    WHERE dt.nivel < 5       -- límite de seguridad: máximo 5 niveles
)
SELECT category_id, name, nivel
FROM descendientes_tecnologia
ORDER BY nivel, name;
```

Output:

| category_id | name | nivel |
|---|---|---|
| 1 | Tecnología | 1 |
| 3 | Smartphones | 2 |
| 4 | Computadoras | 2 |
| 7 | Android | 3 |
| 8 | iOS | 3 |
| 9 | Laptops | 3 |
| 10 | Desktops | 3 |

**Por qué funciona la recursión paso a paso:**
- Iteración 1 (base case): produce la fila de "Tecnología" (nivel 1).
- Iteración 2: el recursive case busca filas en `categories` donde `parent_id = 1` → encuentra "Smartphones" y "Computadoras" (nivel 2).
- Iteración 3: busca filas donde `parent_id` es 3 o 4 → encuentra "Android", "iOS", "Laptops", "Desktops" (nivel 3).
- Iteración 4: busca filas donde `parent_id` es 7, 8, 9 o 10 → no encuentra ninguna → la recursión termina.

---

## 4. CASOS DE USO REALES

**Caso 1 — Catálogos de producto con jerarquía de categorías**
Los e-commerce medianos y grandes tienen categorías con 3 a 5 niveles de profundidad. Recorrer esa jerarquía para mostrar "todas las subcategorías de Electrónica" en una página de filtros, o para calcular el revenue de toda una rama del árbol, requiere CTEs recursivas.
*Rol que lo usa: Data Analyst, Backend Developer, Analytics Engineer.*

**Caso 2 — Organigramas y estructuras jerárquicas de empleados**
Una query frecuente en RRHH: "dame todos los empleados que reportan directa o indirectamente a este VP". La tabla de empleados tiene `manager_id` que apunta a otro empleado. La CTE recursiva recorre el árbol de reporte.
*Rol que lo usa: HR Analyst, Data Analyst.*

**Caso 3 — Generación de secuencias de fechas**
Cuando necesitas un listado de todos los días entre dos fechas y no tienes una tabla de calendario, una CTE recursiva puede generarla en el momento:

```sql
WITH RECURSIVE calendario AS (
    SELECT '2026-01-01'::DATE AS fecha
    UNION ALL
    SELECT fecha + INTERVAL '1 day'
    FROM calendario
    WHERE fecha < '2026-01-31'
)
SELECT fecha FROM calendario;
```

Este patrón es muy útil para rellenar huecos en series temporales: hacer LEFT JOIN entre el calendario generado y una tabla de ventas diarias para que los días sin ventas aparezcan con 0.
*Rol que lo usa: Data Analyst, Data Engineer.*

---

## 5. EJERCICIO PROPUESTO

### Ejercicio Básico
**Contexto:** Con la extensión temporal del schema de `categories` (con `parent_id`), escribe una CTE recursiva que produzca el árbol completo de categorías empezando desde la raíz. Para cada categoría, muestra su nombre, su nivel en la jerarquía (1 = raíz) y su ruta completa desde la raíz (usando `' > '` como separador).

**Tablas necesarias:** `categories` (con la extensión `parent_id`)

**Resultado esperado:** Todas las categorías con su nivel y ruta, ordenadas alfabéticamente por ruta.

**Criterio de éxito:** Usas `WITH RECURSIVE`. Tienes base case (nodos raíz: `parent_id IS NULL`) y recursive case. La columna `ruta` se construye concatenando nombres nivel a nivel. El resultado incluye tanto las hojas como los nodos intermedios.

---

### Ejercicio Intermedio
**Contexto:** Dado el árbol de categorías, escribe una query que devuelva solo los nodos hoja — es decir, las categorías que no tienen ningún hijo directo. Son las categorías "terminales" donde se clasificarían los productos.

Usa una CTE recursiva para construir el árbol completo, y luego filtra en la query principal las categorías que no aparecen como `parent_id` de ninguna otra fila.

**Tablas necesarias:** `categories` (con la extensión `parent_id`)

**Resultado esperado:** Solo las categorías sin hijos (Android, iOS, Laptops, Desktops, Muebles, Decoración en el ejemplo). Con su nombre, nivel y ruta completa.

**Criterio de éxito:** La CTE recursiva construye el árbol completo. La query principal filtra los nodos hoja usando `NOT IN` o `NOT EXISTS` contra la columna `parent_id`.

---

<details>
<summary>Ver soluciones</summary>

**Solución Ejercicio Básico:**
```sql
WITH RECURSIVE arbol AS (
    -- Base case: raíces (sin parent_id)
    SELECT
        category_id,
        name,
        parent_id,
        1        AS nivel,
        name     AS ruta
    FROM categories
    WHERE parent_id IS NULL

    UNION ALL

    -- Recursive case: hijos de cada nodo ya visitado
    SELECT
        c.category_id,
        c.name,
        c.parent_id,
        a.nivel + 1,
        a.ruta || ' > ' || c.name
    FROM categories c
    INNER JOIN arbol a ON c.parent_id = a.category_id
)
SELECT name, nivel, ruta
FROM arbol
ORDER BY ruta;
```

**Solución Ejercicio Intermedio:**
```sql
WITH RECURSIVE arbol AS (
    SELECT
        category_id,
        name,
        parent_id,
        1    AS nivel,
        name AS ruta
    FROM categories
    WHERE parent_id IS NULL

    UNION ALL

    SELECT
        c.category_id,
        c.name,
        c.parent_id,
        a.nivel + 1,
        a.ruta || ' > ' || c.name
    FROM categories c
    INNER JOIN arbol a ON c.parent_id = a.category_id
)
SELECT name, nivel, ruta
FROM arbol
WHERE category_id NOT IN (
    SELECT parent_id
    FROM categories
    WHERE parent_id IS NOT NULL    -- protección contra NULLs en NOT IN
)
ORDER BY ruta;
```

Alternativamente con NOT EXISTS:
```sql
WHERE NOT EXISTS (
    SELECT 1 FROM categories hijos WHERE hijos.parent_id = arbol.category_id
)
```

</details>

---

## 6. ERRORES COMUNES

**Error 1 — Olvidar `RECURSIVE` en el `WITH`**

```sql
-- INCORRECTO: WITH sin RECURSIVE
WITH arbol AS (
    SELECT category_id, name FROM categories WHERE parent_id IS NULL
    UNION ALL
    SELECT c.category_id, c.name
    FROM categories c
    INNER JOIN arbol a ON c.parent_id = a.category_id  -- no puede ver "arbol"
)
SELECT * FROM arbol;
```

Error típico: `ERROR: relation "arbol" does not exist`

El motor no sabe que `arbol` puede referenciarse a sí misma sin `RECURSIVE`. La corrección es trivial: añadir `RECURSIVE` después de `WITH`.

**Error 2 — Usar `UNION` en lugar de `UNION ALL`**

```sql
-- PROBLEMÁTICO: UNION elimina duplicados en cada iteración
WITH RECURSIVE arbol AS (
    SELECT category_id, name, 1 AS nivel FROM categories WHERE parent_id IS NULL
    UNION         -- <-- sin ALL
    SELECT c.category_id, c.name, a.nivel + 1
    FROM categories c
    INNER JOIN arbol a ON c.parent_id = a.category_id
)
SELECT * FROM arbol;
```

Con `UNION` (sin ALL), el motor elimina filas duplicadas después de cada iteración. En árboles sin ciclos, el resultado suele ser correcto pero más lento. En árboles con datos similares, puede eliminar filas legítimas. La práctica estándar es `UNION ALL` — la deduplicación si se necesita se hace en la query final.

**Error 3 — Ciclo infinito por datos sin condición de parada**

```sql
-- PELIGROSO: si los datos tienen un ciclo (A es padre de B, B es padre de A),
-- la recursión no termina nunca
WITH RECURSIVE arbol AS (
    SELECT category_id, parent_id FROM categories WHERE parent_id IS NULL
    UNION ALL
    SELECT c.category_id, c.parent_id
    FROM categories c
    INNER JOIN arbol a ON c.parent_id = a.category_id
    -- sin WHERE a.nivel < N como límite de seguridad
)
SELECT * FROM arbol;
```

Error típico: `ERROR: infinite recursion detected in recursive query "arbol"`

PostgreSQL tiene un límite interno de 100 iteraciones antes de lanzar este error. Para protegerse siempre: (1) añadir una columna de nivel y limitar `WHERE nivel < N`, y (2) verificar que los datos no tienen ciclos antes de ejecutar la recursión en producción.

**Error 4 — Número de columnas distinto entre base case y recursive case**

```sql
-- INCORRECTO: base case retorna 3 columnas, recursive case retorna 4
WITH RECURSIVE arbol AS (
    SELECT category_id, name, 1 AS nivel
    FROM categories WHERE parent_id IS NULL

    UNION ALL

    SELECT c.category_id, c.name, a.nivel + 1, a.name AS nombre_padre  -- 4 columnas
    FROM categories c
    INNER JOIN arbol a ON c.parent_id = a.category_id
)
SELECT * FROM arbol;
```

Error típico: `ERROR: recursive query "arbol" column N has type X in non-recursive term but type Y overall`

Ambas partes del `UNION ALL` deben retornar exactamente el mismo número de columnas, en el mismo orden y con tipos compatibles. Si el recursive case necesita una columna extra, el base case también debe incluirla (puede ser `NULL::TEXT` como valor vacío para la primera iteración).

---

## 7. CONEXIÓN CON EL TEMA SIGUIENTE

Las CTEs — tanto simples como recursivas — resuelven el problema de estructurar queries complejas en pasos legibles. Pero hay una clase de análisis que ninguna CTE puede resolver por sí sola: comparar cada fila con las otras filas de su mismo grupo sin colapsar el resultado.

"Producto con mayor revenue dentro de su categoría" requiere saber el revenue de cada producto y simultáneamente saber qué rank ocupa en su categoría. Con `GROUP BY` solo puedes tener uno de los dos. Con una subquery correlacionada puedes tenerlos pero la query se vuelve costosa. La solución es completamente diferente: las **Window Functions**, que calculan valores sobre un conjunto de filas relacionadas sin eliminar ninguna fila del resultado. Son la herramienta que hace posible ranking, posiciones y comparaciones dentro de grupos en una sola pasada.
