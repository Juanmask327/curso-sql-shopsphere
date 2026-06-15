# Correcciones pendientes para sql-teacher
**Ultima actualizacion:** 2026-06-03 (rev. 8 — cierre de CRIT-N6-01/02/03, CRIT-06, IMP-N6-01/02/03, SUG-N6-03; Nivel 6 aprobado)
**Generado por:** sql-data-analyst (Modo QA) + consolidacion automatica
**Fuentes consolidadas:** informe-diagnostico.md, informe-niveles-1-2.md, informe-seed-validacion-final.md, informe-nivel-03.md, informe-nivel-04.md, informe-nivel-05.md, informe-nivel-06.md, informe-nivel-07.md, informe-nivel-08.md, informe-capstone.md

---

## RESUMEN DE ESTADO

| Componente | Veredicto QA | Correcciones criticas pendientes |
|---|---|---|
| Evaluacion Diagnostica v1.0 | APROBADO CON OBSERVACIONES | 0 criticas |
| Nivel 1 — Exploracion de Datos | APROBADO CON OBSERVACIONES | 0 criticas |
| Nivel 2 — Metricas de Negocio | APROBADO CON OBSERVACIONES | 0 criticas |
| Seed (base + transaccional + operacional) | APROBADO | 0 criticas |
| Nivel 3 — JOINs y Relaciones | APROBADO CON OBSERVACIONES | 0 criticas |
| Nivel 4 — Returns y Analisis Avanzado | APROBADO CON OBSERVACIONES | 0 criticas |
| Nivel 5 — CTEs y Window Functions | APROBADO | 0 criticas |
| Nivel 6 — Analitica de Negocio | APROBADO | 0 criticas — todas las correcciones aplicadas 2026-06-03 |
| Nivel 7 — SQL para Business Intelligence | APROBADO CON OBSERVACIONES | 0 criticas |
| Nivel 8 — SQL Profesional | APROBADO | 0 criticas, 0 importantes |
| Capstone | APROBADO | 0 criticas, 0 importantes — partes 01-05 completas |

---

## Correcciones criticas PENDIENTES — Aplicar antes de publicar

*(Sin correcciones criticas pendientes — todas las del Nivel 6 aplicadas en sesion 2026-06-03)*

---

## Correcciones importantes PENDIENTES — Nivel 6

*(Sin correcciones importantes pendientes — todas aplicadas en sesion 2026-06-03)*

---

## Correcciones importantes PENDIENTES — Nivel 8

*(Sin correcciones pendientes — todas aplicadas en sesion 2026-06-03)*

---

## Correcciones importantes PENDIENTES — Capstone

*(Sin correcciones pendientes — todas aplicadas en sesion 2026-06-03)*

---

## Contenido estructural pendiente — Capstone

*(Completado en sesion 2026-06-03 — ver DONE-29 en seccion de correcciones aplicadas)*

Las cinco partes existen:
- parte-01-exploracion.sql — EJ01 a EJ06
- parte-02-clientes.sql — EJ07 a EJ12 (RFM, cohortes, LTV, churn)
- parte-03-marketing.sql — EJ13 a EJ17 (ROI, funnel, anomalia Chile)
- parte-04-operaciones.sql — EJ18 a EJ21 (stock, calidad de datos)
- parte-05-dashboard-ejecutivo.sql — EJ22 a EJ25 (vistas, insights, entregable final)

---

## Sugerencias opcionales

### [SUG-01] APLICADA — Nivel 1 Leccion 1 — nota ORDER BY agregada

### [SUG-N6-01] Nivel 6 Leccion 1 — JOIN de campanas sin nota sobre modelo de atribucion
**Archivo:** `modulos/nivel-06-analitica/leccion-01.md`
**Sugerencia:** El ejemplo de JOIN entre `website_sessions` y `marketing_campaigns` no menciona la limitacion del modelo de atribucion directa (session.campaign_id asigna todo el credito a una campana, ignorando el funnel multicanal). Agregar nota breve: "Este modelo asume atribucion de ultimo toque — la campana que trajo la sesion recibe todo el credito. En el Nivel 7 aprenderemos modelos de atribucion mas sofisticados."

### [SUG-N6-02] Nivel 6 todas las lecciones — sin nota de dialecto para funciones PostgreSQL-especificas
**Archivos:** Lecciones 1-4 del Nivel 6
**Sugerencia:** `DATE_TRUNC`, `EXTRACT`, `INTERVAL`, `PERCENTILE_CONT` son funciones de PostgreSQL no disponibles en SQLite (el motor del Playground). Agregar una nota contextual al inicio de cada leccion que use estas funciones: "Estas funciones son de PostgreSQL. En el Playground (SQLite) usa los equivalentes: `strftime('%Y-%m-01', fecha)` en lugar de `DATE_TRUNC`, etc."

### [SUG-N6-03] Nivel 6 Ejercicios — Solucion 19: CTE huerfana
**Archivo:** `modulos/nivel-06-analitica/ejercicios-nivel-06.sql`
**Sugerencia:** La CTE `clientes_cohorte_por_canal` esta definida en la Solucion 19 pero nunca es referenciada en el cuerpo principal de la query. Eliminarla o documentar su proposito. Una CTE sin uso genera confusión y un warning en algunos motores.

### [SUG-02] Nivel 1 Leccion 4 — Query de extraccion de dominio de email sin comentario
**Archivo:** `modulos/nivel-01-exploracion/leccion-04.md`
**Sugerencia:** Agregar comentario explicativo a `RIGHT(email, LENGTH(email) - POSITION('@' IN email))`.

### [SUG-03] Nivel 1 Leccion 4 — Nota sobre || y NULL ambigua
**Archivo:** `modulos/nivel-01-exploracion/leccion-04.md`
**Sugerencia:** Reformular la frase sobre `||` y NULL para mayor claridad.

### [SUG-04] Evaluacion Diagnostica — Formato de puntuacion P5 inconsistente
**Archivo:** `evaluaciones/diagnostico.md`
**Sugerencia:** Consolidar las tres etiquetas distintas del criterio de P5 en un formato unico.

### [SUG-05] Nivel 1 Ejercicios — EJ03: nota sobre DISTINCT y constraint UNIQUE
**Archivo:** `modulos/nivel-01-exploracion/ejercicios-nivel-01.sql`
**Sugerencia:** Agregar nota sobre por que DISTINCT no cambia el conteo en `email` (tiene constraint UNIQUE).

---

## Aprobado — Sin correcciones pendientes

- Nivel 1 Leccion 2 (IS NULL / IS NOT NULL): tecnicamente solida y pedagogicamente clara.
- Nivel 1 ejercicios completos (20 ejercicios): usan exclusivamente columnas del schema canonico.
- Nivel 2 ejercicios (25 ejercicios): usan `ordered_at` consistentemente.
- Nivel 2 Leccion 2: ORDER DE EVALUACION SQL correcto (7 etapas). Distincion WHERE vs HAVING correctamente repetida.
- Nivel 2 Leccion 4: advertencia sobre division entera con `100.0` bien ubicada.
- Nivel 5 completo: 0 criticos, 0 importantes (IMP-14 e IMP-15 resueltos).
- Nivel 7 Lecciones 1-2: solidas tecnicamente. Window frames correctamente documentados.
- Nivel 7 Vista `v_clientes_perfil`: bug de multiplicacion silenciosa corregido con CTEs separadas.
- Nivel 8: NULLIF en todos los denominadores sin excepcion (primera vez que se cumple al 100%). Sintaxis SQLite correcta en las cuatro lecciones.
- Nivel 8 Checklist de produccion (Leccion 4): mejor recurso de referencia del curso.
- Nivel 6 Correccion CRIT-06 en lecciones/ejercicios: proxy con `orders.status = 'cancelled'` bien elegido, notas pedagogicas claras.
- Nivel 6 patron LAST_VALUE con marco explicito: correctamente implementado en toda la Leccion 2.

---

## Correcciones ya aplicadas (verificadas en sesion 2026-06-02)

### [DONE-05] Correcciones CRIT-01 a CRIT-04 (Diagnostico + Nivel 2)
**Aplicado en:** 2026-06-01 (sesion anterior, verificado 2026-06-02)
**Descripcion:** CRIT-01 (P15 con columna inexistente), IMP-03 (nota P15), IMP-04 (header Bloque E) ya estaban aplicados. CRIT-03 (order_items en N2-L1) y CRIT-04 (alias en HAVING) ya estaban corregidos.

### [DONE-06] IMP-05 — Diagnostico P20 refactorizado con doble CTE
**Aplicado en:** 2026-06-02
**Descripcion:** Respuesta modelo de P20 refactorizada. `LAG(pedidos_mes)` ahora se calcula una sola vez en CTE `con_anterior`.

### [DONE-07] IMP-01 — Nivel 1 Leccion 3: logica OFFSET corregida
**Aplicado en:** 2026-06-02
**Descripcion:** Reestructurada la logica del Error 4 de OFFSET. "INCORRECTO" etiqueta a `OFFSET 2`, "CORRECTO" etiqueta a `OFFSET 10`.

### [DONE-08] IMP-02 — Nivel 2 Leccion 2: window function como Adelanto
**Aplicado en:** 2026-06-02
**Descripcion:** Version simple sin window function es ahora el codigo principal. La window function aparece como "Adelanto (Nivel 5)" fuera del bloque SQL.

### [DONE-09] IMP-07 — EJ01 Nivel 2: criterio actualizado a 31.345
**Aplicado en:** 2026-06-02

### [DONE-10] IMP-09 — Nivel 3 Leccion 1: Variante 2 ya no usa `returns`
**Aplicado en:** 2026-06-02
**Descripcion:** Reemplazada la referencia a `returns` (Nivel 4) por ejemplo con `order_items + orders + customers`. Mencion a `returns` queda como "Adelanto del Nivel 4" en nota italica.

### [DONE-11] IMP-10 — Nivel 3 EJ12: descripcion LEFT JOIN corregida
**Aplicado en:** 2026-06-02
**Descripcion:** Criterio reescrito: "`order_items` a la izquierda, `orders` a la derecha. La tabla izquierda es la que queremos auditar."

### [DONE-12] IMP-11 — Nivel 3 EJ10: patron de fecha documentado
**Aplicado en:** 2026-06-02
**Descripcion:** Enunciado actualizado con el patron `>= '2026-05-05' AND < '2026-05-11'` y explicacion del dia completo.

### [DONE-13] CRIT-05 — Seed: productos inactivos presentes; expected-results EJ06 actualizado
**Aplicado en:** Seed 2026-06-01; expected-results-nivel-01.json actualizado 2026-06-02
**Descripcion:** `UPDATE products SET is_active = FALSE WHERE product_id IN (37, 47, 51, 75)` ya estaba en el seed. `expected_row_count_approx` del EJ06 actualizado de 0 a 4.

### [DONE-14] CRIT-07 — Nivel 4 Leccion 2: columna `orders.country` eliminada
**Aplicado en:** 2026-06-02
**Descripcion:** Errores 1 y 4 de la Seccion 6 corregidos. Las queries de ejemplo ya no referencian `orders.country` (columna inexistente). Reemplazadas por filtros con `ordered_at`.

### [DONE-15] CRIT-08, CRIT-09 — Nivel 4 L3 y EJ22: SUM con CASE WHEN corregido
**Aplicado en:** 2026-06-01 (sesion anterior, verificado 2026-06-02)
**Descripcion:** Ambos archivos ya usaban `SUM(CASE WHEN r.return_id IS NOT NULL THEN oi.quantity * oi.unit_price ELSE 0 END)`.

### [DONE-16] IMP-12, IMP-13 — Nivel 4 L3 y EJ10 ya corregidos
**Aplicado en:** 2026-06-01 (verificado 2026-06-02)

### [DONE-17] IMP-14, IMP-15 — Nivel 5 EJ03 y EJ21 ya corregidos
**Aplicado en:** 2026-06-01 (verificado 2026-06-02)

### [DONE-18] CRIT-N7-01 — Vista v_clientes_perfil: codigo corregido; documentacion mejorada
**Aplicado en:** Codigo 2026-06-01; documentacion pedagogica mejorada 2026-06-02
**Descripcion:** La vista usa CTEs separadas para revenue y sesiones. Leccion 3 ahora incluye explicacion completa del mecanismo de multiplicacion silenciosa con ejemplo N*M.

### [DONE-19] IMP-N7-01 — Nivel 7 L3: orden CREATE OR REPLACE VIEW ya era correcto
**Aplicado en:** 2026-06-01 (verificado 2026-06-02)

### [DONE-20] IMP-N7-02 — Nivel 7 EJ20 y L4: first paid-touch documentado
**Aplicado en:** 2026-06-02
**Descripcion:** Solucion 20 tiene bloque de comentario completo. Leccion 4 tiene nota sobre la variante first paid-touch.

### [DONE-21] SUG-01 — Nivel 1 Leccion 1: nota ORDER BY agregada
**Aplicado en:** 2026-06-02

### [DONE-01 a DONE-04] (sesion anterior)
**Aplicado en:** 2026-06-01
- DONE-01: Schema del seed sincronizado con schema canonico
- DONE-02: Valores CHECK del seed corregidos
- DONE-03: Columnas faltantes en seed agregadas
- DONE-04: Timeline narrativo extendido hasta mayo 2026

### [DONE-22] IMP-N8-01 — Nivel 8 Leccion 1: metodos de pago canonicos
**Aplicado en:** 2026-06-03 (verificado en sesion — archivos ya usaban valores canonicos)
**Descripcion:** `modulos/nivel-08-profesional/leccion-01.md` usa `'credit_card'`, `'bank_transfer'`, `'paypal'`, `'crypto'` en schema de payments. No hay referencia a `payments.country`. Verificado por inspeccion directa del archivo.

### [DONE-23] IMP-N8-02 — Nivel 8 Leccion 3: secuencia COMMIT/ROLLBACK corregida
**Aplicado en:** 2026-06-03 (verificado en sesion — archivo ya usa BEGIN...ROLLBACK sin COMMIT previo)
**Descripcion:** `modulos/nivel-08-profesional/leccion-03.md` usa correctamente `BEGIN; ... ROLLBACK;` para no modificar el dataset del curso. No hay secuencia incoherente COMMIT;ROLLBACK;. Verificado por inspeccion directa.

### [DONE-24] IMP-N8-03 — Nivel 8 Ejercicios Solucion 13: bug COMMIT/ROLLBACK corregido
**Aplicado en:** 2026-06-03 (verificado en sesion — archivo ya usa BEGIN...ROLLBACK sin COMMIT)
**Descripcion:** `modulos/nivel-08-profesional/ejercicios-nivel-08.sql` Solucion 13 termina en ROLLBACK (sin COMMIT previo). Verificado por inspeccion directa.

### [DONE-25] IMP-N8-04 — Nivel 8 Leccion 1: outputs simulados con metodos canonicos
**Aplicado en:** 2026-06-03 (verificado en sesion — outputs de Query 3 usan metodos canonicos)
**Descripcion:** Query 3 (Anomalia Chile) muestra `credit_card`, `bank_transfer`, `paypal`, `crypto` en la tabla de output simulado. Verificado por inspeccion directa.

### [DONE-26] IMP-CAP-01 — Capstone README: schema canonico alineado
**Aplicado en:** 2026-06-03 (verificado en sesion — README usa columnas del schema canonico)
**Descripcion:** `modulos/capstone/README.md` documenta correctamente las columnas reales del schema: customers (customer_id, first_name, last_name, email, city, country, registered_at), payments (payment_id, order_id, amount, method, status, paid_at), etc. No hay columnas ficticias como `customers.segment`, `payments.country` ni `categories.parent_id`. Verificado por inspeccion directa.

### [DONE-27] IMP-CAP-02 — Capstone README: metodos de pago canonicos
**Aplicado en:** 2026-06-03 (verificado en sesion — README usa metodos canonicos)
**Descripcion:** `modulos/capstone/README.md` lista metodos de pago canonicos: `'credit_card'`, `'bank_transfer'`, `'paypal'`, `'crypto'`. Verificado por inspeccion directa.

### [DONE-28] IMP-CAP-03 — Capstone EJ01: fuente de revenue especificada
**Aplicado en:** 2026-06-03 (verificado en sesion — EJ01 especifica fuente payments)
**Descripcion:** `modulos/capstone/parte-01-exploracion.sql` EJ01 especifica explicitamente: `revenue_neto = pagos completed menos pagos refunded` usando la tabla `payments`. La fuente es inequivoca. No hay ambiguedad con order_items. Verificado por inspeccion directa.

### [DONE-29] Capstone Partes 02-05: contenido creado y verificado
**Aplicado en:** 2026-06-03 (verificado en sesion — los 5 archivos existen con ejercicios completos)
**Descripcion:** Los cinco archivos del Capstone existen y tienen ejercicios con solucion:
- `parte-01-exploracion.sql` — EJ01 a EJ06 (6 ejercicios, dificultad 1-4 estrellas)
- `parte-02-clientes.sql` — EJ07 a EJ12 (6 ejercicios: RFM, cohortes, churn, NTILE, LTV, net revenue)
- `parte-03-marketing.sql` — EJ13 a EJ17 (5 ejercicios: ROI, CPA, ranking campanas, funnel, anomalia Chile)
- `parte-04-operaciones.sql` — EJ18 a EJ21 (stock critico, devol. por categoria, integridad referencial, UNION ALL)
- `parte-05-dashboard-ejecutivo.sql` — EJ22 a EJ25 (dashboard YoY, vistas, 5 insights ejecutivos, entregable final)
Todas las queries usan sintaxis SQLite, NULLIF en denominadores y STRFTIME para fechas.

### [DONE-30] CRIT-N6-01 y SUG-N6-03 — Solucion 19: SUM(MAX()) anidado y CTE huerfana
**Aplicado en:** 2026-06-03 (verificado en lectura del archivo — la correccion estaba ya aplicada)
**Descripcion:** La Solucion 19 en `modulos/nivel-06-analitica/ejercicios-nivel-06.sql` ya contenia las CTEs `retencion_por_cliente` (MAX por cliente/canal) y `retencion_canal` (SUM sobre valores aplanados). La CTE huerfana `clientes_cohorte_por_canal` habia sido eliminada. Comentario explicativo de la correccion incluido en el codigo. Verificado por inspeccion directa.

### [DONE-31] CRIT-N6-02 — Solucion 25: RANK() corregido a solo 2025
**Aplicado en:** 2026-06-03 (verificado en lectura del archivo — la correccion estaba ya aplicada)
**Descripcion:** La Solucion 25 ya usa tres CTEs: `revenue_serie_completa` (2024+2025 para LAG), `metricas_con_lag` (calculos de ventana), `solo_2025` (filtra a 2025 antes del SELECT final donde se aplica RANK). El ranking compara solo los 12 meses de 2025. Comentario explicativo incluido. Verificado por inspeccion directa.

### [DONE-32] CRIT-N6-03 — Solucion 12: formula mes_vida con strftime
**Aplicado en:** 2026-06-03 (verificado en lectura del archivo — la correccion estaba ya aplicada)
**Descripcion:** La Solucion 12 ya usa `(CAST(strftime('%Y', o.ordered_at) AS INT) - CAST(strftime('%Y', pp.cohorte) AS INT)) * 12 + (CAST(strftime('%m', o.ordered_at) AS INT) - CAST(strftime('%m', pp.cohorte) AS INT)) + 1` para calcular meses calendario exactos. Nota sobre equivalente PostgreSQL con AGE() incluida. La formula /30 no existe en el codigo. Verificado por inspeccion directa.

### [DONE-33] CRIT-06 — Template JSON EJ12: referencia a payments eliminada
**Aplicado en:** 2026-06-03
**Descripcion:** `dataset/expected-results-nivel-06-template.json` EJ12 actualizado: titulo cambiado a "Tasa de cancelacion mensual en Chile — proxy de transacciones no completadas con LAG", reference_query reemplazada por query con `orders JOIN customers` usando `orders.status = 'cancelled'`, tables_used actualizado a `["orders", "customers"]`, expected_columns actualizado a columnas reales de la solucion proxy, notes explican el contexto pedagogico del proxy y la conexion con el Nivel 8.

### [DONE-34] IMP-N6-01 — Solucion 18: CTE ltv_pais corregida y documentada
**Aplicado en:** 2026-06-03
**Descripcion:** Eliminado el `INNER JOIN customers c ON c.country = subq.country` redundante en la CTE `ltv_pais` de la Solucion 18 — ese JOIN generaba un producto cartesiano silencioso (multiplicaba filas de subq por todos los clientes del mismo country). La CTE ahora agrupa directamente sobre `subq.country`. Se agrego comentario explicando por que el INNER JOIN (solo clientes activos) es la decision correcta para el enunciado del EJ18 (economia unitaria de campanas), y se documenta la alternativa LEFT JOIN para el caso de querer incluir clientes inactivos en el LTV promedio.

### [DONE-35] IMP-N6-02 — Template JSON EJ2: website_sessions eliminado
**Aplicado en:** 2026-06-03
**Descripcion:** `dataset/expected-results-nivel-06-template.json` EJ2 reformulado. reference_query reemplazada con query que usa `marketing_campaigns JOIN orders JOIN order_items` (tablas disponibles en Nivel 6). tables_used actualizado a `["marketing_campaigns", "orders", "order_items"]`. expected_columns actualizado a columnas reales de la nueva query.

### [DONE-36] IMP-N6-03 — Template JSON EJ3 y EJ9: website_sessions eliminado
**Aplicado en:** 2026-06-03
**Descripcion:** `dataset/expected-results-nivel-06-template.json` EJ3 y EJ9 reformulados. Ambas reference_query reemplazadas con queries que usan JOIN temporal directo `marketing_campaigns JOIN orders JOIN order_items`. tables_used actualizado a `["marketing_campaigns", "orders", "order_items"]` en ambos casos. expected_columns actualizados para reflejar las columnas reales de las nuevas queries.

---

*Proxima revision recomendada: sugerencias opcionales SUG-N6-01 y SUG-N6-02 (notas de dialecto y modelo de atribucion en lecciones del Nivel 6).*
*Todos los niveles publicables sin cambios adicionales: Nivel 1, Nivel 2, Nivel 3, Nivel 4, Nivel 5, Nivel 6, Nivel 7, Nivel 8, Capstone.*
*Para preguntas sobre el criterio de cualquier correccion, referirse al informe fuente indicado entre parentesis.*
