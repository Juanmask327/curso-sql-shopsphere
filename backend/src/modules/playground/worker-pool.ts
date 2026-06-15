/**
 * Pool de Worker Threads para el Playground SQLite.
 *
 * Gestiona N workers, cada uno con su instancia SQLite en memoria cargada
 * desde el mismo dataset. Diseño:
 *   - Workers se crean al arrancar y se reemplazan automáticamente si crashean.
 *   - Cola FIFO: si todos los workers están ocupados, las peticiones esperan
 *     hasta ACQUIRE_TIMEOUT_MS antes de rechazar.
 *   - Las métricas se exponen como propiedades para Prometheus.
 *
 * Thread safety: Node.js es single-threaded en el event loop — no hay race
 * conditions en las estructuras de datos de este pool.
 */

import { Worker } from 'worker_threads';
import { cpus } from 'os';
import { resolve, dirname, join } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import type {
  WorkerQueryMessage,
  WorkerQueryResult,
  WorkerQueryError,
  WorkerOutboundMessage,
} from './worker.js';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  row_count: number;
  execution_ms: number;
}

/**
 * Error lanzado cuando la cola del pool está llena.
 * Seguridad: el límite de cola evita un crecimiento ilimitado de peticiones
 * pendientes (backpressure / DoS). La capa de servicio lo mapea a HTTP 503.
 */
export class QueueFullError extends Error {
  public readonly code = 'WORKER_POOL_QUEUE_FULL';
  constructor(message: string) {
    super(message);
    this.name = 'QueueFullError';
  }
}

interface PendingRequest {
  requestId: string;
  resolve: (result: QueryResult) => void;
  reject: (err: Error) => void;
  timeoutHandle: NodeJS.Timeout;
}

interface PoolWorker {
  worker: Worker;
  busy: boolean;
  /** La petición que está procesando actualmente, si está ocupado. */
  currentRequest: PendingRequest | null;
}

interface QueueEntry {
  query: string;
  timeoutMs: number;
  resolve: (result: QueryResult) => void;
  reject: (err: Error) => void;
  queuedAt: number;
}

// ── Configuración ─────────────────────────────────────────────────────────────

const DEFAULT_POOL_SIZE = Math.ceil(cpus().length * 1.5);
/** Tiempo máximo que una petición espera en cola a que un worker quede libre. */
const ACQUIRE_TIMEOUT_MS = 3_000;
/** Tiempo máximo total de una query (override por petición). */
const DEFAULT_QUERY_TIMEOUT_MS = 5_000;

// ── WorkerPool ────────────────────────────────────────────────────────────────

export class WorkerPool {
  private readonly poolSize: number;
  /** Tamaño máximo de la cola de espera (poolSize * 10). */
  private readonly maxQueue: number;
  private readonly datasetPath: string;
  private readonly workerScriptPath: string;

  private workers: PoolWorker[] = [];
  private queue: QueueEntry[] = [];
  private nextRequestId = 0;

  /** Métricas para Prometheus. Leer como propiedades. */
  get metrics() {
    const busy = this.workers.filter((w) => w.busy).length;
    return {
      workers_total: this.workers.length,
      workers_busy: busy,
      workers_idle: this.workers.length - busy,
      queue_depth: this.queue.length,
    };
  }

  constructor(options?: { poolSize?: number; datasetPath?: string }) {
    this.poolSize =
      options?.poolSize ??
      parseInt(process.env['PLAYGROUND_WORKER_POOL_SIZE'] ?? String(DEFAULT_POOL_SIZE), 10);

    // Límite de backpressure: rechazar nuevas peticiones cuando la cola
    // alcanza poolSize * 10. Evita acumulación ilimitada bajo carga.
    this.maxQueue = this.poolSize * 10;

    const rawPath =
      options?.datasetPath ??
      process.env['PLAYGROUND_DATASET_PATH'] ??
      './data/dataset.db';

    this.datasetPath = resolve(rawPath);

    // En producción usamos worker.js compilado; en dev lo compilamos en initialize().
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const isDev = __filename.endsWith('.ts');
    this.workerScriptPath = isDev
      ? resolve(__dirname, 'worker.ts') // placeholder; se reemplaza en initialize()
      : resolve(__dirname, 'worker.js');
  }

  /**
   * Inicializa el pool: crea todos los workers y espera a que estén listos.
   * Llamar una vez al arrancar la aplicación.
   */
  async initialize(): Promise<void> {
    // En dev, worker.ts no puede cargarse directo en un Worker thread (Node.js 22
    // no soporta hooks ESM en workers). Lo compilamos a JS con esbuild primero.
    if (this.workerScriptPath.endsWith('.ts')) {
      const { build } = await import('esbuild');
      // Output junto al worker.ts para que Node.js resuelva node_modules desde /app/
      const outfile = this.workerScriptPath.replace(/\.ts$/, '-compiled.mjs');
      await build({
        entryPoints: [this.workerScriptPath],
        outfile,
        bundle: false,
        format: 'esm',
        platform: 'node',
      });
      (this as any).workerScriptPath = outfile;
    }

    const initPromises = Array.from({ length: this.poolSize }, (_, i) =>
      this.spawnWorker(i),
    );
    await Promise.all(initPromises);
  }

  /**
   * Destruye todos los workers limpiamente.
   * Llamar en el graceful shutdown.
   */
  async destroy(): Promise<void> {
    const terminatePromises = this.workers.map((pw) => pw.worker.terminate());
    await Promise.all(terminatePromises);
    this.workers = [];
  }

  /**
   * Ejecuta una query en el pool.
   * Si todos los workers están ocupados, encola la petición.
   * Rechaza si la cola espera más de ACQUIRE_TIMEOUT_MS.
   */
  async execute(
    query: string,
    timeoutMs: number = DEFAULT_QUERY_TIMEOUT_MS,
  ): Promise<QueryResult> {
    const idleWorker = this.workers.find((w) => !w.busy);

    if (idleWorker) {
      return this.runOnWorker(idleWorker, query, timeoutMs);
    }

    // Backpressure: si la cola está llena, rechazar de inmediato (HTTP 503).
    if (this.queue.length >= this.maxQueue) {
      throw new QueueFullError(
        `Worker pool queue is full (${this.queue.length}/${this.maxQueue}). ` +
          `The server is at capacity — please try again shortly.`,
      );
    }

    // Todos ocupados: encolar con timeout
    return new Promise<QueryResult>((resolve, reject) => {
      const queuedAt = Date.now();

      const acquireTimeout = setTimeout(() => {
        // Remover de la cola si sigue esperando
        this.queue = this.queue.filter((e) => e.queuedAt !== queuedAt);
        reject(
          new Error(
            `Worker pool exhausted: all ${this.poolSize} workers are busy. ` +
              `Your query was queued for ${ACQUIRE_TIMEOUT_MS}ms without being processed. ` +
              `Try again in a moment.`,
          ),
        );
      }, ACQUIRE_TIMEOUT_MS);

      this.queue.push({
        query,
        timeoutMs,
        resolve: (result) => {
          clearTimeout(acquireTimeout);
          resolve(result);
        },
        reject: (err) => {
          clearTimeout(acquireTimeout);
          reject(err);
        },
        queuedAt,
      });
    });
  }

  // ── Internals ───────────────────────────────────────────────────────────────

  private async spawnWorker(index: number): Promise<PoolWorker> {
    return new Promise<PoolWorker>((resolve, reject) => {
      const worker = new Worker(this.workerScriptPath, {
        workerData: { datasetPath: this.datasetPath },
        // Limitar la superficie de ataque: el worker no hereda el env completo.
        // Aplica tanto en dev (esbuild-compiled .mjs) como en prod (.js compilado).
        env: {
          NODE_ENV: process.env['NODE_ENV'] ?? 'production',
        },
      });

      const pw: PoolWorker = {
        worker,
        busy: false,
        currentRequest: null,
      };

      const readyTimeout = setTimeout(() => {
        reject(new Error(`Worker ${index} failed to initialize within 10s`));
      }, 10_000);

      worker.once('message', (msg: { type: string }) => {
        if (msg.type === 'ready') {
          clearTimeout(readyTimeout);

          // Registrar el handler de mensajes permanente
          worker.on('message', (result: WorkerOutboundMessage) => {
            this.handleWorkerMessage(pw, result);
          });

          worker.on('error', (err) => {
            this.handleWorkerCrash(pw, err);
          });

          worker.on('exit', (code) => {
            if (code !== 0) {
              this.handleWorkerCrash(
                pw,
                new Error(`Worker exited with code ${code}`),
              );
            }
          });

          if (index < this.workers.length) {
            this.workers[index] = pw;
          } else {
            this.workers.push(pw);
          }

          resolve(pw);
        }
      });

      // Si el primer mensaje es un error de inicialización
      worker.once('error', (err) => {
        clearTimeout(readyTimeout);
        reject(err);
      });
    });
  }

  private async runOnWorker(
    pw: PoolWorker,
    query: string,
    timeoutMs: number,
  ): Promise<QueryResult> {
    return new Promise<QueryResult>((resolve, reject) => {
      const requestId = String(this.nextRequestId++);

      // Timeout de la query individual
      const timeoutHandle = setTimeout(() => {
        // Terminar el worker — mejor crear uno nuevo que dejar uno colgado
        pw.worker.terminate().catch(() => {
          // Ya siendo terminado — ignorar error de terminate
        });

        // El handler de exit/error del worker limpiará pw y despachará la cola
        reject(
          new Error(
            `Query exceeded timeout of ${timeoutMs}ms. ` +
              `Ensure your query doesn't produce infinite loops or scan demasiado grandes tablas.`,
          ),
        );
      }, timeoutMs);

      pw.busy = true;
      pw.currentRequest = { requestId, resolve, reject, timeoutHandle };

      const msg: WorkerQueryMessage = {
        type: 'query',
        requestId,
        query,
        timeoutMs,
      };

      pw.worker.postMessage(msg);
    });
  }

  private handleWorkerMessage(
    pw: PoolWorker,
    msg: WorkerOutboundMessage,
  ): void {
    const pending = pw.currentRequest;
    if (!pending || pending.requestId !== msg.requestId) {
      // Respuesta huérfana — ignorar
      return;
    }

    clearTimeout(pending.timeoutHandle);
    pw.busy = false;
    pw.currentRequest = null;

    if (msg.type === 'result') {
      pending.resolve({
        columns: msg.columns,
        rows: msg.rows,
        row_count: msg.row_count,
        execution_ms: msg.execution_ms,
      });
    } else {
      pending.reject(new Error(msg.error));
    }

    // Despachar el siguiente de la cola si hay peticiones esperando
    this.drainQueue(pw);
  }

  private handleWorkerCrash(pw: PoolWorker, err: Error): void {
    const pending = pw.currentRequest;

    if (pending) {
      clearTimeout(pending.timeoutHandle);
      pending.reject(
        new Error(
          `Query execution failed: worker process crashed unexpectedly. Error: ${err.message}`,
        ),
      );
    }

    // Reemplazar el worker crasheado automáticamente
    const index = this.workers.indexOf(pw);
    if (index !== -1) {
      this.spawnWorker(index).then((newPw) => {
        this.workers[index] = newPw;
        // Si hay peticiones en cola, el nuevo worker puede tomarlas
        this.drainQueue(newPw);
      }).catch((spawnErr: unknown) => {
        // Fallar silenciosamente — el pool opera con N-1 workers temporalmente
        // El monitoring alertará por workers_total < esperado
        const msg = spawnErr instanceof Error ? spawnErr.message : String(spawnErr);
        console.error(`[WorkerPool] Failed to replace crashed worker: ${msg}`);
      });
    }
  }

  private drainQueue(idleWorker: PoolWorker): void {
    if (this.queue.length === 0 || idleWorker.busy) return;

    const next = this.queue.shift();
    if (!next) return;

    // Ejecutar la siguiente petición en el worker libre
    this.runOnWorker(idleWorker, next.query, next.timeoutMs)
      .then(next.resolve)
      .catch(next.reject);
  }
}

// ── Fastify type augmentation ─────────────────────────────────────────────────
// Declara el decorador workerPool para que TypeScript lo reconozca en FastifyInstance.
// Colocado aquí porque WorkerPool se define en este mismo archivo.

declare module 'fastify' {
  interface FastifyInstance {
    workerPool: WorkerPool;
  }
}

// ── Singleton del pool ────────────────────────────────────────────────────────

let poolInstance: WorkerPool | null = null;

export function getWorkerPool(): WorkerPool {
  if (!poolInstance) {
    poolInstance = new WorkerPool();
  }
  return poolInstance;
}

export async function initWorkerPool(): Promise<WorkerPool> {
  const pool = getWorkerPool();
  await pool.initialize();
  return pool;
}

export async function destroyWorkerPool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.destroy();
    poolInstance = null;
  }
}
