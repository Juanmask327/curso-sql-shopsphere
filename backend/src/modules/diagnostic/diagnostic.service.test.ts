import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('../../shared/db/index.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../../shared/cache/redis.js', () => ({
  getRedis: vi.fn(() => ({
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(0),
  })),
  CacheKeys: {
    session: (hash: string) => `session:${hash}`,
    exerciseExpected: (id: string) => `exercise:expected:${id}`,
    playgroundRateLimit: (userId: string, bucket: number) =>
      `playground:ratelimit:${userId}:${bucket}`,
  },
  CacheTTL: { session: 604800, exerciseExpected: 3600, playgroundRateLimit: 60 },
  setJson: vi.fn().mockResolvedValue(undefined),
  getJson: vi.fn().mockResolvedValue(null),
  del: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../certificates/certificates.service.js', () => ({
  checkAndIssueCertificate: vi.fn().mockResolvedValue({ already_had: false, newly_issued: true }),
}));

import { saveResult } from './diagnostic.service.js';
import { db } from '../../shared/db/index.js';
import { checkAndIssueCertificate } from '../certificates/certificates.service.js';
import { ValidationError } from '../../shared/errors/index.js';

function mockSelect(returnValue: unknown) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(returnValue),
    then: (resolve: any) => resolve(returnValue),
  };
  (db.select as Mock).mockReturnValue(chain);
  return chain;
}

describe('DiagnosticService - saveResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.select as Mock).mockReset();
    (db.insert as Mock).mockReset();
    (db.update as Mock).mockReset();
  });

  it('lanza ValidationError si el usuario no existe', async () => {
    mockSelect([]); // Usuario no encontrado

    await expect(
      saveResult('nonexistent-uuid', { recommended_level: 2, score_by_level: [] }),
    ).rejects.toThrow(ValidationError);
  });

  it('no actualiza nada si el nivel recomendado es menor o igual al actual', async () => {
    mockSelect([{ currentLevel: 2 }]); // Usuario en nivel 2

    const result = await saveResult('user-uuid', { recommended_level: 2, score_by_level: [] });

    expect(result).toEqual({ saved: true, level_updated: false });
    expect(db.update).not.toHaveBeenCalled();
  });

  it('desbloquea niveles anteriores y completa ejercicios si el recomendado es mayor', async () => {
    // 1. Mock select para obtener el nivel actual del usuario = 0
    const currentLevelChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ currentLevel: 0 }]),
      then: (resolve: any) => resolve([{ currentLevel: 0 }]),
    };

    // 2. Mock select para obtener ejercicios publicados previos
    const previousExercises = [
      { id: 'ex-1', levelId: 0, xpReward: 10 },
      { id: 'ex-2', levelId: 0, xpReward: 15 },
      { id: 'ex-3', levelId: 1, xpReward: 20 },
    ];
    const previousExercisesChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(previousExercises),
      then: (resolve: any) => resolve(previousExercises),
    };

    // 3. Mock select para ejercicios completados (ex-1 ya completado por el usuario)
    const completedExercises = [{ exerciseId: 'ex-1' }];
    const completedExercisesChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(completedExercises),
      then: (resolve: any) => resolve(completedExercises),
    };

    // Encadenar las respuestas consecutivas de select
    (db.select as Mock)
      .mockReturnValueOnce(currentLevelChain) // primer select en saveResult (users)
      .mockReturnValueOnce(previousExercisesChain) // segundo select (exercises)
      .mockReturnValueOnce(completedExercisesChain); // tercer select (userExerciseProgress)

    // Mock insert para el progreso del ejercicio
    const insertChain = {
      values: vi.fn().mockReturnThis(),
      onConflictDoUpdate: vi.fn().mockResolvedValue([]),
    };
    (db.insert as Mock).mockReturnValue(insertChain);

    // Mock update para el usuario
    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    (db.update as Mock).mockReturnValue(updateChain);

    const result = await saveResult('user-uuid', { recommended_level: 2, score_by_level: [] });

    expect(result).toEqual({ saved: true, level_updated: true });

    // Verificar que se marcaron como completados los ejercicios pendientes (ex-2 y ex-3)
    expect(db.insert).toHaveBeenCalledTimes(2); // ex-2 y ex-3 son los pendientes
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({ exerciseId: 'ex-2', status: 'completed' }),
    );
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({ exerciseId: 'ex-3', status: 'completed' }),
    );

    // El total de XP sumado debe ser: ex-2 (15) + ex-3 (20) = 35 XP
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        currentLevel: 2,
      }),
    );

    // Verificar que se invocó checkAndIssueCertificate para niveles anteriores (nivel 0 y 1)
    expect(checkAndIssueCertificate).toHaveBeenCalledTimes(2);
    expect(checkAndIssueCertificate).toHaveBeenCalledWith('user-uuid', 0);
    expect(checkAndIssueCertificate).toHaveBeenCalledWith('user-uuid', 1);
  });
});
