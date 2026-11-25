import { fileURLToPath } from 'node:url';

/**
 * Setup global para tests.
 * Se ejecuta antes de cada test suite.
 */

// Variables de entorno mínimas para tests (sin conexión real a DB/Redis)
process.env['NODE_ENV'] = 'test';
process.env['JWT_SECRET'] = 'a'.repeat(64); // 64 chars mínimo
process.env['SESSION_COOKIE_SECRET'] = 'b'.repeat(32);
process.env['BCRYPT_ROUNDS'] = '4'; // Rounds bajos en tests para velocidad
let dbUrl = process.env['DATABASE_URL'] || 'postgresql://test:test@localhost:5432/test';
if (dbUrl.endsWith('/shopsphere')) {
  dbUrl = dbUrl.replace(/\/shopsphere$/, '/shopsphere_test');
}
process.env['DATABASE_URL'] = dbUrl;
process.env['REDIS_URL'] = process.env['REDIS_URL'] || 'redis://localhost:6379';

// El worker pool busca el dataset en ./data/dataset.db relativo al cwd. Al correr
// `npm run test` desde backend/ esa ruta no existe y los tests del playground
// fallan con "Worker pool not initialized". Por defecto se usa la copia del
// dataset que ya está versionada en el repo (frontend/public/dataset.db).
if (!process.env['PLAYGROUND_DATASET_PATH']) {
  process.env['PLAYGROUND_DATASET_PATH'] = fileURLToPath(
    new URL('../../frontend/public/dataset.db', import.meta.url),
  );
}
