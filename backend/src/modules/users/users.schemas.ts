import { z } from 'zod';

// ── Schemas de entrada ────────────────────────────────────────────────────────

export const UpdateProfileSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores')
    .optional(),
  avatar_url: z
    .string()
    .url('avatar_url must be a valid URL')
    .max(500, 'avatar_url must be at most 500 characters')
    .optional(),
});

export const UsernameParamSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .max(30),
});

export const UserIdParamSchema = z.object({
  id: z.string().uuid('User ID must be a valid UUID'),
});

export const ListUsersExercisesQuerySchema = z.object({
  status: z.enum(['completed', 'in_progress', 'not_started']).optional(),
  level_id: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? parseInt(v, 10) : undefined))
    .refine((v) => v === undefined || !isNaN(v), { message: 'level_id must be a number' }),
});

export const AdminListUsersQuerySchema = z.object({
  search: z.string().max(100).optional(),
  role: z.enum(['student', 'admin', 'instructor']).optional(),
  page: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? parseInt(v, 10) : 1))
    .refine((v) => v >= 1, { message: 'page must be >= 1' }),
  limit: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? parseInt(v, 10) : 20))
    .refine((v) => v >= 1 && v <= 100, { message: 'limit must be between 1 and 100' }),
});

export const AdminChangeRoleSchema = z.object({
  role: z.enum(['student', 'admin', 'instructor']),
});

// ── Tipos derivados ───────────────────────────────────────────────────────────

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type ListUsersExercisesQuery = z.infer<typeof ListUsersExercisesQuerySchema>;
export type AdminListUsersQuery = z.infer<typeof AdminListUsersQuerySchema>;
export type AdminChangeRoleInput = z.infer<typeof AdminChangeRoleSchema>;

// ── Shapes de respuesta ───────────────────────────────────────────────────────

export interface LevelInfo {
  id: number;
  name: string;
  xp_required: number;
}

export interface LevelProgress {
  current_level: LevelInfo;
  next_level: LevelInfo | null;
  xp_in_current_level: number;
  xp_to_next_level: number | null;
  progress_pct: number;
}

export interface UserStats {
  exercises_completed: number;
  exercises_attempted: number;
  total_attempts: number;
  avg_attempts_per_exercise: number;
  hints_used_total: number;
  completion_rate_pct: number;
}

export interface RecentActivity {
  exercise_id: string;
  exercise_title: string;
  level_name: string;
  completed_at: string | null;
  last_attempt_at: string | null;
  status: 'not_started' | 'in_progress' | 'completed';
  xp_earned: number;
}

export interface LevelCompletion {
  level_id: number;
  level_name: string;
  is_published: boolean;
  exercises_total: number;
  exercises_completed: number;
  completion_pct: number;
}

export interface DashboardResponse {
  user: {
    id: string;
    username: string;
    email: string;
    avatar_url: string | null;
    xp_total: number;
    current_level: number;
  };
  level_progress: LevelProgress;
  stats: UserStats;
  recent_activity: RecentActivity[];
  level_completion: LevelCompletion[];
}

export interface UserExerciseItem {
  exercise_id: string;
  exercise_title: string;
  level_id: number;
  level_name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  xp_reward: number;
  order_index: number;
  status: 'not_started' | 'in_progress' | 'completed';
  attempts_count: number;
  hints_used: number;
  xp_earned: number;
  completed_at: string | null;
}

export interface PublicProfile {
  username: string;
  avatar_url: string | null;
  xp_total: number;
  current_level: number;
  exercises_completed: number;
  certificates: Array<{
    uid: string;
    level_name: string;
    issued_at: string;
  }>;
}

export interface AdminUserItem {
  id: string;
  username: string;
  email: string;
  role: string;
  xp_total: number;
  current_level: number;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
}

export interface AdminUsersListResponse {
  data: AdminUserItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}
