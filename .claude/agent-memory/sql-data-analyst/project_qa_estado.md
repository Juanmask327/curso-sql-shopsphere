---
name: project-qa-estado
description: Estado QA del curso ShopSphere — niveles revisados, veredictos y correcciones pendientes
metadata:
  type: project
---

Estado de calidad del curso ShopSphere al 2026-06-02 (rev. 5).

## Componentes revisados

| Componente | Tipo | Veredicto | Informe |
|---|---|---|---|
| Evaluación Diagnóstica v1.0 | LECCIÓN | REQUIERE CORRECCIONES | qa/informe-diagnostico.md |
| ShopSphere Seed Data v2 | CÓDIGO | APROBADO CON OBSERVACIONES | qa/informe-seed-data.md |
| Nivel 1 — Exploración de Datos (4 lecciones + ejercicios) | LECCIÓN | APROBADO CON OBSERVACIONES | qa/informe-niveles-1-2.md |
| Nivel 2 — Métricas de Negocio (4 lecciones + ejercicios) | LECCIÓN | APROBADO CON OBSERVACIONES | qa/informe-niveles-1-2.md |
| Seed corregido (base + transaccional + operacional) | CÓDIGO | APROBADO CON OBSERVACIONES | qa/informe-seed-validacion-final.md |
| Nivel 7 — SQL para Business Intelligence (4 lecciones + ejercicios) | LECCIÓN | REQUIERE CORRECCIONES | qa/informe-nivel-07.md |
| Nivel 6 — Analitica de Negocio (4 lecciones + ejercicios) | LECCIÓN | REQUIERE CORRECCIONES | qa/informe-nivel-06.md |
| Nivel 8 — SQL Profesional (4 lecciones + ejercicios) | LECCIÓN | APROBADO CON OBSERVACIONES | qa/informe-nivel-08.md |
| Capstone — Proyecto Final Integrador (README + parte-01 + brief) | LECCIÓN | APROBADO CON OBSERVACIONES | qa/informe-capstone.md |

## Hallazgo critico Nivel 7 (2026-06-02)

**[CRIT-N7-01] v_clientes_perfil — revenue_total inflado por multiplicacion silenciosa en triple LEFT JOIN**

La vista une `customers LEFT JOIN orders LEFT JOIN order_items LEFT JOIN website_sessions` en un solo FROM. Un cliente con N order_items y M sesiones produce N x M filas. `SUM(oi.quantity * oi.unit_price)` suma las N x M filas — revenue_total queda multiplicado por M. El error es silencioso: la query ejecuta sin falla. COUNT DISTINCT protege los conteos de pedidos y sesiones pero NO el SUM de revenue. La vista se declara como infraestructura critica del Capstone.

Correccion: separar revenue y sesiones en dos CTEs pre-agregadas antes del JOIN final. Ver `qa/informe-nivel-07.md`.

**Patron de error nuevo confirmado:** SUM sobre una columna de la tabla "del medio" (order_items) en un JOIN de tres niveles (customers → orders → order_items + customers → website_sessions) produce inflacion proporcional al tercer nivel (sesiones). Diferente al patron CRIT-08 (SUM sin filtro condicional en LEFT JOIN) — este produce inflacion multiplicativa, no error de filtrado.

## Hallazgos críticos que bloquean uso

1. **P15 del diagnóstico**: respuesta modelo principal usa `oi.customer_id` — columna que no existe en `order_items`. La respuesta alternativa (segunda) es la correcta y debe promoverse como modelo principal.

2. **Schema del seed no es cargable en el schema canónico**: divergencias en nombres de columna (`ordered_at→order_date`, `registered_at→signup_date`, etc.) y violaciones de CHECK constraints (`google_ads`, `influencer`, `debit_card`, `processing` no están en los CHECK del schema canónico).

3. **Columnas ausentes en seed**: `returns.status`, `products.is_active`, `website_sessions.device_type` — columnas que el curso enseña y que están en el schema canónico pero no en el seed.

4. **Eventos narrativos del timeline (Parte C) de 2025-2026 no están en el seed**: el seed termina en 2024-12-01. Solo el Black Friday 2024 está parcialmente representado.

5. **[N2-L1 Error 3] Tabla `order_items` usada en Nivel 2**: la sección de Errores Comunes de N2-L1 referencia `order_items` (tabla de Nivel 3). Viola el sistema de desbloqueo progresivo. Debe reemplazarse con ejemplo usando `products`.

6. **[N2-L3 Error 2] Afirmación falsa sobre alias en HAVING en PostgreSQL**: la lección afirma que `HAVING alias > N` funciona en PostgreSQL. Es incorrecto — PostgreSQL no permite aliases de SELECT en HAVING (sí en ORDER BY). El estudiante que lo intente obtendrá un error.

## Correcciones importantes pendientes (no bloqueantes)

- **[N1-L3 Error 4]**: Contradicción de redacción en el comentario "INCORRECTO: ... (correcto)". El ejemplo real del error es `OFFSET 2`, no `OFFSET 10`.
- **[N2-L2 Query 1]**: Ejemplo principal muestra window function (Nivel 5) antes de descartarla. Debe invertirse: versión simple primero, adelanto después.

## Patrón de error recurrente detectado

El schema del seed fue diseñado con columnas extra valiosas (segment, channel, cost, discount, refund_amount, etc.) pero usando nombres que difieren del schema canónico del curso. Este patrón de "schema ampliado con nombres distintos" es el error de diseño más crítico del seed — afecta a todos los niveles del curso.

**Nuevo patrón detectado (2026-06-01):** El teacher tiende a usar tablas de niveles futuros en ejemplos de error de niveles anteriores. Ya ocurrió en N2-L1 con `order_items`. Revisar activamente este patrón en Niveles 3–8.

## Fix seed-base aplicado 2026-06-01

- Archivo: `dataset/shopsphere-seed-base.sql`
- UPDATE añadido antes del COMMIT: `UPDATE products SET is_active = FALSE WHERE product_id IN (37, 47, 51, 75);`
- product_id 37=Sandwichera Imaco (cat 4), 47=Shorts Deportivo Champion (cat 5), 51=Cuerda de Saltar PVC (cat 6), 75=Puzzle 1000 piezas Ravensburger (cat 9)
- Resultado: 86 productos activos, 4 inactivos. EJ06 del Nivel 1 ahora retorna 4 filas (no 0).

## Expected Results Nivel 2 — generados 2026-06-01

- Archivo: `dataset/expected-results-nivel-02.json` — 25 ejercicios cubiertos
- Ejecutados contra SQLite con datos reales del seed (31345 orders, 550 customers, 90 products)
- Discrepancia detectada: EJ01 dice "Debe ser 2000" pero el seed tiene 31345 pedidos. Reportado como nota en el JSON — el teacher debe actualizar el enunciado.
- EJ09: 3 anios en customers (2023=138, 2024=362, 2025=50). El enunciado menciona solo 2023 vs 2024.
- EJ16: diciembre 2024 tiene 0 clientes nuevos — 5 meses en resultado, no 6.
- EJ17: noviembre tiene datos de 3 anios (2023, 2024, 2025) — 88 dias distintos.

## Documento consolidado de correcciones pendientes — generado 2026-06-01

- Archivo: `qa/correcciones-pendientes-sql-teacher.md`
- Consolida hallazgos de: informe-diagnostico.md, informe-niveles-1-2.md, informe-seed-validacion-final.md, expected-results-nivel-01.json, expected-results-nivel-02.json
- IDs de correccion: CRIT-01 a CRIT-05, IMP-01 a IMP-08, SUG-01 a SUG-06, DONE-01 a DONE-04
- El sql-teacher puede usar este unico archivo como referencia sin leer los 5 informes fuente

## Templates Expected Results Niveles 4-8 — generados 2026-06-01

- `dataset/expected-results-nivel-04-template.json` — 12 ejercicios (briefings 4.1-4.12)
- `dataset/expected-results-nivel-05-template.json` — 12 ejercicios (briefings 5.1-5.12)
- `dataset/expected-results-nivel-06-template.json` — 12 ejercicios (briefings 6.1-6.12)
- `dataset/expected-results-nivel-07-template.json` — 12 ejercicios (briefings 7.1-7.12 + proyecto)
- `dataset/expected-results-nivel-08-template.json` — 12 ejercicios (briefings 8.1-8.10 + proyecto)

## CRIT-06 escalada formalmente 2026-06-01

- Briefing 6.9 usa tabla `payments` (Nivel 8) en el template del Nivel 6
- Registrada en qa/correcciones-pendientes-sql-teacher.md como CRIT-06
- Dos opciones propuestas: (A) reformular con orders.status='cancelled' como proxy, (B) mover al Nivel 8
- El teacher debe decidir antes de escribir la leccion del Nivel 6

### Alertas criticas a resolver antes de publicar los niveles:

**Nivel 4 (expected-results generados 2026-06-01 — archivo: dataset/expected-results-nivel-04.json):**
- N4-DISC-01 [EJ02] CRITICO: 0 filas. Todos los 86 productos activos tienen devoluciones approved/refunded.
- N4-DISC-02 [EJ05] CRITICO: 'Calzado' no existe en seed (ingles). Con Calzado: 550 filas incorrectas. Con 'Clothing': 2 filas correctas. Teacher debe corregir.
- N4-DISC-03 [EJ21] IMPORTANTE: 0 filas. Seed sin ninguna devolucion con reason=NULL (2213/2213 con motivo). Insertar NULLs.
- N4-DISC-04 [EJ22] IMPORTANTE: Bug en query del teacher — SUM sin filtrar return_id produce millones de dolares. Resultados correctos: Home Appliances $7054.49, Electronics $4381.59, Clothing $3784.45.
- N4-DISC-05 [EJ13/14/19] OBSERVACION: 100% completitud en returns.reason. COALESCE/IS NULL no se activan.
- N4-DISC-06 [EJ17/18] OBSERVACION: Todos los 550 clientes tienen pedidos. LEFT JOIN MAX nunca retorna NULL.
- Spike julio 2025: 200 devoluciones vs promedio ~101/mes. Ratio 1.98x. CONFIRMADO.
- EJ07: 10 perdidos, EJ08: 533 retenidos, EJ12: solo_q3=10/solo_q4=7/ambos=533.
- EJ24: 78 no_volvio (16.1%), 406 si_volvio (83.9%) de 484 con devolucion desde 2024-07-01.
- Top productos devueltos julio 2025: Funko Pop (Toys 10.16%), Ventilador Liliana (Home 8.09%), Teclado Logitech (Electronics 7.53%).
- Script ejecutado: dataset/run_queries_n4_fast.py (con indices SQLite para performance)

**Nivel 5:**
- EJ06 (PERCENTILE_CONT): NO disponible en SQLite — requiere adaptacion si el curso usa SQLite
- EJ10 (INTERVAL '30 days'): NO disponible en SQLite — usar datetime(col, '+30 days')
- Confirmar el dialecto del curso (SQLite vs PostgreSQL) antes de publicar Nivel 5

**Nivel 6:**
- EJ12 (pagos fallidos por metodo): usa tabla `payments` que es Nivel 8 segun el sistema de desbloqueo. INCONSISTENCIA DE NIVEL — el ejercicio debe moverse al Nivel 8 o el briefing 6.9 debe reformularse. Este es el unico hallazgo critico de nivel incorrecto en los tres templates.
- EJ03 (ROI): formula ROI usa spent (gasto ejecutado, no budget) — confirmar con el teacher que esta es la interpretacion correcta del briefing de Sofia
- DATE_TRUNC es PostgreSQL — todos los ejercicios de N6 que usen DATE_TRUNC necesitan adaptacion si el curso es SQLite

### Datos verificados del seed para N4-N6:
- returns: ~1100+ registros (IDs hasta ~1200), con reasons: defective, wrong_item, not_as_described, changed_mind, wrong_size
- wrong_size existe como reason (spike julio 2025 calzado Colombia) — NO estaba documentado en el schema original
- inventory: 90 registros (product_id 1-90), stock minimo = 0 (product_id 10, Hub USB-C 7-en-1)
- Productos con stock < 10: product_id 1(4), 2(2), 3(8), 10(0), 73(7) — al menos 5 productos en stock critico
- marketing_campaigns: 26 campanas (campaign_id 1-26), ultima = Recuperacion Chile Abril 2026 (affiliate)
- Campanas con spent > budget (anomalia narrativa): Black Friday 2025 (spent=94000 vs budget=22000)

## Hallazgos Nivel 8 (2026-06-02) — APROBADO CON OBSERVACIONES

**[IMP-N8-01] payments.method incorrecto en Leccion 1:** El schema documentado usa 'debit_card', 'transfer', 'cash' cuando el schema canonico tiene 'paypal', 'bank_transfer', 'crypto'. Ademas la leccion incluye una columna `country` en payments que no existe en el schema canonico. El pais del cliente se navega via orders → customers.

**[IMP-N8-02 + IMP-N8-03] COMMIT + ROLLBACK es incoherente:** La Solucion del Ejercicio Basico de Leccion 3 y la Solucion 13 del archivo de ejercicios terminan con COMMIT seguido de ROLLBACK. El ROLLBACK despues de COMMIT no tiene ningun efecto — la transaccion ya se confirmo. El comentario "limpiar el dataset" es enganoso. Correccion: el codigo debe terminar en ROLLBACK solo para el Playground, con COMMIT como opcion documentada para produccion.

**[IMP-N8-04] Outputs simulados Query 3 usan metodos incorrectos:** Los valores de metodo en el output esperado son 'debit_card', 'transfer', 'cash' — inconsistentes con el schema canonico. Derivado de IMP-N8-01.

**Sin hallazgos criticos:** El Nivel 8 es el material tecnicamente mas solido del curso. NULLIF en todos los denominadores sin excepcion, sintaxis SQLite correcta en todo el nivel, transactions/indices/EXPLAIN correctamente documentados.

## Hallazgos Capstone (2026-06-02) — APROBADO CON OBSERVACIONES

**[IMP-CAP-01] Schema del README Capstone diverge del schema canonico:** El README documenta columnas que no existen en el schema canonico: customers.name (en lugar de first_name/last_name), customers.segment, products.cost/sku/stock, orders.total_amount/country, categories.parent_id, payments.country, website_sessions.ended_at. Si el dataset usa el schema canonico, cualquier ejercicio que referencie estas columnas fallara en ejecucion.

**[IMP-CAP-02] payments.method y returns.status inconsistentes en README:** Los metodos de pago del README son 'debit_card','transfer','cash' (incorrectos). El schema canonico tiene 'paypal','bank_transfer','crypto'. El status 'refunded' de returns esta ausente en el README.

**[IMP-CAP-03] Pregunta 2 del brief no especifica fuente de revenue:** La segmentacion de clientes por valor no dice si usar order_items (facturado) o payments (cobrado). Para coherencia con el resto del Capstone debe usarse payments.status='completed'.

**Partes 02-05 del Capstone no existen:** Solo parte-01-exploracion.sql esta disponible. Las partes de clientes, marketing, operaciones y dashboard estan pendientes de creacion.

## Alertas criticas Niveles 7-8 — generadas 2026-06-01

**Nivel 7:**
- EJ05 y EJ06 son CREATE VIEW — validation_mode = "schema_match", no "exact_ordered". El sistema de validacion automatica debe soportar esta modalidad.
- EJ10 usa tabla `payments` (adelanto del Nivel 8). El teacher debe decidir si la incluye en Nivel 7 o reformula con orders.status como proxy.
- EJ05: INTERVAL '24 hours' es PostgreSQL. En SQLite usar datetime(ws.started_at, '+24 hours').
- La vista v_clientes_perfil (EJ06) se reutiliza en el Capstone — su correcta construccion es critica.
- EJ12 es el mas complejo del nivel (5 tablas, 5 CTEs). Puede dividirse en ejercicio de cierre de nivel.

**Nivel 8:**
- EJ05, EJ06, EJ07, EJ08, EJ12 son todos validation_mode = "manual_review". El sistema de ejercicios necesita un flujo diferente para estos (no auto-corregibles).
- EJ05 (EXPLAIN ANALYZE) y EJ06 (EXPLAIN ANALYZE sobre cohortes): EXPLAIN ANALYZE es PostgreSQL. En SQLite usar EXPLAIN QUERY PLAN.
- EJ07 (indice parcial): CREATE INDEX ... WHERE no existe en MySQL. Si el curso usa MySQL, este ejercicio no es aplicable.
- EJ09 (ON CONFLICT): requiere que product_id tenga UNIQUE constraint en inventory. Verificar si el schema canonico lo tiene — si no, el ejercicio necesita un CREATE UNIQUE INDEX previo.
- EJ12 (transaccion de ajuste): el teacher debe especificar los payment_ids reales del seed para que el ejercicio sea determinista. Con PLACEHOLDER_ID_X como esta en el template, el ejercicio no puede ejecutarse sin esa informacion.

## Estado Nivel 6 — 2026-06-02 (post-QA)

- Veredicto: REQUIERE CORRECCIONES
- Informe completo: `qa/informe-nivel-06.md`
- 3 hallazgos CRITICOS nuevos, 1 CRITICO pre-existente (CRIT-06) parcialmente resuelto
- 3 hallazgos IMPORTANTES, 3 SUGERENCIAS

### Hallazgos CRITICOS Nivel 6

- **[CRIT-N6-01]** Solucion 19: `SUM(MAX(CASE...))` — aggregate anidado invalido en PostgreSQL y SQL estandar. La query no ejecuta. ERROR: aggregate function calls cannot be nested. Afecta las CTEs clientes_cohorte_por_canal, retencion_canal y la subquery inline del SELECT final. Ademas, la CTE clientes_cohorte_por_canal nunca es referenciada en el SELECT final. Correccion: separar en dos CTEs (una con MAX por canal+cliente, otra con SUM+COUNT por canal).
- **[CRIT-N6-02]** Solucion 25: `RANK() OVER (ORDER BY revenue DESC)` se calcula sobre el conjunto completo 2024+2025 (necesario para LAG(12)), pero el enunciado pide ranking de meses de 2025. El WHERE mes >= '2025-01-01' filtra despues del RANK — los rankings son incorrectos cuando algun mes de 2024 tiene mayor revenue que su equivalente de 2025. El codigo reconoce el problema en un comentario pero no lo corrige. Correccion: agregar CTE intermedia que filtre a 2025 antes de aplicar RANK.
- **[CRIT-N6-03]** Solucion 12: calculo de mes_vida con division /30 produce asignaciones incorrectas para meses de 28-31 dias. Para cohorte=2025-01-01 y pedido=2025-03-01 (59 dias): 59/30=1+1=2 (incorrecto, deberia ser 3). Afecta ltv_1_a_3 y ltv_1_a_6. Correccion: usar diferencia de meses calendario con EXTRACT(YEAR)*12 + EXTRACT(MONTH).

### Estado de CRIT-06 (pre-existente)

- CORREGIDO en lecciones (leccion-03.md) y ejercicios (ejercicios-nivel-06.sql) — usa orders.status='cancelled' como proxy con notas pedagogicas claras.
- PENDIENTE en dataset/expected-results-nivel-06-template.json — el Ejercicio 12 del template sigue usando tabla payments y la reference_query no fue actualizada.

### Hallazgos IMPORTANTES Nivel 6

- **[IMP-N6-01]** Solucion 18: CTE ltv_pais tiene INNER JOIN redundante con customers (ON c.country = subq.country). Produce duplicacion de filas en el AVG cuando hay clientes en customers sin pedidos. Correccion: agrupar directamente sobre el subquery sin el JOIN externo.
- **[IMP-N6-02]** Template Ejercicio 2: tables_used y reference_query usan website_sessions (Nivel 7). Debe reformularse con marketing_campaigns + orders + order_items.
- **[IMP-N6-03]** Template Ejercicios 3 y 9: mismo problema que IMP-N6-02. Las queries de referencia usan website_sessions con modelo de atribucion por sesion.

### Hallazgos SUGERENCIAS Nivel 6

- **[SUG-N6-01]** Leccion 1, Query 4: JOIN de campaigns con orders por periodo presentado sin advertencia semantica sobre el modelo de atribucion. La Leccion 3 lo explica bien — agregar referencia anticipada.
- **[SUG-N6-02]** Falta nota de dialecto: DATE_TRUNC, EXTRACT, INTERVAL, PERCENTILE_CONT, TO_CHAR — todas son PostgreSQL-only. El Playground usa SQLite. Sin nota de adaptacion en ninguna leccion ni en el archivo de ejercicios.
- **[SUG-N6-03]** Solucion 19: CTE clientes_cohorte_por_canal nunca referenciada (CTE huerfana). Evidencia adicional de que la solucion fue escrita y no limpiada.

### Verificaciones positivas Nivel 6

- CRIT-06 corregido en lecciones y ejercicios con calidad pedagogica: proxy orders.status='cancelled', notas claras, referencia al Nivel 8.
- LAST_VALUE con marco UNBOUNDED FOLLOWING correctamente implementado en Leccion 2 (verificado en SQLite).
- NULLIF en todos los denominadores sin excepcion — las 25 soluciones y todos los ejemplos.
- Briefings coherentes con lecciones: personajes, eventos y numeros son consistentes.
- marketing_campaigns.channel usa valores canonicos: email, social, paid_search, display, affiliate.
- Patron CTE preagregacion + window function: correcto en todas las soluciones excepto Solucion 19.
- Los 7 pasos pedagogicos completos en las 4 lecciones.

### Correcciones bloqueantes Nivel 6 (antes de publicar)

1. CRIT-N6-01: reescribir Solucion 19 con dos capas de CTEs para el calculo de retencion.
2. CRIT-N6-02: agregar CTE intermedia `solo_2025` antes del RANK en Solucion 25.
3. CRIT-N6-03: reemplazar formula /30 por diferencia de meses calendario en Solucion 12.
4. CRIT-06 pendiente: actualizar template Ejercicio 12 con la aproximacion orders/customers.

### Correcciones importantes Nivel 6

5. IMP-N6-01: eliminar INNER JOIN redundante en CTE ltv_pais de Solucion 18.
6. IMP-N6-02 + IMP-N6-03: actualizar templates Ejercicios 2, 3, 9 para usar solo tablas de Nivel 6.

---

## Estado Nivel 5 — 2026-06-01 (post-QA + expected-results generados)

- Veredicto: APROBADO CON OBSERVACIONES
- Informe completo: `qa/informe-nivel-05.md`
- Expected results reales: `dataset/expected-results-nivel-05.json` — 25 ejercicios (IDs 01-24 + 25a/25b/25c)
- 0 hallazgos CRITICOS, 2 IMPORTANTES, 4 SUGERENCIAS
- Primer nivel en pasar el chequeo de tablas al 100% (sin tablas de niveles futuros en ninguna parte)
- IMP-14 e IMP-15 registrados en qa/correcciones-pendientes-sql-teacher.md

### Hallazgos IMPORTANTES Nivel 5 (IDs asignados, documentados en correcciones-pendientes)

- **[IMP-14]** Solucion 03: `COUNT(r.return_id)` en lugar de `SUM(oi.quantity)` para unidades devueltas. COUNT cuenta eventos de devolucion, no unidades fisicas. Los ratios reales son el doble de los mostrados (Clothing: 1.98% con bug vs 4.11% correcto). Correccion: reemplazar con `SUM(oi.quantity)`.
- **[IMP-15]** Solucion 21: filtro de fecha `< '2026-06-01'` correcto pero sin comentario pedagogico. Correccion: anadir `-- Filtro exclusivo: < fecha_siguiente captura todo el dia N sin hora 23:59:59`.

### Hallazgos SUGERENCIAS Nivel 5

- **[SUG-N5-01]** L2 Query 1: titulo dice "Solo el base case" pero la query incluye el recursive case completo. Texto introductorio promete mostrar base case aislado y no lo hace.
- **[SUG-N5-02]** L4 Query 2: FIRST_VALUE/LAST_VALUE sobre `inventory` que tiene un solo registro por producto — ambas funciones devuelven el mismo valor, la ilustracion pedagogica no funciona con datos reales.
- **[SUG-N5-03]** L3 tabla comparativa: usa "Cliente A/B/C/D" (nombres genericos) en lugar de personajes del universo ShopSphere.
- **[SUG-N5-04]** Archivo ejercicios: briefings 5.1-5.12 no tienen documento de referencia explicado en el archivo de ejercicios.

### Verificaciones positivas Nivel 5

- Ninguna tabla de nivel futuro usada en todo el material (marketing_campaigns, website_sessions, payments: ausentes).
- Bloque B documenta categories_jerarquia con CREATE TABLE e INSERT completos — correcto.
- LAST_VALUE con marco ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING: presente en todos los usos.
- NULLIF en todas las divisiones: sin excepciones.
- Patron CTE-wrapper para filtrar por alias de window function: correcto en todas las soluciones.
- Proteccion NULL en NOT IN (L2): correctamente implementada.
- Los 7 pasos pedagogicos completos en las 4 lecciones.
- Ejercicio integrador 25 (3 partes): logica de negocio correcta.

### Metricas clave del Nivel 5 (verificadas contra seed real)

- Revenue total historico (order_items, todos los status): $10.182.176
- Revenue H1 2026 delivered (ene-may): $1.692.339 acumulado. Junio 2026 sin datos.
- Clientes whale (revenue > 2x promedio, threshold $21.056): 93 de 550 (16.9%)
- Promedio revenue por cliente delivered: $10.528
- Top producto historico: Laptop Lenovo IdeaPad 3 15" con $864.486 revenue
- Top producto H1 2026: Laptop Lenovo IdeaPad 3 15" con $103.398
- Concentracion de revenue (cuartil top NTILE4): 65.1% del revenue total en 23 productos
- Concentracion de revenue (quintil top NTILE5): 58.6% del revenue total en 18 productos
- Productos en stock critico (stock < 10): 5 productos. Hub USB-C 7-en-1 en stock=0.
- Revenue Q1 2026 pais lider: Mexico $343.580 bruto, $337.929 neto
- Clientes nuevos (jun25-may26) con pedido en 30 dias: 30 de 50 registrados en ese periodo

### Nota sobre dialecto SQL Nivel 5

Confirmado que el nivel usa INTERVAL (Soluciones 05, 20) y DATE_TRUNC (Soluciones 19, 23, 25A) — ambos PostgreSQL-only. La alerta previa (registrada como "Nivel 5: EJ06 PERCENTILE_CONT y EJ10 INTERVAL SQLite") se confirma con esta revision. La decision de dialecto sigue pendiente del teacher.

---

## Estado Nivel 4 — 2026-06-01 (post-QA)

- Veredicto: REQUIERE CORRECCIONES
- Informe completo: `qa/informe-nivel-04.md`
- 3 hallazgos CRITICOS, 2 IMPORTANTES, 3 SUGERENCIAS

### Hallazgos CRITICOS Nivel 4 (IDs consolidados en correcciones-pendientes-sql-teacher.md)

- **[CRIT-07]** L2 Error 1: ejemplo usa `orders.country` — columna inexistente. Query no ejecuta.
- **[CRIT-08]** L3 Solución Intermedio: `SUM(oi.quantity * oi.unit_price)` suma TODOS los ítems, no solo los reembolsados. Produce revenue_reembolsado ficticio para categorías sin devoluciones. Corrección: `SUM(CASE WHEN r.return_id IS NOT NULL THEN oi.quantity * oi.unit_price ELSE 0 END)`.
- **[CRIT-09]** Solución 22: mismo bug que CRIT-08. Patrón idéntico, mismo archivo.

### Hallazgos IMPORTANTES Nivel 4 (IDs consolidados en correcciones-pendientes-sql-teacher.md)

- **[IMP-12]** L3 Sintaxis: `LEFT JOIN ON r.order_id IN (subquery)` — patrón no canónico como ejemplo de sintaxis. Reemplazar con doble LEFT JOIN.
- **[IMP-13]** Solución 10: `MAX(motivo)` es frágil para detectar segmento 'ambos'. Añadir comentario documentando la limitación (alternativa: BOOL_OR o COUNT(CASE WHEN)).

### Nuevo patrón de error confirmado en Nivel 4

`SUM(oi.quantity * oi.unit_price)` después de un LEFT JOIN sin filtro condicional suma todos los ítems, no solo los del lado derecho que tuvieron match. El patrón correcto es `SUM(CASE WHEN r.pk IS NOT NULL THEN oi.col ELSE 0 END)`. Este es el tercer tipo de patrón de error recurrente (después de: tablas de niveles futuros, y afirmaciones falsas sobre dialectos SQL).

### Verificaciones positivas Nivel 4

- Ninguna tabla de nivel futuro (inventory, marketing_campaigns, website_sessions, payments) fue usada. Primer nivel que pasa el chequeo de desbloqueo al 100%.
- NOT EXISTS vs NOT IN explicado con la trampa de NULLs: correctísimo.
- Soluciones 01-09, 11-16, 17-21, 23-25 (ejercicios): correctas.
- Ejercicio integrador 25: ejecuta correctamente y produce las 6 métricas del enunciado.

---

## Estado Nivel 3 — 2026-06-01 (post-QA, expected-results generados)

- Veredicto: APROBADO CON OBSERVACIONES
- Informe completo: `qa/informe-nivel-03.md`
- Expected results reales: `dataset/expected-results-nivel-03.json` — 25 ejercicios con datos reales del seed
- Sin hallazgos CRITICOS. Tres hallazgos IMPORTANTES documentados en correcciones-pendientes.

### Correcciones pendientes Nivel 3 (IDs asignados en correcciones-pendientes.md)

- **[IMP-09]** L1-Sintaxis-Var2: tabla `returns` (Nivel 4) usada en ejemplo de Nivel 3. Tercera ocurrencia del patron.
- **[IMP-10]** EJ12: enunciado describe LEFT JOIN al reves (dice orders a la izquierda cuando la solucion correcta pone order_items a la izquierda).
- **[IMP-11]** EJ10: ambiguedad en definicion del periodo — no especifica si el 10 de mayo esta incluido.

### Hallazgos relevantes de los expected-results del Nivel 3

- EJ07 (clientes sin pedido): 0 filas. Todos los 550 clientes tienen al menos un pedido.
- EJ08 (productos activos sin ventas): 0 filas. Todos los 86 productos activos tienen ventas.
- EJ10 (Dia de Madres): todos los 86 productos activos tuvieron ventas en may 5-10 2026. Sin ceros.
- EJ11 (pedidos por cliente): minimo 16 pedidos por cliente, maximo 176 (Melissa Davis, Mexico).
- EJ12 (items huerfanos): 0 filas. Integridad referencial correcta.
- EJ17 (co-ocurrencia con Electronics): nombre correcto es 'Electronics' no 'Tecnologia'. Teacher debe ajustar enunciado.
- EJ18 (FULL OUTER JOIN anomalias): 0 filas. Catalogo integro.
- EJ21 (productos nunca vendidos): 0 filas.
- EJ23 (Electronics sin Home Appliances): 0 filas. Todos los compradores de Electronics tambien compraron Home Appliances.
- EJ24 (whales): 257 clientes superan el doble del ticket promedio global (umbral ~$240-260).
- Revenue Q1 2026 delivered por categoria: Home Appliances $382.576, Electronics $256.090. Total ~$1.138.593.

### Patron de error recurrente — CONFIRMADO por tercera vez

El teacher usa tablas de niveles superiores en ejemplos de codigo dentro de la seccion de Sintaxis. Ocurrencias:
1. N2-L1 Errores Comunes: `order_items` (Nivel 3) usado en leccion de Nivel 2
2. N3-L1 Sintaxis Var2: `returns` (Nivel 4) usado en leccion de Nivel 3
Regla QA: al iniciar QA de cada nueva leccion, VERIFICAR PRIMERO todas las tablas referenciadas contra la tabla de desbloqueo antes de revisar la logica. Es el chequeo mas rapido y de mayor impacto.

## Expected Results Nivel 1 — generados 2026-06-01

- Archivo: `dataset/expected-results-nivel-01.json` — 20 ejercicios cubiertos
- Ejecutados contra SQLite con los datos reales del seed corregido
- Conteos exactos verificados: EJ01=10 filas, EJ02=90, EJ03=550, EJ04=16 paises, EJ06=0 (bloqueante), EJ07=5, EJ08=115, EJ09=38, EJ10=30, EJ11=4, EJ12=13, EJ13=18, EJ14=10, EJ15=5 (clientes sep 2025), EJ16=8, EJ17=3, EJ18=64, EJ19=90, EJ20=54
- **Hallazgo critico de expected results**: EJ06 (productos inactivos) retorna 0 filas porque todos los 90 productos tienen is_active=TRUE. El ejercicio no es verificable sin un UPDATE que marque algunos productos como inactivos.

## Métricas reales del seed (seed=42, verificadas)

- Revenue delivered: ~$277.000 (no $282K como dice el comentario del SQL)
- Ticket promedio: ~$187 (supera el target declarado de $80-$150)
- Tasa devolución de items: ~5.3%
- Órdenes delivered: ~74% (status_weights=[0.72, ...])

**Why:** Estas son las métricas exactas del dataset del curso, necesarias para calibrar las respuestas esperadas de los ejercicios.

**How to apply:** Al hacer QA de lecciones que citen métricas de ShopSphere, usar estas cifras como referencia de verdad, no las cifras del docstring del generador (que estaban calibradas para el dataset de producción de 15K pedidos/mes, no para el dataset del curso de 2K órdenes).
