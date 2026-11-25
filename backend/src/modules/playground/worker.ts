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
 *   2. Carga el dataset en una base de datos EN MEMORIA (copia privada del
 *      worker). El archivo en disco nunca se abre en modo escritura.
 *   3. Queda listo para recibir mensajes de tipo { query, timeoutMs }.
 *   4. Ejecuta el script del estudiante dentro de una transacción que SIEMPRE
 *      se revierte (sandbox): puede crear vistas, usar EXPLAIN o practicar
 *      transacciones, pero nada persiste entre envíos ni entre estudiantes.
 *      Se responde con el resultado de la ÚLTIMA instrucción del script.
 *   5. Ante timeout, el pool termina el worker desde el hilo principal.
 */

import { parentPort, workerData } from 'worker_threads';
import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';
import { splitSqlStatements, firstKeyword, createViewName } from './sql-script.js';

// ── Tipos de mensajes ─────────────────────────────────────────────────────────

export interface WorkerQueryMessage {
  type: 'query';
  requestId: string;
  query: string;
  timeoutMs: number;
  /** Filas a devolver (por defecto 1000). La validación pide todas las escaneadas. */
  maxRows?: number;
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
let datasetBuffer: Buffer | null = null;

/** Límite de memoria de SQLite por worker (dataset en memoria + datos temporales). */
const SQLITE_HEAP_LIMIT_BYTES = 256 * 1024 * 1024;
/** Máximo de instrucciones por envío (evita scripts gigantes). */
const MAX_STATEMENTS = 30;

/**
 * Instrucciones prohibidas aunque todo se revierta:
 * - ATTACH/DETACH y VACUUM (VACUUM INTO) pueden leer o escribir archivos del servidor.
 * - PRAGMA puede cambiar la configuración del motor (p. ej. desactivar límites).
 */
const BLOCKED_KEYWORDS = new Set(['ATTACH', 'DETACH', 'VACUUM', 'PRAGMA']);

function openInMemory(): Database.Database {
  if (!datasetBuffer) throw new Error('Dataset buffer not loaded');
  // Copia privada en memoria: lo que haga el estudiante nunca toca el archivo.
  const memDb = new Database(datasetBuffer);
  memDb.pragma(`hard_heap_limit = ${SQLITE_HEAP_LIMIT_BYTES}`);
  return memDb;
}

function initializeDatabase(datasetPath: string): void {
  try {
    const buf = readFileSync(datasetPath);
    // better-sqlite3 no puede abrir en memoria un archivo en modo WAL
    // (bytes 18-19 de la cabecera = 2). Se fuerza modo "legacy" (1) en la copia.
    if (buf.length > 19 && buf[18] === 2 && buf[19] === 2) {
      buf[18] = 1;
      buf[19] = 1;
    }
    datasetBuffer = buf;
    db = openInMemory();
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

/**
 * Si por cualquier motivo la transacción sandbox terminó antes de tiempo,
 * los cambios del estudiante podrían quedar en la copia en memoria. En ese caso
 * se descarta la copia y se recarga desde el buffer original.
 */
function resetDatabase(): void {
  try {
    db?.close();
  } catch {
    /* ignorar */
  }
  db = openInMemory();
}

class SandboxError extends Error {}

/**
 * Traduce el control de transacciones del estudiante a SAVEPOINTs anidados
 * dentro de la transacción sandbox, para que nunca pueda hacer COMMIT real.
 * Devuelve el SQL a ejecutar, o null si la instrucción debe ignorarse.
 */
function translateTransactionControl(
  keyword: string,
  statement: string,
  stack: string[],
): string | null | undefined {
  const normalized = statement.trim().replace(/\s+/g, ' ').toUpperCase();
  if (keyword === 'BEGIN') {
    const name = `user_tx_${stack.length}`;
    stack.push(name);
    return `SAVEPOINT ${name}`;
  }
  if (keyword === 'COMMIT' || keyword === 'END') {
    const name = stack.pop();
    return name ? `RELEASE ${name}` : null;
  }
  if (keyword === 'ROLLBACK' && !/^ROLLBACK( TRANSACTION)? TO /.test(normalized)) {
    const name = stack.pop();
    return name ? `ROLLBACK TO ${name}; RELEASE ${name}` : null;
  }
  // SAVEPOINT x, RELEASE x y ROLLBACK TO x son válidos tal cual dentro de la sandbox.
  return undefined;
}

function executeQuery(
  requestId: string,
  query: string,
  maxRows?: number,
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
  const MAX_SCAN_ROWS = 50_000; // límite duro de filas materializadas
  // Filas devueltas al hilo principal. La validación necesita TODAS las filas
  // escaneadas: si solo recibe las primeras 1000, una query correcta pero con
  // otro orden puede fallar al comparar la muestra del resultado esperado.
  const MAX_RESPONSE_ROWS = Math.min(maxRows ?? 1000, MAX_SCAN_ROWS);

  const statements = splitSqlStatements(query);
  if (statements.length === 0) {
    return { type: 'error', requestId, error: 'La consulta está vacía.', error_type: 'execution_error' };
  }
  if (statements.length > MAX_STATEMENTS) {
    return {
      type: 'error',
      requestId,
      error: `Demasiadas instrucciones (${statements.length}). El máximo es ${MAX_STATEMENTS}.`,
      error_type: 'execution_error',
    };
  }

  const database = db;
  database.exec('BEGIN');
  const txStack: string[] = [];

  try {
    let columns: string[] = [];
    let serializedRows: unknown[][] = [];
    let scanned = 0;

    for (let i = 0; i < statements.length; i++) {
      // Defensa en profundidad: la sandbox debe seguir abierta en cada paso.
      if (!database.inTransaction) {
        throw new SandboxError('La sesión de ejecución se cerró inesperadamente. Intenta de nuevo.');
      }

      const sqlText = statements[i]!;
      const keyword = firstKeyword(sqlText);
      const isLast = i === statements.length - 1;

      if (BLOCKED_KEYWORDS.has(keyword)) {
        throw new SandboxError(`La instrucción ${keyword} no está permitida en el playground.`);
      }

      const translated = translateTransactionControl(keyword, sqlText, txStack);
      if (translated !== undefined) {
        if (translated) database.exec(translated);
        if (isLast) {
          columns = [];
          serializedRows = [];
          scanned = 0;
        }
        continue;
      }

      // Si la vista ya existe (p. ej. la creó el setup del ejercicio), un
      // CREATE VIEW del estudiante la reemplaza en vez de fallar.
      const viewName = createViewName(sqlText);
      if (viewName) database.exec(`DROP VIEW IF EXISTS ${viewName}`);

      // prepare() lanza inmediatamente si hay error de sintaxis SQL.
      const stmt = database.prepare(sqlText);

      if (!stmt.reader) {
        stmt.run();
        if (isLast) {
          columns = [];
          serializedRows = [];
          scanned = 0;
        }
        continue;
      }

      // Seguridad (DoS por memoria, CWE-400): NO usar stmt.all(), que materializa
      // TODAS las filas en memoria antes de truncar. Iteramos y cortamos en un
      // límite duro de escaneo, acotando la memoria a un número fijo de filas.
      const stmtColumns = stmt.columns().map((c) => c.name);
      const rows: unknown[][] = [];
      let count = 0;
      for (const row of stmt.iterate() as IterableIterator<Record<string, unknown>>) {
        count++;
        if (isLast && rows.length < MAX_RESPONSE_ROWS) {
          rows.push(stmtColumns.map((col) => row[col] ?? null));
        }
        if (count >= MAX_SCAN_ROWS) break;
      }
      if (isLast) {
        columns = stmtColumns;
        serializedRows = rows;
        scanned = count;
      }
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
  } finally {
    // Nada de lo que hizo el estudiante sobrevive a este envío.
    if (database.inTransaction) {
      try {
        database.exec('ROLLBACK');
      } catch {
        resetDatabase();
      }
    } else {
      resetDatabase();
    }
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

  const result = executeQuery(msg.requestId, msg.query, msg.maxRows);
  parentPort!.postMessage(result);
});
