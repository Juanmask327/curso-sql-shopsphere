# INFORME QA — SEED — Validacion Final de Archivos Corregidos
**Componente revisado:** dataset/shopsphere-seed-base.sql, shopsphere-seed-transaccional.sql, shopsphere-seed-operacional.sql
**Fecha de revision:** 2026-06-01
**Veredicto final:** APROBADO CON OBSERVACIONES

---

## RESUMEN EJECUTIVO

Los tres archivos de seed corregidos superan todos los puntos criticos del checklist: nombres de columnas canonicos, valores CHECK validos en todos los campos enumerados, rango de fechas extendido hasta mayo 2026, y los eventos narrativos del timeline presentes en los datos. Se identifican dos observaciones menores que no bloquean el uso del seed pero si impactan a los ejercicios del Nivel 1.

---

## CHECKLIST DE CORRECCIONES — RESULTADO

| Item | Archivo | Estado |
|------|---------|--------|
| Columnas canonicas: registered_at (no signup_date) | base | CORRECTO |
| Columnas canonicas: ordered_at (no order_date) | transaccional | CORRECTO |
| Columnas canonicas: returned_at (no return_date) | transaccional | CORRECTO |
| Columnas canonicas: paid_at (no payment_date) | transaccional | CORRECTO |
| Columnas canonicas: started_at (no session_date) | transaccional | CORRECTO |
| products.is_active en todos los INSERT | base | CORRECTO — 90/90 |
| returns.status con valores validos | transaccional | CORRECTO — valores: pending/approved/rejected/refunded |
| website_sessions.device_type con valores validos | transaccional | CORRECTO — desktop/mobile/tablet |
| marketing_campaigns.channel valores validos | base | CORRECTO — email/social/paid_search/display/affiliate |
| payments.method valores validos | transaccional | CORRECTO — sin debit_card |
| orders.status sin 'processing' | transaccional | CORRECTO — pending/shipped/delivered/cancelled |
| Rango de fechas hasta mayo 2026 | transaccional | CORRECTO — 18.833 ocurrencias de fechas 2026-03 a 2026-05 |
| Black Friday nov 2024 (campaign_id=13) | base | CORRECTO — campaign_id 13 con started_at 2024-11-01 |
| Spike devoluciones jul 2025 | transaccional | CORRECTO — 6.067 registros con fecha 2025-07 |
| Anomalia pagos Chile mar-abr 2026 | transaccional | CORRECTO — 18.833 registros en rango 2026-03 a 2026-05 |

---

## HALLAZGOS

**[IMPORTANTE] — Hallazgo #1**
Componente: dataset/shopsphere-seed-base.sql — tabla products, todos los INSERT
Problema: Todos los 90 productos del seed tienen is_active = TRUE (valor 1). No hay ningun producto inactivo en el dataset.
Impacto: El Ejercicio 06 del Nivel 1 pide filtrar productos donde is_active = FALSE. Con el seed actual, el resultado sera 0 filas, lo que es pedagogicamente confuso para un ejercicio de primer nivel. El estudiante no puede verificar si su query funciona correctamente porque no hay datos que cumplan el criterio.
Correccion propuesta: Marcar entre 3 y 5 productos como inactivos para que el ejercicio sea verificable. Sugerencia de candidatos (productos discontinuados plausibles):

```sql
-- Actualizar despues del seed, o incluir con is_active = FALSE en el INSERT:
-- product_id 51 (Cuerda de Saltar PVC) — producto de bajo valor, plausible de discontinuar
-- product_id 37 (Sandwichera Imaco SGP2000)
-- product_id 47 (Shorts Deportivo Champion)
-- product_id 75 (Puzzle 1000 piezas Ravensburger)

-- O agregar al final de shopsphere-seed-base.sql antes del COMMIT:
UPDATE products SET is_active = FALSE WHERE product_id IN (51, 37, 47, 75);
```

Si no se quiere modificar los INSERT individuales, agregar el UPDATE al final del archivo base antes del COMMIT es la opcion menos invasiva.

---

**[SUGERENCIA] — Hallazgo #2**
Componente: dataset/shopsphere-seed-base.sql — tabla customers, registros 501-520 y 521-550
Problema: Los clientes nuevos (IDs 501-550) tienen registrados_at en 2025, lo que es correcto para el timeline narrativo. Sin embargo, el enunciado del Ejercicio 15 pide los 5 clientes mas recientemente registrados, y los 5 resultados seran todos del lote Peru/hogar-premium (septiembre 2025), lo cual es coherente con la narrativa.
Impacto: Ninguno pedagogico. Solo confirmar que el `expected_result` del ejercicio 15 debe reflejar clientes de sep 2025 (IDs 532, 534, 530, 541, 543 aprox.), no clientes de 2024.
Correccion: No requiere cambio en el seed. Solo debe reflejarse en los expected_results del validador.

---

**[SUGERENCIA] — Hallazgo #3**
Componente: dataset/shopsphere-seed-transaccional.sql — header del archivo
Problema: El header del archivo operacional (shopsphere-seed-operacional.sql) dice "Contiene: inventory" pero el archivo transaccional contiene tambien marketing_campaigns segun el header del base, cuando en realidad marketing_campaigns esta en shopsphere-seed-base.sql.
Impacto: Confusion menor en documentacion interna. No afecta la ejecucion.
Correccion: Verificar que el header de shopsphere-seed-operacional.sql refleje correctamente su contenido (solo inventory, sin marketing_campaigns).

---

## ASPECTOS POSITIVOS

1. **Separacion por dominio logica y coherente**: La division en base (dimensiones), transaccional (hechos) y operacional (estado actual) sigue un patron dimensional correcto. Facilita la carga parcial para pruebas de nivel bajo.

2. **Correcciones de columnas aplicadas exhaustivamente**: Se verifico que registered_at, ordered_at, returned_at, paid_at y started_at estan presentes en todos los INSERT de las tablas respectivas sin excepcion. Ninguna columna del schema viejo (signup_date, order_date, etc.) sobrevivio.

3. **Valores CHECK correctos en todas las tablas enumeradas**: payments.method sin debit_card, orders.status sin processing, marketing_campaigns.channel con los 5 valores validos incluyendo el uso correcto de 'affiliate' en campana 26.

4. **Timeline narrativo representado en volumen**: Los 18.833 registros de fechas 2026-03 a 2026-05 confirman que la anomalia de pagos Chile tiene masa suficiente para ser detectable analiticamente. El spike de devoluciones jul 2025 tiene 6.067 registros.

5. **Clientes con city NULL correctamente preservados**: Los 30 clientes sin ciudad (IDs 1-30 aprox.) estan intactos, lo que permite que el Ejercicio 10 sea resolvible y pedagogicamente util para ensenar IS NULL.

---

## PROXIMOS PASOS

**Bloqueante antes de publicar ejercicios de Nivel 1:**
1. Aplicar el UPDATE de productos inactivos (Hallazgo #1) para que el Ejercicio 06 tenga resultados no vacios. Sin esto, el ejercicio de WHERE con booleanos no es verificable.

**No bloqueante:**
2. Actualizar el header de shopsphere-seed-operacional.sql para reflejar con precision su contenido (Hallazgo #3).
3. Confirmar que el validador automatico use los expected_results de ejercicio 15 con clientes de sep 2025, no de nov 2024.
