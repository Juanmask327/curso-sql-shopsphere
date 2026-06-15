import { z } from 'zod';

// ── Schemas de entrada (validación en boundary) ───────────────────────────────

export const RegisterSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email format')
    .toLowerCase()
    .max(255, 'Email must be at most 255 characters'),
  username: z
    .string({ required_error: 'Username is required' })
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens',
    ),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
});

export const LoginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email format')
    .toLowerCase(),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});

export const RefreshSchema = z.object({
  refreshToken: z.string({ required_error: 'Refresh token is required' }).min(1),
});

export const VerifyEmailSchema = z.object({
  email: z.string().email('Invalid email').toLowerCase(),
  code: z
    .string()
    .length(6, 'Code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Code must contain only digits'),
});

export const ResendVerificationSchema = z.object({
  email: z.string().email('Invalid email').toLowerCase(),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email').toLowerCase(),
});

export const ResetPasswordSchema = z.object({
  email: z.string().email('Invalid email').toLowerCase(),
  code: z
    .string()
    .length(6, 'Code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Code must contain only digits'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
});

// ── Tipos derivados ───────────────────────────────────────────────────────────
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RefreshInput = z.infer<typeof RefreshSchema>;
export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof ResendVerificationSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

// ── Schemas de respuesta (para documentación y serialización) ─────────────────

export const UserPublicSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string(),
  role: z.enum(['student', 'admin', 'instructor']),
  xpTotal: z.number(),
  currentLevel: z.number(),
  avatarUrl: z.string().nullable(),
  isActive: z.boolean(),
  emailVerified: z.boolean(),
  createdAt: z.string().datetime(),
});

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(), // segundos hasta expiración del access token
});

export const AuthResponseSchema = z.object({
  user: UserPublicSchema,
  tokens: AuthTokensSchema,
});

export type UserPublic = z.infer<typeof UserPublicSchema>;
export type AuthTokens = z.infer<typeof AuthTokensSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
