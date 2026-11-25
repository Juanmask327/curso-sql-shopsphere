# Nivel 0 — Fundamentos
## Lección 1: El modelo relacional y el mundo de ShopSphere

> Esta lección no tiene queries. El objetivo es que termines entendiendo *por qué* existen las bases de datos relacionales antes de escribir una sola línea de SQL. Ese "por qué" hace que todo lo demás tenga sentido.

---

## 1. INTRODUCCIÓN CONCEPTUAL

### El problema que ShopSphere tenía antes de tener una base de datos

Imagina que eres Marco Jiménez en 2019, el primer año de ShopSphere. Tienes 12 marcas vendedoras, algunos cientos de clientes y un sistema de pagos que falla el 20% del tiempo. Para llevar el control del negocio, usas hojas de cálculo en Excel.

Una hoja tiene los clientes. Otra tiene los productos. Otra tiene los pedidos. Y entonces aparece el primer problema real: **cuando un cliente cambia su email, tienes que actualizar todas las hojas donde ese email aparece**. Si se te olvida una, los datos se contradicen entre sí. El negocio empieza a operar sobre información que no es confiable.

Ahora imagina que no son cientos de clientes sino 200.000, como tiene ShopSphere hoy. El problema se multiplica hasta ser inmanejable.

Una **base de datos relacional** resuelve exactamente esto. En lugar de copiar la misma información en múltiples lugares, la almacenas *una sola vez* y estableces *relaciones* entre las piezas. Cuando algo cambia, cambia en un lugar y todo lo demás sigue siendo coherente.

### ¿Qué es una base de datos relacional?

Una base de datos relacional es un sistema que organiza información en **tablas** (también llamadas relaciones — de ahí el nombre). Cada tabla representa un tipo de entidad del mundo real: clientes, productos, pedidos.

Las tablas se **conectan entre sí** mediante identificadores comunes. Ese sistema de conexiones es lo que permite hacer preguntas complejas del tipo "¿qué productos compró este cliente y cuánto gastó en total?" sin duplicar ningún dato.

### La analogía del archivo físico

Piensa en un sistema de archivo de una oficina antigua:

- Hay un **cajón de clientes**: cada carpeta tiene el nombre, email y dirección de un cliente. Cada carpeta tiene un número único escrito en la portada.
- Hay un **cajón de productos**: cada carpeta describe un producto con su precio. También tiene número único.
- Hay un **cajón de pedidos**: cada carpeta dice "el cliente número 47 pidió el producto número 12". No repite el nombre del cliente ni la descripción del producto — solo usa los números para referenciarlos.

Si el cliente número 47 cambia su dirección, solo actualizas su carpeta en el cajón de clientes. Todos los pedidos que lo referencian por número siguen siendo correctos sin tocarlos.

Una base de datos relacional es ese sistema de archivo, pero digital, con capacidad de consultar millones de registros en milisegundos.

---

## 2. COMPONENTES FUNDAMENTALES

### 2.1 Tablas

Una tabla es una estructura de filas y columnas. Cada **columna** define un tipo de dato (el nombre del cliente, su email, su país). Cada **fila** es un registro concreto (el cliente Fernanda Guerrero de Venezuela).

Así se ve la tabla `customers` de ShopSphere con algunos registros reales:

| customer_id | first_name | last_name | email                        | city     | country   | registered_at |
|-------------|------------|-----------|------------------------------|----------|-----------|---------------|
| 6           | Raul       | Castillo  | raul.castillo@outlook.com    | NULL     | Chile     | 2023-10-09    |
| 34          | Marcela    | Aguilar   | marcela.aguilar@gmail.com    | Guayaquil| Ecuador   | 2023-09-23    |
| 63          | Juan       | Chavez    | juan.chavez@outlook.com      | Barranquilla | Colombia | 2023-07-04 |

Cada fila es un cliente diferente. Cada columna captura un atributo de ese cliente.

### 2.2 Tipos de datos

No todos los datos son iguales. Una fecha no es lo mismo que un número con decimales, y almacenarlos de forma incorrecta causa problemas. Los tipos de datos principales que vas a usar en ShopSphere son:

| Tipo | Qué almacena | Ejemplo en ShopSphere |
|------|-------------|----------------------|
| `INT` | Números enteros | `customer_id`, `product_id`, `quantity` |
| `VARCHAR(n)` | Texto de longitud variable, máximo n caracteres | `first_name`, `email`, `country` |
| `TEXT` | Texto de longitud ilimitada | `description` en categories |
| `DECIMAL(p, s)` | Número decimal con precisión exacta | `price` — DECIMAL(10,2) significa hasta 10 dígitos, 2 decimales |
| `BOOLEAN` | Verdadero o falso | `is_active` en products |
| `DATE` | Fecha (sin hora) | `registered_at` en customers |
| `TIMESTAMP` | Fecha y hora | `ordered_at` en orders |

**Por qué DECIMAL y no FLOAT para precios:** los números de punto flotante (`FLOAT`, `DOUBLE`) tienen imprecisión matemática inherente. $9.99 almacenado como FLOAT puede calcularse como $9.989999... en operaciones. En dinero eso no es aceptable. `DECIMAL(10,2)` almacena el número exacto, siempre.

### 2.3 Primary Key (PK) — La identidad de cada fila

Cada tabla necesita una forma de identificar de manera única a cada fila. Eso es la **Primary Key** (clave primaria).

En ShopSphere:
- `customers.customer_id` es la PK de la tabla de clientes
- `products.product_id` es la PK de la tabla de productos
- `categories.category_id` es la PK de la tabla de categorías

**Reglas de la Primary Key:**
1. Debe ser única: no pueden existir dos filas con el mismo valor
2. No puede ser NULL: toda fila debe tener un identificador
3. No debería cambiar: los IDs son estables en el tiempo

Importante: en la práctica, las PKs suelen ser números enteros secuenciales (1, 2, 3...). El motor de base de datos los gestiona automáticamente. No tienes que preocuparte por asignarlos manualmente.

### 2.4 Foreign Key (FK) — Las conexiones entre tablas

Una **Foreign Key** (clave foránea) es una columna en una tabla que contiene el valor de la Primary Key de *otra* tabla. Es el mecanismo que crea las relaciones.

Mira la tabla `products` de ShopSphere:

```
products
─────────────────────────────────────────────────────────────
product_id  │  name              │  category_id  │  price
─────────────────────────────────────────────────────────────
1           │  Laptop Pro 15"    │  1            │  899.99
2           │  USB-C Hub         │  1            │  49.99
17          │  Auriculares BT    │  2            │  79.99
```

El campo `category_id` en `products` es una Foreign Key que apunta a `categories.category_id`. Esto significa:

- El producto "Laptop Pro 15" pertenece a la categoría número 1
- El producto "Auriculares BT" pertenece a la categoría número 2
- La descripción completa de esas categorías vive en la tabla `categories`, no en `products`

Si quieres saber el nombre de la categoría de un producto, buscas el `category_id` del producto y lo cruzas con la tabla `categories`.

**Integridad referencial:** una FK impone una restricción: no puedes asignar a un producto un `category_id` que no existe en la tabla `categories`. Esto protege la coherencia de los datos. ShopSphere tiene 10 categorías (IDs del 1 al 10). Si alguien intentara insertar un producto con `category_id = 99`, la base de datos lo rechazaría.

### 2.5 El modelo relacional de ShopSphere (Nivel 0-1)

En este nivel trabajamos con tres tablas. Así se relacionan:

```
┌─────────────────┐          ┌─────────────────────────────────┐
│   categories    │          │            products              │
├─────────────────┤          ├─────────────────────────────────┤
│ category_id  PK │◄─────────│ category_id  FK                 │
│ name            │          │ product_id   PK                 │
│ description     │          │ name                            │
└─────────────────┘          │ price                           │
                             │ is_active                       │
                             └─────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                         customers                           │
├─────────────────────────────────────────────────────────────┤
│ customer_id  PK                                             │
│ first_name                                                  │
│ last_name                                                   │
│ email   (UNIQUE)                                            │
│ city                                                        │
│ country                                                     │
│ registered_at                                               │
└─────────────────────────────────────────────────────────────┘
```

En este nivel, `customers` es independiente — no está conectada a `products` todavía. Esa conexión llega en el Nivel 2 a través de la tabla `orders`.

---

## 3. ¿QUÉ ES SQL?

**SQL** (Structured Query Language, lenguaje de consulta estructurado) es el idioma que se usa para hablar con una base de datos relacional.

Con SQL puedes:
- **Preguntar** cosas: "¿Cuáles son los productos activos con precio mayor a $100?"
- **Insertar** datos: registrar un nuevo cliente
- **Modificar** datos: actualizar el precio de un producto
- **Eliminar** datos: dar de baja un producto del catálogo
- **Definir** estructuras: crear o modificar tablas

En este curso el foco es el primer punto: **hacer preguntas**. El rol de Data Analyst consiste en extraer información para responder preguntas de negocio. Valentina Torres no te va a pedir que crees tablas ni insertes datos — te va a pedir que encuentres patrones en los datos que ya existen.

### SQL es declarativo, no imperativo

En la mayoría de los lenguajes de programación (Python, JavaScript), dices *cómo* hacer algo: "recorre cada fila, compara el valor, guarda los que cumplan la condición."

En SQL dices *qué quieres*: "dame todos los clientes de México ordenados por fecha de registro."

El motor de base de datos decide *cómo* obtenerlo. Tú describes el resultado que necesitas.

### El RDBMS: el motor que ejecuta SQL

SQL es el lenguaje. El **RDBMS** (Relational Database Management System) es el software que lo ejecuta y gestiona el almacenamiento físico de los datos.

En producción, ShopSphere usa **PostgreSQL** — uno de los RDBMS de código abierto más robustos del mundo. El **Playground** donde practicas en este curso corre **SQLite**, directamente en tu navegador. Otros sistemas populares son MySQL y SQL Server. La sintaxis de SQL es muy similar entre ellos, con diferencias pequeñas en funciones específicas. Durante el curso señalaremos las diferencias relevantes cuando aparezcan.

---

## 4. SHOPSPHERE: EL CONTEXTO DE NEGOCIO

Antes de escribir la primera query, necesitas entender para qué empresa estás trabajando y qué preguntan las personas que van a usar tus análisis.

**Eres el nuevo Data Analyst de ShopSphere.** Valentina Torres, Head of Analytics, te contrató. Eres el primer analista formal del equipo — el área estaba en construcción y la persona anterior renunció hace meses. Hay trabajo esperando.

Las personas que van a pedirte análisis son:

**Valentina Torres** — Tu jefa directa. Preguntas técnicas y concretas. Quiere saber cuánto revenue generó cada país, qué clientes tienen mayor valor de vida, cuáles son los productos con mayor tasa de devolución. Sus emails son cortos y van al punto.

**Marco Jiménez** — CEO. Preguntas grandes y a veces imprecisas. "¿Cuánto vale un cliente nuevo en su primer año?" Es tu trabajo convertir esa pregunta en algo que puedas medir con SQL.

**Sofía Ramírez** — Head of Marketing. Quiere saber si sus campañas funcionaron. "¿Cuántos clientes nuevos trajo el Black Friday?"

**Diego Morales** — Head of Operations. Preocupado por inventario y devoluciones. "¿Qué productos tienen la tasa de devolución más alta este mes?"

**Ana Castillo** — Head of Finance. La más exigente con los números. Quiere revenue neto, márgenes, pagos fallidos. Si hay una inconsistencia en los datos, ella la va a detectar.

Cada ejercicio del curso va a tener este contexto. No estás escribiendo queries abstractas — estás respondiendo preguntas reales de personas reales dentro de una empresa que conoces.

---

## 5. NULL: EL VALOR ESPECIAL

Antes de terminar la parte conceptual, hay un concepto que confunde a muchos estudiantes y que conviene entender desde el principio: **NULL**.

NULL no es cero. NULL no es el texto vacío `""`. NULL significa **ausencia de valor** — que el dato simplemente no existe o no se conoce.

En la tabla `customers`, muchos registros tienen `city = NULL`. Eso no significa que esos clientes viven en una ciudad llamada "NULL" ni en una ciudad desconocida. Significa que cuando se registraron, no ingresaron su ciudad. El dato no existe.

Esto tiene consecuencias prácticas importantes que exploraremos en el Nivel 4. Por ahora, basta con saber que NULL es diferente a cualquier valor concreto, y que las operaciones matemáticas sobre NULL producen NULL (no un error, sino otro NULL).

---

## 6. RESUMEN: LO QUE DEBES PODER EXPLICAR

Al terminar esta lección, deberías poder responder estas preguntas con tus propias palabras:

1. ¿Qué problema resuelve una base de datos relacional que las hojas de cálculo no resuelven bien?
2. ¿Cuál es la diferencia entre una Primary Key y una Foreign Key?
3. ¿Por qué se usa DECIMAL en lugar de FLOAT para almacenar precios?
4. ¿Qué es NULL y por qué no es lo mismo que cero?
5. ¿Qué hace SQL y cómo se diferencia de los lenguajes de programación tradicionales?

Si puedes responder las cinco, estás listo para el Nivel 1.

---

## 7. EJERCICIOS CONCEPTUALES

Estos ejercicios son de opción múltiple. No requieren escribir SQL. El objetivo es confirmar que los conceptos fundamentales están claros.

---

**Ejercicio 1**

ShopSphere almacena el precio de sus productos. ¿Cuál de los siguientes tipos de dato es más apropiado para el campo `price`?

- A) `INT` — porque los precios son números
- B) `VARCHAR(20)` — porque los precios incluyen el símbolo $
- C) `DECIMAL(10, 2)` — porque los precios tienen centavos y deben ser exactos
- D) `BOOLEAN` — porque un producto puede ser "caro" o "barato"

<details>
<summary>Ver respuesta</summary>

**Respuesta: C**

`DECIMAL(10, 2)` es el tipo correcto para valores monetarios. Permite hasta 10 dígitos en total con exactamente 2 decimales. `INT` eliminaría los centavos. `VARCHAR` almacenaría texto, no números, haciendo imposible las sumas. `BOOLEAN` solo tiene dos estados.

</details>

---

**Ejercicio 2**

En la base de datos de ShopSphere, la tabla `products` tiene una columna `category_id` que es una Foreign Key hacia la tabla `categories`. Un desarrollador intenta insertar un nuevo producto con `category_id = 99`, pero ShopSphere solo tiene categorías del 1 al 10. ¿Qué ocurre?

- A) El producto se inserta con `category_id = NULL` automáticamente
- B) La base de datos rechaza la inserción con un error de integridad referencial
- C) El producto se inserta normalmente y `category_id = 99` queda sin referencia
- D) La base de datos crea automáticamente una nueva categoría con ID 99

<details>
<summary>Ver respuesta</summary>

**Respuesta: B**

La Foreign Key impone una restricción de integridad referencial. El valor que se asigna a la FK debe existir como Primary Key en la tabla referenciada. Como no existe ninguna categoría con ID 99, la base de datos rechaza la operación. Esto es exactamente el mecanismo que protege la coherencia de los datos.

</details>

---

**Ejercicio 3**

Valentina le pide a Diego que le diga cuántos clientes de México se registraron en noviembre de 2024. Diego revisa la tabla `customers` en Excel y encuentra que la columna `city` de varios registros mexicanos está en blanco. ¿Cómo debería interpretarse ese campo en blanco si viene de la base de datos PostgreSQL?

- A) Los clientes están registrados en una ciudad que se llama "blanco"
- B) El campo contiene el número cero
- C) El dato no existe — esos clientes no ingresaron su ciudad al registrarse (valor NULL)
- D) Los clientes están ubicados en la capital de México por defecto

<details>
<summary>Ver respuesta</summary>

**Respuesta: C**

NULL indica ausencia de valor. En ShopSphere, muchos clientes se registraron sin completar el campo `city`. Eso no significa que vivan en ningún lugar específico — simplemente que ese dato no está disponible. Al exportar a Excel, NULL suele aparecer como celda vacía, lo cual puede confundirse con texto vacío, pero son cosas diferentes.

</details>

---

**Ejercicio 4**

¿Cuál de las siguientes afirmaciones sobre las Primary Keys es correcta?

- A) Una tabla puede tener múltiples Primary Keys para permitir distintas formas de identificar filas
- B) La Primary Key puede ser NULL si el registro aún no tiene un ID asignado
- C) La Primary Key debe ser única por tabla: no pueden existir dos filas con el mismo valor de PK
- D) La Primary Key siempre debe ser un número entero; los textos no pueden ser Primary Keys

<details>
<summary>Ver respuesta</summary>

**Respuesta: C**

La unicidad es la propiedad fundamental de la Primary Key. Una tabla tiene exactamente una PK (aunque puede ser compuesta por múltiples columnas juntas). No puede ser NULL. Y aunque en la práctica suelen ser enteros por simplicidad y eficiencia, técnicamente puede ser cualquier tipo de dato único — por ejemplo, el campo `email` en `customers` es UNIQUE y podría funcionar como PK.

</details>

---

**Ejercicio 5**

Marco le dice a Valentina: "Quiero ver en qué categorías vendemos más. ¿Puedes pedir ese reporte?" Valentina te lo traslada. Para responder esa pregunta, ¿qué tablas del modelo de ShopSphere (disponibles actualmente) son relevantes?

- A) Solo `products` — ahí están los precios y se puede calcular el revenue
- B) `categories` y `products` — para saber cuántos productos activos hay por categoría
- C) Solo `customers` — el reporte es sobre quién compra, no qué compra
- D) `orders` y `order_items` — donde están las ventas reales

<details>
<summary>Ver respuesta</summary>

**Respuesta: B (con matiz)**

Con las tablas disponibles en el Nivel 0-1 (`customers`, `categories`, `products`), la única respuesta posible es B: podemos ver cuántos productos existen por categoría y cuáles están activos, pero no cuánto se vendió. Las ventas reales están en `orders` y `order_items`, que se desbloquean en los Niveles 2 y 3 respectivamente.

Esta pregunta tiene una lección importante: el alcance de lo que puedes responder depende de qué datos tienes disponibles. Una parte del trabajo de un analista es saber qué preguntas puede responder hoy y cuáles requieren tablas o datos adicionales.

</details>

---

## CONEXIÓN CON EL NIVEL 1

Ya entiendes qué son las tablas, cómo se conectan y por qué existen. Ahora necesitas la herramienta para hablar con ellas.

El Nivel 1 empieza con `SELECT` y `FROM` — las dos palabras que forman la base de toda query en SQL. Con ellas vas a poder por primera vez abrir la base de datos de ShopSphere y ver qué hay adentro.

El salto conceptual es pequeño: pasas de *entender* el modelo relacional a *consultarlo*. Pero el impacto es inmediato — en la primera lección ya vas a estar viendo datos reales de clientes y productos de ShopSphere.
