import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('../../shared/db/index.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => false),
  readdirSync: vi.fn(() => []),
  readFileSync: vi.fn(() => ''),
}));

import { listLevels, getLevelDetail, getLevelLeaderboard } from './levels.service.js';
import { db } from '../../shared/db/index.js';
import { NotFoundError } from '../../shared/errors/index.js';

// ── Mock helpers ──────────────────────────────────────────────────────────────

/**
 * Crea una cadena Drizzle thenable.
 * - await chain → value (cuando where() es el método terminal)
 * - chain.limit(n) → Promise.resolve(value)
 * - chain.orderBy(...).limit(n) → limit es llamado sobre `this` que tiene limit
 */
function makeChain(value: unknown) {
  const chain: Record<string, unknown> = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(value),
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(value).then(resolve, reject),
  };
  return chain;
}

function mockSelect(returnValue: unknown) {
  (db.select as Mock).mockReturnValue(makeChain(returnValue));
}

function mockSelectSequence(returnValues: unknown[]) {
  let callIndex = 0;
  (db.select as Mock).mockImplementation(() => {
    const value = returnValues[callIndex] ?? [];
    callIndex++;
    return makeChain(value);
  });
}

// ── Tests: listLevels ─────────────────────────────────────────────────────────

describe('LevelsService - listLevels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna lista vacía si no hay niveles publicados', async () => {
    mockSelect([]);

    const result = await listLevels();

    expect(result).toEqual([]);
  });

  it('retorna niveles publicados con shape público correcto', async () => {
    const dbRows = [
      {
        id: 0,
        name: 'Nivel 00 — Fundamentos',
        description: 'Introducción a SQL',
        orderIndex: 0,
        xpRequired: 0,
        exercisesCount: 8,
      },
      {
        id: 1,
        name: 'Nivel 01 — Exploración',
        description: 'Filtros y ordenamiento',
        orderIndex: 1,
        xpRequired: 100,
        exercisesCount: 10,
      },
    ];
    mockSelect(dbRows);

    const result = await listLevels();

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 0,
      name: 'Nivel 00 — Fundamentos',
      order_index: 0,
      xp_required: 0,
      exercises_count: 8,
    });
    expect(result[1]).toMatchObject({
      id: 1,
      order_index: 1,
      xp_required: 100,
      exercises_count: 10,
    });
  });

  it('convierte exercisesCount a número aunque venga como string de SQL', async () => {
    mockSelect([{
      id: 2,
      name: 'Nivel 02',
      description: '',
      orderIndex: 2,
      xpRequired: 300,
      exercisesCount: '12',
    }]);

    const result = await listLevels();

    expect(typeof result[0]!.exercises_count).toBe('number');
    expect(result[0]!.exercises_count).toBe(12);
  });
});

// ── Tests: getLevelDetail ─────────────────────────────────────────────────────

describe('LevelsService - getLevelDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lanza NotFoundError si el nivel no existe o no está publicado', async () => {
    mockSelectSequence([[]]);

    await expect(getLevelDetail(99)).rejects.toThrow(NotFoundError);
  });

  it('retorna detalle del nivel con ejercicios publicados', async () => {
    const levelRow = {
      id: 1,
      name: 'Nivel 01 — Exploración',
      description: 'Filtros y ordenamiento',
      orderIndex: 1,
      xpRequired: 100,
      isPublished: true,
    };
    const exerciseRows = [
      { id: 'ex-1', title: 'Ejercicio 1', difficulty: 'easy', xpReward: 20, orderIndex: 1 },
      { id: 'ex-2', title: 'Ejercicio 2', difficulty: 'medium', xpReward: 30, orderIndex: 2 },
    ];

    mockSelectSequence([
      [levelRow],
      exerciseRows,
    ]);

    const result = await getLevelDetail(1);

    expect(result.id).toBe(1);
    expect(result.name).toBe('Nivel 01 — Exploración');
    expect(result.exercises).toHaveLength(2);
    expect(result.exercises[0]).toMatchObject({
      id: 'ex-1',
      xp_reward: 20,
      order_index: 1,
    });
  });

  it('incluye progreso del usuario cuando se pasa userId', async () => {
    const levelRow = {
      id: 0,
      name: 'Nivel 00 — Fundamentos',
      description: '',
      orderIndex: 0,
      xpRequired: 0,
      isPublished: true,
    };
    const exerciseRows = [
      { id: 'ex-a', title: 'SELECT básico', difficulty: 'easy', xpReward: 10, orderIndex: 1 },
      { id: 'ex-b', title: 'WHERE', difficulty: 'easy', xpReward: 15, orderIndex: 2 },
    ];
    const progressRows = [
      { exerciseId: 'ex-a', status: 'completed', completedAt: new Date('2025-05-01') },
    ];

    mockSelectSequence([
      [levelRow],
      exerciseRows,
      progressRows,
    ]);

    const result = await getLevelDetail(0, 'user-1');

    const exA = result.exercises.find((e) => e.id === 'ex-a');
    const exB = result.exercises.find((e) => e.id === 'ex-b');

    expect(exA?.progress?.status).toBe('completed');
    expect(exB?.progress?.status).toBe('not_started');
  });

  it('devuelve exercises vacío si el nivel no tiene ejercicios publicados', async () => {
    mockSelectSequence([
      [{ id: 3, name: 'Nivel 03', description: '', orderIndex: 3, xpRequired: 500, isPublished: true }],
      [],
    ]);

    const result = await getLevelDetail(3);

    expect(result.exercises).toHaveLength(0);
  });
});

// ── Tests: getLevelLeaderboard ────────────────────────────────────────────────

describe('LevelsService - getLevelLeaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lanza NotFoundError si el nivel no existe', async () => {
    mockSelectSequence([[]]);

    await expect(getLevelLeaderboard(99)).rejects.toThrow(NotFoundError);
  });

  it('retorna lista vacía si nadie completó ejercicios del nivel', async () => {
    mockSelectSequence([
      [{ id: 1 }],
      [],
    ]);

    const result = await getLevelLeaderboard(1);

    expect(result).toEqual([]);
  });

  it('retorna leaderboard con rank asignado en orden', async () => {
    const rows = [
      { userId: 'u1', username: 'ana', avatarUrl: null, xpTotal: 1200, exercisesCompletedInLevel: 10 },
      { userId: 'u2', username: 'pedro', avatarUrl: 'https://cdn/p.jpg', xpTotal: 980, exercisesCompletedInLevel: 8 },
      { userId: 'u3', username: 'maria', avatarUrl: null, xpTotal: 750, exercisesCompletedInLevel: 6 },
    ];

    mockSelectSequence([
      [{ id: 1 }],
      rows,
    ]);

    const result = await getLevelLeaderboard(1);

    expect(result).toHaveLength(3);
    expect(result[0]!.rank).toBe(1);
    expect(result[0]!.username).toBe('ana');
    expect(result[1]!.rank).toBe(2);
    expect(result[2]!.rank).toBe(3);
    expect(result[1]!.avatar_url).toBe('https://cdn/p.jpg');
    expect(result[2]!.avatar_url).toBeNull();
  });
});
