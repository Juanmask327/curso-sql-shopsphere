# Proyecto Nivel 7 — Dashboard de adquisición para el comité de inversores

---

**De:** Valentina Torres
**Para:** [estudiante]
**Asunto:** Proyecto — infraestructura analítica para Power BI

Tenemos una fecha. El fondo chileno y el fondo mexicano se reúnen con Marco el 18 de junio. Quieren entrar a esa reunión con un dashboard en Power BI que muestre el funnel de adquisición completo de ShopSphere — desde que un usuario llega al sitio hasta que paga y recibe su pedido.

El equipo de BI de los fondos se conecta directamente a nuestra base. Lo que necesito de ti no es un análisis puntual — es la infraestructura que alimenta el dashboard: las vistas y queries que ellos van a consultar sin pedirte que las reescribas cada semana.

La audiencia no es el equipo interno. Son inversores. Cada número que aparezca en ese dashboard tiene que estar bien construido.

---

## Lo que necesitas entregar

**1. Vista `v_funnel_adquisicion`**
Una fila por sesión con el contexto completo del funnel: datos de la sesión, si convirtió, el pedido asociado (si existe), y el estado del pedido. Esta es la vista base del dashboard. Usa LEFT JOIN para preservar todas las sesiones, incluidas las que no generaron pedido.

**2. Tasa de conversión por campaña y canal**
Sobre la vista o directamente sobre las tablas: para cada campaña, calcula total de sesiones, sesiones convertidas, pedidos generados, y tasa de conversión sesión → pedido. Ordena por tasa de conversión descendente. Esta tabla va al panel principal del dashboard.

**3. Comportamiento por dispositivo con CASE WHEN**
Clasifica las sesiones en tres categorías de engagement según páginas vistas ("rebote", "exploración baja", "exploración media", "exploración alta"). Para cada combinación de device_type y categoría de engagement, muestra la tasa de conversión. El equipo de producto necesita esto para priorizar mejoras de UX.

**4. Revenue atribuido por canal de adquisición**
Cruza el canal de origen de cada cliente (campaña de su primera sesión) con su revenue total histórico en `orders`. Muestra cuánto revenue acumulado generó cada canal. Esta es la métrica que los fondos van a preguntar primero: ¿cuánto vale un cliente según de dónde vino?

**5. Vista `v_clientes_perfil`**
Una fila por cliente con su perfil completo: país, fecha de registro, total de pedidos, revenue total, fecha del primer y último pedido, total de sesiones y sesiones convertidas. Esta vista la usará el equipo de BI para cualquier análisis de segmentación futura sin volver a escribir los joins.

**6. Segmentación de clientes por valor**
Usando `v_clientes_perfil` o la lógica equivalente: clasifica a cada cliente en un segmento de valor (sin compras / ocasional / recurrente / alto valor) con CASE WHEN. Muestra cuántos clientes hay en cada segmento, qué revenue total representan y qué porcentaje del revenue total de la empresa aporta cada segmento.

---

## Consideraciones antes de entregar

- Todas las vistas deben poder consultarse después de ser creadas — incluye al menos una SELECT encima de cada vista para confirmar que devuelve datos.
- Los joins entre `website_sessions` y `orders` van por `customer_id`. Ten en cuenta que un cliente puede tener múltiples sesiones antes de su primer pedido — el canal de adquisición es el de su primera sesión registrada.
- Si encuentras algo inesperado en los datos de Chile (marzo–abril 2026), anótalo. Ana ya está al tanto de la anomalía de pagos, pero si el funnel muestra algo adicional, es información que Marco necesita saber antes de sentarse con los fondos.

---

Cuando esto esté en el dashboard, Marco va a tener los números que debería haber tenido antes de hablar con los fondos por primera vez.

— Vale
