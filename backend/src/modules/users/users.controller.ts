import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  UpdateProfileSchema,
  UsernameParamSchema,
  UserIdParamSchema,
  ListUsersExercisesQuerySchema,
  AdminListUsersQuerySchema,
  AdminChangeRoleSchema,
} from './users.schemas.js';
import * as usersService from './users.service.js';
import { ValidationError } from '../../shared/errors/index.js';

// ── Student handlers ──────────────────────────────────────────────────────────

export async function getDashboardHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const userId = request.user.sub;
  const result = await usersService.getDashboard(userId);
  return reply.status(200).send(result);
}

export async function getUserExercisesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const userId = request.user.sub;

  const parsed = ListUsersExercisesQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.errors[0]?.message ?? 'Invalid query parameters',
    );
  }

  const result = await usersService.getUserExercises(userId, {
    status: parsed.data.status,
    levelId: parsed.data.level_id,
  });

  return reply.status(200).send(result);
}

export async function updateProfileHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const userId = request.user.sub;

  const parsed = UpdateProfileSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.errors[0]?.message ?? 'Invalid request body',
    );
  }

  const result = await usersService.updateProfile(userId, parsed.data);
  return reply.status(200).send(result);
}

export async function getPublicProfileHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const parsed = UsernameParamSchema.safeParse(request.params);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.errors[0]?.message ?? 'Invalid username',
    );
  }

  const result = await usersService.getPublicProfile(parsed.data.username);

  if (!result) {
    // No revelar si existe un usuario inactivo — tratarlo igual que no existente
    return reply.status(404).send({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'User not found',
    });
  }

  return reply.status(200).send(result);
}

// ── Admin handlers ────────────────────────────────────────────────────────────

export async function adminListUsersHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const parsed = AdminListUsersQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.errors[0]?.message ?? 'Invalid query parameters',
    );
  }

  const result = await usersService.adminListUsers({
    search: parsed.data.search,
    role: parsed.data.role,
    page: parsed.data.page,
    limit: parsed.data.limit,
  });

  return reply.status(200).send(result);
}

export async function adminChangeRoleHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const paramParsed = UserIdParamSchema.safeParse(request.params);
  if (!paramParsed.success) {
    throw new ValidationError(
      paramParsed.error.errors[0]?.message ?? 'Invalid user ID',
    );
  }

  const bodyParsed = AdminChangeRoleSchema.safeParse(request.body);
  if (!bodyParsed.success) {
    throw new ValidationError(
      bodyParsed.error.errors[0]?.message ?? 'Invalid request body',
    );
  }

  // Prevenir que un admin se cambie su propio rol por accidente
  if (paramParsed.data.id === request.user.sub) {
    throw new ValidationError(
      'You cannot change your own role',
      'SELF_ROLE_CHANGE',
    );
  }

  const result = await usersService.adminChangeRole(
    paramParsed.data.id,
    bodyParsed.data.role,
  );

  return reply.status(200).send(result);
}

export async function adminDeactivateUserHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const parsed = UserIdParamSchema.safeParse(request.params);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.errors[0]?.message ?? 'Invalid user ID',
    );
  }

  // Prevenir auto-desactivación
  if (parsed.data.id === request.user.sub) {
    throw new ValidationError(
      'You cannot deactivate your own account',
      'SELF_DEACTIVATION',
    );
  }

  const result = await usersService.adminDeactivateUser(parsed.data.id);
  return reply.status(200).send(result);
}
