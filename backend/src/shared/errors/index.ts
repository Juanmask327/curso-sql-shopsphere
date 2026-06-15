/**
 * Errores tipados del dominio.
 * Cada error lleva un código HTTP semántico y un código de error legible
 * para el cliente. Fastify los captura en el error handler global.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: string, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ── 400 Bad Request ───────────────────────────────────────────────────────────
export class ValidationError extends AppError {
  constructor(message: string, code = 'VALIDATION_ERROR') {
    super(message, 400, code);
  }
}

// ── 401 Unauthorized ──────────────────────────────────────────────────────────
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

// ── 403 Forbidden ─────────────────────────────────────────────────────────────
export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions', code = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

// ── 404 Not Found ─────────────────────────────────────────────────────────────
export class NotFoundError extends AppError {
  constructor(resource: string, code = 'NOT_FOUND') {
    super(`${resource} not found`, 404, code);
  }
}

// ── 409 Conflict ──────────────────────────────────────────────────────────────
export class ConflictError extends AppError {
  constructor(message: string, code = 'CONFLICT') {
    super(message, 409, code);
  }
}

// ── 429 Too Many Requests ─────────────────────────────────────────────────────
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Try again later.', code = 'RATE_LIMIT_EXCEEDED') {
    super(message, 429, code);
  }
}

// ── 503 Service Unavailable ───────────────────────────────────────────────────
export class ServiceUnavailableError extends AppError {
  constructor(
    message = 'Service temporarily unavailable. Try again later.',
    code = 'SERVICE_UNAVAILABLE',
  ) {
    super(message, 503, code);
  }
}

// ── 500 Internal Server Error ─────────────────────────────────────────────────
export class InternalError extends AppError {
  constructor(message = 'An unexpected error occurred', code = 'INTERNAL_ERROR') {
    // isOperational = false: estos errores indican bugs, no condiciones esperadas
    super(message, 500, code, false);
  }
}

// ── Auth específicos ──────────────────────────────────────────────────────────
export class InvalidCredentialsError extends UnauthorizedError {
  constructor() {
    // Mensaje genérico deliberado — no revelar si el email existe
    super('Invalid email or password', 'INVALID_CREDENTIALS');
  }
}

export class TokenExpiredError extends UnauthorizedError {
  constructor() {
    super('Token has expired', 'TOKEN_EXPIRED');
  }
}

export class TokenInvalidError extends UnauthorizedError {
  constructor() {
    super('Invalid token', 'TOKEN_INVALID');
  }
}

export class SessionRevokedError extends UnauthorizedError {
  constructor() {
    super('Session has been revoked', 'SESSION_REVOKED');
  }
}

export class EmailAlreadyExistsError extends ConflictError {
  constructor() {
    super('An account with this email already exists', 'EMAIL_ALREADY_EXISTS');
  }
}

export class UsernameAlreadyExistsError extends ConflictError {
  constructor() {
    super('This username is already taken', 'USERNAME_ALREADY_EXISTS');
  }
}

/**
 * Type guard para verificar si un error es un AppError.
 * Útil en catch blocks para discriminar errores operacionales de bugs.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
