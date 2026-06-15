import { z } from 'zod';

// ── Schemas de entrada ────────────────────────────────────────────────────────

export const SubmitDiagnosticSchema = z.object({
  answers: z
    .array(
      z.object({
        question_id: z
          .number({ required_error: 'question_id is required' })
          .int()
          .min(1)
          .max(24),
        // null significa "No lo sé / omitida"
        answer: z.string().nullable(),
      }),
    )
    .min(1, 'At least one answer is required')
    .max(24, 'Maximum 24 answers'),
  // Seguridad (IDOR/CWE-639): el resultado del diagnóstico NUNCA se persiste
  // a partir de un user_id provisto por el cliente. El guardado del resultado
  // se hace exclusivamente vía POST /diagnostic/save-result, que está protegido
  // por authGuard y usa req.user.sub. Si el cliente envía user_id, se ignora.
});

export const SaveResultSchema = z.object({
  recommended_level: z.number().int().min(0).max(9),
  score_by_level: z.array(
    z.object({
      level: z.number().int().min(0).max(8),
      score_pct: z.number().min(0).max(100),
    }),
  ),
});

// ── Query params ──────────────────────────────────────────────────────────────

export const SubmitQuerySchema = z.object({
  show_details: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
});

// ── Tipos derivados ───────────────────────────────────────────────────────────

export type SubmitDiagnosticInput = z.infer<typeof SubmitDiagnosticSchema>;
export type SaveResultInput = z.infer<typeof SaveResultSchema>;
export type SubmitQueryInput = z.infer<typeof SubmitQuerySchema>;

// ── Shapes de respuesta ───────────────────────────────────────────────────────

/** Opción de respuesta para multiple_choice */
export interface QuestionOption {
  id: string;
  text: string;
}

/** Pregunta del diagnóstico tal como se envía al cliente (sin respuesta correcta) */
export interface DiagnosticQuestion {
  id: number;
  level: number;
  weight: number;
  format: 'multiple_choice' | 'mini_editor';
  text: string;
  options?: QuestionOption[];
  /** Solo para mini_editor — información del schema disponible */
  schema_hint?: string;
}

/** Bloque del diagnóstico */
export interface DiagnosticBlock {
  id: string;
  name: string;
  levels: number[];
  questions: DiagnosticQuestion[];
}

/** Respuesta completa de GET /diagnostic */
export interface DiagnosticResponse {
  total_questions: number;
  estimated_minutes: { min: number; max: number };
  blocks: DiagnosticBlock[];
}

/** Detalle por pregunta (solo si ?show_details=true) */
export interface QuestionDetail {
  question_id: number;
  correct: boolean;
  points_earned: number;
  points_possible: number;
}

/** Respuesta de POST /diagnostic/submit */
export interface SubmitDiagnosticResponse {
  recommended_level: number;
  recommended_level_name: string;
  message: string;
  score_by_level: { level: number; score_pct: number }[];
  can_skip_to: number[];
  details?: QuestionDetail[];
}
