/**
 * Setup global para integration tests.
 *
 * Responsabilidades:
 * - Configurar variables de entorno de test ANTES de cualquier import del app
 * - Levantar la instancia de Fastify completa en memoria
 * - Truncar todas las tablas antes de cada suite (orden FK-safe)
 * - Sembrar datos mínimos: 10 niveles + 5 ejercicios publicados en nivel 1
 * - Cerrar la app y las conexiones al terminar
 *
 * IMPORTANTE: Las variables de entorno deben estar antes de los imports del app
 * porque shared/db/index.ts y shared/cache/redis.ts se ejecutan a nivel de módulo.
 * El vitest globalSetup se ejecuta en un proceso separado del worker, así que
 * estas vars se pasan vía los archivos .env o por setupFiles, no aquí directamente.
 *
 * Este archivo exporta buildTestApp() para uso directo en cada test suite.
 */

// ── Variables de entorno de test (deben estar antes de buildApp) ──────────────
// Se leen desde el environment inyectado por vitest.config.integration.ts
// Las defaults aquí son para desarrollo local sin .env.test
if (!process.env['DATABASE_URL']) {
  process.env['DATABASE_URL'] =
    process.env['TEST_DATABASE_URL'] ?? 'postgresql://postgres:postgres@localhost:5432/shopsphere_test';
}
if (!process.env['REDIS_URL']) {
  process.env['REDIS_URL'] =
    process.env['TEST_REDIS_URL'] ?? 'redis://localhost:6379';
}

process.env['NODE_ENV'] = 'test';
process.env['JWT_SECRET'] = process.env['JWT_SECRET'] ?? 'a'.repeat(64);
process.env['SESSION_COOKIE_SECRET'] = process.env['SESSION_COOKIE_SECRET'] ?? 'b'.repeat(32);
process.env['BCRYPT_ROUNDS'] = '4';
process.env['PLAYGROUND_WORKER_POOL_SIZE'] = '1';
process.env['PLAYGROUND_QUERY_TIMEOUT_MS'] = '5000';
process.env['LOG_LEVEL'] = 'silent';

// ── Imports (después de configurar envs) ──────────────────────────────────────
import pg from 'pg';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { closeDb, pool } from '../shared/db/index.js';
import { closeRedis } from '../shared/cache/redis.js';

const { Pool } = pg;

// ── Tipos de seed ─────────────────────────────────────────────────────────────

export interface SeedData {
  levels: Array<{ id: number; name: string }>;
  exercises: Array<{ id: string; levelId: number; title: string }>;
}

// ── Estado compartido de la app en tests ─────────────────────────────────────

let _app: FastifyInstance | null = null;

/**
 * Construye y retorna la instancia de Fastify para tests.
 * Reutiliza la misma instancia si ya está levantada.
 */
export async function buildTestApp(): Promise<FastifyInstance> {
  if (_app) return _app;

  _app = await buildApp();
  await _app.ready();
  return _app;
}

/**
 * Cierra la app y todas las conexiones abiertas.
 * Llamar en afterAll() del test suite más externo.
 */
export async function closeTestApp(): Promise<void> {
  if (_app) {
    await _app.close();
    _app = null;
  }
  await closeDb();
  await closeRedis();
}

// ── Truncado de tablas ────────────────────────────────────────────────────────

/**
 * Trunca todas las tablas en orden FK-safe (dependientes primero).
 * Usa RESTART IDENTITY para resetear secuencias.
 *
 * Orden correcto:
 * 1. certificates           (depende de users, levels)
 * 2. exercise_attempts      (depende de users, exercises)
 * 3. user_exercise_progress (depende de users, exercises)
 * 4. sessions               (depende de users)
 * 5. exercises              (depende de levels)
 * 6. users
 * 7. levels
 */
export async function truncateAllTables(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      TRUNCATE TABLE
        certificates,
        exercise_attempts,
        user_exercise_progress,
        sessions,
        exercises,
        users,
        levels
      RESTART IDENTITY CASCADE
    `);
  } finally {
    client.release();
  }
}

// ── Seed de datos mínimos ─────────────────────────────────────────────────────

/**
 * Expected result pre-calculado para los ejercicios de seed.
 * Simula el resultado de "SELECT 1 AS value" en SQLite:
 * { columns: ['value'], rows: [[1]], row_count: 1 }
 */
const SEED_EXPECTED_RESULT = {
  columns: ['value'],
  rows: [[1]],
  row_count: 1,
};

/**
 * Siembra datos mínimos necesarios para los tests:
 * - 10 niveles (id 1-10)
 * - 5 ejercicios publicados en nivel 1 (difficulty: easy)
 *
 * El expected_result_json coincide con "SELECT 1 AS value", así los tests
 * de validación pueden enviar esa query y obtener valid=true.
 *
 * Retorna los IDs creados para referencia en los tests.
 */
export async function seedMinimalData(): Promise<SeedData> {
  const client = await pool.connect();
  try {
    // 1. Insertar 10 niveles
    const levelNames = [
      'SQL Basics',
      'Filtering & Sorting',
      'Joins Fundamentals',
      'Aggregations',
      'Subqueries',
      'Window Functions',
      'Advanced Joins',
      'Query Optimization',
      'Data Modeling',
      'Capstone Project',
    ];

    const levelsResult = await client.query<{ id: number; name: string }>(
      `
      INSERT INTO levels (id, name, description, xp_required, order_index, is_published)
      SELECT
        ordinality,
        name,
        'Level ' || ordinality || ' description',
        (ordinality - 1) * 100,
        ordinality,
        true
      FROM UNNEST($1::text[]) WITH ORDINALITY AS t(name, ordinality)
      RETURNING id, name
      `,
      [levelNames],
    );

    const seedLevels = levelsResult.rows;

    // 2. Insertar 5 ejercicios publicados en nivel 1 (difficulty: easy)
    const exercisesResult = await client.query<{ id: string; level_id: number; title: string }>(
      `
      INSERT INTO exercises (
        level_id, title, description, instructions, difficulty,
        xp_reward, reference_query, expected_result_json, validation_mode,
        hints, order_index, is_published
      )
      SELECT
        1,
        'Exercise ' || n,
        'Description for exercise ' || n,
        'Write a query that returns SELECT 1 AS value',
        'easy',
        10,
        'SELECT 1 AS value',
        $1::jsonb,
        'exact_unordered',
        $2::jsonb,
        n,
        true
      FROM generate_series(1, 5) AS n
      RETURNING id, level_id, title
      `,
      [
        JSON.stringify(SEED_EXPECTED_RESULT),
        JSON.stringify(['Hint 1: Try SELECT', 'Hint 2: Use SELECT 1', 'Hint 3: SELECT 1 AS value']),
      ],
    );

    const seedExercises = exercisesResult.rows.map((r) => ({
      id: r.id,
      levelId: r.level_id,
      title: r.title,
    }));

    return { levels: seedLevels, exercises: seedExercises };
  } finally {
    client.release();
  }
}

// ── Helpers de autenticación para tests ───────────────────────────────────────

export interface TestUser {
  id: string;
  email: string;
  username: string;
  accessToken: string;
  refreshToken: string;
}

/**
 * Registra un usuario de test y retorna sus tokens.
 * Shortcut para no repetir el flujo register/login en cada test.
 */
export async function createTestUser(
  app: FastifyInstance,
  overrides: Partial<{ email: string; username: string; password: string }> = {},
): Promise<TestUser> {
  const email = overrides.email ?? `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const username = overrides.username ?? `user${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
  const password = overrides.password ?? 'TestPassword123!';

  const res = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email, username, password },
  });

  if (res.statusCode !== 201) {
    throw new Error(
      `createTestUser: register failed with ${res.statusCode}: ${res.body}`,
    );
  }

  const body = res.json<{
    user: { id: string; email: string; username: string };
    tokens: { accessToken: string; refreshToken: string };
  }>();

  return {
    id: body.user.id,
    email: body.user.email,
    username: body.user.username,
    accessToken: body.tokens.accessToken,
    refreshToken: body.tokens.refreshToken,
  };
}

/**
 * Limpia las claves de Redis relacionadas con rate limit para una IP.
 * Útil para resetear el rate limit entre tests.
 */
export async function clearRedisRateLimit(app: FastifyInstance, pattern = 'ratelimit:*'): Promise<void> {
  // Acceder al cliente Redis via el singleton
  const { getRedis } = await import('../shared/cache/redis.js');
  const redis = getRedis();
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  // También limpiar las claves del rate limit de @fastify/rate-limit
  const fastifyRlKeys = await redis.keys('fastify:*');
  if (fastifyRlKeys.length > 0) {
    await redis.del(...fastifyRlKeys);
  }
}
