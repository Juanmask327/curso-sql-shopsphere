import { z } from 'zod';

// ── Schemas de entrada ────────────────────────────────────────────────────────

export const LevelIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int('Level ID must be a non-negative integer')
    .nonnegative('Level ID must be a non-negative integer'),
});

// ── Tipos derivados ───────────────────────────────────────────────────────────

export type LevelIdParam = z.infer<typeof LevelIdParamSchema>;

// ── Shapes de respuesta ───────────────────────────────────────────────────────

export interface LevelPublic {
  id: number;
  name: string;
  description: string;
  order_index: number;
  xp_required: number;
  exercises_count: number;
}

export interface ExerciseInLevel {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  xp_reward: number;
  order_index: number;
  /** Solo presente si el usuario está autenticado */
  progress?: {
    status: 'not_started' | 'in_progress' | 'completed';
    completed_at: string | null;
  };
}

export interface Lesson {
  order_index: number;
  title: string;
  content: string;
}

export interface LevelDetail {
  id: number;
  name: string;
  description: string;
  order_index: number;
  xp_required: number;
  exercises: ExerciseInLevel[];
  lessons: Lesson[];
  /** Markdown de introducción narrativa desde contenido/intro-nivel-XX.md */
  level_intro?: string;
  /** Markdown del proyecto de nivel desde contenido/proyecto-nivel-XX.md */
  project_content?: string;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  avatar_url: string | null;
  xp_total: number;
  exercises_completed_in_level: number;
}
