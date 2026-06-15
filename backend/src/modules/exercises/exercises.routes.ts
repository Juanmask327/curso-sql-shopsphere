import type { FastifyInstance } from 'fastify';
import { authGuard, adminGuard } from '../../shared/middleware/auth.guard.js';
import {
  listExercisesHandler,
  getExerciseHandler,
  requestHintHandler,
  getProgressHandler,
  saveDraftHandler,
  createExerciseHandler,
  updateExerciseHandler,
  togglePublishHandler,
} from './exercises.controller.js';

/**
 * Plugin de rutas del módulo exercises.
 * Rutas de estudiante bajo /exercises, rutas de admin bajo /admin/exercises.
 */
export async function exercisesRoutes(fastify: FastifyInstance): Promise<void> {
  // ── Student routes ──────────────────────────────────────────────────────────

  // GET /exercises
  fastify.get(
    '/exercises',
    {
      preHandler: [authGuard],
      schema: {
        tags: ['exercises'],
        summary: 'Listar ejercicios',
        description: 'Retorna ejercicios publicados. Filtrable por level_id y difficulty.',
        security: [{ BearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            level_id: { type: 'integer', minimum: 0, description: 'Filtrar por nivel' },
            difficulty: {
              type: 'string',
              enum: ['easy', 'medium', 'hard'],
              description: 'Filtrar por dificultad',
            },
          },
        },
        response: {
          200: {
            description: 'Lista de ejercicios',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                level_id: { type: 'number' },
                title: { type: 'string' },
                description: { type: 'string' },
                difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
                xp_reward: { type: 'number' },
                order_index: { type: 'number' },
                is_published: { type: 'boolean' },
              },
            },
          },
          401: { description: 'No autenticado', type: 'object' },
        },
      },
    },
    listExercisesHandler,
  );

  // GET /exercises/:id
  fastify.get(
    '/exercises/:id',
    {
      preHandler: [authGuard],
      schema: {
        tags: ['exercises'],
        summary: 'Detalle de un ejercicio',
        description: 'Retorna el ejercicio con el progreso del usuario autenticado.',
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
            description: 'Detalle del ejercicio con progreso',
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              level_id: { type: 'number' },
              title: { type: 'string' },
              description: { type: 'string' },
              instructions: { type: 'string' },
              difficulty: { type: 'string' },
              xp_reward: { type: 'number' },
              order_index: { type: 'number' },
              hints: { type: 'array', items: { type: 'string' } },
              progress: {
                type: ['object', 'null'],
                properties: {
                  status: { type: 'string', enum: ['not_started', 'in_progress', 'completed'] },
                  attempts_count: { type: 'number' },
                  hints_used: { type: 'number' },
                  xp_earned: { type: 'number' },
                  last_query: { type: ['string', 'null'] },
                  completed_at: { type: ['string', 'null'] },
                },
              },
            },
          },
          404: { description: 'Ejercicio no encontrado', type: 'object' },
        },
      },
    },
    getExerciseHandler,
  );

  // POST /exercises/:id/hint
  fastify.post(
    '/exercises/:id/hint',
    {
      preHandler: [authGuard],
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
        },
      },
      schema: {
        tags: ['exercises'],
        summary: 'Solicitar hint',
        description: 'Avanza al siguiente hint disponible para el ejercicio.',
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
            description: 'Hint actual',
            type: 'object',
            properties: {
              hint: { type: 'string' },
              hint_index: { type: 'number' },
              hints_remaining: { type: 'number' },
            },
          },
          404: { description: 'Ejercicio no encontrado', type: 'object' },
        },
      },
    },
    requestHintHandler,
  );

  // GET /exercises/:id/progress
  fastify.get(
    '/exercises/:id/progress',
    {
      preHandler: [authGuard],
      schema: {
        tags: ['exercises'],
        summary: 'Progreso en un ejercicio',
        description: 'Retorna el progreso detallado del usuario en el ejercicio.',
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
            description: 'Progreso del ejercicio',
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['not_started', 'in_progress', 'completed'] },
              attempts_count: { type: 'number' },
              hints_used: { type: 'number' },
              xp_earned: { type: 'number' },
              last_query: { type: ['string', 'null'] },
              completed_at: { type: ['string', 'null'] },
              first_attempt_at: { type: ['string', 'null'] },
            },
          },
        },
      },
    },
    getProgressHandler,
  );

  // PATCH /exercises/:id/save-draft
  fastify.patch(
    '/exercises/:id/save-draft',
    {
      preHandler: [authGuard],
      config: {
        rateLimit: {
          max: 60,
          timeWindow: '1 minute',
        },
      },
      schema: {
        tags: ['exercises'],
        summary: 'Guardar borrador de query',
        description: 'Persiste la query del estudiante como borrador (auto-save).',
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
          required: ['query'],
          properties: {
            query: { type: 'string', maxLength: 10000 },
          },
        },
        response: {
          200: {
            description: 'Borrador guardado',
            type: 'object',
            properties: {
              saved: { type: 'boolean' },
            },
          },
        },
      },
    },
    saveDraftHandler,
  );

  // ── Admin routes ────────────────────────────────────────────────────────────

  // POST /admin/exercises
  fastify.post(
    '/admin/exercises',
    {
      preHandler: [authGuard, adminGuard],
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
      schema: {
        tags: ['exercises'],
        summary: '[Admin] Crear ejercicio',
        description: 'Crea un nuevo ejercicio. Solo admin/instructor.',
        security: [{ BearerAuth: [] }],
        body: {
          type: 'object',
          required: ['level_id', 'title', 'description', 'instructions', 'difficulty', 'reference_query', 'order_index'],
          properties: {
            level_id: { type: 'integer', minimum: 0, maximum: 10 },
            title: { type: 'string', minLength: 3, maxLength: 200 },
            description: { type: 'string', minLength: 10, maxLength: 2000 },
            instructions: { type: 'string', minLength: 10, maxLength: 5000 },
            difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
            xp_reward: { type: 'integer', minimum: 1, maximum: 1000, default: 10 },
            reference_query: { type: 'string', minLength: 5, maxLength: 10000 },
            hints: { type: 'array', items: { type: 'string' }, maxItems: 5 },
            order_index: { type: 'integer', minimum: 0 },
            validation_mode: {
              type: 'string',
              enum: ['exact_ordered', 'exact_unordered', 'schema_match'],
              default: 'exact_unordered',
            },
          },
        },
        response: {
          201: { description: 'Ejercicio creado', type: 'object' },
          403: { description: 'Sin permisos de admin', type: 'object' },
        },
      },
    },
    createExerciseHandler,
  );

  // PATCH /admin/exercises/:id
  fastify.patch(
    '/admin/exercises/:id',
    {
      preHandler: [authGuard, adminGuard],
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
        },
      },
      schema: {
        tags: ['exercises'],
        summary: '[Admin] Actualizar ejercicio',
        security: [{ BearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: { type: 'object' },
        response: {
          200: { description: 'Ejercicio actualizado', type: 'object' },
        },
      },
    },
    updateExerciseHandler,
  );

  // PATCH /admin/exercises/:id/publish
  fastify.patch(
    '/admin/exercises/:id/publish',
    {
      preHandler: [authGuard, adminGuard],
      schema: {
        tags: ['exercises'],
        summary: '[Admin] Publicar / despublicar ejercicio',
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
          required: ['is_published'],
          properties: {
            is_published: { type: 'boolean' },
          },
        },
        response: {
          200: { description: 'Estado actualizado', type: 'object' },
        },
      },
    },
    togglePublishHandler,
  );
}
