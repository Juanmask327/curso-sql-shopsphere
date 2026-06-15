## INFORME QA — Nivel 3 (JOINs y Relaciones)

**Agente revisado:** `sql-teacher`
**Fecha de revisión:** 2026-06-01
**Veredicto global:** ⚠️ APROBADO CON OBSERVACIONES

**Veredicto por componente:**
- leccion-01 ⚠️ APROBADO CON OBSERVACIONES
- leccion-02 ✅ APROBADO
- leccion-03 ✅ APROBADO
- leccion-04 ✅ APROBADO
- ejercicios-nivel-03.sql ⚠️ APROBADO CON OBSERVACIONES

---

## RESUMEN EJECUTIVO

Las cuatro lecciones del Nivel 3 están bien construidas pedagógicamente: los 7 pasos están completos en cada lección, las queries son sintácticamente correctas para PostgreSQL, la progresión conceptual es sólida y los errores comunes son reales y bien corregidos. Se detectaron dos hallazgos de severidad IMPORTANTE y tres de nivel SUGERENCIA. No hay hallazgos CRÍTICOS que bloqueen el uso inmediato del material. El hallazgo más relevante es el uso de la tabla `returns` (Nivel 4) como ejemplo en una sección de sintaxis de la Lección 1, que viola el sistema de desbloqueo progresivo.

---

## HALLAZGOS POR LECCIÓN

---

### LECCIÓN 01 — INNER JOIN

---

```
[🟡 IMPORTANTE] — Hallazgo #1
Componente: Sección 2 SINTAXIS — Variante 2 "JOIN con múltiples condiciones en el ON"
Problema: El ejemplo de código usa la tabla `returns`, que pertenece al Nivel 4
  según el sistema de desbloqueo progresivo del curso. En el Nivel 3 solo están
  disponibles: customers, categories, products, orders, order_items.

  Código actual:
    FROM returns r
    INNER JOIN order_items oi ON oi.order_id   = r.order_id
                              AND oi.product_id = r.product_id

Impacto: El estudiante ve una tabla que no existe todavía en su schema. Viola el
  principio pedagógico de trabajar solo con las tablas disponibles en el nivel.
  Es el mismo patrón de error detectado en N2-L1 (tabla de nivel superior usada
  en sección de errores/ejemplos). Patrón recurrente confirmado.

Corrección: Reemplazar el ejemplo con tablas del Nivel 3. Un JOIN de orders con
  order_items usando dos condiciones es forzado (solo comparten order_id), pero
  el ejemplo puede ser conceptual con una nota explicativa:

    -- Ejemplo conceptual: un ítem pertenece al pedido correcto
    -- y corresponde al producto correcto (útil en datos desnormalizados)
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id  = o.order_id
                              AND oi.quantity  > 0
    -- Nota: en el schema de ShopSphere el ON simple con order_id es suficiente;
    -- el patrón de múltiples condiciones en ON se aplica cuando la relación entre
    -- tablas requiere más de una clave (ej: tabla de devoluciones con order_id + product_id).
    -- Verás ese patrón en el Nivel 4 con la tabla returns.

  Alternativamente, el ejemplo puede mantenerse como bloque marcado como
  "adelanto — disponible en Nivel 4" con una nota visual que lo distinga.
```

---

```
[🔵 SUGERENCIA] — Hallazgo #2
Componente: Sección 3 EJEMPLO PRÁCTICO — Query 1 (output simulado)
Problema: El output muestra el producto "Laptop Lenovo IdeaPad 3 15"" con
  unit_price = 549.99 y quantity = 1. En la Query 2 el revenue_total de esa
  laptop es 87.450,00 lo que implica aproximadamente 159 unidades vendidas de
  ese solo producto. Esa magnitud es coherente con el seed (31.345 pedidos).
  No hay error técnico, pero la Query 1 con LIMIT 5 muestra valores sin contexto
  de volumen, lo que podría confundir al comparar con la Query 2.

Impacto: Riesgo menor de confusión pedagógica. No afecta la corrección de la
  query.

Corrección: Agregar un párrafo de transición breve: "El LIMIT 5 muestra filas
  individuales de venta. En la Query 2, agrupamos con SUM para ver el total
  acumulado por producto — de ahí la diferencia de magnitud."
```

---

### LECCIÓN 02 — LEFT JOIN y RIGHT JOIN

Sin hallazgos. La lección está correctamente estructurada. Los 7 pasos presentes y completos. Las queries son sintácticamente correctas. El patrón ON vs WHERE para LEFT JOIN está explicado con precisión y es el error pedagógicamente más importante del nivel — bien cubierto.

**Nota de verificación positiva:** La solución del Ejercicio Básico coloca el filtro de fecha en el `ON` del LEFT JOIN con `orders` (no en el WHERE), lo cual es la práctica correcta para preservar categorías sin ventas. El comentario explicativo que acompaña a la solución es preciso y pedagógicamente valioso.

---

### LECCIÓN 03 — JOINs múltiples, FULL OUTER JOIN, Self-Join

Sin hallazgos. Las queries de 5 tablas están bien construidas. El uso de `COUNT(DISTINCT o.order_id)` vs `COUNT(o.order_id)` está explicado con código comparativo claro. El self-join incluye correctamente la cláusula `AND p2.product_id <> p1.product_id` para excluir el producto de su propia comparación — error que se enseña explícitamente en la sección de errores comunes.

---

### LECCIÓN 04 — Subqueries

Sin hallazgos IMPORTANTES ni CRÍTICOS.

```
[🔵 SUGERENCIA] — Hallazgo #3
Componente: Sección 3 EJEMPLO PRÁCTICO — Query 3 (NOT IN con products no vendidos)
Problema: La query usa NOT IN contra order_items.product_id. La lección incluye
  una advertencia general sobre NOT IN con NULLs en el Error 4, pero la Query 3
  en la sección de ejemplos no tiene comentario inline que recuerde que esta query
  es segura porque product_id en order_items tiene FK (y no debería tener NULLs).

  La situación es: primero se muestra la query con NOT IN (Query 3), luego se
  explica el peligro en el Error 4. El estudiante que lee la Query 3 antes de
  llegar al Error 4 podría copiarla sin comprender la condición de seguridad.

Impacto: Riesgo pedagógico menor. El error ya tiene cobertura en la sección 6
  y la solución del ejercicio intermedio usa NOT EXISTS correctamente.

Corrección: Agregar un comentario inline en la Query 3:

  WHERE p.is_active = TRUE
    AND p.product_id NOT IN (
        SELECT DISTINCT oi.product_id
        FROM order_items oi
        -- product_id tiene FK NOT NULL en este schema, así que NOT IN es seguro aquí.
        -- Ver Error 4 en este nivel para el caso donde la columna puede tener NULLs.
    )
```

---

```
[🔵 SUGERENCIA] — Hallazgo #4
Componente: Sección 3 EJEMPLO PRÁCTICO — Query 1 (subquery escalar repetida)
Problema: La query de precio promedio de categoría repite la misma subquery
  escalar dos veces en el SELECT (una para mostrar el promedio, otra para
  calcular la diferencia). Esto es funcionalmente correcto pero puede generar
  confusión en estudiantes que crean que hay que repetir la subquery siempre.

Impacto: Ninguno técnico. El texto ya menciona que en el Nivel 5 se aprenderá
  a resolverlo con Window Functions. Sin embargo, la Lección 4 también introduce
  tablas derivadas (FROM) — el mismo resultado puede obtenerse sin repetición.

Corrección (opcional): Agregar una nota al pie de la Query 1:
  "Nota: la subquery se repite en la misma query para calcular dos valores
  distintos. En producción, esto se evita con una tabla derivada en el FROM
  (que ya viste en la Query 4) o con Window Functions (Nivel 5)."
```

---

## HALLAZGOS EN EJERCICIOS

---

### Verificación de estructura (25 ejercicios)

Todos los ejercicios tienen:
- Enunciado como comentario con CONTEXTO + descripción + criterio
- Espacio "Tu query aquí:" para la solución del estudiante
- Soluciones al final en bloque comentado `/* ... */`

La estructura de los 25 ejercicios es consistente y completa. Conteo verificado: 25 enunciados, 25 soluciones (01 a 25).

---

### Verificación de tablas por nivel

Todas las queries de los 25 ejercicios usan exclusivamente tablas del Nivel 3:
`customers`, `categories`, `products`, `orders`, `order_items`. Sin violaciones de nivel.

---

### Verificación de aliases

Todos los JOINs usan aliases de tabla. Las columnas están calificadas correctamente. Sin ambigüedades detectadas.

---

### Hallazgos en ejercicios específicos

---

```
[🟡 IMPORTANTE] — Hallazgo #5
Componente: Ejercicio 10 — Solución (filtro de fecha Día de Madres 2026)
Problema: El enunciado del Ejercicio 10 define el período como "5 al 10 de mayo
  de 2026" (es decir, inclusive ambos extremos: 5, 6, 7, 8, 9 y 10 de mayo).
  La solución usa:

    AND ordered_at <  '2026-05-11'

  Eso incluye el día 10 hasta las 23:59:59 — correcto. Sin embargo, el enunciado
  dice "5 al 10" sin especificar si el 10 está incluido o excluido. El criterio
  dice "5-10 de mayo 2026". La solución interpretó correctamente (10 incluido),
  pero el enunciado debería ser explícito para evitar ambigüedad pedagógica.

Impacto: El estudiante que interprete "10 de mayo" como límite exclusivo usará
  `< '2026-05-10'` y obtendrá un resultado diferente. En un ejercicio donde el
  criterio de éxito es "COALESCE para mostrar 0 en lugar de NULL", este detalle
  no bloquea el aprendizaje del concepto, pero sí puede causar confusión al
  comparar su resultado con la solución.

Corrección: Actualizar el enunciado para dejarlo explícito:

  Texto actual:
    "total de unidades vendidas en el período 5-10 de mayo 2026"

  Texto corregido:
    "total de unidades vendidas en el período del 5 al 10 de mayo de 2026,
    ambos días inclusive (es decir, desde las 00:00:00 del 5 hasta las
    23:59:59 del 10)"

  Y en el criterio:
    "filtro de fecha: >= '2026-05-05' AND < '2026-05-11'"
```

---

```
[🟡 IMPORTANTE] — Hallazgo #6
Componente: Ejercicio 12 — Enunciado (descripción del LEFT JOIN)
Problema: El criterio del Ejercicio 12 describe la solución con LEFT JOIN así:
  "LEFT JOIN (orders a la izquierda, order_items a la derecha, filtrando donde
  orders.order_id IS NULL)"

  Esto describe un LEFT JOIN que pondría orders a la izquierda y order_items a
  la derecha, filtrando donde orders.order_id IS NULL. Pero para encontrar ítems
  de order_items sin pedido válido, la solución correcta es lo opuesto:
  order_items a la IZQUIERDA y orders a la DERECHA, filtrando donde
  orders.order_id IS NULL.

  La solución provista es correcta:
    FROM order_items oi
    LEFT JOIN orders o ON o.order_id = oi.order_id
    WHERE o.order_id IS NULL

  Pero el enunciado describe el JOIN al revés de cómo está implementado.

Impacto: El estudiante que siga el enunciado y ponga orders a la izquierda
  obtendrá el resultado inverso (filas de orders sin ítems, no ítems sin orders).
  Es un error de redacción que enseña el concepto incorrectamente.

Corrección: Actualizar el criterio del enunciado:

  Texto actual:
    "Puedes resolver esto con LEFT JOIN (orders a la izquierda, order_items
    a la derecha, filtrando donde orders.order_id IS NULL)"

  Texto corregido:
    "Puedes resolver esto con LEFT JOIN (order_items a la izquierda como tabla
    que quieres preservar completa, orders a la derecha, filtrando donde
    o.order_id IS NULL — las filas sin match en orders son los ítems huérfanos)"
```

---

```
[🔵 SUGERENCIA] — Hallazgo #7
Componente: Ejercicio 05 — Solución (NULLIF en precio promedio por unidad)
Problema: La solución usa correctamente NULLIF para evitar división por cero:

    ROUND(
        SUM(oi.quantity * oi.unit_price) / NULLIF(SUM(oi.quantity), 0),
        2
    ) AS precio_promedio_por_unidad

  Sin embargo, el enunciado del ejercicio no menciona la necesidad de NULLIF
  ni advierte sobre el riesgo de división por cero. El criterio dice solo
  "precio_promedio_por_unidad (redondeado a 2 decimales)".

Impacto: El estudiante que escriba la división directa sin NULLIF obtendrá
  un error de runtime si alguna categoría tiene 0 unidades vendidas. Con los
  datos del seed (INNER JOIN excluye categorías sin ventas), esto no ocurre,
  pero es una práctica defensiva que el estudiante debería aprender aquí.

Corrección: Agregar al criterio del enunciado:
  "Usa NULLIF en el denominador para proteger contra divisiones por cero:
  SUM(oi.quantity) puede ser 0 si el JOIN filtra todos los ítems."
```

---

### Verificación NOT IN con NULLs (punto 8 del checklist)

El Ejercicio 21 usa NOT IN/NOT EXISTS para productos nunca vendidos. La solución provista usa `NOT EXISTS` como forma recomendada y provee `NOT IN` con `WHERE product_id IS NOT NULL` como alternativa documentada. La advertencia sobre NULLs está en el enunciado: "Si usas NOT IN, asegúrate de que la subquery no pueda retornar NULLs." Correcto.

El Ejercicio 23 también cubre NOT EXISTS explícitamente en el enunciado: "Usa NOT EXISTS en lugar de NOT IN para evitar la trampa de NULLs." Correcto.

No hay casos de NOT IN sin protección ni sin advertencia en los 25 ejercicios.

---

## ASPECTOS POSITIVOS

1. **Progresión pedagógica impecable**: la secuencia INNER JOIN → LEFT JOIN → JOINs múltiples + FULL OUTER + Self-Join → Subqueries es exactamente la correcta para construir comprensión acumulativa. Cada lección asume solo lo de las anteriores.

2. **El patrón ON vs WHERE en LEFT JOIN (L2)**: es el concepto más difícil del nivel y está explicado con código comparativo claro, tanto en la sección de sintaxis como en errores comunes y en la solución del ejercicio básico. La nota en la solución sobre por qué el filtro de fecha va en el ON (no en el WHERE) es especialmente buena.

3. **Errores comunes con código real**: todos los errores muestran código que genuinamente falla en PostgreSQL (ambiguedad de columnas, producto cartesiano, GROUP BY incompleto, COUNT(*) vs COUNT(columna), NOT IN con NULLs). Ninguno es un error inventado o que en realidad funciona.

4. **NOT IN con NULLs (L4, Error 4)**: el tratamiento es el más completo del curso hasta ahora. La explicación de la lógica de tres valores (TRUE/FALSE/UNKNOWN), el ejemplo concreto y las dos soluciones alternativas (IS NOT NULL en subquery y NOT EXISTS) son pedagógicamente correctos y suficientes.

5. **Self-join con exclusión del propio producto**: la condición `AND p2.product_id <> p1.product_id` está presente en el ejemplo principal y su ausencia se enseña como error en la sección de errores comunes. Coherencia entre ejemplo y error bien lograda.

6. **COALESCE para mostrar 0 en lugar de NULL**: presente en los ejercicios 10, 11 y en la solución del ejercicio intermedio de L2. El concepto se refuerza en múltiples contextos sin repetir innecesariamente.

7. **Solución Ejercicio 24 (whales)**: usa `SUM / NULLIF(COUNT(DISTINCT o.order_id), 0)` para el ticket promedio — protección defensiva correcta. Además usa `ROUND` en el SELECT exterior, no en la subquery interior, lo que es el patrón correcto para redondear solo el resultado final.

8. **Ejercicio 25 (integrador)**: articula bien todos los conceptos del nivel: 4 tablas, filtro de período, exclusión de status, HAVING con umbral, 5 métricas distintas. Es un ejercicio de cierre de nivel bien calibrado para la complejidad esperada.

---

## CORRECCIONES QUE EL SQL-TEACHER DEBE APLICAR (lista priorizada)

### Bloqueantes (aplicar antes de publicar)

**[IMP-09] L1-S2-VAR2 — Tabla `returns` en ejemplo de Nivel 3**
Archivo: `modulos/nivel-03-joins/leccion-01.md`
Sección: "2. SINTAXIS — Variante 2 — JOIN con múltiples condiciones en el ON"
Acción: Reemplazar el ejemplo que usa `returns r` con un ejemplo usando tablas del Nivel 3,
o marcarlo explícitamente como adelanto del Nivel 4 con nota visual diferenciada.
Código de reemplazo sugerido (ver Hallazgo #1 en este informe).

**[IMP-10] EJ12 — Enunciado describe LEFT JOIN al revés**
Archivo: `modulos/nivel-03-joins/ejercicios-nivel-03.sql`
Sección: Enunciado del Ejercicio 12, línea del criterio
Acción: Corregir la descripción del LEFT JOIN en el criterio para que indique que
`order_items` va a la izquierda (no `orders`). Ver texto corregido en Hallazgo #6.

**[IMP-11] EJ10 — Ambigüedad en la definición del período (días inclusive/exclusive)**
Archivo: `modulos/nivel-03-joins/ejercicios-nivel-03.sql`
Sección: Enunciado del Ejercicio 10
Acción: Especificar explícitamente que el 10 de mayo está incluido en el período y
agregar el rango de filtro esperado al criterio. Ver texto corregido en Hallazgo #5.

### No bloqueantes (mejoras de calidad)

**[SUG-07] L4-EJ-Q3 — Agregar comentario inline sobre seguridad de NOT IN**
Archivo: `modulos/nivel-03-joins/leccion-04.md`
Sección: Sección 3, Query 3
Acción: Agregar comentario que referencie el Error 4 y explique por qué esta instancia
específica de NOT IN es segura. Ver texto en Hallazgo #3.

**[SUG-08] L4-EJ-Q1 — Nota sobre subquery escalar repetida**
Archivo: `modulos/nivel-03-joins/leccion-04.md`
Sección: Sección 3, Query 1
Acción: Agregar nota al pie que explique que la repetición de la subquery se resuelve
con tabla derivada o Window Functions. Ver texto en Hallazgo #4.

**[SUG-09] EJ05 — Mencionar NULLIF en el enunciado**
Archivo: `modulos/nivel-03-joins/ejercicios-nivel-03.sql`
Sección: Enunciado del Ejercicio 05, criterio
Acción: Agregar mención de NULLIF en el denominador como práctica defensiva. Ver
texto en Hallazgo #7.

---

## NOTA PARA MEMORIA INSTITUCIONAL

El patrón de usar tablas de niveles superiores en ejemplos de sintaxis (confirmado por segunda vez: N2-L1 con `order_items` y ahora N3-L1 con `returns`) debe verificarse activamente en los Niveles 4 al 8 durante su revisión. Recomendado: al iniciar QA de cada lección, buscar primero todas las tablas referenciadas y validarlas contra el nivel antes de revisar la lógica.
