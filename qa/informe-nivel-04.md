## INFORME QA — Nivel 4 (Análisis de Clientes)

**Agente revisado:** `sql-teacher`
**Fecha de revisión:** 2026-06-01
**Veredicto global:** ❌ REQUIERE CORRECCIONES

**Veredicto por componente:**
- leccion-01.md ✅ APROBADO
- leccion-02.md ⚠️ APROBADO CON OBSERVACIONES
- leccion-03.md ❌ REQUIERE CORRECCIONES
- leccion-04.md ✅ APROBADO
- ejercicios-nivel-04.sql ❌ REQUIERE CORRECCIONES

---

## RESUMEN EJECUTIVO

El Nivel 4 tiene una base pedagógica sólida: los 7 pasos están presentes y completos en las cuatro lecciones, la narrativa de ShopSphere es coherente y progresiva, y la cobertura técnica de subqueries correlacionadas, operadores de conjuntos y manejo de NULLs es apropiada para el nivel. Sin embargo, se identificaron dos errores de lógica SQL que producen resultados incorrectos silenciosamente — el tipo de error más peligroso pedagógicamente porque el estudiante no recibe ningún mensaje de error, solo datos equivocados. El error crítico se repite en dos lugares (Lección 3 ejercicio intermedio y Ejercicio 22), lo que lo convierte en un patrón recurrente que requiere corrección inmediata antes de publicar el nivel.

---

## HALLAZGOS POR LECCIÓN

---

### LECCIÓN 01 — Subqueries Avanzadas

---

La lección es técnicamente correcta en su totalidad. Todas las queries ejecutan sin error, la correlación en subqueries está bien construida, el tratamiento de NOT EXISTS vs. NOT IN con NULLs es el punto pedagógico más valioso del nivel y está explicado con precisión. Los cuatro errores comunes son reales y sus correcciones son correctas. Los dos ejercicios tienen enunciados resolubles y soluciones válidas.

**Aspecto destacado:** La explicación de la trampa de NULLs con NOT IN (Sección 2) es el mejor tratamiento de ese tema en todo el curso hasta la fecha. El ejemplo con returns y la comparación de tres alternativas (NOT IN sin proteger, NOT IN con IS NOT NULL, NOT EXISTS) es exactamente lo que un estudiante necesita para desarrollar el hábito correcto.

**Sin hallazgos que bloqueen publicación.**

---

### LECCIÓN 02 — UNION, INTERSECT, EXCEPT

---

```
[CRITICO] — Hallazgo #1
Componente: Sección 6, Error 1 — ejemplo de UNION vs. UNION ALL
Problema: Las queries del ejemplo de Error 1 referencian una columna
  que no existe en el schema canónico:
    SELECT customer_id FROM orders WHERE country = 'Colombia'
    UNION
    SELECT customer_id FROM orders WHERE country = 'Argentina';
  La tabla `orders` tiene columnas: order_id, customer_id, ordered_at, status.
  No tiene columna `country`. Esta query produce ERROR al ejecutarse.
Impacto: El estudiante intenta reproducir el ejemplo para entender el
  concepto de UNION vs. UNION ALL y obtiene un error de columna inexistente
  en lugar del resultado esperado. El concepto pedagógico (usar UNION ALL
  cuando los conjuntos son disjuntos) queda oscurecido por un bug técnico
  que no tiene relación con lo que se está enseñando. Este es exactamente
  el tipo de error que erosiona la confianza del estudiante en el material.
Corrección: Reemplazar con columnas que sí existen en orders, o cambiar
  la fuente a customers donde country sí existe:

  -- CORRECTO: usando customers donde country existe
  SELECT customer_id FROM customers WHERE country = 'Colombia'
  UNION
  SELECT customer_id FROM customers WHERE country = 'Argentina';
  -- Si las condiciones son mutuamente excluyentes, UNION ALL es más eficiente
  SELECT customer_id FROM customers WHERE country = 'Colombia'
  UNION ALL
  SELECT customer_id FROM customers WHERE country = 'Argentina';

  Nota: si se prefiere mantener orders como fuente para el ejemplo, se
  puede filtrar por status que sí existe en esa tabla:
  SELECT customer_id FROM orders WHERE status = 'delivered'
  UNION ALL
  SELECT customer_id FROM orders WHERE status = 'cancelled';
```

**Aspectos positivos:**
- Las reglas de compatibilidad de UNION (mismo número de columnas, tipos compatibles, nombres del primer SELECT) están explicadas con ejemplos correctos y claros.
- La distinción entre UNION y UNION ALL con justificación de rendimiento (deduplicación = sort implícito) es precisa.
- La Query 4 del ejemplo práctico (UNION ALL con columna de segmento) es un patrón de producción muy útil y está correctamente implementado.
- Los ejercicios básico e intermedio tienen soluciones correctas. El uso de INTERSECT dentro de una rama de UNION ALL para los "retenidos" es un patrón avanzado bien explicado.
- La nota al pie de la solución intermedia sobre por qué usar UNION ALL (segmentos mutuamente excluyentes) es una observación de calidad profesional.

---

### LECCIÓN 03 — Manejo de NULLs

---

```
[CRITICO] — Hallazgo #2
Componente: Sección 5, Solución al Ejercicio Intermedio
Problema: La query suma el revenue de TODOS los ítems de order_items
  de una categoría, no solo el revenue de los ítems devueltos con
  status 'refunded'. El error es lógico, no sintáctico — la query
  ejecuta sin error pero produce resultados incorrectos.

  La query usa LEFT JOIN con filtro de status y fecha en la cláusula ON:
    LEFT JOIN order_items oi ON oi.product_id = p.product_id
    LEFT JOIN returns r ON r.product_id = p.product_id
                        AND r.order_id   = oi.order_id
                        AND r.status     = 'refunded'
                        AND r.returned_at >= '2025-07-01'
                        AND r.returned_at <  '2025-10-01'

  Hasta aquí el patrón es correcto para preservar categorías sin reembolsos.
  El error está en el agregado:
    SUM(oi.quantity * oi.unit_price)

  Cuando r.return_id IS NULL (el ítem no fue devuelto/reembolsado), la fila
  de order_items sigue presente en el resultado y su valor es sumado
  igualmente. El resultado: una categoría sin ningún reembolso en Q3
  muestra como revenue_reembolsado_q3 el valor TOTAL de todos sus ítems
  vendidos en ese período, no cero.

  Verificado con datos de prueba:
  - Escenario: Calzado con 1 ítem devuelto ($240), Tecnología con 0 devoluciones ($800 en ventas)
  - Resultado de la query incorrecta: Calzado=240, Tecnología=800
  - Resultado correcto esperado:      Calzado=240, Tecnología=0

Impacto: El estudiante aprende que el patrón "LEFT JOIN con filtro en ON
  + COALESCE + SUM" es suficiente para calcular revenue reembolsado por
  categoría. No lo es — produce sobrestimación severa en categorías con
  ventas pero sin reembolsos. Este es el tipo de bug que en producción
  reportaría pérdidas inexistentes a Finance, con consecuencias directas
  en decisiones de negocio.

Corrección: El SUM debe ser condicional — sumar solo cuando el match
  con returns existió (r.return_id IS NOT NULL):

  SELECT
      cat.name                                               AS categoria,
      COALESCE(
          ROUND(
              SUM(CASE WHEN r.return_id IS NOT NULL
                       THEN oi.quantity * oi.unit_price
                       ELSE 0 END),
              2
          ),
          0.00
      )                                                      AS revenue_reembolsado_q3
  FROM categories cat
  INNER JOIN products p ON p.category_id = cat.category_id
  LEFT JOIN order_items oi ON oi.product_id = p.product_id
  LEFT JOIN returns r ON r.product_id = p.product_id
                      AND r.order_id   = oi.order_id
                      AND r.status     = 'refunded'
                      AND r.returned_at >= '2025-07-01'
                      AND r.returned_at <  '2025-10-01'
  GROUP BY cat.category_id, cat.name
  ORDER BY revenue_reembolsado_q3 DESC;

  Con CASE WHEN: si no hay match (r.return_id IS NULL), el ítem
  contribuye 0 al SUM. El COALESCE cubre el caso de categorías sin
  ítems vendidos en absoluto (oi también sería NULL en ese caso).
  Nota: el COALESCE ya no es estrictamente necesario porque el CASE WHEN
  garantiza que SUM retorna 0 y no NULL, pero mantenerlo es buena práctica
  defensiva y no produce resultados incorrectos.
```

```
[IMPORTANTE] — Hallazgo #3
Componente: Sección 2 (Sintaxis), ejemplo de NULL en JOIN
Problema: La cláusula ON del LEFT JOIN usa IN con una subquery
  correlacionada, un patrón inusual que puede confundir:

  LEFT JOIN returns r ON r.order_id IN (
      SELECT order_id FROM orders WHERE customer_id = c.customer_id
  );

  Esta construcción es técnicamente válida pero:
  (a) Mezcla el patrón de subquery correlacionada con el patrón de LEFT JOIN,
      cuando la lección aún no ha enseñado a combinarlos.
  (b) Puede producir comportamientos inesperados si la subquery retorna
      múltiples order_ids — en SQLite/PostgreSQL el comportamiento es
      correcto en este caso específico, pero es una construcción que los
      analistas junior raramente reconocen y pueden malinterpretar.
  (c) El patrón canónico para este caso sería un JOIN explícito con orders:
        LEFT JOIN orders o ON o.customer_id = c.customer_id
        LEFT JOIN returns r ON r.order_id = o.order_id
Impacto: El estudiante aprende un patrón no canónico como ejemplo de
  sintaxis, lo que puede dificultar la lectura de código de otros
  y generar confusión al intentar depurar errores similares.
Corrección: Reemplazar el ejemplo de sintaxis con el patrón canónico de
  doble LEFT JOIN, que además es más legible y consistente con los
  ejemplos del Nivel 3:

  SELECT c.customer_id, c.first_name, r.return_id, r.reason
  FROM customers c
  LEFT JOIN orders o ON o.customer_id = c.customer_id
  LEFT JOIN returns r ON r.order_id = o.order_id;
  -- Para ver solo clientes SIN devoluciones:
  WHERE r.return_id IS NULL
```

**Aspectos positivos:**
- La Query 3 (COUNT(*) vs COUNT(columna)) y la Query 4 (NULLIF en denominador) son ejemplos de producción correctos y bien motivados.
- El Error 3 de la sección 6 (filtro en WHERE vs. ON en LEFT JOIN) es el error más importante del nivel y está explicado con precisión, código correcto y justificación clara. La explicación de por qué NULL = 'refunded' es FALSE y convierte el LEFT JOIN en INNER JOIN es exactamente el nivel de detalle que los estudiantes necesitan.
- El Error 4 (CASE WHEN sin ELSE implica NULL y sesga el AVG) es un hallazgo de nivel profesional — pocas fuentes documentan este efecto y la explicación es precisa.
- La Query 5 (CASE WHEN con y sin ELSE explícito) es correcta y el contraste entre ambas versiones es pedagógicamente efectivo.

---

### LECCIÓN 04 — La tabla returns (Análisis integrador)

---

La lección integra correctamente todas las tablas del Nivel 4. Las queries de ejemplo son técnicamente correctas. La presentación de la tabla returns (estructura, relaciones, ciclo de vida del status) es completa y precisa. La relación returns → order_items para calcular el monto devuelto está bien explicada y bien implementada en el ejemplo de la Query 5 (CTE).

```
[SUGERENCIA] — Hallazgo #4
Componente: Sección 3, Query 4 (resiliencia post-devolución)
Problema: La Query 4 hace INNER JOIN de orders o2 con una condición
  o2.ordered_at > r.returned_at. Si un cliente tiene N devoluciones
  y M pedidos posteriores, el producto cartesiano entre ellos puede
  generar N×M combinaciones antes de la agregación. COUNT(DISTINCT)
  lo resuelve correctamente, pero el patrón es conceptualmente difícil
  para estudiantes de Nivel 4 que aún no conocen Window Functions.
Impacto: No produce resultados incorrectos (COUNT DISTINCT es la
  corrección apropiada y está aplicada). El riesgo es pedagógico:
  el estudiante no entiende por qué se necesita DISTINCT ahí si no se
  explica el fan-out.
Corrección (opcional): Agregar una nota explicativa después de la query
  indicando que el doble JOIN puede multiplicar filas cuando hay múltiples
  devoluciones, y que COUNT(DISTINCT) protege contra ese efecto. En Nivel 5
  con Window Functions, este análisis se puede escribir de forma más limpia.
```

**Aspectos positivos:**
- La nota al final de la Query 5 que anticipa los CTEs del Nivel 5 sin desviar el foco del nivel actual es un ejemplo de gestión pedagógica correcta del alcance.
- El Error 1 (returns no tiene customer_id, siempre hay que pasar por orders) es el error más frecuente al trabajar con esta tabla y merece el lugar prominente que ocupa.
- El Error 2 (returns no tiene unit_price) está bien ejemplificado con el mensaje de error real y la corrección con JOIN a order_items es correcta y clara.
- El Error 4 (doble conteo por múltiples returns del mismo order_item) identifica un problema de datos reales que los analistas encuentran frecuentemente.

---

### EJERCICIOS NIVEL 04

---

```
[CRITICO] — Hallazgo #5
Componente: Solución 22 (Ejercicio 22 — revenue reembolsado Q3 por categoría)
Problema: La solución tiene exactamente el mismo bug lógico que la
  Solución del Ejercicio Intermedio de la Lección 3 (Hallazgo #2):
  SUM(oi.quantity * oi.unit_price) suma todos los ítems de order_items,
  no solo los ítems vinculados a una devolución refunded.

  La solución del archivo:
    SELECT cat.name AS categoria,
           COALESCE(ROUND(SUM(oi.quantity * oi.unit_price), 2), 0.00) AS revenue_reembolsado_q3
    FROM categories cat
    INNER JOIN products p ON p.category_id  = cat.category_id
    LEFT JOIN  order_items oi ON oi.product_id  = p.product_id
    LEFT JOIN  returns     r  ON r.product_id   = p.product_id
                              AND r.order_id    = oi.order_id
                              AND r.status      = 'refunded'
                              AND r.returned_at >= '2025-07-01'
                              AND r.returned_at <  '2025-10-01'
    GROUP BY cat.category_id, cat.name

  Verificado con datos de prueba: una categoría sin reembolsos en el período
  muestra como revenue_reembolsado_q3 el valor total de sus ventas en ese período
  (no cero).

Impacto: El estudiante completa el ejercicio y obtiene números plausibles pero
  incorrectos. Si la nota de la lección 3 dijo que el patrón "filtro en ON" era
  suficiente, esta solución refuerza ese aprendizaje incorrecto. Es un patrón
  de error que se arraigará.

Corrección: Igual a la corrección del Hallazgo #2:
  SUM debe usar CASE WHEN:
    ROUND(
        SUM(CASE WHEN r.return_id IS NOT NULL
                 THEN oi.quantity * oi.unit_price
                 ELSE 0 END),
        2
    )
  El COALESCE puede mantenerse como práctica defensiva aunque CASE WHEN ya
  garantiza que SUM retorna 0 en lugar de NULL para categorías sin reembolsos.
```

```
[IMPORTANTE] — Hallazgo #6
Componente: Solución 10 (Ejercicio 10 — segmentación 'ambos')
Problema: La lógica de la columna de segmento depende de MAX(motivo):
  CASE WHEN COUNT(*) = 2 THEN 'ambos'
       WHEN MAX(motivo) = 'devolucion_julio' THEN 'devolucion_julio'
       ELSE 'inactivo_6m'
  END AS segmento

  La rama COUNT(*) = 2 es correcta para detectar clientes en ambos grupos.
  Pero el fallback a MAX(motivo) es frágil: si en el futuro se agregan
  más segmentos al UNION ALL, COUNT(*) = 2 ya no garantiza "ambos" y la
  lógica se rompe silenciosamente. Además, MAX(motivo) es dependiente del
  orden lexicográfico ('i' < 'd' en ASCII inverso) — es una heurística
  que funciona con estos dos valores específicos pero que no es explícita.

Impacto: El ejercicio es el más difícil del bloque y la solución propuesta
  resuelve el problema de forma creativa. Sin embargo, el estudiante aprende
  un patrón de código frágil como si fuera la forma canónica de hacerlo.
Corrección: Hacer la lógica explícita y robusta con SUM de indicadores:
  CASE WHEN SUM(CASE WHEN motivo = 'devolucion_julio' THEN 1 ELSE 0 END) > 0
             AND SUM(CASE WHEN motivo = 'inactivo_6m' THEN 1 ELSE 0 END) > 0
            THEN 'ambos'
       WHEN SUM(CASE WHEN motivo = 'devolucion_julio' THEN 1 ELSE 0 END) > 0
            THEN 'devolucion_julio'
       ELSE 'inactivo_6m'
  END AS segmento
  Esta versión es más verbosa pero su intención es legible y no depende
  de MAX sobre strings.
```

```
[SUGERENCIA] — Hallazgo #7
Componente: Solución 17 (Ejercicio 17 — dias_sin_comprar)
Problema: La diferencia de fechas usa CAST explícito a DATE y resta directa:
  CAST('2026-06-01' AS DATE) - CAST(MAX(o.ordered_at) AS DATE)
  En PostgreSQL esto retorna un tipo `interval` o `integer` dependiendo del
  contexto. Cuando ordered_at es TIMESTAMP (como en el schema canónico),
  la resta DATE - DATE retorna un INTEGER de días en PostgreSQL — correcto.
  Sin embargo, la nota al pie menciona TIMESTAMP sin aclarar que el CAST a DATE
  es necesario precisamente porque la resta de dos TIMESTAMP retorna un INTERVAL,
  no un INTEGER, y el estudiante podría confundirse sobre cuándo necesita el CAST.
Impacto: Confusión menor sobre tipos de retorno de operaciones de fecha.
Corrección (opcional): Extender la nota al pie para aclarar explícitamente:
  "El CAST a DATE convierte el TIMESTAMP en una fecha sin hora. La resta de
  dos valores DATE en PostgreSQL retorna directamente un INTEGER de días.
  Sin el CAST, la resta de dos TIMESTAMP retorna un INTERVAL que requeriría
  EXTRACT(EPOCH FROM ...) / 86400 para convertir a días."
```

```
[SUGERENCIA] — Hallazgo #8
Componente: Enunciado Ejercicio 19 (auditoría de completitud)
Problema: El enunciado menciona "una tabla con tres columnas: campo,
  total_registros, con_valor, sin_valor (NULLs) y pct_completitud"
  — son cinco columnas, no tres. El texto dice "tres columnas" pero
  enumera cinco.
Impacto: Inconsistencia menor entre el enunciado y la solución. El estudiante
  cuenta las columnas del enunciado (dice tres) pero la solución tiene cinco.
Corrección: Cambiar "una tabla con tres columnas" por "una tabla con cinco columnas".
```

---

## REVISIÓN DE CRITERIOS ESPECÍFICOS SOLICITADOS

| Criterio | Estado |
|----------|--------|
| Solo tablas del Nivel 4 (customers, categories, products, orders, order_items, returns) | CUMPLE — ninguna tabla de niveles futuros |
| NOT IN con protección de NULLs | CUMPLE — L1 explica el riesgo y recomienda NOT EXISTS |
| UNION/INTERSECT/EXCEPT con mismo número de columnas y tipos compatibles | CUMPLE — todas las queries de conjuntos tienen 1 o 5 columnas consistentes |
| COALESCE con argumentos de tipo compatible | CUMPLE — todos los usos de COALESCE son string+string o numeric+numeric |
| CTEs correlacionadas: referencia exterior en WHERE, no en FROM | CUMPLE — L4 Q5 usa CTE con correlación en WHERE correctamente |
| Precio devuelto calculado desde order_items.unit_price | CUMPLE en ejemplos — L4 Error 2 lo explica explícitamente. BUG en soluciones L3/Ej22 (ver Hallazgos #2 y #5) |
| Ejercicio integrador 25: produce métricas descritas sin errores | CUMPLE — la query ejecuta y produce las 6 métricas del enunciado correctamente |
| 7 pasos pedagógicos completos en las 4 lecciones | CUMPLE — los 7 pasos están presentes en todas las lecciones |
| 25 ejercicios con enunciado comentado + solución al final | CUMPLE — todos los ejercicios tienen enunciado en comentario y solución en bloque /* */ |

---

## RESUMEN DE HALLAZGOS

| # | Severidad | Componente | Descripción |
|---|-----------|------------|-------------|
| 1 | CRITICO | L2 — Error 1 | orders.country no existe — ejemplo no ejecutable |
| 2 | CRITICO | L3 — Sol. Intermedio | SUM(oi) suma todos los ítems, no solo los reembolsados |
| 3 | IMPORTANTE | L3 — Sintaxis | LEFT JOIN con IN en ON: patrón no canónico como ejemplo de sintaxis |
| 4 | SUGERENCIA | L4 — Q4 | Fan-out en doble JOIN: falta nota explicativa sobre por qué DISTINCT |
| 5 | CRITICO | Ej22 — Solución | Mismo bug que Hallazgo #2: SUM incorrecto |
| 6 | IMPORTANTE | Ej10 — Solución | MAX(motivo) es frágil como heurística de segmentación |
| 7 | SUGERENCIA | Ej17 — Solución | Nota sobre CAST a DATE vs TIMESTAMP podría ser más completa |
| 8 | SUGERENCIA | Ej19 — Enunciado | "tres columnas" debería decir "cinco columnas" |

**Hallazgos CRITICOS: 3** (2 son la misma clase de error en dos lugares distintos)
**Hallazgos IMPORTANTES: 2**
**Sugerencias: 3**

---

## ASPECTOS POSITIVOS DEL NIVEL

1. **Coherencia narrativa**: el hilo de Valentina, Diego, Sofía, Ana y Marco a través del spike de julio es el más logrado del curso. Cada query responde una pregunta real y el lector puede seguir la investigación como si fuera un caso real.

2. **Tratamiento de NOT EXISTS vs. NOT IN con NULLs** (L1, Sección 2): el mejor tratamiento de este tema visto en el curso. La comparación de tres alternativas con justificación técnica precisa es exactamente el nivel de detalle que distingue un curso básico de uno profesional.

3. **Error 3 de la Lección 3** (filtro en WHERE vs. ON en LEFT JOIN): la explicación de cómo NULL = 'refunded' es FALSE y convierte el LEFT JOIN en INNER JOIN es una de las mejores secciones del nivel. Este es un error de producción frecuente y la lección lo trata con el nivel de profundidad que merece.

4. **Ejercicio integrador 25**: la construcción de la query con COUNT(DISTINCT CASE WHEN) para filtrar por período dentro de un GROUP BY es una técnica avanzada bien aplicada. El HAVING para excluir categorías sin ventas en julio es correcto y está bien motivado.

5. **Soluciones 01 al 09 y 11-16**: son técnicamente correctas, resolubles con las tablas disponibles, y los criterios de éxito en los enunciados son verificables.

6. **Nota pedagógica sobre CTEs en L4 Q5**: introducir el CTE como anticipo del Nivel 5 sin desviar el foco de la subquery correlacionada del WHERE final es una decisión curricular correcta. La nota que lo señala explícitamente es útil.

---

## PRÓXIMOS PASOS (PRIORIZADOS)

**Bloqueantes — corregir antes de publicar:**

1. **Hallazgo #2 (L3 Solución Intermedio)**: cambiar `SUM(oi.quantity * oi.unit_price)` por `SUM(CASE WHEN r.return_id IS NOT NULL THEN oi.quantity * oi.unit_price ELSE 0 END)`. La nota explicativa sobre el efecto del LEFT JOIN y CASE WHEN es la oportunidad de convertir la corrección en contenido pedagógico.

2. **Hallazgo #5 (Solución 22)**: aplicar la misma corrección. Es el mismo patrón de error. Revisar si hay otros ejercicios en el bloque D con el mismo patrón (Ej20, Ej23, Ej24, Ej25 no lo tienen — están confirmados como correctos).

3. **Hallazgo #1 (L2 Error 1)**: reemplazar `orders WHERE country` por una query válida. Sugerencia: usar `customers WHERE country` que tiene la columna, o usar `orders WHERE status` para mantener orders como tabla de ejemplo.

**Deben corregirse antes de la siguiente revisión:**

4. **Hallazgo #3 (L3 Sintaxis)**: reemplazar el patrón `LEFT JOIN ON r.order_id IN (subquery)` por el doble LEFT JOIN canónico. La sección de Sintaxis debe mostrar el patrón estándar.

5. **Hallazgo #6 (Solución 10)**: reemplazar `MAX(motivo)` por indicadores SUM(CASE WHEN) para que la lógica de segmentación sea explícita y robusta.

**Opcionales (mejoras de calidad):**

6. Hallazgo #4: agregar nota sobre fan-out en Q4 de L4.
7. Hallazgo #7: extender nota sobre CAST a DATE en Solución 17.
8. Hallazgo #8: corregir "tres columnas" por "cinco columnas" en Enunciado 19.

---

*Informe generado por el agente `sql-data-analyst` en modo QA — 2026-06-01*
