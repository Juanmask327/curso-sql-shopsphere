import type { FastifyInstance } from 'fastify';
import { authGuard, adminGuard } from '../../shared/middleware/auth.guard.js';
import {
  getDashboardHandler,
  getUserExercisesHandler,
  updateProfileHandler,
  getPublicProfileHandler,
  adminListUsersHandler,
  adminChangeRoleHandler,
  adminDeactivateUserHandler,
} from './users.controller.js';

/**
 * Plugin de rutas del módulo users.
 */
export async function usersRoutes(fastify: FastifyInstance): Promise<void> {
  // ── Student routes ──────────────────────────────────────────────────────────

  // GET /users/me/dashboard
  fastify.get(
    '/users/me/dashboard',
    {
      preHandler: [authGuard],
      schema: {
        tags: ['users'],
        summary: 'Dashboard del estudiante',
        description:
          'Retorna el resumen completo del progreso: nivel actual, XP, ' +
          'ejercicios completados, actividad reciente y completado por nivel.',
        security: [{ BearerAuth: [] }],
        response: {
          200: {
            description: 'Dashboard del estudiante',
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  username: { type: 'string' },
                  email: { type: 'string' },
                  avatar_url: { type: ['string', 'null'] },
                  xp_total: { type: 'number' },
                  current_level: { type: 'number' },
                },
              },
              level_progress: {
                type: 'object',
                properties: {
                  current_level: {
                    type: 'object',
                    properties: {
                      id: { type: 'number' },
                      name: { type: 'string' },
                      xp_required: { type: 'number' },
                    },
                  },
                  next_level: {
                    type: ['object', 'null'],
                    properties: {
                      id: { type: 'number' },
                      name: { type: 'string' },
                      xp_required: { type: 'number' },
                    },
                  },
                  xp_in_current_level: { type: 'number' },
                  xp_to_next_level: { type: ['number', 'null'] },
                  progress_pct: { type: 'number' },
                },
              },
              stats: {
                type: 'object',
                properties: {
                  exercises_completed: { type: 'number' },
                  exercises_attempted: { type: 'number' },
                  total_attempts: { type: 'number' },
                  avg_attempts_per_exercise: { type: 'number' },
                  hints_used_total: { type: 'number' },
                  completion_rate_pct: { type: 'number' },
                },
              },
              recent_activity: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    exercise_id: { type: 'string' },
                    exercise_title: { type: 'string' },
                    level_id: { type: 'number' },
                    status: { type: 'string' },
                    xp_earned: { type: 'number' },
                    completed_at: { type: ['string', 'null'] },
                    last_attempt_at: { type: ['string', 'null'] },
                  },
                },
              },
              level_completion: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    level_id: { type: 'number' },
                    level_name: { type: 'string' },
                    exercises_total: { type: 'number' },
                    exercises_completed: { type: 'number' },
                    completion_pct: { type: 'number' },
                  },
                },
              },
            },
          },
          401: { description: 'No autenticado', type: 'object' },
        },
      },
    },
    getDashboardHandler,
  );

  // GET /users/me/exercises
  fastify.get(
    '/users/me/exercises',
    {
      preHandler: [authGuard],
      schema: {
        tags: ['users'],
        summary: 'Ejercicios del usuario con progreso',
        description:
          'Lista todos los ejercicios publicados con el progreso del usuario. ' +
          'Filtrable por status y level_id.',
        security: [{ BearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['completed', 'in_progress', 'not_started'],
              description: 'Filtrar por estado de progreso',
            },
            level_id: { type: 'integer', minimum: 0, description: 'Filtrar por nivel' },
          },
        },
        response: {
          200: {
            description: 'Lista de ejercicios con progreso',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                exercise_id: { type: 'string', format: 'uuid' },
                exercise_title: { type: 'string' },
                level_id: { type: 'number' },
                level_name: { type: 'string' },
                difficulty: { type: 'string' },
                xp_reward: { type: 'number' },
                status: { type: 'string', enum: ['not_started', 'in_progress', 'completed'] },
                attempts_count: { type: 'number' },
                hints_used: { type: 'number' },
                xp_earned: { type: 'number' },
                completed_at: { type: ['string', 'null'] },
              },
            },
          },
        },
      },
    },
    getUserExercisesHandler,
  );

  // PATCH /users/me/profile
  fastify.patch(
    '/users/me/profile',
    {
      preHandler: [authGuard],
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
      schema: {
        tags: ['users'],
        summary: 'Actualizar perfil',
        description: 'Actualiza username y/o avatar_url del usuario autenticado.',
        security: [{ BearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              minLength: 3,
              maxLength: 30,
              pattern: '^[a-zA-Z0-9_-]+$',
            },
            avatar_url: {
              type: ['string', 'null'],
              maxLength: 500,
            },
          },
        },
        response: {
          200: {
            description: 'Perfil actualizado',
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              username: { type: 'string' },
              avatar_url: { type: ['string', 'null'] },
            },
          },
          409: { description: 'Username ya en uso', type: 'object' },
        },
      },
    },
    updateProfileHandler,
  );

  // ── Public routes ───────────────────────────────────────────────────────────

  // GET /users/:username/public
  fastify.get(
    '/users/:username/public',
    {
      schema: {
        tags: ['users'],
        summary: 'Perfil público de un usuario',
        description:
          'Retorna el perfil público de un usuario por username. ' +
          'Solo visible si el usuario está activo.',
        params: {
          type: 'object',
          required: ['username'],
          properties: {
            username: { type: 'string' },
          },
        },
        response: {
          200: {
            description: 'Perfil público',
            type: 'object',
            properties: {
              username: { type: 'string' },
              avatar_url: { type: ['string', 'null'] },
              xp_total: { type: 'number' },
              current_level: { type: 'number' },
              exercises_completed: { type: 'number' },
              certificates: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    uid: { type: 'string' },
                    level_name: { type: 'string' },
                    issued_at: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          404: { description: 'Usuario no encontrado', type: 'object' },
        },
      },
    },
    getPublicProfileHandler,
  );

  // ── Admin routes ────────────────────────────────────────────────────────────

  // GET /admin/users
  fastify.get(
    '/admin/users',
    {
      preHandler: [authGuard, adminGuard],
      schema: {
        tags: ['users'],
        summary: '[Admin] Listar usuarios',
        description: 'Lista usuarios con búsqueda y paginación. Solo admin.',
        security: [{ BearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Buscar por username o email' },
            role: { type: 'string', enum: ['student', 'admin', 'instructor'] },
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        },
        response: {
          200: {
            description: 'Lista de usuarios paginada',
            type: 'object',
            properties: {
              data: { type: 'array', items: { type: 'object' } },
              pagination: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                  page: { type: 'number' },
                  limit: { type: 'number' },
                  total_pages: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    adminListUsersHandler,
  );

  // PATCH /admin/users/:id/role
  fastify.patch(
    '/admin/users/:id/role',
    {
      preHandler: [authGuard, adminGuard],
      schema: {
        tags: ['users'],
        summary: '[Admin] Cambiar rol de usuario',
        security: [{ BearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['role'],
          properties: {
            role: { type: 'string', enum: ['student', 'admin', 'instructor'] },
          },
        },
        response: {
          200: { description: 'Rol actualizado', type: 'object' },
        },
      },
    },
    adminChangeRoleHandler,
  );

  // PATCH /admin/users/:id/deactivate
  fastify.patch(
    '/admin/users/:id/deactivate',
    {
      preHandler: [authGuard, adminGuard],
      schema: {
        tags: ['users'],
        summary: '[Admin] Desactivar usuario',
        description: 'Soft-delete: desactiva la cuenta sin borrar datos.',
        security: [{ BearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Usuario desactivado',
            type: 'object',
            properties: {
              deactivated: { type: 'boolean' },
            },
          },
        },
      },
    },
    adminDeactivateUserHandler,
  );
}
