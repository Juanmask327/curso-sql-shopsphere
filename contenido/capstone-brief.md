# Capstone — Investigación estratégica: ShopSphere 2026

---

**De:** Valentina Torres
**Para:** [estudiante]
**Asunto:** El análisis más importante que vamos a hacer este año

Necesito hablar contigo de algo antes de que empieces.

Marco me llamó ayer. Los fondos quieren entrar a una Serie B — USD 25 millones para acelerar expansión en Brasil y Ecuador. Pero antes de comprometerse, los inversores pidieron algo que no habíamos hecho antes: una auditoría de datos independiente. Quieren ver que ShopSphere toma decisiones con análisis real, no con intuición.

Marco me asignó el encargo directamente. Y yo te lo asigno a ti.

No es un ejercicio. Es el análisis que va a determinar si los inversores confían en la calidad de nuestra data. Necesito que lo hagas como si lo fuera a leer alguien que no nos conoce y que tiene poder para decir que no.

Tienes acceso a todas las tablas. Tienes todas las técnicas. Lo que necesito ahora es que uses todo junto.

— Vale

---

## Las preguntas que necesitan respuesta

### Sección 1 — La base del negocio

**Pregunta 1: ¿Cuánto vale ShopSphere en revenue real?**

Revenue neto total de los últimos 12 meses: pagos completados menos reembolsos, desagregado por país y por trimestre. Los inversores quieren la tendencia, no solo el total. Si Q1 2026 crece o cae respecto a Q1 2025, eso importa más que el número absoluto.

**Pregunta 2: ¿Quiénes son los clientes que sostienen el negocio?**

Segmenta la base de clientes en cuatro niveles de valor (sin compras / ocasional / recurrente / alto valor). Para cada segmento: cantidad de clientes, revenue total, porcentaje sobre el revenue total de la empresa. Los inversores necesitan saber qué tan concentrado está el revenue — si el 80% viene del 10% de los clientes, eso es un riesgo de portafolio que hay que nombrar.

> **Nota sobre qué revenue usar:** Para calcular el revenue de cada cliente puedes elegir uno de dos enfoques según lo que quieras medir:
> - Revenue **facturado**: `SUM(oi.quantity * oi.unit_price)` desde `order_items` (pedidos con `status = 'delivered'`). Mide lo que el cliente compró y recibió, independientemente de si el pago fue procesado.
> - Revenue **cobrado** (más preciso para el análisis de valor real): `SUM(p.amount)` desde `payments` con `WHERE p.status = 'completed'`. Mide lo que efectivamente ingresó a ShopSphere por ese cliente.
>
> Para este análisis de inversores, usar el revenue cobrado (`payments`) es la opción más rigurosa. Si eliges revenue facturado (`order_items`), documenta explícitamente la decisión en tu interpretación.

### Sección 2 — Adquisición y conversión

**Pregunta 3: ¿Qué canales traen los clientes que realmente compran?**

Para cada canal de adquisición (primera sesión del cliente en `website_sessions`): revenue total histórico generado por esos clientes, tasa de conversión, y promedio de sesiones antes del primer pedido. Queremos saber si el canal que trae más volumen es el mismo que trae más valor.

**Pregunta 4: ¿Dónde está perdiendo el funnel?**

Para Q1 2026, el funnel completo por país: sesiones totales → sesiones que convirtieron → pedidos creados → pedidos entregados. Calcula la tasa de caída en cada etapa. Si algún país tiene una caída atípica entre conversión y entrega, o entre intención de compra y pago completado, eso necesita una nota de interpretación.

### Sección 3 — Retención y ciclo de vida

**Pregunta 5: ¿Los clientes que adquirimos se quedan?**

Cohorte de clientes con primera compra en Q3 2025 (julio–septiembre). Retención mensual: qué porcentaje volvió a comprar en cada uno de los tres meses siguientes (octubre, noviembre, diciembre 2025). Si la retención cae más del 50% entre el primer y segundo mes, hay un problema de producto o de experiencia post-compra que los inversores van a preguntar.

**Pregunta 6: ¿Qué productos generan más valor real por unidad vendida?**

Top 10 productos por revenue neto (revenue de `order_items` descontando devoluciones de `returns`). Para cada uno: categoría, unidades vendidas, revenue bruto, revenue neto, margen de devolución. El objetivo es identificar qué productos valen la pena escalar y cuáles tienen un alto volumen pero alto costo de devolución.

### Sección 4 — Riesgo operacional y financiero

**Pregunta 7: ¿Qué tan expuesta está la empresa en Chile?**

La anomalía de pagos de marzo–abril 2026 en Chile es el riesgo más visible del trimestre. Necesito el análisis completo: tasa de fallo por método de pago en Chile versus el resto de países en ese período, concentración por rango de ticket, e impacto en el revenue neto chileno de Q1. Si el problema está en un método específico, dilo explícitamente — los inversores del fondo chileno lo van a preguntar primero.

**Pregunta 8: ¿Están los datos en condiciones para auditoría externa?**

Verifica la integridad de la tabla `payments`: registros con `status = 'completed'` pero `paid_at` IS NULL, y pedidos en `orders` sin ningún registro correspondiente en `payments`. Cuantifica el impacto en revenue de cada anomalía. Este punto no es opcional — si los datos tienen problemas de integridad, hay que documentarlos antes de que los encuentre el auditor externo.

---

## Formato del entregable

El análisis se entrega como un reporte estructurado con tres componentes por cada pregunta:

1. **La query** — el SQL que produce el resultado
2. **El resultado** — una tabla o número concreto
3. **La interpretación** — una o dos líneas que dicen qué significa ese resultado para la empresa

No necesito prosa extensa. Necesito precisión. Un número sin interpretación no es análisis — es un dato suelto.

---

## Lo que hace que este análisis sea excelente

Un análisis **suficiente** responde las ocho preguntas con números correctos.

Un análisis **excelente** hace eso y además:
- Señala anomalías que no te pedí que buscaras pero que encontraste en el proceso
- Las queries están optimizadas: si hay un Seq Scan evitable sobre una tabla grande, hay un índice o una reformulación que lo elimina
- Los números son coherentes entre secciones — si el revenue neto de la Pregunta 1 no coincide con los subtotales de la Pregunta 4, algo está mal y debes haberlo notado antes de entregar
- Cuando hay una decisión de negocio implícita en los datos, la nombras: "esto sugiere que...", "el riesgo aquí es...", "la acción que recomendaría es..."

La diferencia entre un analista que ejecuta queries y un analista que agrega valor es exactamente esa: el segundo conecta el número con la decisión.

---

Cuando entregues esto, Marco lo va a llevar a la reunión con los fondos. La Serie B puede no depender de tu análisis. Pero la calidad de lo que entregues va a determinar si ShopSphere llega a esa reunión con datos o con intuición disfrazada de datos.

Llevas ocho niveles aprendiendo a hacer esto bien. Este es el momento de demostrarlo.

— Vale
