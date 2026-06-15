import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

/**
 * Tests del auth service.
 *
 * Estrategia de aislamiento:
 * - Mockeamos la capa de DB (drizzle) y Redis para no necesitar
 *   infraestructura real en unit tests.
 * - Los tests verifican comportamiento (qué hace el servicio),
 *   no implementación (cómo lo hace internamente).
 * - bcrypt con BCRYPT_ROUNDS=4 (configurado en test-setup.ts) para velocidad.
 */

// Mocks deben declararse antes del import del módulo bajo test
vi.mock('../../shared/db/index.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
  },
}));

// Instancia mock de Redis compartida entre el servicio y los tests
const redisMockInstance = {
  setex: vi.fn().mockResolvedValue('OK'),
  del: vi.fn().mockResolvedValue(1),
  exists: vi.fn().mockResolvedValue(0),
  quit: vi.fn().mockResolvedValue('OK'),
};

vi.mock('../../shared/cache/redis.js', () => ({
  // getRedis siempre devuelve la misma instancia → los spies se preservan
  getRedis: vi.fn(() => redisMockInstance),
  CacheKeys: {
    session: (hash: string) => `session:${hash}`,
    rateLimitLogin: (ip: string) => `ratelimit:login:${ip}`,
    exerciseExpected: (id: string) => `exercise:expected:${id}`,
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

import { register, login, logout, getMe } from './auth.service.js';
import {
  EmailAlreadyExistsError,
  UsernameAlreadyExistsError,
  InvalidCredentialsError,
  NotFoundError,
} from '../../shared/errors/index.js';
import { db } from '../../shared/db/index.js';

// ── Helpers de test ───────────────────────────────────────────────────────────

const makeJwtSigner = () => ({
  sign: vi.fn().mockReturnValue('mock.access.token'),
  verify: vi.fn(),
});

const makeMeta = () => ({
  userAgent: 'test-agent/1.0',
  ipAddress: '127.0.0.1',
});

/** Construye el mock de una cadena de llamadas Drizzle fluent API */
function mockDbSelectChain(returnValue: unknown) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(returnValue),
  };
  (db.select as Mock).mockReturnValue(chain);
  return chain;
}

function mockDbInsertChain(returnValue: unknown) {
  const chain = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(returnValue),
  };
  (db.insert as Mock).mockReturnValue(chain);
  return chain;
}

function mockDbUpdateChain(returnValue: unknown) {
  const chain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(returnValue),
  };
  (db.update as Mock).mockReturnValue(chain);
  return chain;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── register ──────────────────────────────────────────────────────────────
  describe('register', () => {
    it('registro exitoso: crea usuario y retorna tokens', async () => {
      const mockUser = {
        id: 'user-uuid-1',
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashed',
        role: 'student',
        xpTotal: 0,
        currentLevel: 0,
        avatarUrl: null,
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSession = { id: 'session-uuid-1' };

      // transaction mock: ejecuta el callback con un tx que tiene insert
      (db.transaction as Mock).mockImplementation(async (callback: (tx: unknown) => unknown) => {
        const tx = {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnThis(),
            returning: vi
              .fn()
              .mockResolvedValueOnce([mockUser])    // primer insert: user
              .mockResolvedValueOnce([mockSession]), // segundo insert: session
          }),
        };
        return callback(tx);
      });

      // select para buscar email y username duplicados (ambos vacíos = no existe)
      (db.select as Mock)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        });

      const jwt = makeJwtSigner();
      const result = await register(
        { email: 'test@example.com', username: 'testuser', password: 'Password123!' },
        jwt,
        makeMeta(),
      );

      expect(result.user.email).toBe('test@example.com');
      expect(result.user.username).toBe('testuser');
      expect(result.tokens.accessToken).toBe('mock.access.token');
      expect(result.tokens.refreshToken).toBeDefined();
      expect(result.tokens.refreshToken.length).toBeGreaterThan(32);

      // La respuesta nunca debe incluir el password hash
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user).not.toHaveProperty('password_hash');
    });

    it('lanza EmailAlreadyExistsError si el email ya está registrado', async () => {
      // Primer select (email) retorna un usuario existente
      (db.select as Mock)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: 'existing-user-id' }]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        });

      const jwt = makeJwtSigner();

      await expect(
        register(
          { email: 'existing@example.com', username: 'newuser', password: 'Password123!' },
          jwt,
          makeMeta(),
        ),
      ).rejects.toThrow(EmailAlreadyExistsError);
    });

    it('lanza UsernameAlreadyExistsError si el username ya está tomado', async () => {
      // email libre, username tomado
      (db.select as Mock)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: 'existing-user-id' }]),
            }),
          }),
        });

      const jwt = makeJwtSigner();

      await expect(
        register(
          { email: 'new@example.com', username: 'takenuser', password: 'Password123!' },
          jwt,
          makeMeta(),
        ),
      ).rejects.toThrow(UsernameAlreadyExistsError);
    });

    it('la password se hashea con bcrypt (nunca se guarda en plain text)', async () => {
      // Verificamos indirectamente: la password que se almacena NO es plain text
      // y bcrypt.compare la verifica correctamente. Esto evita re-spy en módulo ESM.
      const mockUser = {
        id: 'user-uuid-2',
        email: 'hash@example.com',
        username: 'hashtest',
        passwordHash: '$2b$04$hashed',
        role: 'student',
        xpTotal: 0,
        currentLevel: 0,
        avatarUrl: null,
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (db.select as Mock)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
          }),
        });

      let capturedPasswordHash: string | undefined;

      (db.transaction as Mock).mockImplementation(async (callback: (tx: unknown) => unknown) => {
        const tx = {
          insert: vi.fn().mockImplementation(() => ({
            values: vi.fn().mockImplementation((data: { passwordHash?: string }) => {
              // Captura el hash que se va a guardar en DB
              if (data.passwordHash) {
                capturedPasswordHash = data.passwordHash;
              }
              return {
                returning: vi
                  .fn()
                  .mockResolvedValueOnce([mockUser])
                  .mockResolvedValueOnce([{ id: 'session-id' }]),
              };
            }),
          })),
        };
        return callback(tx);
      });

      const jwt = makeJwtSigner();
      await register(
        { email: 'hash@example.com', username: 'hashtest', password: 'MySecretPass!' },
        jwt,
        makeMeta(),
      );

      // El hash guardado debe ser un hash bcrypt (empieza con $2b$)
      // y NO debe ser la password en plain text
      expect(capturedPasswordHash).toBeDefined();
      expect(capturedPasswordHash).not.toBe('MySecretPass!');
      expect(capturedPasswordHash).toMatch(/^\$2[ab]\$\d+\$/);

      // Verificar que bcrypt puede verificar la password contra el hash
      const bcrypt = await import('bcryptjs');
      const isValid = await bcrypt.compare('MySecretPass!', capturedPasswordHash!);
      expect(isValid).toBe(true);
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────
  describe('login', () => {
    it('login correcto retorna access token y refresh token', async () => {
      const bcrypt = await import('bcryptjs');
      const plainPassword = 'ValidPass123!';
      // En test-setup.ts: BCRYPT_ROUNDS=4 para velocidad
      const hash = await bcrypt.hash(plainPassword, 4);

      const mockUser = {
        id: 'user-uuid-login',
        email: 'login@example.com',
        username: 'loginuser',
        passwordHash: hash,
        role: 'student',
        xpTotal: 100,
        currentLevel: 1,
        avatarUrl: null,
        isActive: true,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // select para buscar usuario por email
      (db.select as Mock).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      });

      // insert para crear sesión
      (db.insert as Mock).mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'session-login-1' }]),
      });

      const jwt = makeJwtSigner();
      const result = await login({ email: 'login@example.com', password: plainPassword }, jwt, makeMeta());

      expect(result.tokens.accessToken).toBe('mock.access.token');
      expect(result.tokens.refreshToken).toBeDefined();
      expect(result.user.email).toBe('login@example.com');
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user-uuid-login', type: 'access' }),
        expect.any(Object),
      );
    });

    it('lanza InvalidCredentialsError con password incorrecta', async () => {
      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.hash('CorrectPassword!', 4);

      const mockUser = {
        id: 'user-uuid-3',
        email: 'user@example.com',
        username: 'someuser',
        passwordHash: hash,
        role: 'student',
        xpTotal: 0,
        currentLevel: 0,
        avatarUrl: null,
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (db.select as Mock).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      });

      const jwt = makeJwtSigner();

      await expect(
        login({ email: 'user@example.com', password: 'WrongPassword!' }, jwt, makeMeta()),
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it('lanza InvalidCredentialsError si el email no existe (sin revelar si existe)', async () => {
      // Usuario no encontrado — retorna array vacío
      (db.select as Mock).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const jwt = makeJwtSigner();

      await expect(
        login({ email: 'notexist@example.com', password: 'AnyPassword!' }, jwt, makeMeta()),
      ).rejects.toThrow(InvalidCredentialsError);

      // Verificar que el mensaje es genérico (no revela que el email no existe)
      try {
        await login({ email: 'notexist@example.com', password: 'AnyPassword!' }, jwt, makeMeta());
      } catch (err) {
        if (err instanceof InvalidCredentialsError) {
          expect(err.message).toBe('Invalid email or password');
        }
      }
    });
  });

  // ── logout ────────────────────────────────────────────────────────────────
  describe('logout', () => {
    it('logout marca la sesión como revocada en DB y elimina de Redis', async () => {
      const cacheModule = await import('../../shared/cache/redis.js');
      const mockTokenHash = 'hashed-token-value';

      // Limpiar contadores de llamadas antes de este test
      redisMockInstance.setex.mockClear();
      (cacheModule.del as ReturnType<typeof vi.fn>).mockClear();

      // update retorna la sesión con su tokenHash
      (db.update as Mock).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ tokenHash: mockTokenHash }]),
      });

      await logout('session-id-1', 'user-id-1');

      // Verificar que se llamó update en DB
      expect(db.update).toHaveBeenCalled();

      // Verificar que del fue llamado con una clave de sesión
      expect(cacheModule.del).toHaveBeenCalledWith(
        expect.stringContaining('session:'),
      );

      // Verificar que setex fue invocado en la instancia Redis para marcar
      // la sesión como revocada (el access token puede seguir en memoria
      // del cliente 15min; Redis previene su reutilización)
      expect(redisMockInstance.setex).toHaveBeenCalledWith(
        expect.stringContaining('session:revoked:'),
        expect.any(Number),
        '1',
      );
    });
  });

  // ── getMe ─────────────────────────────────────────────────────────────────
  describe('getMe', () => {
    it('retorna perfil público del usuario sin password_hash', async () => {
      const mockUser = {
        id: 'user-uuid-me',
        email: 'me@example.com',
        username: 'meuser',
        passwordHash: '$2b$12$shouldNotAppear',
        role: 'student',
        xpTotal: 500,
        currentLevel: 2,
        avatarUrl: 'https://cdn.example.com/avatar.jpg',
        isActive: true,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (db.select as Mock).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      });

      const result = await getMe('user-uuid-me');

      expect(result.id).toBe('user-uuid-me');
      expect(result.email).toBe('me@example.com');
      expect(result.xpTotal).toBe(500);

      // Nunca exponer password_hash al cliente
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('password_hash');
    });

    it('lanza NotFoundError si el usuario no existe o está inactivo', async () => {
      (db.select as Mock).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(getMe('nonexistent-user-id')).rejects.toThrow(NotFoundError);
    });
  });
});
