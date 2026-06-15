import type { FastifyInstance } from 'fastify';
import { authGuard } from '../../shared/middleware/auth.guard.js';
import {
  listLevelsHandler,
  getLevelDetailHandler,
  getLevelLeaderboardHandler,
} from './levels.controller.js';

/**
 * Plugin de rutas del módulo levels.
 *
 * GET /levels              — público
 * GET /levels/:id          — público, con progreso opcional si hay token JWT
 * GET /levels/:id/leaderboard — público
 */
export async function levelsRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /levels
  fastify.get(
    '/levels',
    {
      schema: {
        tags: ['levels'],
        summary: 'Listar niveles del curso',
        description: 'Retorna todos los niveles publicados del curso en orden.',
        response: {
          200: {
            description: 'Lista de niveles',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                name: { type: 'string' },
                description: { type: 'string' },
                xp_required: { type: 'number' },
                order_index: { type: 'number' },
                exercises_count: { type: 'number' },
              },
            },
          },
        },
      },
    },
    listLevelsHandler,
  );

  // GET /levels/:id
  fastify.get(
    '/levels/:id',
    {
      preHandler: [optionalAuthGuard],
      schema: {
        tags: ['levels'],
        summary: 'Detalle de un nivel',
        description:
          'Retorna el detalle del nivel. Si se envía Bearer token válido, ' +
          'incluye el progreso del usuario autenticado.',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'integer', minimum: 0 },
          },
        },
        response: {
          200: {
            description: 'Detalle del nivel',
            type: 'object',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              description: { type: 'string' },
              xp_required: { type: 'number' },
              exercises: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    difficulty: { type: 'string' },
                    xp_reward: { type: 'number' },
                    order_index: { type: 'number' },
                    progress: {
                      type: ['object', 'null'],
                      properties: {
                        status: { type: 'string' },
                        completed_at: { type: ['string', 'null'] },
                      },
                    },
                  },
                },
              },
              lessons: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    order_index: { type: 'number' },
                    title: { type: 'string' },
                    content: { type: 'string' },
                  },
                },
              },
              level_intro: { type: 'string' },
              project_content: { type: 'string' },
              user_progress: {
                type: ['object', 'null'],
                description: 'Progreso del usuario (null si no autenticado)',
                properties: {
                  completion_pct: { type: 'number' },
                  exercises_completed: { type: 'number' },
                  exercises_total: { type: 'number' },
                },
              },
            },
          },
          404: { description: 'Nivel no encontrado', type: 'object' },
        },
      },
    },
    getLevelDetailHandler,
  );

  // GET /levels/:id/leaderboard
  fastify.get(
    '/levels/:id/leaderboard',
    {
      schema: {
        tags: ['levels'],
        summary: 'Leaderboard de un nivel',
        description:
          'Top 10 usuarios con más XP en el nivel, ordenados de mayor a menor.',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'integer', minimum: 0 },
          },
        },
        response: {
          200: {
            description: 'Leaderboard',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                rank: { type: 'number' },
                username: { type: 'string' },
                avatar_url: { type: ['string', 'null'] },
                xp_earned: { type: 'number' },
                completed_at: { type: ['string', 'null'] },
              },
            },
          },
        },
      },
    },
    getLevelLeaderboardHandler,
  );
}

/**
 * Guard de auth opcional.
 * Intenta verificar el JWT pero NO lanza si:
 * - No hay header Authorization
 * - El token es inválido o expirado
 */
async function optionalAuthGuard(
  request: Parameters<typeof authGuard>[0],
  reply: Parameters<typeof authGuard>[1],
): Promise<void> {
  const authHeader = request.headers['authorization'];

  if (!authHeader?.startsWith('Bearer ')) return;

  try {
    await authGuard(request, reply);
  } catch {
    // Token inválido/expirado — continuar como anónimo
  }
}
