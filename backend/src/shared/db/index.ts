import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

const { Pool } = pg;

// Validar que la URL de DB está configurada antes de crear el pool
const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const maxConnections = parseInt(process.env['DATABASE_MAX_CONNECTIONS'] ?? '20', 10);
const connectionTimeoutMs = parseInt(
  process.env['DATABASE_CONNECTION_TIMEOUT_MS'] ?? '5000',
  10,
);

/**
 * Pool de conexiones pg. Reutilizado en todo el proceso.
 * PgBouncer se puede poner delante si el pool sizing se vuelve complejo en prod.
 */
export const pool = new Pool({
  connectionString: databaseUrl,
  max: maxConnections,
  connectionTimeoutMillis: connectionTimeoutMs,
  // En Neon (SSL required) esto es necesario
  ssl: process.env['NODE_ENV'] === 'production' ? { rejectUnauthorized: true } : false,
  // Mantener idle connections vivas para evitar cold starts en Neon free tier
  idleTimeoutMillis: 30_000,
  // Health check: emitir error si un cliente falla en checkout
  allowExitOnIdle: false,
});

// Loguear errores del pool para no perderlos silenciosamente
pool.on('error', (err) => {
  console.error('[DB Pool] Unexpected error on idle client:', err);
});

/**
 * Cliente Drizzle tipado con el schema completo.
 * Importar `db` en cualquier módulo para hacer queries.
 */
export const db = drizzle(pool, {
  schema,
  logger: process.env['NODE_ENV'] === 'development',
});

/**
 * Cierra el pool limpiamente en shutdown.
 * Llamar desde el graceful shutdown del servidor.
 */
export async function closeDb(): Promise<void> {
  await pool.end();
}
