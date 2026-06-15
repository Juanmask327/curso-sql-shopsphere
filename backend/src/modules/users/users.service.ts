import { eq, and, desc, count, sum, sql, ilike, or, ne, inArray, type SQL } from 'drizzle-orm';
import { db } from '../../shared/db/index.js';
import {
  users,
  levels,
  exercises,
  userExerciseProgress,
  exerciseAttempts,
  certificates,
  type User,
} from '../../shared/db/schema.js';
import {
  NotFoundError,
  ConflictError,
} from '../../shared/errors/index.js';
import type {
  DashboardResponse,
  LevelProgress,
  UserStats,
  RecentActivity,
  LevelCompletion,
  UserExerciseItem,
  PublicProfile,
  AdminUserItem,
  AdminUsersListResponse,
  UpdateProfileInput,
} from './users.schemas.js';

// ── Proyectores ───────────────────────────────────────────────────────────────

function toAdminUserItem(u: User): AdminUserItem {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    xp_total: u.xpTotal,
    current_level: u.currentLevel,
    is_active: u.isActive,
    email_verified: u.emailVerified,
    created_at: u.createdAt.toISOString(),
  };
}

// ── Helpers internos ──────────────────────────────────────────────────────────

/**
 * Calcula la info de progreso de nivel basada en XP total.
 * Obtiene todos los niveles ordenados por xp_required para encontrar
 * el nivel actual y el siguiente.
 */
async function computeLevelProgress(xpTotal: number): Promise<LevelProgress> {
  const allLevels = await db
    .select({
      id: levels.id,
      name: levels.name,
      xpRequired: levels.xpRequired,
    })
    .from(levels)
    .orderBy(levels.xpRequired);

  if (allLevels.length === 0) {
    // Fallback defensivo si no hay niveles configurados
    return {
      current_level: { id: 0, name: 'Beginner', xp_required: 0 },
      next_level: null,
      xp_in_current_level: xpTotal,
      xp_to_next_level: null,
      progress_pct: 0,
    };
  }

  // El nivel actual es el mayor cuyo xp_required <= xpTotal
  let currentIdx = 0;
  for (let i = 0; i < allLevels.length; i++) {
    const lvl = allLevels[i];
    if (lvl && lvl.xpRequired <= xpTotal) {
      currentIdx = i;
    }
  }

  const currentLevel = allLevels[currentIdx]!;
  const nextLevel = allLevels[currentIdx + 1] ?? null;

  const xpInCurrentLevel = xpTotal - currentLevel.xpRequired;
  let xpToNextLevel: number | null = null;
  let progressPct = 100;

  if (nextLevel) {
    const rangeSize = nextLevel.xpRequired - currentLevel.xpRequired;
    xpToNextLevel = nextLevel.xpRequired - xpTotal;
    // Clamp 0-100 para evitar valores negativos por edge cases
    progressPct = rangeSize > 0
      ? Math.min(100, Math.max(0, Math.round((xpInCurrentLevel / rangeSize) * 100)))
      : 100;
  }

  return {
    current_level: {
      id: currentLevel.id,
      name: currentLevel.name,
      xp_required: currentLevel.xpRequired,
    },
    next_level: nextLevel
      ? { id: nextLevel.id, name: nextLevel.name, xp_required: nextLevel.xpRequired }
      : null,
    xp_in_current_level: xpInCurrentLevel,
    xp_to_next_level: xpToNextLevel,
    progress_pct: progressPct,
  };
}

// ── Métodos públicos del servicio ─────────────────────────────────────────────

/**
 * Retorna el dashboard completo del estudiante.
 * Ejecuta queries paralelas donde es posible para minimizar latencia.
 */
export async function getDashboard(userId: string): Promise<DashboardResponse> {
  // 1. Obtener usuario
  const [userRow] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.isActive, true)))
    .limit(1);

  if (!userRow) throw new NotFoundError('User');

  // 2. Ejecutar queries de stats en paralelo
  const [
    levelProgressResult,
    statsResult,
    recentActivityResult,
    levelCompletionResult,
  ] = await Promise.all([
    computeLevelProgress(userRow.xpTotal),
    computeUserStats(userId),
    getRecentActivity(userId, 10),
    getLevelCompletion(userId),
  ]);

  return {
    user: {
      id: userRow.id,
      username: userRow.username,
      email: userRow.email,
      avatar_url: userRow.avatarUrl ?? null,
      xp_total: userRow.xpTotal,
      current_level: userRow.currentLevel,
    },
    level_progress: levelProgressResult,
    stats: statsResult,
    recent_activity: recentActivityResult,
    level_completion: levelCompletionResult,
  };
}

/**
 * Calcula estadísticas de ejercicios del usuario.
 */
async function computeUserStats(userId: string): Promise<UserStats> {
  // Contadores desde user_exercise_progress
  const [progressStats] = await db
    .select({
      exercises_completed: sql<number>`COUNT(*) FILTER (WHERE ${userExerciseProgress.status} = 'completed')`,
      exercises_attempted: sql<number>`COUNT(*) FILTER (WHERE ${userExerciseProgress.status} != 'not_started')`,
      hints_used_total: sum(userExerciseProgress.hintsUsed).mapWith(Number),
      total_attempts_progress: sum(userExerciseProgress.attemptsCount).mapWith(Number),
    })
    .from(userExerciseProgress)
    .where(eq(userExerciseProgress.userId, userId));

  // Total de intentos reales desde exercise_attempts (log inmutable)
  const [attemptsCount] = await db
    .select({ total: count() })
    .from(exerciseAttempts)
    .where(eq(exerciseAttempts.userId, userId));

  const exercisesCompleted = Number(progressStats?.exercises_completed ?? 0);
  const exercisesAttempted = Number(progressStats?.exercises_attempted ?? 0);
  const hintsUsedTotal = Number(progressStats?.hints_used_total ?? 0);
  const totalAttempts = Number(attemptsCount?.total ?? 0);

  const avgAttemptsPerExercise =
    exercisesAttempted > 0
      ? Math.round((totalAttempts / exercisesAttempted) * 100) / 100
      : 0;

  const completionRatePct =
    exercisesAttempted > 0
      ? Math.round((exercisesCompleted / exercisesAttempted) * 100)
      : 0;

  return {
    exercises_completed: exercisesCompleted,
    exercises_attempted: exercisesAttempted,
    total_attempts: totalAttempts,
    avg_attempts_per_exercise: avgAttemptsPerExercise,
    hints_used_total: hintsUsedTotal,
    completion_rate_pct: completionRatePct,
  };
}

/**
 * Obtiene los N ejercicios con actividad más reciente del usuario.
 * Ordena por updated_at desc para mostrar la actividad más reciente primero.
 */
async function getRecentActivity(userId: string, limit: number): Promise<RecentActivity[]> {
  const rows = await db
    .select({
      exerciseId: exercises.id,
      exerciseTitle: exercises.title,
      levelName: levels.name,
      completedAt: userExerciseProgress.completedAt,
      updatedAt: userExerciseProgress.updatedAt,
      status: userExerciseProgress.status,
      xpEarned: userExerciseProgress.xpEarned,
    })
    .from(userExerciseProgress)
    .innerJoin(exercises, eq(userExerciseProgress.exerciseId, exercises.id))
    .innerJoin(levels, eq(exercises.levelId, levels.id))
    .where(
      and(
        eq(userExerciseProgress.userId, userId),
        ne(userExerciseProgress.status, 'not_started'),
      ),
    )
    .orderBy(desc(userExerciseProgress.updatedAt))
    .limit(limit);

  return rows.map((row) => ({
    exercise_id: row.exerciseId,
    exercise_title: row.exerciseTitle,
    level_name: row.levelName,
    completed_at: row.completedAt ? row.completedAt.toISOString() : null,
    last_attempt_at: row.updatedAt ? row.updatedAt.toISOString() : null,
    status: row.status,
    xp_earned: row.xpEarned,
  }));
}

/**
 * Retorna el porcentaje de completado por nivel (todos los niveles publicados).
 */
async function getLevelCompletion(userId: string): Promise<LevelCompletion[]> {
  // Obtener todos los niveles publicados con conteo de ejercicios publicados
  const levelRows = await db
    .select({
      levelId: levels.id,
      levelName: levels.name,
      isPublished: levels.isPublished,
      exercisesTotal: sql<number>`COUNT(DISTINCT ${exercises.id}) FILTER (WHERE ${exercises.isPublished} = true)`,
    })
    .from(levels)
    .leftJoin(exercises, eq(exercises.levelId, levels.id))
    .where(eq(levels.isPublished, true))
    .groupBy(levels.id, levels.name, levels.isPublished)
    .orderBy(levels.orderIndex);

  if (levelRows.length === 0) return [];

  // Para cada nivel, contar cuántos completó el usuario
  const levelIds = levelRows.map((r) => r.levelId);

  // Una sola query para todos los niveles del usuario
  const completedRows = await db
    .select({
      levelId: exercises.levelId,
      completedCount: sql<number>`COUNT(*)`,
    })
    .from(userExerciseProgress)
    .innerJoin(exercises, eq(userExerciseProgress.exerciseId, exercises.id))
    .where(
      and(
        eq(userExerciseProgress.userId, userId),
        eq(userExerciseProgress.status, 'completed'),
        inArray(exercises.levelId, levelIds),
      ),
    )
    .groupBy(exercises.levelId);

  // Construir mapa para O(1) lookup
  const completedByLevel = new Map<number, number>();
  for (const row of completedRows) {
    completedByLevel.set(row.levelId, Number(row.completedCount));
  }

  return levelRows.map((row) => {
    const total = Number(row.exercisesTotal ?? 0);
    const completed = completedByLevel.get(row.levelId) ?? 0;
    const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      level_id: row.levelId,
      level_name: row.levelName,
      is_published: row.isPublished,
      exercises_total: total,
      exercises_completed: completed,
      completion_pct: completionPct,
    };
  });
}

/**
 * Lista todos los ejercicios publicados con el progreso del usuario.
 * Permite filtrar por status y level_id.
 */
export async function getUserExercises(
  userId: string,
  filters: { status?: 'completed' | 'in_progress' | 'not_started'; levelId?: number },
): Promise<UserExerciseItem[]> {
  // Obtener todos los ejercicios publicados con su progreso (LEFT JOIN)
  const conditions = [eq(exercises.isPublished, true)];
  if (filters.levelId !== undefined) {
    conditions.push(eq(exercises.levelId, filters.levelId));
  }

  const rows = await db
    .select({
      exerciseId: exercises.id,
      exerciseTitle: exercises.title,
      levelId: exercises.levelId,
      levelName: levels.name,
      difficulty: exercises.difficulty,
      xpReward: exercises.xpReward,
      orderIndex: exercises.orderIndex,
      status: userExerciseProgress.status,
      attemptsCount: userExerciseProgress.attemptsCount,
      hintsUsed: userExerciseProgress.hintsUsed,
      xpEarned: userExerciseProgress.xpEarned,
      completedAt: userExerciseProgress.completedAt,
    })
    .from(exercises)
    .innerJoin(levels, eq(exercises.levelId, levels.id))
    .leftJoin(
      userExerciseProgress,
      and(
        eq(userExerciseProgress.exerciseId, exercises.id),
        eq(userExerciseProgress.userId, userId),
      ),
    )
    .where(and(...conditions))
    .orderBy(levels.orderIndex, exercises.orderIndex);

  const mapped: UserExerciseItem[] = rows.map((row) => ({
    exercise_id: row.exerciseId,
    exercise_title: row.exerciseTitle,
    level_id: row.levelId,
    level_name: row.levelName,
    difficulty: row.difficulty,
    xp_reward: row.xpReward,
    order_index: row.orderIndex,
    // Si no hay registro de progreso, el status es 'not_started'
    status: (row.status as 'not_started' | 'in_progress' | 'completed') ?? 'not_started',
    attempts_count: row.attemptsCount ?? 0,
    hints_used: row.hintsUsed ?? 0,
    xp_earned: row.xpEarned ?? 0,
    completed_at: row.completedAt ? row.completedAt.toISOString() : null,
  }));

  // Aplicar filtro de status en memoria (evita complejidad SQL con LEFT JOIN + NULL)
  if (filters.status) {
    return mapped.filter((item) => item.status === filters.status);
  }

  return mapped;
}

/**
 * Actualiza el perfil del usuario autenticado.
 * Valida que el nuevo username no esté tomado por otro usuario.
 */
export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<{ id: string; username: string; avatar_url: string | null }> {
  if (!input.username && !input.avatar_url) {
    // Nada que actualizar — retornar el perfil actual
    const [current] = await db
      .select({ id: users.id, username: users.username, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!current) throw new NotFoundError('User');

    return {
      id: current.id,
      username: current.username,
      avatar_url: current.avatarUrl ?? null,
    };
  }

  // Verificar que el nuevo username no está tomado
  if (input.username) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.username, input.username),
          ne(users.id, userId), // excluir el propio usuario
        ),
      )
      .limit(1);

    if (existing) {
      throw new ConflictError('This username is already taken', 'USERNAME_ALREADY_EXISTS');
    }
  }

  const updatePayload: Partial<typeof users.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (input.username !== undefined) updatePayload.username = input.username;
  if (input.avatar_url !== undefined) updatePayload.avatarUrl = input.avatar_url;

  const [updated] = await db
    .update(users)
    .set(updatePayload)
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      username: users.username,
      avatarUrl: users.avatarUrl,
    });

  if (!updated) throw new NotFoundError('User');

  return {
    id: updated.id,
    username: updated.username,
    avatar_url: updated.avatarUrl ?? null,
  };
}

/**
 * Retorna el perfil público de un usuario por username.
 * Solo visible si el usuario está activo.
 * Retorna null si no existe o está inactivo.
 */
export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  const [userRow] = await db
    .select({
      id: users.id,
      username: users.username,
      avatarUrl: users.avatarUrl,
      xpTotal: users.xpTotal,
      currentLevel: users.currentLevel,
      isActive: users.isActive,
    })
    .from(users)
    .where(and(eq(users.username, username), eq(users.isActive, true)))
    .limit(1);

  if (!userRow) return null;

  // Contar ejercicios completados
  const [completedCount] = await db
    .select({ total: count() })
    .from(userExerciseProgress)
    .where(
      and(
        eq(userExerciseProgress.userId, userRow.id),
        eq(userExerciseProgress.status, 'completed'),
      ),
    );

  // Obtener certificados con nombre de nivel
  const certsRows = await db
    .select({
      uid: certificates.certificateUid,
      levelName: levels.name,
      issuedAt: certificates.issuedAt,
    })
    .from(certificates)
    .innerJoin(levels, eq(certificates.levelId, levels.id))
    .where(eq(certificates.userId, userRow.id))
    .orderBy(desc(certificates.issuedAt));

  return {
    username: userRow.username,
    avatar_url: userRow.avatarUrl ?? null,
    xp_total: userRow.xpTotal,
    current_level: userRow.currentLevel,
    exercises_completed: Number(completedCount?.total ?? 0),
    certificates: certsRows.map((c) => ({
      uid: c.uid,
      level_name: c.levelName,
      issued_at: c.issuedAt.toISOString(),
    })),
  };
}

// ── Admin ─────────────────────────────────────────────────────────────────────

/**
 * Lista usuarios con búsqueda y paginación.
 */
export async function adminListUsers(filters: {
  search?: string;
  role?: string;
  page: number;
  limit: number;
}): Promise<AdminUsersListResponse> {
  const offset = (filters.page - 1) * filters.limit;

  const conditions: SQL<unknown>[] = [];
  if (filters.role) {
    conditions.push(
      eq(users.role, filters.role as 'student' | 'admin' | 'instructor'),
    );
  }
  if (filters.search) {
    const searchCondition = or(
      ilike(users.username, `%${filters.search}%`),
      ilike(users.email, `%${filters.search}%`),
    );
    if (searchCondition) conditions.push(searchCondition);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [dataRows, [totalRow]] = await Promise.all([
    db
      .select()
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(filters.limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(users)
      .where(whereClause),
  ]);

  const total = Number(totalRow?.total ?? 0);

  return {
    data: dataRows.map(toAdminUserItem),
    pagination: {
      total,
      page: filters.page,
      limit: filters.limit,
      total_pages: Math.ceil(total / filters.limit),
    },
  };
}

/**
 * Cambia el rol de un usuario.
 */
export async function adminChangeRole(
  userId: string,
  role: 'student' | 'admin' | 'instructor',
): Promise<AdminUserItem> {
  const [updated] = await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();

  if (!updated) throw new NotFoundError('User');

  return toAdminUserItem(updated);
}

/**
 * Desactiva la cuenta de un usuario (soft delete).
 */
export async function adminDeactivateUser(userId: string): Promise<{ deactivated: boolean }> {
  const [updated] = await db
    .update(users)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  if (!updated) throw new NotFoundError('User');

  return { deactivated: true };
}
