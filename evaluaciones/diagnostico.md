# Evaluacion Diagnostica — SQL para Analisis de Datos
## ShopSphere Learning Path Assessment

---

## Para el Estudiante: Antes de Empezar

Bienvenido al curso SQL para Analisis de Datos con ShopSphere.

Esta evaluacion corta (15-20 minutos) nos ayuda a entender donde estas hoy para que no desperdicies tiempo repasando lo que ya sabes, ni saltes directo a temas que todavia no tienen contexto.

No es un examen. No hay nota. No hay respuestas "vergonzosas".

Si acabas de escuchar "SQL" por primera vez en tu vida, perfecto — empieza la evaluacion igual. Si llevas anos escribiendo queries, tambien — vamos a encontrar exactamente donde tiene sentido que arranques.

Lo que hace este diagnostico:
- Si respondes bien preguntas de un nivel, te saltamos ese nivel y empiezas en el siguiente.
- Si hay un nivel donde te trabas, ahi empezamos — con toda la explicacion desde cero.
- El resultado es tu punto de entrada personalizado al curso.

Reglas:
- Responde honestamente. Si no sabes, marca "No lo se" — eso es informacion util.
- No busques las respuestas en internet. El diagnostico funciona mejor cuando refleja lo que ya traes.
- Puedes omitir preguntas y regresar a ellas.

Cuando termines, el sistema calcula tu nivel de entrada automaticamente.

---

## Estructura de la Evaluacion

| Bloque | Niveles cubiertos | Preguntas | Formato |
|--------|-------------------|-----------|---------|
| A | Niveles 0-1 | 1-6 | Opcion multiple |
| B | Nivel 2 | 7-9 | Opcion multiple / "que retorna" |
| C | Nivel 3 | 10-12 | Opcion multiple + mini-editor SQL |
| D | Nivel 4 | 13-15 | Opcion multiple + mini-editor SQL |
| E | Niveles 5-6 | 16-20 | "Que retorna" + mini-editor SQL |
| F | Niveles 7-8 | 21-24 | Opcion multiple conceptual |

Total: 24 preguntas
Peso total: 100 puntos

---

## BLOQUE A — Fundamentos y Exploracion (Niveles 0 y 1)

*Tablas disponibles: customers, products, categories*

---

### Pregunta 1
**Nivel:** 0 — Fundamentos
**Peso:** 3 puntos
**Formato:** Opcion multiple

En una base de datos relacional, una PRIMARY KEY sirve para:

- A) Ordenar los registros de mayor a menor
- B) Identificar de forma unica cada fila en una tabla
- C) Cifrar los datos sensibles de la tabla
- D) Conectar la base de datos con el servidor web

**Respuesta correcta:** B
**Explicacion:** La PRIMARY KEY garantiza que no existan dos filas identicas en una tabla. Es el mecanismo central de identidad en el modelo relacional.

---

### Pregunta 2
**Nivel:** 0 — Fundamentos
**Peso:** 3 puntos
**Formato:** Opcion multiple

Una FOREIGN KEY en la tabla `products` que referencia a `categories` significa que:

- A) Cada producto debe pertenecer a una categoria que existe en la tabla `categories`
- B) Cada categoria debe tener al menos un producto asociado
- C) Los productos y las categorias se almacenan en la misma tabla
- D) El campo `category_id` en `products` es obligatoriamente unico

**Respuesta correcta:** A
**Explicacion:** Una FOREIGN KEY es una restriccion de integridad referencial. Garantiza que el valor en la columna hijo exista como PRIMARY KEY en la tabla padre. No impone lo contrario (que la categoria tenga productos).

---

### Pregunta 3
**Nivel:** 0 — Fundamentos
**Peso:** 3 puntos
**Formato:** Opcion multiple

Cual de los siguientes tipos de dato es mas apropiado para almacenar el precio de un producto en una tienda online?

- A) INT
- B) VARCHAR(10)
- C) DECIMAL(10, 2)
- D) BOOLEAN

**Respuesta correcta:** C
**Explicacion:** DECIMAL(10,2) almacena numeros con precision exacta de dos decimales, ideal para valores monetarios. INT trunca los centavos. VARCHAR almacena texto. BOOLEAN solo representa verdadero/falso.

---

### Pregunta 4
**Nivel:** 1 — Exploracion de datos
**Peso:** 4 puntos
**Formato:** "Que retorna esta query"

Dado el siguiente esquema parcial:

```
customers: customer_id, first_name, last_name, email, city, country, registered_at
```

Que retorna esta query?

```sql
SELECT first_name, city
FROM customers
WHERE country = 'Mexico'
ORDER BY first_name ASC
LIMIT 5;
```

- A) El nombre y ciudad de todos los clientes mexicanos, en orden alfabetico por nombre, pero solo los primeros 5
- B) Los 5 primeros clientes registrados en Mexico, ordenados por fecha de registro
- C) Todos los clientes de Mexico, limitando a 5 columnas visibles
- D) Un error, porque LIMIT debe ir antes de ORDER BY

**Respuesta correcta:** A
**Explicacion:** ORDER BY se aplica primero (ordena el resultado completo), luego LIMIT recorta a los primeros 5 filas del resultado ordenado. La query es sintacticamente correcta.

---

### Pregunta 5
**Nivel:** 1 — Exploracion de datos
**Peso:** 4 puntos
**Formato:** Opcion multiple

Cual query devuelve solo los productos activos cuyo precio esta entre 50 y 200?

```
products: product_id, name, category_id, price, is_active
```

- A)
```sql
SELECT * FROM products
WHERE price > 50 AND price < 200 AND is_active = TRUE;
```

- B)
```sql
SELECT * FROM products
WHERE price BETWEEN 50 AND 200 OR is_active = TRUE;
```

- C)
```sql
SELECT * FROM products
WHERE is_active = TRUE;
WHERE price BETWEEN 50 AND 200;
```

- D)
```sql
SELECT * FROM products
WHERE price BETWEEN 50 AND 200 AND is_active = TRUE;
```

**Respuesta correcta (4 pts):** D
**Respuesta parcial (2 pts):** A — correcta para el proposito practico, pero BETWEEN incluye los extremos (50 y 200), mientras que `>` y `<` los excluye.
**Opciones incorrectas:** B (OR en lugar de AND), C (error de sintaxis: dos clausulas WHERE separadas)
**Explicacion:** BETWEEN es inclusivo en ambos extremos. La opcion C tiene dos clausulas WHERE separadas, lo cual genera un error de sintaxis. La opcion B usa OR donde debe ir AND.

---

### Pregunta 6
**Nivel:** 1 — Exploracion de datos
**Peso:** 4 puntos
**Formato:** Opcion multiple

Que hace el operador LIKE en esta condicion?

```sql
WHERE email LIKE '%@gmail.com'
```

- A) Busca emails que contengan exactamente el texto "@gmail.com"
- B) Busca emails que terminen en "@gmail.com", sin importar lo que venga antes
- C) Busca emails que empiecen con "@gmail.com"
- D) Retorna un error porque LIKE solo funciona con columnas de tipo INT

**Respuesta correcta:** B
**Explicacion:** El simbolo `%` es un comodin que representa cualquier cadena de caracteres (incluyendo vacia). Colocado al inicio, indica "cualquier cosa antes de @gmail.com". LIKE funciona sobre columnas de texto.

---

## BLOQUE B — Metricas de Negocio (Nivel 2)

*Tablas disponibles: customers, products, categories, orders*

---

### Pregunta 7
**Nivel:** 2 — Metricas de negocio
**Peso:** 4 puntos
**Formato:** "Que retorna esta query"

```
orders: order_id, customer_id, ordered_at, status
```

Que retorna esta query?

```sql
SELECT status, COUNT(*) AS total_pedidos
FROM orders
GROUP BY status;
```

- A) El numero total de pedidos en toda la tabla
- B) Una fila por cada valor distinto de `status`, con el conteo de pedidos en ese estado
- C) Los pedidos agrupados por fecha, con su estado
- D) Un error, porque COUNT(*) no puede usarse con GROUP BY

**Respuesta correcta:** B
**Explicacion:** GROUP BY colapsa las filas que comparten el mismo valor en `status` en una sola fila de resultado. COUNT(*) cuenta cuantas filas originales cayeron en cada grupo.

---

### Pregunta 8
**Nivel:** 2 — Metricas de negocio
**Peso:** 4 puntos
**Formato:** Opcion multiple

Cual es la diferencia entre WHERE y HAVING?

- A) WHERE filtra antes de agrupar; HAVING filtra despues de agrupar
- B) WHERE solo funciona con texto; HAVING solo funciona con numeros
- C) HAVING es la version moderna de WHERE, completamente equivalente
- D) WHERE filtra columnas; HAVING filtra filas

**Respuesta correcta:** A
**Explicacion:** WHERE opera sobre filas individuales antes de que GROUP BY forme los grupos. HAVING opera sobre los grupos ya formados y puede usar funciones de agregacion (COUNT, SUM, etc.). Esta distincion es fundamental para escribir queries de metricas correctamente.

---

### Pregunta 9
**Nivel:** 2 — Metricas de negocio
**Peso:** 5 puntos
**Formato:** "Que retorna esta query"

```sql
SELECT DATE_TRUNC('month', ordered_at) AS mes,
       COUNT(DISTINCT customer_id)     AS clientes_unicos
FROM orders
WHERE status = 'delivered'
GROUP BY DATE_TRUNC('month', ordered_at)
HAVING COUNT(DISTINCT customer_id) > 100
ORDER BY mes;
```

- A) El numero de pedidos entregados por mes, solo para meses con mas de 100 pedidos
- B) Los clientes que hicieron mas de 100 pedidos entregados
- C) El conteo de clientes distintos que tuvieron al menos un pedido entregado por mes, mostrando solo los meses con mas de 100 clientes distintos
- D) Un error, porque no se puede usar COUNT(DISTINCT ...) dentro de HAVING

**Respuesta correcta:** C
**Explicacion:** DATE_TRUNC trunca el timestamp al inicio del mes para poder agrupar. COUNT(DISTINCT customer_id) cuenta clientes sin repetir dentro de cada mes. HAVING filtra los grupos donde ese conteo supera 100. COUNT(DISTINCT) dentro de HAVING es completamente valido.

---

## BLOQUE C — JOINs y Relaciones (Nivel 3)

*Tablas disponibles: customers, products, categories, orders, order_items*

```
order_items: item_id, order_id, product_id, quantity, unit_price
```

---

### Pregunta 10
**Nivel:** 3 — JOINs
**Peso:** 5 puntos
**Formato:** Opcion multiple

Cual es la diferencia practica entre INNER JOIN y LEFT JOIN?

- A) INNER JOIN es mas rapido; LEFT JOIN es mas preciso
- B) INNER JOIN retorna solo las filas donde hay coincidencia en ambas tablas; LEFT JOIN retorna todas las filas de la tabla izquierda aunque no haya coincidencia en la derecha
- C) LEFT JOIN solo funciona cuando la tabla izquierda tiene una PRIMARY KEY
- D) No hay diferencia funcional, son aliases uno del otro

**Respuesta correcta:** B
**Explicacion:** INNER JOIN es la interseccion: ambas tablas deben tener la clave de union. LEFT JOIN preserva todas las filas de la tabla izquierda; donde no hay match en la derecha, las columnas de esa tabla aparecen como NULL. Esto es critico para detectar, por ejemplo, clientes sin pedidos.

---

### Pregunta 11
**Nivel:** 3 — JOINs
**Peso:** 5 puntos
**Formato:** "Que retorna esta query"

```sql
SELECT c.name        AS categoria,
       COUNT(p.product_id) AS total_productos
FROM categories c
LEFT JOIN products p ON p.category_id = c.category_id
GROUP BY c.name
ORDER BY total_productos DESC;
```

- A) Las categorias que tienen al menos un producto, ordenadas de mayor a menor cantidad
- B) Todas las categorias, incluyendo las que no tienen productos (que apareceran con 0), ordenadas de mayor a menor
- C) Un error, porque no se puede hacer GROUP BY sobre una columna de JOIN
- D) Todos los productos con su categoria, ordenados por nombre de categoria

**Respuesta correcta:** B
**Explicacion:** El LEFT JOIN preserva todas las categorias. Para categorias sin productos, `p.product_id` es NULL y COUNT de NULL retorna 0. Esto es un patron clasico para detectar entidades "huerfanas" o sin datos relacionados.

---

### Pregunta 12
**Nivel:** 3 — JOINs
**Peso:** 6 puntos
**Formato:** Mini-editor SQL

**Enunciado:**
Escribe una query que retorne el nombre del producto (`products.name`), la categoria (`categories.name`), y el total de unidades vendidas (`SUM(order_items.quantity)`), para todos los productos que hayan sido vendidos al menos una vez. Ordena los resultados de mayor a menor por unidades vendidas.

**Tablas disponibles:** `products`, `categories`, `order_items`

**Criterio de exito:**
- La query ejecuta sin error
- Usa al menos 2 JOINs (products-categories y products-order_items)
- Incluye GROUP BY sobre las columnas de nombre no agregadas
- El ORDER BY usa la funcion de agregacion o su alias

**Respuesta modelo:**
```sql
SELECT p.name          AS producto,
       c.name          AS categoria,
       SUM(oi.quantity) AS unidades_vendidas
FROM order_items oi
INNER JOIN products p   ON p.product_id  = oi.product_id
INNER JOIN categories c ON c.category_id = p.category_id
GROUP BY p.name, c.name
ORDER BY unidades_vendidas DESC;
```

**Respuestas alternativas aceptadas:**
- Usar `p.product_id, c.category_id` en el GROUP BY en lugar de los nombres (equivalente en la practica)
- Usar `ORDER BY SUM(oi.quantity) DESC` en lugar del alias

**Puntuacion parcial:**
- JOIN correcto entre order_items y products: 2 puntos
- JOIN correcto entre products y categories: 2 puntos
- GROUP BY y SUM correctos: 2 puntos

---

## BLOQUE D — Analisis de Clientes (Nivel 4)

*Tablas disponibles: customers, products, categories, orders, order_items, returns*

```
returns: return_id, order_id, product_id, returned_at, reason, status
```

---

### Pregunta 13
**Nivel:** 4 — Subqueries
**Peso:** 5 puntos
**Formato:** "Que retorna esta query"

```sql
SELECT first_name, last_name, email
FROM customers
WHERE customer_id NOT IN (
    SELECT DISTINCT customer_id
    FROM orders
    WHERE status = 'delivered'
);
```

- A) Los clientes que tienen al menos un pedido entregado
- B) Los clientes que nunca han tenido un pedido entregado (ya sea porque no tienen pedidos, o porque todos estan en otro estado)
- C) Un error, porque NOT IN no puede usarse con subqueries
- D) Los clientes con pedidos cancelados

**Respuesta correcta:** B
**Explicacion:** La subquery devuelve la lista de customer_id con al menos un pedido entregado. NOT IN excluye esos IDs de la tabla `customers`, dejando solo a los que nunca aparecen en esa lista. Atencion: si la subquery puede retornar NULLs, NOT IN puede dar resultados inesperados — un matiz importante de nivel 4.

---

### Pregunta 14
**Nivel:** 4 — NULL handling
**Peso:** 5 puntos
**Formato:** Opcion multiple

Que retorna `COALESCE(reason, 'Sin motivo registrado')` en la tabla `returns`?

- A) El valor de `reason` si no es NULL; de lo contrario, la cadena 'Sin motivo registrado'
- B) NULL si `reason` es NULL; de lo contrario, 'Sin motivo registrado'
- C) Un error si `reason` contiene valores NULL
- D) El conteo de filas donde `reason` es NULL

**Respuesta correcta:** A
**Explicacion:** COALESCE retorna el primer argumento no-NULL de la lista. Es la forma estandar de manejar NULLs en columnas opcionales, reemplazandolos con un valor por defecto para presentacion o calculo.

---

### Pregunta 15
**Nivel:** 4 — Subqueries / UNION
**Peso:** 6 puntos
**Formato:** Mini-editor SQL

**Enunciado:**
Escribe una query que liste los `customer_id` de clientes que:
- Hicieron al menos un pedido con status `'delivered'`, O
- Tienen al menos una devolucion con status `'approved'`

Cada customer_id debe aparecer una sola vez en el resultado.

**Tablas disponibles:** `orders`, `returns`

**Criterio de exito:**
- Usa UNION (no UNION ALL) para eliminar duplicados
- Cada parte del UNION selecciona la columna correcta
- El resultado no tiene duplicados

**Respuesta modelo:**
```sql
SELECT customer_id
FROM orders
WHERE status = 'delivered'

UNION

SELECT o.customer_id
FROM orders o
INNER JOIN returns r ON r.order_id = o.order_id
WHERE r.status = 'approved';
```

**Nota:** La segunda parte necesita obtener el `customer_id` a partir de una devolucion. La ruta es: `returns.order_id → orders.order_id → orders.customer_id`. Se requiere un JOIN entre `returns` y `orders` — no es necesario pasar por `order_items`. El `DISTINCT` en cada parte es redundante porque `UNION` (sin `ALL`) ya elimina duplicados automaticamente; puede mantenerse por claridad o removerse.

**Puntuacion parcial:**
- Primera parte correcta (orders + delivered): 2 puntos
- Segunda parte con JOIN correcto: 2 puntos
- Uso de UNION (sin ALL): 2 puntos

---

## BLOQUE E — SQL Avanzado y Analitica (Niveles 5 y 6)

*Tablas disponibles para este bloque: `orders`. Las preguntas 16-20 se enfocan exclusivamente en analisis temporal y window functions sobre pedidos. Todas las tablas de Niveles 0-5 estan disponibles en el entorno, pero las preguntas de este bloque no las requieren.*

---

### Pregunta 16
**Nivel:** 5 — CTEs
**Peso:** 5 puntos
**Formato:** "Que retorna esta query"

```sql
WITH pedidos_por_cliente AS (
    SELECT customer_id,
           COUNT(*) AS total_pedidos
    FROM orders
    GROUP BY customer_id
)
SELECT customer_id, total_pedidos
FROM pedidos_por_cliente
WHERE total_pedidos >= 5;
```

- A) Un error, porque WITH no puede usarse con GROUP BY
- B) El conteo total de pedidos de todos los clientes con 5 o mas pedidos
- C) Los customer_id y su conteo de pedidos, filtrando solo los clientes con 5 o mas pedidos
- D) Los primeros 5 pedidos de cada cliente

**Respuesta correcta:** C
**Explicacion:** La CTE (Common Table Expression) actua como una tabla temporal con nombre. Primero calcula el total de pedidos por cliente, luego la query principal filtra ese resultado. Es equivalente a una subquery en FROM pero mas legible.

---

### Pregunta 17
**Nivel:** 5 — Window Functions
**Peso:** 5 puntos
**Formato:** "Que retorna esta query"

```sql
SELECT customer_id,
       ordered_at,
       ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY ordered_at ASC) AS orden_numero
FROM orders;
```

- A) Un numero de fila global para todos los pedidos de la tabla, ordenados por fecha
- B) Para cada cliente, un numero secuencial que reinicia en 1 para cada cliente, ordenado por fecha de pedido mas antigua a mas nueva
- C) El numero de pedidos que tiene cada cliente
- D) Un error, porque PARTITION BY no puede combinarse con ORDER BY dentro de OVER

**Respuesta correcta:** B
**Explicacion:** PARTITION BY divide el resultado en "ventanas" separadas por cliente. ROW_NUMBER() reinicia su conteo en cada nueva ventana. ORDER BY dentro de OVER determina el orden dentro de cada particion, no el orden del resultado final. Esto permite identificar, por ejemplo, el primer pedido de cada cliente (donde orden_numero = 1).

---

### Pregunta 18
**Nivel:** 5 — Window Functions
**Peso:** 5 puntos
**Formato:** Opcion multiple

Cual es la diferencia entre RANK() y DENSE_RANK()?

- A) RANK() solo funciona con numeros; DENSE_RANK() funciona con cualquier tipo de dato
- B) Cuando hay empates, RANK() deja huecos en la numeracion; DENSE_RANK() no deja huecos
- C) DENSE_RANK() es identico a ROW_NUMBER() pero mas rapido
- D) No hay diferencia practica entre los dos

**Respuesta correcta:** B
**Ejemplo aclaratorio:**
Con valores [100, 90, 90, 80]:
- RANK():       1, 2, 2, 4  (salta el 3 por el empate)
- DENSE_RANK(): 1, 2, 2, 3  (no salta ningun numero)

---

### Pregunta 19
**Nivel:** 6 — LAG/LEAD y analisis temporal
**Peso:** 6 puntos
**Formato:** "Que retorna esta query"

```sql
SELECT DATE_TRUNC('month', ordered_at)        AS mes,
       COUNT(*)                                AS pedidos_mes,
       LAG(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', ordered_at)) AS pedidos_mes_anterior
FROM orders
GROUP BY DATE_TRUNC('month', ordered_at)
ORDER BY mes;
```

- A) Los pedidos del mes actual y del mes siguiente, para comparacion futura
- B) El total de pedidos por mes, junto con el total del mes inmediatamente anterior en la misma fila, para comparacion periodo a periodo
- C) Un error, porque LAG no puede usarse sobre el resultado de COUNT(*)
- D) Los ultimos dos meses de pedidos unicamente

**Respuesta correcta:** B
**Explicacion:** LAG() accede al valor de la fila anterior dentro de la ventana definida por OVER. Aqui la ventana esta ordenada por mes, por lo que LAG retorna el COUNT del mes anterior. El primer mes tendra NULL en esa columna (no hay mes anterior). Este patron es la base del analisis de crecimiento mes a mes (MoM).

---

### Pregunta 20
**Nivel:** 6 — Analitica avanzada
**Peso:** 6 puntos
**Formato:** Mini-editor SQL

**Enunciado:**
Usando la tabla `orders`, escribe una query que calcule para cada mes:
1. El total de pedidos de ese mes
2. El porcentaje de cambio respecto al mes anterior (puede ser NULL para el primer mes)

Muestra: `mes`, `pedidos_mes`, `pedidos_mes_anterior`, `pct_cambio`

**Criterio de exito:**
- Usa LAG o una CTE para obtener el valor del mes anterior
- Calcula el porcentaje correctamente: `(actual - anterior) / anterior * 100`
- Maneja el caso donde el mes anterior es NULL (primer mes)

**Respuesta modelo:**
```sql
WITH pedidos_mensuales AS (
    SELECT DATE_TRUNC('month', ordered_at) AS mes,
           COUNT(*) AS pedidos_mes
    FROM orders
    GROUP BY DATE_TRUNC('month', ordered_at)
),
con_anterior AS (
    SELECT mes,
           pedidos_mes,
           LAG(pedidos_mes) OVER (ORDER BY mes) AS pedidos_mes_anterior
    FROM pedidos_mensuales
)
SELECT mes,
       pedidos_mes,
       pedidos_mes_anterior,
       ROUND(
           (pedidos_mes - pedidos_mes_anterior)::DECIMAL
           / NULLIF(pedidos_mes_anterior, 0) * 100,
           2
       ) AS pct_cambio
FROM con_anterior
ORDER BY mes;
```

**Nota sobre la respuesta modelo:** La version con doble CTE es la practica recomendada porque materializa `pedidos_mes_anterior` una sola vez y lo reutiliza en el calculo de `pct_cambio`, evitando repetir la misma window function tres veces en un mismo SELECT. Ambas formas producen el mismo resultado; la diferencia es legibilidad y mantenibilidad.

**Version alternativa (una sola CTE — tambien correcta, recibe puntaje completo):**
```sql
WITH pedidos_mensuales AS (
    SELECT DATE_TRUNC('month', ordered_at) AS mes,
           COUNT(*)                         AS pedidos_mes
    FROM orders
    GROUP BY DATE_TRUNC('month', ordered_at)
)
SELECT mes,
       pedidos_mes,
       LAG(pedidos_mes) OVER (ORDER BY mes) AS pedidos_mes_anterior,
       ROUND(
           (pedidos_mes - LAG(pedidos_mes) OVER (ORDER BY mes))::DECIMAL
           / NULLIF(LAG(pedidos_mes) OVER (ORDER BY mes), 0) * 100,
           2
       ) AS pct_cambio
FROM pedidos_mensuales
ORDER BY mes;
```

**Puntuacion parcial:**
- CTE o subquery para agrupar por mes: 2 puntos
- LAG correcto sobre el conteo mensual: 2 puntos
- Calculo del porcentaje con manejo de NULL/division por cero: 2 puntos

---

## BLOQUE F — SQL para BI y SQL Profesional (Niveles 7 y 8)

*Preguntas conceptuales — no requieren editor SQL*

---

### Pregunta 21
**Nivel:** 7 — SQL para BI / Funnel
**Peso:** 5 puntos
**Formato:** Opcion multiple conceptual

En analisis de funnel de conversion, tienes sesiones web y quieres calcular la tasa de conversion (sesiones que terminaron en pedido / total de sesiones). Cual estructura SQL es mas apropiada?

- A) Un simple COUNT(*) sobre la tabla de pedidos
- B) Un LEFT JOIN entre sesiones y pedidos, usando CASE WHEN o COUNT de la columna de pedidos (que sera NULL donde no hubo conversion)
- C) Un INNER JOIN entre sesiones y pedidos, que naturalmente elimina las sesiones sin pedido
- D) Una subquery correlacionada que verifique existencia de pedido para cada sesion

**Respuesta correcta:** B
**Explicacion:** Para calcular tasas de conversion necesitas el denominador (todas las sesiones) y el numerador (sesiones con pedido). Un LEFT JOIN preserva todas las sesiones. Donde no hay pedido, la columna de pedido es NULL. COUNT(columna_pedido) cuenta solo los no-NULL, dando el numerador. COUNT(*) da el denominador. INNER JOIN perderia las sesiones sin conversion — justamente las que necesitas para calcular la tasa.

---

### Pregunta 22
**Nivel:** 7 — Vistas y reutilizacion
**Peso:** 4 puntos
**Formato:** Opcion multiple conceptual

Una VIEW en SQL es:

- A) Una copia fisica de los datos que se actualiza periodicamente
- B) Una query guardada con nombre que se comporta como una tabla virtual
- C) Un indice especial que acelera las consultas frecuentes
- D) Una tabla temporal que expira al cerrar la sesion

**Respuesta correcta:** B
**Explicacion:** Una VIEW almacena la definicion de la query, no los datos. Cada vez que se consulta la view, la query subyacente se ejecuta. Esto permite reutilizar logica compleja, abstraer complejidad y controlar que columnas son visibles sin duplicar datos.

---

### Pregunta 23
**Nivel:** 8 — Indices
**Peso:** 5 puntos
**Formato:** Opcion multiple conceptual

Tienes esta query que se ejecuta miles de veces al dia sobre una tabla con millones de filas:

```sql
SELECT * FROM orders
WHERE customer_id = 12345
AND status = 'pending';
```

Cual indice seria mas util crear?

- A) Un indice en `order_id` (PRIMARY KEY)
- B) Un indice compuesto en `(customer_id, status)`
- C) Un indice en `ordered_at`
- D) No es necesario ningun indice porque la PRIMARY KEY ya optimiza todas las queries

**Respuesta correcta:** B
**Explicacion:** La query filtra por `customer_id` Y `status`. Un indice compuesto en ambas columnas permite al motor encontrar directamente las filas que cumplen ambas condiciones sin leer la tabla completa. El indice en `order_id` no ayuda porque esa columna no esta en el WHERE. Un indice solo en `customer_id` seria util pero menos optimo que el compuesto para esta query especifica.

---

### Pregunta 24
**Nivel:** 8 — Transacciones
**Peso:** 5 puntos
**Formato:** Opcion multiple conceptual

Que garantiza la propiedad ACID de una transaccion SQL?

- A) Que la query se ejecute mas rapido gracias al cache del motor
- B) Que si una operacion dentro de la transaccion falla, todos los cambios de esa transaccion se deshacen automaticamente (rollback), manteniendo la integridad de los datos
- C) Que los datos se replican automaticamente a un servidor de backup
- D) Que las queries dentro de la transaccion se ejecutan en paralelo

**Respuesta correcta:** B
**Explicacion:** ACID (Atomicity, Consistency, Isolation, Durability). La Atomicidad garantiza que la transaccion es todo-o-nada: si cualquier parte falla, el estado de la base de datos queda exactamente como estaba antes de empezar. Esto es critico en operaciones como pagos o transferencias donde multiples tablas deben actualizarse de forma coherente.

---

## MATRIZ DE PUNTUACION Y NIVEL RECOMENDADO

### Puntaje maximo por nivel

| Nivel | Preguntas | Puntos maximos |
|-------|-----------|----------------|
| 0 — Fundamentos | 1, 2, 3 | 9 pts |
| 1 — Exploracion | 4, 5, 6 | 12 pts |
| 2 — Metricas | 7, 8, 9 | 13 pts |
| 3 — JOINs | 10, 11, 12 | 16 pts |
| 4 — Subqueries/NULL | 13, 14, 15 | 16 pts |
| 5 — CTEs/Window | 16, 17, 18 | 15 pts |
| 6 — LAG/LEAD | 19, 20 | 12 pts |
| 7 — BI/Funnel | 21, 22 | 9 pts |
| 8 — Indices/TX | 23, 24 | 10 pts |
| **TOTAL** | **24** | **112 pts** |

*Nota: el total supera 100 porque las preguntas de mini-editor tienen puntuacion parcial. La normalizacion se aplica al calcular el porcentaje por nivel.*

---

### Algoritmo de calculo del nivel de entrada

El nivel de entrada se calcula evaluando el rendimiento **nivel por nivel, de forma secuencial**. El estudiante entra al **primer nivel donde su dominio cae por debajo del umbral de dominio**.

#### Definicion de umbrales

| Porcentaje correcto en el nivel X | Interpretacion | Decision |
|-----------------------------------|----------------|----------|
| >= 80% | Dominio solido | Avanza al siguiente nivel |
| 60% - 79% | Conocimiento parcial | Entra en nivel X (repaso rapido + ejercicios) |
| 40% - 59% | Fundamentos inestables | Entra en nivel X-1 (consolidacion antes de avanzar) |
| < 40% | Sin base suficiente | Entra en nivel X-1 o inferior segun patron |

#### Reglas especiales

**Regla 1 — Nivel 0 garantizado:**
Si el puntaje en preguntas de Nivel 0 es menor al 60%, el estudiante entra en Nivel 0 sin excepcion, independientemente del rendimiento en otros niveles.

**Regla 2 — No se saltean mas de 2 niveles consecutivos:**
Si el estudiante tiene >= 80% en niveles 0-3 pero cae a < 40% en nivel 4, el sistema no lo ubica directamente en nivel 5. Lo ubica en nivel 4 para asegurar una base solida antes de avanzar.

**Regla 3 — Consistencia requerida:**
Si hay un patron de alto rendimiento seguido de caida brusca (ej: 90% en niveles 0-4, luego 20% en nivel 5), el sistema toma el nivel donde ocurrio la caida como punto de entrada, con una nota de que los niveles previos pueden omitirse rapidamente.

**Regla 4 — Puntaje de corte minimo para saltear:**
Para saltear un nivel (tratarlo como "ya dominado"), el estudiante necesita >= 80% en ese nivel Y >= 60% en el nivel siguiente. Esto asegura que el conocimiento es solido, no memorizado.

---

### Tabla de decision final (referencia rapida)

Esta tabla resume el nivel recomendado segun el patron de rendimiento acumulado:

| Patron de rendimiento | Nivel de entrada recomendado |
|-----------------------|------------------------------|
| < 60% en Nivel 0 | Nivel 0 — Fundamentos |
| >= 80% en Nivel 0, < 60% en Nivel 1 | Nivel 1 — Exploracion |
| >= 80% en Niveles 0-1, < 60% en Nivel 2 | Nivel 2 — Metricas |
| 60-79% en Nivel 2 | Nivel 2 (con repaso rapido de Nivel 1) |
| >= 80% en Niveles 0-2, < 60% en Nivel 3 | Nivel 3 — JOINs |
| >= 80% en Niveles 0-3, < 60% en Nivel 4 | Nivel 4 — Subqueries |
| 60-79% en Nivel 4 | Nivel 4 (con refuerzo de Nivel 3) |
| >= 80% en Niveles 0-4, < 60% en Nivel 5 | Nivel 5 — SQL Avanzado |
| >= 80% en Niveles 0-5, < 60% en Nivel 6 | Nivel 6 — Analitica |
| >= 80% en Niveles 0-6, < 60% en Nivel 7 | Nivel 7 — BI |
| >= 80% en Niveles 0-7, < 60% en Nivel 8 | Nivel 8 — SQL Profesional |
| >= 80% en todos los niveles | Capstone directo (con revision de perfil) |

---

### Mensaje de resultado al estudiante

El sistema genera uno de estos mensajes segun el nivel calculado:

**Si entra en Nivel 0:**
> "Perfecto punto de partida. Empezamos desde los fundamentos del modelo relacional — en unas horas ya estaras escribiendo tus primeras queries. No se necesita experiencia previa."

**Si entra en Niveles 1-2:**
> "Tienes nociones basicas de SQL. Empezamos en [nombre del nivel] para afianzar esas bases antes de pasar a analisis de datos reales."

**Si entra en Niveles 3-4:**
> "Tienes una base solida en SQL. Empezamos en [nombre del nivel], donde el curso se vuelve mas interesante: queries que responden preguntas de negocio reales."

**Si entra en Niveles 5-6:**
> "Manejas bien el SQL del dia a dia. Empezamos en [nombre del nivel] — aqui es donde la mayoria de analistas tiene sus brechas mas grandes. CTEs, window functions y analisis temporal."

**Si entra en Niveles 7-8:**
> "SQL solido. Empezamos en [nombre del nivel] con enfoque en aplicaciones profesionales: preparacion para BI, optimizacion y SQL en produccion."

**Si pasa todo (Capstone directo):**
> "Rendimiento muy alto en todos los niveles. Te proponemos empezar directamente con el Capstone, nuestro proyecto integrador. Si en algun punto quieres reforzar algun concepto especifico, los modulos estan disponibles."

---

## Instrucciones de Implementacion para el Instructor

### Orden de presentacion al estudiante

1. Mostrar el bloque de introduccion ("Para el Estudiante") antes de cualquier pregunta
2. Presentar las preguntas en orden (Bloque A al F), sin mostrar el nivel al que corresponde cada una
3. No mostrar el puntaje parcial durante la evaluacion
4. Al finalizar, calcular el nivel con el algoritmo descrito y mostrar solo el mensaje de resultado y el nivel recomendado
5. Ofrecer la opcion de revisar en que preguntas tuvo errores (con explicacion) antes de empezar el curso

### Consideraciones de UX

- Las preguntas del mini-editor (12, 15, 20) deben tener un editor con syntax highlighting y un boton "Ejecutar" contra un schema de ShopSphere en modo solo-lectura
- El tiempo estimado debe mostrarse como rango ("15-20 minutos"), no como cuenta regresiva, para no generar presion
- Debe existir un boton de "No se / Saltar" visible en todas las preguntas
- La evaluacion debe poder pausarse y retomarse

### Mantenimiento del archivo

Este archivo es la fuente de verdad de la evaluacion diagnostica.
Cualquier cambio en las preguntas debe ir acompanado de:
- Revision del algoritmo de puntuacion si cambia el peso de preguntas
- Actualizacion de la tabla de puntaje maximo por nivel
- Nota de version y fecha de modificacion al pie del archivo

---

*Archivo generado el 2026-05-31*
*Version 1.0 — Evaluacion diagnostica inicial*
*Curso: SQL para Analisis de Datos — ShopSphere*
