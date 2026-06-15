"use client";

import { useState, useMemo } from "react";
import { AlertCircle, Database, ChevronLeft, ChevronRight, TableIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkeletonTable } from "@/components/ui/skeleton";
import { cn, formatCellValue, inferColumnTypeFromSample } from "@/lib/utils";
import type { ResultsTableProps, Column, ColumnType } from "@/lib/types";

// ===================================================================
// Column Type Badge
// ===================================================================
const TYPE_BADGE_MAP: Record<ColumnType, { variant: string; label: string }> = {
  TEXT: { variant: "type-text", label: "TEXT" },
  NUMBER: { variant: "type-number", label: "NUM" },
  DATE: { variant: "type-date", label: "DATE" },
  BOOL: { variant: "type-bool", label: "BOOL" },
  NULL: { variant: "type-null", label: "NULL" },
  UNKNOWN: { variant: "type-unknown", label: "?" },
};

function ColumnTypeBadge({ type }: { type: ColumnType }) {
  const { variant, label } = TYPE_BADGE_MAP[type] ?? TYPE_BADGE_MAP.UNKNOWN;
  return (
    <Badge
      // eslint-disable-next-line
      variant={variant as any}
      size="xs"
    >
      {label}
    </Badge>
  );
}

// ===================================================================
// NULL Cell
// ===================================================================
function NullCell() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-mono font-medium bg-neutral-100 text-neutral-400 border border-neutral-200">
      NULL
    </span>
  );
}

// ===================================================================
// Empty State
// ===================================================================
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
        <TableIcon className="w-8 h-8 text-neutral-400" />
      </div>
      <h3 className="text-base font-semibold text-neutral-700 mb-1">
        La query no retornó resultados
      </h3>
      <p className="text-sm text-neutral-500 max-w-xs">
        Tu query se ejecutó correctamente pero no encontró filas que cumplan con
        los criterios. Revisa tus filtros <code className="font-mono text-xs bg-neutral-100 px-1 rounded">WHERE</code>.
      </p>
    </div>
  );
}

// ===================================================================
// Error State
// ===================================================================
function ErrorState({ error }: { error: string }) {
  // Detect type of SQL error for friendlier message
  const isParseError =
    error.toLowerCase().includes("syntax") ||
    error.toLowerCase().includes("parse") ||
    error.toLowerCase().includes("near");
  const isTableError =
    error.toLowerCase().includes("no such table") ||
    error.toLowerCase().includes("table") && error.toLowerCase().includes("exist");
  const isColumnError =
    error.toLowerCase().includes("no such column") ||
    error.toLowerCase().includes("column");

  const friendlyMessage = isParseError
    ? "Error de sintaxis SQL. Revisa que todos los paréntesis cierren y las palabras clave estén bien escritas."
    : isTableError
    ? "La tabla que intentas consultar no existe en este dataset. Revisa los nombres de tablas disponibles."
    : isColumnError
    ? "Una o más columnas no existen en las tablas consultadas. Verifica el nombre de tus columnas."
    : "Error al ejecutar la query. Revisa el mensaje técnico a continuación.";

  return (
    <div className="flex flex-col gap-3 p-5">
      <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-lg">
        <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-rose-800 mb-1">{friendlyMessage}</p>
          <details className="group">
            <summary className="text-xs text-rose-600 cursor-pointer select-none hover:text-rose-700 list-none flex items-center gap-1">
              <span>Ver error técnico</span>
              <span className="group-open:rotate-90 transition-transform text-rose-400">›</span>
            </summary>
            <pre className="mt-2 text-xs font-mono text-rose-700 bg-rose-100 rounded p-3 overflow-x-auto whitespace-pre-wrap break-words">
              {error}
            </pre>
          </details>
        </div>
      </div>

      <div className="text-xs text-neutral-500 bg-neutral-50 rounded-lg p-3 border border-neutral-200">
        <strong className="font-semibold text-neutral-600">Tip:</strong> Presiona{" "}
        <kbd className="px-1.5 py-0.5 bg-white border border-neutral-300 rounded text-neutral-600 font-mono text-2xs">
          Ctrl+Z
        </kbd>{" "}
        para deshacer y volver a una query que funcionaba.
      </div>
    </div>
  );
}

// ===================================================================
// Idle State (no query executed yet)
// ===================================================================
function IdleState() {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      <div className="w-14 h-14 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center mb-4">
        <Database className="w-7 h-7 text-primary-400" />
      </div>
      <p className="text-sm text-neutral-500 max-w-sm">
        Escribe tu query en el editor y presiona{" "}
        <kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-neutral-600 font-mono text-xs">
          Ejecutar
        </kbd>{" "}
        para ver los resultados aquí.
      </p>
    </div>
  );
}

// ===================================================================
// Main Component
// ===================================================================
const DEFAULT_PAGE_SIZE = 50;

export function ResultsTable({
  columns,
  rows,
  totalRows,
  error,
  isLoading = false,
  pageSize = DEFAULT_PAGE_SIZE,
}: ResultsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(rows.length / pageSize);
  const startRow = (currentPage - 1) * pageSize;
  const endRow = Math.min(startRow + pageSize, rows.length);
  const visibleRows = rows.slice(startRow, endRow);

  // Infer column types from first non-null value in each column
  const columnsWithTypes = useMemo((): Column[] => {
    if (columns.length === 0) return [];
    return columns.map((col) => {
      if (col.type && col.type !== "UNKNOWN") return col;
      const values = rows.slice(0, 20).map((row) => row[col.name] ?? null);
      return {
        ...col,
        type: inferColumnTypeFromSample(values, col.name),
      };
    });
  }, [columns, rows]);

  // States
  if (isLoading) {
    return (
      <div className="p-4">
        <SkeletonTable rows={5} columns={Math.max(columns.length, 3)} />
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (columns.length === 0 && rows.length === 0 && !error) {
    return <IdleState />;
  }

  if (rows.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Results meta bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-200 bg-neutral-50 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-neutral-600">
            {rows.length < totalRows ? (
              <>
                Mostrando{" "}
                <span className="font-semibold text-neutral-800">{startRow + 1}–{endRow}</span>
                {" de "}
                <span className="font-semibold text-neutral-800">{totalRows.toLocaleString("es-CO")}</span>
                {" filas"}
              </>
            ) : (
              <>
                <span className="font-semibold text-neutral-800">{totalRows.toLocaleString("es-CO")}</span>
                {" "}
                {totalRows === 1 ? "fila" : "filas"}
              </>
            )}
          </span>
          <span className="text-neutral-300">·</span>
          <span className="text-xs text-neutral-500">
            {columnsWithTypes.length} {columnsWithTypes.length === 1 ? "columna" : "columnas"}
          </span>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Página anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs text-neutral-600 px-1">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Siguiente página"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1 min-h-0">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              {columnsWithTypes.map((col) => (
                <th
                  key={col.name}
                  className={cn(
                    "px-4 py-2.5 text-left border-b border-neutral-200",
                    "bg-neutral-50 text-neutral-700 font-semibold",
                    "whitespace-nowrap"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-neutral-800">{col.name}</span>
                    <ColumnTypeBadge type={col.type} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {visibleRows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={cn(
                  "transition-colors duration-75",
                  "hover:bg-primary-50/40",
                  rowIndex % 2 === 0 ? "bg-white" : "bg-neutral-50/50"
                )}
              >
                {columnsWithTypes.map((col) => {
                  const rawValue = row[col.name] ?? null;
                  const isNull = rawValue === null;
                  const formatted = isNull
                    ? null
                    : formatCellValue(rawValue, col.type);

                  return (
                    <td
                      key={col.name}
                      className={cn(
                        "px-4 py-2.5 max-w-xs align-top",
                        isNull && "text-center"
                      )}
                    >
                      {isNull ? (
                        <NullCell />
                      ) : (
                        <span
                          className={cn(
                            "text-sm",
                            col.type === "NUMBER"
                              ? "font-mono text-neutral-800 tabular-nums"
                              : "text-neutral-700",
                            col.type === "DATE" && "font-mono text-xs text-neutral-600",
                            col.type === "BOOL" &&
                              (rawValue
                                ? "text-emerald-600 font-medium"
                                : "text-rose-600 font-medium"),
                            typeof formatted === "string" && formatted.length > 100
                              ? "break-words"
                              : "whitespace-nowrap"
                          )}
                          title={
                            typeof formatted === "string" && formatted.length > 60
                              ? formatted
                              : undefined
                          }
                        >
                          {formatted ?? String(rawValue)}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom pagination bar for large result sets */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-neutral-200 bg-neutral-50 shrink-0">
          <span className="text-xs text-neutral-500">
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              Primera
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              Última
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
