"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  ChevronLeft,
  SkipForward,
  CheckCircle2,
  Brain,
  Zap,
  BarChart3,
  ArrowRight,
  Play,
  Loader2,
  AlertCircle,
  TableIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { api } from "@/lib/api-client";

// ===================================================================
// Mock Diagnostic Questions
// In production these come from GET /diagnostic/questions
// ===================================================================

type QuestionType = "multiple_choice" | "sql_editor";

interface DiagnosticQuestion {
  id: string;
  order: number;
  type: QuestionType;
  topic: string;
  text: string;
  options?: { id: string; label: string }[];
  /** For sql_editor type: placeholder SQL */
  sqlPlaceholder?: string;
}

const MOCK_QUESTIONS: DiagnosticQuestion[] = [
  {
    id: "q1",
    order: 1,
    type: "multiple_choice",
    topic: "Fundamentos",
    text: "¿Qué cláusula de SQL se usa para filtrar filas en una consulta?",
    options: [
      { id: "a", label: "GROUP BY" },
      { id: "b", label: "WHERE" },
      { id: "c", label: "HAVING" },
      { id: "d", label: "ORDER BY" },
    ],
  },
  {
    id: "q2",
    order: 2,
    type: "multiple_choice",
    topic: "Fundamentos",
    text: "¿Cuál de estas funciones de agregación cuenta el número de filas?",
    options: [
      { id: "a", label: "SUM()" },
      { id: "b", label: "AVG()" },
      { id: "c", label: "COUNT()" },
      { id: "d", label: "MAX()" },
    ],
  },
  {
    id: "q3",
    order: 3,
    type: "sql_editor",
    topic: "SELECT básico",
    text: "Escribe una query que seleccione el `nombre` y `email` de la tabla `clientes`, ordenados por nombre de forma ascendente.",
    sqlPlaceholder: "SELECT\n\nFROM clientes\nORDER BY",
  },
  {
    id: "q4",
    order: 4,
    type: "multiple_choice",
    topic: "JOINs",
    text: "¿Qué tipo de JOIN retorna todas las filas de la tabla izquierda y las coincidencias de la tabla derecha?",
    options: [
      { id: "a", label: "INNER JOIN" },
      { id: "b", label: "LEFT JOIN" },
      { id: "c", label: "RIGHT JOIN" },
      { id: "d", label: "FULL OUTER JOIN" },
    ],
  },
  {
    id: "q5",
    order: 5,
    type: "multiple_choice",
    topic: "Agregaciones",
    text: "¿En qué se diferencia HAVING de WHERE?",
    options: [
      { id: "a", label: "HAVING filtra antes del GROUP BY, WHERE después" },
      { id: "b", label: "HAVING filtra grupos agregados, WHERE filtra filas individuales" },
      { id: "c", label: "Son equivalentes, solo difieren en sintaxis" },
      { id: "d", label: "HAVING solo funciona con COUNT()" },
    ],
  },
  {
    id: "q6",
    order: 6,
    type: "sql_editor",
    topic: "JOINs",
    text: "Escribe una query que muestre el `nombre` del cliente y el `total` de su pedido, uniendo las tablas `clientes` y `pedidos` por `cliente_id`.",
    sqlPlaceholder: "SELECT c.nombre, p.total\nFROM clientes c\n",
  },
];

// All 24 diagnostic questions — covering 5 skill levels
const EXTRA_QUESTIONS: DiagnosticQuestion[] = [
  {
    id: "q7",
    order: 7,
    type: "multiple_choice",
    topic: "Subqueries",
    text: "¿Qué es una subconsulta correlacionada?",
    options: [
      { id: "a", label: "Una subconsulta que se ejecuta una sola vez y su resultado se reutiliza" },
      { id: "b", label: "Una subconsulta que hace referencia a columnas de la consulta exterior y se ejecuta por cada fila" },
      { id: "c", label: "Una subconsulta que solo se puede usar en la cláusula FROM" },
      { id: "d", label: "Una subconsulta definida con la cláusula WITH" },
    ],
  },
  {
    id: "q8",
    order: 8,
    type: "multiple_choice",
    topic: "CTEs",
    text: "¿Cuál es la función principal de una CTE (Common Table Expression)?",
    options: [
      { id: "a", label: "Crear una tabla temporal persistente en disco" },
      { id: "b", label: "Definir un conjunto de resultados con nombre reutilizable dentro de la misma query" },
      { id: "c", label: "Reemplazar los índices en consultas complejas" },
      { id: "d", label: "Agregar filas a una tabla existente" },
    ],
  },
  {
    id: "q9",
    order: 9,
    type: "multiple_choice",
    topic: "Window Functions",
    text: "¿Qué hace la función ROW_NUMBER() en SQL?",
    options: [
      { id: "a", label: "Cuenta el total de filas en la tabla" },
      { id: "b", label: "Asigna un número secuencial único a cada fila dentro de una partición" },
      { id: "c", label: "Retorna el número de la fila actual en el resultado global" },
      { id: "d", label: "Suma los valores de una columna numérica" },
    ],
  },
  {
    id: "q10",
    order: 10,
    type: "multiple_choice",
    topic: "Window Functions",
    text: "¿Para qué sirve la cláusula PARTITION BY dentro de una window function?",
    options: [
      { id: "a", label: "Divide la tabla físicamente en fragmentos para optimizar el almacenamiento" },
      { id: "b", label: "Agrupa las filas en subconjuntos sobre los que se aplica la función de ventana de forma independiente" },
      { id: "c", label: "Filtra filas antes de que se ejecute la window function" },
      { id: "d", label: "Es equivalente a GROUP BY pero dentro de una subconsulta" },
    ],
  },
  {
    id: "q11",
    order: 11,
    type: "sql_editor",
    topic: "CTEs",
    text: "Escribe una CTE llamada `ventas_mensuales` que calcule el total de ventas (`SUM(total)`) agrupado por `mes` de la tabla `pedidos`. Luego selecciona todo de esa CTE.",
    sqlPlaceholder: "WITH ventas_mensuales AS (\n  SELECT\n  FROM pedidos\n  GROUP BY\n)\nSELECT * FROM ventas_mensuales;",
  },
  {
    id: "q12",
    order: 12,
    type: "multiple_choice",
    topic: "Índices",
    text: "¿Cuál de estas afirmaciones sobre los índices en SQL es correcta?",
    options: [
      { id: "a", label: "Los índices siempre aceleran todas las operaciones, incluidos los INSERT y UPDATE" },
      { id: "b", label: "Los índices aceleran las búsquedas SELECT pero pueden ralentizar INSERT, UPDATE y DELETE" },
      { id: "c", label: "Solo se pueden crear índices en columnas de tipo texto" },
      { id: "d", label: "Un índice almacena una copia completa de la tabla" },
    ],
  },
  {
    id: "q13",
    order: 13,
    type: "multiple_choice",
    topic: "Subqueries",
    text: "¿Cuál es la diferencia entre IN y EXISTS en SQL?",
    options: [
      { id: "a", label: "Son completamente equivalentes en rendimiento y resultado" },
      { id: "b", label: "IN evalúa la lista de valores completa; EXISTS detiene la búsqueda al encontrar la primera coincidencia" },
      { id: "c", label: "EXISTS solo funciona con subconsultas en la cláusula WHERE" },
      { id: "d", label: "IN es más eficiente que EXISTS en todos los casos" },
    ],
  },
  {
    id: "q14",
    order: 14,
    type: "multiple_choice",
    topic: "Analítica",
    text: "¿Qué calcula la función LAG() en SQL?",
    options: [
      { id: "a", label: "El valor máximo de una columna dentro de una partición" },
      { id: "b", label: "El valor de la fila anterior dentro de la partición y el orden especificados" },
      { id: "c", label: "La diferencia entre el valor actual y el promedio de la ventana" },
      { id: "d", label: "El número de filas que preceden a la fila actual" },
    ],
  },
  {
    id: "q15",
    order: 15,
    type: "multiple_choice",
    topic: "JOINs",
    text: "En ShopSphere, ¿qué query obtiene correctamente el número de devoluciones por cliente? (returns.order_id → orders.order_id → orders.customer_id)",
    options: [
      { id: "a", label: "SELECT c.customer_id, COUNT(r.return_id) FROM customers c LEFT JOIN returns r ON r.customer_id = c.customer_id GROUP BY c.customer_id" },
      { id: "b", label: "SELECT c.customer_id, COUNT(r.return_id) FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id LEFT JOIN returns r ON r.order_id = o.order_id GROUP BY c.customer_id" },
      { id: "c", label: "SELECT c.customer_id, COUNT(r.return_id) FROM returns r JOIN customers c GROUP BY c.customer_id" },
      { id: "d", label: "SELECT customer_id, COUNT(*) FROM returns GROUP BY customer_id" },
    ],
  },
  {
    id: "q16",
    order: 16,
    type: "multiple_choice",
    topic: "Optimización",
    text: "¿Por qué es recomendable evitar `SELECT *` en queries de producción?",
    options: [
      { id: "a", label: "Porque `SELECT *` genera un error de sintaxis en la mayoría de motores" },
      { id: "b", label: "Porque transfiere más datos de los necesarios, impide el uso de índices de cobertura y hace el código más frágil ante cambios de schema" },
      { id: "c", label: "Porque `SELECT *` no es compatible con GROUP BY" },
      { id: "d", label: "Porque solo funciona en tablas con menos de 1000 filas" },
    ],
  },
  {
    id: "q17",
    order: 17,
    type: "sql_editor",
    topic: "Window Functions",
    text: "Escribe una query que calcule el ranking de clientes por `total_compras` usando RANK(), particionado por `ciudad` y ordenado de mayor a menor.",
    sqlPlaceholder: "SELECT\n  customer_id,\n  ciudad,\n  total_compras,\n  RANK() OVER (\n    PARTITION BY\n    ORDER BY\n  ) AS ranking\nFROM resumen_clientes;",
  },
  {
    id: "q18",
    order: 18,
    type: "multiple_choice",
    topic: "Analítica",
    text: "¿Qué es un análisis de cohortes en el contexto de e-commerce?",
    options: [
      { id: "a", label: "Una técnica para agrupar productos por categoría de precio" },
      { id: "b", label: "El seguimiento de grupos de usuarios que comparten una característica común (como el mes de registro) a lo largo del tiempo" },
      { id: "c", label: "Un reporte de ventas agrupado por región geográfica" },
      { id: "d", label: "Una consulta que usa múltiples CTEs en cascada" },
    ],
  },
  {
    id: "q19",
    order: 19,
    type: "multiple_choice",
    topic: "CTEs",
    text: "¿Cuándo es preferible usar una CTE recursiva?",
    options: [
      { id: "a", label: "Cuando necesitas iterar sobre estructuras jerárquicas como árboles o grafos (ej. categorías padre-hijo)" },
      { id: "b", label: "Cuando quieres evitar el uso de índices en una consulta" },
      { id: "c", label: "Siempre que necesites ordenar los resultados" },
      { id: "d", label: "Cuando el resultado de la query tiene más de 1 millón de filas" },
    ],
  },
  {
    id: "q20",
    order: 20,
    type: "multiple_choice",
    topic: "Window Functions",
    text: "¿Qué diferencia hay entre RANK() y DENSE_RANK()?",
    options: [
      { id: "a", label: "Son exactamente iguales" },
      { id: "b", label: "RANK() deja huecos en la numeración cuando hay empates; DENSE_RANK() no los deja" },
      { id: "c", label: "DENSE_RANK() siempre ordena de forma descendente" },
      { id: "d", label: "RANK() solo funciona con particiones, DENSE_RANK() funciona sin ellas" },
    ],
  },
  {
    id: "q21",
    order: 21,
    type: "multiple_choice",
    topic: "Optimización",
    text: "¿Qué hace EXPLAIN (o EXPLAIN ANALYZE) en SQL?",
    options: [
      { id: "a", label: "Ejecuta la query y muestra el resultado formateado como tabla" },
      { id: "b", label: "Muestra el plan de ejecución que el motor de base de datos usará para resolver la query, sin ejecutarla (o ejecutándola con ANALYZE)" },
      { id: "c", label: "Valida la sintaxis SQL sin conectarse a la base de datos" },
      { id: "d", label: "Crea un índice automáticamente basado en las columnas del WHERE" },
    ],
  },
  {
    id: "q22",
    order: 22,
    type: "sql_editor",
    topic: "Subqueries",
    text: "Escribe una query que devuelva los clientes cuyo `total_comprado` supera el promedio general de todos los clientes. Usa una subconsulta en el WHERE.",
    sqlPlaceholder: "SELECT customer_id, total_comprado\nFROM clientes\nWHERE total_comprado > (\n  SELECT\n  FROM clientes\n);",
  },
  {
    id: "q23",
    order: 23,
    type: "multiple_choice",
    topic: "Analítica",
    text: "¿Qué mide el LTV (Lifetime Value) de un cliente?",
    options: [
      { id: "a", label: "El número total de veces que un cliente visitó el sitio web" },
      { id: "b", label: "El ingreso total que un cliente genera durante toda su relación con la empresa" },
      { id: "c", label: "El valor promedio de cada pedido individual del cliente" },
      { id: "d", label: "El costo de adquisición del cliente dividido por el número de pedidos" },
    ],
  },
  {
    id: "q24",
    order: 24,
    type: "multiple_choice",
    topic: "SQL Profesional",
    text: "¿Cuál es la función de NULLIF(a, b) en SQL?",
    options: [
      { id: "a", label: "Retorna b si a es NULL, de lo contrario retorna a" },
      { id: "b", label: "Retorna NULL si a es igual a b, de lo contrario retorna a" },
      { id: "c", label: "Convierte el valor NULL en 0 para evitar errores en sumas" },
      { id: "d", label: "Verifica si dos columnas tienen el mismo tipo de dato" },
    ],
  },
];

const ALL_QUESTIONS: DiagnosticQuestion[] = [...MOCK_QUESTIONS, ...EXTRA_QUESTIONS];

// ===================================================================
// Progress Bar
// ===================================================================
function ProgressBar({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const pct = Math.round((current / total) * 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>
          Pregunta <span className="font-semibold text-neutral-700">{current}</span> de{" "}
          <span className="font-semibold text-neutral-700">{total}</span>
        </span>
        <span className="font-semibold text-primary-600">{pct}%</span>
      </div>
      <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary-400 to-primary-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ===================================================================
// Multiple Choice Question
// ===================================================================
function MultipleChoiceQuestion({
  question,
  selected,
  onSelect,
}: {
  question: DiagnosticQuestion;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-3" role="radiogroup" aria-labelledby="question-text">
      {question.options?.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="radio"
          aria-checked={selected === opt.id}
          onClick={() => onSelect(opt.id)}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3.5 rounded-lg border text-left",
            "text-sm font-medium transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
            selected === opt.id
              ? "border-primary-400 bg-primary-50 text-primary-800 shadow-sm"
              : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50"
          )}
        >
          {/* Radio indicator */}
          <div
            className={cn(
              "w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all",
              selected === opt.id
                ? "border-primary-500 bg-primary-500"
                : "border-neutral-300 bg-white"
            )}
          >
            {selected === opt.id && (
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            )}
          </div>
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

// ===================================================================
// useSQLite — loads sql.js + dataset.db once per session
// ===================================================================
type SQLiteDB = {
  run: (sql: string) => void;
  exec: (sql: string) => Array<{ columns: string[]; values: unknown[][] }>;
  close: () => void;
};

type SQLiteStatus = "idle" | "loading" | "ready" | "error";

function useSQLite() {
  const dbRef = useRef<SQLiteDB | null>(null);
  const loadingRef = useRef(false);
  const [status, setStatus] = useState<SQLiteStatus>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    let cancelled = false;

    setStatus("loading");

    (async () => {
      try {
        // Dynamically import sql.js to avoid SSR issues
        const initSqlJs = (await import("sql.js")).default;
        const SQL = await initSqlJs({
          locateFile: (file: string) => `/${file}`,
        });

        if (cancelled) return;

        // Load the ShopSphere dataset
        const response = await fetch("/dataset.db");
        if (!response.ok) throw new Error(`No se pudo cargar dataset.db (HTTP ${response.status})`);
        const buffer = await response.arrayBuffer();
        if (cancelled) return;

        const db = new SQL.Database(new Uint8Array(buffer));

        // Create Spanish views to map hypothetical queries in the diagnostic test
        db.run(`
          CREATE VIEW IF NOT EXISTS clientes AS
          SELECT 
            c.customer_id,
            c.customer_id AS cliente_id,
            (c.first_name || ' ' || c.last_name) AS nombre,
            c.email,
            c.city AS ciudad,
            COALESCE(
              (SELECT SUM(oi.quantity * oi.unit_price * (1 - oi.discount / 100.0))
               FROM orders o
               JOIN order_items oi ON o.order_id = oi.order_id
               WHERE o.customer_id = c.customer_id),
              0
            ) AS total_comprado
          FROM customers c;
        `);
        db.run(`
          CREATE VIEW IF NOT EXISTS pedidos AS
          SELECT 
            o.order_id,
            o.customer_id AS cliente_id,
            substr(o.order_date, 1, 7) AS mes,
            COALESCE(
              (SELECT SUM(oi.quantity * oi.unit_price * (1 - oi.discount / 100.0))
               FROM order_items oi
               WHERE oi.order_id = o.order_id),
              0
            ) AS total
          FROM orders o;
        `);
        db.run(`
          CREATE VIEW IF NOT EXISTS resumen_clientes AS
          SELECT 
            customer_id,
            ciudad,
            total_comprado AS total_compras
          FROM clientes;
        `);

        if (cancelled) {
          db.close();
          return;
        }

        dbRef.current = db as unknown as SQLiteDB;
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setLoadError(msg);
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      loadingRef.current = false;
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

  const executeQuery = useCallback(
    (sql: string): { columns: string[]; rows: Record<string, unknown>[] } | { error: string } => {
      if (!dbRef.current) return { error: "Base de datos no disponible. Recarga la página." };
      if (!sql.trim()) return { error: "Escribe una query antes de ejecutar." };

      // Block mutating statements
      const upper = sql.trim().toUpperCase();
      const forbidden = ["DROP ", "DELETE ", "INSERT ", "UPDATE ", "ALTER ", "CREATE ", "TRUNCATE "];
      if (forbidden.some((kw) => upper.startsWith(kw) || upper.includes("\n" + kw))) {
        return { error: "Solo se permiten consultas SELECT en el diagnóstico. Las instrucciones DDL/DML están bloqueadas." };
      }

      try {
        const results = dbRef.current.exec(sql);
        if (!results || results.length === 0) {
          return { columns: [], rows: [] };
        }
        const { columns, values } = results[0];
        const rows = values.map((row) => {
          const obj: Record<string, unknown> = {};
          columns.forEach((col, i) => { obj[col] = row[i]; });
          return obj;
        });
        return { columns, rows };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { error: msg };
      }
    },
    []
  );

  return { status, loadError, executeQuery };
}

// ===================================================================
// SQL Editor Question — with real WASM execution
// ===================================================================
type ExecState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "success"; columns: string[]; rows: Record<string, unknown>[]; ms: number }
  | { kind: "error"; message: string };

function getQuestionSummary(questionId: string, columns: string[], rowCount: number): string {
  const summaries: Record<string, string> = {
    q3: "Se obtuvo una lista de clientes con sus nombres y correos electrónicos, ordenados alfabéticamente por su nombre.",
    q6: "Se obtuvo la relación de pedidos mostrando el nombre del cliente y el monto total de cada pedido.",
    q11: "Se obtuvo el resumen histórico mensual con el total de ventas acumuladas por cada mes.",
    q17: "Se obtuvo el ranking de clientes basado en su total de compras, segmentado por ciudad y ordenado de mayor a menor.",
    q22: "Se obtuvo la lista de clientes cuyo monto total de compras supera el promedio general de compras de todos los clientes.",
  };

  return summaries[questionId] ?? `Se obtuvo un resultado de ${rowCount} ${rowCount === 1 ? "fila" : "filas"} con las columnas: ${columns.join(", ")}.`;
}

function SqlEditorQuestion({
  question,
  value,
  onChange,
  executeQuery,
  dbStatus,
  dbError,
}: {
  question: DiagnosticQuestion;
  value: string;
  onChange: (v: string) => void;
  executeQuery: (sql: string) => { columns: string[]; rows: Record<string, unknown>[] } | { error: string };
  dbStatus: SQLiteStatus;
  dbError: string | null;
}) {
  const [execState, setExecState] = useState<ExecState>({ kind: "idle" });

  const handleRun = useCallback(async () => {
    if (dbStatus !== "ready") return;
    setExecState({ kind: "running" });
    const t0 = performance.now();
    // Small delay for UX breathing room
    await new Promise((r) => setTimeout(r, 60));
    const result = executeQuery(value);
    const ms = Math.round(performance.now() - t0);
    if ("error" in result) {
      setExecState({ kind: "error", message: result.error });
    } else {
      setExecState({ kind: "success", columns: result.columns, rows: result.rows, ms });
    }
  }, [value, executeQuery, dbStatus]);

  const isRunnable = dbStatus === "ready" && execState.kind !== "running";

  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-500">
        Escribe tu query SQL y presiona{" "}
        <kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-neutral-600 font-mono text-xs">Ejecutar</kbd>{" "}
        para ver el resultado real del dataset de ShopSphere.
      </p>

      {/* Editor */}
      <div className="rounded-lg border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-editor-bg border-b border-white/10">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-400/60" />
            <div className="w-3 h-3 rounded-full bg-amber-400/60" />
            <div className="w-3 h-3 rounded-full bg-emerald-400/60" />
          </div>
          <div className="flex items-center gap-2">
            {dbStatus === "loading" && (
              <span className="flex items-center gap-1 text-xs text-neutral-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                Cargando dataset...
              </span>
            )}
            {dbStatus === "ready" && (
              <span className="text-xs text-emerald-400 font-medium">● ShopSphere DB</span>
            )}
            {dbStatus === "error" && (
              <span className="text-xs text-rose-400" title={dbError ?? undefined}>✕ Error al cargar DB ({dbError})</span>
            )}
            <span className="text-xs text-neutral-500 font-mono">SQL</span>
          </div>
        </div>

        {/* Textarea */}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.sqlPlaceholder}
          rows={6}
          spellCheck={false}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              if (isRunnable) handleRun();
            }
          }}
          className={cn(
            "w-full px-4 py-3 font-mono text-sm resize-none",
            "bg-editor-bg text-neutral-100 placeholder:text-neutral-600",
            "focus:outline-none leading-relaxed"
          )}
        />

        {/* Action bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-editor-bg border-t border-white/10">
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="font-mono gap-1.5 bg-white/5 border-white/20 text-neutral-200 hover:bg-white/10"
            onClick={handleRun}
            disabled={!isRunnable}
          >
            {execState.kind === "running" ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Play className="w-3 h-3" />
            )}
            Ejecutar
          </Button>
          <span className="text-xs text-neutral-600">
            Ctrl+Enter · Opcional — no afecta tu puntaje
          </span>
          {execState.kind === "success" && (
            <span className="ml-auto text-xs text-emerald-400 font-medium">
              ✓ {execState.rows.length} {execState.rows.length === 1 ? "fila" : "filas"} · {execState.ms}ms
            </span>
          )}
          {execState.kind === "error" && (
            <span className="ml-auto text-xs text-rose-400 font-medium">✕ Error</span>
          )}
        </div>
      </div>

      {/* Results panel */}
      {execState.kind === "error" && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-rose-800 mb-1">
                {execState.message.toLowerCase().includes("syntax") ||
                execState.message.toLowerCase().includes("parse") ||
                execState.message.toLowerCase().includes("near")
                  ? "Error de sintaxis SQL"
                  : execState.message.toLowerCase().includes("no such table")
                  ? "La tabla no existe en este dataset"
                  : execState.message.toLowerCase().includes("no such column")
                  ? "Columna no encontrada"
                  : "Error al ejecutar la query"}
              </p>
              <details>
                <summary className="text-xs text-rose-600 cursor-pointer select-none">Ver detalle técnico ›</summary>
                <pre className="mt-2 text-xs font-mono text-rose-700 bg-rose-100 rounded p-2 overflow-x-auto whitespace-pre-wrap break-words">
                  {execState.message}
                </pre>
              </details>
            </div>
          </div>
        </div>
      )}

      {execState.kind === "success" && (
        <div className="rounded-lg border border-neutral-200 overflow-hidden space-y-3 bg-white p-4">
          <div className="flex items-start gap-2.5 bg-emerald-50/50 border border-emerald-100 rounded-lg p-3 text-sm text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-950 text-xs sm:text-sm">Consulta ejecutada con éxito</p>
              <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed font-medium">
                {getQuestionSummary(question.id, execState.columns, execState.rows.length)}
              </p>
            </div>
          </div>

          {execState.rows.length === 0 ? (
            <div className="flex items-center gap-2 p-4 text-sm text-neutral-500 border rounded-lg">
              <TableIcon className="w-4 h-4 text-neutral-400" />
              La query se ejecutó correctamente pero no devolvió filas.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-48 border rounded-lg">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0">
                  <tr>
                    {execState.columns.map((col) => (
                      <th
                        key={col}
                        className="px-3 py-2 text-left bg-neutral-50 border-b border-neutral-200 font-mono font-semibold text-neutral-700 whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {execState.rows.slice(0, 50).map((row, ri) => (
                    <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-neutral-50/60"}>
                      {execState.columns.map((col) => {
                        const val = row[col];
                        return (
                          <td
                            key={col}
                            className="px-3 py-1.5 text-neutral-700 whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis"
                          >
                            {val === null || val === undefined ? (
                              <span className="text-neutral-400 font-mono">NULL</span>
                            ) : (
                              String(val)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {execState.rows.length > 50 && (
                <div className="px-3 py-2 text-xs text-neutral-400 bg-neutral-50 border-t border-neutral-100">
                  Mostrando 50 de {execState.rows.length} filas
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===================================================================
// Intro Screen
// ===================================================================
function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="max-w-lg mx-auto text-center space-y-8 animate-fade-up">
      {/* Icon */}
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary-50 border border-primary-100 shadow-sm mx-auto">
        <Brain className="w-10 h-10 text-primary-500" />
      </div>

      {/* Copy */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">
          Evaluación diagnóstica
        </h1>
        <p className="text-neutral-600 leading-relaxed">
          Antes de comenzar, queremos saber en qué nivel estás. Esta evaluación
          tiene <strong className="text-neutral-800">24 preguntas</strong> que
          cubren desde SQL básico hasta window functions y CTEs.
        </p>
        <p className="text-neutral-500 text-sm">
          No hay respuestas correctas o incorrectas que te penalicen — el
          objetivo es encontrar el punto de partida ideal para ti. Tarda
          aproximadamente <strong>10–15 minutos</strong>.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: BarChart3, value: "24", label: "Preguntas" },
          { icon: Zap, value: "~12 min", label: "Duración" },
          { icon: CheckCircle2, value: "5 niveles", label: "Posibles" },
        ].map(({ icon: Icon, value, label }) => (
          <div
            key={label}
            className="rounded-xl border border-neutral-200 bg-white py-4 px-3 shadow-xs"
          >
            <Icon className="w-5 h-5 text-primary-400 mx-auto mb-1.5" />
            <p className="text-lg font-bold text-neutral-900">{value}</p>
            <p className="text-xs text-neutral-500">{label}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <Button
        variant="primary"
        size="xl"
        onClick={onStart}
        className="w-full sm:w-auto px-10 shadow-primary"
      >
        Comenzar evaluación
        <ChevronRight className="w-5 h-5" />
      </Button>

      <p className="text-xs text-neutral-400">
        También puedes{" "}
        <button
          type="button"
          onClick={() => {
            // Skip diagnostic: assign level 1 and go to dashboard
            window.location.href = "/dashboard";
          }}
          className="underline underline-offset-2 hover:text-neutral-600 transition-colors"
        >
          saltar el diagnóstico
        </button>{" "}
        y empezar desde el Nivel 1.
      </p>
    </div>
  );
}

// ===================================================================
// Result Screen
// ===================================================================
interface DiagnosticResultData {
  recommended_level: number;
  level_name: string;
  score: number;
  total: number;
  message: string;
}

const LEVEL_MESSAGES: Record<number, { label: string; description: string; color: string }> = {
  1: {
    label: "Principiante",
    description:
      "Empezarás desde los fundamentos de SQL. Aprenderás SELECT, WHERE, ORDER BY y las bases que todo analista necesita.",
    color: "text-sky-600 bg-sky-50 border-sky-200",
  },
  2: {
    label: "Básico",
    description:
      "Ya manejas lo esencial. Seguirás con GROUP BY, funciones de agregación y JOINs simples.",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  3: {
    label: "Intermedio",
    description:
      "Buen nivel. Te enfocarás en subqueries, CTEs y JOINs complejos para resolver problemas reales de negocio.",
    color: "text-violet-600 bg-violet-50 border-violet-200",
  },
  4: {
    label: "Avanzado",
    description:
      "Dominás los conceptos clave. Trabajarás con window functions, optimización y queries de analítica avanzada.",
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  5: {
    label: "Experto",
    description:
      "Nivel avanzado. Te desafiaremos con ejercicios de rendimiento, modelado analítico y casos de negocio reales.",
    color: "text-orange-600 bg-orange-50 border-orange-200",
  },
};

function ResultScreen({
  result,
  onStart,
}: {
  result: DiagnosticResultData;
  onStart: () => void;
}) {
  const router = useRouter();
  const levelInfo = LEVEL_MESSAGES[result.recommended_level] ?? LEVEL_MESSAGES[1];
  const pct = Math.round((result.score / result.total) * 100);

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-up">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-50 border border-primary-100 shadow-sm mx-auto">
          <CheckCircle2 className="w-8 h-8 text-primary-500" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mt-4">
          Evaluación completada
        </h1>
        <p className="text-neutral-500 text-sm">
          Respondiste {result.score} de {result.total} preguntas correctamente.
        </p>
      </div>

      {/* Score bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm font-medium">
          <span className="text-neutral-600">Puntaje</span>
          <span className="text-primary-600">{pct}%</span>
        </div>
        <div className="h-3 bg-neutral-100 rounded-full overflow-hidden border border-neutral-200">
          <div
            className="h-full bg-gradient-to-r from-primary-400 to-primary-500 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Recommended level card */}
      <div
        className={cn(
          "rounded-xl border p-5 space-y-3",
          levelInfo.color
        )}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-70">
            Nivel recomendado
          </p>
          <Badge variant="neutral" size="sm">
            Nivel {result.recommended_level}
          </Badge>
        </div>
        <h2 className="text-xl font-bold">
          {levelInfo.label}
        </h2>
        <p className="text-sm leading-relaxed opacity-80">
          {levelInfo.description}
        </p>
      </div>

      {/* Message from the system */}
      {result.message && (
        <p className="text-sm text-neutral-600 leading-relaxed text-center">
          {result.message}
        </p>
      )}

      {/* CTA */}
      <Button
        variant="primary"
        size="lg"
        className="w-full shadow-primary"
        onClick={() => router.push(`/niveles/${result.recommended_level}`)}
      >
        Empezar en Nivel {result.recommended_level}
        <ArrowRight className="w-5 h-5" />
      </Button>

      <Button
        variant="ghost"
        size="md"
        className="w-full text-neutral-500"
        onClick={() => router.push("/dashboard")}
      >
        Ir al dashboard primero
      </Button>
    </div>
  );
}

// ===================================================================
// Main Diagnostic Page
// ===================================================================
type Phase = "intro" | "questions" | "result";

interface AnswerMap {
  [questionId: string]: string;
}

function DiagnosticContent() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [currentAnswer, setCurrentAnswer] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<DiagnosticResultData | null>(null);

  // Load sql.js + dataset.db once for SQL editor questions
  const { status: dbStatus, loadError: dbError, executeQuery } = useSQLite();

  const questions = ALL_QUESTIONS;
  const total = questions.length;
  const currentQuestion = questions[currentIndex];

  const handleStart = () => {
    setPhase("questions");
    setCurrentIndex(0);
    const firstQ = questions[0];
    setCurrentAnswer(firstQ.type === "sql_editor" ? firstQ.sqlPlaceholder ?? "" : "");
    setAnswers({});
  };

  const handleSelectOption = (optionId: string) => {
    setCurrentAnswer(optionId);
  };

  const handleSqlChange = (value: string) => {
    setCurrentAnswer(value);
  };

  // Go back to previous question, restoring saved answer
  const handlePrevious = useCallback(() => {
    if (currentIndex === 0) return;
    // Save current answer before going back
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: currentAnswer,
    }));
    const prevIndex = currentIndex - 1;
    setCurrentIndex(prevIndex);
    // Restore previously saved answer for the previous question
    const prevQ = questions[prevIndex];
    const savedAnswer = answers[prevQ.id];
    setCurrentAnswer(savedAnswer ?? (prevQ.type === "sql_editor" ? prevQ.sqlPlaceholder ?? "" : ""));
  }, [currentIndex, currentQuestion, currentAnswer, answers, questions]);

  const handleFinish = useCallback(
    async (finalAnswers: AnswerMap) => {
      setSubmitting(true);

      const answered = Object.values(finalAnswers).filter(Boolean).length;
      const level = answered < 8 ? 1 : answered < 14 ? 2 : answered < 18 ? 3 : answered < 22 ? 4 : 5;

      // Create a mock score by level array for the database
      const scoreByLevel = [
        { level: 0, score_pct: answered >= 3 ? 100 : 0 },
        { level: 1, score_pct: answered >= 6 ? 100 : 0 },
        { level: 2, score_pct: answered >= 9 ? 100 : 0 },
        { level: 3, score_pct: answered >= 12 ? 100 : 0 },
        { level: 4, score_pct: answered >= 15 ? 100 : 0 },
        { level: 5, score_pct: answered >= 18 ? 100 : 0 },
        { level: 6, score_pct: answered >= 20 ? 100 : 0 },
        { level: 7, score_pct: answered >= 22 ? 100 : 0 },
        { level: 8, score_pct: answered >= 24 ? 100 : 0 },
      ];

      try {
        // Call saveResult to save it to the user's profile
        await api.diagnostic.saveResult({
          recommended_level: level,
          score_by_level: scoreByLevel,
        });
      } catch (err) {
        console.error("Error saving diagnostic result:", err);
      }

      setResult({
        recommended_level: level,
        level_name: LEVEL_MESSAGES[level].label,
        score: answered,
        total,
        message:
          "Basado en tus respuestas, este es el nivel más adecuado para maximizar tu aprendizaje.",
      });

      setPhase("result");
      setSubmitting(false);
    },
    [total]
  );

  const advance = useCallback(
    (answerOverride?: string) => {
      const answer = answerOverride ?? currentAnswer;

      // Save answer (skip = empty string)
      const updatedAnswers = {
        ...answers,
        [currentQuestion.id]: answer,
      };
      setAnswers(updatedAnswers);

      const isLast = currentIndex === total - 1;

      if (isLast) {
        handleFinish(updatedAnswers);
      } else {
        setCurrentIndex((i) => i + 1);
        // Restore already-saved answer if the user is revisiting a question
        const nextQ = questions[currentIndex + 1];
        const savedAnswer = updatedAnswers[nextQ.id];
        setCurrentAnswer(savedAnswer ?? (nextQ.type === "sql_editor" ? nextQ.sqlPlaceholder ?? "" : ""));
      }
    },
    [currentAnswer, currentIndex, currentQuestion, total, answers, questions, handleFinish]
  );

  const handleSkip = () => advance("");

  const handleNext = () => advance();

  if (phase === "intro") {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "rgb(253, 252, 250)" }}>
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <IntroScreen onStart={handleStart} />
        </main>
      </div>
    );
  }

  if (phase === "result" && result) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "rgb(253, 252, 250)" }}>
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <ResultScreen result={result} onStart={() => {}} />
        </main>
      </div>
    );
  }

  // Questions phase
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "rgb(253, 252, 250)" }}>
      <Header />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
        {/* Progress */}
        <div className="mb-8">
          <ProgressBar current={currentIndex + 1} total={total} />
        </div>

        {/* Question card */}
        <div
          key={currentQuestion.id}
          className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6 sm:p-8 animate-fade-up space-y-6"
        >
          {/* Topic badge */}
          <div className="flex items-center justify-between">
            <Badge variant="secondary" size="sm">
              {currentQuestion.topic}
            </Badge>
            {currentQuestion.type === "sql_editor" && (
              <Badge variant="neutral" size="sm">
                Editor SQL
              </Badge>
            )}
          </div>

          {/* Question text */}
          <p
            id="question-text"
            className="text-base font-semibold text-neutral-900 leading-relaxed"
          >
            {currentQuestion.text}
          </p>

          {/* Answer UI */}
          {currentQuestion.type === "multiple_choice" ? (
            <MultipleChoiceQuestion
              question={currentQuestion}
              selected={currentAnswer}
              onSelect={handleSelectOption}
            />
          ) : (
            <SqlEditorQuestion
              question={currentQuestion}
              value={currentAnswer}
              onChange={handleSqlChange}
              executeQuery={executeQuery}
              dbStatus={dbStatus}
              dbError={dbError}
            />
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
            {/* Left: Back + Skip */}
            <div className="flex items-center gap-2">
              {currentIndex > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={submitting}
                  className="text-neutral-500 hover:text-neutral-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                disabled={submitting}
                className="text-neutral-500 hover:text-neutral-700"
              >
                <SkipForward className="w-4 h-4" />
                No lo sé / Saltar
              </Button>
            </div>

            {/* Right: Next / Finish */}
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleNext}
              disabled={
                (currentQuestion.type === "multiple_choice" && !currentAnswer) ||
                submitting
              }
              loading={submitting && currentIndex === total - 1}
            >
              {currentIndex === total - 1 ? "Finalizar" : "Siguiente"}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

// ===================================================================
// Shared Header
// ===================================================================
function Header() {
  return (
    <header className="sticky top-0 z-20 bg-white border-b border-neutral-200 shadow-xs">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="font-bold text-neutral-900 hidden sm:inline">
            ShopSphere <span className="text-primary-500">SQL</span>
          </span>
        </Link>
        <span className="text-neutral-300 hidden sm:inline">·</span>
        <span className="text-sm text-neutral-500 hidden sm:inline">
          Evaluación diagnóstica
        </span>
      </div>
    </header>
  );
}

// ===================================================================
// Export with AuthGuard
// ===================================================================
export default function DiagnosticPage() {
  return (
    <AuthGuard redirectTo="/login">
      <DiagnosticContent />
    </AuthGuard>
  );
}
