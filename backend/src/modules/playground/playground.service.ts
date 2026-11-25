/**
 * Servicio principal del Playground.
 *
 * Orquesta el flujo completo de validación:
 * 1. Rate limit check (Redis sliding window)
 * 2. Obtener ejercicio + expected_result (cache Redis → PostgreSQL)
 * 3. Ejecutar query en Worker pool (timeout 5s)
 * 4. Validar resultado con validation.service
 * 5. Persistir attempt y actualizar progreso (async — no bloquea respuesta)
 * 6. Retornar respuesta al cliente
 */

import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../shared/db/index.js';
import {
  exercises,
  users,
  userExerciseProgress,
  exerciseAttempts,
} from '../../shared/db/schema.js';
import { checkAndIssueCertificate } from '../certificates/certificates.service.js';
import { getRedis, getJson, setJson, CacheKeys, CacheTTL } from '../../shared/cache/redis.js';
import {
  NotFoundError,
  RateLimitError,
  ValidationError,
  ServiceUnavailableError,
} from '../../shared/errors/index.js';
import type { WorkerPool } from './worker-pool.js';
import { QueueFullError } from './worker-pool.js';
import { validate, calculateXp } from './validation.service.js';
import type { ValidationMode } from './validation.service.js';
import type { ExpectedResult } from '../exercises/exercises.service.js';

// ── Tipos de entrada y salida ─────────────────────────────────────────────────

export interface ValidateQueryInput {
  exercise_id: string;
  query: string;
}

export interface ValidateQueryResult {
  valid: boolean;
  hint?: string;
  hint_level?: number;
  xp_earned?: number;
  execution_ms: number;
  row_count_got?: number;
  row_count_expected?: number;
  error_type?: 'execution_error' | 'timeout' | 'rate_limit';
}

// ── Rate limiting ─────────────────────────────────────────────────────────────

const RATE_LIMIT_RPM = parseInt(
  process.env['PLAYGROUND_RATE_LIMIT_RPM'] ?? '60',
  10,
);

/**
 * Tamaño máximo permitido para una query del playground, en bytes (4 KB).
 * Seguridad: limita el payload procesado por el worker pool para mitigar
 * DoS por queries excesivamente grandes antes de que ocupen un worker.
 */
const MAX_QUERY_BYTES = 4096;

/**
 * Verifica y registra el rate limit del playground.
 * Implementación: sliding window basada en bucket de minuto.
 * Key: playground:ratelimit:{userId}:{minuteBucket}
 *
 * Se usa INCR + EXPIRE atómicamente para garantizar que el TTL se aplica
 * incluso si el proceso muere después del INCR.
 */
async function checkRateLimit(userId: string): Promise<void> {
  const redis = getRedis();
  // Bucket = número de minuto Unix (epoch / 60)
  const minuteBucket = Math.floor(Date.now() / 60_000);
  const key = CacheKeys.playgroundRateLimit(userId, minuteBucket);

  // Pipeline para atomicidad: INCR + EXPIRE en una sola round-trip
  const pipeline = redis.pipeline();
  pipeline.incr(key);
  pipeline.expire(key, CacheTTL.playgroundRateLimit);

  const results = await pipeline.exec();
  const count = results?.[0]?.[1] as number | null;

  if (count !== null && count > RATE_LIMIT_RPM) {
    throw new RateLimitError(
      `Playground rate limit exceeded: maximum ${RATE_LIMIT_RPM} validations per minute. ` +
        `Please slow down and try again in a moment.`,
      'PLAYGROUND_RATE_LIMIT',
    );
  }
}

// ── Obtención del expected_result ─────────────────────────────────────────────

interface ExerciseForValidation {
  id: string;
  levelId: number;
  xpReward: number;
  validationMode: ValidationMode;
  expectedResult: ExpectedResult;
  isPublished: boolean;
}

async function getExerciseForValidation(
  exerciseId: string,
): Promise<ExerciseForValidation> {
  // Intentar obtener el expected_result desde Redis
  const cacheKey = CacheKeys.exerciseExpected(exerciseId);
  let expectedResult: ExpectedResult | null = null;

  try {
    expectedResult = await getJson<ExpectedResult>(cacheKey);
  } catch {
    // Redis no disponible — continuar al fallback de DB
  }

  if (expectedResult) {
    // Cache hit: necesitamos el resto de los campos desde DB
    const [ex] = await db
      .select({
        id: exercises.id,
        levelId: exercises.levelId,
        xpReward: exercises.xpReward,
        validationMode: exercises.validationMode,
        isPublished: exercises.isPublished,
      })
      .from(exercises)
      .where(and(eq(exercises.id, exerciseId), eq(exercises.isPublished, true)))
      .limit(1);

    if (!ex) throw new NotFoundError('Exercise');

    return {
      id: ex.id,
      levelId: ex.levelId,
      xpReward: ex.xpReward,
      validationMode: ex.validationMode as ValidationMode,
      expectedResult,
      isPublished: ex.isPublished,
    };
  }

  // Cache miss: obtener todo desde DB
  const [ex] = await db
    .select({
      id: exercises.id,
      levelId: exercises.levelId,
      xpReward: exercises.xpReward,
      validationMode: exercises.validationMode,
      expectedResultJson: exercises.expectedResultJson,
      isPublished: exercises.isPublished,
    })
    .from(exercises)
    .where(and(eq(exercises.id, exerciseId), eq(exercises.isPublished, true)))
    .limit(1);

  if (!ex) throw new NotFoundError('Exercise');

  expectedResult = ex.expectedResultJson as ExpectedResult;

  // Poblar cache para futuras validaciones
  try {
    await setJson(cacheKey, expectedResult, CacheTTL.exerciseExpected);
  } catch {
    // No crítico
  }

  return {
    id: ex.id,
    levelId: ex.levelId,
    xpReward: ex.xpReward,
    validationMode: ex.validationMode as ValidationMode,
    expectedResult,
    isPublished: ex.isPublished,
  };
}

// ── Persistencia de resultados (async — no bloquea respuesta) ─────────────────

interface PersistAttemptOptions {
  userId: string;
  exerciseId: string;
  levelId: number;
  query: string;
  isCorrect: boolean;
  executionMs: number;
  xpEarned: number;
  hintsUsed: number;
  resultSnapshot?: unknown;
  errorMessage?: string;
  hintLevelShown?: number;
}

/**
 * Persiste el intento y actualiza el progreso.
 * Fire-and-forget: se llama con .catch() para no bloquear la respuesta al cliente.
 *
 * En caso de error aquí, el intento se pierde pero el estudiante ya recibió
 * el feedback. Loguear para monitoring — no lanzar.
 */
async function persistAttempt(opts: PersistAttemptOptions): Promise<void> {
  const {
    userId,
    exerciseId,
    levelId,
    query,
    isCorrect,
    executionMs,
    xpEarned,
    hintsUsed,
    resultSnapshot,
    errorMessage,
    hintLevelShown,
  } = opts;

  try {
    // 1. Insertar intento (append-only log)
    await db.insert(exerciseAttempts).values({
      userId,
      exerciseId,
      querySubmitted: query,
      isCorrect,
      errorMessage,
      hintLevelShown: hintLevelShown ?? null,
      executionMs,
      resultSnapshot: resultSnapshot ?? null,
    });

    if (isCorrect) {
      // 2a. Marcar ejercicio como completado y registrar XP
      await db
        .insert(userExerciseProgress)
        .values({
          userId,
          exerciseId,
          status: 'completed',
          attemptsCount: 1,
          hintsUsed,
          xpEarned,
          firstAttemptAt: new Date(),
          completedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [userExerciseProgress.userId, userExerciseProgress.exerciseId],
          set: {
            status: 'completed',
            attemptsCount: sql`${userExerciseProgress.attemptsCount} + 1`,
            xpEarned,
            completedAt: new Date(),
          },
        });

      // 3. Actualizar XP total del usuario (atomic UPDATE — no race condition)
      await db
        .update(users)
        .set({
          xpTotal: sql`${users.xpTotal} + ${xpEarned}`,
        })
        .where(
          and(
            eq(users.id, userId),
            // Solo sumar XP si el ejercicio no estaba ya completado
            // Esto evita duplicar XP si el estudiante re-envía una respuesta correcta
          ),
        );

      // Nota: para MVP evitamos la doble suma con una query más simple.
      // En el futuro se puede usar un UPDATE ... WHERE NOT EXISTS(SELECT 1 FROM user_exercise_progress WHERE ... AND status='completed') para atomicidad perfecta.

      // 4. Verificar y emitir certificado de nivel si corresponde (fire-and-forget)
      // No bloqueamos persistAttempt — el certificado es un efecto secundario.
      checkAndIssueCertificate(userId, levelId).catch((certErr: unknown) => {
        const msg = certErr instanceof Error ? certErr.message : String(certErr);
        console.error(
          `[playground.service] Certificate check failed for user=${userId} level=${levelId}: ${msg}`,
        );
      });
    } else {
      // 2b. Incrementar attempts_count y marcar como in_progress si era not_started
      await db
        .insert(userExerciseProgress)
        .values({
          userId,
          exerciseId,
          status: 'in_progress',
          attemptsCount: 1,
          firstAttemptAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [userExerciseProgress.userId, userExerciseProgress.exerciseId],
          set: {
            status: sql`CASE WHEN ${userExerciseProgress.status} = 'completed' THEN 'completed' ELSE 'in_progress' END`,
            attemptsCount: sql`${userExerciseProgress.attemptsCount} + 1`,
            firstAttemptAt: sql`COALESCE(${userExerciseProgress.firstAttemptAt}, NOW())`,
          },
        });
    }
  } catch (err) {
    // Loguear pero no propagar — la respuesta ya fue enviada al cliente
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[playground.service] Failed to persist attempt for user=${userId} exercise=${exerciseId}: ${msg}`);
  }
}

// ── Función principal ─────────────────────────────────────────────────────────

/**
 * Valida la query del estudiante contra el resultado esperado del ejercicio.
 *
 * @param input - exercise_id y query del estudiante
 * @param userId - ID del usuario autenticado
 * @param workerPool - Pool de Workers SQLite inyectado
 */
export async function validateQuery(
  input: ValidateQueryInput,
  userId: string,
  workerPool: WorkerPool,
): Promise<ValidateQueryResult> {
  const queryTimeoutMs = parseInt(
    process.env['PLAYGROUND_QUERY_TIMEOUT_MS'] ?? '5000',
    10,
  );

  // Paso 0 — Validar tamaño máximo de la query (4 KB) antes de tocar el pool.
  // Seguridad: rechazar payloads grandes temprano evita que ocupen un worker.
  const queryBytes = Buffer.byteLength(input.query, 'utf8');
  if (queryBytes > MAX_QUERY_BYTES) {
    throw new ValidationError(
      `Query exceeds the maximum allowed size of ${MAX_QUERY_BYTES} bytes ` +
        `(received ${queryBytes} bytes).`,
      'QUERY_TOO_LARGE',
    );
  }

  // Paso 1 — Rate limit check
  await checkRateLimit(userId);

  // Paso 2 — Obtener ejercicio y expected_result
  const exercise = await getExerciseForValidation(input.exercise_id);

  // Paso 3 — Ejecutar query del estudiante en Worker pool
  let executionResult;
  let executionError: string | null = null;

  try {
    // Si el ejercicio depende de una vista creada en otro ejercicio, se crea
    // antes de la query del estudiante (todo corre en la sandbox y se revierte).
    const setupSql = exercise.expectedResult.setup_sql;
    const script = setupSql ? `${setupSql};\n${input.query}` : input.query;

    // maxRows: la validación compara contra el resultado completo (no solo 1000 filas).
    executionResult = await workerPool.execute(script, queryTimeoutMs, {
      maxRows: 50_000,
    });
  } catch (err) {
    // Backpressure: si la cola del pool está llena, propagar como 503 en vez
    // de tratarlo como un error de la query del estudiante.
    if (err instanceof QueueFullError) {
      throw new ServiceUnavailableError(err.message, 'PLAYGROUND_AT_CAPACITY');
    }
    const msg = err instanceof Error ? err.message : String(err);
    executionError = msg;
  }

  // Si la ejecución falló, retornar error inmediatamente
  if (!executionResult) {
    // Registrar el intento fallido en background
    const isTimeout = executionError?.includes('timeout') ?? false;

    persistAttempt({
      userId,
      exerciseId: input.exercise_id,
      levelId: exercise.levelId,
      query: input.query,
      isCorrect: false,
      executionMs: queryTimeoutMs,
      xpEarned: 0,
      hintsUsed: 0,
      errorMessage: executionError ?? 'Unknown execution error',
    }).catch(() => {
      // Silenciar — ya logueamos dentro de persistAttempt
    });

    return {
      valid: false,
      hint: executionError ?? 'Query execution failed',
      hint_level: 3,
      execution_ms: queryTimeoutMs,
      error_type: isTimeout ? 'timeout' : 'execution_error',
    };
  }

  // Paso 4 — Validar resultado
  const validationResult = validate(
    executionResult,
    exercise.expectedResult,
    exercise.validationMode,
  );

  // Obtener hints_used del progreso actual (para calcular XP con penalización)
  let hintsUsed = 0;
  try {
    const [progress] = await db
      .select({ hintsUsed: userExerciseProgress.hintsUsed })
      .from(userExerciseProgress)
      .where(
        and(
          eq(userExerciseProgress.userId, userId),
          eq(userExerciseProgress.exerciseId, input.exercise_id),
        ),
      )
      .limit(1);

    hintsUsed = progress?.hintsUsed ?? 0;
  } catch {
    // No crítico — usar 0 hints si no hay registro
  }

  let xpEarned = 0;

  if (validationResult.valid) {
    // Paso 5 — Calcular XP con penalización por hints
    xpEarned = calculateXp(exercise.xpReward, hintsUsed);
  }

  // Paso 5/6 — Persistir intento en background (no bloquea respuesta)
  persistAttempt({
    userId,
    exerciseId: input.exercise_id,
    levelId: exercise.levelId,
    query: input.query,
    isCorrect: validationResult.valid,
    executionMs: executionResult.execution_ms,
    xpEarned,
    hintsUsed,
    resultSnapshot: validationResult.valid
      ? null
      : { columns: executionResult.columns, rows: executionResult.rows.slice(0, 50) },
    hintLevelShown: validationResult.hint_level ?? undefined,
  }).catch(() => {
    // Silenciar — ya logueamos dentro de persistAttempt
  });

  // Paso 7 — Retornar respuesta al cliente
  const response: ValidateQueryResult = {
    valid: validationResult.valid,
    execution_ms: executionResult.execution_ms,
    row_count_got: validationResult.row_count_got ?? executionResult.row_count,
    row_count_expected: validationResult.row_count_expected ?? exercise.expectedResult.row_count,
  };

  if (validationResult.valid) {
    response.xp_earned = xpEarned;
  } else {
    response.hint = validationResult.hint;
    response.hint_level = validationResult.hint_level;
  }

  return response;
}
