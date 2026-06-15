# Mini-Proyecto Nivel 0: Conocé la base de datos antes de analizarla

---

**De:** Valentina Torres
**Para:** [Estudiante]
**Asunto:** Primer encargo real — exploración inicial para Marco

Llevás unos días dentro de la base de datos. Ya sabés cómo traer datos, filtrarlos y ordenarlos. Ahora necesito que hagas algo concreto con eso.

Marco me preguntó en el standup de hoy "¿qué tan bien conocemos nuestra base de datos?" — y la respuesta honesta es que nadie tiene esa información sistematizada. El analista anterior nunca hizo este trabajo. Vos lo vas a hacer ahora.

Esto no es un análisis complejo todavía. Es una exploración ordenada: quiero saber qué tenemos, cómo está distribuido y dónde hay huecos. Los datos limpios y bien entendidos son la base de todo lo que viene después — si no sabés con qué estás trabajando, cualquier análisis que hagas encima va a ser frágil.

Cuatro preguntas. Sin urgencia para hoy, pero lo quiero antes del viernes a las 12.

---

**1. ¿Cómo está distribuida nuestra base de clientes por país?**

Lista todos los países con el total de clientes registrados en cada uno, ordenada de mayor a menor. Quiero ver de un vistazo dónde estamos concentrados y dónde somos pequeños todavía.

Criterios:
- Incluir todos los países sin excepción
- Ordenar por cantidad de clientes de mayor a menor
- Columnas esperadas: país, total de clientes

---

**2. ¿Cuáles son los 10 productos más caros del catálogo activo?**

No todos los productos están activos — algunos fueron dados de baja pero siguen en la base. Quiero ver solo los activos, los 10 de mayor precio.

Criterios:
- Filtrar solo productos con `is_active = 1`
- Ordenar por precio descendente
- Limitar a 10 resultados
- Columnas esperadas: nombre del producto, precio

---

**3. ¿Qué pedidos están pendientes o en tránsito en este momento?**

Diego necesita saber cuántos pedidos están activos en el sistema — es decir, los que tienen status 'pending' o 'shipped'. Quiere verlos ordenados por fecha del pedido, los más recientes primero.

Criterios:
- Filtrar pedidos con status 'pending' o 'shipped'
- Ordenar por fecha descendente
- Columnas esperadas: order_id, ordered_at, status

---

**4. ¿Hay clientes registrados sin ciudad cargada?**

Sofía me preguntó si podemos hacer envíos físicos a toda la base. La respuesta depende de si tenemos la ciudad cargada o no. Necesito saber cuántos clientes no tienen ciudad registrada en cada país — si hay muchos en algún mercado, es un problema de datos que hay que resolver.

Criterios:
- Filtrar solo los clientes donde `city IS NULL`
- Mostrar nombre, apellido, email y país
- Ordenar por país ascendente, luego por apellido ascendente
- Columnas esperadas: nombre, apellido, email, país

---

**Formato esperado:**

Para cada pregunta, una tabla clara con las columnas indicadas. No necesito explicaciones largas. Si encontrás algo que te llame la atención en los datos — un número que no esperabas, una distribución rara — escribí una línea abajo de la tabla correspondiente.

**Preguntas de reflexión** (respondelas en lenguaje natural, sin SQL, debajo de cada tabla):

- Pregunta 1: ¿Cuál es el país con más clientes? ¿Tiene sentido dado que ShopSphere opera principalmente en Latinoamérica?
- Pregunta 2: ¿El precio del producto más caro activo te parece razonable para una plataforma de e-commerce? ¿Qué categoría esperarías que sea?
- Pregunta 3: Si la suma de pedidos 'pending' y 'shipped' fuera mayor a lo esperado, ¿qué le dirías a Diego?
- Pregunta 4: Si encontrás clientes sin ciudad en México o Colombia (los mercados principales), ¿qué impacto tiene eso en las campañas de Sofía?

— Vale
