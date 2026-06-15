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
