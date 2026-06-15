import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  ListExercisesQuerySchema,
  ExerciseIdParamSchema,
  SaveDraftSchema,
  CreateExerciseSchema,
  UpdateExerciseSchema,
  PublishToggleSchema,
} from './exercises.schemas.js';
import * as exercisesService from './exercises.service.js';
import { ValidationError } from '../../shared/errors/index.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseParam(request: FastifyRequest): string {
  const parsed = ExerciseIdParamSchema.safeParse(request.params);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.errors[0]?.message ?? 'Invalid exercise ID',
      'VALIDATION_ERROR',
    );
  }
  return parsed.data.id;
}

// ── Student handlers ──────────────────────────────────────────────────────────

export async function listExercisesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const parsed = ListExercisesQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.errors[0]?.message ?? 'Invalid query parameters',
    );
  }

  const result = await exercisesService.listExercises({
    levelId: parsed.data.level_id,
    difficulty: parsed.data.difficulty,
  });

  return reply.status(200).send(result);
}

export async function getExerciseHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const id = parseParam(request);
  const userId = request.user.sub;

  const result = await exercisesService.getExerciseDetail(id, userId);
  return reply.status(200).send(result);
}

export async function requestHintHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const id = parseParam(request);
  const userId = request.user.sub;

  const result = await exercisesService.requestHint(id, userId);
  return reply.status(200).send(result);
}

export async function getProgressHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const id = parseParam(request);
  const userId = request.user.sub;

  const result = await exercisesService.getExerciseProgress(id, userId);
  return reply.status(200).send(result);
}

export async function saveDraftHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const id = parseParam(request);
  const userId = request.user.sub;

  const parsed = SaveDraftSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.errors[0]?.message ?? 'Invalid request body',
    );
  }

  await exercisesService.saveDraft(id, userId, parsed.data.query);
  return reply.status(200).send({ saved: true });
}

// ── Admin handlers ────────────────────────────────────────────────────────────

/**
 * El executor es el Worker pool del playground.
 * Se obtiene del decorador workerPool de la instancia de Fastify.
 * La augmentación de tipos está en modules/playground/worker-pool.ts.
 */
function getExecutor(request: FastifyRequest): exercisesService.QueryExecutor {
  // El worker pool se registra como decorador de Fastify en buildApp() (app.ts).
  // FastifyInstance.workerPool está tipado via declare module 'fastify' en worker-pool.ts.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pool = (request.server as any).workerPool as exercisesService.QueryExecutor | undefined;

  if (!pool) {
    throw new Error(
      'Worker pool not initialized. Ensure playground module is registered before exercises.',
    );
  }

  return pool;
}

export async function createExerciseHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const parsed = CreateExerciseSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.errors[0]?.message ?? 'Invalid request body',
    );
  }

  const executor = getExecutor(request);
  const result = await exercisesService.createExercise(parsed.data, executor);
  return reply.status(201).send(result);
}

export async function updateExerciseHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const id = parseParam(request);

  const parsed = UpdateExerciseSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.errors[0]?.message ?? 'Invalid request body',
    );
  }

  const executor = getExecutor(request);
  const result = await exercisesService.updateExercise(id, parsed.data, executor);
  return reply.status(200).send(result);
}

export async function togglePublishHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const id = parseParam(request);

  const parsed = PublishToggleSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.errors[0]?.message ?? 'is_published must be a boolean',
    );
  }

  const result = await exercisesService.togglePublish(id, parsed.data.is_published);
  return reply.status(200).send(result);
}
