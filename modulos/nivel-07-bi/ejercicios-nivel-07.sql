-- =============================================================
-- EJERCICIOS NIVEL 7 — SQL para Business Intelligence
-- ShopSphere SQL Course
-- Tablas disponibles: customers, categories, products,
--                     orders, order_items, returns,
--                     inventory, marketing_campaigns,
--                     website_sessions (NUEVA)
-- =============================================================
-- Contexto narrativo:
--   El fondo chileno y el fondo mexicano se reúnen con Marco
--   el 18 de junio. Quieren ver el funnel de adquisición
--   completo de ShopSphere en Power BI. Valentina necesita
--   infraestructura analítica que los fondos puedan consultar
--   sin depender del equipo interno. Estos ejercicios
--   construyen, paso a paso, esa infraestructura.
--
-- Nota sobre dialecto:
--   El Playground usa SQLite. Algunas funciones de PostgreSQL
--   no están disponibles (INTERVAL, DATE_TRUNC, ::cast).
--   Las soluciones usan sintaxis compatible con SQLite.
--   Booleanos: TRUE/FALSE (SQLite los acepta como 1/0 también).
-- =============================================================


-- ---------------------------------------------------------------
-- BLOQUE A (1-6): COUNT condicional y tasas de conversión
-- Introducción a website_sessions, patron COUNT(CASE WHEN),
-- análisis por canal y dispositivo
-- ---------------------------------------------------------------

-- Ejercicio 01
-- DIFICULTAD: Básico
-- CONTEXTO (Briefing 7.1 — Sofía Ramírez):
--   Sofía necesita saber si la campaña de Día de Madres
--   (5-10 de mayo 2026) trajo tráfico de calidad o solo volumen.
--   Umbral de referencia: < 3% es problema, > 6% vale escalar.
--
-- DECISIÓN ANALÍTICA: Solo sesiones de esa campaña en ese
--   período exacto → INNER JOIN (excluye sesiones orgánicas).
--   Filtrar por campaña cuyo name contiene 'Madres' (LIKE).
--
-- Enunciado: Para la campaña de Día de Madres en el período
--   2026-05-05 a 2026-05-10 (inclusive), retorna:
--   campana (name de la campaña), canal, total_sesiones,
--   sesiones_convertidas y tasa_conversion_pct (redondeado
--   a 2 decimales). Si no hay sesiones en ese período exacto
--   para esa campaña, el resultado puede ser vacío — eso es
--   información válida.
--
-- Criterio: INNER JOIN entre website_sessions y
--   marketing_campaigns. Filtro por started_at y por name
--   de campaña con LIKE. COUNT condicional para convertidas.
--   100.0 en el numerador. NULLIF en el denominador.

-- Tu query aquí:


-- Ejercicio 02
-- DIFICULTAD: Básico
-- CONTEXTO (Briefing 7.2 — Sofía Ramírez):
--   Sofía quiere el comparativo histórico de conversión por
--   canal para el deck de presupuesto Q3. "Cuál de nuestros
--   canales convierte mejor" — con el número, no la intuición.
--
-- DECISIÓN ANALÍTICA: Solo sesiones con campaña asignada
--   (INNER JOIN excluye orgánicas). El análisis es de canales
--   de marketing pagos, no de tráfico orgánico.
--
-- Enunciado: Para el historial completo de website_sessions,
--   retorna: canal, total_sesiones, sesiones_convertidas y
--   tasa_conversion_pct (redondeado a 2 decimales).
--   Ordena de mayor a menor tasa. Una fila por canal.
--
-- Criterio: INNER JOIN con marketing_campaigns. GROUP BY
--   channel. COUNT condicional con converted = TRUE.
--   NULLIF en denominador. ORDER BY tasa DESC.

-- Tu query aquí:


-- Ejercicio 03
-- DIFICULTAD: Básico
-- CONTEXTO (Briefing 7.4 — Sofía Ramírez):
--   Hipótesis de Sofía: mobile ve más páginas pero compra menos.
--   Si se confirma, es un problema de experiencia móvil
--   para llevar a producto.
--
-- Enunciado: Para cada device_type, retorna: dispositivo,
--   total_sesiones, sesiones_convertidas, tasa_conversion_pct
--   (redondeado a 2 dec) y promedio_paginas_vistas (redondeado
--   a 2 dec). Ordena por total_sesiones descendente.
--   No se necesita ningún JOIN — website_sessions tiene todo.
--
-- Criterio: GROUP BY device_type. COUNT condicional para
--   convertidas. AVG(pages_viewed). 100.0 en numerador.
--   NULLIF en denominador. 3 filas en el resultado.

-- Tu query aquí:


-- Ejercicio 04
-- DIFICULTAD: Básico-Intermedio
-- CONTEXTO: El equipo de analítica quiere ver la evolución
--   mensual de las sesiones y la tasa de conversión durante
--   2025, para identificar estacionalidad en el comportamiento
--   de los usuarios.
--
-- Enunciado: Para cada mes de 2025 (formato YYYY-MM), retorna:
--   mes, total_sesiones, sesiones_convertidas y
--   tasa_conversion_pct (redondeado a 2 dec).
--   Ordena por mes ascendente.
--
--   En SQLite, usa STRFTIME('%Y-%m', started_at) para extraer
--   el año-mes del timestamp.
--
-- Criterio: STRFTIME para extraer el año-mes. GROUP BY mes.
--   Filtro de año 2025. COUNT condicional. NULLIF. Una fila
--   por mes (12 filas si hay datos en todos los meses).

-- Tu query aquí:


-- Ejercicio 05
-- DIFICULTAD: Intermedio
-- CONTEXTO (Briefing 7.7 — Valentina Torres):
--   El equipo de producto quiere clasificar sesiones por
--   engagement (páginas vistas) y ver si "exploración alta"
--   realmente convierte más. La hipótesis puede ser correcta
--   o contradecirse con los datos — ambos resultados son válidos.
--
-- Enunciado: Clasifica cada sesión con CASE WHEN:
--   pages_viewed = 1 → 'rebote'
--   pages_viewed 2-4 → 'exploracion baja'
--   pages_viewed 5-9 → 'exploracion media'
--   pages_viewed >= 10 → 'exploracion alta'
--
--   Retorna: nivel_engagement, total_sesiones,
--   sesiones_convertidas y tasa_conversion_pct (2 dec).
--   Ordena de menor a mayor engagement (rebote primero).
--   El ORDER BY NO puede ser alfabético sobre el string.
--
-- Criterio: CTE con la clasificación. COUNT condicional para
--   la tasa. ORDER BY con segundo CASE WHEN que asigna un
--   número de orden (1-4). 4 filas en el resultado.

-- Tu query aquí:


-- Ejercicio 06
-- DIFICULTAD: Intermedio
-- CONTEXTO: Valentina quiere un ranking rápido de las top 5
--   campañas por volumen de sesiones, con su tasa de
--   conversión para evaluar calidad vs. cantidad.
--
-- DECISIÓN ANALÍTICA: Solo campañas (INNER JOIN, excluye
--   orgánicas). Ranking por total de sesiones, no por tasa.
--
-- Enunciado: Retorna las 5 campañas con más sesiones totales:
--   campana (name), canal, total_sesiones, sesiones_convertidas
--   y tasa_conversion_pct (2 dec). Ordena por total_sesiones
--   descendente. Limita a 5 filas.
--
-- Criterio: INNER JOIN con marketing_campaigns. GROUP BY
--   campaign_id y name. COUNT condicional. ORDER BY
--   total_sesiones DESC. LIMIT 5.

-- Tu query aquí:


-- ---------------------------------------------------------------
-- BLOQUE B (7-12): Funnel con LEFT JOIN encadenado
-- Funnel multi-etapa, COUNT DISTINCT, análisis por país,
-- sesiones previas a la primera compra
-- ---------------------------------------------------------------

-- Ejercicio 07
-- DIFICULTAD: Intermedio
-- CONTEXTO (Briefing 7.3 — Sofía Ramírez, Slack):
--   Sofía quiere el funnel completo de Q1 2026 para saber
--   en qué etapa se pierde más volumen.
--   "Si convirtieron pero el pedido no se concretó, es un
--   problema de checkout. Si el pedido se hizo pero no se
--   entregó, es un problema de ops."
--
-- ADVERTENCIA TÉCNICA: El JOIN entre sesiones y pedidos es
--   por customer_id (no por order_id — website_sessions no
--   tiene order_id). Un cliente con 10 sesiones y 3 pedidos
--   genera 30 combinaciones → siempre COUNT DISTINCT.
--
-- Enunciado: Para el período enero-marzo 2026, retorna
--   en una sola fila: total_sesiones, sesiones_convertidas,
--   pedidos_generados, pedidos_entregados,
--   tasa_sesion_a_conversion, tasa_conversion_a_pedido y
--   tasa_pedido_a_entregado (todas las tasas con 2 dec).
--
-- Criterio: Dos CTEs (una para sesiones Q1, otra para
--   pedidos Q1). LEFT JOIN por customer_id. COUNT DISTINCT
--   en session_id y order_id. NULLIF en todos los
--   denominadores. 1 fila en el resultado.

-- Tu query aquí:


-- Ejercicio 08
-- DIFICULTAD: Intermedio
-- CONTEXTO: Marco necesita saber en qué países la tasa
--   de sesión→pedido es más baja para Q1 2026. Si hay
--   países con tasas muy bajas, puede haber un problema
--   local (métodos de pago, idioma, precio).
--
-- Enunciado: Para Q1 2026, retorna por país: country,
--   total_sesiones, sesiones_convertidas, pedidos_generados,
--   y tasa_sesion_a_pedido (redondeado a 2 dec). Muestra
--   los países con la tasa más baja primero (ORDER BY ASC).
--   Incluye solo países con al menos 10 sesiones.
--
-- Criterio: JOIN de website_sessions con customers para
--   obtener country. CTEs para sesiones y pedidos de Q1.
--   COUNT DISTINCT. HAVING o WHERE post-agrupación para
--   el filtro de 10 sesiones. ORDER BY tasa ASC.

-- Tu query aquí:


-- Ejercicio 09
-- DIFICULTAD: Intermedio-Avanzado
-- CONTEXTO (Briefing 7.10 — Ana Castillo):
--   En Chile, marzo-abril 2026, se detectaron pagos fallidos
--   atípicos. Ana quiere ver el funnel completo para ese
--   período y país para cuantificar el impacto.
--
--   NOTA: Este ejercicio usa orders.status como proxy de
--   "pago exitoso" (delivered = exitoso, cancelled = fallido).
--   La tabla payments es Nivel 8. En el Nivel 8 reharemos
--   este análisis con payments.status directamente.
--
-- Enunciado: Para clientes de Chile, período marzo-abril 2026
--   (2026-03-01 a 2026-04-30 inclusive), retorna en una fila:
--   total_sesiones, sesiones_convertidas, pedidos_creados,
--   pedidos_entregados (proxy pago exitoso),
--   pedidos_cancelados (proxy pago fallido) y la brecha
--   entre sesiones_convertidas y pedidos_entregados
--   (brecha_conversion_a_entrega = sesiones_convertidas -
--   pedidos_entregados). COUNT DISTINCT en todas las métricas.
--
-- Criterio: CTE para clientes chilenos. CTEs separadas para
--   sesiones y pedidos del período filtradas por customer_id
--   chileno. LEFT JOIN de sesiones a pedidos por customer_id.
--   COUNT DISTINCT. La columna brecha_conversion_a_entrega
--   es una resta simple. 1 fila.

-- Tu query aquí:


-- Ejercicio 10
-- DIFICULTAD: Intermedio
-- CONTEXTO (Briefing 7.9 — Marco Jiménez / Valentina):
--   "¿Cuántas veces visita alguien nuestro sitio antes de
--   comprar por primera vez?" Marco lo preguntó en Chile.
--   La respuesta define cuántos touchpoints de remarketing
--   tiene sentido usar.
--
-- Enunciado: Retorna en una fila: promedio_sesiones_previas
--   (redondeado a 2 dec), minimo, maximo y
--   clientes_con_sesiones_previas.
--   Solo cuenta sesiones que ocurrieron ANTES del primer
--   pedido (no cancelado) del cliente. Excluye clientes
--   que compraron sin ninguna sesión previa.
--
-- Criterio: CTE para el primer pedido por cliente
--   (MIN ordered_at, status != 'cancelled'). JOIN con
--   website_sessions usando started_at < fecha_primer_pedido.
--   COUNT(session_id) por cliente. AVG sobre esos conteos.
--   1 fila final.

-- Tu query aquí:


-- Ejercicio 11
-- DIFICULTAD: Intermedio
-- CONTEXTO: El equipo de CRM quiere identificar los clientes
--   que visitaron el sitio pero nunca compraron. Estos son
--   candidatos para una campaña de activación.
--
-- Enunciado: Retorna los clientes que tienen al menos una
--   sesión en website_sessions pero ningún pedido en orders
--   (de cualquier status). Para cada cliente: customer_id,
--   nombre completo (first_name || ' ' || last_name),
--   country, total_sesiones y fecha de la primera sesión.
--   Ordena por total_sesiones descendente. Limita a 20 filas.
--
-- Criterio: LEFT JOIN de website_sessions a orders por
--   customer_id, con filtro WHERE order_id IS NULL (o NOT
--   EXISTS). JOIN con customers para los datos de nombre.
--   GROUP BY customer_id. ORDER BY total_sesiones DESC.

-- Tu query aquí:


-- Ejercicio 12
-- DIFICULTAD: Intermedio-Avanzado
-- CONTEXTO: El equipo de ventas quiere saber si los clientes
--   que más visitaron el sitio antes de comprar terminan
--   generando más revenue que los que compraron rápido.
--
-- Enunciado: Clasifica los clientes según su número total
--   de sesiones en website_sessions:
--   < 5 sesiones → 'pocos touchpoints'
--   5 a 10 sesiones → 'touchpoints medios'
--   > 10 sesiones → 'muchos touchpoints'
--
--   Para cada categoría retorna: categoria_sesiones,
--   cantidad_clientes, revenue_total (suma de sus pedidos
--   entregados, redondeado a 2 dec) y
--   revenue_promedio_por_cliente (redondeado a 2 dec).
--   Ordena de menor a mayor cantidad de touchpoints.
--
-- Criterio: CTE para sesiones por cliente. CTE para revenue
--   por cliente (status = 'delivered'). JOIN entre ellas.
--   CASE WHEN para la categoría. COALESCE para clientes sin
--   revenue. GROUP BY categoría. ORDER BY con CASE WHEN.

-- Tu query aquí:


-- ---------------------------------------------------------------
-- BLOQUE C (13-19): Vistas y consultas sobre vistas
-- CREATE VIEW, reutilización de lógica, encapsulación
-- para Power BI
-- ---------------------------------------------------------------

-- Ejercicio 13
-- DIFICULTAD: Intermedio
-- CONTEXTO (Briefing 7.5 — Valentina Torres):
--   El equipo de BI del fondo chileno necesita conectar Power
--   BI a la base. La vista v_funnel_adquisicion encapsula la
--   lógica del funnel para que no necesiten reescribir el JOIN.
--
-- ADVERTENCIA: En SQLite usar DROP VIEW IF EXISTS antes del
--   CREATE VIEW (CREATE OR REPLACE no está disponible en SQLite).
--
-- Enunciado: Crea la vista v_funnel_adquisicion con estas
--   columnas: session_id, customer_id, campaign_id,
--   device_type, started_at, converted, order_id,
--   order_status, order_total.
--   LEFT JOIN de website_sessions a orders por customer_id.
--   order_total calculado con subquery escalar en order_items.
--   Después de crear la vista, valida con:
--   SELECT * FROM v_funnel_adquisicion LIMIT 5;
--
-- Criterio: DROP VIEW IF EXISTS. CREATE VIEW con la lógica
--   correcta. LEFT JOIN por customer_id. Subquery escalar
--   para order_total. SELECT de validación incluida.
--   Las filas sin pedido muestran NULL en order_id, order_status,
--   order_total.

-- Tu query aquí (DROP VIEW + CREATE VIEW + SELECT de validación):


-- Ejercicio 14
-- DIFICULTAD: Básico (consulta sobre vista)
-- CONTEXTO: Con v_funnel_adquisicion creada, el equipo de
--   BI quiere saber qué campañas tienen la mayor tasa de
--   conversión (sesión → pedido, no solo → converted).
--
-- NOTA: Esta query asume que v_funnel_adquisicion ya existe
--   (creada en el Ejercicio 13 o antes en tu sesión).
--
-- Enunciado: Sobre v_funnel_adquisicion, retorna para cada
--   campaña (usando el campaign_id de la vista + JOIN a
--   marketing_campaigns para el nombre): campana, canal,
--   total_sesiones (COUNT DISTINCT session_id),
--   pedidos_generados (COUNT DISTINCT order_id) y
--   tasa_conversion_pct (pedidos/sesiones, 2 dec).
--   Solo campañas con campaign_id no nulo. Ordena por
--   tasa_conversion_pct DESC. Limita a 10 filas.
--
-- Criterio: FROM v_funnel_adquisicion. JOIN con
--   marketing_campaigns. COUNT DISTINCT en ambos conteos.
--   NULLIF en denominador. Filtro campaign_id IS NOT NULL.

-- Tu query aquí:


-- Ejercicio 15
-- DIFICULTAD: Básico (consulta sobre vista)
-- CONTEXTO: El equipo de producto quiere comparar la tasa
--   de conversión a pedido por dispositivo, usando la vista
--   para no reescribir el JOIN.
--
-- NOTA: Asume que v_funnel_adquisicion ya existe.
--
-- Enunciado: Sobre v_funnel_adquisicion, retorna por
--   device_type: dispositivo, total_sesiones, pedidos_generados,
--   tasa_conversion_pct (pedidos/sesiones, 2 dec) y
--   promedio_paginas... Espera — la vista no tiene pages_viewed.
--   Úsala junto a website_sessions para traer pages_viewed:
--   JOIN v_funnel_adquisicion con website_sessions por session_id.
--   Retorna: dispositivo, total_sesiones (DISTINCT session_id),
--   pedidos_generados (DISTINCT order_id),
--   tasa_conversion_pct y promedio_paginas_vistas (2 dec).
--   Ordena por total_sesiones DESC.
--
-- Criterio: FROM v_funnel_adquisicion JOIN website_sessions.
--   COUNT DISTINCT en session_id y order_id. AVG(pages_viewed)
--   de website_sessions. GROUP BY device_type.

-- Tu query aquí:


-- Ejercicio 16
-- DIFICULTAD: Intermedio
-- CONTEXTO (Briefing 7.6 — Valentina Torres):
--   La segunda vista del dashboard: una fila por cliente
--   con el perfil completo. Esta vista se usará en el Capstone.
--   Hazla bien — será referenciada desde otros análisis.
--
-- Enunciado: Crea la vista v_clientes_perfil con:
--   customer_id, country, registered_at,
--   total_pedidos (COUNT DISTINCT order_id),
--   revenue_total (SUM de items, COALESCE a 0),
--   primer_pedido_at (MIN ordered_at),
--   ultimo_pedido_at (MAX ordered_at),
--   total_sesiones (COUNT DISTINCT session_id),
--   sesiones_convertidas (COUNT DISTINCT de sesiones
--   donde converted = TRUE).
--   Triple LEFT JOIN: customers → orders → order_items
--   y customers → website_sessions.
--   Después: SELECT * FROM v_clientes_perfil LIMIT 10;
--
-- Criterio: DROP VIEW IF EXISTS. CREATE VIEW. Triple LEFT
--   JOIN. COUNT DISTINCT en todos los conteos. COALESCE
--   para revenue_total. GROUP BY con todas las columnas
--   no agregadas. SELECT de validación.

-- Tu query aquí (DROP VIEW + CREATE VIEW + SELECT de validación):


-- Ejercicio 17
-- DIFICULTAD: Básico (consulta sobre vista)
-- CONTEXTO: Valentina quiere los top 10 clientes por revenue
--   total para presentar al fondo como "clientes ancla" del
--   negocio.
--
-- NOTA: Asume que v_clientes_perfil ya existe.
--
-- Enunciado: Sobre v_clientes_perfil, retorna los 10 clientes
--   con mayor revenue_total: customer_id, country, total_pedidos,
--   revenue_total, total_sesiones y sesiones_convertidas.
--   Ordena por revenue_total DESC. Limita a 10.
--
-- Criterio: FROM v_clientes_perfil. ORDER BY revenue_total DESC.
--   LIMIT 10. No se necesita ningún JOIN adicional.

-- Tu query aquí:


-- Ejercicio 18
-- DIFICULTAD: Intermedio (consulta sobre vista)
-- CONTEXTO: El equipo de producto quiere identificar los
--   clientes que más exploraron el sitio (alta engagement)
--   pero nunca compraron. Son candidatos para una campaña
--   de "primer pedido con descuento".
--
-- NOTA: Asume que v_clientes_perfil ya existe.
--
-- Enunciado: Sobre v_clientes_perfil, retorna clientes con
--   total_sesiones >= 5 Y revenue_total = 0 (nunca compraron).
--   Columnas: customer_id, country, total_sesiones,
--   sesiones_convertidas y registered_at.
--   Ordena por total_sesiones DESC. Limita a 20.
--
-- Criterio: FROM v_clientes_perfil. WHERE total_sesiones >= 5
--   AND revenue_total = 0. ORDER BY. LIMIT.

-- Tu query aquí:


-- Ejercicio 19
-- DIFICULTAD: Intermedio (consulta sobre vista)
-- CONTEXTO: Marco quiere saber si el nivel de engagement
--   web varía por país — países con baja tasa de conversión
--   en sesiones pueden necesitar mejor experiencia localizada.
--
-- NOTA: Asume que v_clientes_perfil ya existe.
--
-- Enunciado: Sobre v_clientes_perfil, retorna por país:
--   country, cantidad_clientes (clientes con al menos 1
--   sesión), promedio_sesiones (AVG total_sesiones, 2 dec),
--   promedio_sesiones_convertidas (AVG sesiones_convertidas,
--   2 dec) y tasa_conversion_promedio (promedio de
--   sesiones_convertidas/total_sesiones por cliente, 2 dec).
--   Solo países con al menos 5 clientes con sesiones.
--   Ordena por promedio_sesiones DESC.
--
-- Criterio: FROM v_clientes_perfil WHERE total_sesiones > 0.
--   GROUP BY country. HAVING COUNT(*) >= 5. AVG y ROUND.
--   La tasa_conversion_promedio es AVG(sesiones_convertidas
--   * 1.0 / NULLIF(total_sesiones, 0)).

-- Tu query aquí:


-- ---------------------------------------------------------------
-- BLOQUE D (20-25): Atribución, segmentación e integrador
-- First-touch attribution, CASE WHEN por valor,
-- análisis de devoluciones por canal
-- ---------------------------------------------------------------

-- Ejercicio 20
-- DIFICULTAD: Avanzado
-- CONTEXTO (Briefing 7.8 — Marco / Valentina):
--   Marco quiere saber qué canal trajo los clientes que más
--   gastan. La atribución es por primera sesión (first-touch).
--   Valentina lo resume: "para cada campaña, el revenue total
--   de los clientes que llegaron por esa campaña."
--
-- NOTA: Solo clientes cuya primera sesión fue por campaña
--   (campaign_id no nulo). Sesiones orgánicas se manejan
--   en el Ejercicio 25.
--
-- Enunciado: Retorna por campaña y canal:
--   campana (mc.name), canal, clientes_adquiridos
--   (COUNT DISTINCT customer_id) y revenue_total_atribuido
--   (suma de pedidos entregados de esos clientes, COALESCE
--   a 0, redondeado a 2 dec). Ordena por revenue_total_atribuido
--   DESC.
--
-- Criterio: CTE primera_sesion con ROW_NUMBER() OVER
--   (PARTITION BY customer_id ORDER BY started_at ASC).
--   Filtrar WHERE rn = 1 AND campaign_id IS NOT NULL.
--   JOIN con marketing_campaigns para el canal.
--   LEFT JOIN con revenue por cliente (pedidos delivered).
--   COALESCE para revenue de clientes sin pedidos.

-- Tu query aquí:


-- Ejercicio 21
-- DIFICULTAD: Intermedio
-- CONTEXTO (Briefing 7.11 — Ana Castillo):
--   Ana necesita la segmentación de clientes para el reporte
--   al comité. Los segmentos van directamente a la presentación
--   de Marco con los fondos.
--
-- Enunciado: Clasifica a cada cliente por su revenue total
--   de pedidos con status = 'delivered':
--   revenue = 0 → 'sin compras'
--   revenue 1-100 → 'comprador ocasional'
--   revenue 101-500 → 'comprador recurrente'
--   revenue > 500 → 'cliente de alto valor'
--
--   Retorna: segmento, cantidad_clientes, revenue_del_segmento
--   (redondeado a 2 dec) y pct_revenue_total (% sobre el
--   total general, redondeado a 2 dec). Ordena de menor a
--   mayor valor (sin compras primero).
--
-- Criterio: CTE revenue_cliente con COALESCE(..., 0).
--   Solo status = 'delivered' en el JOIN de orders.
--   CTE segmentos con CASE WHEN. SUM(SUM(...)) OVER ()
--   para el porcentaje total. ORDER BY con CASE WHEN.
--   4 filas en el resultado.

-- Tu query aquí:


-- Ejercicio 22
-- DIFICULTAD: Intermedio-Avanzado
-- CONTEXTO: Ana quiere mostrar en el reporte que la empresa
--   tiene concentración de revenue en pocos clientes (similar
--   a la ley de Pareto). Necesita el % de revenue que aporta
--   cada segmento sobre el total de la empresa.
--
-- NOTA: Este ejercicio es una extensión del EJ21 usando
--   v_clientes_perfil en lugar de calcular desde cero.
--   Asume que v_clientes_perfil ya existe.
--
-- Enunciado: Sobre v_clientes_perfil, aplica la segmentación
--   (mismos umbrales que EJ21) y retorna: segmento,
--   cantidad_clientes, revenue_del_segmento y
--   pct_revenue_total. Además agrega: revenue_promedio_cliente
--   (revenue_del_segmento / cantidad_clientes, 2 dec).
--   Ordena de menor a mayor valor.
--
-- Criterio: FROM v_clientes_perfil. CASE WHEN para segmento.
--   SUM OVER () para el porcentaje o CTE con el total.
--   revenue_promedio = revenue_del_segmento / cantidad_clientes
--   con NULLIF. 4 filas.

-- Tu query aquí:


-- Ejercicio 23
-- DIFICULTAD: Avanzado
-- CONTEXTO (Briefing 7.12 — Diego Morales):
--   Diego tiene una hipótesis: clientes de paid_search
--   devuelven más (llegaron con una promesa que el producto
--   no cumplió). Para cada canal de adquisición: tasa de
--   devolución = devoluciones aprobadas / total pedidos.
--   Clientes sin sesión registrada → 'sin datos'.
--
-- Enunciado: Para cada canal de adquisición (primera sesión
--   del cliente con COALESCE(mc.channel, 'organic'), o
--   'sin datos' para clientes sin ninguna sesión), retorna:
--   canal, clientes_distintos, total_devoluciones
--   (returns con status IN ('approved', 'refunded')),
--   total_pedidos y tasa_devolucion_pct (2 dec).
--   Ordena por tasa_devolucion_pct DESC.
--
-- Criterio: CTE primera sesión con ROW_NUMBER(). CTE canal
--   para todos los clientes (LEFT JOIN desde customers para
--   incluir los sin sesión). CTE devoluciones por cliente.
--   CTE pedidos por cliente. Joins finales entre ellas.
--   COALESCE para devoluciones de clientes sin devoluciones.
--   NULLIF en denominador.

-- Tu query aquí:


-- Ejercicio 24
-- DIFICULTAD: Avanzado
-- CONTEXTO: El equipo de crecimiento quiere identificar
--   las campañas con mayor "velocidad de conversión":
--   clientes que llegaron por la campaña y completaron
--   su primer pedido en menos de 7 días.
--
-- Enunciado: Para cada campaña (solo sesiones con campaign_id
--   no nulo), retorna: campana (name), canal,
--   clientes_adquiridos (total clientes cuya primera sesión
--   fue por esa campaña), clientes_rapidos (los que hicieron
--   su primer pedido en menos de 7 días desde la primera
--   sesión) y tasa_conversion_rapida_pct (clientes_rapidos /
--   clientes_adquiridos * 100, 2 dec).
--   Ordena por tasa_conversion_rapida_pct DESC.
--
--   En SQLite: usa JULIANDAY para calcular diferencia de días.
--   JULIANDAY(fecha_primer_pedido) - JULIANDAY(primera_sesion_at)
--   < 7 para el filtro de "menos de 7 días".
--
-- Criterio: CTE primera sesión del cliente (mínimo started_at).
--   CTE primer pedido del cliente (mínimo ordered_at, no
--   cancelado). JOIN para calcular la diferencia. CASE WHEN
--   o filtro para marcar los "rápidos". GROUP BY campaña.
--   NULLIF en denominador.

-- Tu query aquí:


-- Ejercicio 25 — Integrador del Nivel 7
-- DIFICULTAD: Avanzado
-- CONTEXTO (Valentina Torres — Proyecto Nivel 7):
--   Valentina necesita el dashboard ejecutivo completo para
--   la reunión con los fondos el 18 de junio. El panel
--   central del dashboard debe mostrar, por canal de
--   adquisición (incluyendo orgánico y sin sesión):
--
--   - canal: canal de la primera sesión, 'organic' si sin
--     campaña, 'sin sesion' si sin ninguna sesión
--   - total_clientes: clientes adquiridos por ese canal
--   - revenue_total_atribuido: revenue total de sus compras
--     (pedidos delivered), COALESCE a 0, redondeado a 2 dec
--   - tasa_conversion_pct: clientes con al menos 1 pedido
--     delivered / total_clientes * 100 (2 dec)
--   - tasa_retencion_mes2_pct: clientes que compraron en
--     el mismo mes que su primer pedido Y también en el mes
--     siguiente / clientes con al menos 1 pedido (2 dec)
--
--   Ordena por revenue_total_atribuido DESC.
--
-- PISTAS:
--   La tasa de retención mes 2 requiere identificar: el mes
--   del primer pedido de cada cliente, y si ese cliente
--   tiene otro pedido en el mes siguiente. Es el patrón
--   de cohortes del Nivel 6, combinado con la atribución
--   del Nivel 7.
--   Para tasa_retencion_mes2_pct: STRFTIME('%Y-%m', ...) para
--   comparar meses en SQLite.
--
-- Criterio: Múltiples CTEs. CTE para canal de todos los
--   clientes (incluyendo sin sesión y orgánico). CTE para
--   revenue. CTE para retención mes 2 (primer pedido + mes
--   siguiente). Joins entre todas. COALESCE y NULLIF
--   defensivos. Esta es la query más compleja del nivel.

-- Tu query aquí:


-- =============================================================
-- SOLUCIONES
-- (Intenta resolver los ejercicios antes de leer esto)
-- =============================================================

/*

--- Solución 01 ---
-- Tasa de conversión campaña Día de Madres, 5-10 mayo 2026
SELECT
    mc.name                                                        AS campana,
    mc.channel                                                     AS canal,
    COUNT(*)                                                       AS total_sesiones,
    COUNT(CASE WHEN ws.converted = TRUE THEN 1 END)                AS sesiones_convertidas,
    ROUND(
        COUNT(CASE WHEN ws.converted = TRUE THEN 1 END) * 100.0
        / NULLIF(COUNT(*), 0),
        2
    )                                                              AS tasa_conversion_pct
FROM website_sessions ws
INNER JOIN marketing_campaigns mc ON mc.campaign_id = ws.campaign_id
WHERE ws.started_at >= '2026-05-05'
  AND ws.started_at <  '2026-05-11'
  AND mc.name LIKE '%Madres%'
GROUP BY mc.campaign_id, mc.name, mc.channel
ORDER BY mc.campaign_id;


--- Solución 02 ---
-- Tasa de conversión histórica por canal (solo campañas)
SELECT
    mc.channel                                                     AS canal,
    COUNT(*)                                                       AS total_sesiones,
    COUNT(CASE WHEN ws.converted = TRUE THEN 1 END)                AS sesiones_convertidas,
    ROUND(
        COUNT(CASE WHEN ws.converted = TRUE THEN 1 END) * 100.0
        / NULLIF(COUNT(*), 0),
        2
    )                                                              AS tasa_conversion_pct
FROM website_sessions ws
INNER JOIN marketing_campaigns mc ON mc.campaign_id = ws.campaign_id
GROUP BY mc.channel
ORDER BY tasa_conversion_pct DESC;


--- Solución 03 ---
-- Tasa de conversión por dispositivo + engagement
SELECT
    device_type                                                    AS dispositivo,
    COUNT(*)                                                       AS total_sesiones,
    COUNT(CASE WHEN converted = TRUE THEN 1 END)                   AS sesiones_convertidas,
    ROUND(
        COUNT(CASE WHEN converted = TRUE THEN 1 END) * 100.0
        / NULLIF(COUNT(*), 0),
        2
    )                                                              AS tasa_conversion_pct,
    ROUND(AVG(pages_viewed), 2)                                    AS promedio_paginas_vistas
FROM website_sessions
GROUP BY device_type
ORDER BY total_sesiones DESC;


--- Solución 04 ---
-- Evolución mensual de sesiones y tasa de conversión 2025
SELECT
    STRFTIME('%Y-%m', started_at)                                  AS mes,
    COUNT(*)                                                       AS total_sesiones,
    COUNT(CASE WHEN converted = TRUE THEN 1 END)                   AS sesiones_convertidas,
    ROUND(
        COUNT(CASE WHEN converted = TRUE THEN 1 END) * 100.0
        / NULLIF(COUNT(*), 0),
        2
    )                                                              AS tasa_conversion_pct
FROM website_sessions
WHERE started_at >= '2025-01-01'
  AND started_at <  '2026-01-01'
GROUP BY STRFTIME('%Y-%m', started_at)
ORDER BY mes;


--- Solución 05 ---
-- Tasa de conversión por nivel de engagement
WITH sesiones_clasificadas AS (
    SELECT
        session_id,
        converted,
        CASE
            WHEN pages_viewed = 1             THEN 'rebote'
            WHEN pages_viewed BETWEEN 2 AND 4 THEN 'exploracion baja'
            WHEN pages_viewed BETWEEN 5 AND 9 THEN 'exploracion media'
            WHEN pages_viewed >= 10           THEN 'exploracion alta'
        END AS nivel_engagement
    FROM website_sessions
)
SELECT
    nivel_engagement,
    COUNT(*)                                                       AS total_sesiones,
    COUNT(CASE WHEN converted = TRUE THEN 1 END)                   AS sesiones_convertidas,
    ROUND(
        COUNT(CASE WHEN converted = TRUE THEN 1 END) * 100.0
        / NULLIF(COUNT(*), 0),
        2
    )                                                              AS tasa_conversion_pct
FROM sesiones_clasificadas
GROUP BY nivel_engagement
ORDER BY
    CASE nivel_engagement
        WHEN 'rebote'            THEN 1
        WHEN 'exploracion baja'  THEN 2
        WHEN 'exploracion media' THEN 3
        WHEN 'exploracion alta'  THEN 4
    END;


--- Solución 06 ---
-- Top 5 campañas por sesiones con tasa de conversión
SELECT
    mc.name                                                        AS campana,
    mc.channel                                                     AS canal,
    COUNT(*)                                                       AS total_sesiones,
    COUNT(CASE WHEN ws.converted = TRUE THEN 1 END)                AS sesiones_convertidas,
    ROUND(
        COUNT(CASE WHEN ws.converted = TRUE THEN 1 END) * 100.0
        / NULLIF(COUNT(*), 0),
        2
    )                                                              AS tasa_conversion_pct
FROM website_sessions ws
INNER JOIN marketing_campaigns mc ON mc.campaign_id = ws.campaign_id
GROUP BY mc.campaign_id, mc.name, mc.channel
ORDER BY total_sesiones DESC
LIMIT 5;


--- Solución 07 ---
-- Funnel completo Q1 2026
WITH sesiones_q1 AS (
    SELECT
        ws.session_id,
        ws.customer_id,
        ws.converted
    FROM website_sessions ws
    WHERE ws.started_at >= '2026-01-01'
      AND ws.started_at <  '2026-04-01'
),
pedidos_q1 AS (
    SELECT
        o.order_id,
        o.customer_id,
        o.status
    FROM orders o
    WHERE o.ordered_at >= '2026-01-01'
      AND o.ordered_at <  '2026-04-01'
)
SELECT
    COUNT(DISTINCT s.session_id)                                        AS total_sesiones,
    COUNT(DISTINCT CASE WHEN s.converted = TRUE THEN s.session_id END)  AS sesiones_convertidas,
    COUNT(DISTINCT p.order_id)                                          AS pedidos_generados,
    COUNT(DISTINCT CASE WHEN p.status = 'delivered' THEN p.order_id END) AS pedidos_entregados,
    ROUND(
        COUNT(DISTINCT CASE WHEN s.converted = TRUE THEN s.session_id END) * 100.0
        / NULLIF(COUNT(DISTINCT s.session_id), 0),
        2
    )                                                                   AS tasa_sesion_a_conversion,
    ROUND(
        COUNT(DISTINCT p.order_id) * 100.0
        / NULLIF(
            COUNT(DISTINCT CASE WHEN s.converted = TRUE THEN s.session_id END), 0
        ),
        2
    )                                                                   AS tasa_conversion_a_pedido,
    ROUND(
        COUNT(DISTINCT CASE WHEN p.status = 'delivered' THEN p.order_id END) * 100.0
        / NULLIF(COUNT(DISTINCT p.order_id), 0),
        2
    )                                                                   AS tasa_pedido_a_entregado
FROM sesiones_q1 s
LEFT JOIN pedidos_q1 p ON p.customer_id = s.customer_id;


--- Solución 08 ---
-- Funnel por país Q1 2026 (tasa más baja primero)
WITH sesiones_q1 AS (
    SELECT
        ws.session_id,
        ws.customer_id,
        ws.converted,
        c.country
    FROM website_sessions ws
    INNER JOIN customers c ON c.customer_id = ws.customer_id
    WHERE ws.started_at >= '2026-01-01'
      AND ws.started_at <  '2026-04-01'
),
pedidos_q1 AS (
    SELECT
        o.order_id,
        o.customer_id
    FROM orders o
    WHERE o.ordered_at >= '2026-01-01'
      AND o.ordered_at <  '2026-04-01'
)
SELECT
    s.country,
    COUNT(DISTINCT s.session_id)                                   AS total_sesiones,
    COUNT(DISTINCT CASE WHEN s.converted = TRUE
                         THEN s.session_id END)                    AS sesiones_convertidas,
    COUNT(DISTINCT p.order_id)                                     AS pedidos_generados,
    ROUND(
        COUNT(DISTINCT p.order_id) * 100.0
        / NULLIF(COUNT(DISTINCT s.session_id), 0),
        2
    )                                                              AS tasa_sesion_a_pedido
FROM sesiones_q1 s
LEFT JOIN pedidos_q1 p ON p.customer_id = s.customer_id
GROUP BY s.country
HAVING COUNT(DISTINCT s.session_id) >= 10
ORDER BY tasa_sesion_a_pedido ASC;


--- Solución 09 ---
-- Funnel Chile marzo-abril 2026 (anomalía pagos)
WITH clientes_chile AS (
    SELECT customer_id
    FROM customers
    WHERE country = 'Chile'
),
sesiones_chile AS (
    SELECT ws.session_id, ws.customer_id, ws.converted
    FROM website_sessions ws
    INNER JOIN clientes_chile cc ON cc.customer_id = ws.customer_id
    WHERE ws.started_at >= '2026-03-01'
      AND ws.started_at <  '2026-05-01'
),
pedidos_chile AS (
    SELECT o.order_id, o.customer_id, o.status
    FROM orders o
    INNER JOIN clientes_chile cc ON cc.customer_id = o.customer_id
    WHERE o.ordered_at >= '2026-03-01'
      AND o.ordered_at <  '2026-05-01'
)
SELECT
    COUNT(DISTINCT sc.session_id)                                        AS total_sesiones,
    COUNT(DISTINCT CASE WHEN sc.converted = TRUE THEN sc.session_id END) AS sesiones_convertidas,
    COUNT(DISTINCT pc.order_id)                                          AS pedidos_creados,
    COUNT(DISTINCT CASE WHEN pc.status = 'delivered' THEN pc.order_id END) AS pedidos_entregados,
    COUNT(DISTINCT CASE WHEN pc.status = 'cancelled' THEN pc.order_id END) AS pedidos_cancelados,
    COUNT(DISTINCT CASE WHEN sc.converted = TRUE THEN sc.session_id END)
    - COUNT(DISTINCT CASE WHEN pc.status = 'delivered' THEN pc.order_id END)
                                                                         AS brecha_conversion_a_entrega
FROM sesiones_chile sc
LEFT JOIN pedidos_chile pc ON pc.customer_id = sc.customer_id;


--- Solución 10 ---
-- Sesiones previas al primer pedido
WITH primer_pedido AS (
    SELECT
        customer_id,
        MIN(ordered_at)  AS fecha_primer_pedido
    FROM orders
    WHERE status != 'cancelled'
    GROUP BY customer_id
),
sesiones_previas AS (
    SELECT
        pp.customer_id,
        COUNT(ws.session_id)  AS sesiones_antes_de_comprar
    FROM primer_pedido pp
    INNER JOIN website_sessions ws
        ON  ws.customer_id = pp.customer_id
        AND ws.started_at  < pp.fecha_primer_pedido
    GROUP BY pp.customer_id
)
SELECT
    ROUND(AVG(sesiones_antes_de_comprar), 2)   AS promedio_sesiones_previas,
    MIN(sesiones_antes_de_comprar)             AS minimo,
    MAX(sesiones_antes_de_comprar)             AS maximo,
    COUNT(*)                                   AS clientes_con_sesiones_previas
FROM sesiones_previas;


--- Solución 11 ---
-- Clientes con sesiones pero sin ningún pedido
SELECT
    c.customer_id,
    c.first_name || ' ' || c.last_name     AS nombre_completo,
    c.country,
    COUNT(ws.session_id)                   AS total_sesiones,
    MIN(ws.started_at)                     AS primera_sesion
FROM website_sessions ws
INNER JOIN customers c ON c.customer_id = ws.customer_id
LEFT JOIN orders o ON o.customer_id = ws.customer_id
WHERE o.order_id IS NULL
GROUP BY c.customer_id, c.first_name, c.last_name, c.country
ORDER BY total_sesiones DESC
LIMIT 20;


--- Solución 12 ---
-- Revenue por cantidad de touchpoints
WITH sesiones_por_cliente AS (
    SELECT
        customer_id,
        COUNT(session_id)  AS total_sesiones
    FROM website_sessions
    GROUP BY customer_id
),
revenue_por_cliente AS (
    SELECT
        o.customer_id,
        SUM(oi.quantity * oi.unit_price)  AS revenue
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status = 'delivered'
    GROUP BY o.customer_id
),
clientes_con_datos AS (
    SELECT
        spc.customer_id,
        spc.total_sesiones,
        COALESCE(rpc.revenue, 0)  AS revenue,
        CASE
            WHEN spc.total_sesiones < 5   THEN 'pocos touchpoints'
            WHEN spc.total_sesiones <= 10 THEN 'touchpoints medios'
            ELSE                               'muchos touchpoints'
        END AS categoria_sesiones
    FROM sesiones_por_cliente spc
    LEFT JOIN revenue_por_cliente rpc ON rpc.customer_id = spc.customer_id
)
SELECT
    categoria_sesiones,
    COUNT(*)                                           AS cantidad_clientes,
    ROUND(SUM(revenue), 2)                             AS revenue_total,
    ROUND(SUM(revenue) / NULLIF(COUNT(*), 0), 2)       AS revenue_promedio_por_cliente
FROM clientes_con_datos
GROUP BY categoria_sesiones
ORDER BY
    CASE categoria_sesiones
        WHEN 'pocos touchpoints'   THEN 1
        WHEN 'touchpoints medios'  THEN 2
        WHEN 'muchos touchpoints'  THEN 3
    END;


--- Solución 13 ---
-- Crear v_funnel_adquisicion
DROP VIEW IF EXISTS v_funnel_adquisicion;
CREATE VIEW v_funnel_adquisicion AS
SELECT
    ws.session_id,
    ws.customer_id,
    ws.campaign_id,
    ws.device_type,
    ws.started_at,
    ws.converted,
    o.order_id,
    o.status          AS order_status,
    (
        SELECT SUM(oi.quantity * oi.unit_price)
        FROM order_items oi
        WHERE oi.order_id = o.order_id
    )                 AS order_total
FROM website_sessions ws
LEFT JOIN orders o ON o.customer_id = ws.customer_id;

SELECT * FROM v_funnel_adquisicion LIMIT 5;


--- Solución 14 ---
-- Campañas con mayor tasa de conversión sobre v_funnel_adquisicion
SELECT
    mc.name                                                        AS campana,
    mc.channel                                                     AS canal,
    COUNT(DISTINCT vf.session_id)                                  AS total_sesiones,
    COUNT(DISTINCT vf.order_id)                                    AS pedidos_generados,
    ROUND(
        COUNT(DISTINCT vf.order_id) * 100.0
        / NULLIF(COUNT(DISTINCT vf.session_id), 0),
        2
    )                                                              AS tasa_conversion_pct
FROM v_funnel_adquisicion vf
INNER JOIN marketing_campaigns mc ON mc.campaign_id = vf.campaign_id
WHERE vf.campaign_id IS NOT NULL
GROUP BY mc.campaign_id, mc.name, mc.channel
ORDER BY tasa_conversion_pct DESC
LIMIT 10;


--- Solución 15 ---
-- Análisis por device_type sobre v_funnel_adquisicion + pages_viewed
SELECT
    vf.device_type                                                 AS dispositivo,
    COUNT(DISTINCT vf.session_id)                                  AS total_sesiones,
    COUNT(DISTINCT vf.order_id)                                    AS pedidos_generados,
    ROUND(
        COUNT(DISTINCT vf.order_id) * 100.0
        / NULLIF(COUNT(DISTINCT vf.session_id), 0),
        2
    )                                                              AS tasa_conversion_pct,
    ROUND(AVG(ws.pages_viewed), 2)                                 AS promedio_paginas_vistas
FROM v_funnel_adquisicion vf
INNER JOIN website_sessions ws ON ws.session_id = vf.session_id
GROUP BY vf.device_type
ORDER BY total_sesiones DESC;


--- Solución 16 ---
-- Crear v_clientes_perfil
-- CTEs pre-agregadas para evitar el problema N×M:
-- un JOIN directo customers → orders → order_items → website_sessions
-- produce N×M filas (N ítems × M sesiones), inflando el SUM(revenue).
-- La solución es agregar revenue y sesiones por separado antes de unirlos.
DROP VIEW IF EXISTS v_clientes_perfil;
CREATE VIEW v_clientes_perfil AS
WITH revenue_por_cliente AS (
    SELECT
        o.customer_id,
        COUNT(DISTINCT o.order_id)                    AS total_pedidos,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS revenue_total,
        MIN(o.ordered_at)                             AS primer_pedido_at,
        MAX(o.ordered_at)                             AS ultimo_pedido_at
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.order_id
    GROUP BY o.customer_id
),
sesiones_por_cliente AS (
    SELECT
        ws.customer_id,
        COUNT(DISTINCT ws.session_id)                                        AS total_sesiones,
        COUNT(DISTINCT CASE WHEN ws.converted = TRUE THEN ws.session_id END) AS sesiones_convertidas
    FROM website_sessions ws
    GROUP BY ws.customer_id
)
SELECT
    c.customer_id,
    c.country,
    c.registered_at,
    COALESCE(rpc.total_pedidos, 0)        AS total_pedidos,
    COALESCE(rpc.revenue_total, 0)        AS revenue_total,
    rpc.primer_pedido_at,
    rpc.ultimo_pedido_at,
    COALESCE(spc.total_sesiones, 0)       AS total_sesiones,
    COALESCE(spc.sesiones_convertidas, 0) AS sesiones_convertidas
FROM customers c
LEFT JOIN revenue_por_cliente rpc  ON rpc.customer_id = c.customer_id
LEFT JOIN sesiones_por_cliente spc ON spc.customer_id = c.customer_id;

SELECT * FROM v_clientes_perfil LIMIT 10;


--- Solución 17 ---
-- Top 10 clientes por revenue
SELECT
    customer_id,
    country,
    total_pedidos,
    revenue_total,
    total_sesiones,
    sesiones_convertidas
FROM v_clientes_perfil
ORDER BY revenue_total DESC
LIMIT 10;


--- Solución 18 ---
-- Clientes con alta sesiones pero revenue = 0 (alto engagement, no compra)
SELECT
    customer_id,
    country,
    total_sesiones,
    sesiones_convertidas,
    registered_at
FROM v_clientes_perfil
WHERE total_sesiones >= 5
  AND revenue_total = 0
ORDER BY total_sesiones DESC
LIMIT 20;


--- Solución 19 ---
-- Países con mayor promedio de sesiones por cliente
SELECT
    country,
    COUNT(*)                                                       AS cantidad_clientes,
    ROUND(AVG(total_sesiones), 2)                                  AS promedio_sesiones,
    ROUND(AVG(sesiones_convertidas), 2)                            AS promedio_sesiones_convertidas,
    ROUND(
        AVG(
            sesiones_convertidas * 1.0
            / NULLIF(total_sesiones, 0)
        ) * 100.0,
        2
    )                                                              AS tasa_conversion_promedio
FROM v_clientes_perfil
WHERE total_sesiones > 0
GROUP BY country
HAVING COUNT(*) >= 5
ORDER BY promedio_sesiones DESC;


--- Solución 20 ---
-- MODELO: first PAID-touch attribution
-- El filtro WHERE ws.campaign_id IS NOT NULL excluye sesiones orgánicas antes de calcular ROW_NUMBER.
-- Esto asigna el crédito a la primera sesión pagada (con campaña), no a la primera sesión total.
-- Contrasta con el first-touch attribution de la Lección 4, que incluye todas las sesiones.
-- Consecuencia: si un cliente llegó primero de forma orgánica y luego por campaña,
-- este modelo atribuye la conversión a la campaña, no a la visita orgánica original.
WITH primera_sesion AS (
    SELECT
        ws.customer_id,
        ws.campaign_id,
        ROW_NUMBER() OVER (
            PARTITION BY ws.customer_id
            ORDER BY ws.started_at ASC
        ) AS rn
    FROM website_sessions ws
    WHERE ws.campaign_id IS NOT NULL
),
canal_origen AS (
    SELECT
        ps.customer_id,
        mc.campaign_id,
        mc.name    AS campana,
        mc.channel AS canal
    FROM primera_sesion ps
    INNER JOIN marketing_campaigns mc ON mc.campaign_id = ps.campaign_id
    WHERE ps.rn = 1
),
revenue_por_cliente AS (
    SELECT
        o.customer_id,
        SUM(oi.quantity * oi.unit_price)  AS revenue
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status = 'delivered'
    GROUP BY o.customer_id
)
SELECT
    co.campana,
    co.canal,
    COUNT(DISTINCT co.customer_id)               AS clientes_adquiridos,
    ROUND(COALESCE(SUM(rc.revenue), 0), 2)        AS revenue_total_atribuido
FROM canal_origen co
LEFT JOIN revenue_por_cliente rc ON rc.customer_id = co.customer_id
GROUP BY co.campaign_id, co.campana, co.canal
ORDER BY revenue_total_atribuido DESC;


--- Solución 21 ---
-- Segmentación de clientes por valor (desde tablas base)
WITH revenue_cliente AS (
    SELECT
        c.customer_id,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0)  AS revenue_total
    FROM customers c
    LEFT JOIN orders o       ON o.customer_id = c.customer_id
                             AND o.status = 'delivered'
    LEFT JOIN order_items oi ON oi.order_id = o.order_id
    GROUP BY c.customer_id
),
segmentos AS (
    SELECT
        customer_id,
        revenue_total,
        CASE
            WHEN revenue_total = 0                  THEN 'sin compras'
            WHEN revenue_total BETWEEN 1 AND 100    THEN 'comprador ocasional'
            WHEN revenue_total BETWEEN 101 AND 500  THEN 'comprador recurrente'
            WHEN revenue_total > 500                THEN 'cliente de alto valor'
        END AS segmento
    FROM revenue_cliente
)
SELECT
    segmento,
    COUNT(*)                                                AS cantidad_clientes,
    ROUND(SUM(revenue_total), 2)                            AS revenue_del_segmento,
    ROUND(
        SUM(revenue_total) * 100.0
        / NULLIF(SUM(SUM(revenue_total)) OVER (), 0),
        2
    )                                                       AS pct_revenue_total
FROM segmentos
GROUP BY segmento
ORDER BY
    CASE segmento
        WHEN 'sin compras'           THEN 1
        WHEN 'comprador ocasional'   THEN 2
        WHEN 'comprador recurrente'  THEN 3
        WHEN 'cliente de alto valor' THEN 4
    END;


--- Solución 22 ---
-- Segmentación desde v_clientes_perfil con revenue promedio
WITH segmentos AS (
    SELECT
        customer_id,
        revenue_total,
        CASE
            WHEN revenue_total = 0                  THEN 'sin compras'
            WHEN revenue_total BETWEEN 1 AND 100    THEN 'comprador ocasional'
            WHEN revenue_total BETWEEN 101 AND 500  THEN 'comprador recurrente'
            WHEN revenue_total > 500                THEN 'cliente de alto valor'
        END AS segmento
    FROM v_clientes_perfil
)
SELECT
    segmento,
    COUNT(*)                                                AS cantidad_clientes,
    ROUND(SUM(revenue_total), 2)                            AS revenue_del_segmento,
    ROUND(
        SUM(revenue_total) * 100.0
        / NULLIF(SUM(SUM(revenue_total)) OVER (), 0),
        2
    )                                                       AS pct_revenue_total,
    ROUND(
        SUM(revenue_total) / NULLIF(COUNT(*), 0),
        2
    )                                                       AS revenue_promedio_cliente
FROM segmentos
GROUP BY segmento
ORDER BY
    CASE segmento
        WHEN 'sin compras'           THEN 1
        WHEN 'comprador ocasional'   THEN 2
        WHEN 'comprador recurrente'  THEN 3
        WHEN 'cliente de alto valor' THEN 4
    END;


--- Solución 23 ---
-- Tasa de devolución por canal de adquisición
WITH primera_sesion AS (
    SELECT
        ws.customer_id,
        ws.campaign_id,
        ROW_NUMBER() OVER (
            PARTITION BY ws.customer_id
            ORDER BY ws.started_at ASC
        ) AS rn
    FROM website_sessions ws
),
canal_primera_sesion AS (
    SELECT
        ps.customer_id,
        COALESCE(mc.channel, 'organic')  AS canal
    FROM primera_sesion ps
    LEFT JOIN marketing_campaigns mc ON mc.campaign_id = ps.campaign_id
    WHERE ps.rn = 1
),
canal_todos_clientes AS (
    SELECT
        c.customer_id,
        COALESCE(cps.canal, 'sin datos')  AS canal
    FROM customers c
    LEFT JOIN canal_primera_sesion cps ON cps.customer_id = c.customer_id
),
devoluciones_por_cliente AS (
    SELECT
        o.customer_id,
        COUNT(DISTINCT r.return_id)  AS total_devoluciones
    FROM orders o
    INNER JOIN returns r ON r.order_id = o.order_id
    WHERE r.status IN ('approved', 'refunded')
    GROUP BY o.customer_id
),
pedidos_por_cliente AS (
    SELECT
        customer_id,
        COUNT(DISTINCT order_id)  AS total_pedidos
    FROM orders
    GROUP BY customer_id
)
SELECT
    ctc.canal,
    COUNT(DISTINCT ctc.customer_id)                                AS clientes_distintos,
    COALESCE(SUM(dpc.total_devoluciones), 0)                       AS total_devoluciones,
    COALESCE(SUM(ppc.total_pedidos), 0)                            AS total_pedidos,
    ROUND(
        COALESCE(SUM(dpc.total_devoluciones), 0) * 100.0
        / NULLIF(COALESCE(SUM(ppc.total_pedidos), 0), 0),
        2
    )                                                              AS tasa_devolucion_pct
FROM canal_todos_clientes ctc
LEFT JOIN devoluciones_por_cliente dpc ON dpc.customer_id = ctc.customer_id
LEFT JOIN pedidos_por_cliente ppc      ON ppc.customer_id = ctc.customer_id
GROUP BY ctc.canal
ORDER BY tasa_devolucion_pct DESC;


--- Solución 24 ---
-- Velocidad de conversión por campaña (primer pedido en < 7 días)
WITH primera_sesion_cliente AS (
    SELECT
        ws.customer_id,
        ws.campaign_id,
        MIN(ws.started_at)  AS primera_sesion_at
    FROM website_sessions ws
    WHERE ws.campaign_id IS NOT NULL
    GROUP BY ws.customer_id, ws.campaign_id
    -- Nota: si un cliente tiene múltiples campañas, esto toma la primera sesión
    -- por cada combinación. Para first-touch correcto, filtrar con ROW_NUMBER.
),
primera_sesion_ft AS (
    SELECT
        customer_id,
        campaign_id,
        primera_sesion_at,
        ROW_NUMBER() OVER (
            PARTITION BY customer_id
            ORDER BY primera_sesion_at ASC
        ) AS rn
    FROM primera_sesion_cliente
),
primer_pedido_cliente AS (
    SELECT
        customer_id,
        MIN(ordered_at)  AS fecha_primer_pedido
    FROM orders
    WHERE status != 'cancelled'
    GROUP BY customer_id
),
clientes_con_velocidad AS (
    SELECT
        ps.customer_id,
        ps.campaign_id,
        ps.primera_sesion_at,
        pp.fecha_primer_pedido,
        JULIANDAY(pp.fecha_primer_pedido) - JULIANDAY(ps.primera_sesion_at)  AS dias_hasta_pedido
    FROM primera_sesion_ft ps
    LEFT JOIN primer_pedido_cliente pp ON pp.customer_id = ps.customer_id
    WHERE ps.rn = 1
)
SELECT
    mc.name                                                          AS campana,
    mc.channel                                                       AS canal,
    COUNT(DISTINCT cv.customer_id)                                   AS clientes_adquiridos,
    COUNT(DISTINCT CASE WHEN cv.dias_hasta_pedido IS NOT NULL
                          AND cv.dias_hasta_pedido < 7
                         THEN cv.customer_id END)                    AS clientes_rapidos,
    ROUND(
        COUNT(DISTINCT CASE WHEN cv.dias_hasta_pedido IS NOT NULL
                              AND cv.dias_hasta_pedido < 7
                             THEN cv.customer_id END) * 100.0
        / NULLIF(COUNT(DISTINCT cv.customer_id), 0),
        2
    )                                                                AS tasa_conversion_rapida_pct
FROM clientes_con_velocidad cv
INNER JOIN marketing_campaigns mc ON mc.campaign_id = cv.campaign_id
GROUP BY mc.campaign_id, mc.name, mc.channel
ORDER BY tasa_conversion_rapida_pct DESC;


--- Solución 25 ---
-- Dashboard ejecutivo: canal, clientes, revenue, tasa_conversion, tasa_retencion_mes2
WITH primera_sesion AS (
    SELECT
        ws.customer_id,
        ws.campaign_id,
        ws.started_at,
        ROW_NUMBER() OVER (
            PARTITION BY ws.customer_id
            ORDER BY ws.started_at ASC
        ) AS rn
    FROM website_sessions ws
),
canal_primera_sesion AS (
    SELECT
        ps.customer_id,
        COALESCE(mc.channel, 'organic')  AS canal
    FROM primera_sesion ps
    LEFT JOIN marketing_campaigns mc ON mc.campaign_id = ps.campaign_id
    WHERE ps.rn = 1
),
-- Todos los clientes: los que tienen sesión y los que no
canal_todos AS (
    SELECT
        c.customer_id,
        COALESCE(cps.canal, 'sin sesion')  AS canal
    FROM customers c
    LEFT JOIN canal_primera_sesion cps ON cps.customer_id = c.customer_id
),
-- Revenue por cliente (solo delivered)
revenue_cliente AS (
    SELECT
        o.customer_id,
        SUM(oi.quantity * oi.unit_price)  AS revenue
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status = 'delivered'
    GROUP BY o.customer_id
),
-- Primer pedido por cliente
primer_pedido AS (
    SELECT
        customer_id,
        MIN(ordered_at)  AS fecha_primer_pedido,
        STRFTIME('%Y-%m', MIN(ordered_at))  AS mes_primer_pedido
    FROM orders
    WHERE status != 'cancelled'
    GROUP BY customer_id
),
-- Retención mes 2: clientes que compraron en el mes siguiente al primer pedido
retencion_mes2 AS (
    SELECT
        pp.customer_id,
        1  AS retuvo_mes2
    FROM primer_pedido pp
    INNER JOIN orders o2
        ON  o2.customer_id = pp.customer_id
        AND o2.status      != 'cancelled'
        AND STRFTIME('%Y-%m', o2.ordered_at) >  pp.mes_primer_pedido
        AND STRFTIME('%Y-%m', o2.ordered_at) <= STRFTIME('%Y-%m',
              DATE(pp.fecha_primer_pedido, '+1 month'))
    GROUP BY pp.customer_id
)
SELECT
    ct.canal,
    COUNT(DISTINCT ct.customer_id)                                   AS total_clientes,
    ROUND(COALESCE(SUM(rc.revenue), 0), 2)                           AS revenue_total_atribuido,
    -- Tasa de conversión: clientes con al menos 1 pedido / total
    ROUND(
        COUNT(DISTINCT CASE WHEN pp.customer_id IS NOT NULL
                             THEN ct.customer_id END) * 100.0
        / NULLIF(COUNT(DISTINCT ct.customer_id), 0),
        2
    )                                                                AS tasa_conversion_pct,
    -- Tasa de retención mes 2: clientes que compraron el mes siguiente / clientes con pedido
    ROUND(
        COUNT(DISTINCT CASE WHEN rm.retuvo_mes2 = 1
                             THEN ct.customer_id END) * 100.0
        / NULLIF(
            COUNT(DISTINCT CASE WHEN pp.customer_id IS NOT NULL
                                 THEN ct.customer_id END), 0
        ),
        2
    )                                                                AS tasa_retencion_mes2_pct
FROM canal_todos ct
LEFT JOIN revenue_cliente rc  ON rc.customer_id  = ct.customer_id
LEFT JOIN primer_pedido pp    ON pp.customer_id  = ct.customer_id
LEFT JOIN retencion_mes2 rm   ON rm.customer_id  = ct.customer_id
GROUP BY ct.canal
ORDER BY revenue_total_atribuido DESC;

*/
