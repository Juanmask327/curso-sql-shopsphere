import type { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError, ForbiddenError, SessionRevokedError, TokenInvalidError } from '../errors/index.js';
import { getRedis, CacheKeys } from '../cache/redis.js';
import { db } from '../db/index.js';
import { sessions } from '../db/schema.js';
import { eq, and, isNull, gt } from 'drizzle-orm';

/**
 * Payload del JWT de acceso.
 * Definido aquí para que sea importable desde cualquier módulo.
 *
 * El index signature [key: string]: unknown es necesario para que JwtPayload
 * sea asignable a VerifyPayloadType (object | string) en el sistema de tipos
 * de @fastify/jwt cuando se usa el parámetro de tipo genérico en jwtVerify<T>.
 */
export interface JwtPayload {
  sub: string;          // user ID (UUID)
  email: string;
  role: 'student' | 'admin' | 'instructor';
  sessionId: string;
  type: 'access';
  [key: string]: unknown;
}

/**
 * Augmentación de @fastify/jwt para que request.user y jwt.sign
 * queden tipados con JwtPayload en todo el proyecto.
 */
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

/**
 * Prehandler que verifica el JWT de acceso.
 *
 * Flujo:
 * 1. Extraer token del header Authorization: Bearer <token>
 * 2. Verificar firma con @fastify/jwt (lanza si está expirado o firma inválida)
 * 3. Verificar que el tipo es 'access' (no un refresh token reutilizado)
 * 4. Verificar que la sesión no está revocada en Redis
 *
 * La revocación de sesiones activas se gestiona en Redis con la clave
 * session:revoked:{sessionId}. El access token (15min) se verifica solo
 * por firma — no hace round-trip a DB en cada request.
 */
export async function authGuard(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const authHeader = request.headers['authorization'];

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed Authorization header');
  }

  try {
    // jwtVerify verifica firma y expiración, popula request.user con JwtPayload
    // (gracias a la augmentación FastifyJWT arriba)
    await request.jwtVerify();

    const payload = request.user;

    if (payload.type !== 'access') {
      throw new TokenInvalidError();
    }

    // Verificar que la sesión no está revocada en Redis
    await verifySessionNotRevoked(payload.sessionId);
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof SessionRevokedError || err instanceof TokenInvalidError) {
      throw err;
    }

    // Errores de @fastify/jwt (JsonWebTokenError, TokenExpiredError, etc.)
    const message = err instanceof Error ? err.message : 'Invalid token';
    if (message.toLowerCase().includes('expired')) {
      throw new UnauthorizedError('Access token expired', 'TOKEN_EXPIRED');
    }
    throw new TokenInvalidError();
  }
}

/**
 * Verifica que la sesión no está revocada.
 * Primero intenta Redis (O(1)), fallback a DB si Redis no responde.
 */
async function verifySessionNotRevoked(sessionId: string): Promise<void> {
  try {
    const redis = getRedis();
    const revokedKey = `session:revoked:${sessionId}`;
    const isRevoked = await redis.exists(revokedKey);

    if (isRevoked > 0) {
      throw new SessionRevokedError();
    }
  } catch (err) {
    if (err instanceof SessionRevokedError) throw err;

    // Redis no disponible: fallback a DB
    // Aceptamos la latencia extra para no romper auth cuando Redis está down
    await verifySessionInDb(sessionId);
  }
}

async function verifySessionInDb(sessionId: string): Promise<void> {
  const result = await db
    .select({ revokedAt: sessions.revokedAt, expiresAt: sessions.expiresAt })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  const record = result[0];
  if (!record) {
    throw new SessionRevokedError();
  }

  if (record.revokedAt !== null) {
    throw new SessionRevokedError();
  }

  if (record.expiresAt < new Date()) {
    throw new UnauthorizedError('Session expired', 'SESSION_EXPIRED');
  }
}

/**
 * Guard que requiere rol admin o instructor.
 * Usar como preHandler después de authGuard.
 */
export async function adminGuard(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const user = request.user;
  const role = user.role as string;
  if (role !== 'admin' && role !== 'instructor') {
    throw new ForbiddenError('Admin or instructor role required');
  }
}
