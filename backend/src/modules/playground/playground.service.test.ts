import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

/**
 * Tests del playground service.
 *
 * Verifican el comportamiento del flujo de validación completo:
 * - Integración con el Worker pool (mockeado)
 * - Lógica de rate limiting
 * - Cálculo de XP con penalización por hints
 * - Manejo de errores de ejecución
 */

vi.mock('../../shared/db/index.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../certificates/certificates.service.js', () => ({
  checkAndIssueCertificate: vi.fn().mockResolvedValue({
    already_had: false,
    newly_issued: false,
  }),
}));

const redisPipelineMock = {
  incr: vi.fn().mockReturnThis(),
  expire: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue([[null, 1], [null, 1]]),
};

const redisMock = {
  get: vi.fn().mockResolvedValue(null),
  setex: vi.fn().mockResolvedValue('OK'),
  del: vi.fn().mockResolvedValue(1),
  exists: vi.fn().mockResolvedValue(0),
  pipeline: vi.fn(() => redisPipelineMock),
};

vi.mock('../../shared/cache/redis.js', () => ({
  getRedis: vi.fn(() => redisMock),
  CacheKeys: {
    session: (h: string) => `session:${h}`,
    exerciseExpected: (id: string) => `exercise:expected:${id}`,
    playgroundRateLimit: (userId: string, bucket: number) =>
      `playground:ratelimit:${userId}:${bucket}`,
    rateLimitLogin: (ip: string) => `ratelimit:login:${ip}`,
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

import { validateQuery } from './playground.service.js';
import { RateLimitError, NotFoundError } from '../../shared/errors/index.js';
import { db } from '../../shared/db/index.js';
import type { WorkerPool } from './worker-pool.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeWorkerPool(overrides: Partial<WorkerPool> = {}): WorkerPool {
  return {
    execute: vi.fn().mockResolvedValue({
      columns: ['id', 'name', 'price'],
      rows: [[1, 'Widget', 9.99]],
      row_count: 1,
      execution_ms: 15,
    }),
    initialize: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined),
    metrics: { workers_total: 4, workers_busy: 0, workers_idle: 4, queue_depth: 0 },
    ...overrides,
  } as unknown as WorkerPool;
}

function makeExerciseRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'ex-uuid-1',
    xpReward: 10,
    validationMode: 'exact_unordered',
    expectedResultJson: {
      columns: ['id', 'name', 'price'],
      rows: [[1, 'Widget', 9.99]],
      row_count: 1,
    },
    isPublished: true,
    ...overrides,
  };
}

/** Simula la cadena select().from().where().limit() de Drizzle */
function setupSelectChain(returnValue: unknown) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(returnValue),
  };
  (db.select as Mock).mockReturnValue(chain);
  return chain;
}

function setupInsertChain(returnValue: unknown) {
  const chain = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(returnValue),
    onConflictDoUpdate: vi.fn().mockResolvedValue(returnValue),
  };
  (db.insert as Mock).mockReturnValue(chain);
  return chain;
}

function setupUpdateChain(returnValue: unknown) {
  const chain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(returnValue),
  };
  (db.update as Mock).mockReturnValue(chain);
  return chain;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PlaygroundService — validateQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Por defecto: rate limit no excedido (count=1)
    redisPipelineMock.exec.mockResolvedValue([[null, 1], [null, 1]]);
  });

  // ── Test 1: query válida retorna valid=true y xp_earned > 0 ────────────────
  it('query válida retorna valid=true y xp_earned mayor que 0', async () => {
    const pool = makeWorkerPool();

    // expected result en DB (cache miss)
    (db.select as Mock)
      .mockReturnValueOnce({
        // Para getExerciseForValidation — sin cache Redis, fetch completo desde DB
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([makeExerciseRow()]),
      })
      .mockReturnValueOnce({
        // Para obtener hintsUsed del progreso del usuario
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ hintsUsed: 0 }]),
      });

    // insert para persistir el intento (async)
    setupInsertChain([{ id: 'attempt-1' }]);
    setupUpdateChain([{ xpTotal: 10 }]);

    const result = await validateQuery(
      { exercise_id: 'ex-uuid-1', query: 'SELECT id, name, price FROM products' },
      'user-uuid-1',
      pool,
    );

    expect(result.valid).toBe(true);
    expect(result.xp_earned).toBeDefined();
    expect(result.xp_earned).toBeGreaterThan(0);
    expect(result.execution_ms).toBeGreaterThanOrEqual(0);
  });

  // ── Test 2: más filas de las esperadas → hint sobre JOINs ─────────────────
  it('query con más filas de las esperadas retorna valid=false con hint sobre JOINs o DISTINCT', async () => {
    // El worker retorna 3 filas pero se esperan 1
    const pool = makeWorkerPool({
      execute: vi.fn().mockResolvedValue({
        columns: ['id', 'name', 'price'],
        rows: [
          [1, 'Widget', 9.99],
          [1, 'Widget', 9.99], // duplicado — simula JOIN cartesiano
          [2, 'Gadget', 19.99],
        ],
        row_count: 3,
        execution_ms: 20,
      }),
    } as unknown as Partial<WorkerPool>);

    (db.select as Mock)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([makeExerciseRow()]),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ hintsUsed: 0 }]),
      });

    setupInsertChain([{ id: 'attempt-2' }]);

    const result = await validateQuery(
      { exercise_id: 'ex-uuid-1', query: 'SELECT * FROM products JOIN categories' },
      'user-uuid-1',
      pool,
    );

    expect(result.valid).toBe(false);
    expect(result.row_count_got).toBe(3);
    expect(result.row_count_expected).toBe(1);
    // El hint debe mencionar filas duplicadas o JOINs
    expect(result.hint).toMatch(/duplica|JOIN|DISTINCT/i);
  });

  // ── Test 3: error de sintaxis SQL → execution_error ────────────────────────
  it('query con error de sintaxis retorna valid=false con error_type execution_error', async () => {
    const pool = makeWorkerPool({
      execute: vi.fn().mockRejectedValue(
        new Error('Parse error: near "SELCT": syntax error'),
      ),
    } as unknown as Partial<WorkerPool>);

    (db.select as Mock).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([makeExerciseRow()]),
    });

    setupInsertChain([{ id: 'attempt-3' }]);

    const result = await validateQuery(
      { exercise_id: 'ex-uuid-1', query: 'SELCT * FROM products' },
      'user-uuid-1',
      pool,
    );

    expect(result.valid).toBe(false);
    expect(result.error_type).toBe('execution_error');
    expect(result.hint).toMatch(/error|syntax/i);
  });

  // ── Test 4: rate limit se activa después de 60 requests en 1 minuto ────────
  it('rate limit se activa cuando se supera el límite de requests por minuto', async () => {
    // Simular que el contador ya llegó a 61 (por encima del límite de 60)
    redisPipelineMock.exec.mockResolvedValue([[null, 61], [null, 1]]);

    const pool = makeWorkerPool();

    await expect(
      validateQuery(
        { exercise_id: 'ex-uuid-1', query: 'SELECT 1' },
        'user-uuid-heavy',
        pool,
      ),
    ).rejects.toThrow(RateLimitError);

    // El worker no debe ejecutarse si el rate limit fue excedido
    expect(pool.execute).not.toHaveBeenCalled();
  });

  // ── Test 5: penalización de XP por hints usados ───────────────────────────
  it('la penalización por hints reduce el XP correctamente', async () => {
    // 2 hints usados: -20% → 10 * 0.8 = 8 XP
    const pool = makeWorkerPool();

    (db.select as Mock)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([makeExerciseRow({ xpReward: 10 })]),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ hintsUsed: 2 }]),
      });

    setupInsertChain([{ id: 'attempt-5' }]);
    setupUpdateChain([{ xpTotal: 8 }]);

    const result = await validateQuery(
      { exercise_id: 'ex-uuid-1', query: 'SELECT id, name, price FROM products' },
      'user-uuid-hints',
      pool,
    );

    expect(result.valid).toBe(true);
    // Con 2 hints: 10 * (1 - 0.2) = 8 XP
    expect(result.xp_earned).toBe(8);
  });

  // ── Test bonus: ejercicio no encontrado lanza NotFoundError ───────────────
  it('lanza NotFoundError si el ejercicio no existe o no está publicado', async () => {
    const pool = makeWorkerPool();

    (db.select as Mock).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]), // vacío = no encontrado
    });

    await expect(
      validateQuery(
        { exercise_id: 'nonexistent-uuid', query: 'SELECT 1' },
        'user-uuid-1',
        pool,
      ),
    ).rejects.toThrow(NotFoundError);

    // Si el ejercicio no existe, no se debe ejecutar la query
    expect(pool.execute).not.toHaveBeenCalled();
  });
});

// ── Tests del módulo de validación (unit tests puros) ─────────────────────────

describe('ValidationService — cálculo de XP', () => {
  it('sin hints: XP completo', async () => {
    const { calculateXp } = await import('./validation.service.js');
    expect(calculateXp(10, 0)).toBe(10);
  });

  it('1 hint: -10% = 9 XP de 10', async () => {
    const { calculateXp } = await import('./validation.service.js');
    expect(calculateXp(10, 1)).toBe(9);
  });

  it('3 hints: -30% = 7 XP de 10', async () => {
    const { calculateXp } = await import('./validation.service.js');
    expect(calculateXp(10, 3)).toBe(7);
  });

  it('9 hints (máximo de penalización): mínimo 1 XP siempre', async () => {
    const { calculateXp } = await import('./validation.service.js');
    // 9 * 10% = 90% de penalización → 10 * 0.1 = 1
    expect(calculateXp(10, 9)).toBe(1);
  });

  it('penalización no puede bajar de 1 XP', async () => {
    const { calculateXp } = await import('./validation.service.js');
    // Con 100 hints (hipotético): siempre al menos 1 XP
    expect(calculateXp(5, 100)).toBeGreaterThanOrEqual(1);
  });
});

// ── Tests del algoritmo de comparación ───────────────────────────────────────

describe('ValidationService — algoritmo de comparación', () => {
  it('exact_unordered: acepta filas en diferente orden', async () => {
    const { validate } = await import('./validation.service.js');

    const got = {
      columns: ['id', 'name'],
      rows: [[2, 'Gadget'], [1, 'Widget']],
      row_count: 2,
      execution_ms: 10,
    };

    const expected = {
      columns: ['id', 'name'],
      rows: [[1, 'Widget'], [2, 'Gadget']],
      row_count: 2,
    };

    const result = validate(got, expected, 'exact_unordered');
    expect(result.valid).toBe(true);
  });

  it('exact_ordered: rechaza filas en diferente orden', async () => {
    const { validate } = await import('./validation.service.js');

    const got = {
      columns: ['id', 'name'],
      rows: [[2, 'Gadget'], [1, 'Widget']],
      row_count: 2,
      execution_ms: 10,
    };

    const expected = {
      columns: ['id', 'name'],
      rows: [[1, 'Widget'], [2, 'Gadget']],
      row_count: 2,
    };

    const result = validate(got, expected, 'exact_ordered');
    expect(result.valid).toBe(false);
    expect(result.hint).toMatch(/ORDER BY/i);
  });

  it('NULLs se consideran iguales entre sí', async () => {
    const { validate } = await import('./validation.service.js');

    const got = {
      columns: ['id', 'nullable_col'],
      rows: [[1, null], [2, null]],
      row_count: 2,
      execution_ms: 5,
    };

    const expected = {
      columns: ['id', 'nullable_col'],
      rows: [[1, null], [2, null]],
      row_count: 2,
    };

    const result = validate(got, expected, 'exact_ordered');
    expect(result.valid).toBe(true);
  });

  it('coerción numérica: "5" y 5 se consideran iguales', async () => {
    const { validate } = await import('./validation.service.js');

    const got = {
      columns: ['count'],
      rows: [['5']], // string retornado por SQLite
      row_count: 1,
      execution_ms: 5,
    };

    const expected = {
      columns: ['count'],
      rows: [[5]], // número en expected_result_json
      row_count: 1,
    };

    const result = validate(got, expected, 'exact_ordered');
    expect(result.valid).toBe(true);
  });
});
