import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  smallint,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// ================================================================
// USERS
// ================================================================
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    email: text('email').notNull().unique(),
    username: text('username').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: text('role', { enum: ['student', 'admin', 'instructor'] })
      .notNull()
      .default('student'),
    xpTotal: integer('xp_total').notNull().default(0),
    currentLevel: smallint('current_level').notNull().default(0),
    avatarUrl: text('avatar_url'),
    isActive: boolean('is_active').notNull().default(true),
    emailVerified: boolean('email_verified').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    emailIdx: index('idx_users_email').on(table.email),
    usernameIdx: index('idx_users_username').on(table.username),
  }),
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  exerciseProgress: many(userExerciseProgress),
  attempts: many(exerciseAttempts),
  certificates: many(certificates),
}));

// ================================================================
// SESSIONS (para revocación de sesiones activas)
// ================================================================
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // SHA-256 del refresh token. Nunca se guarda el token raw.
    tokenHash: text('token_hash').notNull().unique(),
    userAgent: text('user_agent'),
    ipAddress: text('ip_address'),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .default(sql`now()`),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .default(sql`now()`),
    // NULL = sesión activa, NOT NULL = revocada
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => ({
    userIdIdx: index('idx_sessions_user_id').on(table.userId),
    tokenHashIdx: uniqueIndex('idx_sessions_token_hash').on(table.tokenHash),
    expiresAtIdx: index('idx_sessions_expires_at').on(table.expiresAt),
  }),
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// ================================================================
// LEVELS
// ================================================================
export const levels = pgTable('levels', {
  id: smallint('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  xpRequired: integer('xp_required').notNull().default(0),
  orderIndex: smallint('order_index').notNull(),
  isPublished: boolean('is_published').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .default(sql`now()`),
});

export const levelsRelations = relations(levels, ({ many }) => ({
  exercises: many(exercises),
  certificates: many(certificates),
}));

// ================================================================
// EXERCISES
// ================================================================
export const exercises = pgTable(
  'exercises',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    levelId: smallint('level_id')
      .notNull()
      .references(() => levels.id),
    title: text('title').notNull(),
    description: text('description').notNull(),
    instructions: text('instructions').notNull(),
    difficulty: text('difficulty', { enum: ['easy', 'medium', 'hard'] }).notNull(),
    xpReward: smallint('xp_reward').notNull().default(10),
    // Query canónica del instructor — ejecutada en build time para generar expected_result_json
    referenceQuery: text('reference_query').notNull(),
    // Pre-calculado en seed: { columns: string[], rows: any[][], row_count: number }
    expectedResultJson: jsonb('expected_result_json').notNull(),
    validationMode: text('validation_mode', {
      enum: ['exact_ordered', 'exact_unordered', 'schema_match'],
    })
      .notNull()
      .default('exact_unordered'),
    // Array de strings ordenados por nivel de hint
    hints: jsonb('hints').notNull().default(sql`'[]'::jsonb`),
    orderIndex: smallint('order_index').notNull(),
    isPublished: boolean('is_published').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    levelIdIdx: index('idx_exercises_level_id').on(table.levelId),
    orderIdx: index('idx_exercises_order').on(table.levelId, table.orderIndex),
  }),
);

export const exercisesRelations = relations(exercises, ({ one, many }) => ({
  level: one(levels, {
    fields: [exercises.levelId],
    references: [levels.id],
  }),
  progress: many(userExerciseProgress),
  attempts: many(exerciseAttempts),
}));

// ================================================================
// USER EXERCISE PROGRESS
// ================================================================
export const userExerciseProgress = pgTable(
  'user_exercise_progress',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    exerciseId: uuid('exercise_id')
      .notNull()
      .references(() => exercises.id),
    status: text('status', { enum: ['not_started', 'in_progress', 'completed'] })
      .notNull()
      .default('not_started'),
    attemptsCount: smallint('attempts_count').notNull().default(0),
    hintsUsed: smallint('hints_used').notNull().default(0),
    xpEarned: smallint('xp_earned').notNull().default(0),
    firstAttemptAt: timestamp('first_attempt_at', { withTimezone: true, mode: 'date' }),
    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'date' }),
    // Última query guardada del usuario (draft, para recuperar estado)
    lastQuery: text('last_query'),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    userIdx: index('idx_user_exercise_progress_user').on(table.userId),
    statusIdx: index('idx_user_exercise_progress_status').on(table.userId, table.status),
    // Un registro de progreso por usuario por ejercicio
    uniqueUserExercise: uniqueIndex('uq_user_exercise_progress').on(
      table.userId,
      table.exerciseId,
    ),
  }),
);

export const userExerciseProgressRelations = relations(userExerciseProgress, ({ one }) => ({
  user: one(users, {
    fields: [userExerciseProgress.userId],
    references: [users.id],
  }),
  exercise: one(exercises, {
    fields: [userExerciseProgress.exerciseId],
    references: [exercises.id],
  }),
}));

// ================================================================
// EXERCISE ATTEMPTS (log inmutable — solo INSERT, nunca UPDATE)
// ================================================================
export const exerciseAttempts = pgTable(
  'exercise_attempts',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    exerciseId: uuid('exercise_id')
      .notNull()
      .references(() => exercises.id),
    querySubmitted: text('query_submitted').notNull(),
    isCorrect: boolean('is_correct').notNull(),
    errorMessage: text('error_message'),
    hintLevelShown: smallint('hint_level_shown'),
    // Tiempo de ejecución de la query en ms (para monitoring)
    executionMs: smallint('execution_ms'),
    // Snapshot del resultado (primeras 50 filas) para debugging por admins
    resultSnapshot: jsonb('result_snapshot'),
    // Sin updatedAt — este es un log append-only
    attemptedAt: timestamp('attempted_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    userExerciseIdx: index('idx_attempts_user_exercise').on(table.userId, table.exerciseId),
    userRecentIdx: index('idx_attempts_user_recent').on(table.userId, table.attemptedAt),
  }),
);

export const exerciseAttemptsRelations = relations(exerciseAttempts, ({ one }) => ({
  user: one(users, {
    fields: [exerciseAttempts.userId],
    references: [users.id],
  }),
  exercise: one(exercises, {
    fields: [exerciseAttempts.exerciseId],
    references: [exercises.id],
  }),
}));

// ================================================================
// CERTIFICATES
// ================================================================
export const certificates = pgTable(
  'certificates',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    levelId: smallint('level_id')
      .notNull()
      .references(() => levels.id),
    // ID público verificable, e.g. "SHOP-L2-A1B2C3"
    certificateUid: text('certificate_uid').notNull().unique(),
    issuedAt: timestamp('issued_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .default(sql`now()`),
    // XP total al momento de emisión, tiempo de completado, estadísticas
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  },
  (table) => ({
    uidIdx: uniqueIndex('idx_certificates_uid').on(table.certificateUid),
    userIdx: index('idx_certificates_user').on(table.userId),
    // Un certificado por nivel por usuario
    uniqueUserLevel: uniqueIndex('uq_certificate_user_level').on(table.userId, table.levelId),
  }),
);

export const certificatesRelations = relations(certificates, ({ one }) => ({
  user: one(users, {
    fields: [certificates.userId],
    references: [users.id],
  }),
  level: one(levels, {
    fields: [certificates.levelId],
    references: [levels.id],
  }),
}));

// ================================================================
// TIPOS DERIVADOS (útiles en el resto del código)
// ================================================================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Level = typeof levels.$inferSelect;
export type NewLevel = typeof levels.$inferInsert;

export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;

export type UserExerciseProgress = typeof userExerciseProgress.$inferSelect;
export type NewUserExerciseProgress = typeof userExerciseProgress.$inferInsert;

export type ExerciseAttempt = typeof exerciseAttempts.$inferSelect;
export type NewExerciseAttempt = typeof exerciseAttempts.$inferInsert;

export type Certificate = typeof certificates.$inferSelect;
export type NewCertificate = typeof certificates.$inferInsert;
