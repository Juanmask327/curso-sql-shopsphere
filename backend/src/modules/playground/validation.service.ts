/**
 * Servicio de validación de respuestas del Playground.
 *
 * Implementa el algoritmo de la Decisión 2 del documento de arquitectura:
 * compara canónicamente el resultado del estudiante contra el expected_result
 * pre-calculado, según el validation_mode del ejercicio.
 *
 * No sabe nada de HTTP — recibe datos, retorna un resultado de validación.
 */

import type { QueryResult } from './worker-pool.js';
import type { ExpectedResult } from '../exercises/exercises.service.js';

// ── Tipos de salida ───────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  hint?: string;
  /** 1 = orientación general, 2 = más específico, 3 = muy específico */
  hint_level?: 1 | 2 | 3;
  row_count_got?: number;
  row_count_expected?: number;
}

export type ValidationMode = 'exact_ordered' | 'exact_unordered' | 'schema_match';

// ── Normalización de valores ──────────────────────────────────────────────────

/**
 * Coerción de tipos para comparación robusta.
 * SQLite es loosely typed — necesitamos normalizar antes de comparar.
 *
 * Reglas (de la Decisión 2):
 * - Números: Number() — permite comparar "5" con 5
 * - Fechas: normalizar a ISO 8601
 * - NULL: null === null (distinto al comportamiento SQL estándar donde NULL != NULL)
 * - Strings: trim() para eliminar espacios accidentales
 */
function normalizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();

    // Intentar parsear como número
    if (trimmed !== '' && !isNaN(Number(trimmed))) {
      return Number(trimmed);
    }

    // Intentar parsear como fecha ISO 8601
    // Solo si parece una fecha (contiene '-' o '/')
    if (/\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    return trimmed;
  }

  if (typeof value === 'number') {
    // Serializar NaN/Infinity como null para evitar comportamientos extraños
    if (!isFinite(value)) return null;
    return value;
  }

  if (typeof value === 'boolean') {
    // SQLite no tiene booleanos nativos — normalizamos a 0/1
    return value ? 1 : 0;
  }

  return value;
}

/**
 * Normaliza una fila completa aplicando normalizeValue a cada celda.
 */
function normalizeRow(row: unknown[]): unknown[] {
  return row.map(normalizeValue);
}

/**
 * Serializa una fila normalizada como string JSON con claves ordenadas.
 * Usado para comparación en modo exact_unordered.
 */
function serializeRow(row: unknown[]): string {
  return JSON.stringify(normalizeRow(row));
}

// ── Comparadores ──────────────────────────────────────────────────────────────

/**
 * Compara nombres de columnas de forma case-insensitive.
 * Retorna true si son los mismos en el mismo orden.
 */
function columnsMatch(got: string[], expected: string[]): boolean {
  if (got.length !== expected.length) return false;
  return got.every(
    (col, i) => col.toLowerCase() === expected[i]!.toLowerCase(),
  );
}

/**
 * Modo exact_ordered: mismo número de columnas, mismos nombres, mismas filas
 * en el mismo orden. Para ejercicios con ORDER BY explícito.
 */
function validateExactOrdered(
  got: QueryResult,
  expected: ExpectedResult,
): ValidationResult {
  if (!columnsMatch(got.columns, expected.columns)) {
    return {
      valid: false,
      hint: 'Los tipos de dato o nombres de columna no coinciden. Verifica que seleccionas las columnas correctas.',
      hint_level: 2,
      row_count_got: got.row_count,
      row_count_expected: expected.row_count,
    };
  }

  if (got.row_count !== expected.row_count) {
    return buildRowCountHint(got.row_count, expected.row_count);
  }

  // Comparación fila a fila en orden
  for (let i = 0; i < expected.rows.length; i++) {
    const gotRow = normalizeRow(got.rows[i] ?? []);
    const expectedRow = normalizeRow(expected.rows[i] as unknown[]);

    if (JSON.stringify(gotRow) !== JSON.stringify(expectedRow)) {
      return {
        valid: false,
        hint: 'Las filas son correctas pero el orden no coincide. Revisa tu cláusula ORDER BY.',
        hint_level: 2,
        row_count_got: got.row_count,
        row_count_expected: expected.row_count,
      };
    }
  }

  return { valid: true };
}

/**
 * Modo exact_unordered: mismo multiset de filas, orden irrelevante.
 * Para la mayoría de ejercicios SELECT sin ORDER BY requerido.
 *
 * Implementación: serializar cada fila como JSON ordenado, comparar contadores.
 * Usamos un Map en lugar de Set para manejar correctamente filas duplicadas.
 */
function validateExactUnordered(
  got: QueryResult,
  expected: ExpectedResult,
): ValidationResult {
  if (!columnsMatch(got.columns, expected.columns)) {
    return {
      valid: false,
      hint: 'Los tipos de dato o nombres de columna no coinciden. Verifica que seleccionas las columnas correctas.',
      hint_level: 2,
      row_count_got: got.row_count,
      row_count_expected: expected.row_count,
    };
  }

  if (got.row_count !== expected.row_count) {
    return buildRowCountHint(got.row_count, expected.row_count);
  }

  // Construir multisets como Map<serialized_row, count>
  const expectedMap = buildRowMultiset(expected.rows as unknown[][]);
  const gotMap = buildRowMultiset(got.rows as unknown[][]);

  // Si la cantidad de filas en expected es menor a la cantidad de filas total esperada,
  // solo podemos verificar que las filas de la muestra estén incluidas en el resultado.
  const isSubsetOnly = expected.rows.length < expected.row_count;

  if (!isSubsetOnly && expectedMap.size !== gotMap.size) {
    return {
      valid: false,
      hint: 'Las filas no coinciden. Revisa tu condición WHERE o los JOINs.',
      hint_level: 1,
      row_count_got: got.row_count,
      row_count_expected: expected.row_count,
    };
  }

  for (const [key, count] of expectedMap) {
    const gotCount = gotMap.get(key) ?? 0;
    if (isSubsetOnly) {
      if (gotCount < count) {
        return {
          valid: false,
          hint: 'Las filas no coinciden. Revisa tu condición WHERE o los JOINs.',
          hint_level: 1,
          row_count_got: got.row_count,
          row_count_expected: expected.row_count,
        };
      }
    } else {
      if (gotCount !== count) {
        return {
          valid: false,
          hint: 'Las filas no coinciden. Revisa tu condición WHERE o los JOINs.',
          hint_level: 1,
          row_count_got: got.row_count,
          row_count_expected: expected.row_count,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Modo schema_match: solo comparar estructura de columnas.
 * Para ejercicios DDL o cuando solo importa el schema resultante.
 */
function validateSchemaMatch(
  got: QueryResult,
  expected: ExpectedResult,
): ValidationResult {
  if (!columnsMatch(got.columns, expected.columns)) {
    return {
      valid: false,
      hint: `Las columnas no coinciden. Esperadas: ${expected.columns.join(', ')}. Obtenidas: ${got.columns.join(', ')}.`,
      hint_level: 2,
    };
  }

  return { valid: true };
}

// ── Helpers internos ──────────────────────────────────────────────────────────

function buildRowMultiset(rows: unknown[][]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = serializeRow(row);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

function buildRowCountHint(
  gotCount: number,
  expectedCount: number,
): ValidationResult {
  if (gotCount > expectedCount) {
    return {
      valid: false,
      hint: 'Obtienes más filas de las esperadas. Puede que tengas filas duplicadas. Considera DISTINCT o revisa tus JOINs.',
      hint_level: 2,
      row_count_got: gotCount,
      row_count_expected: expectedCount,
    };
  }

  return {
    valid: false,
    hint: 'Te faltan filas. Verifica que no estás filtrando datos válidos con un WHERE demasiado restrictivo.',
    hint_level: 2,
    row_count_got: gotCount,
    row_count_expected: expectedCount,
  };
}

// ── Función principal de validación ──────────────────────────────────────────

/**
 * Valida el resultado de la query del estudiante contra el expected_result.
 * Aplica el modo de validación del ejercicio.
 *
 * No ejecuta queries — recibe los resultados ya ejecutados.
 * La ejecución ocurre en playground.service usando el WorkerPool.
 */
export function validate(
  got: QueryResult,
  expected: ExpectedResult,
  mode: ValidationMode,
): ValidationResult {
  switch (mode) {
    case 'exact_ordered':
      return validateExactOrdered(got, expected);
    case 'exact_unordered':
      return validateExactUnordered(got, expected);
    case 'schema_match':
      return validateSchemaMatch(got, expected);
    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = mode;
      void _exhaustive;
      return { valid: false, hint: `Unknown validation mode: ${String(mode)}` };
    }
  }
}

/**
 * Calcula el XP ganado aplicando penalización por hints usados.
 * -10% por cada hint usado.
 * Mínimo: 1 XP (nunca 0 por completar un ejercicio).
 */
export function calculateXp(
  baseXp: number,
  hintsUsed: number,
): number {
  const penaltyPerHint = 0.1; // 10% por hint
  const totalPenalty = Math.min(hintsUsed * penaltyPerHint, 0.9); // máximo 90% de penalización
  const earnedXp = Math.round(baseXp * (1 - totalPenalty));
  return Math.max(earnedXp, 1);
}
