import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { CellValue, ColumnType } from "./types";

// ===================================================================
// Tailwind class merging utility (shadcn/ui compatible)
// ===================================================================
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ===================================================================
// SQL Type Inference
// ===================================================================

/**
 * Infer the display type of a column value for the ResultsTable badges.
 * sql.js returns everything as JS primitives — we map back to SQL types.
 */
export function inferColumnType(value: CellValue): ColumnType {
  if (value === null) return "NULL";
  if (typeof value === "boolean") return "BOOL";
  if (typeof value === "number") return "NUMBER";
  if (typeof value === "string") {
    // Detect ISO date strings
    if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?/.test(value)) {
      return "DATE";
    }
    return "TEXT";
  }
  return "UNKNOWN";
}

/**
 * Infer column type by scanning multiple values (use first non-null)
 */
export function inferColumnTypeFromSample(
  values: CellValue[],
  columnName: string
): ColumnType {
  // Date column name heuristics
  const dateLike = /(_at|_date|date_|created|updated|timestamp)$/i;
  if (dateLike.test(columnName)) return "DATE";

  const firstNonNull = values.find((v) => v !== null);
  if (firstNonNull === undefined) return "NULL";
  return inferColumnType(firstNonNull);
}

// ===================================================================
// Cell Value Formatting
// ===================================================================

/**
 * Format a cell value for display in the table.
 * Returns null for NULL values (caller renders the NULL badge).
 */
export function formatCellValue(value: CellValue, type: ColumnType): string | null {
  if (value === null) return null;

  switch (type) {
    case "DATE": {
      if (typeof value === "string") {
        try {
          const d = new Date(value);
          if (!isNaN(d.getTime())) {
            // Show date + time if has time component, date only otherwise
            if (value.includes("T") || value.includes(" ")) {
              return d.toLocaleString("es-CO", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              });
            }
            return d.toLocaleDateString("es-CO", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            });
          }
        } catch {
          // Fall through to string
        }
      }
      return String(value);
    }
    case "NUMBER": {
      if (typeof value === "number") {
        // Show integers without decimals, floats with up to 4 decimal places
        if (Number.isInteger(value)) return value.toLocaleString("es-CO");
        return value.toLocaleString("es-CO", { maximumFractionDigits: 4 });
      }
      return String(value);
    }
    case "BOOL": {
      return value ? "true" : "false";
    }
    default:
      return String(value);
  }
}

// ===================================================================
// XP Helpers
// ===================================================================

export function calculateXpEarned(
  baseXp: number,
  hintsUsed: number,
  attemptsCount: number
): number {
  const hintPenalty = hintsUsed * 5;
  const attemptPenalty = Math.max(0, attemptsCount - 1) * 2;
  return Math.max(Math.floor(baseXp * 0.25), baseXp - hintPenalty - attemptPenalty);
}

export function xpToNextLevel(currentLevel: number): number {
  // Progressive XP requirements
  const thresholds = [0, 100, 250, 500, 900, 1400, 2000, 2800, 3800, 5000, 6500];
  return thresholds[Math.min(currentLevel + 1, thresholds.length - 1)] ?? 6500;
}

// ===================================================================
// Validation Helpers
// ===================================================================

/**
 * Generate a user-friendly message based on validation error type.
 */
export function getValidationMessage(
  errorType: string,
  rowCountGot?: number,
  rowCountExpected?: number
): string {
  switch (errorType) {
    case "extra_rows":
      return `Tu query retornó ${rowCountGot ?? "más"} filas pero se esperaban ${rowCountExpected ?? "menos"}. Revisa tus JOINs o filtros — puede que estés obteniendo duplicados.`;
    case "missing_rows":
      return `Tu query retornó ${rowCountGot ?? "menos"} filas pero se esperaban ${rowCountExpected ?? "más"}. Verifica que no estás filtrando datos válidos con tu WHERE.`;
    case "wrong_columns":
      return "Los nombres o cantidad de columnas no coinciden con el resultado esperado. Revisa tu SELECT.";
    case "wrong_order":
      return "Las filas son correctas pero el orden no. El ejercicio requiere un ORDER BY específico.";
    case "wrong_types":
      return "Los tipos de dato de las columnas no coinciden con los esperados.";
    case "syntax_error":
      return "Hay un error de sintaxis en tu query. Revisa que todos los paréntesis y palabras clave estén bien escritos.";
    case "execution_error":
      return "Tu query generó un error al ejecutarse. Revisa el mensaje técnico para más detalles.";
    case "timeout":
      return "Tu query tardó demasiado en ejecutarse (más de 5 segundos). Intenta optimizarla.";
    default:
      return "El resultado no coincide con el esperado. Revisa tu query e intenta de nuevo.";
  }
}

// ===================================================================
// String Utilities
// ===================================================================

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("es-CO");
}
