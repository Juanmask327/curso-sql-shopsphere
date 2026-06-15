import type { FastifyInstance } from 'fastify';
import { authGuard } from '../../shared/middleware/auth.guard.js';
import {
  checkCertificateHandler,
  verifyCertificateHandler,
  getUserCertificatesHandler,
} from './certificates.controller.js';

/**
 * Plugin de rutas del módulo certificates.
 *
 * POST /certificates/check/:level_id — requiere auth
 * GET  /certificates/verify/:uid    — público (verificación por empleadores)
 * GET  /users/me/certificates       — requiere auth
 */
export async function certificatesRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /certificates/check/:level_id
  fastify.post(
    '/certificates/check/:level_id',
    {
      preHandler: [authGuard],
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
        },
      },
      schema: {
        tags: ['certificates'],
        summary: 'Verificar elegibilidad de certificado',
        description:
          'Verifica si el usuario completó todos los ejercicios del nivel y, ' +
          'si corresponde, emite el certificado automáticamente.',
        security: [{ BearerAuth: [] }],
        params: {
          type: 'object',
          required: ['level_id'],
          properties: {
            level_id: { type: 'integer', minimum: 0 },
          },
        },
        response: {
          200: {
            description: 'Resultado del check de certificado',
            type: 'object',
            properties: {
              already_had: { type: 'boolean' },
              newly_issued: { type: 'boolean' },
              certificate: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  uid: { type: 'string' },
                  level_id: { type: 'number' },
                  level_name: { type: 'string' },
                  issued_at: { type: 'string', format: 'date-time' },
                  metadata: { type: 'object' },
                },
                required: ['id', 'uid', 'level_id', 'level_name', 'issued_at'],
              },
            },
            required: ['already_had', 'newly_issued'],
          },
          401: { description: 'No autenticado', type: 'object' },
          404: { description: 'Nivel no encontrado', type: 'object' },
        },
      },
    },
    checkCertificateHandler,
  );

  // GET /certificates/verify/:uid
  fastify.get(
    '/certificates/verify/:uid',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
      schema: {
        tags: ['certificates'],
        summary: 'Verificar certificado por UID público',
        description:
          'Endpoint público para verificar la autenticidad de un certificado. ' +
          'Diseñado para ser usado por empleadores y reclutadores.',
        params: {
          type: 'object',
          required: ['uid'],
          properties: {
            uid: {
              type: 'string',
              description: 'UID público del certificado (ej: SHOP-L2-A1B2C3)',
            },
          },
        },
        response: {
          200: {
            description: 'Certificado verificado',
            type: 'object',
            properties: {
              valid: { type: 'boolean' },
              username: { type: 'string' },
              level_name: { type: 'string' },
              issued_at: { type: 'string', format: 'date-time' },
              certificate_uid: { type: 'string' },
            },
          },
          404: { description: 'Certificado no encontrado', type: 'object' },
        },
      },
    },
    verifyCertificateHandler,
  );

  // GET /users/me/certificates
  fastify.get(
    '/users/me/certificates',
    {
      preHandler: [authGuard],
      schema: {
        tags: ['certificates'],
        summary: 'Mis certificados',
        description: 'Retorna todos los certificados emitidos para el usuario autenticado.',
        security: [{ BearerAuth: [] }],
        response: {
          200: {
            description: 'Lista de certificados',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                certificate_uid: { type: 'string' },
                level_id: { type: 'number' },
                level_name: { type: 'string' },
                issued_at: { type: 'string', format: 'date-time' },
                metadata: { type: 'object' },
              },
            },
          },
          401: { description: 'No autenticado', type: 'object' },
        },
      },
    },
    getUserCertificatesHandler,
  );
}
