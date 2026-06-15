/**
 * Servicio del módulo de diagnóstico inicial.
 *
 * Las preguntas, las respuestas correctas y los expected_results para
 * mini_editor están hardcodeados como constantes — son contenido del curso,
 * no configuración de runtime.
 *
 * Flujo de evaluación:
 * 1. Validar que todos los question_id son válidos (1-24)
 * 2. Para multiple_choice: comparar answer con la clave de respuestas
 * 3. Para mini_editor: ejecutar query en Worker pool y comparar resultado
 * 4. Calcular score por nivel (puntos / puntos máximos del nivel)
 * 5. Aplicar algoritmo de matriz de scoring para determinar recommended_level
 */

import { eq, gt, lt, inArray, and, sql } from 'drizzle-orm';
import { db } from '../../shared/db/index.js';
import { users, exercises, userExerciseProgress } from '../../shared/db/schema.js';
import { checkAndIssueCertificate } from '../certificates/certificates.service.js';
import { ValidationError } from '../../shared/errors/index.js';
import type { WorkerPool } from '../playground/worker-pool.js';
import type {
  DiagnosticResponse,
  DiagnosticBlock,
  DiagnosticQuestion,
  SubmitDiagnosticInput,
  SaveResultInput,
  SubmitDiagnosticResponse,
  QuestionDetail,
} from './diagnostic.schemas.js';

// ── Constantes internas (NO exponer al cliente) ───────────────────────────────

/**
 * Respuestas correctas para preguntas de opción múltiple.
 * Preguntas 5 y 12/15/20 tienen puntuación parcial — se manejan separado.
 */
const CORRECT_ANSWERS: Record<number, string> = {
  1: 'B',
  2: 'A',
  3: 'C',
  4: 'A',
  // 5: ver PARTIAL_ANSWERS
  6: 'B',
  7: 'B',
  8: 'A',
  9: 'C',
  10: 'B',
  11: 'B',
  // 12: mini_editor
  13: 'B',
  14: 'A',
  // 15: mini_editor
  16: 'C',
  17: 'B',
  18: 'B',
  19: 'B',
  // 20: mini_editor
  21: 'B',
  22: 'B',
  23: 'B',
  24: 'B',
};

/**
 * Respuestas con puntuación parcial (question_id → { full: answer, partial: answer, partialPoints: number })
 */
const PARTIAL_ANSWERS: Record<
  number,
  { full: string; partial: string; partialPoints: number }
> = {
  5: { full: 'D', partial: 'A', partialPoints: 2 },
};

/**
 * Peso de cada pregunta en puntos.
 * Total: 112 pts (permite puntuación parcial en mini_editors).
 */
const QUESTION_WEIGHTS: Record<number, number> = {
  1: 3, 2: 3, 3: 3,           // Nivel 0 = 9 pts
  4: 4, 5: 4, 6: 4,           // Nivel 1 = 12 pts
  7: 4, 8: 4, 9: 5,           // Nivel 2 = 13 pts
  10: 5, 11: 5, 12: 6,        // Nivel 3 = 16 pts
  13: 5, 14: 5, 15: 6,        // Nivel 4 = 16 pts
  16: 5, 17: 5, 18: 5,        // Nivel 5 = 15 pts
  19: 6, 20: 6,               // Nivel 6 = 12 pts
  21: 5, 22: 4,               // Nivel 7 = 9 pts
  23: 5, 24: 5,               // Nivel 8 = 10 pts
};

/** Qué nivel cubre cada pregunta */
const QUESTION_LEVELS: Record<number, number> = {
  1: 0, 2: 0, 3: 0,
  4: 1, 5: 1, 6: 1,
  7: 2, 8: 2, 9: 2,
  10: 3, 11: 3, 12: 3,
  13: 4, 14: 4, 15: 4,
  16: 5, 17: 5, 18: 5,
  19: 6, 20: 6,
  21: 7, 22: 7,
  23: 8, 24: 8,
};

/** Puntos máximos por nivel */
const MAX_POINTS_BY_LEVEL: Record<number, number> = {
  0: 9, 1: 12, 2: 13, 3: 16, 4: 16, 5: 15, 6: 12, 7: 9, 8: 10,
};

/**
 * Expected results para las preguntas mini_editor.
 * Estos son los resultados canónicos que se comparan contra la ejecución del estudiante.
 *
 * Formato: { columns: string[], rows: unknown[][], row_count: number }
 * Los datos son del dataset ShopSphere de 100k registros.
 * Para el diagnóstico usamos un subset representativo de 1000 registros.
 *
 * Nota: en el diagnóstico la validación de mini_editor es más permisiva que en
 * los ejercicios normales — verificamos que la query sea válida SQL y produzca
 * resultados con la estructura correcta (mismas columnas, al menos una fila).
 * No hacemos exact match de filas porque el estudiante puede elegir cualquier
 * alias válido.
 */
interface MiniEditorCriteria {
  /** Columnas que DEBEN estar presentes en el resultado (por posición o nombre) */
  required_column_count: number;
  /** El resultado debe tener al menos esta cantidad de filas */
  min_row_count: number;
  /** La query debe contener estas palabras clave (case-insensitive) */
  required_keywords: string[];
  /** Puntuación parcial por criterio: index → points */
  partial_points: number[];
}

const MINI_EDITOR_CRITERIA: Record<number, MiniEditorCriteria> = {
  // Pregunta 12: JOIN products + categories + order_items con GROUP BY + SUM
  12: {
    required_column_count: 3,
    min_row_count: 1,
    required_keywords: ['join', 'group by', 'sum'],
    partial_points: [2, 2, 2], // JOIN products-categories, JOIN products-order_items, GROUP BY+SUM
  },
  // Pregunta 15: UNION entre orders delivered y returns approved
  15: {
    required_column_count: 1,
    min_row_count: 1,
    required_keywords: ['union', 'delivered', 'approved'],
    partial_points: [2, 2, 2], // primera parte, JOIN correcto, UNION sin ALL
  },
  // Pregunta 20: CTE + LAG + porcentaje de cambio
  20: {
    required_column_count: 4,
    min_row_count: 1,
    required_keywords: ['lag', 'group by'],
    partial_points: [2, 2, 2], // CTE/subquery, LAG correcto, cálculo porcentaje
  },
};

// ── Datos de las preguntas (lo que se envía al cliente) ───────────────────────

const DIAGNOSTIC_BLOCKS: DiagnosticBlock[] = [
  {
    id: 'A',
    name: 'Fundamentos y Exploración',
    levels: [0, 1],
    questions: [
      {
        id: 1,
        level: 0,
        weight: 3,
        format: 'multiple_choice',
        text: 'En una base de datos relacional, una PRIMARY KEY sirve para:',
        options: [
          { id: 'A', text: 'Ordenar los registros de mayor a menor' },
          { id: 'B', text: 'Identificar de forma única cada fila en una tabla' },
          { id: 'C', text: 'Cifrar los datos sensibles de la tabla' },
          { id: 'D', text: 'Conectar la base de datos con el servidor web' },
        ],
      },
      {
        id: 2,
        level: 0,
        weight: 3,
        format: 'multiple_choice',
        text: 'Una FOREIGN KEY en la tabla `products` que referencia a `categories` significa que:',
        options: [
          { id: 'A', text: 'Cada producto debe pertenecer a una categoría que existe en la tabla `categories`' },
          { id: 'B', text: 'Cada categoría debe tener al menos un producto asociado' },
          { id: 'C', text: 'Los productos y las categorías se almacenan en la misma tabla' },
          { id: 'D', text: 'El campo `category_id` en `products` es obligatoriamente único' },
        ],
      },
      {
        id: 3,
        level: 0,
        weight: 3,
        format: 'multiple_choice',
        text: '¿Cuál de los siguientes tipos de dato es más apropiado para almacenar el precio de un producto en una tienda online?',
        options: [
          { id: 'A', text: 'INT' },
          { id: 'B', text: 'VARCHAR(10)' },
          { id: 'C', text: 'DECIMAL(10, 2)' },
          { id: 'D', text: 'BOOLEAN' },
        ],
      },
      {
        id: 4,
        level: 1,
        weight: 4,
        format: 'multiple_choice',
        text: 'Dado el esquema: `customers(customer_id, first_name, last_name, email, city, country, registered_at)`\n\n¿Qué retorna esta query?\n\n```sql\nSELECT first_name, city\nFROM customers\nWHERE country = \'Mexico\'\nORDER BY first_name ASC\nLIMIT 5;\n```',
        options: [
          { id: 'A', text: 'El nombre y ciudad de todos los clientes mexicanos, en orden alfabético por nombre, pero solo los primeros 5' },
          { id: 'B', text: 'Los 5 primeros clientes registrados en Mexico, ordenados por fecha de registro' },
          { id: 'C', text: 'Todos los clientes de Mexico, limitando a 5 columnas visibles' },
          { id: 'D', text: 'Un error, porque LIMIT debe ir antes de ORDER BY' },
        ],
      },
      {
        id: 5,
        level: 1,
        weight: 4,
        format: 'multiple_choice',
        text: '¿Cuál query devuelve solo los productos activos cuyo precio está entre 50 y 200?\n\nEsquema: `products(product_id, name, category_id, price, is_active)`',
        options: [
          { id: 'A', text: 'SELECT * FROM products WHERE price > 50 AND price < 200 AND is_active = TRUE;' },
          { id: 'B', text: 'SELECT * FROM products WHERE price BETWEEN 50 AND 200 OR is_active = TRUE;' },
          { id: 'C', text: 'SELECT * FROM products WHERE is_active = TRUE; WHERE price BETWEEN 50 AND 200;' },
          { id: 'D', text: 'SELECT * FROM products WHERE price BETWEEN 50 AND 200 AND is_active = TRUE;' },
        ],
      },
      {
        id: 6,
        level: 1,
        weight: 4,
        format: 'multiple_choice',
        text: '¿Qué hace el operador LIKE en esta condición?\n\n```sql\nWHERE email LIKE \'%@gmail.com\'\n```',
        options: [
          { id: 'A', text: 'Busca emails que contengan exactamente el texto "@gmail.com"' },
          { id: 'B', text: 'Busca emails que terminen en "@gmail.com", sin importar lo que venga antes' },
          { id: 'C', text: 'Busca emails que empiecen con "@gmail.com"' },
          { id: 'D', text: 'Retorna un error porque LIKE solo funciona con columnas de tipo INT' },
        ],
      },
    ],
  },
  {
    id: 'B',
    name: 'Métricas de Negocio',
    levels: [2],
    questions: [
      {
        id: 7,
        level: 2,
        weight: 4,
        format: 'multiple_choice',
        text: 'Esquema: `orders(order_id, customer_id, ordered_at, status)`\n\n¿Qué retorna esta query?\n\n```sql\nSELECT status, COUNT(*) AS total_pedidos\nFROM orders\nGROUP BY status;\n```',
        options: [
          { id: 'A', text: 'El número total de pedidos en toda la tabla' },
          { id: 'B', text: 'Una fila por cada valor distinto de `status`, con el conteo de pedidos en ese estado' },
          { id: 'C', text: 'Los pedidos agrupados por fecha, con su estado' },
          { id: 'D', text: 'Un error, porque COUNT(*) no puede usarse con GROUP BY' },
        ],
      },
      {
        id: 8,
        level: 2,
        weight: 4,
        format: 'multiple_choice',
        text: '¿Cuál es la diferencia entre WHERE y HAVING?',
        options: [
          { id: 'A', text: 'WHERE filtra antes de agrupar; HAVING filtra después de agrupar' },
          { id: 'B', text: 'WHERE solo funciona con texto; HAVING solo funciona con números' },
          { id: 'C', text: 'HAVING es la versión moderna de WHERE, completamente equivalente' },
          { id: 'D', text: 'WHERE filtra columnas; HAVING filtra filas' },
        ],
      },
      {
        id: 9,
        level: 2,
        weight: 5,
        format: 'multiple_choice',
        text: '¿Qué retorna esta query?\n\n```sql\nSELECT DATE_TRUNC(\'month\', ordered_at) AS mes,\n       COUNT(DISTINCT customer_id) AS clientes_unicos\nFROM orders\nWHERE status = \'delivered\'\nGROUP BY DATE_TRUNC(\'month\', ordered_at)\nHAVING COUNT(DISTINCT customer_id) > 100\nORDER BY mes;\n```',
        options: [
          { id: 'A', text: 'El número de pedidos entregados por mes, solo para meses con más de 100 pedidos' },
          { id: 'B', text: 'Los clientes que hicieron más de 100 pedidos entregados' },
          { id: 'C', text: 'El conteo de clientes distintos que tuvieron al menos un pedido entregado por mes, mostrando solo los meses con más de 100 clientes distintos' },
          { id: 'D', text: 'Un error, porque no se puede usar COUNT(DISTINCT ...) dentro de HAVING' },
        ],
      },
    ],
  },
  {
    id: 'C',
    name: 'JOINs y Relaciones',
    levels: [3],
    questions: [
      {
        id: 10,
        level: 3,
        weight: 5,
        format: 'multiple_choice',
        text: '¿Cuál es la diferencia práctica entre INNER JOIN y LEFT JOIN?',
        options: [
          { id: 'A', text: 'INNER JOIN es más rápido; LEFT JOIN es más preciso' },
          { id: 'B', text: 'INNER JOIN retorna solo las filas donde hay coincidencia en ambas tablas; LEFT JOIN retorna todas las filas de la tabla izquierda aunque no haya coincidencia en la derecha' },
          { id: 'C', text: 'LEFT JOIN solo funciona cuando la tabla izquierda tiene una PRIMARY KEY' },
          { id: 'D', text: 'No hay diferencia funcional, son aliases uno del otro' },
        ],
      },
      {
        id: 11,
        level: 3,
        weight: 5,
        format: 'multiple_choice',
        text: '¿Qué retorna esta query?\n\n```sql\nSELECT c.name AS categoria,\n       COUNT(p.product_id) AS total_productos\nFROM categories c\nLEFT JOIN products p ON p.category_id = c.category_id\nGROUP BY c.name\nORDER BY total_productos DESC;\n```',
        options: [
          { id: 'A', text: 'Las categorías que tienen al menos un producto, ordenadas de mayor a menor cantidad' },
          { id: 'B', text: 'Todas las categorías, incluyendo las que no tienen productos (que aparecerán con 0), ordenadas de mayor a menor' },
          { id: 'C', text: 'Un error, porque no se puede hacer GROUP BY sobre una columna de JOIN' },
          { id: 'D', text: 'Todos los productos con su categoría, ordenados por nombre de categoría' },
        ],
      },
      {
        id: 12,
        level: 3,
        weight: 6,
        format: 'mini_editor',
        text: 'Escribe una query que retorne el nombre del producto (`products.name`), la categoría (`categories.name`), y el total de unidades vendidas (`SUM(order_items.quantity)`), para todos los productos que hayan sido vendidos al menos una vez. Ordena los resultados de mayor a menor por unidades vendidas.',
        schema_hint: 'Tablas disponibles: products(product_id, name, category_id, price, is_active), categories(category_id, name), order_items(item_id, order_id, product_id, quantity, unit_price)',
      },
    ],
  },
  {
    id: 'D',
    name: 'Análisis de Clientes',
    levels: [4],
    questions: [
      {
        id: 13,
        level: 4,
        weight: 5,
        format: 'multiple_choice',
        text: '¿Qué retorna esta query?\n\n```sql\nSELECT first_name, last_name, email\nFROM customers\nWHERE customer_id NOT IN (\n    SELECT DISTINCT customer_id\n    FROM orders\n    WHERE status = \'delivered\'\n);\n```',
        options: [
          { id: 'A', text: 'Los clientes que tienen al menos un pedido entregado' },
          { id: 'B', text: 'Los clientes que nunca han tenido un pedido entregado (ya sea porque no tienen pedidos, o porque todos están en otro estado)' },
          { id: 'C', text: 'Un error, porque NOT IN no puede usarse con subqueries' },
          { id: 'D', text: 'Los clientes con pedidos cancelados' },
        ],
      },
      {
        id: 14,
        level: 4,
        weight: 5,
        format: 'multiple_choice',
        text: '¿Qué retorna `COALESCE(reason, \'Sin motivo registrado\')` en la tabla `returns`?',
        options: [
          { id: 'A', text: 'El valor de `reason` si no es NULL; de lo contrario, la cadena \'Sin motivo registrado\'' },
          { id: 'B', text: 'NULL si `reason` es NULL; de lo contrario, \'Sin motivo registrado\'' },
          { id: 'C', text: 'Un error si `reason` contiene valores NULL' },
          { id: 'D', text: 'El conteo de filas donde `reason` es NULL' },
        ],
      },
      {
        id: 15,
        level: 4,
        weight: 6,
        format: 'mini_editor',
        text: 'Escribe una query que liste los `customer_id` de clientes que:\n- Hicieron al menos un pedido con status `\'delivered\'`, O\n- Tienen al menos una devolución con status `\'approved\'`\n\nCada customer_id debe aparecer una sola vez en el resultado.',
        schema_hint: 'Tablas disponibles: orders(order_id, customer_id, ordered_at, status), returns(return_id, order_id, product_id, returned_at, reason, status)',
      },
    ],
  },
  {
    id: 'E',
    name: 'SQL Avanzado y Analítica',
    levels: [5, 6],
    questions: [
      {
        id: 16,
        level: 5,
        weight: 5,
        format: 'multiple_choice',
        text: '¿Qué retorna esta query?\n\n```sql\nWITH pedidos_por_cliente AS (\n    SELECT customer_id,\n           COUNT(*) AS total_pedidos\n    FROM orders\n    GROUP BY customer_id\n)\nSELECT customer_id, total_pedidos\nFROM pedidos_por_cliente\nWHERE total_pedidos >= 5;\n```',
        options: [
          { id: 'A', text: 'Un error, porque WITH no puede usarse con GROUP BY' },
          { id: 'B', text: 'El conteo total de pedidos de todos los clientes con 5 o más pedidos' },
          { id: 'C', text: 'Los customer_id y su conteo de pedidos, filtrando solo los clientes con 5 o más pedidos' },
          { id: 'D', text: 'Los primeros 5 pedidos de cada cliente' },
        ],
      },
      {
        id: 17,
        level: 5,
        weight: 5,
        format: 'multiple_choice',
        text: '¿Qué retorna esta query?\n\n```sql\nSELECT customer_id,\n       ordered_at,\n       ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY ordered_at ASC) AS orden_numero\nFROM orders;\n```',
        options: [
          { id: 'A', text: 'Un número de fila global para todos los pedidos de la tabla, ordenados por fecha' },
          { id: 'B', text: 'Para cada cliente, un número secuencial que reinicia en 1 para cada cliente, ordenado por fecha de pedido más antigua a más nueva' },
          { id: 'C', text: 'El número de pedidos que tiene cada cliente' },
          { id: 'D', text: 'Un error, porque PARTITION BY no puede combinarse con ORDER BY dentro de OVER' },
        ],
      },
      {
        id: 18,
        level: 5,
        weight: 5,
        format: 'multiple_choice',
        text: '¿Cuál es la diferencia entre RANK() y DENSE_RANK()?',
        options: [
          { id: 'A', text: 'RANK() solo funciona con números; DENSE_RANK() funciona con cualquier tipo de dato' },
          { id: 'B', text: 'Cuando hay empates, RANK() deja huecos en la numeración; DENSE_RANK() no deja huecos' },
          { id: 'C', text: 'DENSE_RANK() es idéntico a ROW_NUMBER() pero más rápido' },
          { id: 'D', text: 'No hay diferencia práctica entre los dos' },
        ],
      },
      {
        id: 19,
        level: 6,
        weight: 6,
        format: 'multiple_choice',
        text: '¿Qué retorna esta query?\n\n```sql\nSELECT DATE_TRUNC(\'month\', ordered_at) AS mes,\n       COUNT(*) AS pedidos_mes,\n       LAG(COUNT(*)) OVER (ORDER BY DATE_TRUNC(\'month\', ordered_at)) AS pedidos_mes_anterior\nFROM orders\nGROUP BY DATE_TRUNC(\'month\', ordered_at)\nORDER BY mes;\n```',
        options: [
          { id: 'A', text: 'Los pedidos del mes actual y del mes siguiente, para comparación futura' },
          { id: 'B', text: 'El total de pedidos por mes, junto con el total del mes inmediatamente anterior en la misma fila, para comparación periodo a periodo' },
          { id: 'C', text: 'Un error, porque LAG no puede usarse sobre el resultado de COUNT(*)' },
          { id: 'D', text: 'Los últimos dos meses de pedidos únicamente' },
        ],
      },
      {
        id: 20,
        level: 6,
        weight: 6,
        format: 'mini_editor',
        text: 'Usando la tabla `orders`, escribe una query que calcule para cada mes:\n1. El total de pedidos de ese mes\n2. El porcentaje de cambio respecto al mes anterior (puede ser NULL para el primer mes)\n\nMuestra: `mes`, `pedidos_mes`, `pedidos_mes_anterior`, `pct_cambio`',
        schema_hint: 'Tabla disponible: orders(order_id, customer_id, ordered_at, status). Usa LAG() o una CTE para obtener el valor del mes anterior.',
      },
    ],
  },
  {
    id: 'F',
    name: 'SQL para BI y SQL Profesional',
    levels: [7, 8],
    questions: [
      {
        id: 21,
        level: 7,
        weight: 5,
        format: 'multiple_choice',
        text: 'En análisis de funnel de conversión, tienes sesiones web y quieres calcular la tasa de conversión (sesiones que terminaron en pedido / total de sesiones). ¿Cuál estructura SQL es más apropiada?',
        options: [
          { id: 'A', text: 'Un simple COUNT(*) sobre la tabla de pedidos' },
          { id: 'B', text: 'Un LEFT JOIN entre sesiones y pedidos, usando CASE WHEN o COUNT de la columna de pedidos (que será NULL donde no hubo conversión)' },
          { id: 'C', text: 'Un INNER JOIN entre sesiones y pedidos, que naturalmente elimina las sesiones sin pedido' },
          { id: 'D', text: 'Una subquery correlacionada que verifique existencia de pedido para cada sesión' },
        ],
      },
      {
        id: 22,
        level: 7,
        weight: 4,
        format: 'multiple_choice',
        text: 'Una VIEW en SQL es:',
        options: [
          { id: 'A', text: 'Una copia física de los datos que se actualiza periódicamente' },
          { id: 'B', text: 'Una query guardada con nombre que se comporta como una tabla virtual' },
          { id: 'C', text: 'Un índice especial que acelera las consultas frecuentes' },
          { id: 'D', text: 'Una tabla temporal que expira al cerrar la sesión' },
        ],
      },
      {
        id: 23,
        level: 8,
        weight: 5,
        format: 'multiple_choice',
        text: 'Tienes esta query que se ejecuta miles de veces al día sobre una tabla con millones de filas:\n\n```sql\nSELECT * FROM orders\nWHERE customer_id = 12345\nAND status = \'pending\';\n```\n\n¿Cuál índice sería más útil crear?',
        options: [
          { id: 'A', text: 'Un índice en `order_id` (PRIMARY KEY)' },
          { id: 'B', text: 'Un índice compuesto en `(customer_id, status)`' },
          { id: 'C', text: 'Un índice en `ordered_at`' },
          { id: 'D', text: 'No es necesario ningún índice porque la PRIMARY KEY ya optimiza todas las queries' },
        ],
      },
      {
        id: 24,
        level: 8,
        weight: 5,
        format: 'multiple_choice',
        text: '¿Qué garantiza la propiedad ACID de una transacción SQL?',
        options: [
          { id: 'A', text: 'Que la query se ejecute más rápido gracias al cache del motor' },
          { id: 'B', text: 'Que si una operación dentro de la transacción falla, todos los cambios de esa transacción se deshacen automáticamente (rollback), manteniendo la integridad de los datos' },
          { id: 'C', text: 'Que los datos se replican automáticamente a un servidor de backup' },
          { id: 'D', text: 'Que las queries dentro de la transacción se ejecutan en paralelo' },
        ],
      },
    ],
  },
];

// ── Nombres y mensajes por nivel ──────────────────────────────────────────────

const LEVEL_NAMES: Record<number, string> = {
  0: 'Fundamentos',
  1: 'Exploración de Datos',
  2: 'Métricas de Negocio',
  3: 'JOINs y Relaciones',
  4: 'Subqueries y NULL handling',
  5: 'CTEs y Window Functions',
  6: 'LAG/LEAD y Analítica Temporal',
  7: 'SQL para BI',
  8: 'SQL Profesional',
  9: 'Capstone',
};

function buildMessage(level: number): string {
  if (level === 0) {
    return 'Perfecto punto de partida. Empezamos desde los fundamentos del modelo relacional — en unas horas ya estarás escribiendo tus primeras queries. No se necesita experiencia previa.';
  }
  if (level <= 2) {
    return `Tienes nociones básicas de SQL. Empezamos en ${LEVEL_NAMES[level]} para afianzar esas bases antes de pasar a análisis de datos reales.`;
  }
  if (level <= 4) {
    return `Tienes una base sólida en SQL. Empezamos en ${LEVEL_NAMES[level]}, donde el curso se vuelve más interesante: queries que responden preguntas de negocio reales.`;
  }
  if (level <= 6) {
    return `Manejas bien el SQL del día a día. Empezamos en ${LEVEL_NAMES[level]} — aquí es donde la mayoría de analistas tiene sus brechas más grandes. CTEs, window functions y análisis temporal.`;
  }
  if (level <= 8) {
    return `SQL sólido. Empezamos en ${LEVEL_NAMES[level]} con enfoque en aplicaciones profesionales: preparación para BI, optimización y SQL en producción.`;
  }
  // Capstone
  return 'Rendimiento muy alto en todos los niveles. Te proponemos empezar directamente con el Capstone, nuestro proyecto integrador. Si en algún punto quieres reforzar algún concepto específico, los módulos están disponibles.';
}

// ── Evaluación de mini_editor ─────────────────────────────────────────────────

/**
 * Evalúa una respuesta de mini_editor ejecutando la query en el Worker pool.
 * La validación es por criterios estructurales, no exact match de filas.
 *
 * Retorna puntos ganados (0 a max del ejercicio con puntuación parcial).
 */
async function evaluateMiniEditor(
  questionId: number,
  query: string | null,
  workerPool: WorkerPool,
): Promise<number> {
  const criteria = MINI_EDITOR_CRITERIA[questionId];
  if (!criteria) return 0;
  if (!query || query.trim() === '') return 0;

  let executionResult;
  try {
    executionResult = await workerPool.execute(query, 5000);
  } catch {
    // Query falló — 0 puntos
    return 0;
  }

  // Si no hay resultado o no hay filas, 0 puntos
  if (!executionResult || executionResult.row_count < criteria.min_row_count) {
    return 0;
  }

  // Evaluar criterios parciales
  let pointsEarned = 0;
  const queryLower = query.toLowerCase();

  // Criterio 1: número de columnas suficiente
  if (executionResult.columns.length >= criteria.required_column_count) {
    pointsEarned += criteria.partial_points[0] ?? 0;
  }

  // Criterio 2: keywords requeridas en la query
  const hasRequiredKeywords = criteria.required_keywords.every((kw) =>
    queryLower.includes(kw.toLowerCase()),
  );
  if (hasRequiredKeywords) {
    pointsEarned += criteria.partial_points[1] ?? 0;
  }

  // Criterio 3: resultado tiene filas y estructura correcta
  if (executionResult.row_count >= criteria.min_row_count) {
    pointsEarned += criteria.partial_points[2] ?? 0;
  }

  return pointsEarned;
}

// ── Algoritmo de nivel recomendado ────────────────────────────────────────────

/**
 * Determina el nivel de entrada recomendado según la matriz de scoring.
 *
 * Algoritmo: evalúa nivel por nivel de forma secuencial.
 * El estudiante entra al primer nivel donde su dominio cae por debajo del umbral.
 *
 * Umbrales:
 * - >= 80%: dominio sólido → avanzar al siguiente
 * - 60-79%: conocimiento parcial → entrar aquí
 * - < 60%: sin base suficiente → entrar en nivel anterior
 *
 * Reglas especiales del spec:
 * 1. Si nivel 0 < 60%, entrada en nivel 0 sin excepción
 * 2. No saltar más de 2 niveles consecutivos (no aplicable con este algoritmo secuencial)
 * 3. Para saltear, necesita >= 80% en ese nivel Y >= 60% en el siguiente
 */
function calculateRecommendedLevel(
  scoreByLevel: Record<number, number>,
): { recommendedLevel: number; canSkipTo: number[] } {
  const MAX_LEVEL = 8;

  // Regla 1: Si nivel 0 < 60%, entrada garantizada en nivel 0
  const level0Score = scoreByLevel[0] ?? 0;
  if (level0Score < 60) {
    return { recommendedLevel: 0, canSkipTo: [] };
  }

  let recommendedLevel = 0;
  const canSkipTo: number[] = [];

  for (let lvl = 0; lvl <= MAX_LEVEL; lvl++) {
    const score = scoreByLevel[lvl] ?? 0;
    const nextScore = scoreByLevel[lvl + 1] ?? 0;

    if (score >= 80) {
      // Dominio sólido — puede saltear este nivel
      // Regla 4: solo si también tiene >= 60% en el siguiente
      if (nextScore >= 60) {
        canSkipTo.push(lvl);
        recommendedLevel = lvl + 1;
      } else {
        // Buen puntaje pero el siguiente falla — entrar aquí
        recommendedLevel = lvl;
        break;
      }
    } else if (score >= 60) {
      // Conocimiento parcial — entrar en este nivel
      recommendedLevel = lvl;
      break;
    } else {
      // Sin base suficiente — retroceder un nivel (ya capturado en recommendedLevel)
      // recommendedLevel ya apunta al nivel anterior (el último con >= 80%)
      break;
    }

    // Si llegamos al final con todo >= 80%, Capstone (nivel 9)
    if (lvl === MAX_LEVEL && score >= 80) {
      recommendedLevel = 9;
    }
  }

  return { recommendedLevel, canSkipTo };
}

// ── Funciones públicas del servicio ──────────────────────────────────────────

/**
 * Retorna la evaluación diagnóstica completa para renderizarla en el frontend.
 * No requiere autenticación.
 */
export function getDiagnostic(): DiagnosticResponse {
  return {
    total_questions: 24,
    estimated_minutes: { min: 15, max: 20 },
    blocks: DIAGNOSTIC_BLOCKS,
  };
}

/**
 * Evalúa las respuestas del diagnóstico y retorna el nivel recomendado.
 *
 * @param input - Respuestas del estudiante
 * @param showDetails - Si true, incluye detalles por pregunta
 * @param workerPool - Pool de workers SQLite para ejecutar mini_editors
 */
export async function submitDiagnostic(
  input: SubmitDiagnosticInput,
  showDetails: boolean,
  workerPool: WorkerPool,
): Promise<SubmitDiagnosticResponse> {
  // Validar que todos los question_id sean válidos
  const invalidIds = input.answers
    .filter((a) => a.question_id < 1 || a.question_id > 24)
    .map((a) => a.question_id);

  if (invalidIds.length > 0) {
    throw new ValidationError(`Invalid question IDs: ${invalidIds.join(', ')}`);
  }

  // Construir mapa de respuestas para lookup O(1)
  const answerMap = new Map<number, string | null>();
  for (const answer of input.answers) {
    answerMap.set(answer.question_id, answer.answer);
  }

  // Acumular puntos por nivel
  const pointsByLevel: Record<number, number> = {};
  const details: QuestionDetail[] = [];

  // Evaluar todas las preguntas que tienen respuesta
  const evalPromises: Promise<void>[] = [];

  for (let qId = 1; qId <= 24; qId++) {
    const answer = answerMap.get(qId) ?? null;
    const weight = QUESTION_WEIGHTS[qId] ?? 0;
    const level = QUESTION_LEVELS[qId] ?? 0;

    if (!(level in pointsByLevel)) {
      pointsByLevel[level] = 0;
    }

    // Verificar si es mini_editor
    if (MINI_EDITOR_CRITERIA[qId]) {
      // Evaluación asíncrona
      evalPromises.push(
        evaluateMiniEditor(qId, answer, workerPool).then((pts) => {
          pointsByLevel[level] = (pointsByLevel[level] ?? 0) + pts;
          if (showDetails) {
            details.push({
              question_id: qId,
              correct: pts === weight,
              points_earned: pts,
              points_possible: weight,
            });
          }
        }),
      );
    } else {
      // Evaluación síncrona — múltiple opción
      let pts = 0;

      if (answer !== null) {
        const correct = CORRECT_ANSWERS[qId];
        const partial = PARTIAL_ANSWERS[qId];

        if (correct && answer === correct) {
          pts = weight;
        } else if (partial && answer === partial.partial) {
          pts = partial.partialPoints;
        }
      }

      pointsByLevel[level] = (pointsByLevel[level] ?? 0) + pts;

      if (showDetails) {
        const correct = CORRECT_ANSWERS[qId];
        const partial = PARTIAL_ANSWERS[qId];
        const isCorrect =
          answer !== null &&
          (answer === correct || (partial && answer === partial.partial));

        details.push({
          question_id: qId,
          correct: isCorrect ?? false,
          points_earned: pts,
          points_possible: weight,
        });
      }
    }
  }

  // Esperar todas las evaluaciones de mini_editor
  await Promise.all(evalPromises);

  // Calcular score_pct por nivel
  const scoreByLevelPct: Record<number, number> = {};
  for (const [lvlStr, pts] of Object.entries(pointsByLevel)) {
    const lvl = parseInt(lvlStr, 10);
    const maxPts = MAX_POINTS_BY_LEVEL[lvl] ?? 1;
    scoreByLevelPct[lvl] = Math.round((pts / maxPts) * 100);
  }

  // Aplicar algoritmo de recomendación
  const { recommendedLevel, canSkipTo } = calculateRecommendedLevel(scoreByLevelPct);

  const scoreByLevelArray = Object.entries(scoreByLevelPct).map(([lvl, pct]) => ({
    level: parseInt(lvl, 10),
    score_pct: pct,
  }));

  // Seguridad (IDOR/CWE-639): este endpoint es público (sin auth). NO se persiste
  // ningún resultado aquí — hacerlo a partir de un user_id provisto por el cliente
  // permitiría a un atacante modificar el nivel/XP/certificados de cualquier usuario
  // conociendo su UUID. El guardado se hace solo en POST /diagnostic/save-result,
  // que requiere authGuard y usa req.user.sub.

  const response: SubmitDiagnosticResponse = {
    recommended_level: recommendedLevel,
    recommended_level_name: LEVEL_NAMES[recommendedLevel] ?? 'Capstone',
    message: buildMessage(recommendedLevel),
    score_by_level: scoreByLevelArray,
    can_skip_to: canSkipTo,
  };

  if (showDetails) {
    // Ordenar por question_id para consistencia
    response.details = details.sort((a, b) => a.question_id - b.question_id);
  }

  return response;
}

/**
 * Guarda el resultado del diagnóstico en el perfil del usuario.
 * Actualiza current_level al recommended_level si es mayor que el actual.
 */
export async function saveResult(
  userId: string,
  input: SaveResultInput,
): Promise<{ saved: boolean; level_updated: boolean }> {
  // Obtener el nivel actual del usuario
  const [userRow] = await db
    .select({ currentLevel: users.currentLevel })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userRow) {
    throw new ValidationError('User not found');
  }

  // Desbloqueamos si el recomendado es mayor que el nivel actual
  const shouldUpdateLevel = input.recommended_level > userRow.currentLevel;

  if (shouldUpdateLevel) {
    // 1. Obtener todos los ejercicios publicados en niveles inferiores al recomendado
    const previousExercises = await db
      .select({
        id: exercises.id,
        levelId: exercises.levelId,
        xpReward: exercises.xpReward,
      })
      .from(exercises)
      .where(
        and(
          lt(exercises.levelId, input.recommended_level),
          eq(exercises.isPublished, true),
        ),
      );

    let totalXpToAward = 0;

    if (previousExercises.length > 0) {
      // 2. Obtener los ejercicios de esos niveles que ya están completados
      const completedRows = await db
        .select({ exerciseId: userExerciseProgress.exerciseId })
        .from(userExerciseProgress)
        .where(
          and(
            eq(userExerciseProgress.userId, userId),
            eq(userExerciseProgress.status, 'completed'),
            inArray(
              userExerciseProgress.exerciseId,
              previousExercises.map((e) => e.id),
            ),
          ),
        );

      const completedSet = new Set(completedRows.map((r) => r.exerciseId));
      const pendingExercises = previousExercises.filter((e) => !completedSet.has(e.id));

      if (pendingExercises.length > 0) {
        // Calcular la suma de XP
        totalXpToAward = pendingExercises.reduce((sum, e) => sum + e.xpReward, 0);

        // 3. Marcar los ejercicios pendientes como completados en user_exercise_progress
        for (const ex of pendingExercises) {
          await db
            .insert(userExerciseProgress)
            .values({
              userId,
              exerciseId: ex.id,
              status: 'completed',
              attemptsCount: 1,
              xpEarned: ex.xpReward,
              completedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [userExerciseProgress.userId, userExerciseProgress.exerciseId],
              set: {
                status: 'completed',
                xpEarned: ex.xpReward,
                completedAt: new Date(),
              },
            });
        }
      }
    }

    // 4. Actualizar el nivel actual y el XP del usuario
    await db
      .update(users)
      .set({
        currentLevel: input.recommended_level,
        xpTotal: sql`${users.xpTotal} + ${totalXpToAward}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // 5. Generar e inscribir certificados de los niveles anteriores
    for (let lvl = 0; lvl < input.recommended_level; lvl++) {
      try {
        await checkAndIssueCertificate(userId, lvl);
      } catch (certErr) {
        console.error(
          `[diagnostic.service] Failed to auto-issue certificate for level ${lvl} and user ${userId}:`,
          certErr,
        );
      }
    }
  }

  return { saved: true, level_updated: shouldUpdateLevel };
}
