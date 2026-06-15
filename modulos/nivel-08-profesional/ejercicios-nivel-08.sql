-- =============================================================
-- EJERCICIOS NIVEL 8 — SQL Profesional
-- ShopSphere SQL Course
-- Tablas disponibles: customers, categories, products,
--                     orders, order_items, returns,
--                     inventory, marketing_campaigns,
--                     website_sessions,
--                     payments (NUEVA — tabla central del nivel)
-- =============================================================
-- Contexto narrativo:
--   La junta directiva se reúne el jueves 18 de junio.
--   Ana Castillo necesita el informe financiero Q1 2026
--   con revenue neto real (pagos completados menos reembolsos).
--   Valentina Torres necesita que las queries de payments
--   sean eficientes antes de conectar Power BI en producción.
--   Diego Morales necesita garantías de atomicidad en las
--   operaciones de registro de pedidos e inventario.
--   Estos ejercicios construyen, paso a paso, ese informe
--   y esa infraestructura.
--
-- Nota sobre dialecto:
--   El Playground usa SQLite. Algunas funciones de PostgreSQL
--   no están disponibles (EXTRACT con QUARTER, DATE_TRUNC,
--   INTERVAL como literal, ::cast, EXPLAIN ANALYZE).
--   Las soluciones usan sintaxis compatible con SQLite.
--   Para EXPLAIN: usar EXPLAIN QUERY PLAN (SQLite), no
--   EXPLAIN ANALYZE (PostgreSQL).
--   Para trimestres: CASE WHEN STRFTIME('%m', ...) BETWEEN ...
--   Para fechas relativas: DATE('now', '-12 months').
--   Para vistas: DROP VIEW IF EXISTS antes de CREATE VIEW.
--   Para upsert: INSERT ... ON CONFLICT DO UPDATE.
-- =============================================================


-- ---------------------------------------------------------------
-- BLOQUE A (1-6): Análisis de pagos y revenue neto
-- Introducción a payments, revenue neto, tasa de fallos,
-- anomalía Chile, auditoría de datos sucios
-- ---------------------------------------------------------------

-- Ejercicio 01
-- DIFICULTAD: Básico
-- CONTEXTO (Briefing 8.1 — Ana Castillo):
--   Ana necesita el revenue neto Q1 2026 (enero–marzo)
--   desagregado por país para el cierre del informe de junta.
--   Revenue neto = pagos completed - pagos refunded.
--   Si la tasa de reembolso supera el 5% en algún país,
--   Ana lo necesita destacado — eso va al comité.
--
-- DECISIÓN ANALÍTICA: El período se filtra por paid_at
--   (no por ordered_at) porque queremos pagos procesados
--   en Q1, no pedidos creados en Q1. paid_at IS NULL para
--   pagos no completados — el rango de fechas los excluye
--   automáticamente. El país viene de customers vía orders.
--
-- Enunciado: Para el período 2026-01-01 a 2026-03-31
--   (inclusive), retorna por país: pais (country del cliente),
--   total_cobrado (SUM de pagos completed, 2 dec),
--   total_reembolsado (SUM de pagos refunded, 2 dec),
--   revenue_neto (cobrado - reembolsado, 2 dec) y
--   pct_reembolsado (reembolsado / cobrado * 100, 2 dec).
--   Ordena por revenue_neto descendente.
--
-- Criterio: CTE para filtrar el período. INNER JOIN
--   payments → orders → customers. SUM condicional con
--   CASE WHEN para separar completed y refunded. NULLIF
--   en el denominador del porcentaje. 5 filas (una por país).
--   Si pct_reembolsado > 5 en alguna fila, eso es la
--   "nota al margen" que Ana pide.

-- Tu query aquí:


-- Ejercicio 02
-- DIFICULTAD: Básico
-- CONTEXTO (Briefing 8.2 — Ana Castillo):
--   La anomalía de Chile: en marzo–abril 2026 la tasa de
--   pagos fallidos subió de forma atípica. Ana necesita saber
--   si el problema está concentrado en un método específico
--   o es generalizado. Si la tasa de fallo de un método en
--   Chile es más del doble que en el resto, confirma problema
--   de infraestructura (no de demanda).
--
-- DECISIÓN ANALÍTICA: Agrupamos en dos grupos —
--   'Chile' vs 'Resto de paises' — con CASE WHEN en la CTE.
--   El período es marzo–abril 2026 (paid_at en ese rango).
--   La tasa de fallo = pagos failed / total intentos.
--
-- Enunciado: Para el período 2026-03-01 a 2026-04-30
--   (inclusive), retorna: grupo_pais ('Chile' o
--   'Resto de paises'), metodo (method), total_pagos,
--   pagos_fallidos y tasa_fallo_pct (2 dec).
--   Ordena por grupo_pais ASC y tasa_fallo_pct DESC.
--
-- Criterio: CTE con CASE WHEN para crear grupo_pais.
--   INNER JOIN payments → orders → customers para country.
--   SUM condicional para pagos_fallidos. NULLIF en
--   denominador. Hasta 8 filas (2 grupos × 4 métodos).

-- Tu query aquí:


-- Ejercicio 03
-- DIFICULTAD: Básico
-- CONTEXTO (Briefing 8.3 — Ana Castillo):
--   Hay registros en payments con status='completed' y
--   paid_at IS NULL. Eso es incoherente. Antes de calcular
--   el revenue del Q1, Ana necesita cuantificar el impacto.
--   "No calculamos nada de revenue hasta tener este número."
--
-- Enunciado: Retorna en una sola fila:
--   registros_problematicos (COUNT de pagos completed
--   con paid_at NULL), pedidos_afectados (COUNT DISTINCT
--   de order_id de esos registros) y monto_total_impactado
--   (SUM del amount de esos registros, redondeado a 2 dec).
--
-- Criterio: WHERE status = 'completed' AND paid_at IS NULL.
--   COUNT DISTINCT en order_id. SUM en amount con ROUND.
--   Sin JOINs — payments tiene todo. 1 fila en el resultado.

-- Tu query aquí:


-- Ejercicio 04
-- DIFICULTAD: Básico-Intermedio
-- CONTEXTO (Briefing 8.4 — Ana Castillo):
--   Para la sección de riesgos del informe, Ana necesita ver
--   la distribución de métodos de pago por rango de monto.
--   Si credit_card o transfer concentran más del 60% de los
--   tickets altos (> 200 USD), hay riesgo de concentración.
--
-- Enunciado: Para pagos con status='completed', clasifica
--   cada pago por rango: amount < 50 → 'bajo (< 50)',
--   amount 50-200 → 'medio (50-200)', amount > 200 →
--   'alto (> 200)'. Retorna: rango_monto, metodo,
--   transacciones, pct_en_rango (% de ese método en el
--   rango, 2 dec) y monto_promedio (2 dec). Ordena por
--   rango (bajo, medio, alto) con ORDER BY con CASE WHEN
--   (no alfabético), luego por pct_en_rango DESC.
--
-- Criterio: CTE con clasificación de rangos. CTE auxiliar
--   con totales por rango. JOIN entre ambas para calcular
--   el porcentaje. NULLIF en denominador. ORDER BY con
--   CASE WHEN para el orden correcto de rangos.
--   Hasta 12 filas (3 rangos × 4 métodos).

-- Tu query aquí:


-- Ejercicio 05
-- DIFICULTAD: Intermedio
-- CONTEXTO (Proyecto Nivel 8 — Punto 4):
--   El gráfico de tendencia que abre la presentación de Ana:
--   revenue neto mes a mes durante Q1 2026 con la variación
--   porcentual mes a mes. Si marzo es el peor mes, eso
--   confirma el impacto de la anomalía de Chile.
--
-- Enunciado: Para el período enero–marzo 2026, retorna:
--   mes_nombre (texto: 'Enero 2026', 'Febrero 2026',
--   'Marzo 2026'), revenue_neto (SUM completed - SUM
--   refunded, 2 dec), revenue_neto_mes_anterior (LAG
--   sobre revenue_neto, 2 dec) y variacion_pct (variación
--   MoM en %, 2 dec, NULL para el primer mes).
--   Ordena por mes cronológicamente.
--
-- Criterio: CTE que agrupa por mes con nro_mes para
--   el orden correcto. LAG() OVER (ORDER BY nro_mes)
--   para el mes anterior. NULLIF en el denominador del
--   porcentaje. 3 filas en el resultado.
--   En SQLite usar STRFTIME('%m', paid_at) para extraer
--   el número de mes.

-- Tu query aquí:


-- Ejercicio 06
-- DIFICULTAD: Intermedio-Avanzado
-- CONTEXTO (Briefing 8.10 — Marco Jiménez / Valentina):
--   Marco necesita el revenue neto histórico para la junta.
--   "¿Hay algún país donde los reembolsos estén comiendo
--   una parte relevante del revenue?" Desagregado por país
--   y trimestre del último año.
--
-- Enunciado: Para los últimos 12 meses desde 2026-06-01
--   (es decir, desde 2025-06-01), retorna por país y
--   trimestre: pais (country del cliente), anio
--   (año del paid_at), trimestre (1-4 calculado con
--   CASE WHEN sobre el mes), cobrado (SUM completed, 2 dec),
--   reembolsado (SUM refunded, 2 dec), revenue_neto
--   (cobrado - reembolsado, 2 dec) y pct_del_total (% del
--   revenue neto de esa fila sobre el total del trimestre,
--   2 dec). Solo paid_at IS NOT NULL. Ordena por anio,
--   trimestre, revenue_neto DESC.
--
-- Criterio: CTE principal para filtrar período y calcular
--   año/trimestre (STRFTIME('%Y',...) para anio;
--   CASE WHEN STRFTIME('%m',...) para trimestre).
--   CTE de totales por trimestre para el porcentaje.
--   JOIN entre ambas. NULLIF en denominador. Múltiples
--   filas (hasta 5 países × 4 trimestres).
--
-- Nota SQLite: para trimestre usar:
--   CASE WHEN STRFTIME('%m', paid_at) BETWEEN '01' AND '03'
--        THEN 1
--        WHEN STRFTIME('%m', paid_at) BETWEEN '04' AND '06'
--        THEN 2
--        WHEN STRFTIME('%m', paid_at) BETWEEN '07' AND '09'
--        THEN 3
--        ELSE 4
--   END AS trimestre

-- Tu query aquí:


-- ---------------------------------------------------------------
-- BLOQUE B (7-12): Optimización y anti-patrones
-- EXPLAIN QUERY PLAN, índices, reescribir queries lentas,
-- NOT IN vs NOT EXISTS, funciones en WHERE
-- ---------------------------------------------------------------

-- Ejercicio 07
-- DIFICULTAD: Intermedio
-- CONTEXTO (Briefing 8.5 — Valentina Torres):
--   La query de revenue tarda 45 segundos. Valentina pide
--   identificar las columnas que justifican un índice,
--   crear los índices, y confirmar que el plan cambió.
--
-- Enunciado: Escribe los tres bloques siguientes:
--
--   BLOQUE 1: EXPLAIN QUERY PLAN de la query de revenue
--     que cruza payments, orders y customers para Q1 2026
--     con status='completed'. (Observa el SCAN.)
--
--   BLOQUE 2: Los CREATE INDEX justificados con comentario
--     de una línea por índice explicando por qué esa columna.
--     Mínimo 2 índices: uno en order_id, uno en paid_at.
--
--   BLOQUE 3: El mismo EXPLAIN QUERY PLAN después de crear
--     los índices. (Observa el cambio a SEARCH USING INDEX.)
--
-- Criterio: Tres bloques bien delimitados con comentarios.
--   Mínimo 2 CREATE INDEX con justificación. El plan en el
--   Bloque 3 debe mostrar SEARCH en lugar de SCAN en payments.
--   Los índices usan CREATE INDEX IF NOT EXISTS.

-- Tu query aquí (BLOQUE 1 — EXPLAIN antes):


-- Tu query aquí (BLOQUE 2 — CREATE INDEX con justificación):


-- Tu query aquí (BLOQUE 3 — EXPLAIN después):


-- Ejercicio 08
-- DIFICULTAD: Intermedio
-- CONTEXTO: Un anti-patrón frecuente es usar NOT IN cuando
--   hay posibles NULLs en la subquery. Si algún order_id
--   en payments es NULL, NOT IN devuelve NULL (no TRUE)
--   para cada comparación — el resultado puede ser una
--   tabla vacía cuando se esperan filas.
--
-- Enunciado: Reescribe las dos versiones de la siguiente
--   query explicando qué problema tiene la versión NOT IN
--   y cómo NOT EXISTS lo resuelve.
--
--   Objetivo de la query: encontrar pedidos en orders que
--   NO tienen ningún pago con status='completed'.
--   Columnas: order_id, customer_id, ordered_at, status.
--
--   Versión A (NOT IN — problemática): escríbela y en un
--     comentario explica el problema con NULLs.
--   Versión B (NOT EXISTS — correcta): la reescritura
--     que maneja NULLs correctamente.
--
-- Criterio: Versión A usa NOT IN con subquery sobre
--   payments WHERE status='completed'. Versión B reemplaza
--   NOT IN por NOT EXISTS con subquery correlacionada.
--   Comentario explicando por qué NOT IN puede fallar con
--   NULLs. Mismo resultado esperado en ambas versiones
--   (si no hay NULLs en order_id de payments).

-- Tu query aquí (Versión A — NOT IN):


-- Tu query aquí (Versión B — NOT EXISTS):


-- Ejercicio 09
-- DIFICULTAD: Básico
-- CONTEXTO: Otro anti-patrón que impide el uso de índices:
--   aplicar una función a una columna indexada en el WHERE.
--   Si paid_at tiene un índice, STRFTIME('%Y', paid_at) = '2025'
--   no puede usarlo — la función impide el Index Scan.
--
-- Enunciado: Reescribe la siguiente query eliminando la
--   función del WHERE para permitir el uso del índice.
--   La query calcula total de pagos completados por país
--   en el año 2025.
--
--   Query original (lenta):
--   SELECT c.country, COUNT(*) AS pagos_completados
--   FROM payments p
--   INNER JOIN orders o ON o.order_id = p.order_id
--   INNER JOIN customers c ON c.customer_id = o.customer_id
--   WHERE STRFTIME('%Y', p.paid_at) = '2025'
--     AND p.status = 'completed'
--   GROUP BY c.country
--   ORDER BY pagos_completados DESC;
--
--   Reescribe el WHERE con un rango de fechas explícito
--   que produce el mismo resultado y permite usar el índice.
--   Agrega un comentario de una línea explicando la diferencia.
--
-- Criterio: Sin función en la columna paid_at del WHERE.
--   Rango explícito: paid_at >= '2025-01-01' AND paid_at <
--   '2026-01-01'. Mismo resultado que la versión original.

-- Tu query aquí:


-- Ejercicio 10
-- DIFICULTAD: Básico
-- CONTEXTO: SELECT * es un anti-patrón de performance y
--   de claridad. En análisis, trae columnas que no se necesitan
--   — aumenta el volumen de datos transferidos y oculta qué
--   columnas se usan realmente.
--
-- Enunciado: La siguiente query usa SELECT *. Reescríbela
--   seleccionando solo las columnas necesarias para el
--   análisis solicitado por Ana: country (del cliente),
--   mes (STRFTIME('%Y-%m', paid_at)), revenue_neto (SUM
--   completed - SUM refunded), para todos los pagos de 2026.
--   Agrupa por country y mes. Ordena por country y mes.
--
--   Query original:
--   SELECT *
--   FROM payments p
--   INNER JOIN orders o ON o.order_id = p.order_id
--   INNER JOIN customers c ON c.customer_id = o.customer_id
--   WHERE p.paid_at >= '2026-01-01';
--
-- Criterio: Sin SELECT *. Solo las columnas necesarias
--   para el resultado final (no traer todas las columnas
--   de las tres tablas). GROUP BY por country y mes.
--   ROUND en revenue_neto. NULLIF no aplica aquí (SUM
--   no divide).

-- Tu query aquí:


-- Ejercicio 11
-- DIFICULTAD: Intermedio
-- CONTEXTO (Briefing 8.6 — Valentina Torres):
--   La query de cohortes del Nivel 6 se va a conectar a
--   Power BI. Valentina quiere que el estudiante la analice
--   con EXPLAIN QUERY PLAN e identifique qué índice crearía
--   primero si solo pudiera crear uno.
--
-- Enunciado: Ejecuta EXPLAIN QUERY PLAN sobre la siguiente
--   query de cohortes simplificada. Luego, en comentarios
--   SQL, responde: (a) ¿qué operación identificas que podría
--   beneficiarse de un índice? (b) ¿qué índice crearías y
--   por qué ese índice específico (columna y orden)?
--
--   Query de cohortes:
--   WITH primera_compra AS (
--       SELECT customer_id,
--              STRFTIME('%Y-%m', MIN(ordered_at)) AS mes_cohorte
--       FROM orders
--       WHERE status = 'delivered'
--       GROUP BY customer_id
--   )
--   SELECT pc.mes_cohorte,
--          COUNT(DISTINCT pc.customer_id)    AS clientes_nuevos,
--          COUNT(DISTINCT o2.customer_id)    AS retenidos_mes2
--   FROM primera_compra pc
--   LEFT JOIN orders o2
--       ON  o2.customer_id = pc.customer_id
--       AND o2.status      = 'delivered'
--       AND STRFTIME('%Y-%m', o2.ordered_at)
--             > pc.mes_cohorte
--       AND STRFTIME('%Y-%m', o2.ordered_at)
--             <= STRFTIME('%Y-%m',
--                  DATE(pc.mes_cohorte || '-01', '+1 month'))
--   GROUP BY pc.mes_cohorte
--   ORDER BY pc.mes_cohorte;
--
-- Criterio: EXPLAIN QUERY PLAN de la query de cohortes.
--   Comentario con respuesta a (a): identificar el SCAN
--   sobre orders. Comentario con respuesta a (b): el índice
--   propuesto debe cubrir (customer_id, ordered_at, status)
--   y el estudiante debe justificar por qué ese orden de
--   columnas (no status primero).

-- Tu query aquí (EXPLAIN QUERY PLAN):


-- Tu respuesta en comentarios:
-- (a) Operación que se beneficiaría de un índice:
-- (b) Índice propuesto y justificación:


-- Ejercicio 12
-- DIFICULTAD: Intermedio-Avanzado
-- CONTEXTO: Una query del Nivel 5 calculaba el total pagado
--   por cliente usando una subquery correlacionada en el
--   SELECT. Con la tabla payments, reescríbela con LEFT JOIN
--   para eliminar el anti-patrón de N ejecuciones.
--
-- Enunciado: La siguiente query tiene una subquery
--   correlacionada que se ejecuta una vez por cada cliente.
--   Reescríbela con LEFT JOIN para que se ejecute en un
--   solo pase. El resultado debe ser idéntico:
--   customer_id, nombre (first_name || ' ' || last_name),
--   country y total_pagado (ROUND a 2 dec, COALESCE a 0
--   para clientes sin pagos). ORDER BY total_pagado DESC.
--   LIMIT 10.
--
--   Query original (lenta — subquery correlacionada):
--   SELECT
--       c.customer_id,
--       c.first_name || ' ' || c.last_name  AS nombre,
--       c.country,
--       (SELECT COALESCE(SUM(p.amount), 0)
--        FROM payments p
--        INNER JOIN orders o ON o.order_id = p.order_id
--        WHERE o.customer_id = c.customer_id
--          AND p.status = 'completed')       AS total_pagado
--   FROM customers c
--   ORDER BY total_pagado DESC
--   LIMIT 10;
--
-- Criterio: Sin subquery correlacionada en el SELECT.
--   LEFT JOIN customers → orders → payments. COALESCE
--   para clientes sin pagos. GROUP BY en customer_id,
--   first_name, last_name, country. Mismo resultado.

-- Tu query aquí:


-- ---------------------------------------------------------------
-- BLOQUE C (13-19): Transacciones y consistencia de datos
-- BEGIN/COMMIT/ROLLBACK, SAVEPOINT, ON CONFLICT,
-- auditorías de integridad, revenue en riesgo
-- ---------------------------------------------------------------

-- Ejercicio 13
-- DIFICULTAD: Básico
-- CONTEXTO (Briefing 8.8 — Diego Morales):
--   Cuando se registra un pedido, hay dos operaciones que
--   deben suceder juntas: INSERT en orders y UPDATE en
--   inventory. Si el sistema falla entre las dos, el estado
--   queda inconsistente. Diego necesita la transacción
--   con SAVEPOINT para poder hacer rollback parcial.
--
-- Enunciado: Escribe la transacción completa con:
--   - BEGIN
--   - INSERT en orders (order_id=99001, customer_id=42,
--     ordered_at='2026-06-01 10:00:00', status='pending')
--   - SAVEPOINT antes_del_descuento
--   - UPDATE en inventory: descuenta 2 unidades de
--     product_id=1, con condición stock >= 2
--   - Comentarios explicando los 3 escenarios de resolución:
--     A) COMMIT si todo bien
--     B) ROLLBACK TO SAVEPOINT si el descuento falló
--     C) ROLLBACK completo si hay error crítico
--   - ROLLBACK al final para no modificar el dataset
--     del curso
--
-- Criterio: Estructura BEGIN / INSERT / SAVEPOINT / UPDATE
--   / ROLLBACK (para no modificar el dataset del curso).
--   Los 3 escenarios de resolución (A/B/C) deben aparecer
--   como comentarios que explican cuándo usar COMMIT,
--   ROLLBACK TO SAVEPOINT o ROLLBACK completo.
--   UPDATE con condición stock >= 2.

-- Tu query aquí:


-- Ejercicio 14
-- DIFICULTAD: Básico-Intermedio
-- CONTEXTO (Proyecto Nivel 8 — Punto 3 de auditoría):
--   Antes de cerrar el informe financiero, necesitas
--   verificar que no hay pedidos entregados sin pago
--   completado. Eso sería una inconsistencia de datos
--   que invalida el revenue calculado.
--
-- Enunciado: Retorna los pedidos con orders.status =
--   'delivered' que NO tienen ningún payments.status =
--   'completed' asociado. Columnas: order_id, customer_id,
--   ordered_at, total_intentos_de_pago (COUNT de todos
--   los pagos del pedido, incluyendo failed y pending),
--   ultimo_estado_pago (MAX(p.status) o NULL si no hay
--   ningún intento). Ordena por ordered_at DESC.
--   Limita a 20 filas.
--
-- Criterio: LEFT JOIN de orders a payments. WHERE
--   o.status = 'delivered'. GROUP BY en order_id.
--   HAVING que verifica que ningún pago tiene
--   status='completed' (HAVING SUM(CASE WHEN
--   p.status='completed' THEN 1 ELSE 0 END) = 0).
--   COUNT y MAX para las columnas de diagnóstico.

-- Tu query aquí:


-- Ejercicio 15
-- DIFICULTAD: Básico-Intermedio
-- CONTEXTO: Auditoría de integridad referencial —
--   verificar que todos los returns tienen un order_id
--   válido en orders. Returns con order_id huérfano
--   indican eliminación incorrecta de pedidos o corrupción.
--
-- Enunciado: Retorna todos los registros de returns donde
--   el order_id no existe en la tabla orders. Columnas:
--   return_id, order_id (el del return), returned_at,
--   reason, status (del return). Ordena por returned_at
--   DESC. Si no hay returns huérfanos, el resultado es
--   vacío — eso es el resultado correcto.
--
-- Criterio: LEFT JOIN de returns a orders por order_id.
--   WHERE o.order_id IS NULL (el join no encontró el
--   pedido). Todas las columnas descriptivas del return.

-- Tu query aquí:


-- Ejercicio 16
-- DIFICULTAD: Básico-Intermedio
-- CONTEXTO: Auditoría adicional — verificar que todos los
--   order_items referencian productos que existen en la
--   tabla products. Un product_id huérfano en order_items
--   puede indicar eliminación de producto sin limpiar
--   sus items históricos.
--
-- Enunciado: Retorna los order_items cuyo product_id no
--   existe en products. Columnas: item_id, order_id,
--   product_id (el del item), quantity, unit_price.
--   Ordena por order_id. Si no hay items huérfanos,
--   el resultado es vacío.
--
-- Criterio: LEFT JOIN de order_items a products.
--   WHERE p.product_id IS NULL. Sin otras condiciones
--   — solo verificar la existencia en products.

-- Tu query aquí:


-- Ejercicio 17
-- DIFICULTAD: Intermedio
-- CONTEXTO: "Revenue en riesgo" — cuánto dinero podría
--   no haberse cobrado efectivamente. El riesgo tiene dos
--   componentes: (1) pedidos entregados sin pago completado,
--   (2) pedidos con pago en estado 'pending' por más de
--   30 días desde la fecha del pedido.
--
-- Enunciado: Retorna en dos filas separadas, o en columnas
--   de una sola fila, los dos componentes del revenue
--   en riesgo:
--
--   Componente 1 — Pedidos entregados sin pago completado:
--     cantidad_pedidos_sin_pago, monto_en_riesgo_sin_pago
--     (SUM de unit_price * quantity de order_items de esos
--     pedidos, COALESCE a 0 si no hay items, 2 dec).
--
--   Componente 2 — Pagos pending > 30 días:
--     cantidad_pagos_pending_viejos, monto_pending_viejo
--     (SUM del amount de esos payments, 2 dec).
--     Un pago es "viejo" si la fecha de ordered_at del
--     pedido asociado es anterior a 30 días desde hoy
--     (usa DATE('2026-06-01', '-30 days') como proxy
--     de "hoy" para reproducibilidad).
--
-- Criterio: Dos CTEs o dos bloques separados, uno por
--   componente. Componente 1 usa LEFT JOIN de orders a
--   payments y LEFT JOIN a order_items para el monto.
--   Componente 2 usa INNER JOIN de payments a orders.
--   JULIANDAY para calcular días en SQLite si es necesario.

-- Tu query aquí:


-- Ejercicio 18
-- DIFICULTAD: Intermedio
-- CONTEXTO: Análisis de posible fraude — detectar clientes
--   con múltiples pagos fallidos en el mismo día. Una tasa
--   alta de fallos concentrada en pocos intentos en el mismo
--   día puede indicar uso de tarjetas robadas o ataques
--   de fuerza bruta sobre métodos de pago.
--
-- Enunciado: Retorna los clientes con más de 3 pagos
--   fallidos en un mismo día (usando STRFTIME('%Y-%m-%d',
--   paid_at) como el "día"). Para cada cliente y día:
--   customer_id, pais (country del cliente), dia
--   (fecha del cluster de fallos), intentos_fallidos
--   (COUNT de pagos failed ese día para ese cliente) y
--   monto_total_fallido (SUM de amount de esos intentos,
--   2 dec). Ordena por intentos_fallidos DESC.
--   Solo incluye grupos con intentos_fallidos > 3.
--
-- NOTA: paid_at puede ser NULL para pagos failed — en ese
--   caso el grupo queda excluido automáticamente del
--   STRFTIME. Si quieres incluirlos, necesitarías una
--   lógica alternativa para la fecha. Para este ejercicio,
--   excluir los failed con paid_at NULL está bien.
--
-- Criterio: INNER JOIN payments → orders → customers.
--   WHERE p.status = 'failed'. GROUP BY customer_id y día.
--   HAVING COUNT(*) > 3. STRFTIME para extraer la fecha.

-- Tu query aquí:


-- Ejercicio 19
-- DIFICULTAD: Intermedio-Avanzado
-- CONTEXTO: Vista de auditoría consolidada que encapsula
--   todos los tipos de inconsistencia detectados en los
--   ejercicios anteriores. El equipo de calidad de datos
--   puede consultar esta vista periódicamente.
--
-- Enunciado: Crea la vista v_inconsistencias_datos con
--   estas columnas: tipo_inconsistencia (texto describiendo
--   el problema), entidad_id (el ID del registro problemático
--   — order_id, return_id o item_id según el caso),
--   detalle (descripción breve del problema específico).
--
--   La vista debe consolidar 3 tipos con UNION ALL:
--   Tipo 1: 'pedido_entregado_sin_pago' — orders con
--     status='delivered' sin payments.status='completed'
--     (entidad_id = order_id)
--   Tipo 2: 'return_sin_pedido_valido' — returns con
--     order_id no encontrado en orders
--     (entidad_id = return_id)
--   Tipo 3: 'item_con_producto_inexistente' — order_items
--     con product_id no encontrado en products
--     (entidad_id = item_id)
--
--   El campo detalle puede ser un texto fijo descriptivo
--   para cada tipo. Después de crear la vista, valida
--   con SELECT * FROM v_inconsistencias_datos.
--
-- Criterio: DROP VIEW IF EXISTS antes del CREATE VIEW.
--   UNION ALL de tres subqueries, una por tipo.
--   Subquery tipo 1 usa HAVING (de EJ14).
--   Subquery tipo 2 usa LEFT JOIN + IS NULL (de EJ15).
--   Subquery tipo 3 usa LEFT JOIN + IS NULL (de EJ16).
--   SELECT de validación al final.

-- Tu query aquí:


-- ---------------------------------------------------------------
-- BLOQUE D (20-25): Dashboard ejecutivo y portafolio
-- Vistas de producción, segmentación completa, rentabilidad,
-- forecast, query multi-CTE ejecutiva, integrador final
-- ---------------------------------------------------------------

-- Ejercicio 20
-- DIFICULTAD: Intermedio
-- CONTEXTO (Proyecto Nivel 8 — Punto 1 + Punto 4):
--   Vista ejecutiva central del dashboard: métricas
--   consolidadas mes a mes para el comité de inversores.
--   Esta vista es la fuente de verdad del dashboard mensual.
--
-- Enunciado: Crea la vista v_resumen_mensual_ejecutivo con:
--   mes (STRFTIME('%Y-%m', paid_at)),
--   revenue_cobrado (SUM completed, 2 dec),
--   revenue_reembolsado (SUM refunded, 2 dec),
--   revenue_neto (cobrado - reembolsado, 2 dec),
--   total_intentos_pago (COUNT(*) de payments del mes),
--   tasa_fallo_pago_pct (failed / total intentos * 100,
--   2 dec),
--   pedidos_del_mes (COUNT DISTINCT de order_id en payments),
--   clientes_activos (COUNT DISTINCT de customer_id vía
--   JOIN a orders y customers).
--
--   Solo incluir filas con paid_at IS NOT NULL.
--   Ordena por mes ASC.
--
--   Después de crear la vista, ejecuta:
--   SELECT * FROM v_resumen_mensual_ejecutivo
--   WHERE mes >= '2026-01' ORDER BY mes;
--
-- Criterio: DROP VIEW IF EXISTS. CREATE VIEW con CTEs
--   o sin ellas (la lógica puede ir directamente). JOIN
--   payments → orders → customers para clientes_activos.
--   NULLIF en tasa_fallo_pago_pct. SELECT de validación.

-- Tu query aquí:


-- Ejercicio 21
-- DIFICULTAD: Intermedio-Avanzado
-- CONTEXTO: Segmentación completa de clientes para el
--   comité de inversores: canal de adquisición + segmento
--   de valor + lifetime value (LTV) estimado.
--
-- Enunciado: Retorna por cliente: customer_id, country,
--   canal_adquisicion (canal de la primera sesión del
--   cliente en website_sessions vía JOIN a
--   marketing_campaigns; 'organic' si sin campaña;
--   'sin sesion' si sin ninguna sesión), segmento_valor
--   (basado en total de pagos completed vía payments:
--   0 → 'sin pagos', 1-200 → 'basico',
--   201-500 → 'intermedio', > 500 → 'premium'),
--   ltv_estimado (SUM de payments.amount donde
--   status='completed', COALESCE a 0, 2 dec).
--   Ordena por ltv_estimado DESC. Limita a 20 filas.
--
-- Criterio: CTE para canal de adquisición (primera sesión
--   con ROW_NUMBER). CTE para LTV por cliente (payments
--   completed). JOIN entre ambas y customers. CASE WHEN
--   para segmento_valor. COALESCE en ltv_estimado.

-- Tu query aquí:


-- Ejercicio 22
-- DIFICULTAD: Avanzado
-- CONTEXTO: Rentabilidad real por categoría de producto,
--   descontando devoluciones aprobadas y pagos fallidos.
--   El revenue bruto (de order_items) sobreestima el revenue
--   real — este análisis muestra la foto completa.
--
-- Enunciado: Retorna por categoría: categoria (name de
--   categories), revenue_bruto (SUM quantity*unit_price
--   de order_items en pedidos delivered, 2 dec),
--   monto_devuelto (SUM unit_price*quantity de items de
--   returns aprobados/refunded para esa categoría, 2 dec,
--   COALESCE a 0 si no hay devoluciones),
--   revenue_neto_operacional (revenue_bruto - monto_devuelto,
--   2 dec), pagos_fallidos_del_periodo (COUNT de
--   payments.status='failed' para pedidos de esa categoría,
--   COALESCE a 0) y margen_de_riesgo_pct (pagos_fallidos /
--   total intentos de la categoría * 100, 2 dec).
--   Ordena por revenue_neto_operacional DESC.
--
-- Criterio: JOIN categories → products → order_items →
--   orders. LEFT JOIN a returns y a payments. COALESCE
--   en devoluciones y en pagos fallidos. NULLIF en el
--   denominador de margen_de_riesgo_pct. GROUP BY en
--   category_id y name.

-- Tu query aquí:


-- Ejercicio 23
-- DIFICULTAD: Avanzado
-- CONTEXTO: Forecast simple para el comité: el promedio
--   de los últimos 3 meses completos como estimación del
--   mes siguiente. Es la proyección más conservadora y
--   la que más fácil puede defender un analista sin
--   modelos estadísticos.
--
-- Enunciado: Calcula el revenue neto mensual de los últimos
--   6 meses completos (mayo 2025 a mayo 2026, excluyendo
--   junio 2026 que está incompleto). Retorna:
--   mes (STRFTIME('%Y-%m')), revenue_neto (2 dec) y
--   rolling_avg_3m (promedio móvil de los últimos 3 meses
--   incluyendo el mes actual, usando AVG() OVER con ROWS
--   BETWEEN 2 PRECEDING AND CURRENT ROW, 2 dec).
--
--   Agrega una última fila con mes = '2026-06 (forecast)',
--   revenue_neto = NULL y rolling_avg_3m = el promedio
--   de los 3 últimos meses reales (marzo, abril, mayo 2026)
--   como forecast. Esto puede hacerse con UNION ALL.
--
-- Criterio: CTE con revenue mensual de payments (completed
--   - refunded). Window function AVG OVER para el promedio
--   móvil. UNION ALL con la fila de forecast calculada
--   como subquery o CTE adicional. NULLIF si aplica.

-- Tu query aquí:


-- Ejercicio 24
-- DIFICULTAD: Avanzado
-- CONTEXTO (Briefing ejecutivo — Marco Jiménez):
--   Marco necesita "los 5 insights clave de ShopSphere
--   en 2025-2026" para la apertura de su presentación.
--   Una sola query con múltiples CTEs que responde
--   5 preguntas diferentes en el mismo output.
--
-- Enunciado: Escribe una query con 5 CTEs, una por insight,
--   y combínalas con UNION ALL en un resultado de 5 filas
--   con columnas: numero_insight (1-5), titulo y valor_texto.
--
--   Insight 1: "Revenue neto total 2025-2026"
--     valor_texto = CAST(revenue neto de todos los pagos
--     completed - refunded con paid_at en ese período
--     como texto con 2 decimales)
--
--   Insight 2: "País con mayor revenue neto (histórico)"
--     valor_texto = country || ': $' || revenue_neto
--
--   Insight 3: "Tasa de fallo global de pagos"
--     valor_texto = tasa como porcentaje con 2 dec || '%'
--
--   Insight 4: "Método de pago más usado (por transacciones)"
--     valor_texto = method || ' (' || COUNT || ' transacciones)'
--
--   Insight 5: "Mes con mayor revenue neto (histórico)"
--     valor_texto = mes || ': $' || revenue_neto
--
-- Criterio: 5 CTEs, cada una calcula un insight.
--   UNION ALL de 5 subqueries SELECT con columnas fijas.
--   Cada CTE es independiente y usa payments con JOINs
--   necesarios. CAST o PRINTF para formatear el texto.
--   5 filas en el resultado final.

-- Tu query aquí:


-- Ejercicio 25 — Integrador del Nivel 8
-- DIFICULTAD: Avanzado
-- CONTEXTO (Proyecto Nivel 8 — Informe completo para el
--   comité de inversores):
--   El dashboard ejecutivo completo para la junta del
--   jueves 18 de junio. Marco, Ana y el fondo chileno
--   van a ver este output. Debe ser completo, correcto
--   y legible sin SQL.
--
-- Enunciado: Crea la vista v_dashboard_inversores con
--   métricas por país para el período completo de datos
--   disponibles. La vista debe incluir:
--
--   pais (country del cliente)
--   revenue_cobrado (SUM payments completed, 2 dec)
--   revenue_reembolsado (SUM payments refunded, 2 dec)
--   revenue_neto (cobrado - reembolsado, 2 dec)
--   total_pedidos (COUNT DISTINCT order_id de payments)
--   clientes_con_compra (COUNT DISTINCT customer_id
--     con al menos 1 payment completed)
--   ticket_promedio (revenue_cobrado / total_pedidos, 2 dec)
--   tasa_reembolso_pct (reembolsado / cobrado * 100, 2 dec)
--   tasa_fallo_pago_pct (failed / total intentos * 100,
--     2 dec)
--   revenue_neto_q1_2026 (revenue neto del período
--     2026-01-01 a 2026-03-31, 2 dec, COALESCE a 0)
--   indicador_riesgo_chile (texto: 'ALERTA — tasa de
--     fallo alta' si country = 'Chile' y tasa_fallo_pct
--     > 20%; 'Normal' en otro caso)
--
--   Solo paid_at IS NOT NULL para todos los cálculos.
--   Ordena por revenue_neto DESC.
--
--   Después, escribe el SELECT de validación completo:
--   SELECT * FROM v_dashboard_inversores;
--
-- PISTAS:
--   El revenue_neto_q1_2026 requiere una CTE adicional
--   que calcula el Q1 2026 por país, y luego un LEFT JOIN
--   desde la CTE principal a esa CTE auxiliar.
--   El indicador_riesgo_chile puede ir en el SELECT final
--   con CASE WHEN sobre country y tasa_fallo_pago_pct.
--   La vista es la query más compleja del nivel —
--   organiza las CTEs antes de escribir el SELECT final.
--
-- Criterio: DROP VIEW IF EXISTS. CREATE VIEW con 3+
--   CTEs. JOIN payments → orders → customers en todas
--   las agregaciones que necesiten country. NULLIF en
--   todos los denominadores. COALESCE en revenue Q1.
--   CASE WHEN para el indicador de riesgo. SELECT de
--   validación al final. Esta es la query más compleja
--   del nivel — tómate el tiempo de planearla.

-- Tu query aquí:


-- =============================================================
-- SOLUCIONES
-- (Intenta resolver los ejercicios antes de leer esto)
-- =============================================================

/*

--- Solución 01 ---
-- Revenue neto Q1 2026 por país
-- Briefing 8.1 — Ana Castillo
WITH pagos_q1 AS (
    SELECT
        p.payment_id,
        p.amount,
        p.status,
        c.country
    FROM payments p
    INNER JOIN orders o    ON o.order_id    = p.order_id
    INNER JOIN customers c ON c.customer_id = o.customer_id
    WHERE p.paid_at >= '2026-01-01'
      AND p.paid_at <  '2026-04-01'
),
revenue_por_pais AS (
    SELECT
        country,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END)  AS total_cobrado,
        SUM(CASE WHEN status = 'refunded'  THEN amount ELSE 0 END)  AS total_reembolsado
    FROM pagos_q1
    GROUP BY country
)
SELECT
    country                                                   AS pais,
    ROUND(total_cobrado, 2)                                   AS total_cobrado,
    ROUND(total_reembolsado, 2)                               AS total_reembolsado,
    ROUND(total_cobrado - total_reembolsado, 2)               AS revenue_neto,
    ROUND(
        total_reembolsado * 100.0
        / NULLIF(total_cobrado, 0),
        2
    )                                                         AS pct_reembolsado
FROM revenue_por_pais
ORDER BY revenue_neto DESC;


--- Solución 02 ---
-- Anomalía Chile: tasa de fallo por método vs. resto
-- Briefing 8.2 — Ana Castillo
WITH pagos_periodo AS (
    SELECT
        p.payment_id,
        p.amount,
        p.method,
        p.status,
        CASE
            WHEN c.country = 'Chile' THEN 'Chile'
            ELSE 'Resto de paises'
        END                                                   AS grupo_pais
    FROM payments p
    INNER JOIN orders o    ON o.order_id    = p.order_id
    INNER JOIN customers c ON c.customer_id = o.customer_id
    WHERE p.paid_at >= '2026-03-01'
      AND p.paid_at <  '2026-05-01'
)
SELECT
    grupo_pais,
    method                                                    AS metodo,
    COUNT(*)                                                  AS total_pagos,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)        AS pagos_fallidos,
    ROUND(
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) * 100.0
        / NULLIF(COUNT(*), 0),
        2
    )                                                         AS tasa_fallo_pct
FROM pagos_periodo
GROUP BY grupo_pais, method
ORDER BY grupo_pais ASC, tasa_fallo_pct DESC;


--- Solución 03 ---
-- Auditoría: pagos 'completed' con paid_at NULL
-- Briefing 8.3 — Ana Castillo
SELECT
    COUNT(*)                    AS registros_problematicos,
    COUNT(DISTINCT order_id)    AS pedidos_afectados,
    ROUND(SUM(amount), 2)       AS monto_total_impactado
FROM payments
WHERE status  = 'completed'
  AND paid_at IS NULL;


--- Solución 04 ---
-- Distribución de métodos por rango de monto
-- Briefing 8.4 — Ana Castillo
WITH pagos_clasificados AS (
    SELECT
        payment_id,
        amount,
        method,
        CASE
            WHEN amount < 50                THEN 'bajo (< 50)'
            WHEN amount BETWEEN 50 AND 200  THEN 'medio (50-200)'
            WHEN amount > 200               THEN 'alto (> 200)'
        END                                                   AS rango_monto
    FROM payments
    WHERE status = 'completed'
),
totales_por_rango AS (
    SELECT
        rango_monto,
        COUNT(*)                                              AS total_rango
    FROM pagos_clasificados
    GROUP BY rango_monto
)
SELECT
    pc.rango_monto,
    pc.method                                                 AS metodo,
    COUNT(*)                                                  AS transacciones,
    ROUND(
        COUNT(*) * 100.0 / NULLIF(t.total_rango, 0),
        2
    )                                                         AS pct_en_rango,
    ROUND(AVG(pc.amount), 2)                                  AS monto_promedio
FROM pagos_clasificados pc
INNER JOIN totales_por_rango t ON t.rango_monto = pc.rango_monto
GROUP BY pc.rango_monto, pc.method, t.total_rango
ORDER BY
    CASE pc.rango_monto
        WHEN 'bajo (< 50)'    THEN 1
        WHEN 'medio (50-200)' THEN 2
        WHEN 'alto (> 200)'   THEN 3
    END,
    pct_en_rango DESC;


--- Solución 05 ---
-- Revenue neto mensual Q1 2026 con variación MoM
-- Proyecto Nivel 8 — punto 4
WITH revenue_mensual AS (
    SELECT
        CAST(STRFTIME('%m', paid_at) AS INTEGER)              AS nro_mes,
        CASE CAST(STRFTIME('%m', paid_at) AS INTEGER)
            WHEN 1 THEN 'Enero 2026'
            WHEN 2 THEN 'Febrero 2026'
            WHEN 3 THEN 'Marzo 2026'
        END                                                   AS mes_nombre,
        SUM(CASE WHEN status = 'completed'
                 THEN amount ELSE 0 END)                      AS cobrado,
        SUM(CASE WHEN status = 'refunded'
                 THEN amount ELSE 0 END)                      AS reembolsado
    FROM payments
    WHERE paid_at >= '2026-01-01'
      AND paid_at <  '2026-04-01'
    GROUP BY CAST(STRFTIME('%m', paid_at) AS INTEGER)
)
SELECT
    mes_nombre                                                AS mes,
    ROUND(cobrado - reembolsado, 2)                           AS revenue_neto,
    ROUND(
        LAG(cobrado - reembolsado) OVER (ORDER BY nro_mes),
        2
    )                                                         AS revenue_neto_mes_anterior,
    ROUND(
        (
            (cobrado - reembolsado)
            - LAG(cobrado - reembolsado) OVER (ORDER BY nro_mes)
        ) * 100.0
        / NULLIF(
            LAG(cobrado - reembolsado) OVER (ORDER BY nro_mes),
            0
        ),
        2
    )                                                         AS variacion_pct
FROM revenue_mensual
ORDER BY nro_mes;


--- Solución 06 ---
-- Revenue neto histórico por país y trimestre
-- Briefing 8.10 — Marco Jiménez / Valentina
WITH pagos_anuales AS (
    SELECT
        p.amount,
        p.status,
        c.country,
        STRFTIME('%Y', p.paid_at)                             AS anio,
        CASE
            WHEN STRFTIME('%m', p.paid_at) BETWEEN '01' AND '03' THEN 1
            WHEN STRFTIME('%m', p.paid_at) BETWEEN '04' AND '06' THEN 2
            WHEN STRFTIME('%m', p.paid_at) BETWEEN '07' AND '09' THEN 3
            ELSE 4
        END                                                   AS trimestre
    FROM payments p
    INNER JOIN orders o    ON o.order_id    = p.order_id
    INNER JOIN customers c ON c.customer_id = o.customer_id
    WHERE p.paid_at IS NOT NULL
      AND p.paid_at >= '2025-06-01'
),
revenue_por_pais_trimestre AS (
    SELECT
        country,
        anio,
        trimestre,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) AS cobrado,
        SUM(CASE WHEN status = 'refunded'  THEN amount ELSE 0 END) AS reembolsado
    FROM pagos_anuales
    GROUP BY country, anio, trimestre
),
totales_trimestre AS (
    SELECT
        anio,
        trimestre,
        SUM(cobrado - reembolsado)                            AS revenue_neto_global
    FROM revenue_por_pais_trimestre
    GROUP BY anio, trimestre
)
SELECT
    r.country                                                 AS pais,
    r.anio,
    r.trimestre,
    ROUND(r.cobrado, 2)                                       AS cobrado,
    ROUND(r.reembolsado, 2)                                   AS reembolsado,
    ROUND(r.cobrado - r.reembolsado, 2)                       AS revenue_neto,
    ROUND(
        (r.cobrado - r.reembolsado) * 100.0
        / NULLIF(t.revenue_neto_global, 0),
        2
    )                                                         AS pct_del_total
FROM revenue_por_pais_trimestre r
INNER JOIN totales_trimestre t
    ON  t.anio      = r.anio
    AND t.trimestre = r.trimestre
ORDER BY r.anio, r.trimestre, revenue_neto DESC;


--- Solución 07 ---
-- EXPLAIN + CREATE INDEX + EXPLAIN
-- Briefing 8.5 — Valentina Torres

-- BLOQUE 1: plan antes de crear índices
EXPLAIN QUERY PLAN
SELECT
    c.country,
    ROUND(SUM(p.amount), 2)                                   AS revenue_bruto
FROM payments p
INNER JOIN orders o    ON o.order_id    = p.order_id
INNER JOIN customers c ON c.customer_id = o.customer_id
WHERE p.paid_at >= '2026-01-01'
  AND p.paid_at <  '2026-04-01'
  AND p.status  = 'completed'
GROUP BY c.country;
-- Resultado esperado: SCAN payments (revisa toda la tabla)

-- BLOQUE 2: crear los índices
-- paid_at: columna de rango con alta cardinalidad — usada en todos los filtros de período
CREATE INDEX IF NOT EXISTS idx_payments_paid_at
    ON payments(paid_at);
-- order_id: clave foránea usada en todos los JOINs payments → orders
CREATE INDEX IF NOT EXISTS idx_payments_order_id
    ON payments(order_id);

-- BLOQUE 3: plan después de crear los índices
EXPLAIN QUERY PLAN
SELECT
    c.country,
    ROUND(SUM(p.amount), 2)                                   AS revenue_bruto
FROM payments p
INNER JOIN orders o    ON o.order_id    = p.order_id
INNER JOIN customers c ON c.customer_id = o.customer_id
WHERE p.paid_at >= '2026-01-01'
  AND p.paid_at <  '2026-04-01'
  AND p.status  = 'completed'
GROUP BY c.country;
-- Resultado esperado: SEARCH payments USING INDEX idx_payments_paid_at


--- Solución 08 ---
-- NOT IN vs NOT EXISTS
-- Pedidos sin ningún pago completado

-- Versión A — NOT IN (problemática)
-- PROBLEMA: si algún order_id en la subquery es NULL,
-- la comparación NOT IN devuelve NULL para cada fila
-- (no TRUE ni FALSE). El resultado puede ser vacío aunque
-- haya pedidos sin pago. NULL IN (1, 2, NULL) = NULL,
-- y NOT NULL = NULL (no TRUE). Por eso NOT IN es peligroso
-- cuando la subquery puede contener NULLs.
SELECT
    order_id,
    customer_id,
    ordered_at,
    status
FROM orders
WHERE order_id NOT IN (
    SELECT order_id
    FROM payments
    WHERE status = 'completed'
    -- Si algún order_id en payments es NULL, esta subquery
    -- devuelve NULL → NOT IN falla silenciosamente
)
ORDER BY ordered_at DESC;

-- Versión B — NOT EXISTS (correcta)
-- NOT EXISTS maneja NULLs correctamente: verifica si existe
-- al menos una fila que cumpla la condición, y NULL en
-- las columnas comparadas no afecta el resultado
SELECT
    o.order_id,
    o.customer_id,
    o.ordered_at,
    o.status
FROM orders o
WHERE NOT EXISTS (
    SELECT 1
    FROM payments p
    WHERE p.order_id = o.order_id
      AND p.status   = 'completed'
)
ORDER BY o.ordered_at DESC;


--- Solución 09 ---
-- Reescribir WHERE con función en columna → rango de fechas
-- Eliminar STRFTIME del WHERE para permitir Index Scan

-- El problema de la versión original:
-- STRFTIME('%Y', p.paid_at) aplica una función a la columna paid_at
-- → el optimizador no puede usar el índice en paid_at
-- → la base de datos hace SCAN completo

SELECT
    c.country,
    COUNT(*)                                                  AS pagos_completados
FROM payments p
INNER JOIN orders o    ON o.order_id    = p.order_id
INNER JOIN customers c ON c.customer_id = o.customer_id
-- Rango explícito: permite usar el índice en paid_at (si existe)
WHERE p.paid_at >= '2025-01-01'
  AND p.paid_at <  '2026-01-01'
  AND p.status  = 'completed'
GROUP BY c.country
ORDER BY pagos_completados DESC;


--- Solución 10 ---
-- SELECT * → SELECT columnas específicas
-- Solo las columnas necesarias para el análisis de Ana

SELECT
    c.country,
    STRFTIME('%Y-%m', p.paid_at)                              AS mes,
    ROUND(
        SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END)
        - SUM(CASE WHEN p.status = 'refunded'  THEN p.amount ELSE 0 END),
        2
    )                                                         AS revenue_neto
FROM payments p
INNER JOIN orders o    ON o.order_id    = p.order_id
INNER JOIN customers c ON c.customer_id = o.customer_id
WHERE p.paid_at >= '2026-01-01'
  AND p.paid_at IS NOT NULL
GROUP BY c.country, STRFTIME('%Y-%m', p.paid_at)
ORDER BY c.country, mes;


--- Solución 11 ---
-- EXPLAIN QUERY PLAN sobre query de cohortes
-- Briefing 8.6 — Valentina Torres

EXPLAIN QUERY PLAN
WITH primera_compra AS (
    SELECT
        customer_id,
        STRFTIME('%Y-%m', MIN(ordered_at))                    AS mes_cohorte
    FROM orders
    WHERE status = 'delivered'
    GROUP BY customer_id
)
SELECT
    pc.mes_cohorte,
    COUNT(DISTINCT pc.customer_id)                            AS clientes_nuevos,
    COUNT(DISTINCT o2.customer_id)                            AS retenidos_mes2
FROM primera_compra pc
LEFT JOIN orders o2
    ON  o2.customer_id = pc.customer_id
    AND o2.status      = 'delivered'
    AND STRFTIME('%Y-%m', o2.ordered_at)
          > pc.mes_cohorte
    AND STRFTIME('%Y-%m', o2.ordered_at)
          <= STRFTIME('%Y-%m',
               DATE(pc.mes_cohorte || '-01', '+1 month'))
GROUP BY pc.mes_cohorte
ORDER BY pc.mes_cohorte;

-- (a) Operación identificada:
-- La query hace un SCAN sobre orders en la CTE primera_compra
-- y otro SCAN (o un JOIN scan) en el LEFT JOIN con o2.
-- Con 2000 órdenes en el seed el costo es aceptable, pero
-- con millones de órdenes ambos scans serían costosos.
-- El JOIN de o2 usa STRFTIME en la columna ordered_at —
-- esto impide el uso de índices en esa columna.

-- (b) Índice propuesto y justificación:
-- CREATE INDEX IF NOT EXISTS idx_orders_customer_id_ordered_at_status
--     ON orders(customer_id, ordered_at, status);
-- Justificación del orden:
-- 1. customer_id primero: el WHERE del LEFT JOIN filtra por customer_id
--    (= pc.customer_id) — es la condición de igualdad más selectiva
-- 2. ordered_at segundo: permite la búsqueda de rango que acota
--    el mes siguiente al primer pedido
-- 3. status tercero: como columna de cobertura para evitar
--    un lookup adicional a la tabla
-- No se pone status primero porque tiene baja cardinalidad (4 valores)
-- y el filtro por customer_id ya es mucho más selectivo.


--- Solución 12 ---
-- Subquery correlacionada → LEFT JOIN
-- Reescritura de anti-patrón de performance
SELECT
    c.customer_id,
    c.first_name || ' ' || c.last_name                       AS nombre,
    c.country,
    ROUND(COALESCE(SUM(p.amount), 0), 2)                      AS total_pagado
FROM customers c
LEFT JOIN orders o    ON o.customer_id = c.customer_id
LEFT JOIN payments p  ON p.order_id    = o.order_id
                      AND p.status     = 'completed'
GROUP BY c.customer_id, c.first_name, c.last_name, c.country
ORDER BY total_pagado DESC
LIMIT 10;


--- Solución 13 ---
-- Transacción atómica con SAVEPOINT
-- Diego Morales — Briefing 8.8

BEGIN;

-- Paso 1: registrar el pedido
INSERT INTO orders (order_id, customer_id, ordered_at, status)
VALUES (99001, 42, '2026-06-01 10:00:00', 'pending');

-- Punto de restauración: permite rollback parcial del descuento de stock
SAVEPOINT antes_del_descuento;

-- Paso 2: descontar 2 unidades del producto 1
-- Condición stock >= 2: garantiza que no se descuenta si no hay suficiente stock
UPDATE inventory
SET    stock      = stock - 2,
       updated_at = '2026-06-01 10:00:00'
WHERE  product_id = 1
  AND  stock >= 2;

-- Escenarios de resolución:
-- A) Todo bien → ejecutar: COMMIT  (persisten INSERT + UPDATE)
-- B) Descuento falló (stock insuficiente) → ejecutar:
--    ROLLBACK TO SAVEPOINT antes_del_descuento
--    (deshace solo el UPDATE, mantiene el INSERT; transacción sigue abierta)
-- C) Error crítico en cualquier paso → ejecutar: ROLLBACK
--    (deshace TODO: INSERT + UPDATE, estado original restaurado)

-- En el Playground usamos ROLLBACK para no modificar el dataset del curso.
-- Si quisieras persistir los cambios en un entorno real, usarías COMMIT en su lugar.
ROLLBACK;


--- Solución 14 ---
-- Auditoría: pedidos 'delivered' sin pago 'completed'
-- Proyecto Nivel 8 — integridad de datos
SELECT
    o.order_id,
    o.customer_id,
    o.ordered_at,
    COUNT(p.payment_id)                                       AS total_intentos_de_pago,
    MAX(p.status)                                             AS ultimo_estado_pago
FROM orders o
LEFT JOIN payments p ON p.order_id = o.order_id
WHERE o.status = 'delivered'
GROUP BY o.order_id, o.customer_id, o.ordered_at
HAVING SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) = 0
ORDER BY o.ordered_at DESC
LIMIT 20;


--- Solución 15 ---
-- Auditoría: returns sin order_id válido en orders
SELECT
    r.return_id,
    r.order_id,
    r.returned_at,
    r.reason,
    r.status
FROM returns r
LEFT JOIN orders o ON o.order_id = r.order_id
WHERE o.order_id IS NULL
ORDER BY r.returned_at DESC;


--- Solución 16 ---
-- Auditoría: order_items con product_id inexistente en products
SELECT
    oi.item_id,
    oi.order_id,
    oi.product_id,
    oi.quantity,
    oi.unit_price
FROM order_items oi
LEFT JOIN products p ON p.product_id = oi.product_id
WHERE p.product_id IS NULL
ORDER BY oi.order_id;


--- Solución 17 ---
-- Revenue en riesgo: dos componentes
-- Componente 1: pedidos delivered sin pago completed
WITH pedidos_sin_pago AS (
    SELECT
        o.order_id
    FROM orders o
    LEFT JOIN payments p
        ON  p.order_id = o.order_id
        AND p.status   = 'completed'
    WHERE o.status   = 'delivered'
    GROUP BY o.order_id
    HAVING SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) = 0
),
monto_sin_pago AS (
    SELECT
        COUNT(DISTINCT psp.order_id)                          AS cantidad_pedidos_sin_pago,
        ROUND(COALESCE(SUM(oi.quantity * oi.unit_price), 0), 2) AS monto_en_riesgo_sin_pago
    FROM pedidos_sin_pago psp
    LEFT JOIN order_items oi ON oi.order_id = psp.order_id
),
-- Componente 2: pagos pending > 30 días
pagos_pending_viejos AS (
    SELECT
        COUNT(*)                                              AS cantidad_pagos_pending_viejos,
        ROUND(SUM(p.amount), 2)                               AS monto_pending_viejo
    FROM payments p
    INNER JOIN orders o ON o.order_id = p.order_id
    WHERE p.status     = 'pending'
      AND o.ordered_at < DATE('2026-06-01', '-30 days')
)
SELECT
    mspp.cantidad_pedidos_sin_pago,
    mspp.monto_en_riesgo_sin_pago,
    ppv.cantidad_pagos_pending_viejos,
    ppv.monto_pending_viejo,
    ROUND(
        mspp.monto_en_riesgo_sin_pago
        + ppv.monto_pending_viejo,
        2
    )                                                         AS revenue_total_en_riesgo
FROM monto_sin_pago mspp
CROSS JOIN pagos_pending_viejos ppv;


--- Solución 18 ---
-- Detección de posible fraude: múltiples pagos fallidos el mismo día
SELECT
    o.customer_id,
    c.country                                                 AS pais,
    STRFTIME('%Y-%m-%d', p.paid_at)                           AS dia,
    COUNT(*)                                                  AS intentos_fallidos,
    ROUND(SUM(p.amount), 2)                                   AS monto_total_fallido
FROM payments p
INNER JOIN orders o    ON o.order_id    = p.order_id
INNER JOIN customers c ON c.customer_id = o.customer_id
WHERE p.status  = 'failed'
  AND p.paid_at IS NOT NULL
GROUP BY o.customer_id, c.country, STRFTIME('%Y-%m-%d', p.paid_at)
HAVING COUNT(*) > 3
ORDER BY intentos_fallidos DESC;


--- Solución 19 ---
-- Vista de auditoría consolidada v_inconsistencias_datos
DROP VIEW IF EXISTS v_inconsistencias_datos;
CREATE VIEW v_inconsistencias_datos AS
-- Tipo 1: pedidos entregados sin pago completado
SELECT
    'pedido_entregado_sin_pago'                               AS tipo_inconsistencia,
    o.order_id                                                AS entidad_id,
    'Pedido delivered sin ningun pago completed asociado'     AS detalle
FROM orders o
LEFT JOIN payments p
    ON  p.order_id = o.order_id
    AND p.status   = 'completed'
WHERE o.status   = 'delivered'
GROUP BY o.order_id
HAVING SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) = 0

UNION ALL

-- Tipo 2: returns con order_id que no existe en orders
SELECT
    'return_sin_pedido_valido'                                AS tipo_inconsistencia,
    r.return_id                                               AS entidad_id,
    'Return con order_id no encontrado en tabla orders'       AS detalle
FROM returns r
LEFT JOIN orders o ON o.order_id = r.order_id
WHERE o.order_id IS NULL

UNION ALL

-- Tipo 3: order_items con product_id que no existe en products
SELECT
    'item_con_producto_inexistente'                           AS tipo_inconsistencia,
    oi.item_id                                                AS entidad_id,
    'Item con product_id no encontrado en tabla products'     AS detalle
FROM order_items oi
LEFT JOIN products p ON p.product_id = oi.product_id
WHERE p.product_id IS NULL;

-- Validación
SELECT * FROM v_inconsistencias_datos;


--- Solución 20 ---
-- Vista v_resumen_mensual_ejecutivo
DROP VIEW IF EXISTS v_resumen_mensual_ejecutivo;
CREATE VIEW v_resumen_mensual_ejecutivo AS
WITH pagos_mes AS (
    SELECT
        STRFTIME('%Y-%m', p.paid_at)                          AS mes,
        COUNT(DISTINCT p.order_id)                            AS pedidos_del_mes,
        COUNT(*)                                              AS total_intentos,
        SUM(CASE WHEN p.status = 'completed'
                 THEN p.amount ELSE 0 END)                    AS cobrado,
        SUM(CASE WHEN p.status = 'refunded'
                 THEN p.amount ELSE 0 END)                    AS reembolsado,
        SUM(CASE WHEN p.status = 'failed'
                 THEN 1 ELSE 0 END)                           AS fallos,
        COUNT(DISTINCT c.customer_id)                         AS clientes_activos
    FROM payments p
    INNER JOIN orders o    ON o.order_id    = p.order_id
    INNER JOIN customers c ON c.customer_id = o.customer_id
    WHERE p.paid_at IS NOT NULL
    GROUP BY STRFTIME('%Y-%m', p.paid_at)
)
SELECT
    mes,
    ROUND(cobrado, 2)                                         AS revenue_cobrado,
    ROUND(reembolsado, 2)                                     AS revenue_reembolsado,
    ROUND(cobrado - reembolsado, 2)                           AS revenue_neto,
    total_intentos                                            AS total_intentos_pago,
    ROUND(
        fallos * 100.0 / NULLIF(total_intentos, 0),
        2
    )                                                         AS tasa_fallo_pago_pct,
    pedidos_del_mes,
    clientes_activos
FROM pagos_mes
ORDER BY mes ASC;

-- Validación
SELECT * FROM v_resumen_mensual_ejecutivo
WHERE mes >= '2026-01'
ORDER BY mes;


--- Solución 21 ---
-- Segmentación completa: canal de adquisición + segmento de valor + LTV
WITH primera_sesion AS (
    SELECT
        ws.customer_id,
        ws.campaign_id,
        ROW_NUMBER() OVER (
            PARTITION BY ws.customer_id
            ORDER BY ws.started_at ASC
        )                                                     AS rn
    FROM website_sessions ws
),
canal_cliente AS (
    SELECT
        ps.customer_id,
        COALESCE(mc.channel, 'organic')                       AS canal_adquisicion
    FROM primera_sesion ps
    LEFT JOIN marketing_campaigns mc ON mc.campaign_id = ps.campaign_id
    WHERE ps.rn = 1
),
canal_todos AS (
    SELECT
        c.customer_id,
        COALESCE(cc.canal_adquisicion, 'sin sesion')          AS canal_adquisicion
    FROM customers c
    LEFT JOIN canal_cliente cc ON cc.customer_id = c.customer_id
),
ltv_cliente AS (
    SELECT
        o.customer_id,
        COALESCE(SUM(p.amount), 0)                            AS ltv_estimado
    FROM orders o
    LEFT JOIN payments p
        ON  p.order_id = o.order_id
        AND p.status   = 'completed'
    GROUP BY o.customer_id
)
SELECT
    c.customer_id,
    c.country,
    ct.canal_adquisicion,
    CASE
        WHEN COALESCE(lc.ltv_estimado, 0) = 0           THEN 'sin pagos'
        WHEN lc.ltv_estimado BETWEEN 1    AND 200        THEN 'basico'
        WHEN lc.ltv_estimado BETWEEN 201  AND 500        THEN 'intermedio'
        WHEN lc.ltv_estimado > 500                       THEN 'premium'
    END                                                       AS segmento_valor,
    ROUND(COALESCE(lc.ltv_estimado, 0), 2)                    AS ltv_estimado
FROM customers c
LEFT JOIN canal_todos ct  ON ct.customer_id = c.customer_id
LEFT JOIN ltv_cliente lc  ON lc.customer_id = c.customer_id
ORDER BY ltv_estimado DESC
LIMIT 20;


--- Solución 22 ---
-- Rentabilidad real por categoría
-- Revenue bruto - devoluciones, con tasa de fallos de pago
WITH revenue_por_categoria AS (
    SELECT
        cat.category_id,
        cat.name                                              AS categoria,
        SUM(oi.quantity * oi.unit_price)                      AS revenue_bruto
    FROM categories cat
    INNER JOIN products p    ON p.category_id   = cat.category_id
    INNER JOIN order_items oi ON oi.product_id  = p.product_id
    INNER JOIN orders o       ON o.order_id     = oi.order_id
    WHERE o.status = 'delivered'
    GROUP BY cat.category_id, cat.name
),
devoluciones_por_categoria AS (
    SELECT
        p.category_id,
        SUM(oi.quantity * oi.unit_price)                      AS monto_devuelto
    FROM returns r
    INNER JOIN order_items oi ON oi.order_id   = r.order_id
                               AND oi.product_id = r.product_id
    INNER JOIN products p     ON p.product_id  = oi.product_id
    WHERE r.status IN ('approved', 'refunded')
    GROUP BY p.category_id
),
pagos_por_categoria AS (
    SELECT
        p2.category_id,
        SUM(CASE WHEN pay.status = 'failed' THEN 1 ELSE 0 END) AS pagos_fallidos,
        COUNT(*)                                              AS total_intentos
    FROM payments pay
    INNER JOIN orders o       ON o.order_id    = pay.order_id
    INNER JOIN order_items oi ON oi.order_id   = o.order_id
    INNER JOIN products p2    ON p2.product_id = oi.product_id
    GROUP BY p2.category_id
)
SELECT
    rpc.categoria,
    ROUND(rpc.revenue_bruto, 2)                               AS revenue_bruto,
    ROUND(COALESCE(dpc.monto_devuelto, 0), 2)                 AS monto_devuelto,
    ROUND(rpc.revenue_bruto - COALESCE(dpc.monto_devuelto, 0), 2) AS revenue_neto_operacional,
    COALESCE(ppc.pagos_fallidos, 0)                           AS pagos_fallidos_del_periodo,
    ROUND(
        COALESCE(ppc.pagos_fallidos, 0) * 100.0
        / NULLIF(COALESCE(ppc.total_intentos, 0), 0),
        2
    )                                                         AS margen_de_riesgo_pct
FROM revenue_por_categoria rpc
LEFT JOIN devoluciones_por_categoria dpc ON dpc.category_id = rpc.category_id
LEFT JOIN pagos_por_categoria ppc        ON ppc.category_id = rpc.category_id
ORDER BY revenue_neto_operacional DESC;


--- Solución 23 ---
-- Forecast: promedio móvil 3 meses + proyección
WITH revenue_mensual AS (
    SELECT
        STRFTIME('%Y-%m', paid_at)                            AS mes,
        ROUND(
            SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END)
            - SUM(CASE WHEN status = 'refunded'  THEN amount ELSE 0 END),
            2
        )                                                     AS revenue_neto
    FROM payments
    WHERE paid_at >= '2025-05-01'
      AND paid_at <  '2026-06-01'
      AND paid_at IS NOT NULL
    GROUP BY STRFTIME('%Y-%m', paid_at)
),
con_rolling_avg AS (
    SELECT
        mes,
        revenue_neto,
        ROUND(
            AVG(revenue_neto) OVER (
                ORDER BY mes
                ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
            ),
            2
        )                                                     AS rolling_avg_3m
    FROM revenue_mensual
),
forecast_mes AS (
    SELECT
        ROUND(AVG(revenue_neto), 2)                           AS forecast_junio
    FROM revenue_mensual
    WHERE mes IN ('2026-03', '2026-04', '2026-05')
)
SELECT mes, revenue_neto, rolling_avg_3m
FROM con_rolling_avg

UNION ALL

SELECT
    '2026-06 (forecast)'                                      AS mes,
    NULL                                                      AS revenue_neto,
    f.forecast_junio                                          AS rolling_avg_3m
FROM forecast_mes f

ORDER BY mes;


--- Solución 24 ---
-- 5 insights ejecutivos con UNION ALL
-- Briefing ejecutivo — Marco Jiménez
WITH insight1 AS (
    SELECT
        1                                                     AS numero_insight,
        'Revenue neto total 2025-2026'                        AS titulo,
        CAST(
            ROUND(
                SUM(CASE WHEN status='completed' THEN amount ELSE 0 END)
                - SUM(CASE WHEN status='refunded' THEN amount ELSE 0 END),
                2
            ) AS TEXT
        )                                                     AS valor_texto
    FROM payments
    WHERE paid_at >= '2025-01-01'
      AND paid_at IS NOT NULL
),
insight2 AS (
    SELECT
        2                                                     AS numero_insight,
        'Pais con mayor revenue neto (historico)'             AS titulo,
        c.country || ': $' || CAST(
            ROUND(
                SUM(CASE WHEN p.status='completed' THEN p.amount ELSE 0 END)
                - SUM(CASE WHEN p.status='refunded' THEN p.amount ELSE 0 END),
                2
            ) AS TEXT
        )                                                     AS valor_texto
    FROM payments p
    INNER JOIN orders o    ON o.order_id    = p.order_id
    INNER JOIN customers c ON c.customer_id = o.customer_id
    WHERE p.paid_at IS NOT NULL
    GROUP BY c.country
    ORDER BY
        SUM(CASE WHEN p.status='completed' THEN p.amount ELSE 0 END)
        - SUM(CASE WHEN p.status='refunded' THEN p.amount ELSE 0 END) DESC
    LIMIT 1
),
insight3 AS (
    SELECT
        3                                                     AS numero_insight,
        'Tasa de fallo global de pagos'                       AS titulo,
        CAST(
            ROUND(
                SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) * 100.0
                / NULLIF(COUNT(*), 0),
                2
            ) AS TEXT
        ) || '%'                                              AS valor_texto
    FROM payments
),
insight4 AS (
    SELECT
        4                                                     AS numero_insight,
        'Metodo de pago mas usado (por transacciones)'        AS titulo,
        method || ' (' || CAST(COUNT(*) AS TEXT) || ' transacciones)' AS valor_texto
    FROM payments
    WHERE status = 'completed'
    GROUP BY method
    ORDER BY COUNT(*) DESC
    LIMIT 1
),
insight5 AS (
    SELECT
        5                                                     AS numero_insight,
        'Mes con mayor revenue neto (historico)'              AS titulo,
        STRFTIME('%Y-%m', paid_at) || ': $' || CAST(
            ROUND(
                SUM(CASE WHEN status='completed' THEN amount ELSE 0 END)
                - SUM(CASE WHEN status='refunded' THEN amount ELSE 0 END),
                2
            ) AS TEXT
        )                                                     AS valor_texto
    FROM payments
    WHERE paid_at IS NOT NULL
    GROUP BY STRFTIME('%Y-%m', paid_at)
    ORDER BY
        SUM(CASE WHEN status='completed' THEN amount ELSE 0 END)
        - SUM(CASE WHEN status='refunded' THEN amount ELSE 0 END) DESC
    LIMIT 1
)
SELECT numero_insight, titulo, valor_texto FROM insight1
UNION ALL
SELECT numero_insight, titulo, valor_texto FROM insight2
UNION ALL
SELECT numero_insight, titulo, valor_texto FROM insight3
UNION ALL
SELECT numero_insight, titulo, valor_texto FROM insight4
UNION ALL
SELECT numero_insight, titulo, valor_texto FROM insight5
ORDER BY numero_insight;


--- Solución 25 ---
-- Vista v_dashboard_inversores
DROP VIEW IF EXISTS v_dashboard_inversores;
CREATE VIEW v_dashboard_inversores AS
WITH pagos_historicos AS (
    -- Todos los pagos con datos de cliente, excluyendo paid_at NULL
    SELECT
        p.payment_id,
        p.order_id,
        p.amount,
        p.status,
        p.paid_at,
        c.country
    FROM payments p
    INNER JOIN orders o    ON o.order_id    = p.order_id
    INNER JOIN customers c ON c.customer_id = o.customer_id
    WHERE p.paid_at IS NOT NULL
),
metricas_generales AS (
    SELECT
        country,
        COUNT(DISTINCT order_id)                              AS total_pedidos,
        COUNT(*)                                              AS total_intentos,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) AS cobrado,
        SUM(CASE WHEN status = 'refunded'  THEN amount ELSE 0 END) AS reembolsado,
        SUM(CASE WHEN status = 'failed'    THEN 1    ELSE 0 END)   AS fallos,
        COUNT(DISTINCT CASE WHEN status = 'completed'
                            THEN order_id END)                AS pedidos_completados
    FROM pagos_historicos
    GROUP BY country
),
revenue_q1_2026 AS (
    -- Revenue neto de Q1 2026 por país (para la columna específica)
    SELECT
        country,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END)
        - SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END) AS revenue_neto_q1
    FROM pagos_historicos
    WHERE paid_at >= '2026-01-01'
      AND paid_at <  '2026-04-01'
    GROUP BY country
),
clientes_compradores AS (
    -- Clientes únicos con al menos un pago completado, por país
    SELECT
        c.country,
        COUNT(DISTINCT o.customer_id)                         AS clientes_con_compra
    FROM payments p
    INNER JOIN orders o    ON o.order_id    = p.order_id
    INNER JOIN customers c ON c.customer_id = o.customer_id
    WHERE p.status = 'completed'
    GROUP BY c.country
)
SELECT
    mg.country                                                AS pais,
    ROUND(mg.cobrado, 2)                                      AS revenue_cobrado,
    ROUND(mg.reembolsado, 2)                                  AS revenue_reembolsado,
    ROUND(mg.cobrado - mg.reembolsado, 2)                     AS revenue_neto,
    mg.total_pedidos,
    COALESCE(cc.clientes_con_compra, 0)                       AS clientes_con_compra,
    ROUND(
        mg.cobrado / NULLIF(mg.total_pedidos, 0),
        2
    )                                                         AS ticket_promedio,
    ROUND(
        mg.reembolsado * 100.0 / NULLIF(mg.cobrado, 0),
        2
    )                                                         AS tasa_reembolso_pct,
    ROUND(
        mg.fallos * 100.0 / NULLIF(mg.total_intentos, 0),
        2
    )                                                         AS tasa_fallo_pago_pct,
    ROUND(COALESCE(rq.revenue_neto_q1, 0), 2)                 AS revenue_neto_q1_2026,
    CASE
        WHEN mg.country = 'Chile'
         AND (mg.fallos * 100.0 / NULLIF(mg.total_intentos, 0)) > 20
        THEN 'ALERTA — tasa de fallo alta'
        ELSE 'Normal'
    END                                                       AS indicador_riesgo_chile
FROM metricas_generales mg
LEFT JOIN revenue_q1_2026 rq      ON rq.country = mg.country
LEFT JOIN clientes_compradores cc  ON cc.country = mg.country
ORDER BY revenue_neto DESC;

-- Validación completa
SELECT * FROM v_dashboard_inversores;

*/
