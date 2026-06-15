import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  registerHandler,
  loginHandler,
  logoutHandler,
  getMeHandler,
  refreshHandler,
  verifyEmailHandler,
  resendVerificationHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  googleOAuthRedirectHandler,
  googleOAuthCallbackHandler,
} from './auth.controller.js';
import { authGuard } from '../../shared/middleware/auth.guard.js';

/**
 * Plugin de rutas del módulo auth.
 * Todas las rutas bajo el prefijo /auth (configurado en app.ts).
 *
 * Rate limiting en login: 5 intentos por IP cada 15 minutos.
 */
export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /auth/register
  fastify.post(
    '/register',
    {
      config: {
        rateLimit: process.env['NODE_ENV'] === 'test' ? false : {
          max: 10,
          timeWindow: '1 hour',
        },
      },
      schema: {
        tags: ['auth'],
        summary: 'Registrar nueva cuenta',
        description: 'Crea una cuenta nueva y retorna tokens de autenticación.',
        body: {
          type: 'object',
          required: ['email', 'username', 'password'],
          properties: {
            email: { type: 'string', format: 'email', maxLength: 255 },
            username: { type: 'string', minLength: 3, maxLength: 30, pattern: '^[a-zA-Z0-9_-]+$' },
            password: { type: 'string', minLength: 8, maxLength: 128 },
          },
        },
        response: {
          201: {
            description: 'Cuenta creada exitosamente',
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  email: { type: 'string', format: 'email' },
                  username: { type: 'string' },
                  role: { type: 'string', enum: ['student', 'admin', 'instructor'] },
                  xpTotal: { type: 'number' },
                  currentLevel: { type: 'number' },
                  avatarUrl: { type: ['string', 'null'] },
                  isActive: { type: 'boolean' },
                  emailVerified: { type: 'boolean' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
              tokens: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                  expiresIn: { type: 'number', description: 'Segundos hasta expiración del access token' },
                },
              },
            },
          },
          409: {
            description: 'Email o username ya registrado',
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              code: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    registerHandler,
  );

  // POST /auth/login
  fastify.post(
    '/login',
    {
      config: {
        rateLimit: {
          max: (request: FastifyRequest) => {
            if (process.env['NODE_ENV'] === 'test') {
              const ip = request.headers['x-forwarded-for'];
              if (ip === '10.0.1.42') {
                return 5;
              }
              return 1000;
            }
            return 5;
          },
          timeWindow: '15 minutes',
          errorResponseBuilder: () => ({
            statusCode: 429,
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many login attempts. Please try again in 15 minutes.',
          }),
        },
      },
      schema: {
        tags: ['auth'],
        summary: 'Iniciar sesión',
        description: 'Autentica al usuario y retorna access + refresh tokens.',
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 1 },
          },
        },
        response: {
          200: {
            description: 'Login exitoso',
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  email: { type: 'string', format: 'email' },
                  username: { type: 'string' },
                  role: { type: 'string', enum: ['student', 'admin', 'instructor'] },
                  xpTotal: { type: 'number' },
                  currentLevel: { type: 'number' },
                  avatarUrl: { type: ['string', 'null'] },
                  isActive: { type: 'boolean' },
                  emailVerified: { type: 'boolean' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
              tokens: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                  expiresIn: { type: 'number' },
                },
              },
            },
          },
          401: { description: 'Credenciales inválidas', type: 'object' },
        },
      },
    },
    loginHandler,
  );

  // POST /auth/logout
  fastify.post(
    '/logout',
    {
      preHandler: [authGuard],
      schema: {
        tags: ['auth'],
        summary: 'Cerrar sesión',
        description: 'Revoca la sesión activa. Requiere Bearer token.',
        security: [{ BearerAuth: [] }],
        response: {
          204: { description: 'Sesión cerrada exitosamente', type: 'null' },
          401: { description: 'No autenticado', type: 'object' },
        },
      },
    },
    logoutHandler,
  );

  // GET /auth/me
  fastify.get(
    '/me',
    {
      preHandler: [authGuard],
      schema: {
        tags: ['auth'],
        summary: 'Perfil del usuario autenticado',
        description: 'Retorna los datos del usuario identificado por el Bearer token.',
        security: [{ BearerAuth: [] }],
        response: {
          200: {
            description: 'Datos del usuario',
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              email: { type: 'string', format: 'email' },
              username: { type: 'string' },
              role: { type: 'string', enum: ['student', 'admin', 'instructor'] },
              xpTotal: { type: 'number' },
              currentLevel: { type: 'number' },
              avatarUrl: { type: ['string', 'null'] },
              isActive: { type: 'boolean' },
              emailVerified: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          401: { description: 'No autenticado', type: 'object' },
        },
      },
    },
    getMeHandler,
  );

  // POST /auth/verify-email
  fastify.post('/verify-email', {
    config: { rateLimit: process.env['NODE_ENV'] === 'test' ? false : { max: 10, timeWindow: '15 minutes' } },
    schema: {
      tags: ['auth'],
      summary: 'Verificar email con código',
      body: { type: 'object', required: ['email', 'code'], properties: { email: { type: 'string' }, code: { type: 'string' } } },
      response: { 204: { description: 'Email verificado', type: 'null' }, 400: { type: 'object' } },
    },
  }, verifyEmailHandler);

  // POST /auth/resend-verification
  fastify.post('/resend-verification', {
    config: { rateLimit: process.env['NODE_ENV'] === 'test' ? false : { max: 5, timeWindow: '15 minutes' } },
    schema: {
      tags: ['auth'],
      summary: 'Reenviar código de verificación',
      body: { type: 'object', required: ['email'], properties: { email: { type: 'string' } } },
      response: { 204: { description: 'Código reenviado (o email no encontrado — siempre 204)', type: 'null' } },
    },
  }, resendVerificationHandler);

  // POST /auth/forgot-password
  fastify.post('/forgot-password', {
    config: { rateLimit: process.env['NODE_ENV'] === 'test' ? false : { max: 5, timeWindow: '1 hour' } },
    schema: {
      tags: ['auth'],
      summary: 'Solicitar código de restablecimiento',
      body: { type: 'object', required: ['email'], properties: { email: { type: 'string' } } },
      response: { 204: { description: 'Siempre 204 — no revela si el email existe', type: 'null' } },
    },
  }, forgotPasswordHandler);

  // POST /auth/reset-password
  fastify.post('/reset-password', {
    config: { rateLimit: process.env['NODE_ENV'] === 'test' ? false : { max: 10, timeWindow: '15 minutes' } },
    schema: {
      tags: ['auth'],
      summary: 'Restablecer contraseña con código',
      body: {
        type: 'object',
        required: ['email', 'code', 'newPassword'],
        properties: { email: { type: 'string' }, code: { type: 'string' }, newPassword: { type: 'string' } },
      },
      response: { 204: { description: 'Contraseña actualizada', type: 'null' }, 400: { type: 'object' } },
    },
  }, resetPasswordHandler);

  // GET /auth/oauth/google — redirige al consent screen de Google
  fastify.get(
    '/oauth/google',
    {
      schema: {
        tags: ['auth'],
        summary: 'Iniciar flujo OAuth con Google',
        description: 'Redirige al usuario al consent screen de Google.',
        response: {
          302: { description: 'Redirect a Google', type: 'null' },
          503: {
            description: 'OAuth no configurado',
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    googleOAuthRedirectHandler,
  );

  // GET /auth/oauth/google/callback — Google redirige aquí con el code
  fastify.get(
    '/oauth/google/callback',
    {
      schema: {
        tags: ['auth'],
        summary: 'Callback de Google OAuth',
        description: 'Intercambia el code por tokens, crea o recupera el usuario.',
        querystring: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            state: { type: 'string' },
            error: { type: 'string' },
          },
        },
        response: {
          302: { description: 'Redirect al frontend con tokens', type: 'null' },
        },
      },
    },
    googleOAuthCallbackHandler,
  );

  // POST /auth/refresh
  fastify.post(
    '/refresh',
    {
      config: {
        rateLimit: process.env['NODE_ENV'] === 'test' ? false : {
          max: 20,
          timeWindow: '15 minutes',
        },
      },
      schema: {
        tags: ['auth'],
        summary: 'Renovar tokens',
        description: 'Rota el refresh token y emite un nuevo par de tokens.',
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string', minLength: 1 },
          },
        },
        response: {
          200: {
            description: 'Tokens renovados',
            type: 'object',
            properties: {
              tokens: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                  expiresIn: { type: 'number' },
                },
              },
            },
          },
          401: { description: 'Refresh token inválido o expirado', type: 'object' },
        },
      },
    },
    refreshHandler,
  );
}
