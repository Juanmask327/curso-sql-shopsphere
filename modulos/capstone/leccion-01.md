## Lección 1: Introducción al Proyecto Capstone

---

**De:** Valentina Torres, Head of Data  
**Para:** [Estudiante]  
**Asunto:** El análisis más importante que vamos a hacer este año

Necesito hablar contigo de algo antes de que empieces.

Marco me llamó ayer. Los fondos quieren entrar a una Serie B — USD 25 millones para acelerar expansión en Brasil y Ecuador. Pero antes de comprometerse, los inversores pidieron algo que no habíamos hecho antes: una auditoría de datos independiente. Quieren ver que ShopSphere toma decisiones con análisis real, no con intuición.

Marco me asignó el encargo directamente. Y yo te lo asigno a ti.

No es un ejercicio. Es el análisis que va a determinar si los inversores confían en la calidad de nuestra data. Necesito que lo hagas como si lo fuera a leer alguien que no nos conoce y que tiene poder para decir que no.

Tienes acceso a todas las tablas. Tienes todas las técnicas. Lo que necesito ahora es que uses todo junto.

— Vale

---

## ¿Qué es el Capstone?

Llevas ocho niveles aprendiendo SQL en el contexto de ShopSphere. Este Capstone **no introduce conceptos nuevos**: integra todo lo que aprendiste en un análisis completo que simula cinco semanas de trabajo real como Data Analyst.

El entregable final es un reporte estructurado con tres componentes por cada ejercicio:

1. **La query** — el SQL que produce el resultado
2. **El resultado** — la tabla o el número que produce la query
3. **La interpretación** — una o dos oraciones que dicen qué significa ese resultado para el negocio

Un número sin interpretación no es análisis. Es un dato suelto.

---

## Las cinco partes del proyecto

### Parte 01 — Exploración y diagnóstico H1 2026
**Tiempo estimado: 2 horas · 6 ejercicios**

El punto de partida. Antes de responder cualquier pregunta de negocio, necesitas entender el estado general de la empresa en la primera mitad de 2026. Esta parte establece los números base que el resto del análisis va a referenciar.

Técnicas: CTEs, funciones de agregación, LAG/LEAD, window functions de desvío estadístico, STRFTIME, NULLIF.

---

### Parte 02 — Clientes y retención
**Tiempo estimado: 2 horas · 6 ejercicios**

Los inversores quieren saber quiénes son los clientes que sostienen el negocio y si se quedan. Esta parte cubre el análisis de ciclo de vida: cohortes, segmentación RFM, LTV, churn y análisis Pareto.

Técnicas: análisis de cohortes, NTILE, ventanas temporales con LAG, subqueries para denominadores fijos, análisis 80/20.

---

### Parte 03 — Marketing y atribución
**Tiempo estimado: 2 horas · 5 ejercicios**

¿Qué canales traen los clientes que realmente compran? ¿El canal con más volumen es el mismo que genera más valor? Esta parte analiza el ROI de campañas, el costo de adquisición y la retención por canal.

Técnicas: atribución first-touch, CTEs encadenadas (4+), NULLIF en denominadores de ROI, puntuaciones compuestas.

---

### Parte 04 — Operaciones y calidad de datos
**Tiempo estimado: 2 horas · 4 ejercicios**

La auditoría que los inversores pidieron explícitamente. Si los datos tienen problemas de integridad, hay que documentarlos antes de que los encuentre el auditor externo. Esta parte también cubre stock crítico y análisis de devoluciones por categoría.

Técnicas: UNION ALL para consolidar anomalías, LEFT JOIN con IS NULL para detectar huérfanos, JULIANDAY para días de cobertura, MoM con LAG.

---

### Parte 05 — Dashboard ejecutivo
**Tiempo estimado: 2 horas · 4 ejercicios**

El cierre del proyecto. Encapsulas los KPIs más importantes en vistas reutilizables y entregas los cinco insights clave del negocio en una sola query ejecutiva. La Parte 05 es el entregable que Marco lleva a la reunión con los fondos.

Técnicas: CREATE VIEW con CTEs internas, DROP VIEW IF EXISTS, comentarios de producción completos, UNION ALL de CTEs para outputs multi-insight.

---

## Instrucciones de entrega

Para cada ejercicio, tu entrega debe tener exactamente tres componentes:

**Componente 1 — La query**
```sql
-- Tu solución aquí
-- Incluye comentarios en las líneas no obvias
```

**Componente 2 — El resultado**
Muestra las primeras filas del output, o el número clave si es una métrica escalar. No necesitas mostrar todas las filas — 5 a 10 filas son suficientes si el resultado es una tabla larga.

**Componente 3 — La interpretación**
Una o dos oraciones que conecten el número con la decisión de negocio. Formato sugerido:
- "El revenue neto de H1 2026 es $X, lo que representa un crecimiento/caída de Y% respecto a H1 2025."
- "El canal paid_search concentra el 40% del revenue pero solo el 15% de los clientes, lo que sugiere que..."
- "Se detectaron N pedidos entregados sin pago completado, representando $X en revenue en riesgo."

---

## Criterios de evaluación

### Corrección técnica (40%)
- La query produce el resultado correcto sobre el dataset de ShopSphere
- La sintaxis es válida en SQLite (STRFTIME, JULIANDAY, DROP VIEW IF EXISTS)
- Los denominadores usan NULLIF para proteger contra división por cero
- Los JOINs N:M usan COUNT DISTINCT donde corresponde
- Los filtros de fecha usan rangos explícitos, no funciones en la columna

### Claridad del código (30%)
- Las CTEs tienen nombres descriptivos que comunican su propósito
- Los alias de columna son legibles para alguien que no escribió la query
- Las líneas no obvias tienen un comentario de una línea explicando el por qué
- Las vistas incluyen un comentario de encabezado con propósito y tablas

### Interpretación de negocio (30%)
- Cada resultado tiene una o dos oraciones de interpretación
- La interpretación conecta el número con una decisión o riesgo concreto
- Cuando hay una anomalía en los datos, se nombra explícitamente
- Cuando el resultado implica una acción recomendada, se menciona

---

## Esquema completo disponible

```sql
customers   (customer_id, first_name, last_name, email, city, country, registered_at)
categories  (category_id, name, description)
products    (product_id, name, category_id, price, is_active)
orders      (order_id, customer_id, ordered_at, status)
            -- status: 'pending','shipped','delivered','cancelled'
order_items (item_id, order_id, product_id, quantity, unit_price)
returns     (return_id, order_id, product_id, returned_at, reason, status)
            -- status: 'pending','approved','rejected','refunded'
inventory   (inventory_id, product_id, stock, updated_at)
marketing_campaigns (campaign_id, name, channel, started_at, ended_at, budget, spent)
            -- channel: 'email','social','paid_search','display','affiliate'
website_sessions (session_id, customer_id, campaign_id, started_at, pages_viewed,
                  converted, device_type)
            -- device_type: 'desktop','mobile','tablet'
payments    (payment_id, order_id, amount, method, status, paid_at)
            -- method: 'credit_card','bank_transfer','paypal','crypto'
            -- status: 'completed','failed','pending','refunded'
```

---

## Lo que distingue un análisis excelente

Un análisis **suficiente** responde todos los ejercicios con números correctos.

Un análisis **excelente** hace eso y además:

- Señala anomalías que no se pidieron explícitamente pero que aparecen en los datos
- Los números son coherentes entre partes: si el revenue neto de EJ01 no coincide con los subtotales de EJ03, algo está mal y el analista lo notó antes de entregar
- Cuando hay una decisión de negocio implícita en los datos, se nombra: "esto sugiere que...", "el riesgo aquí es...", "la acción que recomendaría es..."
- Las queries están limpias: nombres de columna en español legible, ROUND con los decimales correctos para el contexto, comentarios que explican decisiones no obvias

La diferencia entre un analista que ejecuta queries y un analista que agrega valor es exactamente esa: el segundo conecta el número con la decisión.

---

Cuando entregues esto, Marco lo va a llevar a la reunión con los fondos. Llevas ocho niveles aprendiendo a hacer esto bien. Este es el momento de demostrarlo.
