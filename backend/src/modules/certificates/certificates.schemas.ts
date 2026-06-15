import { z } from 'zod';

// ── Schemas de entrada ────────────────────────────────────────────────────────

export const LevelIdParamSchema = z.object({
  level_id: z.coerce
    .number()
    .int('level_id must be a non-negative integer')
    .nonnegative('level_id must be a non-negative integer'),
});

export const CertificateUidParamSchema = z.object({
  uid: z
    .string()
    .min(1, 'uid is required')
    .max(50, 'uid must be at most 50 characters'),
});

// ── Tipos derivados ───────────────────────────────────────────────────────────

export type LevelIdParam = z.infer<typeof LevelIdParamSchema>;
export type CertificateUidParam = z.infer<typeof CertificateUidParamSchema>;

// ── Shapes de respuesta ───────────────────────────────────────────────────────

/**
 * Datos públicos de un certificado (para mostrar al usuario y para verificación).
 */
export interface CertificatePublic {
  id: string;
  uid: string;
  level_id: number;
  level_name: string;
  issued_at: string;
  metadata: Record<string, unknown>;
}

/**
 * Respuesta de POST /certificates/check/:level_id
 */
export interface CheckCertificateResponse {
  already_had: boolean;
  newly_issued: boolean;
  certificate?: CertificatePublic;
}

/**
 * Respuesta de GET /certificates/verify/:uid
 */
export interface VerifyCertificateResponse {
  valid: boolean;
  certificate?: {
    uid: string;
    issued_at: string;
    level_name: string;
    username: string;
  };
}
