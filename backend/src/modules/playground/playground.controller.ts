import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { validateQuery } from './playground.service.js';
import { ValidationError } from '../../shared/errors/index.js';
import { required } from '../../shared/validation/required.js';

// ── Schema de entrada ─────────────────────────────────────────────────────────

const ValidateQuerySchema = z.object({
  exercise_id: z.string(required('exercise_id is required')).uuid(
    'exercise_id must be a valid UUID',
  ),
  query: z
    .string(required('query is required'))
    .min(1, 'query cannot be empty')
    .max(10_000, 'query must be at most 10,000 characters'),
});

// ── Handler ───────────────────────────────────────────────────────────────────

export async function validateQueryHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const parsed = ValidateQuerySchema.safeParse(request.body);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues[0]?.message ?? 'Invalid request body',
    );
  }

  const userId = request.user.sub;

  // Obtener el Worker pool del decorador de Fastify (tipado via module augmentation)
  if (!request.server.workerPool) {
    throw new Error('Worker pool not initialized');
  }

  const result = await validateQuery(parsed.data, userId, request.server.workerPool);

  // HTTP 200 tanto para valid=true como valid=false — el estado 2xx indica
  // que el endpoint procesó correctamente, no que la query sea correcta.
  return reply.status(200).send(result);
}
