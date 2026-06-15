import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  SubmitDiagnosticSchema,
  SaveResultSchema,
  SubmitQuerySchema,
} from './diagnostic.schemas.js';
import * as diagnosticService from './diagnostic.service.js';
import { ValidationError } from '../../shared/errors/index.js';

/**
 * GET /diagnostic
 * Retorna la evaluación completa. Sin auth — cualquier visitante puede verla.
 */
export async function getDiagnosticHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const diagnostic = diagnosticService.getDiagnostic();
  return reply.status(200).send(diagnostic);
}

/**
 * POST /diagnostic/submit
 * Evalúa las respuestas y retorna el nivel recomendado.
 * Sin auth — puede hacerse antes de crear cuenta.
 */
export async function submitDiagnosticHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const parsedBody = SubmitDiagnosticSchema.safeParse(request.body);
  if (!parsedBody.success) {
    throw new ValidationError(
      parsedBody.error.errors[0]?.message ?? 'Invalid input',
    );
  }

  const parsedQuery = SubmitQuerySchema.safeParse(request.query);
  const showDetails = parsedQuery.success ? parsedQuery.data.show_details : false;

  const result = await diagnosticService.submitDiagnostic(
    parsedBody.data,
    showDetails,
    request.server.workerPool,
  );

  return reply.status(200).send(result);
}

/**
 * POST /diagnostic/save-result
 * Guarda el resultado del diagnóstico en el perfil del usuario autenticado.
 * Requiere auth (el authGuard está en las rutas).
 */
export async function saveResultHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const parsed = SaveResultSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.errors[0]?.message ?? 'Invalid input',
    );
  }

  // request.user poblado por authGuard
  const userId = request.user.sub;

  const result = await diagnosticService.saveResult(userId, parsed.data);
  return reply.status(200).send(result);
}
