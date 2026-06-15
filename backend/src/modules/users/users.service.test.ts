import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

/**
 * Tests del users service.
 *
 * Estrategia: mock completo de DB y Redis — sin infraestructura real.
 * Los tests verifican comportamiento observable, no implementación interna.
 */

vi.mock('../../shared/db/index.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
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

import { getDashboard, updateProfile, getPublicProfile } from './users.service.js';
import { NotFoundError, ConflictError } from '../../shared/errors/index.js';
import { db } from '../../shared/db/index.js';

// ── Helpers de test ───────────────────────────────────────────────────────────

/**
 * Construye el mock de la cadena fluent de Drizzle para SELECT.
 * Soporta múltiples llamadas encadenadas con mockReturnValueOnce.
 */
function mockSelect(returnValue: unknown) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(returnValue),
    then: (resolve: any) => resolve(returnValue),
  };
  (db.select as Mock).mockReturnValueOnce(chain);
  return chain;
}

/**
 * Versión de mockSelect que resuelve con Promise directamente
 * (para queries sin .limit() al final).
 */
function mockSelectDirect(returnValue: unknown) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(returnValue),
    limit: vi.fn().mockResolvedValue(returnValue),
    then: (resolve: any) => resolve(returnValue),
  };
  (db.select as Mock).mockReturnValueOnce(chain);
  return chain;
}

/** Fecha fija para tests deterministas */
const fixedDate = new Date('2025-06-01T12:00:00Z');

// ── Fixtures ──────────────────────────────────────────────────────────────────

const activeUser = {
  id: 'user-uuid-1',
  email: 'student@example.com',
  username: 'testStudent',
  passwordHash: '$2b$12$hashed',
  role: 'student',
  xpTotal: 350,
  currentLevel: 2,
  avatarUrl: 'https://cdn.example.com/avatar.png',
  isActive: true,
  emailVerified: true,
  createdAt: fixedDate,
  updatedAt: fixedDate,
};

const level1 = { id: 1, name: 'SQL Basics', xpRequired: 0 };
const level2 = { id: 2, name: 'Intermediate SQL', xpRequired: 200 };
const level3 = { id: 3, name: 'Advanced SQL', xpRequired: 500 };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('UsersService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.select as Mock).mockReset();
    (db.insert as Mock).mockReset();
    (db.update as Mock).mockReset();
  });

  // ── getDashboard ───────────────────────────────────────────────────────────
  describe('getDashboard', () => {
    it('retorna la estructura correcta para un usuario con actividad', async () => {
      // Mock 1: usuario encontrado
      mockSelect([activeUser]);

      // Mock 2: computeLevelProgress → todos los niveles
      mockSelectDirect([level1, level2, level3]);

      // Mock 3: stats — user_exercise_progress agregados
      mockSelect([
        {
          exercises_completed: 5,
          exercises_attempted: 7,
          hints_used_total: 3,
          total_attempts_progress: 12,
        },
      ]);

      // Mock 4: recent_activity
      mockSelect([
        {
          exerciseId: 'ex-uuid-1',
          exerciseTitle: 'SELECT Basics',
          levelName: 'SQL Basics',
          completedAt: fixedDate,
          updatedAt: fixedDate,
          status: 'completed',
          xpEarned: 50,
        },
      ]);

      // Mock 5: level_completion — niveles con conteo de ejercicios
      mockSelectDirect([
        { levelId: 1, levelName: 'SQL Basics', isPublished: true, exercisesTotal: 5 },
        { levelId: 2, levelName: 'Intermediate SQL', isPublished: true, exercisesTotal: 8 },
      ]);

      // Mock 6: stats — exercise_attempts count
      mockSelect([{ total: 15 }]);

      // Mock 7: completed per level query
      mockSelectDirect([
        { levelId: 1, completedCount: 5 },
        { levelId: 2, completedCount: 0 },
      ]);

      const result = await getDashboard('user-uuid-1');

      // Verificar estructura top-level
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('level_progress');
      expect(result).toHaveProperty('stats');
      expect(result).toHaveProperty('recent_activity');
      expect(result).toHaveProperty('level_completion');

      // Usuario
      expect(result.user.id).toBe('user-uuid-1');
      expect(result.user.email).toBe('student@example.com');
      expect(result.user.xp_total).toBe(350);
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user).not.toHaveProperty('password_hash');

      // Nivel: con 350 XP está en nivel 2 (xp_required=200), siguiente es nivel 3 (500)
      expect(result.level_progress.current_level.id).toBe(2);
      expect(result.level_progress.next_level?.id).toBe(3);
      expect(result.level_progress.xp_in_current_level).toBe(150); // 350 - 200
      expect(result.level_progress.xp_to_next_level).toBe(150); // 500 - 350
      expect(result.level_progress.progress_pct).toBe(50); // 150/300 = 50%

      // Stats
      expect(result.stats.exercises_completed).toBe(5);
      expect(result.stats.exercises_attempted).toBe(7);
      expect(result.stats.total_attempts).toBe(15);
      expect(result.stats.hints_used_total).toBe(3);

      // Actividad reciente
      expect(result.recent_activity).toHaveLength(1);
      expect(result.recent_activity[0]?.exercise_id).toBe('ex-uuid-1');
      expect(result.recent_activity[0]?.status).toBe('completed');
    });

    it('retorna ceros para un usuario nuevo sin actividad', async () => {
      const newUser = {
        ...activeUser,
        id: 'new-user-uuid',
        xpTotal: 0,
        currentLevel: 0,
      };

      // Mock usuario
      mockSelect([newUser]);

      // Mock niveles — con 0 XP está en nivel 1 (xp_required=0)
      mockSelectDirect([level1, level2]);

      // Mock stats — sin actividad
      mockSelect([
        {
          exercises_completed: 0,
          exercises_attempted: 0,
          hints_used_total: null,
          total_attempts_progress: null,
        },
      ]);

      // Mock recent activity — vacío
      mockSelect([]);

      // Mock level completion — niveles sin ejercicios completados
      mockSelectDirect([
        { levelId: 1, levelName: 'SQL Basics', isPublished: true, exercisesTotal: 5 },
      ]);

      // Mock attempt count
      mockSelect([{ total: 0 }]);

      // Mock completed per level
      mockSelectDirect([]);

      const result = await getDashboard('new-user-uuid');

      expect(result.stats.exercises_completed).toBe(0);
      expect(result.stats.exercises_attempted).toBe(0);
      expect(result.stats.total_attempts).toBe(0);
      expect(result.stats.hints_used_total).toBe(0);
      expect(result.stats.avg_attempts_per_exercise).toBe(0);
      expect(result.stats.completion_rate_pct).toBe(0);
      expect(result.recent_activity).toHaveLength(0);

      // Sin actividad en nivel 1, completion = 0%
      const levelOne = result.level_completion.find((l) => l.level_id === 1);
      expect(levelOne?.exercises_completed).toBe(0);
      expect(levelOne?.completion_pct).toBe(0);

      // Con 0 XP está en el primer nivel, sin nivel siguiente solo si hay uno
      expect(result.level_progress.current_level.id).toBe(1);
      expect(result.level_progress.xp_in_current_level).toBe(0);
    });

    it('lanza NotFoundError si el usuario no existe o está inactivo', async () => {
      // select retorna vacío — usuario no encontrado o inactivo
      mockSelect([]);

      await expect(getDashboard('nonexistent-uuid')).rejects.toThrow(NotFoundError);
    });
  });

  // ── updateProfile ──────────────────────────────────────────────────────────
  describe('updateProfile', () => {
    it('actualiza username cuando no está tomado por otro usuario', async () => {
      // Mock: verificar si el username está tomado por otro usuario → no existe
      mockSelect([]);

      // Mock: UPDATE retorna el usuario actualizado
      const updatedUser = {
        id: 'user-uuid-1',
        username: 'newUsername',
        avatarUrl: null,
      };
      (db.update as Mock).mockReturnValueOnce({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([updatedUser]),
      });

      const result = await updateProfile('user-uuid-1', { username: 'newUsername' });

      expect(result.username).toBe('newUsername');
      expect(result.id).toBe('user-uuid-1');
    });

    it('rechaza username duplicado con ConflictError', async () => {
      // Mock: el username ya está tomado por otro usuario (id diferente)
      mockSelect([{ id: 'other-user-uuid' }]);
      mockSelect([{ id: 'other-user-uuid' }]);

      await expect(
        updateProfile('user-uuid-1', { username: 'takenUsername' }),
      ).rejects.toThrow(ConflictError);

      // Verificar que el código de error es el correcto
      await expect(
        updateProfile('user-uuid-1', { username: 'takenUsername' }),
      ).rejects.toMatchObject({
        code: 'USERNAME_ALREADY_EXISTS',
        statusCode: 409,
      });
    });

    it('actualiza solo el avatar_url sin verificar username', async () => {
      const updatedUser = {
        id: 'user-uuid-1',
        username: 'testStudent',
        avatarUrl: 'https://new-avatar.com/pic.png',
      };

      (db.update as Mock).mockReturnValueOnce({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([updatedUser]),
      });

      const result = await updateProfile('user-uuid-1', {
        avatar_url: 'https://new-avatar.com/pic.png',
      });

      expect(result.avatar_url).toBe('https://new-avatar.com/pic.png');
      // No debería haber hecho select para verificar username
      expect(db.select).not.toHaveBeenCalled();
    });
  });

  // ── getPublicProfile ───────────────────────────────────────────────────────
  describe('getPublicProfile', () => {
    it('retorna perfil público para usuario activo', async () => {
      // Mock: usuario encontrado y activo
      mockSelect([
        {
          id: 'user-uuid-1',
          username: 'testStudent',
          avatarUrl: 'https://cdn.example.com/avatar.png',
          xpTotal: 350,
          currentLevel: 2,
          isActive: true,
        },
      ]);

      // Mock: ejercicios completados
      mockSelect([{ total: 12 }]);

      // Mock: certificados
      mockSelectDirect([
        {
          uid: 'SS-L1-ABC123',
          levelName: 'SQL Basics',
          issuedAt: fixedDate,
        },
      ]);

      const result = await getPublicProfile('testStudent');

      expect(result).not.toBeNull();
      expect(result!.username).toBe('testStudent');
      expect(result!.xp_total).toBe(350);
      expect(result!.exercises_completed).toBe(12);
      expect(result!.certificates).toHaveLength(1);
      expect(result!.certificates[0]?.uid).toBe('SS-L1-ABC123');

      // El perfil público no debe incluir email ni passwordHash
      expect(result).not.toHaveProperty('email');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('retorna null para usuario inactivo', async () => {
      // select con WHERE is_active=true retorna vacío (usuario inactivo o inexistente)
      mockSelect([]);

      const result = await getPublicProfile('inactiveUser');

      expect(result).toBeNull();
    });

    it('retorna null para username inexistente', async () => {
      mockSelect([]);

      const result = await getPublicProfile('nonexistentUser');

      expect(result).toBeNull();
    });
  });
});
