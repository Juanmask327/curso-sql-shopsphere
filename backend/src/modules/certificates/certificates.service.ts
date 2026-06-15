import { eq, and, count, sql } from 'drizzle-orm';
import { randomInt } from 'crypto';
import { db } from '../../shared/db/index.js';
import {
  certificates,
  levels,
  exercises,
  users,
  userExerciseProgress,
} from '../../shared/db/schema.js';
import { NotFoundError } from '../../shared/errors/index.js';
import type {
  CertificatePublic,
  CheckCertificateResponse,
  VerifyCertificateResponse,
} from './certificates.schemas.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Genera un UID de certificado único.
 * Formato: "SS-L{level_id}-{6 chars aleatorios uppercase}"
 * Ejemplo: "SS-L3-A7K2M9"
 *
 * Seguridad (CWE-338): usa crypto.randomInt (CSPRNG) en lugar de Math.random,
 * que no es criptográficamente seguro y haría predecibles los UIDs públicos
 * usados para verificar certificados.
 */
function generateCertificateUid(levelId: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  // 6 chars del charset, cada uno elegido con un CSPRNG sin sesgo de módulo.
  const randomPart = Array.from({ length: 6 }, () =>
    chars[randomInt(chars.length)],
  ).join('');

  return `SS-L${levelId}-${randomPart}`;
}

/**
 * Proyecta un registro de certificado al shape público.
 */
function toCertificatePublic(
  cert: typeof certificates.$inferSelect,
  levelName: string,
): CertificatePublic {
  return {
    id: cert.id,
    uid: cert.certificateUid,
    level_id: cert.levelId,
    level_name: levelName,
    issued_at: cert.issuedAt.toISOString(),
    metadata: (cert.metadata as Record<string, unknown>) ?? {},
  };
}

// ── Core: emisión de certificados ─────────────────────────────────────────────

/**
 * Verifica si el usuario cumple los requisitos para un certificado de nivel
 * y lo emite si aplica. Es idempotente: si ya tiene el certificado, lo retorna.
 *
 * Requisito: haber completado el 100% de los ejercicios publicados del nivel.
 *
 * Esta función es el corazón del módulo y se llama desde dos lugares:
 * 1. POST /certificates/check/:level_id — invocado manualmente por el usuario
 * 2. playground.service.ts — fire-and-forget al completar un ejercicio
 *
 * @returns objeto con already_had, newly_issued y el certificado si existe/se emitió
 */
export async function checkAndIssueCertificate(
  userId: string,
  levelId: number,
): Promise<CheckCertificateResponse> {
  // 1. Verificar que el nivel existe y está publicado
  const [level] = await db
    .select({ id: levels.id, name: levels.name })
    .from(levels)
    .where(and(eq(levels.id, levelId), eq(levels.isPublished, true)))
    .limit(1);

  if (!level) {
    // Nivel no encontrado o no publicado — no emitir certificado silenciosamente
    return { already_had: false, newly_issued: false };
  }

  // 2. Verificar si ya tiene el certificado (idempotencia)
  const [existing] = await db
    .select()
    .from(certificates)
    .where(
      and(
        eq(certificates.userId, userId),
        eq(certificates.levelId, levelId),
      ),
    )
    .limit(1);

  if (existing) {
    return {
      already_had: true,
      newly_issued: false,
      certificate: toCertificatePublic(existing, level.name),
    };
  }

  // 3. Verificar que completó el 100% de ejercicios publicados del nivel
  const [exerciseStats] = await db
    .select({
      totalPublished: count(exercises.id),
    })
    .from(exercises)
    .where(and(eq(exercises.levelId, levelId), eq(exercises.isPublished, true)));

  const totalPublished = Number(exerciseStats?.totalPublished ?? 0);

  if (totalPublished === 0) {
    // Nivel sin ejercicios publicados — no emitir
    return { already_had: false, newly_issued: false };
  }

  const [completedStats] = await db
    .select({
      completedCount: count(userExerciseProgress.exerciseId),
    })
    .from(userExerciseProgress)
    .innerJoin(exercises, eq(userExerciseProgress.exerciseId, exercises.id))
    .where(
      and(
        eq(userExerciseProgress.userId, userId),
        eq(exercises.levelId, levelId),
        eq(userExerciseProgress.status, 'completed'),
        eq(exercises.isPublished, true),
      ),
    );

  const completedCount = Number(completedStats?.completedCount ?? 0);

  if (completedCount < totalPublished) {
    // No completó todos los ejercicios
    return { already_had: false, newly_issued: false };
  }

  // 4. Emitir certificado — INSERT ... ON CONFLICT DO NOTHING para idempotencia
  // (dos requests concurrentes no duplican el certificado gracias al UNIQUE constraint)
  const uid = generateCertificateUid(levelId);

  const metadata: Record<string, unknown> = {
    exercises_completed: completedCount,
    issued_by: 'system',
  };

  // Intentar obtener XP actual del usuario para el metadata
  try {
    const [userRow] = await db
      .select({ xpTotal: users.xpTotal })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userRow) {
      metadata['xp_at_issuance'] = userRow.xpTotal;
    }
  } catch {
    // No crítico — el certificado se emite igual sin este dato
  }

  const [issued] = await db
    .insert(certificates)
    .values({
      userId,
      levelId,
      certificateUid: uid,
      metadata,
    })
    .onConflictDoNothing({
      target: [certificates.userId, certificates.levelId],
    })
    .returning();

  if (!issued) {
    // El INSERT fue ignorado por ON CONFLICT — otro proceso ya lo emitió
    // Leer el certificado existente para retornarlo
    const [concurrent] = await db
      .select()
      .from(certificates)
      .where(
        and(
          eq(certificates.userId, userId),
          eq(certificates.levelId, levelId),
        ),
      )
      .limit(1);

    if (!concurrent) {
      // Situación muy improbable — retornar sin certificado
      return { already_had: false, newly_issued: false };
    }

    return {
      already_had: true,
      newly_issued: false,
      certificate: toCertificatePublic(concurrent, level.name),
    };
  }

  return {
    already_had: false,
    newly_issued: true,
    certificate: toCertificatePublic(issued, level.name),
  };
}

/**
 * Verifica la autenticidad de un certificado por su UID público.
 * Usado por empleadores para validar certificados de candidatos.
 */
export async function verifyCertificate(uid: string): Promise<VerifyCertificateResponse> {
  const [cert] = await db
    .select({
      uid: certificates.certificateUid,
      issuedAt: certificates.issuedAt,
      levelName: levels.name,
      username: users.username,
    })
    .from(certificates)
    .innerJoin(levels, eq(certificates.levelId, levels.id))
    .innerJoin(users, eq(certificates.userId, users.id))
    .where(eq(certificates.certificateUid, uid))
    .limit(1);

  if (!cert) {
    return { valid: false };
  }

  return {
    valid: true,
    certificate: {
      uid: cert.uid,
      issued_at: cert.issuedAt.toISOString(),
      level_name: cert.levelName,
      username: cert.username,
    },
  };
}

/**
 * Lista todos los certificados del usuario autenticado.
 */
export async function getUserCertificates(userId: string): Promise<CertificatePublic[]> {
  const rows = await db
    .select({
      cert: certificates,
      levelName: levels.name,
    })
    .from(certificates)
    .innerJoin(levels, eq(certificates.levelId, levels.id))
    .where(eq(certificates.userId, userId))
    .orderBy(sql`${certificates.issuedAt} DESC`);

  return rows.map((row) => toCertificatePublic(row.cert, row.levelName));
}
