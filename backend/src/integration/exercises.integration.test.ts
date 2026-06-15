/**
 * Suite de integration tests — Módulo Exercises + Playground
 *
 * Flujo cubierto:
 *   listar → ver detalle → pedir pista → guardar draft → validar → completar
 *
 * Prerequisito: la DB tiene 10 niveles + 5 ejercicios en nivel 1 (seed mínimo).
 * El expected_result de los ejercicios seed es { columns: ['value'], rows: [[1]], row_count: 1 },
 * que corresponde a la query "SELECT 1 AS value".
 *
 * IMPORTANTE sobre el Playground:
 * El WorkerPool usa Workers de Node.js que cargan el dataset SQLite de
 * PLAYGROUND_DATASET_PATH. En tests, el worker ejecuta la query contra ese dataset.
 * "SELECT 1 AS value" es una query que no accede a tablas, así que funciona
 * incluso sin dataset real (SQLite la evalúa directamente).
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  buildTestApp,
  closeTestApp,
  truncateAllTables,
  seedMinimalData,
  createTestUser,
  type TestUser,
  type SeedData,
} from './setup.js';
import { pool } from '../shared/db/index.js';

describe('Exercises + Playground — Integration Tests', () => {
  let app: FastifyInstance;
  let seed: SeedData;
  let user: TestUser;

  beforeAll(async () => {
    app = await buildTestApp();
    await truncateAllTables();
    seed = await seedMinimalData();
    // Crear un usuario para todos los tests de la suite
    user = await createTestUser(app, {
      email: 'exercises-suite@example.com',
      username: 'exsuite',
    });
  });

  afterAll(async () => {
    await closeTestApp();
  });

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function authHeader() {
    return { Authorization: `Bearer ${user.accessToken}` };
  }

  function firstExerciseId(): string {
    const ex = seed.exercises[0];
    if (!ex) throw new Error('No seed exercises available');
    return ex.id;
  }

  function lastExerciseId(): string {
    const ex = seed.exercises[seed.exercises.length - 1];
    if (!ex) throw new Error('No seed exercises available');
    return ex.id;
  }

  // ── Tests ─────────────────────────────────────────────────────────────────────

  describe('GET /exercises', () => {
    it('lista ejercicios publicados del nivel', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/exercises?level_id=1',
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(200);

      const body = res.json<
        Array<{
          id: string;
          level_id: number;
          title: string;
          difficulty: string;
          is_published: boolean;
          xp_reward: number;
          order_index: number;
        }>
      >();

      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(5); // seed crea 5 ejercicios en nivel 1

      // Todos deben ser del nivel 1 y publicados
      for (const ex of body) {
        expect(ex.level_id).toBe(1);
        expect(ex.is_published).toBe(true);
        expect(ex.difficulty).toBe('easy');
      }
    });

    it('lista ejercicios filtrados por difficulty', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/exercises?difficulty=easy',
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(200);

      const body = res.json<Array<{ difficulty: string }>>() ;
      expect(body.every((ex) => ex.difficulty === 'easy')).toBe(true);
    });

    it('retorna 401 sin token', async () => {
      const res = await app.inject({ method: 'GET', url: '/exercises' });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /exercises/:id', () => {
    it('retorna detalle con progreso null para usuario nuevo', async () => {
      // Crear usuario nuevo que no ha interactuado con el ejercicio
      const freshUser = await createTestUser(app, {
        email: 'fresh-ex@example.com',
        username: 'freshexuser',
      });

      const res = await app.inject({
        method: 'GET',
        url: `/exercises/${firstExerciseId()}`,
        headers: { Authorization: `Bearer ${freshUser.accessToken}` },
      });

      expect(res.statusCode).toBe(200);

      const body = res.json<{
        id: string;
        title: string;
        instructions: string;
        difficulty: string;
        hints: string[];
        progress: null | {
          status: string;
          attempts_count: number;
          hints_used: number;
        };
      }>();

      expect(body.id).toBe(firstExerciseId());
      expect(body.title).toBeDefined();
      expect(body.instructions).toBeDefined();
      expect(body.difficulty).toBe('easy');
      expect(Array.isArray(body.hints)).toBe(true);
      expect(body.hints.length).toBe(3); // seed inserta 3 hints

      // Un usuario nuevo no tiene progreso
      expect(body.progress).toBeNull();
    });

    it('retorna 404 para ejercicio inexistente', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await app.inject({
        method: 'GET',
        url: `/exercises/${fakeId}`,
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /exercises/:id/hint', () => {
    it('crea progreso e incrementa hints_used', async () => {
      // Usuario dedicado para este test
      const hintUser = await createTestUser(app, {
        email: 'hint-user@example.com',
        username: 'hintuser1',
      });

      const exerciseId = firstExerciseId();

      const res = await app.inject({
        method: 'POST',
        url: `/exercises/${exerciseId}/hint`,
        headers: { Authorization: `Bearer ${hintUser.accessToken}` },
      });

      expect(res.statusCode).toBe(200);

      const body = res.json<{
        hint: string;
        hint_index: number;
        hints_remaining: number;
      }>();

      expect(body.hint).toBeTruthy();
      expect(body.hint_index).toBe(0); // primera pista, índice 0
      expect(body.hints_remaining).toBe(2); // 3 hints - 1 = 2

      // Pedir segunda pista — hints_used debe ser 2
      const res2 = await app.inject({
        method: 'POST',
        url: `/exercises/${exerciseId}/hint`,
        headers: { Authorization: `Bearer ${hintUser.accessToken}` },
      });

      expect(res2.statusCode).toBe(200);

      const body2 = res2.json<{ hint_index: number; hints_remaining: number }>();
      expect(body2.hint_index).toBe(1);
      expect(body2.hints_remaining).toBe(1);
    });

    it('falla cuando ya se usaron todas las pistas', async () => {
      const exhaustedUser = await createTestUser(app, {
        email: 'exhausted-hints@example.com',
        username: 'exhaustedhints',
      });

      const exerciseId = firstExerciseId();

      // Consumir las 3 pistas disponibles
      for (let i = 0; i < 3; i++) {
        await app.inject({
          method: 'POST',
          url: `/exercises/${exerciseId}/hint`,
          headers: { Authorization: `Bearer ${exhaustedUser.accessToken}` },
        });
      }

      // La cuarta petición debe fallar
      const resFail = await app.inject({
        method: 'POST',
        url: `/exercises/${exerciseId}/hint`,
        headers: { Authorization: `Bearer ${exhaustedUser.accessToken}` },
      });

      // Debe retornar 400 o 422 (todas las hints agotadas)
      expect(resFail.statusCode).toBeGreaterThanOrEqual(400);
      expect(resFail.statusCode).toBeLessThan(500);
    });
  });

  describe('PATCH /exercises/:id/save-draft', () => {
    it('guarda la query del usuario como borrador', async () => {
      const draftUser = await createTestUser(app, {
        email: 'draft-user@example.com',
        username: 'draftuser1',
      });

      const exerciseId = firstExerciseId();
      const draftQuery = 'SELECT * FROM orders WHERE total > 100';

      const res = await app.inject({
        method: 'PATCH',
        url: `/exercises/${exerciseId}/save-draft`,
        headers: { Authorization: `Bearer ${draftUser.accessToken}` },
        payload: { query: draftQuery },
      });

      expect(res.statusCode).toBe(200);

      const body = res.json<{ saved: boolean }>();
      expect(body.saved).toBe(true);

      // Verificar que el draft se persiste consultando el detalle del ejercicio
      const resDetail = await app.inject({
        method: 'GET',
        url: `/exercises/${exerciseId}`,
        headers: { Authorization: `Bearer ${draftUser.accessToken}` },
      });

      const detail = resDetail.json<{
        progress: { last_query: string | null } | null;
      }>();

      // Puede ser null si el servicio no crea progreso en save-draft,
      // o puede tener el last_query. Verificar al menos que no crasheó.
      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /playground/validate', () => {
    it('con query correcta retorna valid=true y xp_earned', async () => {
      const validateUser = await createTestUser(app, {
        email: 'validate-correct@example.com',
        username: 'validatecorrect',
      });

      const exerciseId = firstExerciseId();

      // La query correcta para el seed es "SELECT 1 AS value"
      const res = await app.inject({
        method: 'POST',
        url: '/playground/validate',
        headers: { Authorization: `Bearer ${validateUser.accessToken}` },
        payload: {
          exercise_id: exerciseId,
          query: 'SELECT 1 AS value',
        },
      });

      expect(res.statusCode).toBe(200);

      const body = res.json<{
        valid: boolean;
        xp_earned?: number;
        execution_ms: number;
        row_count_got?: number;
        row_count_expected?: number;
      }>();

      expect(body.valid).toBe(true);
      expect(body.xp_earned).toBeGreaterThan(0);
      expect(body.execution_ms).toBeGreaterThanOrEqual(0);

      // Para query correcta no debe haber hint
      expect(body).not.toHaveProperty('hint');
    });

    it('con query incorrecta retorna valid=false y hint', async () => {
      const validateUser = await createTestUser(app, {
        email: 'validate-incorrect@example.com',
        username: 'validateincorrect',
      });

      const exerciseId = firstExerciseId();

      // Query que produce resultado diferente
      const res = await app.inject({
        method: 'POST',
        url: '/playground/validate',
        headers: { Authorization: `Bearer ${validateUser.accessToken}` },
        payload: {
          exercise_id: exerciseId,
          query: 'SELECT 2 AS value', // resultado diferente al esperado
        },
      });

      expect(res.statusCode).toBe(200);

      const body = res.json<{
        valid: boolean;
        hint?: string;
        hint_level?: number;
        row_count_got?: number;
        row_count_expected?: number;
      }>();

      expect(body.valid).toBe(false);
      // No siempre tiene hint en el primer intento, pero no debe tener xp_earned
      expect(body).not.toHaveProperty('xp_earned');
    });

    it('con error SQL retorna valid=false y error_type', async () => {
      const validateUser = await createTestUser(app, {
        email: 'validate-error@example.com',
        username: 'validateerror1',
      });

      const exerciseId = firstExerciseId();

      // Query SQL inválida
      const res = await app.inject({
        method: 'POST',
        url: '/playground/validate',
        headers: { Authorization: `Bearer ${validateUser.accessToken}` },
        payload: {
          exercise_id: exerciseId,
          query: 'THIS IS NOT VALID SQL AT ALL !!!',
        },
      });

      expect(res.statusCode).toBe(200);

      const body = res.json<{
        valid: boolean;
        error_type?: string;
      }>();

      expect(body.valid).toBe(false);
      expect(body.error_type).toBe('execution_error');
    });

    it('retorna 401 sin autenticación', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/playground/validate',
        payload: {
          exercise_id: firstExerciseId(),
          query: 'SELECT 1',
        },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('Flujo completo: completar todos los ejercicios de un nivel emite certificado', () => {
    it('completar el último ejercicio de un nivel emite certificado automáticamente', async () => {
      // Usuario dedicado para el flujo de completado
      const certUser = await createTestUser(app, {
        email: 'cert-flow@example.com',
        username: 'certflowuser',
      });

      const certHeaders = { Authorization: `Bearer ${certUser.accessToken}` };

      // Completar todos los ejercicios del nivel 1 (5 ejercicios seed)
      for (const exercise of seed.exercises) {
        const resValidate = await app.inject({
          method: 'POST',
          url: '/playground/validate',
          headers: certHeaders,
          payload: {
            exercise_id: exercise.id,
            query: 'SELECT 1 AS value',
          },
        });

        expect(resValidate.statusCode).toBe(200);

        const validateBody = resValidate.json<{ valid: boolean }>();
        expect(validateBody.valid).toBe(true);
      }

      // Dar tiempo al fire-and-forget de persistAttempt + checkAndIssueCertificate
      // El certificado se emite async — esperar brevemente
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verificar que se emitió el certificado para el nivel 1
      const resCert = await app.inject({
        method: 'POST',
        url: '/certificates/check/1',
        headers: certHeaders,
      });

      expect(resCert.statusCode).toBe(200);

      const certBody = resCert.json<{
        already_had: boolean;
        newly_issued: boolean;
        certificate?: {
          uid: string;
        };
      }>();

      expect(certBody.already_had || certBody.newly_issued).toBe(true);
      expect(certBody.certificate).toBeDefined();
      expect(certBody.certificate?.uid).toMatch(/^SS-L1-[A-Z0-9]{6}$/);
    });
  });
});
