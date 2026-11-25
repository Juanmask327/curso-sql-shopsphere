import { eq, and, asc } from 'drizzle-orm';
import { db } from '../../shared/db/index.js';
import {
  exercises,
  levels,
  userExerciseProgress,
  type Exercise,
} from '../../shared/db/schema.js';
import { getJson, setJson, del, CacheKeys, CacheTTL } from '../../shared/cache/redis.js';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '../../shared/errors/index.js';
import type {
  ExercisePublic,
  ExerciseDetail,
  ExerciseProgress,
  HintResponse,
  ExerciseAdmin,
  CreateExerciseInput,
  UpdateExerciseInput,
} from './exercises.schemas.js';

// ── Tipos internos ────────────────────────────────────────────────────────────

/**
 * Resultado esperado almacenado como JSONB en la tabla exercises.
 * Pre-calculado al crear/editar el ejercicio ejecutando la reference_query.
 */
export interface ExpectedResult {
  columns: string[];
  rows: unknown[][];
  row_count: number;
  /**
   * SQL que se ejecuta antes de la query del estudiante (dentro de la misma
   * sandbox). Lo usan los ejercicios que consultan una vista creada en otro
   * ejercicio (p. ej. v_funnel_adquisicion del Nivel 7).
   */
  setup_sql?: string;
}

/**
 * Interfaz para el ejecutor de la reference_query.
 * Inyectada para facilitar testing sin depender del Worker pool real.
 */
export interface QueryExecutor {
  execute(query: string, timeoutMs: number): Promise<ExpectedResult>;
}

// ── Proyectores ───────────────────────────────────────────────────────────────

function toPublicExercise(ex: Exercise): ExercisePublic {
  return {
    id: ex.id,
    level_id: ex.levelId,
    title: ex.title,
    description: ex.description,
    instructions: ex.instructions,
    difficulty: ex.difficulty,
    xp_reward: ex.xpReward,
    // hints está almacenado como JSONB — siempre es un array de strings
    hints: (ex.hints as string[]) ?? [],
    order_index: ex.orderIndex,
    is_published: ex.isPublished,
    created_at: ex.createdAt.toISOString(),
    updated_at: ex.updatedAt.toISOString(),
  };
}

function toProgressShape(
  row: typeof userExerciseProgress.$inferSelect | null,
): ExerciseProgress | null {
  if (!row) return null;
  return {
    status: row.status,
    attempts_count: row.attemptsCount,
    hints_used: row.hintsUsed,
    xp_earned: row.xpEarned,
    last_query: row.lastQuery ?? null,
    completed_at: row.completedAt ? row.completedAt.toISOString() : null,
    first_attempt_at: row.firstAttemptAt ? row.firstAttemptAt.toISOString() : null,
  };
}

// ── Queries internas ──────────────────────────────────────────────────────────

async function findPublishedExercise(exerciseId: string): Promise<Exercise> {
  const [ex] = await db
    .select()
    .from(exercises)
    .where(and(eq(exercises.id, exerciseId), eq(exercises.isPublished, true)))
    .limit(1);

  if (!ex) throw new NotFoundError('Exercise');
  return ex;
}

async function findExerciseForAdmin(exerciseId: string): Promise<Exercise> {
  const [ex] = await db
    .select()
    .from(exercises)
    .where(eq(exercises.id, exerciseId))
    .limit(1);

  if (!ex) throw new NotFoundError('Exercise');
  return ex;
}

/**
 * Obtiene o crea el registro de progreso del usuario para el ejercicio.
 * Usa upsert-style: si no existe, inserta con valores default.
 * Retorna null solo si hay un error inesperado — nunca debería pasar.
 */
async function getOrInitProgress(
  userId: string,
  exerciseId: string,
): Promise<typeof userExerciseProgress.$inferSelect | null> {
  const [existing] = await db
    .select()
    .from(userExerciseProgress)
    .where(
      and(
        eq(userExerciseProgress.userId, userId),
        eq(userExerciseProgress.exerciseId, exerciseId),
      ),
    )
    .limit(1);

  if (existing) return existing;

  // Crear registro inicial — el ejercicio existe (verificado por quien llama)
  const [created] = await db
    .insert(userExerciseProgress)
    .values({
      userId,
      exerciseId,
      status: 'not_started',
    })
    .returning();

  return created ?? null;
}

// ── Métodos públicos del servicio ─────────────────────────────────────────────

/**
 * Lista ejercicios publicados con filtros opcionales.
 * No retorna reference_query ni expected_result_json.
 */
export async function listExercises(filters: {
  levelId?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}): Promise<ExercisePublic[]> {
  const conditions = [eq(exercises.isPublished, true)];

  if (filters.levelId !== undefined) {
    conditions.push(eq(exercises.levelId, filters.levelId));
  }

  if (filters.difficulty) {
    conditions.push(eq(exercises.difficulty, filters.difficulty));
  }

  const rows = await db
    .select()
    .from(exercises)
    .where(and(...conditions))
    .orderBy(asc(exercises.levelId), asc(exercises.orderIndex));

  return rows.map(toPublicExercise);
}

/**
 * Retorna el detalle de un ejercicio para el estudiante,
 * incluyendo su progreso actual en ese ejercicio.
 */
export async function getExerciseDetail(
  exerciseId: string,
  userId: string,
): Promise<ExerciseDetail> {
  const ex = await findPublishedExercise(exerciseId);

  const [progressRow] = await db
    .select()
    .from(userExerciseProgress)
    .where(
      and(
        eq(userExerciseProgress.userId, userId),
        eq(userExerciseProgress.exerciseId, exerciseId),
      ),
    )
    .limit(1);

  return {
    ...toPublicExercise(ex),
    progress: toProgressShape(progressRow ?? null),
  };
}

/**
 * Solicita la siguiente pista disponible para el ejercicio.
 * Incrementa hints_used en el progreso del usuario.
 */
export async function requestHint(
  exerciseId: string,
  userId: string,
): Promise<HintResponse> {
  const ex = await findPublishedExercise(exerciseId);
  const hints = (ex.hints as string[]) ?? [];

  const progress = await getOrInitProgress(userId, exerciseId);
  if (!progress) throw new NotFoundError('Exercise progress');

  const hintsUsed = progress.hintsUsed;

  if (hintsUsed >= hints.length) {
    throw new ValidationError(
      `No more hints available. This exercise has ${hints.length} hint(s) total.`,
      'NO_MORE_HINTS',
    );
  }

  // El estudiante aún no ha visto hints[hintsUsed]
  const hint = hints[hintsUsed];
  if (hint === undefined) throw new NotFoundError('Hint');

  // Marcar como in_progress si estaba not_started
  const newStatus =
    progress.status === 'not_started' ? 'in_progress' : progress.status;

  await db
    .update(userExerciseProgress)
    .set({
      hintsUsed: hintsUsed + 1,
      status: newStatus,
    })
    .where(
      and(
        eq(userExerciseProgress.userId, userId),
        eq(userExerciseProgress.exerciseId, exerciseId),
      ),
    );

  return {
    hint,
    hint_index: hintsUsed, // índice base-0 del hint entregado
    hints_remaining: hints.length - hintsUsed - 1,
  };
}

/**
 * Obtiene el progreso del usuario en un ejercicio específico.
 */
export async function getExerciseProgress(
  exerciseId: string,
  userId: string,
): Promise<ExerciseProgress> {
  // Verificar que el ejercicio existe y está publicado
  await findPublishedExercise(exerciseId);

  const [progressRow] = await db
    .select()
    .from(userExerciseProgress)
    .where(
      and(
        eq(userExerciseProgress.userId, userId),
        eq(userExerciseProgress.exerciseId, exerciseId),
      ),
    )
    .limit(1);

  if (!progressRow) {
    // Sin registro = nunca empezó — retornar estado inicial
    return {
      status: 'not_started',
      attempts_count: 0,
      hints_used: 0,
      xp_earned: 0,
      last_query: null,
      completed_at: null,
      first_attempt_at: null,
    };
  }

  return toProgressShape(progressRow)!;
}

/**
 * Guarda el borrador de la query del usuario (auto-save).
 * Crea el registro de progreso si no existe todavía.
 * No valida la query — solo persiste el texto.
 */
export async function saveDraft(
  exerciseId: string,
  userId: string,
  query: string,
): Promise<void> {
  // Verificar que el ejercicio existe y está publicado
  await findPublishedExercise(exerciseId);

  // Upsert: si no hay registro de progreso, crearlo con status in_progress
  const existing = await getOrInitProgress(userId, exerciseId);
  if (!existing) throw new NotFoundError('Exercise progress');

  const newStatus =
    existing.status === 'not_started' ? 'in_progress' : existing.status;

  await db
    .update(userExerciseProgress)
    .set({
      lastQuery: query,
      status: newStatus,
    })
    .where(
      and(
        eq(userExerciseProgress.userId, userId),
        eq(userExerciseProgress.exerciseId, exerciseId),
      ),
    );
}

// ── Admin: creación y edición ─────────────────────────────────────────────────

/**
 * Crea un ejercicio nuevo.
 * Ejecuta reference_query contra el dataset SQLite para pre-calcular
 * expected_result_json y almacenarlo en DB.
 */
export async function createExercise(
  input: CreateExerciseInput,
  executor: QueryExecutor,
): Promise<ExerciseAdmin> {
  // Verificar que el nivel existe
  const [level] = await db
    .select({ id: levels.id })
    .from(levels)
    .where(eq(levels.id, input.level_id))
    .limit(1);

  if (!level) throw new NotFoundError('Level');

  // Calcular expected_result_json ejecutando la reference_query
  let expectedResult: ExpectedResult;
  try {
    expectedResult = await executor.execute(
      input.reference_query,
      10_000, // 10s timeout para admin (más generoso que el límite de estudiantes)
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new ValidationError(
      `reference_query execution failed: ${msg}`,
      'REFERENCE_QUERY_ERROR',
    );
  }

  const [created] = await db
    .insert(exercises)
    .values({
      levelId: input.level_id,
      title: input.title,
      description: input.description,
      instructions: input.instructions,
      difficulty: input.difficulty,
      xpReward: input.xp_reward,
      referenceQuery: input.reference_query,
      expectedResultJson: expectedResult,
      validationMode: input.validation_mode,
      hints: input.hints,
      orderIndex: input.order_index,
      isPublished: false, // Siempre empieza despublicado
    })
    .returning();

  if (!created) throw new Error('Failed to create exercise');

  return toAdminExercise(created);
}

/**
 * Actualiza un ejercicio.
 * Si cambia reference_query, recalcula expected_result_json e invalida el cache.
 */
export async function updateExercise(
  exerciseId: string,
  input: UpdateExerciseInput,
  executor: QueryExecutor,
): Promise<ExerciseAdmin> {
  const existing = await findExerciseForAdmin(exerciseId);

  // Si se cambia el nivel, verificar que existe
  if (input.level_id !== undefined) {
    const [level] = await db
      .select({ id: levels.id })
      .from(levels)
      .where(eq(levels.id, input.level_id))
      .limit(1);

    if (!level) throw new NotFoundError('Level');
  }

  let expectedResultJson = existing.expectedResultJson;
  let recalculated = false;

  // Recalcular si cambió la reference_query
  if (input.reference_query !== undefined && input.reference_query !== existing.referenceQuery) {
    try {
      expectedResultJson = await executor.execute(input.reference_query, 10_000);
      recalculated = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new ValidationError(
        `reference_query execution failed: ${msg}`,
        'REFERENCE_QUERY_ERROR',
      );
    }
  }

  const updatePayload: Partial<typeof exercises.$inferInsert> = {};
  if (input.level_id !== undefined) updatePayload.levelId = input.level_id;
  if (input.title !== undefined) updatePayload.title = input.title;
  if (input.description !== undefined) updatePayload.description = input.description;
  if (input.instructions !== undefined) updatePayload.instructions = input.instructions;
  if (input.difficulty !== undefined) updatePayload.difficulty = input.difficulty;
  if (input.xp_reward !== undefined) updatePayload.xpReward = input.xp_reward;
  if (input.reference_query !== undefined) updatePayload.referenceQuery = input.reference_query;
  if (input.validation_mode !== undefined) updatePayload.validationMode = input.validation_mode;
  if (input.hints !== undefined) updatePayload.hints = input.hints;
  if (input.order_index !== undefined) updatePayload.orderIndex = input.order_index;
  if (recalculated) updatePayload.expectedResultJson = expectedResultJson;

  const [updated] = await db
    .update(exercises)
    .set(updatePayload)
    .where(eq(exercises.id, exerciseId))
    .returning();

  if (!updated) throw new NotFoundError('Exercise');

  // Invalidar cache Redis si se recalculó el expected_result
  if (recalculated) {
    try {
      await del(CacheKeys.exerciseExpected(exerciseId));
    } catch {
      // No crítico — el cache expirará en TTL de todos modos
    }
  }

  return toAdminExercise(updated);
}

/**
 * Publica o despublica un ejercicio (toggle controlado por body).
 */
export async function togglePublish(
  exerciseId: string,
  isPublished: boolean,
): Promise<ExerciseAdmin> {
  const [updated] = await db
    .update(exercises)
    .set({ isPublished })
    .where(eq(exercises.id, exerciseId))
    .returning();

  if (!updated) throw new NotFoundError('Exercise');

  return toAdminExercise(updated);
}

// ── Helper admin ──────────────────────────────────────────────────────────────

function toAdminExercise(ex: Exercise): ExerciseAdmin {
  return {
    ...toPublicExercise(ex),
    reference_query: ex.referenceQuery,
    expected_result_json: ex.expectedResultJson,
    validation_mode: ex.validationMode,
  };
}

/**
 * Obtiene el expected_result de un ejercicio.
 * Primero intenta Redis (cache con TTL 1h), fallback a PostgreSQL.
 * Usado por playground.service para obtener el resultado esperado.
 */
export async function getExpectedResult(exerciseId: string): Promise<{
  expectedResult: ExpectedResult;
  validationMode: 'exact_ordered' | 'exact_unordered' | 'schema_match';
}> {
  // Intentar cache Redis primero
  try {
    const cached = await getJson<ExpectedResult>(
      CacheKeys.exerciseExpected(exerciseId),
    );
    if (cached) {
      // Necesitamos el validation_mode también — viene de DB
      const [ex] = await db
        .select({ validationMode: exercises.validationMode })
        .from(exercises)
        .where(eq(exercises.id, exerciseId))
        .limit(1);

      if (!ex) throw new NotFoundError('Exercise');

      return { expectedResult: cached, validationMode: ex.validationMode };
    }
  } catch (err) {
    // Si el error es NotFoundError, re-lanzar
    if (err instanceof NotFoundError) throw err;
    // Redis error — continuar al fallback
  }

  // Fallback a PostgreSQL
  const [ex] = await db
    .select({
      expectedResultJson: exercises.expectedResultJson,
      validationMode: exercises.validationMode,
      isPublished: exercises.isPublished,
    })
    .from(exercises)
    .where(eq(exercises.id, exerciseId))
    .limit(1);

  if (!ex) throw new NotFoundError('Exercise');

  const expectedResult = ex.expectedResultJson as ExpectedResult;

  // Poblar cache para futuras validaciones
  try {
    await setJson(
      CacheKeys.exerciseExpected(exerciseId),
      expectedResult,
      CacheTTL.exerciseExpected,
    );
  } catch {
    // No crítico si Redis no está disponible
  }

  return { expectedResult, validationMode: ex.validationMode };
}
