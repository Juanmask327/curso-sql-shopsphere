import { z } from 'zod';
import { required } from '../../shared/validation/required.js';

// ── Schemas de entrada ────────────────────────────────────────────────────────

export const ListExercisesQuerySchema = z.object({
  level_id: z.coerce.number().int().nonnegative().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
});

export const ExerciseIdParamSchema = z.object({
  id: z.string().uuid('Exercise ID must be a valid UUID'),
});

export const HintRequestSchema = z.object({
  // Sin body — el endpoint solo avanza al siguiente hint disponible
});

export const SaveDraftSchema = z.object({
  query: z
    .string(required('Query is required'))
    .max(10_000, 'Query must be at most 10,000 characters'),
});

// ── Admin schemas ─────────────────────────────────────────────────────────────

export const CreateExerciseSchema = z.object({
  level_id: z
    .number(required('level_id is required'))
    .int()
    .min(0)
    .max(10),
  title: z
    .string(required('Title is required'))
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be at most 200 characters'),
  description: z
    .string(required('Description is required'))
    .min(10, 'Description must be at least 10 characters')
    .max(2000),
  instructions: z
    .string(required('Instructions are required'))
    .min(10)
    .max(5000),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  xp_reward: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(10),
  reference_query: z
    .string(required('reference_query is required'))
    .min(5, 'Reference query must be at least 5 characters')
    .max(10_000),
  hints: z
    .array(z.string().min(1).max(500))
    .max(5, 'Maximum 5 hints per exercise')
    .default([]),
  order_index: z
    .number(required('order_index is required'))
    .int()
    .min(0),
  validation_mode: z
    .enum(['exact_ordered', 'exact_unordered', 'schema_match'])
    .default('exact_unordered'),
});

export const UpdateExerciseSchema = CreateExerciseSchema.partial();

export const PublishToggleSchema = z.object({
  is_published: z.boolean(required('is_published is required')),
});

// ── Tipos derivados ───────────────────────────────────────────────────────────

export type ListExercisesQuery = z.infer<typeof ListExercisesQuerySchema>;
export type ExerciseIdParam = z.infer<typeof ExerciseIdParamSchema>;
export type SaveDraftInput = z.infer<typeof SaveDraftSchema>;
export type CreateExerciseInput = z.infer<typeof CreateExerciseSchema>;
export type UpdateExerciseInput = z.infer<typeof UpdateExerciseSchema>;
export type PublishToggleInput = z.infer<typeof PublishToggleSchema>;

// ── Shapes de respuesta ───────────────────────────────────────────────────────

/**
 * Campos públicos de un ejercicio para el estudiante.
 * Nunca incluye reference_query ni expected_result_json — son internos.
 */
export interface ExercisePublic {
  id: string;
  level_id: number;
  title: string;
  description: string;
  instructions: string;
  difficulty: 'easy' | 'medium' | 'hard';
  xp_reward: number;
  hints: string[];
  order_index: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Progreso del usuario autenticado en un ejercicio específico.
 */
export interface ExerciseProgress {
  status: 'not_started' | 'in_progress' | 'completed';
  attempts_count: number;
  hints_used: number;
  xp_earned: number;
  last_query: string | null;
  completed_at: string | null;
  first_attempt_at: string | null;
}

/**
 * Detalle del ejercicio con progreso del usuario (para GET /exercises/:id).
 */
export interface ExerciseDetail extends ExercisePublic {
  progress: ExerciseProgress | null;
}

/**
 * Respuesta de POST /exercises/:id/hint
 */
export interface HintResponse {
  hint: string;
  hint_index: number;
  hints_remaining: number;
}

/**
 * Shape completo del ejercicio para admins (incluye campos internos).
 */
export interface ExerciseAdmin extends ExercisePublic {
  reference_query: string;
  expected_result_json: unknown;
  validation_mode: 'exact_ordered' | 'exact_unordered' | 'schema_match';
}
