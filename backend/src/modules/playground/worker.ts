/**
 * Worker Thread del Playground SQLite.
 *
 * Este archivo corre en un proceso aislado (Worker Thread de Node.js).
 * No tiene acceso al filesystem salvo el path del dataset configurado en el
 * mensaje de inicialización. Toda ejecución de queries es síncrona gracias
 * a better-sqlite3, lo que es seguro y correcto dentro de un Worker Thread
 * (no bloquea el event loop del hilo principal).
 *
 * Ciclo de vida:
 *   1. El worker arranca y espera el mensaje de inicialización con el dataset path.
 *   2. Abre el dataset en modo readonly directo al archivo.
 *   3. Queda listo para recibir mensajes de tipo { query, timeoutMs }.
 *   4. Ejecuta la query, responde con el resultado o el error.
 *   5. Ante timeout, el pool termina el worker desde el hilo principal.
 */

import { parentPort, workerData } from 'worker_threads';
import Database from 'better-sqlite3';

// ── Tipos de mensajes ─────────────────────────────────────────────────────────

export interface WorkerQueryMessage {
  type: 'query';
  requestId: string;
  query: string;
  timeoutMs: number;
}

export interface WorkerQueryResult {
  type: 'result';
  requestId: string;
  columns: string[];
  rows: unknown[][];
  row_count: number;
  execution_ms: number;
}

export interface WorkerQueryError {
  type: 'error';
  requestId: string;
  error: string;
  error_type: 'execution_error' | 'timeout' | 'initialization_error';
}

export type WorkerOutboundMessage = WorkerQueryResult | WorkerQueryError;

// ── Inicialización del worker ─────────────────────────────────────────────────

/**
 * workerData contiene { datasetPath } pasado desde WorkerPool al crear el worker.
 * Si no viene, el worker no puede funcionar.
 */
interface WorkerInitData {
  datasetPath: string;
}

let db: Database.Database | null = null;

function initializeDatabase(datasetPath: string): void {
  try {
    // Abrir el archivo SQLite directamente en modo readonly.
    // Múltiples workers pueden apuntar al mismo archivo sin bloqueos porque
    // ninguno escribe. Si el archivo no existe o está corrupto, lanzamos aquí
    // y el pool reemplazará este worker.
    db = new Database(datasetPath, { readonly: true });

    // Configuraciones de seguridad: read-only directo al archivo, sin mutaciones
    // query_only es redundante con readonly: true, pero lo mantenemos como defensa en profundidad
    db.pragma('query_only = ON');

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    parentPort?.postMessage({
      type: 'error',
      requestId: 'init',
      error: `Failed to initialize SQLite dataset: ${msg}`,
      error_type: 'initialization_error',
    } satisfies WorkerQueryError);
    process.exit(1);
  }
}

function executeQuery(
  requestId: string,
  query: string,
): WorkerQueryResult | WorkerQueryError {
  if (!db) {
    return {
      type: 'error',
      requestId,
      error: 'Database not initialized',
      error_type: 'initialization_error',
    };
  }

  const start = performance.now();

  try {
    // better-sqlite3 es síncrono — perfecto para Worker Threads.
    // prepare() lanza inmediatamente si hay error de sintaxis SQL.
    const stmt = db.prepare(query);

    // all() retorna todas las filas. Si el query no es SELECT,
    // lanzamos un error — no permitimos mutaciones en el playground.
    if (stmt.readonly === false) {
      return {
        type: 'error',
        requestId,
        error:
          'Only SELECT queries are allowed in the playground. Mutations (INSERT, UPDATE, DELETE, DROP, etc.) are not permitted.',
        error_type: 'execution_error',
      };
    }

    // Seguridad (DoS por memoria, CWE-400): NO usar stmt.all(), que materializa
    // TODAS las filas en memoria antes de truncar. Una query como
    // `SELECT * FROM t1 CROSS JOIN t2 CROSS JOIN t3` puede producir cientos de
    // millones de filas y agotar la memoria del worker antes de que el timeout
    // de 5s lo termine. En su lugar, iteramos y cortamos en un límite duro de
    // escaneo, acotando la memoria a un número fijo de filas.
    const MAX_RESPONSE_ROWS = 1000; // filas devueltas al cliente
    const MAX_SCAN_ROWS = 50_000;   // límite duro de filas materializadas

    // Columnas del statement (disponibles aunque no haya filas).
    const columns = stmt.columns().map((c) => c.name);

    const serializedRows: unknown[][] = [];
    let scanned = 0;

    for (const row of stmt.iterate() as IterableIterator<Record<string, unknown>>) {
      scanned++;
      if (serializedRows.length < MAX_RESPONSE_ROWS) {
        serializedRows.push(columns.map((col) => row[col] ?? null));
      }
      // Cortar el escaneo al alcanzar el límite duro — protege la memoria del
      // worker frente a productos cartesianos masivos.
      if (scanned >= MAX_SCAN_ROWS) break;
    }

    const execution_ms = Math.round(performance.now() - start);

    return {
      type: 'result',
      requestId,
      columns,
      rows: serializedRows,
      row_count: scanned,
      execution_ms,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      type: 'error',
      requestId,
      error: msg,
      error_type: 'execution_error',
    };
  }
}

// ── Main loop del worker ──────────────────────────────────────────────────────

if (!parentPort) {
  // Este archivo solo debe correr como Worker Thread, no como script directo
  throw new Error('This file must be run as a Worker Thread, not directly.');
}

const initData = workerData as WorkerInitData | undefined;
if (!initData?.datasetPath) {
  parentPort.postMessage({
    type: 'error',
    requestId: 'init',
    error: 'Worker started without datasetPath in workerData',
    error_type: 'initialization_error',
  } satisfies WorkerQueryError);
  process.exit(1);
}

initializeDatabase(initData.datasetPath);

// Notificar al pool que el worker está listo
parentPort.postMessage({ type: 'ready' });

// Escuchar queries del pool principal
parentPort.on('message', (msg: WorkerQueryMessage) => {
  if (msg.type !== 'query') return;

  const result = executeQuery(msg.requestId, msg.query);
  parentPort!.postMessage(result);
});
