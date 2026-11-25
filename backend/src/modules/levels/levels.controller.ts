import type { FastifyRequest, FastifyReply } from 'fastify';
import { LevelIdParamSchema } from './levels.schemas.js';
import * as levelsService from './levels.service.js';
import { ValidationError } from '../../shared/errors/index.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseLevelId(request: FastifyRequest): number {
  const parsed = LevelIdParamSchema.safeParse(request.params);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues[0]?.message ?? 'Invalid level ID',
      'VALIDATION_ERROR',
    );
  }
  return parsed.data.id;
}

/**
 * Extrae el userId del token JWT si está presente.
 * Para rutas con auth opcional: no lanza si el token está ausente o inválido.
 * Usamos el campo request.user que está disponible solo si jwtVerify fue invocado.
 */
function getOptionalUserId(request: FastifyRequest): string | undefined {
  try {
    // request.user está poblado por authGuard (preHandler). Si no se llamó
    // authGuard, esta propiedad no existe y el acceso lanzará TypeError.
    return request.user?.sub;
  } catch {
    return undefined;
  }
}

// ── Handlers ──────────────────────────────────────────────────────────────────

export async function listLevelsHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await levelsService.listLevels();
  return reply.status(200).send(result);
}

export async function getLevelDetailHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const levelId = parseLevelId(request);
  const userId = getOptionalUserId(request);

  const result = await levelsService.getLevelDetail(levelId, userId);
  return reply.status(200).send(result);
}

export async function getLevelLeaderboardHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const levelId = parseLevelId(request);
  const result = await levelsService.getLevelLeaderboard(levelId);
  return reply.status(200).send(result);
}
