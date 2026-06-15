import { eq, and, asc, desc, count, sql, inArray } from 'drizzle-orm';
import { resolve, join } from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { db } from '../../shared/db/index.js';
import {
  levels,
  exercises,
  users,
  userExerciseProgress,
} from '../../shared/db/schema.js';
import { NotFoundError } from '../../shared/errors/index.js';
import type {
  LevelPublic,
  LevelDetail,
  ExerciseInLevel,
  LeaderboardEntry,
  Lesson,
} from './levels.schemas.js';

// ── Helpers de Lectura de Contenido ──────────────────────────────────────────

const REPO_ROOT = resolve(import.meta.dirname, '../../../../');
const MODULOS_BASE = process.env['MODULOS_PATH'] || (existsSync('/modulos') ? '/modulos' : join(REPO_ROOT, 'modulos'));
const CONTENIDO_BASE = process.env['CONTENIDO_PATH'] || (existsSync('/contenido') ? '/contenido' : join(REPO_ROOT, 'contenido'));

const PROYECTO_FILES: Record<number, string> = {
  0: 'proyecto-nivel-00.md',
  1: 'proyecto-nivel-01.md',
  2: 'proyecto-nivel-02.md',
  3: 'proyecto-nivel-03.md',
  4: 'proyecto-nivel-04.md',
  5: 'proyecto-nivel-05.md',
  6: 'proyecto-nivel-06.md',
  7: 'proyecto-nivel-07.md',
  8: 'proyecto-nivel-08.md',
  9: 'capstone-brief.md',
};

const INTRO_FILES: Record<number, string> = {
  0: 'intro-nivel-00.md',
  1: 'intro-nivel-01.md',
  2: 'intro-nivel-02.md',
  3: 'intro-nivel-03.md',
  4: 'intro-nivel-04.md',
  5: 'intro-nivel-05.md',
  6: 'intro-nivel-06.md',
  7: 'intro-nivel-07.md',
  8: 'intro-nivel-08.md',
};

export function getIntroForLevel(levelId: number): string | undefined {
  const filename = INTRO_FILES[levelId];
  if (!filename) return undefined;

  const filePath = join(CONTENIDO_BASE, filename);
  if (!existsSync(filePath)) return undefined;

  try {
    return readFileSync(filePath, 'utf-8');
  } catch {
    return undefined;
  }
}

export function getProjectForLevel(levelId: number): string | undefined {
  const filename = PROYECTO_FILES[levelId];
  if (!filename) return undefined;

  const filePath = join(CONTENIDO_BASE, filename);
  if (!existsSync(filePath)) return undefined;

  try {
    return readFileSync(filePath, 'utf-8');
  } catch {
    return undefined;
  }
}

const LEVEL_FOLDERS: Record<number, string> = {
  0: 'nivel-00-fundamentos',
  1: 'nivel-01-exploracion',
  2: 'nivel-02-metricas',
  3: 'nivel-03-joins',
  4: 'nivel-04-clientes',
  5: 'nivel-05-avanzado',
  6: 'nivel-06-analitica',
  7: 'nivel-07-bi',
  8: 'nivel-08-profesional',
  9: 'capstone',
};

export function getLessonsForLevel(levelId: number): Lesson[] {
  const folder = LEVEL_FOLDERS[levelId];
  if (!folder) return [];

  const dirPath = join(MODULOS_BASE, folder);
  if (!existsSync(dirPath)) {
    console.warn(`[WARN] La carpeta de lecciones no existe: ${dirPath}`);
    return [];
  }

  try {
    const files = readdirSync(dirPath);
    const lessonFiles = files
      .filter((f) => f.startsWith('leccion-') && f.endsWith('.md'))
      .sort();

    const lessons: Lesson[] = [];

    for (const file of lessonFiles) {
      const filePath = join(dirPath, file);
      const content = readFileSync(filePath, 'utf-8');

      // Extraer el título de la lección
      const lines = content.split('\n');
      let title = file.replace('.md', '');

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('## Lección') || trimmed.startsWith('## Leccion')) {
          title = trimmed.replace(/^##\s*/, '').trim();
          break;
        } else if (trimmed.startsWith('# Lección') || trimmed.startsWith('# Leccion')) {
          title = trimmed.replace(/^#\s*/, '').trim();
          break;
        }
      }

      // Parsear order_index de leccion-01.md -> 1
      const match = file.match(/leccion-(\d+)\.md/);
      const order_index = match ? parseInt(match[1]!, 10) : 1;

      lessons.push({
        order_index,
        title,
        content,
      });
    }

    return lessons;
  } catch (err) {
    console.error(`Error al listar lecciones en ${dirPath}:`, err);
    return [];
  }
}


// ── Métodos públicos del servicio ─────────────────────────────────────────────

/**
 * Lista todos los niveles publicados con su conteo de ejercicios publicados.
 */
export async function listLevels(): Promise<LevelPublic[]> {
  const rows = await db
    .select({
      id: levels.id,
      name: levels.name,
      description: levels.description,
      orderIndex: levels.orderIndex,
      xpRequired: levels.xpRequired,
      exercisesCount: sql<number>`COUNT(DISTINCT ${exercises.id}) FILTER (WHERE ${exercises.isPublished} = true)`,
    })
    .from(levels)
    .leftJoin(exercises, eq(exercises.levelId, levels.id))
    .where(eq(levels.isPublished, true))
    .groupBy(levels.id, levels.name, levels.description, levels.orderIndex, levels.xpRequired)
    .orderBy(asc(levels.orderIndex));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    order_index: row.orderIndex,
    xp_required: row.xpRequired,
    exercises_count: Number(row.exercisesCount ?? 0),
  }));
}

/**
 * Retorna el detalle de un nivel publicado con la lista de ejercicios publicados.
 * Si se proporciona userId, incluye el progreso del usuario en cada ejercicio.
 */
export async function getLevelDetail(
  levelId: number,
  userId?: string,
): Promise<LevelDetail> {
  // Verificar que el nivel existe y está publicado
  const [level] = await db
    .select()
    .from(levels)
    .where(and(eq(levels.id, levelId), eq(levels.isPublished, true)))
    .limit(1);

  if (!level) throw new NotFoundError('Level');

  // Obtener ejercicios publicados del nivel
  const exerciseRows = await db
    .select({
      id: exercises.id,
      title: exercises.title,
      difficulty: exercises.difficulty,
      xpReward: exercises.xpReward,
      orderIndex: exercises.orderIndex,
    })
    .from(exercises)
    .where(and(eq(exercises.levelId, levelId), eq(exercises.isPublished, true)))
    .orderBy(asc(exercises.orderIndex));

  let progressMap = new Map<string, { status: 'not_started' | 'in_progress' | 'completed'; completedAt: Date | null }>();

  // Si hay usuario autenticado, obtener su progreso en todos los ejercicios del nivel
  if (userId && exerciseRows.length > 0) {
    const exerciseIds = exerciseRows.map((e) => e.id);

    const progressRows = await db
      .select({
        exerciseId: userExerciseProgress.exerciseId,
        status: userExerciseProgress.status,
        completedAt: userExerciseProgress.completedAt,
      })
      .from(userExerciseProgress)
      .where(
        and(
          eq(userExerciseProgress.userId, userId),
          inArray(userExerciseProgress.exerciseId, exerciseIds),
        ),
      );

    for (const row of progressRows) {
      progressMap.set(row.exerciseId, {
        status: row.status as 'not_started' | 'in_progress' | 'completed',
        completedAt: row.completedAt,
      });
    }
  }

  const exercisesInLevel: ExerciseInLevel[] = exerciseRows.map((ex) => {
    const item: ExerciseInLevel = {
      id: ex.id,
      title: ex.title,
      difficulty: ex.difficulty,
      xp_reward: ex.xpReward,
      order_index: ex.orderIndex,
    };

    if (userId) {
      const prog = progressMap.get(ex.id);
      item.progress = {
        status: prog?.status ?? 'not_started',
        completed_at: prog?.completedAt ? prog.completedAt.toISOString() : null,
      };
    }

    return item;
  });

  const lessons = getLessonsForLevel(levelId);
  const project_content = getProjectForLevel(levelId);
  const level_intro = getIntroForLevel(levelId);

  return {
    id: level.id,
    name: level.name,
    description: level.description,
    order_index: level.orderIndex,
    xp_required: level.xpRequired,
    exercises: exercisesInLevel,
    lessons,
    ...(level_intro ? { level_intro } : {}),
    ...(project_content ? { project_content } : {}),
  };
}

/**
 * Top 10 usuarios con más XP que completaron al menos 1 ejercicio del nivel.
 * Ordenados por ejercicios completados en el nivel (desc), luego por XP total.
 */
export async function getLevelLeaderboard(levelId: number): Promise<LeaderboardEntry[]> {
  // Verificar que el nivel existe
  const [level] = await db
    .select({ id: levels.id })
    .from(levels)
    .where(eq(levels.id, levelId))
    .limit(1);

  if (!level) throw new NotFoundError('Level');

  // Obtener top 10 usuarios con ejercicios completados en este nivel
  const rows = await db
    .select({
      userId: userExerciseProgress.userId,
      username: users.username,
      avatarUrl: users.avatarUrl,
      xpTotal: users.xpTotal,
      exercisesCompletedInLevel: count(userExerciseProgress.exerciseId),
    })
    .from(userExerciseProgress)
    .innerJoin(exercises, eq(userExerciseProgress.exerciseId, exercises.id))
    .innerJoin(users, eq(userExerciseProgress.userId, users.id))
    .where(
      and(
        eq(exercises.levelId, levelId),
        eq(userExerciseProgress.status, 'completed'),
        eq(users.isActive, true),
      ),
    )
    .groupBy(
      userExerciseProgress.userId,
      users.username,
      users.avatarUrl,
      users.xpTotal,
    )
    .orderBy(
      desc(count(userExerciseProgress.exerciseId)),
      desc(users.xpTotal),
    )
    .limit(10);

  return rows.map((row, index) => ({
    rank: index + 1,
    username: row.username,
    avatar_url: row.avatarUrl ?? null,
    xp_total: row.xpTotal,
    exercises_completed_in_level: Number(row.exercisesCompletedInLevel),
  }));
}
