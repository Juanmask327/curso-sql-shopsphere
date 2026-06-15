import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

/**
 * Tests del exercises service.
 *
 * Estrategia: misma que auth.service.test — mockear DB y Redis,
 * verificar comportamiento del servicio, no su implementación interna.
 */

vi.mock('../../shared/db/index.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
  },
}));

const redisMock = {
  setex: vi.fn().mockResolvedValue('OK'),
  del: vi.fn().mockResolvedValue(1),
  get: vi.fn().mockResolvedValue(null),
  exists: vi.fn().mockResolvedValue(0),
  pipeline: vi.fn(),
};

vi.mock('../../shared/cache/redis.js', () => ({
  getRedis: vi.fn(() => redisMock),
  CacheKeys: {
    session: (h: string) => `session:${h}`,
    exerciseExpected: (id: string) => `exercise:expected:${id}`,
    rateLimitLogin: (ip: string) => `ratelimit:login:${ip}`,
    playgroundRateLimit: (userId: string, bucket: number) =>
      `playground:ratelimit:${userId}:${bucket}`,
  },
  CacheTTL: {
    session: 604800,
    exerciseExpected: 3600,
    playgroundRateLimit: 60,
  },
  setJson: vi.fn().mockResolvedValue(undefined),
  getJson: vi.fn().mockResolvedValue(null),
  del: vi.fn().mockResolvedValue(undefined),
}));

import {
  listExercises,
  getExerciseDetail,
  requestHint,
  getExerciseProgress,
  saveDraft,
  createExercise,
  getExpectedResult,
} from './exercises.service.js';
import {
  NotFoundError,
  ValidationError,
} from '../../shared/errors/index.js';
import { db } from '../../shared/db/index.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeExercise(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'ex-uuid-1',
    levelId: 1,
    title: 'SELECT Básico',
    description: 'Selecciona todos los productos',
    instructions: 'Escribe una query SELECT...',
    difficulty: 'easy',
    xpReward: 10,
    referenceQuery: 'SELECT * FROM products',
    expectedResultJson: {
      columns: ['id', 'name', 'price'],
      rows: [[1, 'Widget', 9.99]],
      row_count: 1,
    },
    validationMode: 'exact_unordered',
    hints: ['Usa SELECT *', 'La tabla se llama products'],
    orderIndex: 1,
    isPublished: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeProgress(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'prog-uuid-1',
    userId: 'user-uuid-1',
    exerciseId: 'ex-uuid-1',
    status: 'not_started',
    attemptsCount: 0,
    hintsUsed: 0,
    xpEarned: 0,
    firstAttemptAt: null,
    completedAt: null,
    lastQuery: null,
    updatedAt: new Date(),
    ...overrides,
  };
}

/** Encadena fluently: select().from().where().limit() */
function mockSelectChain(returnValue: unknown) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(returnValue),
  };
  (db.select as Mock).mockReturnValue(chain);
  return chain;
}

function mockInsertChain(returnValue: unknown) {
  const chain = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(returnValue),
  };
  (db.insert as Mock).mockReturnValue(chain);
  return chain;
}

function mockUpdateChain(returnValue: unknown) {
  const chain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(returnValue),
  };
  (db.update as Mock).mockReturnValue(chain);
  return chain;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ExercisesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── listExercises ──────────────────────────────────────────────────────────
  describe('listExercises', () => {
    it('retorna ejercicios publicados sin reference_query ni expected_result_json', async () => {
      const ex = makeExercise();
      const chain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([ex]),
      };
      (db.select as Mock).mockReturnValue(chain);

      const result = await listExercises({});

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'ex-uuid-1',
        title: 'SELECT Básico',
        difficulty: 'easy',
        xp_reward: 10,
      });

      // Campos internos nunca deben aparecer en la respuesta del estudiante
      expect(result[0]).not.toHaveProperty('reference_query');
      expect(result[0]).not.toHaveProperty('expected_result_json');
      expect(result[0]).not.toHaveProperty('referenceQuery');
      expect(result[0]).not.toHaveProperty('expectedResultJson');
    });

    it('incluye los hints como array de strings', async () => {
      const ex = makeExercise({ hints: ['Pista 1', 'Pista 2'] });
      const chain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([ex]),
      };
      (db.select as Mock).mockReturnValue(chain);

      const result = await listExercises({});
      expect(result[0]?.hints).toEqual(['Pista 1', 'Pista 2']);
    });

    it('retorna lista vacía si no hay ejercicios publicados', async () => {
      const chain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      };
      (db.select as Mock).mockReturnValue(chain);

      const result = await listExercises({ difficulty: 'hard' });
      expect(result).toEqual([]);
    });
  });

  // ── getExerciseDetail ──────────────────────────────────────────────────────
  describe('getExerciseDetail', () => {
    it('retorna ejercicio con progreso del usuario si existe', async () => {
      const ex = makeExercise();
      const progress = makeProgress({ status: 'in_progress', attemptsCount: 3, hintsUsed: 1 });

      (db.select as Mock)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([ex]),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([progress]),
        });

      const result = await getExerciseDetail('ex-uuid-1', 'user-uuid-1');

      expect(result.id).toBe('ex-uuid-1');
      expect(result.progress).not.toBeNull();
      expect(result.progress?.status).toBe('in_progress');
      expect(result.progress?.attempts_count).toBe(3);
      expect(result.progress?.hints_used).toBe(1);
    });

    it('retorna progress=null si el usuario aún no empezó el ejercicio', async () => {
      const ex = makeExercise();

      (db.select as Mock)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([ex]),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]),
        });

      const result = await getExerciseDetail('ex-uuid-1', 'user-uuid-1');

      expect(result.progress).toBeNull();
    });

    it('lanza NotFoundError si el ejercicio no existe o no está publicado', async () => {
      (db.select as Mock).mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      });

      await expect(
        getExerciseDetail('nonexistent-id', 'user-uuid-1'),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ── requestHint ────────────────────────────────────────────────────────────
  describe('requestHint', () => {
    it('retorna la primera pista cuando hintsUsed=0', async () => {
      const ex = makeExercise({ hints: ['Usa SELECT *', 'La tabla se llama products'] });
      const progress = makeProgress({ hintsUsed: 0, status: 'not_started' });

      (db.select as Mock)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([ex]),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([progress]),
        });

      mockUpdateChain([{ ...progress, hintsUsed: 1, status: 'in_progress' }]);

      const result = await requestHint('ex-uuid-1', 'user-uuid-1');

      expect(result.hint).toBe('Usa SELECT *');
      expect(result.hint_index).toBe(0);
      expect(result.hints_remaining).toBe(1);
    });

    it('lanza ValidationError cuando ya se usaron todas las pistas', async () => {
      const ex = makeExercise({ hints: ['Solo hay una pista'] });
      const progress = makeProgress({ hintsUsed: 1 });

      (db.select as Mock)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([ex]),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([progress]),
        });

      await expect(
        requestHint('ex-uuid-1', 'user-uuid-1'),
      ).rejects.toThrow(ValidationError);
    });

    it('lanza NotFoundError si el ejercicio no existe', async () => {
      (db.select as Mock).mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      });

      await expect(
        requestHint('nonexistent', 'user-uuid-1'),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ── getExerciseProgress ────────────────────────────────────────────────────
  describe('getExerciseProgress', () => {
    it('retorna estado not_started si no hay registro de progreso', async () => {
      const ex = makeExercise();

      (db.select as Mock)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([ex]),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]),
        });

      const result = await getExerciseProgress('ex-uuid-1', 'user-uuid-1');

      expect(result.status).toBe('not_started');
      expect(result.attempts_count).toBe(0);
      expect(result.hints_used).toBe(0);
      expect(result.completed_at).toBeNull();
    });

    it('retorna el progreso real cuando existe', async () => {
      const ex = makeExercise();
      const progress = makeProgress({
        status: 'completed',
        attemptsCount: 5,
        hintsUsed: 2,
        xpEarned: 8,
        completedAt: new Date('2026-05-01'),
      });

      (db.select as Mock)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([ex]),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([progress]),
        });

      const result = await getExerciseProgress('ex-uuid-1', 'user-uuid-1');

      expect(result.status).toBe('completed');
      expect(result.attempts_count).toBe(5);
      expect(result.hints_used).toBe(2);
      expect(result.xp_earned).toBe(8);
      expect(result.completed_at).toBe(new Date('2026-05-01').toISOString());
    });
  });

  // ── saveDraft ──────────────────────────────────────────────────────────────
  describe('saveDraft', () => {
    it('guarda la query como borrador sin lanzar errores', async () => {
      const ex = makeExercise();
      const progress = makeProgress();

      (db.select as Mock)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([ex]),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([progress]),
        });

      mockUpdateChain([{ ...progress, lastQuery: 'SELECT * FROM products' }]);

      await expect(
        saveDraft('ex-uuid-1', 'user-uuid-1', 'SELECT * FROM products'),
      ).resolves.not.toThrow();

      expect(db.update).toHaveBeenCalled();
    });
  });

  // ── createExercise ─────────────────────────────────────────────────────────
  describe('createExercise', () => {
    it('crea ejercicio y llama al executor para calcular expected_result_json', async () => {
      const mockExecutor = {
        execute: vi.fn().mockResolvedValue({
          columns: ['id', 'name'],
          rows: [[1, 'Widget']],
          row_count: 1,
        }),
      };

      const level = { id: 1 };
      const createdExercise = makeExercise({ isPublished: false });

      // select para buscar nivel
      (db.select as Mock).mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([level]),
      });

      mockInsertChain([createdExercise]);

      const result = await createExercise(
        {
          level_id: 1,
          title: 'SELECT Básico',
          description: 'Selecciona todos los productos de la tienda.',
          instructions: 'Escribe un SELECT que devuelva todos los productos.',
          difficulty: 'easy',
          xp_reward: 10,
          reference_query: 'SELECT id, name FROM products',
          hints: [],
          order_index: 1,
          validation_mode: 'exact_unordered',
        },
        mockExecutor,
      );

      // El executor debe ser llamado con la reference_query
      expect(mockExecutor.execute).toHaveBeenCalledWith(
        'SELECT id, name FROM products',
        10_000,
      );

      // El resultado incluye los campos internos (es admin)
      expect(result).toHaveProperty('reference_query');
      expect(result).toHaveProperty('expected_result_json');
    });

    it('lanza ValidationError si la reference_query falla al ejecutarse', async () => {
      const mockExecutor = {
        execute: vi.fn().mockRejectedValue(new Error('no such table: nonexistent')),
      };

      const level = { id: 1 };

      (db.select as Mock).mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([level]),
      });

      await expect(
        createExercise(
          {
            level_id: 1,
            title: 'Test',
            description: 'Test description with enough characters here',
            instructions: 'Test instructions with enough characters',
            difficulty: 'easy',
            xp_reward: 10,
            reference_query: 'SELECT * FROM nonexistent_table',
            hints: [],
            order_index: 1,
            validation_mode: 'exact_unordered',
          },
          mockExecutor,
        ),
      ).rejects.toThrow(ValidationError);
    });

    it('lanza NotFoundError si el nivel no existe', async () => {
      const mockExecutor = { execute: vi.fn() };

      (db.select as Mock).mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      });

      await expect(
        createExercise(
          {
            level_id: 99,
            title: 'Test',
            description: 'Test description with enough characters',
            instructions: 'Test instructions with enough characters',
            difficulty: 'easy',
            xp_reward: 10,
            reference_query: 'SELECT 1',
            hints: [],
            order_index: 1,
            validation_mode: 'exact_unordered',
          },
          mockExecutor,
        ),
      ).rejects.toThrow(NotFoundError);

      // No debe ejecutar la reference_query si el nivel no existe
      expect(mockExecutor.execute).not.toHaveBeenCalled();
    });
  });

  // ── getExpectedResult ──────────────────────────────────────────────────────
  describe('getExpectedResult', () => {
    it('retorna resultado desde DB y lo cachea en Redis cuando no hay cache', async () => {
      const cacheModule = await import('../../shared/cache/redis.js');
      (cacheModule.getJson as Mock).mockResolvedValueOnce(null); // cache miss

      const ex = {
        expectedResultJson: {
          columns: ['id', 'name'],
          rows: [[1, 'Widget']],
          row_count: 1,
        },
        validationMode: 'exact_unordered',
        isPublished: true,
      };

      (db.select as Mock).mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([ex]),
      });

      const result = await getExpectedResult('ex-uuid-1');

      expect(result.expectedResult.columns).toEqual(['id', 'name']);
      expect(result.validationMode).toBe('exact_unordered');

      // Debe poblar el cache
      expect(cacheModule.setJson).toHaveBeenCalled();
    });
  });
});
