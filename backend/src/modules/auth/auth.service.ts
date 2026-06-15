import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { db } from '../../shared/db/index.js';
import { users, sessions } from '../../shared/db/schema.js';
import { getRedis, CacheKeys, CacheTTL, setJson, del } from '../../shared/cache/redis.js';
import {
  EmailAlreadyExistsError,
  UsernameAlreadyExistsError,
  InvalidCredentialsError,
  UnauthorizedError,
  SessionRevokedError,
  NotFoundError,
  ValidationError,
  RateLimitError,
} from '../../shared/errors/index.js';
import { sendMail } from '../../shared/email/mailer.js';
import { verificationEmailTemplate, passwordResetEmailTemplate } from '../../shared/email/templates.js';
import type {
  RegisterInput,
  LoginInput,
  AuthResponse,
  UserPublic,
  AuthTokens,
} from './auth.schemas.js';
// JwtPayload se importa para tipar el JwtSigner — no crea dependencia circular
// porque auth.guard.ts importa de shared/, no de modules/auth/
import type { JwtPayload } from '../../shared/middleware/auth.guard.js';

export type { JwtPayload };

// ── Configuración de tokens ───────────────────────────────────────────────────
const BCRYPT_ROUNDS = parseInt(process.env['BCRYPT_ROUNDS'] ?? '12', 10);
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;    // 15 minutos
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 días

// ── Configuración de códigos de verificación ──────────────────────────────────
const CODE_TTL = 15 * 60;        // 15 minutos en segundos
const RESEND_COOLDOWN = 60;      // 1 minuto entre reenvíos
const MAX_CODE_ATTEMPTS = 5;     // intentos antes de invalidar el código

const codeKey = {
  verify: (email: string) => `email:verify:${email}`,
  reset:  (email: string) => `password:reset:${email}`,
  resend: (email: string) => `email:resend:cooldown:${email}`,
};

function generateCode(): string {
  // 3 bytes = [0, 16777215]; módulo 900000 da distribución uniforme en [0, 899999]
  const n = parseInt(randomBytes(3).toString('hex'), 16);
  return String(100000 + (n % 900000));
}

/**
 * Interfaz del FastifyJWT sign/verify.
 * Inyectada via DI para facilitar testing.
 *
 * JwtPayload tiene [key: string]: unknown y es el SignPayloadType en la
 * augmentación de @fastify/jwt, así que sign lo acepta directamente.
 */
export interface JwtSigner {
  sign(payload: JwtPayload, options?: { expiresIn: string | number }): string;
  // VerifyPayloadType de @fastify/jwt es `object | string`; nuestros callers
  // siempre pasan JwtPayload que satisface ese constraint.
  verify<T extends object | string>(token: string): T;
}

/**
 * Genera un token opaco criptográficamente seguro para el refresh token.
 * 32 bytes = 256 bits de entropía. Nunca se guarda en DB, solo su hash.
 */
function generateRefreshToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * SHA-256 del token. Es lo que se guarda en DB y Redis.
 * Si alguien roba la DB, los tokens siguen siendo inútiles.
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Proyecta un usuario de DB al shape público (sin password_hash).
 */
function toPublicUser(user: typeof users.$inferSelect): UserPublic {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    xpTotal: user.xpTotal,
    currentLevel: user.currentLevel,
    avatarUrl: user.avatarUrl,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
  };
}

/**
 * Genera un par de tokens (access + refresh) y persiste la sesión.
 */
async function generateTokenPair(
  user: typeof users.$inferSelect,
  sessionId: string,
  jwt: JwtSigner,
): Promise<AuthTokens> {
  const accessPayload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    sessionId,
    type: 'access',
  };

  const accessToken = jwt.sign(accessPayload, { expiresIn: '15m' });

  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);

  // El refresh token vive 7 días en Redis (cache) y en DB (fuente de verdad)
  await setJson(
    CacheKeys.session(refreshTokenHash),
    { userId: user.id, sessionId },
    CacheTTL.session,
  );

  return {
    accessToken,
    refreshToken,       // Solo sale al cliente una vez, nunca se vuelve a ver
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  };
}

// ── Métodos del servicio ──────────────────────────────────────────────────────

export async function register(
  data: RegisterInput,
  jwt: JwtSigner,
  meta: { userAgent?: string; ipAddress?: string },
): Promise<AuthResponse> {
  // Verificar duplicados antes de hashear la password (evitar bcrypt costo innecesario)
  const [existingEmail, existingUsername] = await Promise.all([
    db.select({ id: users.id }).from(users).where(eq(users.email, data.email)).limit(1),
    db.select({ id: users.id }).from(users).where(eq(users.username, data.username)).limit(1),
  ]);

  if (existingEmail.length > 0) throw new EmailAlreadyExistsError();
  if (existingUsername.length > 0) throw new UsernameAlreadyExistsError();

  // bcrypt con rounds=12 (deliberado: ~200-300ms, hace brute force impráctica)
  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  // Crear usuario en una transacción para garantizar atomicidad
  const result = await db.transaction(async (tx) => {
    const [newUser] = await tx
      .insert(users)
      .values({
        email: data.email,
        username: data.username,
        passwordHash,
        role: 'student',
      })
      .returning();

    if (!newUser) throw new Error('Failed to create user');

    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
    const refreshToken = generateRefreshToken();
    const tokenHash = hashToken(refreshToken);

    const [newSession] = await tx
      .insert(sessions)
      .values({
        userId: newUser.id,
        tokenHash,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        expiresAt,
      })
      .returning({ id: sessions.id });

    if (!newSession) throw new Error('Failed to create session');

    return { user: newUser, sessionId: newSession.id, refreshToken };
  });

  // Generar tokens fuera de la transacción (operación async que no afecta la DB)
  const accessPayload: JwtPayload = {
    sub: result.user.id,
    email: result.user.email,
    role: result.user.role,
    sessionId: result.sessionId,
    type: 'access',
  };

  const accessToken = jwt.sign(accessPayload, { expiresIn: '15m' });
  const tokenHash = hashToken(result.refreshToken);

  // Cachear sesión en Redis
  await setJson(
    CacheKeys.session(tokenHash),
    { userId: result.user.id, sessionId: result.sessionId },
    CacheTTL.session,
  );

  // Enviar email de verificación en background — no bloquea el registro
  sendVerificationCode({ email: result.user.email, username: result.user.username })
    .catch(err => console.error('[auth] Error sending verification email:', err));

  return {
    user: toPublicUser(result.user),
    tokens: {
      accessToken,
      refreshToken: result.refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    },
  };
}

export async function login(
  data: LoginInput,
  jwt: JwtSigner,
  meta: { userAgent?: string; ipAddress?: string },
): Promise<AuthResponse> {
  // Siempre ejecutar bcrypt, incluso si el usuario no existe,
  // para evitar timing attacks que revelan si un email está registrado.
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, data.email))
    .limit(1);

  // Hash dummy para comparación constante si el usuario no existe
  const hashToCompare = user?.passwordHash ?? '$2b$12$invalidhashfortimingatk';

  const passwordValid = await bcrypt.compare(data.password, hashToCompare);

  if (!user || !passwordValid) {
    throw new InvalidCredentialsError();
  }

  if (!user.isActive) {
    // Mismo mensaje — no revelar si la cuenta está desactivada a actores maliciosos
    throw new InvalidCredentialsError();
  }

  // Crear sesión
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
  const refreshToken = generateRefreshToken();
  const tokenHash = hashToken(refreshToken);

  const [newSession] = await db
    .insert(sessions)
    .values({
      userId: user.id,
      tokenHash,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt,
    })
    .returning({ id: sessions.id });

  if (!newSession) throw new Error('Failed to create session');

  // Cachear sesión en Redis para lookups rápidos
  await setJson(
    CacheKeys.session(tokenHash),
    { userId: user.id, sessionId: newSession.id },
    CacheTTL.session,
  );

  const accessPayload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    sessionId: newSession.id,
    type: 'access',
  };

  const accessToken = jwt.sign(accessPayload, { expiresIn: '15m' });

  return {
    user: toPublicUser(user),
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    },
  };
}

export async function logout(sessionId: string, userId: string): Promise<void> {
  // 1. Marcar sesión como revocada en DB (fuente de verdad)
  const [session] = await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId), isNull(sessions.revokedAt)))
    .returning({ tokenHash: sessions.tokenHash });

  if (!session) {
    // Sesión ya revocada o no existe — no es un error crítico
    return;
  }

  // 2. Eliminar de Redis y marcar como revocada para que el authGuard la detecte
  const redis = getRedis();
  await Promise.all([
    del(CacheKeys.session(session.tokenHash)),
    // Marcar como revocada en Redis con TTL igual al JWT access (15min)
    // Para que el authGuard lo detecte antes de que expire el access token
    redis.setex(`session:revoked:${sessionId}`, ACCESS_TOKEN_TTL_SECONDS, '1'),
  ]);
}

export async function getMe(userId: string): Promise<UserPublic> {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.isActive, true)))
    .limit(1);

  if (!user) throw new NotFoundError('User');

  return toPublicUser(user);
}

// ── Email verification ────────────────────────────────────────────────────────

async function sendVerificationCode(user: { email: string; username: string }): Promise<void> {
  const code = generateCode();
  const redis = getRedis();
  await redis.setex(codeKey.verify(user.email), CODE_TTL, JSON.stringify({ code, attempts: 0 }));
  const tpl = verificationEmailTemplate({ username: user.username, code });
  await sendMail({ to: user.email, ...tpl });
}

export async function verifyEmail(email: string, code: string): Promise<void> {
  const redis = getRedis();
  const key = codeKey.verify(email);
  const raw = await redis.get(key);

  if (!raw) {
    throw new ValidationError('El código expiró o no es válido. Solicita uno nuevo.', 'CODE_EXPIRED');
  }

  const stored = JSON.parse(raw) as { code: string; attempts: number };

  if (stored.attempts >= MAX_CODE_ATTEMPTS) {
    await redis.del(key);
    throw new ValidationError('Demasiados intentos. Solicita un nuevo código.', 'TOO_MANY_ATTEMPTS');
  }

  if (code !== stored.code) {
    const ttl = await redis.ttl(key);
    await redis.setex(key, ttl > 0 ? ttl : 1, JSON.stringify({ ...stored, attempts: stored.attempts + 1 }));
    throw new ValidationError(`Código incorrecto. Te quedan ${MAX_CODE_ATTEMPTS - stored.attempts - 1} intento(s).`, 'INVALID_CODE');
  }

  await redis.del(key);
  await db.update(users).set({ emailVerified: true }).where(eq(users.email, email));
}

export async function resendVerificationEmail(email: string): Promise<void> {
  const redis = getRedis();
  const cooldownKey = codeKey.resend(email);

  if (await redis.exists(cooldownKey)) {
    throw new RateLimitError('Espera un minuto antes de solicitar otro código.', 'RESEND_COOLDOWN');
  }

  const [user] = await db
    .select({ email: users.email, username: users.username, emailVerified: users.emailVerified })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Silencioso: no revelar si el email existe o ya está verificado
  if (!user || user.emailVerified) return;

  await redis.setex(cooldownKey, RESEND_COOLDOWN, '1');
  await sendVerificationCode({ email: user.email, username: user.username });
}

// ── Password reset ────────────────────────────────────────────────────────────

export async function forgotPassword(email: string): Promise<void> {
  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Siempre responder con éxito — no revelar si el email está registrado
  if (!user) return;

  const code = generateCode();
  const redis = getRedis();
  await redis.setex(codeKey.reset(email), CODE_TTL, JSON.stringify({ code, attempts: 0 }));

  const tpl = passwordResetEmailTemplate({ code });
  await sendMail({ to: user.email, ...tpl });
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
  const redis = getRedis();
  const key = codeKey.reset(email);
  const raw = await redis.get(key);

  if (!raw) {
    throw new ValidationError('El código expiró o no es válido.', 'CODE_EXPIRED');
  }

  const stored = JSON.parse(raw) as { code: string; attempts: number };

  if (stored.attempts >= MAX_CODE_ATTEMPTS) {
    await redis.del(key);
    throw new ValidationError('Demasiados intentos. Solicita un nuevo código.', 'TOO_MANY_ATTEMPTS');
  }

  if (code !== stored.code) {
    const ttl = await redis.ttl(key);
    await redis.setex(key, ttl > 0 ? ttl : 1, JSON.stringify({ ...stored, attempts: stored.attempts + 1 }));
    throw new ValidationError(`Código incorrecto. Te quedan ${MAX_CODE_ATTEMPTS - stored.attempts - 1} intento(s).`, 'INVALID_CODE');
  }

  await redis.del(key);

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await db.update(users).set({ passwordHash }).where(eq(users.email, email));
}

export async function loginWithGoogle(
  googleProfile: { email: string; name: string; picture?: string },
  jwt: JwtSigner,
  meta: { userAgent?: string; ipAddress?: string },
): Promise<AuthResponse & { isNewUser: boolean }> {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, googleProfile.email))
    .limit(1);

  const isNewUser = !existing;
  let user = existing;

  if (!user) {
    const base = googleProfile.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 14) || 'user';

    const suffix = randomBytes(3).toString('hex'); // 6 hex chars — virtually no collisions
    const username = `${base}_${suffix}`;

    // Placeholder hash — not a valid bcrypt hash, can never log in via password
    const passwordHash = `__oauth_google_${randomBytes(16).toString('hex')}`;

    const [newUser] = await db
      .insert(users)
      .values({
        email: googleProfile.email,
        username,
        passwordHash,
        role: 'student',
        avatarUrl: googleProfile.picture ?? null,
        emailVerified: true,
      })
      .returning();

    if (!newUser) throw new Error('Failed to create OAuth user');
    user = newUser;
  }

  if (!user.isActive) throw new InvalidCredentialsError();

  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
  const refreshToken = generateRefreshToken();
  const tokenHash = hashToken(refreshToken);

  const [newSession] = await db
    .insert(sessions)
    .values({
      userId: user.id,
      tokenHash,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt,
    })
    .returning({ id: sessions.id });

  if (!newSession) throw new Error('Failed to create session');

  await setJson(
    CacheKeys.session(tokenHash),
    { userId: user.id, sessionId: newSession.id },
    CacheTTL.session,
  );

  const accessPayload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    sessionId: newSession.id,
    type: 'access',
  };

  const accessToken = jwt.sign(accessPayload, { expiresIn: '15m' });

  return {
    user: toPublicUser(user),
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    },
    isNewUser,
  };
}

export async function refresh(
  refreshToken: string,
  jwt: JwtSigner,
  meta: { userAgent?: string; ipAddress?: string },
): Promise<AuthResponse> {
  const tokenHash = hashToken(refreshToken);

  // 1. Buscar sesión válida por token hash
  const [session] = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!session) {
    // Token inválido, expirado o revocado
    // Si alguien reutiliza un refresh token viejo, podría ser un token robado
    // En ese caso, revocar todas las sesiones del usuario sería lo ideal.
    // Para el MVP, lanzamos error genérico.
    throw new UnauthorizedError('Invalid or expired refresh token', 'TOKEN_INVALID');
  }

  // 2. Obtener usuario
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, session.userId), eq(users.isActive, true)))
    .limit(1);

  if (!user) {
    throw new UnauthorizedError('User account is inactive', 'ACCOUNT_INACTIVE');
  }

  // 3. Refresh token rotation: revocar el token actual, emitir uno nuevo
  // Todo en una transacción para evitar que el token viejo quede válido si algo falla
  const newRefreshToken = generateRefreshToken();
  const newTokenHash = hashToken(newRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

  await db.transaction(async (tx) => {
    // Revocar sesión vieja
    await tx
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.id, session.id));

    // Crear nueva sesión
    await tx.insert(sessions).values({
      userId: user.id,
      tokenHash: newTokenHash,
      userAgent: meta.userAgent ?? session.userAgent,
      ipAddress: meta.ipAddress ?? session.ipAddress,
      expiresAt,
    });
  });

  // 4. Actualizar Redis: eliminar token viejo, cachear el nuevo
  const redis = getRedis();
  await Promise.all([
    del(CacheKeys.session(tokenHash)),
    setJson(
      CacheKeys.session(newTokenHash),
      { userId: user.id, sessionId: session.id },
      CacheTTL.session,
    ),
    // Marcar sesión vieja como revocada para el authGuard
    redis.setex(`session:revoked:${session.id}`, ACCESS_TOKEN_TTL_SECONDS, '1'),
  ]);

  // 5. Emitir nuevo access token con nueva sessionId
  // (La sesión nueva se creó pero necesitamos su ID)
  const [newSession] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.tokenHash, newTokenHash))
    .limit(1);

  if (!newSession) throw new Error('Failed to retrieve new session');

  const accessPayload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    sessionId: newSession.id,
    type: 'access',
  };

  const accessToken = jwt.sign(accessPayload, { expiresIn: '15m' });

  return {
    user: toPublicUser(user),
    tokens: {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    },
  };
}
