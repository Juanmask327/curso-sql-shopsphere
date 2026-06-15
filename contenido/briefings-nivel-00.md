# Briefings — Nivel 0: Fundamentos SELECT

> Ejercicios de SELECT, WHERE, ORDER BY, LIMIT y aliases sobre las tablas customers, products y orders.
> Urgencia calibrada: nivel de orientación inicial. El estudiante acaba de llegar a ShopSphere.
> La mayoría son consultas de exploración, no emergencias.

---

## Briefing 0.1

**De:** Valentina Torres
**Para:** [Estudiante]
**Asunto:** Acceso a la base de datos — primer paso

Ya tenés acceso. La contraseña te llega por separado de IT.

Antes de que empieces a analizar cualquier cosa, necesito que te familiarices con lo que tenemos. Empezá por la tabla de clientes — es la más importante y la que más vas a usar. Solo quiero que la veas completa por ahora. Nada de filtros todavía.

— Vale

---

## Briefing 0.2

**De:** Sofía Ramírez
**Para:** [Estudiante]
**CC:** Valentina Torres
**Asunto:** Lista de contacto básica — clientes

Hola, bienvenido al equipo. Valentina me dijo que ya tenés acceso a la base.

Necesito armar una lista de contacto para una comunicación que vamos a mandar la próxima semana. No necesito todos los campos del cliente — solo nombre, apellido, email y país. Nada más.

Sofía

---

## Briefing 0.3

**De:** Valentina Torres
**Para:** [Estudiante]
**Asunto:** Convención de columnas para reportes externos

Una cosa rápida: cuando compartís resultados con equipos que no trabajan con la base de datos, los nombres de columna técnicos como `first_name` o `last_name` los confunden. La convención del equipo es usar aliases en español para todo reporte que salga del área de analytics.

Practicá con la tabla de clientes: traé nombre, apellido, correo y país con los headers en español. Va a ser el estándar de ahora en adelante.

— Vale

---

## Briefing 0.4

**De:** Marco Jiménez
**Para:** Valentina Torres
**Asunto:** Catálogo cargado?

Vale, hicimos la migración de productos el viernes. ¿Alguien puede confirmar que los datos quedaron bien? Solo necesito ver una muestra — 10 filas está bien, no necesito el listado completo.

M

---

## Briefing 0.5

**De:** Sofía Ramírez
**Para:** [Estudiante]
**Asunto:** Campaña México — lista de clientes

Estamos lanzando una comunicación específica para el mercado mexicano la semana que viene. Necesito la lista de clientes registrados en México con nombre, apellido y email para pasársela al equipo de envíos.

Solo México por ahora. El resto de los países los vemos después.

Sofía

---

## Briefing 0.6

**De:** Diego Morales
**Para:** [Estudiante]
**Asunto:** Pedidos entregados — verificación

Necesito ver la lista de pedidos con status 'delivered'. Estoy calculando la tasa de entrega exitosa del mes pasado y me falta confirmar el número total. Columnas: order_id, customer_id, ordered_at y status.

Diego

---

## Briefing 0.7

**De:** Ana Castillo
**Para:** [Estudiante]
**CC:** Valentina Torres
**Asunto:** Productos fuera de categoría 1 — revisión de catálogo

Estoy haciendo un análisis de composición del catálogo para el cierre de mes. Necesito ver todos los productos que no pertenecen a la categoría 1, con su ID, nombre y categoría.

No es urgente para hoy — lo necesito antes del viernes.

Ana Castillo

---

## Briefing 0.8

**De:** Sofía Ramírez
**Para:** [Estudiante]
**Asunto:** Clientes de Argentina con ciudad registrada

Para la próxima campaña regional vamos a hacer envíos físicos a Argentina. Necesito la lista de clientes argentinos que tengan ciudad cargada — sin ciudad no podemos armar el envío.

Dame nombre, apellido, email y ciudad. Solo Argentina, solo los que tienen ciudad.

Sofía

---

## Briefing 0.9

**De:** Valentina Torres
**Para:** [Estudiante]
**Asunto:** Pedidos en tránsito

Diego me preguntó cuántos pedidos están actualmente en movimiento — es decir, los que tienen status 'shipped' o 'pending'. Necesito la lista con order_id, status y ordered_at para pasársela a su equipo de operaciones esta tarde.

— Vale

---

## Briefing 0.10

**De:** Sofía Ramírez
**Para:** [Estudiante]
**CC:** Valentina Torres
**Asunto:** Clientes para campaña global — excluyendo España

Estamos armando una campaña para Latinoamérica y no queremos incluir a los clientes de España — ellos tienen su propio equipo regional que los atiende por separado.

Necesito nombre, apellido y país de todos los clientes excepto los de España. Lo uso para segmentar la lista de envíos.

Sofía

---

## Briefing 0.11

**De:** Ana Castillo
**Para:** [Estudiante]
**CC:** Valentina Torres
**Asunto:** Productos de precio alto — análisis de segmento

Estoy haciendo una revisión del segmento premium del catálogo. Para empezar, necesito el listado de todos los productos con precio mayor a $100, con nombre y precio.

No necesito categorías por ahora — solo el listado base.

Ana Castillo

---

## Briefing 0.12

**De:** Valentina Torres
**Para:** [Estudiante]
**Asunto:** Filtro combinado — categorías con precio bajo

Estoy preparando una sección de "ofertas accesibles" para la próxima reunión con Marco. Necesito los productos con precio menor a $50 que pertenezcan a la categoría 2 o a la categoría 3. Columnas: nombre, precio y categoría.

Cuidado con la lógica del filtro — si no usás paréntesis el resultado va a estar mal.

— Vale

---

## Briefing 0.13

**De:** Diego Morales
**Para:** [Estudiante]
**Asunto:** Lista de clientes ordenada — para administración

El equipo administrativo necesita la lista de clientes en orden alfabético por apellido para un informe que van a imprimir. Cuando el apellido se repite, ordenar por nombre. Columnas: nombre, apellido y email.

Diego

---

## Briefing 0.14

**De:** Marco Jiménez
**Para:** Valentina Torres
**Asunto:** precios del catalogo

vale quiero ver los productos ordenados de mayor a menor precio. quiero identificar rapido cuales son los del segmento premium. nombre y precio nada mas

M

---

## Briefing 0.15

**De:** Diego Morales
**Para:** [Estudiante]
**Asunto:** Reporte de pedidos — ordenado por fecha y status

Para el reporte diario de operaciones necesito los pedidos ordenados primero por fecha descendente (los más recientes primero) y cuando la fecha coincide, por status en orden alfabético. Columnas: order_id, ordered_at y status.

Diego

---

## Briefing 0.16

**De:** Ana Castillo
**Para:** [Estudiante]
**CC:** Valentina Torres
**Asunto:** Top 5 productos más caros — reunión de directorio

Para la reunión del directorio de la próxima semana necesito un cuadro con los 5 productos de mayor precio en el catálogo. Solo nombre y precio, ordenados de más caro a más barato.

Ana Castillo

---

## Briefing 0.17

**De:** Valentina Torres
**Para:** [Estudiante]
**Asunto:** Convención de aliases de tabla

Recordatorio de equipo: a partir de ahora todas las queries que manden deben usar aliases de tabla con la notación `tabla.columna`. Cuando empecemos a trabajar con JOINs en el siguiente nivel, el código sin aliases se vuelve ilegible.

Practicá con customers: traé first_name, last_name, country y city de los clientes de México usando 'c' como alias de tabla. Eso es todo.

— Vale

---

## Briefing 0.18

**De:** Marco Jiménez
**Para:** [Estudiante]
**Asunto:** Nombre completo de clientes — Colombia

Necesito un listado de los clientes colombianos con el nombre completo en una sola columna — no en dos separadas. Nombre Apellido, con el email al lado. Lo necesito para una presentación.

Gracias / M

---

## Briefing 0.19

**De:** Sofía Ramírez
**Para:** [Estudiante]
**Asunto:** Productos de valor medio para la web

Estamos rediseñando la página principal y queremos destacar una sección de "productos de valor medio" — los que no son ni los más baratos ni los más caros. El rango que definimos internamente es entre $50 y $200 inclusive.

Dame el nombre y precio de esos productos, de más barato a más caro.

Sofía

---

## Briefing 0.20

**De:** Valentina Torres
**Para:** [Estudiante]
**Asunto:** Reporte de cierre de sprint — clientes Latam recientes

Cierre del sprint. Marco necesita para esta tarde un reporte con los 20 clientes de Argentina, Colombia y México que se registraron más recientemente — solo los que tienen ciudad registrada. El nombre completo en una columna, no en dos. Headers en español.

Este es el primer reporte que va directo a Marco, así que hacelo bien. Si la query no está limpia y los resultados no cuadran, vuelvo a mandártela.

— Vale
