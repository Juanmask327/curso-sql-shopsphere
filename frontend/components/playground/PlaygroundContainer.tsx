"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Play,
  RotateCcw,
  Lightbulb,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Database,
} from "lucide-react";
import { SQLEditor } from "./SQLEditor";
import { ResultsTable } from "./ResultsTable";
import { Button } from "@/components/ui/button";
import { cn, inferColumnTypeFromSample } from "@/lib/utils";
import type { PlaygroundContainerProps, QueryResult, Column, Row } from "@/lib/types";

// ===================================================================
// sql.js types (loaded dynamically from WASM)
// ===================================================================
// We use the @types/sql.js Database type directly.
// The module is imported at runtime (dynamic import) to avoid SSR issues.
import type { Database as SqlDatabase } from "sql.js";

// ===================================================================
// Dataset path — served from /public/dataset.db
// Append build-time version so browsers always fetch the current file
// instead of a stale cached copy. In production this is a fixed string
// (build ID); in dev we use a 5-minute bucket so each refresh within
// the same session reuses the cached file, but a change is picked up
// within at most 5 minutes without needing a hard-refresh.
// ===================================================================
const DATASET_VERSION =
  process.env.NEXT_PUBLIC_BUILD_ID ??
  Math.floor(Date.now() / 300_000).toString();
const DATASET_PATH = `/dataset.db?v=${DATASET_VERSION}`;

// ===================================================================
// SQL execution — runs a query against an in-memory SQLite instance
// ===================================================================
function runQuery(db: SqlDatabase, sql: string): QueryResult {
  const start = performance.now();

  const results = db.exec(sql);
  const executionMs = Math.round(performance.now() - start);

  if (!results || results.length === 0) {
    // Query ran but returned no rows (e.g. SELECT on empty table)
    return { columns: [], rows: [], totalRows: 0, executionMs };
  }

  const { columns: colNames, values } = results[0];

  // Infer column types from first few rows
  const columns: Column[] = colNames.map((name, colIdx) => {
    const sample = (values as unknown[][])
      .slice(0, 20)
      .map((row) => row[colIdx] as string | number | boolean | null);
    return { name, type: inferColumnTypeFromSample(sample, name) };
  });

  const rows: Row[] = (values as unknown[][]).map((rowValues) => {
    const row: Row = {};
    colNames.forEach((name, i) => {
      row[name] = rowValues[i] as string | number | boolean | null;
    });
    return row;
  });

  return { columns, rows, totalRows: rows.length, executionMs };
}

// ===================================================================
// Status Indicator
// ===================================================================
type PlaygroundStatus = "idle" | "running" | "success" | "error" | "loading_db";

function StatusIndicator({
  status,
  executionMs,
}: {
  status: PlaygroundStatus;
  executionMs?: number;
}) {
  if (status === "idle") return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium animate-fade-in",
        status === "running" && "text-neutral-500",
        status === "loading_db" && "text-sky-600",
        status === "success" && "text-emerald-600",
        status === "error" && "text-rose-600"
      )}
    >
      {status === "running" && (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Ejecutando...</span>
        </>
      )}
      {status === "loading_db" && (
        <>
          <Database className="w-3.5 h-3.5" />
          <span>Cargando dataset...</span>
        </>
      )}
      {status === "success" && (
        <>
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Completado</span>
          {executionMs !== undefined && (
            <span className="flex items-center gap-1 text-neutral-400 font-normal">
              <Clock className="w-3 h-3" />
              {executionMs}ms · WASM local
            </span>
          )}
        </>
      )}
      {status === "error" && (
        <>
          <XCircle className="w-3.5 h-3.5" />
          <span>Error en la query</span>
        </>
      )}
    </div>
  );
}

// ===================================================================
// Action Bar
// ===================================================================
function ActionBar({
  status,
  onExecute,
  onReset,
  onHint,
  executionMs,
}: {
  status: PlaygroundStatus;
  onExecute: () => void;
  onReset: () => void;
  onHint: () => void;
  executionMs?: number;
}) {
  const isDisabled = status === "running" || status === "loading_db";

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-neutral-200">
      <div className="flex items-center gap-2">
        {/* Execute — primary action */}
        <Button
          variant="primary"
          size="sm"
          onClick={onExecute}
          disabled={isDisabled}
          className="gap-2"
        >
          {status === "running" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          Ejecutar
        </Button>

        {/* Reset dataset */}
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          disabled={isDisabled}
          title="Reiniciar el dataset al estado original"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reiniciar</span>
        </Button>

        {/* Hint */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onHint}
          disabled={isDisabled}
        >
          <Lightbulb className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Pista</span>
        </Button>
      </div>

      {/* Status indicator */}
      <StatusIndicator status={status} executionMs={executionMs} />
    </div>
  );
}

// ===================================================================
// Resize Handle
// ===================================================================
function ResizeHandle({
  onDrag,
}: {
  onDrag: (deltaY: number) => void;
}) {
  const isDragging = useRef(false);
  const lastY = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastY.current = e.clientY;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = moveEvent.clientY - lastY.current;
      lastY.current = moveEvent.clientY;
      onDrag(delta);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    e.preventDefault();
  };

  return (
    <div
      className={cn(
        "group flex items-center justify-center",
        "h-2.5 w-full cursor-row-resize",
        "bg-neutral-100 hover:bg-primary-100",
        "border-y border-neutral-200 hover:border-primary-200",
        "transition-colors duration-150"
      )}
      onMouseDown={handleMouseDown}
      role="separator"
      aria-orientation="horizontal"
      aria-label="Redimensionar paneles"
    >
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-4 h-0.5 rounded-full bg-neutral-300 group-hover:bg-primary-400 transition-colors"
          />
        ))}
      </div>
    </div>
  );
}

// ===================================================================
// Results Panel Header
// ===================================================================
function ResultsPanelHeader({ result }: { result: QueryResult | null }) {
  if (!result) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-neutral-50 border-b border-neutral-200">
      <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">
        Resultados
      </span>
      {result.executionMs !== undefined && (
        <div className="flex items-center gap-1 text-xs text-neutral-400">
          <Zap className="w-3 h-3 text-amber-400" />
          <span>{result.executionMs}ms · WASM local</span>
        </div>
      )}
      {result.totalRows > 0 && (
        <span className="ml-auto text-xs text-neutral-400 font-mono">
          {result.totalRows} {result.totalRows === 1 ? "fila" : "filas"}
        </span>
      )}
    </div>
  );
}

// ===================================================================
// Database loading banner
// ===================================================================
function DbLoadingBanner() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center">
          <Database className="w-5 h-5 text-sky-500 animate-pulse" />
        </div>
        <div>
          <p className="text-sm font-medium text-neutral-700">Cargando dataset</p>
          <p className="text-xs text-neutral-400 mt-0.5">
            Inicializando SQLite en el navegador...
          </p>
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// Main Component
// ===================================================================
const DEFAULT_EDITOR_HEIGHT = 280;
const MIN_EDITOR_HEIGHT = 120;
const MAX_EDITOR_HEIGHT = 600;

export function PlaygroundContainer({
  exerciseId,
  onSubmit,
  initialQuery = "",
  onReset,
  onHint,
  onQueryChange,
}: PlaygroundContainerProps & { onQueryChange?: (query: string) => void }) {
  const [query, setQuery] = useState(initialQuery || "");
  const [status, setStatus] = useState<PlaygroundStatus>("loading_db");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  const [editorHeight, setEditorHeight] = useState(DEFAULT_EDITOR_HEIGHT);

  // sql.js database instance — loaded once per mount
  const dbRef = useRef<SqlDatabase | null>(null);
  const loadingRef = useRef(false);

  // ── Load sql.js and dataset on mount ─────────────────────────────────────
  useEffect(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    let cancelled = false;

    async function loadDatabase() {
      setStatus("loading_db");
      try {
        // Dynamic import avoids SSR issues with WASM
        const sqlJsModule = await import("sql.js");
        const initSqlJs = sqlJsModule.default;

        const SQL = await initSqlJs({
          // sql.js looks for the WASM file at this URL relative to the page
          locateFile: (file: string) => `/${file}`,
        });

        if (cancelled) return;

        // Fetch the SQLite dataset from /public/dataset.db
        const response = await fetch(DATASET_PATH);
        if (!response.ok) {
          throw new Error(
            `No se pudo cargar el dataset (${response.status}). Asegúrate de que /public/dataset.db existe.`
          );
        }

        const buffer = await response.arrayBuffer();
        if (cancelled) return;

        const db = new SQL.Database(new Uint8Array(buffer));
        dbRef.current = db;
        setStatus("idle");
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error
            ? err.message
            : "Error desconocido al cargar el dataset";
        setError(message);
        setStatus("error");
      }
    }

    void loadDatabase();

    return () => {
      cancelled = true;
      loadingRef.current = false;
      // Close the database on unmount to free WASM memory
      if (dbRef.current) {
        try {
          dbRef.current.close();
        } catch {
          // ignore
        }
        dbRef.current = null;
      }
    };
  }, []);

  // ── Sync initial query and reset state when exercise changes ─────────────
  useEffect(() => {
    setQuery(initialQuery || "");
    setResult(null);
    setError(undefined);
    setStatus(dbRef.current ? "idle" : "loading_db");
  }, [exerciseId, initialQuery]);

  const handleQueryChange = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);
      onQueryChange?.(newQuery);
    },
    [onQueryChange]
  );

  // ── Execute query against the local WASM db ───────────────────────────────
  const handleExecute = useCallback(async () => {
    if (!query.trim() || status === "running" || status === "loading_db") return;

    if (!dbRef.current) {
      setError("El dataset no está cargado todavía. Espera un momento.");
      setStatus("error");
      return;
    }

    setStatus("running");
    setError(undefined);
    setResult(null);

    // Yield to React before heavy computation
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    try {
      const queryResult = runQuery(dbRef.current, query);
      setResult(queryResult);
      setStatus("success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al ejecutar la query";
      setError(message);
      setStatus("error");
    }
  }, [query, status]);

  // ── Reset: reload the db from the buffer (re-fetch is cheap with cache) ──
  const handleReset = useCallback(async () => {
    if (status === "loading_db") return;

    // Reset editor
    setQuery(initialQuery || "");
    setResult(null);
    setError(undefined);
    setStatus("loading_db");

    try {
      const sqlJsModule = await import("sql.js");
      const initSqlJs = sqlJsModule.default;
      const SQL = await initSqlJs({
        locateFile: (file: string) => `/${file}`,
      });

      const response = await fetch(DATASET_PATH);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = await response.arrayBuffer();

      // Close old db
      if (dbRef.current) {
        try {
          dbRef.current.close();
        } catch {
          // ignore
        }
      }

      dbRef.current = new SQL.Database(new Uint8Array(buffer));
      setStatus("idle");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al reiniciar";
      setError(message);
      setStatus("error");
    }

    onReset?.();
  }, [initialQuery, onReset, status]);

  const handleHint = useCallback(() => {
    // Delegate to parent — the parent (EjercicioPage) manages HintPanel state
    onHint?.();
  }, [onHint]);

  const handleResizeDrag = useCallback((deltaY: number) => {
    setEditorHeight((prev) =>
      Math.max(MIN_EDITOR_HEIGHT, Math.min(MAX_EDITOR_HEIGHT, prev + deltaY))
    );
  }, []);

  const isDbLoading = status === "loading_db";

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
      {/* SQL Editor Section */}
      <div className="flex-shrink-0" style={{ padding: "12px 12px 0" }}>
        <SQLEditor
          value={query}
          onChange={handleQueryChange}
          onExecute={handleExecute}
          placeholder="-- Escribe tu query SQL aquí..."
          height={`${editorHeight}px`}
        />
      </div>

      {/* Action Bar */}
      <ActionBar
        status={status}
        onExecute={handleExecute}
        onReset={handleReset}
        onHint={handleHint}
        executionMs={result?.executionMs}
      />

      {/* Resize Handle */}
      <ResizeHandle onDrag={handleResizeDrag} />

      {/* Results Panel */}
      <div className="flex flex-col min-h-0 flex-1">
        {isDbLoading ? (
          <DbLoadingBanner />
        ) : (
          <>
            <ResultsPanelHeader result={result} />
            <div className="flex-1 overflow-hidden">
              <ResultsTable
                columns={result?.columns ?? []}
                rows={result?.rows ?? []}
                totalRows={result?.totalRows ?? 0}
                error={error}
                isLoading={status === "running"}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export type { PlaygroundContainerProps };
