import type { FastifyInstance } from 'fastify';
import { authGuard } from '../../shared/middleware/auth.guard.js';
import {
  getDiagnosticHandler,
  submitDiagnosticHandler,
  saveResultHandler,
} from './diagnostic.controller.js';

/**
 * Plugin de rutas del módulo diagnostic.
 *
 * GET  /diagnostic             — público (sin auth)
 * POST /diagnostic/submit      — público (sin auth); NO persiste resultados
 * POST /diagnostic/save-result — requiere auth; persiste con req.user.sub
 *
 * El diagnóstico es intencionalmente accesible sin cuenta para que los visitantes
 * puedan completarlo y luego registrarse con el nivel ya calculado.
 */
export async function diagnosticRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /diagnostic
  fastify.get(
    '/diagnostic',
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: '1 minute',
        },
      },
      schema: {
        tags: ['diagnostic'],
        summary: 'Obtener evaluación diagnóstica',
        description:
          'Retorna las 24 preguntas de la evaluación diagnóstica agrupadas en bloques. ' +
          'No requiere autenticación. Las respuestas correctas NO se incluyen.',
        response: {
          200: {
            description: 'Evaluación diagnóstica completa',
            type: 'object',
            properties: {
              total_questions: { type: 'number', example: 24 },
              estimated_minutes: {
                type: 'object',
                properties: {
                  min: { type: 'number', example: 15 },
                  max: { type: 'number', example: 20 },
                },
              },
              blocks: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', example: 'A' },
                    name: { type: 'string' },
                    levels: { type: 'array', items: { type: 'number' } },
                    questions: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'number' },
                          level: { type: 'number' },
                          weight: { type: 'number' },
                          format: { type: 'string', enum: ['multiple_choice', 'mini_editor'] },
                          text: { type: 'string' },
                          options: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                id: { type: 'string' },
                                text: { type: 'string' },
                              },
                            },
                          },
                          schema_hint: {
                            type: 'string',
                            description: 'Solo para mini_editor — información del schema disponible',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    getDiagnosticHandler,
  );

  // POST /diagnostic/submit
  fastify.post(
    '/diagnostic/submit',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
        },
      },
      schema: {
        tags: ['diagnostic'],
        summary: 'Evaluar respuestas del diagnóstico',
        description:
          'Evalúa las respuestas del estudiante y retorna el nivel de entrada recomendado. ' +
          'No requiere autenticación. Para guardar el resultado en el perfil usar ' +
          'POST /diagnostic/save-result (requiere Bearer token).',
        querystring: {
          type: 'object',
          properties: {
            show_details: {
              type: 'boolean',
              description: 'Si true, incluye detalle por pregunta en la respuesta',
            },
          },
        },
        body: {
          type: 'object',
          required: ['answers'],
          properties: {
            answers: {
              type: 'array',
              minItems: 1,
              maxItems: 24,
              items: {
                type: 'object',
                required: ['question_id', 'answer'],
                properties: {
                  question_id: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 24,
                    description: 'ID de la pregunta (1-24)',
                  },
                  answer: {
                    type: ['string', 'null'],
                    description: 'ID de opción (A/B/C/D) para multiple_choice, query SQL para mini_editor, null para omitida',
                  },
                },
              },
            },
          },
        },
        response: {
          200: {
            description: 'Resultado del diagnóstico con nivel recomendado',
            type: 'object',
            properties: {
              recommended_level: {
                type: 'number',
                minimum: 0,
                maximum: 9,
                description: 'Nivel de entrada recomendado (0-8, 9 = Capstone)',
              },
              recommended_level_name: { type: 'string' },
              message: { type: 'string', description: 'Mensaje personalizado según el nivel' },
              score_by_level: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    level: { type: 'number' },
                    score_pct: { type: 'number', description: 'Porcentaje de acierto (0-100)' },
                  },
                },
              },
              can_skip_to: {
                type: 'array',
                items: { type: 'number' },
                description: 'Niveles que el estudiante puede saltar directamente',
              },
              details: {
                type: 'array',
                description: 'Solo si ?show_details=true',
                items: {
                  type: 'object',
                  properties: {
                    question_id: { type: 'number' },
                    correct: { type: 'boolean' },
                    points_earned: { type: 'number' },
                    points_possible: { type: 'number' },
                  },
                },
              },
            },
          },
          400: { description: 'IDs de preguntas inválidos', type: 'object' },
          429: { description: 'Demasiadas evaluaciones en poco tiempo', type: 'object' },
        },
      },
    },
    submitDiagnosticHandler,
  );

  // POST /diagnostic/save-result
  fastify.post(
    '/diagnostic/save-result',
    {
      preHandler: [authGuard],
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
      schema: {
        tags: ['diagnostic'],
        summary: 'Guardar resultado del diagnóstico',
        description:
          'Guarda el resultado del diagnóstico en el perfil del usuario autenticado. ' +
          'Actualiza current_level si el nivel recomendado es mayor al actual.',
        security: [{ BearerAuth: [] }],
        body: {
          type: 'object',
          required: ['recommended_level', 'score_by_level'],
          properties: {
            recommended_level: { type: 'integer', minimum: 0, maximum: 9 },
            score_by_level: {
              type: 'array',
              items: {
                type: 'object',
                required: ['level', 'score_pct'],
                properties: {
                  level: { type: 'integer', minimum: 0, maximum: 8 },
                  score_pct: { type: 'number', minimum: 0, maximum: 100 },
                },
              },
            },
          },
        },
        response: {
          200: {
            description: 'Resultado guardado',
            type: 'object',
            properties: {
              saved: { type: 'boolean' },
              level_updated: {
                type: 'boolean',
                description: 'true si el current_level del usuario fue actualizado',
              },
            },
          },
          401: { description: 'No autenticado', type: 'object' },
        },
      },
    },
    saveResultHandler,
  );
}
