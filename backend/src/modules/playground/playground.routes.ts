import type { FastifyInstance } from 'fastify';
import { authGuard } from '../../shared/middleware/auth.guard.js';
import { validateQueryHandler } from './playground.controller.js';

/**
 * Plugin de rutas del módulo playground.
 *
 * Solo expone un endpoint: POST /playground/validate.
 * El rate limiting real (60 queries/min por usuario) se implementa dentro
 * del playground.service con Redis — el rate limit aquí es un backup
 * a nivel de IP para protección adicional contra abuso.
 */
export async function playgroundRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /playground/validate
  fastify.post(
    '/playground/validate',
    {
      preHandler: [authGuard],
      config: {
        rateLimit: {
          max: 120,
          timeWindow: '1 minute',
        },
      },
      schema: {
        tags: ['playground'],
        summary: 'Validar query SQL',
        description:
          'Ejecuta la query del estudiante en un entorno SQLite aislado y la compara ' +
          'contra el resultado esperado del ejercicio. Rate limit: 60 queries/min por usuario.',
        security: [{ BearerAuth: [] }],
        body: {
          type: 'object',
          required: ['exercise_id', 'query'],
          properties: {
            exercise_id: {
              type: 'string',
              format: 'uuid',
              description: 'ID del ejercicio a validar',
            },
            query: {
              type: 'string',
              minLength: 1,
              maxLength: 10000,
              description: 'Query SQL del estudiante',
            },
          },
        },
        response: {
          200: {
            description: 'Resultado de la validación',
            type: 'object',
            properties: {
              valid: { type: 'boolean', description: 'true si la query es correcta' },
              hint: { type: 'string', description: 'Pista si la query es incorrecta' },
              hint_level: { type: 'number', description: 'Nivel de la pista (1-3)' },
              xp_earned: { type: 'number', description: 'XP ganado si es correcto' },
              execution_ms: { type: 'number', description: 'Tiempo de ejecución en ms' },
              row_count_got: { type: 'number' },
              row_count_expected: { type: 'number' },
              error_type: {
                type: 'string',
                enum: ['execution_error', 'timeout', 'rate_limit'],
                description: 'Tipo de error si la ejecución falló',
              },
            },
          },
          401: { description: 'No autenticado', type: 'object' },
          429: { description: 'Rate limit del playground superado', type: 'object' },
          503: { description: 'Worker pool al límite de capacidad (cola llena)', type: 'object' },
        },
      },
    },
    validateQueryHandler,
  );
}
