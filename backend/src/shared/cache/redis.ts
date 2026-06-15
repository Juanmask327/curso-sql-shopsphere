import { Redis } from 'ioredis';

const rawRedisUrl = process.env['REDIS_URL'];
if (!rawRedisUrl) {
  throw new Error('REDIS_URL environment variable is required');
}
// Narrowing explícito: después del throw, rawRedisUrl es string
const redisUrl: string = rawRedisUrl;

/**
 * Singleton de ioredis. Reutilizado en todo el proceso.
 * Upstash Redis usa TLS (rediss://), ioredis lo maneja automáticamente
 * cuando detecta el protocolo rediss://.
 */
let redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (!redisInstance) {
    // Seguridad: en staging/producción Redis debe estar protegido con password.
    // Si REDIS_URL no incluye credenciales, se usa REDIS_PASSWORD como opción
    // de conexión. Se advierte al arrancar si no hay password fuera de dev.
    const redisPassword = process.env['REDIS_PASSWORD'];
    const urlHasCredentials = /\/\/[^/@]*@/.test(redisUrl);
    if (
      !redisPassword &&
      !urlHasCredentials &&
      process.env['NODE_ENV'] !== 'development'
    ) {
      console.warn(
        '[Redis] WARNING: REDIS_PASSWORD no está configurado y NODE_ENV no es ' +
          '"development". En staging/producción Redis debe requerir autenticación.',
      );
    }

    redisInstance = new Redis(redisUrl, {
      // Password explícito (ioredis lo ignora si la URL ya trae credenciales).
      ...(redisPassword ? { password: redisPassword } : {}),
      // Reintentos con backoff exponencial — evitar retry storms
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        if (times > 3) return null; // Dejar de reintentar
        return Math.min(times * 100, 500); // 100ms, 200ms, 300ms
      },
      // Upstash TLS
      tls: process.env['REDIS_TLS'] === 'true' ? {} : undefined,
      // Timeout de conexión
      connectTimeout: 5000,
      // Comando timeout — fallamos rápido si Redis no responde
      commandTimeout: 3000,
      lazyConnect: true,
    });

    redisInstance.on('error', (err: Error) => {
      console.error('[Redis] Connection error:', err);
    });

    redisInstance.on('reconnecting', () => {
      console.warn('[Redis] Reconnecting...');
    });
  }

  return redisInstance;
}

/**
 * Cierra la conexión Redis limpiamente en shutdown.
 */
export async function closeRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
  }
}

// ── Helpers de Redis para patrones comunes ────────────────────────────────────

/**
 * Guarda un valor JSON en Redis con TTL en segundos.
 */
export async function setJson<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const redis = getRedis();
  await redis.setex(key, ttlSeconds, JSON.stringify(value));
}

/**
 * Obtiene un valor JSON de Redis. Retorna null si no existe o expiró.
 */
export async function getJson<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  const raw = await redis.get(key);
  if (!raw) return null;
  return JSON.parse(raw) as T;
}

/**
 * Elimina una clave de Redis.
 */
export async function del(key: string): Promise<void> {
  const redis = getRedis();
  await redis.del(key);
}

// ── Namespaces de claves ──────────────────────────────────────────────────────
// Centralizar los patrones de claves evita typos y facilita auditoría

export const CacheKeys = {
  // Sesión de usuario activa: session:{tokenHash}
  session: (tokenHash: string) => `session:${tokenHash}` as const,

  // Cache del expected_result de un ejercicio: exercise:expected:{exerciseId}
  exerciseExpected: (exerciseId: string) => `exercise:expected:${exerciseId}` as const,

  // Rate limiting del login por IP: ratelimit:login:{ip}
  rateLimitLogin: (ip: string) => `ratelimit:login:${ip}` as const,

  // Rate limiting del playground por usuario: playground:ratelimit:{userId}:{minuteBucket}
  playgroundRateLimit: (userId: string, minuteBucket: number) =>
    `playground:ratelimit:${userId}:${minuteBucket}` as const,
} as const;

// TTLs en segundos
export const CacheTTL = {
  session: 7 * 24 * 60 * 60,        // 7 días
  exerciseExpected: 60 * 60,          // 1 hora
  playgroundRateLimit: 60,            // 1 minuto
} as const;
