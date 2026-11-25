import type { FastifyRequest, FastifyReply } from 'fastify';
import { OAuth2Client } from 'google-auth-library';
import { randomBytes } from 'crypto';
import {
  RegisterSchema,
  LoginSchema,
  RefreshSchema,
  VerifyEmailSchema,
  ResendVerificationSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from './auth.schemas.js';
import * as authService from './auth.service.js';
import type { JwtSigner } from './auth.service.js';
import { ValidationError } from '../../shared/errors/index.js';
import { getRedis } from '../../shared/cache/redis.js';

const GOOGLE_REDIRECT_URI =
  process.env['GOOGLE_REDIRECT_URI'] ?? 'http://localhost:3001/auth/oauth/google/callback';
const FRONTEND_URL = process.env['CORS_ORIGIN'] ?? 'http://localhost:3000';

function buildGoogleClient(): OAuth2Client {
  return new OAuth2Client(
    process.env['GOOGLE_CLIENT_ID'],
    process.env['GOOGLE_CLIENT_SECRET'],
    GOOGLE_REDIRECT_URI,
  );
}

/**
 * Adaptador entre Fastify y el auth service.
 * Solo maneja request/response — sin lógica de negocio aquí.
 */

/**
 * Construye el JwtSigner desde la instancia de Fastify.
 * El `sign` de @fastify/jwt espera SignPayloadType (= JwtPayload con la augmentación).
 * El `verify` retorna el tipo genérico pasado como parámetro.
 */
function buildJwtSigner(request: FastifyRequest): JwtSigner {
  return {
    // request.server.jwt.sign acepta SignPayloadType = JwtPayload (via augmentación)
    sign: (payload, options) =>
      request.server.jwt.sign(payload, options),
    verify: <T extends object | string>(token: string) =>
      request.server.jwt.verify<T>(token),
  };
}

export async function registerHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const parsed = RegisterSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid input');
  }

  const result = await authService.register(parsed.data, buildJwtSigner(request), {
    userAgent: request.headers['user-agent'],
    ipAddress: request.ip,
  });

  return reply.status(201).send(result);
}

export async function loginHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const parsed = LoginSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid input');
  }

  const result = await authService.login(parsed.data, buildJwtSigner(request), {
    userAgent: request.headers['user-agent'],
    ipAddress: request.ip,
  });

  return reply.status(200).send(result);
}

export async function logoutHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  // request.user es JwtPayload gracias a la augmentación en auth.guard.ts
  const { sub, sessionId } = request.user;
  await authService.logout(sessionId, sub);
  return reply.status(204).send();
}

export async function getMeHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const { sub } = request.user;
  const result = await authService.getMe(sub);
  return reply.status(200).send(result);
}

export async function refreshHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const parsed = RefreshSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid input');
  }

  const result = await authService.refresh(parsed.data.refreshToken, buildJwtSigner(request), {
    userAgent: request.headers['user-agent'],
    ipAddress: request.ip,
  });

  return reply.status(200).send(result);
}

export async function verifyEmailHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const parsed = VerifyEmailSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid input');
  }
  await authService.verifyEmail(parsed.data.email, parsed.data.code);
  return reply.status(204).send();
}

export async function resendVerificationHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const parsed = ResendVerificationSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid input');
  }
  await authService.resendVerificationEmail(parsed.data.email);
  return reply.status(204).send();
}

export async function forgotPasswordHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const parsed = ForgotPasswordSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid input');
  }
  await authService.forgotPassword(parsed.data.email);
  return reply.status(204).send();
}

export async function resetPasswordHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const parsed = ResetPasswordSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid input');
  }
  await authService.resetPassword(parsed.data.email, parsed.data.code, parsed.data.newPassword);
  return reply.status(204).send();
}

export async function googleOAuthRedirectHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply | void> {
  if (!process.env['GOOGLE_CLIENT_ID'] || !process.env['GOOGLE_CLIENT_SECRET']) {
    return reply.status(503).send({ statusCode: 503, message: 'Google OAuth no está configurado' });
  }

  const state = randomBytes(16).toString('hex');
  const redis = getRedis();
  await redis.setex(`oauth:state:${state}`, 600, '1'); // válido 10 minutos

  const client = buildGoogleClient();
  const url = client.generateAuthUrl({
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    state,
    prompt: 'select_account',
  });

  return reply.redirect(url);
}

export async function googleOAuthCallbackHandler(
  request: FastifyRequest<{ Querystring: { code?: string; state?: string; error?: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply | void> {
  const { code, state, error } = request.query;

  if (error || !code || !state) {
    return reply.redirect(`${FRONTEND_URL}/login?error=oauth_denied`);
  }

  const redis = getRedis();
  const stateKey = `oauth:state:${state}`;
  const stateValid = await redis.get(stateKey);
  if (!stateValid) {
    return reply.redirect(`${FRONTEND_URL}/login?error=oauth_invalid`);
  }
  await redis.del(stateKey);

  try {
    const client = buildGoogleClient();
    const { tokens: googleTokens } = await client.getToken(code);
    if (!googleTokens.id_token) throw new Error('No id_token from Google');

    const ticket = await client.verifyIdToken({
      idToken: googleTokens.id_token,
      audience: process.env['GOOGLE_CLIENT_ID'] ?? '',
    });

    const payload = ticket.getPayload();
    if (!payload?.email) throw new Error('No email in Google payload');

    const result = await authService.loginWithGoogle(
      {
        email: payload.email,
        name: payload.name ?? payload.email,
        picture: payload.picture,
      },
      buildJwtSigner(request),
      { userAgent: request.headers['user-agent'], ipAddress: request.ip },
    );

    // Hash fragment: no llega al servidor, no aparece en access logs
    const callbackUrl =
      `${FRONTEND_URL}/oauth-callback` +
      `#access=${encodeURIComponent(result.tokens.accessToken)}` +
      `&refresh=${encodeURIComponent(result.tokens.refreshToken)}` +
      (result.isNewUser ? '&new=1' : '');

    return reply.redirect(callbackUrl);
  } catch {
    return reply.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
  }
}
