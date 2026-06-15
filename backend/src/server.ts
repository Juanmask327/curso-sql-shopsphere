import 'dotenv/config';
import { buildApp } from './app.js';
import { closeDb } from './shared/db/index.js';
import { closeRedis } from './shared/cache/redis.js';

const PORT = parseInt(process.env['PORT'] ?? '3001', 10);
const HOST = process.env['HOST'] ?? '0.0.0.0';

async function main(): Promise<void> {
  const app = await buildApp();

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  // Fastify cierra el servidor, espera a que terminen los requests en vuelo,
  // luego cerramos las conexiones a DB y Redis.
  const shutdown = async (signal: string): Promise<void> => {
    app.log.info(`Received ${signal}. Starting graceful shutdown...`);

    try {
      // Fastify cierra el servidor y rechaza nuevas conexiones
      await app.close();
      app.log.info('HTTP server closed');

      // Cerrar conexiones a infraestructura
      await Promise.allSettled([
        closeDb().then(() => app.log.info('Database pool closed')),
        closeRedis().then(() => app.log.info('Redis connection closed')),
      ]);

      app.log.info('Graceful shutdown complete');
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  // Capturar promesas rechazadas no manejadas — no dejar que el proceso muera silenciosamente
  process.on('unhandledRejection', (reason) => {
    app.log.error({ reason }, 'Unhandled promise rejection');
    // En producción, podría ser mejor hacer shutdown aquí si el estado es desconocido
  });

  // ── Arrancar servidor ─────────────────────────────────────────────────────
  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Server listening on ${HOST}:${PORT}`);
    app.log.info(`Environment: ${process.env['NODE_ENV'] ?? 'development'}`);
  } catch (err) {
    app.log.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

void main();
