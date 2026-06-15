/**
 * Suite de integration tests — Módulo Auth
 *
 * Flujo cubierto: registro → login → /me → refresh → logout → token revocado
 *
 * Todos los tests usan la instancia real de Fastify con la DB y Redis de test.
 * Cada describe bloque asume la DB truncada y sembrada en beforeAll.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  buildTestApp,
  closeTestApp,
  truncateAllTables,
  seedMinimalData,
  createTestUser,
  clearRedisRateLimit,
} from './setup.js';

describe('Auth — Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
    await truncateAllTables();
    await seedMinimalData();
  });

  afterAll(async () => {
    await closeTestApp();
  });

  // ── Helpers locales ──────────────────────────────────────────────────────────

  const baseUser = {
    email: 'auth-suite@example.com',
    username: 'authsuite',
    password: 'SecurePass123!',
  };

  // ── Tests ────────────────────────────────────────────────────────────────────

  describe('POST /auth/register', () => {
    it('registro completo crea usuario y retorna tokens', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'newuser@example.com',
          username: 'newuser123',
          password: 'StrongPass456!',
        },
      });

      expect(res.statusCode).toBe(201);

      const body = res.json<{
        user: {
          id: string;
          email: string;
          username: string;
          role: string;
          xpTotal: number;
          currentLevel: number;
          isActive: boolean;
          emailVerified: boolean;
          createdAt: string;
        };
        tokens: {
          accessToken: string;
          refreshToken: string;
          expiresIn: number;
        };
      }>();

      // Verificar estructura del usuario
      expect(body.user).toBeDefined();
      expect(body.user.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(body.user.email).toBe('newuser@example.com');
      expect(body.user.username).toBe('newuser123');
      expect(body.user.role).toBe('student');
      expect(body.user.xpTotal).toBe(0);
      expect(body.user.currentLevel).toBe(0);
      expect(body.user.isActive).toBe(true);
      expect(body.user.emailVerified).toBe(false);
      expect(body.user.createdAt).toBeDefined();

      // Verificar que NO se expone password_hash
      expect(body.user).not.toHaveProperty('passwordHash');
      expect(body.user).not.toHaveProperty('password_hash');
      expect(body.user).not.toHaveProperty('password');

      // Verificar tokens
      expect(body.tokens.accessToken).toBeTruthy();
      expect(body.tokens.refreshToken).toBeTruthy();
      expect(body.tokens.expiresIn).toBeGreaterThan(0);
    });

    it('registro con email duplicado retorna 409', async () => {
      // Registrar usuario base
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: baseUser.email,
          username: baseUser.username,
          password: baseUser.password,
        },
      });

      // Intentar registrar con el mismo email
      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: baseUser.email,       // mismo email
          username: 'differentuser99', // diferente username
          password: baseUser.password,
        },
      });

      expect(res.statusCode).toBe(409);

      const body = res.json<{ code: string; message: string }>();
      expect(body.code).toBeDefined();
      // El mensaje puede variar pero el status es el indicador
    });
  });

  describe('POST /auth/login', () => {
    it('login con credenciales correctas retorna access y refresh token', async () => {
      // Asegurar que el usuario existe (puede haber sido creado en test anterior,
      // pero mejor crear uno dedicado para no depender del orden)
      const loginEmail = 'login-test@example.com';
      const loginUsername = 'logintest99';
      const loginPassword = 'LoginPass789!';

      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: loginEmail, username: loginUsername, password: loginPassword },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: loginEmail, password: loginPassword },
      });

      expect(res.statusCode).toBe(200);

      const body = res.json<{
        user: { id: string; email: string };
        tokens: { accessToken: string; refreshToken: string; expiresIn: number };
      }>();

      expect(body.user.email).toBe(loginEmail);
      expect(body.tokens.accessToken).toBeTruthy();
      expect(body.tokens.refreshToken).toBeTruthy();
      expect(typeof body.tokens.expiresIn).toBe('number');

      // Los tokens deben ser distintos entre sí (no el mismo string)
      expect(body.tokens.accessToken).not.toBe(body.tokens.refreshToken);
    });

    it('login con password incorrecta retorna 401 con el mismo mensaje que email no existe', async () => {
      const loginEmail = 'login-msg-test@example.com';

      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: loginEmail,
          username: 'loginmsgtest',
          password: 'CorrectPass123!',
        },
      });

      // Password incorrecta
      const resBadPass = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: loginEmail, password: 'WrongPassword!' },
      });

      // Email que no existe
      const resNoEmail = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'nonexistent@example.com', password: 'AnyPassword123!' },
      });

      expect(resBadPass.statusCode).toBe(401);
      expect(resNoEmail.statusCode).toBe(401);

      const bodyBadPass = resBadPass.json<{ message: string }>();
      const bodyNoEmail = resNoEmail.json<{ message: string }>();

      // Mismo mensaje — previene user enumeration
      expect(bodyBadPass.message).toBe(bodyNoEmail.message);
    });
  });

  describe('GET /auth/me', () => {
    it('GET /auth/me con token válido retorna usuario sin password_hash', async () => {
      const testUser = await createTestUser(app, {
        email: 'me-test@example.com',
        username: 'metest123',
      });

      const res = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: { Authorization: `Bearer ${testUser.accessToken}` },
      });

      expect(res.statusCode).toBe(200);

      const body = res.json<{
        id: string;
        email: string;
        username: string;
        role: string;
        xpTotal: number;
        currentLevel: number;
        isActive: boolean;
      }>();

      expect(body.id).toBe(testUser.id);
      expect(body.email).toBe(testUser.email);
      expect(body.username).toBe(testUser.username);
      expect(body.role).toBe('student');
      expect(body.xpTotal).toBe(0);
      expect(body.currentLevel).toBe(0);
      expect(body.isActive).toBe(true);

      // Nunca debe aparecer el hash
      expect(body).not.toHaveProperty('passwordHash');
      expect(body).not.toHaveProperty('password_hash');
    });

    it('GET /auth/me sin token retorna 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/auth/me',
        // Sin Authorization header
      });

      expect(res.statusCode).toBe(401);
    });

    it('GET /auth/me con token malformado retorna 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: { Authorization: 'Bearer not-a-valid-jwt' },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('POST /auth/refresh rota el refresh token', async () => {
      const testUser = await createTestUser(app, {
        email: 'refresh-test@example.com',
        username: 'refreshtest1',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: { refreshToken: testUser.refreshToken },
      });

      expect(res.statusCode).toBe(200);

      const body = res.json<{
        tokens: { accessToken: string; refreshToken: string; expiresIn: number };
      }>();

      expect(body.tokens.accessToken).toBeTruthy();
      expect(body.tokens.refreshToken).toBeTruthy();

      // Los nuevos tokens deben ser distintos a los originales (rotación)
      expect(body.tokens.accessToken).not.toBe(testUser.accessToken);
      expect(body.tokens.refreshToken).not.toBe(testUser.refreshToken);
    });

    it('el refresh token original queda inválido después de rotar', async () => {
      const testUser = await createTestUser(app, {
        email: 'refresh-once@example.com',
        username: 'refreshonce1',
      });

      // Primera rotación — exitosa
      await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: { refreshToken: testUser.refreshToken },
      });

      // Intentar usar el refresh token viejo de nuevo
      const resReuse = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: { refreshToken: testUser.refreshToken },
      });

      expect(resReuse.statusCode).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('POST /auth/logout revoca la sesión', async () => {
      const testUser = await createTestUser(app, {
        email: 'logout-test@example.com',
        username: 'logouttest1',
      });

      const resLogout = await app.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: { Authorization: `Bearer ${testUser.accessToken}` },
      });

      expect(resLogout.statusCode).toBe(204);
    });

    it('request con token revocado (después de logout) retorna 401', async () => {
      const testUser = await createTestUser(app, {
        email: 'revoked-test@example.com',
        username: 'revokedtest1',
      });

      // Hacer logout
      await app.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: { Authorization: `Bearer ${testUser.accessToken}` },
      });

      // Intentar usar el access token después del logout
      // Nota: los access tokens JWT son stateless, siguen siendo válidos hasta su expiración.
      // Lo que se revoca es la sesión (refresh token). El test verifica el refresh token.
      const resRefresh = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: { refreshToken: testUser.refreshToken },
      });

      // El refresh token ya no debe funcionar tras logout
      expect(resRefresh.statusCode).toBe(401);
    });
  });

  describe('Rate Limiting — POST /auth/login', () => {
    it('rate limit en /auth/login bloquea después de 5 intentos fallidos', async () => {
      // IP única para este test para no contaminar otros
      const testIp = '10.0.1.42';

      // Limpiar rate limit de Redis antes del test
      await clearRedisRateLimit(app);

      const loginPayload = { email: 'ratelimit@example.com', password: 'wrong' };

      // 5 intentos fallidos (el límite es 5 por 15 minutos)
      const attempts: number[] = [];
      for (let i = 0; i < 5; i++) {
        const res = await app.inject({
          method: 'POST',
          url: '/auth/login',
          headers: { 'X-Forwarded-For': testIp },
          payload: loginPayload,
        });
        attempts.push(res.statusCode);
      }

      // Los primeros 5 deben ser 401 (credenciales incorrectas)
      expect(attempts.every((code) => code === 401 || code === 429)).toBe(true);

      // El intento número 6 debe ser 429
      const resBlocked = await app.inject({
        method: 'POST',
        url: '/auth/login',
        headers: { 'X-Forwarded-For': testIp },
        payload: loginPayload,
      });

      expect(resBlocked.statusCode).toBe(429);

      const body = resBlocked.json<{ code: string }>();
      expect(body.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });
});
