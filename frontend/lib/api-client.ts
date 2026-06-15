/**
 * ShopSphere API Client
 *
 * Cliente tipado que cubre todos los endpoints del backend.
 * Usa fetch nativo. Base URL desde NEXT_PUBLIC_API_URL.
 *
 * Características:
 * - Token automático en Authorization: Bearer desde localStorage
 * - Auto-refresh al recibir 401: reintenta una vez, limpia tokens si falla
 * - Errores tipados con { message, code, status } — ApiError — para manejo en UI
 */

// ─────────────────────────────────────────────────────────────────────────────
// Claves de localStorage
// ─────────────────────────────────────────────────────────────────────────────

export const TOKEN_KEY = 'ss_access_token';
export const REFRESH_TOKEN_KEY = 'ss_refresh_token';

// ─────────────────────────────────────────────────────────────────────────────
// Error tipado del cliente
// ─────────────────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  readonly code: string | undefined;
  readonly status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de dominio — Auth
// ─────────────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  username: string;
  role: 'student' | 'admin' | 'instructor';
  xpTotal: number;
  currentLevel: number;
  avatarUrl: string | null;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Segundos hasta expiración del access token */
  expiresIn: number;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface RefreshResponse {
  tokens: AuthTokens;
}

export interface RegisterBody {
  email: string;
  username: string;
  password: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de dominio — Exercises
// ─────────────────────────────────────────────────────────────────────────────

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

export interface ExerciseProgress {
  status: 'not_started' | 'in_progress' | 'completed';
  attempts_count: number;
  hints_used: number;
  xp_earned: number;
  last_query: string | null;
  completed_at: string | null;
  first_attempt_at: string | null;
}

export interface ExerciseDetail extends ExercisePublic {
  progress: ExerciseProgress | null;
}

export interface HintResponse {
  hint: string;
  hint_index: number;
  hints_remaining: number;
}

export interface ExercisesListParams {
  level_id?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de dominio — Playground
// ─────────────────────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  hint?: string;
  hint_level?: number;
  xp_earned?: number;
  execution_ms: number;
  row_count_got?: number;
  row_count_expected?: number;
  error_type?: 'execution_error' | 'timeout' | 'rate_limit';
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de dominio — Levels
// ─────────────────────────────────────────────────────────────────────────────

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
  level_intro?: string;
  project_content?: string;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  avatar_url: string | null;
  xp_total: number;
  exercises_completed_in_level: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de dominio — Users
// ─────────────────────────────────────────────────────────────────────────────

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

export interface UserExercise {
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

export interface UpdateProfileBody {
  username?: string;
  avatar_url?: string;
}

export interface UserExercisesParams {
  status?: 'completed' | 'in_progress' | 'not_started';
  level_id?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de dominio — Certificates
// ─────────────────────────────────────────────────────────────────────────────

export interface Certificate {
  id: string;
  uid: string;
  level_id: number;
  level_name: string;
  issued_at: string;
  metadata: Record<string, unknown>;
}

export interface CertificateCheckResult {
  already_had: boolean;
  newly_issued: boolean;
  certificate?: Certificate;
}

export interface CertificateVerifyResult {
  valid: boolean;
  certificate?: {
    uid: string;
    issued_at: string;
    level_name: string;
    username: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de dominio — Diagnostic
// ─────────────────────────────────────────────────────────────────────────────

export interface QuestionOption {
  id: string;
  text: string;
}

export interface DiagnosticQuestion {
  id: number;
  level: number;
  weight: number;
  format: 'multiple_choice' | 'mini_editor';
  text: string;
  options?: QuestionOption[];
  schema_hint?: string;
}

export interface DiagnosticBlock {
  id: string;
  name: string;
  levels: number[];
  questions: DiagnosticQuestion[];
}

export interface DiagnosticData {
  total_questions: number;
  estimated_minutes: { min: number; max: number };
  blocks: DiagnosticBlock[];
}

export interface DiagnosticAnswer {
  question_id: number;
  answer: string | null;
}

export interface SubmitDiagnosticBody {
  answers: DiagnosticAnswer[];
  /** UUID del usuario autenticado. Si se incluye, guarda el resultado en background. */
  user_id?: string;
}

export interface QuestionDetail {
  question_id: number;
  correct: boolean;
  points_earned: number;
  points_possible: number;
}

export interface DiagnosticResult {
  recommended_level: number;
  recommended_level_name: string;
  message: string;
  score_by_level: { level: number; score_pct: number }[];
  can_skip_to: number[];
  details?: QuestionDetail[];
}

export interface SaveResultBody {
  recommended_level: number;
  score_by_level: { level: number; score_pct: number }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Núcleo HTTP
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Persiste ambos tokens en localStorage.
 * Exportada para uso desde auth-store.
 */
export function storeTokens(tokens: AuthTokens): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

/**
 * Elimina ambos tokens de localStorage.
 * Exportada para uso desde auth-store.
 */
export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * Alias de clearTokens para compatibilidad con componentes que llaman removeToken().
 */
export function removeToken(): void {
  clearTokens();
}

/**
 * Devuelve true si hay un access token en localStorage.
 * Uso: AuthGuard y rutas protegidas del lado cliente.
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(localStorage.getItem(TOKEN_KEY));
}

/**
 * Intenta renovar el access token usando el refresh token almacenado.
 * Retorna los nuevos tokens o null si el refresh falla.
 *
 * Llama directamente a fetch (no a request()) para evitar bucles infinitos.
 */
async function attemptRefresh(): Promise<AuthTokens | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as RefreshResponse;
    storeTokens(data.tokens);
    return data.tokens;
  } catch {
    return null;
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method: HttpMethod;
  path: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Si false, no adjunta Authorization header. Default: true. */
  authenticated?: boolean;
  /** Interno — evita bucle en el reintento post-refresh. */
  _isRetry?: boolean;
}

/**
 * Ejecuta un request HTTP tipado contra la API.
 *
 * Flujo de autenticación:
 * 1. Adjunta access token si authenticated es true (default)
 * 2. En 401, intenta refresh del token
 * 3. Si el refresh tiene éxito, reintenta el request original una vez
 * 4. Si el refresh falla, limpia tokens y lanza ApiError 401 SESSION_EXPIRED
 */
async function request<T>(options: RequestOptions): Promise<T> {
  const {
    method,
    path,
    body,
    query,
    authenticated = true,
    _isRetry = false,
  } = options;

  let url = `${BASE_URL}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    if (qs) url = `${url}?${qs}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authenticated) {
    const token = getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Auto-refresh en 401 — solo una vez
  if (response.status === 401 && authenticated && !_isRetry) {
    const newTokens = await attemptRefresh();
    if (newTokens) {
      return request<T>({ ...options, _isRetry: true });
    }
    clearTokens();
    throw new ApiError(
      'La sesión expiró. Por favor inicia sesión de nuevo.',
      401,
      'SESSION_EXPIRED',
    );
  }

  // Respuesta vacía (204 No Content)
  if (response.status === 204) {
    return undefined as T;
  }

  // Parsear body de error
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    let code: string | undefined;

    try {
      const errorBody = (await response.json()) as {
        message?: string;
        error?: string;
        code?: string;
      };
      message = errorBody.message ?? errorBody.error ?? message;
      code = errorBody.code;
    } catch {
      // El cuerpo no es JSON — usar mensaje genérico
    }

    throw new ApiError(message, response.status, code);
  }

  return response.json() as Promise<T>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cliente público — agrupado por dominio
// ─────────────────────────────────────────────────────────────────────────────

export const api = {
  // ── Auth ──────────────────────────────────────────────────────────────────

  auth: {
    /**
     * POST /auth/register
     * Crea una cuenta nueva y retorna user + tokens.
     * Rate limit: 10 intentos/hora por IP.
     */
    register(body: RegisterBody): Promise<AuthResponse> {
      return request<AuthResponse>({
        method: 'POST',
        path: '/auth/register',
        body,
        authenticated: false,
      });
    },

    /**
     * POST /auth/login
     * Autentica al usuario y retorna user + tokens.
     * Rate limit: 5 intentos/15 minutos por IP.
     */
    login(body: LoginBody): Promise<AuthResponse> {
      return request<AuthResponse>({
        method: 'POST',
        path: '/auth/login',
        body,
        authenticated: false,
      });
    },

    /**
     * POST /auth/logout
     * Revoca la sesión activa en el servidor.
     * Limpia los tokens localmente después de llamar esto desde auth-store.
     */
    logout(): Promise<void> {
      return request<void>({
        method: 'POST',
        path: '/auth/logout',
      });
    },

    /**
     * GET /auth/me
     * Retorna el usuario identificado por el Bearer token.
     * Usar para hidratar el estado de auth al cargar la app.
     */
    me(): Promise<User> {
      return request<User>({
        method: 'GET',
        path: '/auth/me',
      });
    },

    /**
     * POST /auth/refresh
     * Rota el refresh token y emite un nuevo par de tokens.
     * El cliente lo llama automáticamente en cada 401.
     * Úsalo directamente solo para flujos de refresh manual.
     */
    refresh(refreshToken: string): Promise<RefreshResponse> {
      return request<RefreshResponse>({
        method: 'POST',
        path: '/auth/refresh',
        body: { refreshToken },
        authenticated: false,
      });
    },

    verifyEmail(body: { email: string; code: string }): Promise<void> {
      return request<void>({
        method: 'POST',
        path: '/auth/verify-email',
        body,
        authenticated: false,
      });
    },

    resendVerification(body: { email: string }): Promise<void> {
      return request<void>({
        method: 'POST',
        path: '/auth/resend-verification',
        body,
        authenticated: false,
      });
    },

    forgotPassword(body: { email: string }): Promise<void> {
      return request<void>({
        method: 'POST',
        path: '/auth/forgot-password',
        body,
        authenticated: false,
      });
    },

    resetPassword(body: { email: string; code: string; newPassword: string }): Promise<void> {
      return request<void>({
        method: 'POST',
        path: '/auth/reset-password',
        body,
        authenticated: false,
      });
    },
  },

  // ── Diagnostic ────────────────────────────────────────────────────────────

  diagnostic: {
    /**
     * GET /diagnostic
     * Retorna las 24 preguntas agrupadas en 6 bloques sin respuestas correctas.
     * Endpoint público.
     */
    get(): Promise<DiagnosticData> {
      return request<DiagnosticData>({
        method: 'GET',
        path: '/diagnostic',
        authenticated: false,
      });
    },

    /**
     * POST /diagnostic/submit
     * Evalúa las respuestas y retorna el nivel recomendado.
     * Rate limit: 5 evaluaciones/min por IP (protege el WorkerPool).
     * Si se incluye user_id, guarda el resultado automáticamente en background.
     */
    submit(body: SubmitDiagnosticBody): Promise<DiagnosticResult> {
      return request<DiagnosticResult>({
        method: 'POST',
        path: '/diagnostic/submit',
        body,
        authenticated: false,
      });
    },

    /**
     * POST /diagnostic/save-result
     * Persiste el nivel recomendado para el usuario autenticado sin re-evaluar.
     * Útil para guardar el resultado al cerrar la pantalla de diagnóstico.
     */
    saveResult(body: SaveResultBody): Promise<void> {
      return request<void>({
        method: 'POST',
        path: '/diagnostic/save-result',
        body,
      });
    },
  },

  // ── Levels ────────────────────────────────────────────────────────────────

  levels: {
    /**
     * GET /levels
     * Lista todos los niveles del curso con conteo de ejercicios.
     * Si hay token, el backend enriquece con progreso del usuario.
     */
    list(): Promise<LevelPublic[]> {
      return request<LevelPublic[]>({
        method: 'GET',
        path: '/levels',
        authenticated: true,
      });
    },

    /**
     * GET /levels/:id
     * Detalle del nivel con lista de ejercicios y progreso del usuario.
     */
    getDetail(id: number): Promise<LevelDetail> {
      return request<LevelDetail>({
        method: 'GET',
        path: `/levels/${id}`,
        authenticated: true,
      });
    },

    /**
     * GET /levels/:id/leaderboard
     * Top usuarios con más ejercicios completados en el nivel.
     * Endpoint público.
     */
    getLeaderboard(id: number): Promise<LeaderboardEntry[]> {
      return request<LeaderboardEntry[]>({
        method: 'GET',
        path: `/levels/${id}/leaderboard`,
        authenticated: false,
      });
    },
  },

  // ── Exercises ─────────────────────────────────────────────────────────────

  exercises: {
    /**
     * GET /exercises
     * Lista ejercicios publicados. Filtrable por level_id y difficulty.
     */
    list(params?: ExercisesListParams): Promise<ExercisePublic[]> {
      const query: Record<string, string | number | boolean | undefined> = {};
      if (params?.level_id !== undefined) query['level_id'] = params.level_id;
      if (params?.difficulty !== undefined) query['difficulty'] = params.difficulty;
      return request<ExercisePublic[]>({
        method: 'GET',
        path: '/exercises',
        query,
        authenticated: true,
      });
    },

    /**
     * GET /exercises/:id
     * Detalle del ejercicio. Si hay token, incluye progreso del usuario.
     */
    getDetail(id: string): Promise<ExerciseDetail> {
      return request<ExerciseDetail>({
        method: 'GET',
        path: `/exercises/${id}`,
        authenticated: true,
      });
    },

    /**
     * POST /exercises/:id/hint
     * Solicita el siguiente hint disponible. Registra uso en el progreso.
     */
    requestHint(id: string): Promise<HintResponse> {
      return request<HintResponse>({
        method: 'POST',
        path: `/exercises/${id}/hint`,
      });
    },

    /**
     * PATCH /exercises/:id/save-draft
     * Guarda el borrador de la query del usuario para recuperar entre sesiones.
     */
    saveDraft(id: string, query: string): Promise<void> {
      return request<void>({
        method: 'PATCH',
        path: `/exercises/${id}/save-draft`,
        body: { query },
      });
    },

    /**
     * GET /exercises/:id/progress
     * Progreso del usuario autenticado en un ejercicio específico.
     */
    getProgress(id: string): Promise<ExerciseProgress> {
      return request<ExerciseProgress>({
        method: 'GET',
        path: `/exercises/${id}/progress`,
      });
    },
  },

  // ── Playground ────────────────────────────────────────────────────────────

  playground: {
    /**
     * POST /playground/validate
     * Valida una query SQL contra el ejercicio en el servidor.
     * Actualiza el progreso si la respuesta es correcta.
     * Rate limit: PLAYGROUND_RATE_LIMIT_RPM (default 60) por usuario/minuto.
     */
    validate(exerciseId: string, query: string): Promise<ValidationResult> {
      return request<ValidationResult>({
        method: 'POST',
        path: '/playground/validate',
        body: { exercise_id: exerciseId, query },
      });
    },
  },

  // ── Users ─────────────────────────────────────────────────────────────────

  users: {
    /**
     * GET /users/me/dashboard
     * Dashboard: progreso de nivel, stats globales, actividad reciente
     * y porcentaje de completitud por nivel.
     */
    getDashboard(): Promise<DashboardResponse> {
      return request<DashboardResponse>({
        method: 'GET',
        path: '/users/me/dashboard',
      });
    },

    /**
     * GET /users/me/exercises
     * Todos los ejercicios del usuario con su estado. Filtrable por status y level_id.
     */
    getExercises(params?: UserExercisesParams): Promise<UserExercise[]> {
      const query: Record<string, string | number | boolean | undefined> = {};
      if (params?.status !== undefined) query['status'] = params.status;
      if (params?.level_id !== undefined) query['level_id'] = params.level_id;
      return request<UserExercise[]>({
        method: 'GET',
        path: '/users/me/exercises',
        query,
      });
    },

    /**
     * PATCH /users/me/profile
     * Actualiza username y/o avatar_url del usuario autenticado.
     */
    updateProfile(body: UpdateProfileBody): Promise<User> {
      return request<User>({
        method: 'PATCH',
        path: '/users/me/profile',
        body,
      });
    },

    /**
     * GET /users/:username
     * Perfil público de un usuario. Retorna null en 404 en lugar de lanzar error —
     * permite mostrar "usuario no encontrado" sin try/catch en el componente.
     */
    async getPublicProfile(username: string): Promise<PublicProfile | null> {
      try {
        return await request<PublicProfile>({
          method: 'GET',
          path: `/users/${username}`,
          authenticated: false,
        });
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }
    },
  },

  // ── Certificates ──────────────────────────────────────────────────────────

  certificates: {
    /**
     * POST /certificates/check/:level_id
     * Emite el certificado si el usuario completó el nivel.
     * Idempotente: si ya existe, lo retorna sin emitir uno nuevo.
     */
    check(levelId: number): Promise<CertificateCheckResult> {
      return request<CertificateCheckResult>({
        method: 'POST',
        path: `/certificates/check/${levelId}`,
      });
    },

    /**
     * GET /certificates/verify/:uid
     * Verificación pública de un certificado por UID.
     * No requiere auth — para compartir en LinkedIn o verificación externa.
     */
    verify(uid: string): Promise<CertificateVerifyResult> {
      return request<CertificateVerifyResult>({
        method: 'GET',
        path: `/certificates/verify/${uid}`,
        authenticated: false,
      });
    },

    /**
     * GET /certificates/mine
     * Lista todos los certificados del usuario autenticado.
     */
    getMine(): Promise<Certificate[]> {
      return request<Certificate[]>({
        method: 'GET',
        path: '/certificates/mine',
      });
    },
  },
} as const;
