import type { FastifyRequest, FastifyReply } from 'fastify';
import { LevelIdParamSchema, CertificateUidParamSchema } from './certificates.schemas.js';
import * as certificatesService from './certificates.service.js';
import { ValidationError } from '../../shared/errors/index.js';

export async function checkCertificateHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const userId = request.user.sub;

  const parsed = LevelIdParamSchema.safeParse(request.params);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.errors[0]?.message ?? 'Invalid level_id',
    );
  }

  const result = await certificatesService.checkAndIssueCertificate(
    userId,
    parsed.data.level_id,
  );

  return reply.status(200).send(result);
}

export async function verifyCertificateHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const parsed = CertificateUidParamSchema.safeParse(request.params);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.errors[0]?.message ?? 'Invalid certificate UID',
    );
  }

  const result = await certificatesService.verifyCertificate(parsed.data.uid);
  return reply.status(200).send(result);
}

export async function getUserCertificatesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const userId = request.user.sub;
  const result = await certificatesService.getUserCertificates(userId);
  return reply.status(200).send(result);
}
