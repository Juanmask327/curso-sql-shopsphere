/**
 * Métricas Prometheus para el backend de ShopSphere.
 *
 * Usa prom-client para registrar y exponer métricas en formato Prometheus text.
 * Las métricas se exponen en GET /metrics (solo en non-production por defecto,
 * configurable con METRICS_ENABLED=true).
 *
 * Métricas registradas:
 * - playground_workers_busy / idle / queue_depth: estado del worker pool
 * - http_requests_total: contador de requests HTTP por método, ruta y status
 */

import {
  Registry,
  Gauge,
  Counter,
  collectDefaultMetrics,
} from 'prom-client';

// ── Registry aislado (no usar el registro global para evitar conflictos en tests) ──

export const metricsRegistry = new Registry();
metricsRegistry.setDefaultLabels({ service: 'shopsphere-backend' });

// Recolectar métricas de proceso estándar (memory, cpu, event loop)
collectDefaultMetrics({ register: metricsRegistry });

// ── Worker Pool ───────────────────────────────────────────────────────────────

export const workersBusyGauge = new Gauge({
  name: 'playground_workers_busy',
  help: 'Número de workers actualmente procesando queries',
  registers: [metricsRegistry],
});

export const workersIdleGauge = new Gauge({
  name: 'playground_workers_idle',
  help: 'Número de workers libres esperando trabajo',
  registers: [metricsRegistry],
});

export const workersQueueDepthGauge = new Gauge({
  name: 'playground_workers_queue_depth',
  help: 'Número de queries en cola esperando un worker libre',
  registers: [metricsRegistry],
});

export const workersTotalGauge = new Gauge({
  name: 'playground_workers_total',
  help: 'Número total de workers en el pool',
  registers: [metricsRegistry],
});

// ── HTTP Requests ─────────────────────────────────────────────────────────────

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Número total de requests HTTP procesadas',
  labelNames: ['method', 'route', 'status'] as const,
  registers: [metricsRegistry],
});

export const httpRequestDurationMs = new Gauge({
  name: 'http_request_duration_ms',
  help: 'Duración de las últimas requests HTTP en milisegundos',
  labelNames: ['method', 'route'] as const,
  registers: [metricsRegistry],
});

// ── Diagnostic ────────────────────────────────────────────────────────────────

export const diagnosticSubmissionsTotal = new Counter({
  name: 'diagnostic_submissions_total',
  help: 'Número total de evaluaciones diagnósticas completadas',
  registers: [metricsRegistry],
});

// ── Helper: registrar request HTTP ───────────────────────────────────────────

/**
 * Registra una request HTTP completada en las métricas.
 * Llamar desde el hook onResponse de Fastify.
 *
 * Normaliza la ruta reemplazando parámetros variables (:id, :uid, etc.)
 * para no explotar la cardinalidad de las labels.
 */
export function recordHttpRequest(
  method: string,
  rawRoute: string,
  statusCode: number,
  durationMs: number,
): void {
  // Normalizar rutas con parámetros — evitar high cardinality
  const route = normalizeRoute(rawRoute);
  const status = String(statusCode);

  httpRequestsTotal.inc({ method, route, status });
  httpRequestDurationMs.set({ method, route }, durationMs);
}

/**
 * Normaliza rutas de Fastify para evitar alta cardinalidad en métricas.
 * Fastify expone routeOptions.url con la ruta parametrizada (ej: /users/:id).
 * Esta función convierte IDs específicos a placeholders si por alguna razón
 * llegan sin parametrizar.
 */
function normalizeRoute(route: string): string {
  if (!route) return 'unknown';

  // Reemplazar UUIDs por :id
  return route
    .replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      ':id',
    )
    // Reemplazar números puros por :id
    .replace(/\/\d+/g, '/:id');
}
