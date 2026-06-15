import 'dotenv/config';
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { getRedis } from './shared/cache/redis.js';
import { pool } from './shared/db/index.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { exercisesRoutes } from './modules/exercises/exercises.routes.js';
import { playgroundRoutes } from './modules/playground/playground.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { levelsRoutes } from './modules/levels/levels.routes.js';
import { certificatesRoutes } from './modules/certificates/certificates.routes.js';
import { diagnosticRoutes } from './modules/diagnostic/diagnostic.routes.js';
import { initWorkerPool, destroyWorkerPool } from './modules/playground/worker-pool.js';
import { isAppError } from './shared/errors/index.js';
import {
  metricsRegistry,
  workersBusyGauge,
  workersIdleGauge,
  workersQueueDepthGauge,
  workersTotalGauge,
  recordHttpRequest,
} from './shared/metrics/index.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Leer versión desde package.json (evitar import assertion que no está en todos los runtimes)
function readPackageVersion(): string {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const pkgPath = resolve(__dirname, '../../package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version?: string };
    return pkg.version ?? '0.1.0';
  } catch {
    return process.env['npm_package_version'] ?? '0.1.0';
  }
}

const APP_VERSION = readPackageVersion();

/**
 * Construye y configura la instancia de Fastify.
 * Separado de server.ts para facilitar testing (importar sin arrancar el servidor).
 */
export async function buildApp() {
  // ── Resolver LOG_LEVEL de forma segura ─────────────────────────────────────
  // Seguridad: en producción se prohíben niveles verbosos (trace/debug/silent)
  // que pueden filtrar PII, tokens o queries en los logs. Si se configura un
  // nivel más verboso que el permitido, se loguea una advertencia y se hace
  // override a 'info'.
  const requestedLogLevel = process.env['LOG_LEVEL'] ?? 'info';
  const PROD_ALLOWED_LOG_LEVELS = ['info', 'warn', 'error'];
  let resolvedLogLevel = requestedLogLevel;
  if (
    process.env['NODE_ENV'] === 'production' &&
    !PROD_ALLOWED_LOG_LEVELS.includes(requestedLogLevel)
  ) {
    // eslint-disable-next-line no-console
    console.warn(
      `[security] LOG_LEVEL="${requestedLogLevel}" no permitido en producción. ` +
        `Permitidos: ${PROD_ALLOWED_LOG_LEVELS.join(', ')}. Override a "info".`,
    );
    resolvedLogLevel = 'info';
  }

  const app = Fastify({
    logger: {
      level: resolvedLogLevel,
      // Formato estructurado JSON en producción; pretty en dev
      transport:
        process.env['NODE_ENV'] !== 'production'
          ? {
              target: 'pino-pretty',
              options: { colorize: true, translateTime: 'SYS:standard' },
            }
          : undefined,
    },
    // Generar request IDs para correlación de logs
    genReqId: () => crypto.randomUUID(),
    // Seguridad: solo confiar en X-Forwarded-For si TRUST_PROXY=true está seteado
    // explícitamente. Si no, un cliente podría falsificar su IP y evadir el
    // rate limiting basado en IP. Habilitar solo detrás de un proxy de confianza
    // (Railway/Vercel/Nginx).
    trustProxy: process.env['TRUST_PROXY'] === 'true',
  });

  // ── Validar variables de entorno críticas ─────────────────────────────────
  const jwtSecret = process.env['JWT_SECRET'];
  const cookieSecret = process.env['SESSION_COOKIE_SECRET'];

  if (!jwtSecret || jwtSecret.length < 64) {
    throw new Error(
      'JWT_SECRET must be at least 64 characters. Generate with: openssl rand -hex 64',
    );
  }

  if (!cookieSecret || cookieSecret.length < 32) {
    throw new Error(
      'SESSION_COOKIE_SECRET must be at least 32 characters. Generate with: openssl rand -hex 32',
    );
  }

  // ── Plugins core ──────────────────────────────────────────────────────────

  await app.register(fastifyCookie, {
    secret: cookieSecret,
  });

  await app.register(fastifyJwt, {
    secret: jwtSecret,
    sign: {
      algorithm: 'HS256',
    },
  });

  // ── CORS ──────────────────────────────────────────────────────────────────
  // Seguridad: el default es restrictivo (fail-closed), nunca permisivo.
  // - Se leen los orígenes permitidos de ALLOWED_ORIGINS (lista separada por comas).
  //   Por compatibilidad se acepta CORS_ORIGIN como fallback de un solo origen.
  // - En producción, si no hay ningún origen configurado, se deniegan TODOS
  //   los orígenes cross-site (no se cae a "*" ni a `true`).
  // - Fuera de producción se permite localhost para DX, pero solo si no hay
  //   lista explícita.
  const allowedOriginsRaw =
    process.env['ALLOWED_ORIGINS'] ?? process.env['CORS_ORIGIN'] ?? '';
  const allowedOrigins = allowedOriginsRaw
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);

  const isProduction = process.env['NODE_ENV'] === 'production';

  let corsOriginOption: boolean | string[];
  if (allowedOrigins.length > 0) {
    // Allowlist explícita — aplica en todos los ambientes.
    corsOriginOption = allowedOrigins;
  } else if (isProduction) {
    // Fail-closed: sin allowlist en producción se deniegan todos los orígenes.
    corsOriginOption = false;
    app.log.warn(
      'ALLOWED_ORIGINS/CORS_ORIGIN no configurado en producción — CORS denegará todos los orígenes cross-site.',
    );
  } else {
    // Solo en dev/test se permite cualquier origen para facilitar el desarrollo.
    corsOriginOption = true;
  }

  await app.register(fastifyCors, {
    origin: corsOriginOption,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  });

  await app.register(fastifyRateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    redis: getRedis(),
    skip: () => process.env['NODE_ENV'] === 'test',
    // Seguridad: usar request.ip, que respeta el setting trustProxy de Fastify.
    // Solo se deriva la IP del header X-Forwarded-For cuando TRUST_PROXY=true.
    // Leer el header crudo permitiría a un atacante falsificar su IP y evadir
    // el rate limiting.
    keyGenerator: (request: any) => {
      return request.ip;
    },
    errorResponseBuilder: (_request: any, context: any) => ({
      statusCode: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Too many requests. Retry after ${context.after}.`,
    }),
  } as any);

  // ── OpenAPI / Swagger ────────────────────────────────────────────────────
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'ShopSphere SQL Platform API',
        version: '1.0.0',
        description:
          'API backend para la plataforma educativa ShopSphere SQL Course. ' +
          'Incluye autenticación, ejercicios SQL interactivos, playground con ejecución ' +
          'segura, diagnóstico de nivel, certificados y métricas de progreso.',
      },
      servers: [
        {
          url:
            process.env['NODE_ENV'] === 'production'
              ? (process.env['API_BASE_URL'] ?? 'https://api.shopsphere.dev')
              : 'http://localhost:4000',
          description:
            process.env['NODE_ENV'] === 'production' ? 'Production' : 'Development',
        },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Access token JWT obtenido en POST /auth/login o POST /auth/register',
          },
        },
      },
      tags: [
        { name: 'auth', description: 'Autenticación y gestión de sesiones' },
        { name: 'exercises', description: 'Ejercicios SQL del curso' },
        { name: 'playground', description: 'Ejecución y validación de queries SQL' },
        { name: 'users', description: 'Perfil y progreso del estudiante' },
        { name: 'levels', description: 'Niveles del curso' },
        { name: 'certificates', description: 'Certificados de completado' },
        { name: 'diagnostic', description: 'Evaluación diagnóstica de nivel inicial' },
        { name: 'system', description: 'Health check y métricas del sistema' },
      ],
    },
  });

  // Swagger UI gated tras un flag explícito (ENABLE_SWAGGER=true).
  // Seguridad: OFF por default. Debe quedar en false en producción para no
  // exponer la superficie de la API. Habilitar solo de forma deliberada.
  const swaggerEnabled = process.env['ENABLE_SWAGGER'] === 'true';
  if (swaggerEnabled) {
    await app.register(fastifySwaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
        displayRequestDuration: true,
        persistAuthorization: true,
      },
      staticCSP: true,
    });
  }

  // ── Error handler global ──────────────────────────────────────────────────
  app.setErrorHandler((error: any, request, reply) => {
    if (isAppError(error)) {
      request.log.warn(
        { code: error.code, statusCode: error.statusCode, path: request.url },
        error.message,
      );
      return reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        code: error.code,
        message: error.message,
      });
    }

    if (error.validation) {
      return reply.status(400).send({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: error.message,
      });
    }

    if (error.statusCode === 429) {
      return reply.status(429).send(error);
    }

    request.log.error(
      { err: error, path: request.url, method: request.method },
      'Unhandled error',
    );

    return reply.status(500).send({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message:
        process.env['NODE_ENV'] === 'production'
          ? 'An unexpected error occurred'
          : error.message,
    });
  });

  // ── Security headers ──────────────────────────────────────────────────────
  // Seguridad: la API es JSON-only y no debe ser embebida, sniffeada ni indexada.
  // Se aplican headers de defensa en profundidad en cada respuesta. No se usa una
  // dependencia extra (helmet) para mantener el cambio mínimo; estos cubren los
  // vectores relevantes para un backend de API:
  //   - X-Content-Type-Options: nosniff  → evita MIME sniffing
  //   - X-Frame-Options: DENY            → anti-clickjacking (la API no se enmarca)
  //   - Referrer-Policy: no-referrer     → no filtrar URLs en el header Referer
  //   - Cross-Origin-Resource-Policy     → no embebible cross-site
  //   - Content-Security-Policy          → restrictiva (respuestas no son HTML)
  //   - Permissions-Policy               → desactiva APIs del navegador no usadas
  //   - Strict-Transport-Security        → solo en producción (requiere HTTPS)
  // Se remueve X-Powered-By para no revelar el framework.
  const isProductionEnv = process.env['NODE_ENV'] === 'production';
  app.addHook('onSend', (request, reply, payload, done) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    // No clobbear la CSP/headers que @fastify/swagger-ui setea para /docs
    // (necesita inline scripts/styles para renderizar). El resto de la API es
    // JSON y recibe la política restrictiva.
    if (!request.url.startsWith('/docs')) {
      reply.header('X-Frame-Options', 'DENY');
      reply.header('Cross-Origin-Resource-Policy', 'same-site');
      reply.header(
        'Content-Security-Policy',
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
      );
    }
    if (isProductionEnv) {
      reply.header(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
    }
    reply.removeHeader('X-Powered-By');
    done(null, payload);
  });

  // ── Hook de métricas HTTP ────────────────────────────────────────────────
  // Registrar duración y conteo de requests en Prometheus
  app.addHook('onResponse', (request, reply, done) => {
    // Usar routeOptions.url para obtener la ruta parametrizada (ej: /exercises/:id)
    // Si la ruta no está registrada (404), usar la URL raw
    const route =
      (request.routeOptions as { url?: string } | undefined)?.url ??
      request.url.split('?')[0] ??
      'unknown';

    const durationMs = Math.round(reply.elapsedTime);

    recordHttpRequest(
      request.method,
      route,
      reply.statusCode,
      durationMs,
    );

    done();
  });

  // ── Health check enriquecido ──────────────────────────────────────────────
  app.get(
    '/health',
    {
      config: { rateLimit: false },
      schema: {
        tags: ['system'],
        summary: 'Health check del sistema',
        description:
          'Verifica el estado de DB, Redis y el worker pool. ' +
          'Status "degraded" indica que el servicio está operativo pero con capacidad reducida.',
        response: {
          200: {
            description: 'Sistema saludable o degradado',
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['ok', 'degraded', 'down'] },
              timestamp: { type: 'string', format: 'date-time' },
              version: { type: 'string' },
              services: {
                type: 'object',
                properties: {
                  database: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      latency_ms: { type: 'number' },
                    },
                  },
                  redis: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      latency_ms: { type: 'number' },
                    },
                  },
                  playground_workers: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      workers_total: { type: 'number' },
                      workers_busy: { type: 'number' },
                      workers_idle: { type: 'number' },
                      queue_depth: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      const SERVICE_TIMEOUT_MS = 2000;

      // ── Verificar DB ──────────────────────────────────────────────────────
      const dbResult = await checkWithTimeout(
        async () => {
          const start = Date.now();
          const client = await pool.connect();
          try {
            await client.query('SELECT 1');
          } finally {
            client.release();
          }
          return Date.now() - start;
        },
        SERVICE_TIMEOUT_MS,
      );

      // ── Verificar Redis ───────────────────────────────────────────────────
      const redisResult = await checkWithTimeout(async () => {
        const start = Date.now();
        const redis = getRedis();
        await redis.ping();
        return Date.now() - start;
      }, SERVICE_TIMEOUT_MS);

      // ── Estado del Worker Pool ────────────────────────────────────────────
      const workerMetrics = app.workerPool.metrics;
      const queueThreshold = workerMetrics.workers_total * 2;
      const workerStatus =
        workerMetrics.queue_depth > queueThreshold ? 'degraded' : 'ok';

      // Actualizar gauges de Prometheus con los datos actuales
      workersBusyGauge.set(workerMetrics.workers_busy);
      workersIdleGauge.set(workerMetrics.workers_idle);
      workersQueueDepthGauge.set(workerMetrics.queue_depth);
      workersTotalGauge.set(workerMetrics.workers_total);

      // ── Estado global ─────────────────────────────────────────────────────
      const hasServiceFailure =
        dbResult.status === 'error' || redisResult.status === 'error';
      const isWorkerDegraded = workerStatus === 'degraded';

      const globalStatus = hasServiceFailure
        ? 'degraded'
        : isWorkerDegraded
          ? 'degraded'
          : 'ok';

      return reply.status(200).send({
        status: globalStatus,
        timestamp: new Date().toISOString(),
        version: APP_VERSION,
        services: {
          database: {
            status: dbResult.status,
            latency_ms: dbResult.latencyMs,
          },
          redis: {
            status: redisResult.status,
            latency_ms: redisResult.latencyMs,
          },
          playground_workers: {
            status: workerStatus,
            workers_total: workerMetrics.workers_total,
            workers_busy: workerMetrics.workers_busy,
            workers_idle: workerMetrics.workers_idle,
            queue_depth: workerMetrics.queue_depth,
          },
        },
      });
    },
  );

  // ── Métricas Prometheus ───────────────────────────────────────────────────
  // Disponible siempre, pero en producción proteger con autenticación de red o firewall
  app.get(
    '/metrics',
    {
      config: { rateLimit: false },
      schema: {
        tags: ['system'],
        summary: 'Métricas en formato Prometheus text',
        description:
          'Expone métricas del worker pool, requests HTTP y métricas de proceso ' +
          'en formato Prometheus text/plain. Consumir con Prometheus scraper.',
      },
    },
    async (_request, reply) => {
      // Actualizar gauges del worker pool antes de responder
      const workerMetrics = app.workerPool.metrics;
      workersBusyGauge.set(workerMetrics.workers_busy);
      workersIdleGauge.set(workerMetrics.workers_idle);
      workersQueueDepthGauge.set(workerMetrics.queue_depth);
      workersTotalGauge.set(workerMetrics.workers_total);

      const metrics = await metricsRegistry.metrics();
      return reply
        .status(200)
        .header('Content-Type', metricsRegistry.contentType)
        .send(metrics);
    },
  );

  // ── Worker Pool ───────────────────────────────────────────────────────────
  // Inicialización no-fatal: si el dataset no existe el playground queda
  // deshabilitado, pero el resto del servidor (auth, niveles, etc.) funciona.
  let workerPool: Awaited<ReturnType<typeof initWorkerPool>> | null = null;
  try {
    workerPool = await initWorkerPool();
  } catch (err) {
    app.log.warn({ err }, 'Worker pool failed to initialize — playground disabled. Generate data/dataset.db to enable it.');
  }
  app.decorate('workerPool', workerPool as any);

  app.addHook('onClose', async () => {
    await destroyWorkerPool();
  });

  // ── Módulos ───────────────────────────────────────────────────────────────
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(exercisesRoutes);
  await app.register(playgroundRoutes);
  await app.register(usersRoutes);
  await app.register(levelsRoutes);
  await app.register(certificatesRoutes);
  await app.register(diagnosticRoutes);

  return app;
}

// ── Helpers internos ──────────────────────────────────────────────────────────

interface ServiceCheckResult {
  status: 'ok' | 'error';
  latencyMs: number;
}

/**
 * Ejecuta un check de servicio con timeout.
 * Si el check tarda más de timeoutMs o lanza un error, retorna status='error'.
 * No propaga la excepción — el health check debe responder siempre.
 */
async function checkWithTimeout(
  fn: () => Promise<number>,
  timeoutMs: number,
): Promise<ServiceCheckResult> {
  let timeoutHandle: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<ServiceCheckResult>((resolve) => {
    timeoutHandle = setTimeout(() => {
      resolve({ status: 'error', latencyMs: timeoutMs });
    }, timeoutMs);
  });

  const checkPromise = (async (): Promise<ServiceCheckResult> => {
    try {
      const latencyMs = await fn();
      return { status: 'ok', latencyMs };
    } catch {
      return { status: 'error', latencyMs: timeoutMs };
    }
  })();

  const result = await Promise.race([checkPromise, timeoutPromise]);

  if (timeoutHandle) clearTimeout(timeoutHandle);

  return result;
}
