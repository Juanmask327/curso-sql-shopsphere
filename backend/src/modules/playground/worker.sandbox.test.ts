import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WorkerPool } from './worker-pool.js';

/**
 * Prueba el worker real (better-sqlite3 + dataset versionado) para verificar
 * que cada envío corre aislado: lo que crea o borra un estudiante nunca
 * sobrevive al siguiente envío.
 */
describe('Playground worker — sandbox', () => {
  let pool: WorkerPool;

  beforeAll(async () => {
    pool = new WorkerPool({ poolSize: 1 });
    await pool.initialize();
  }, 60_000);

  afterAll(async () => {
    await pool.destroy();
  });

  const countInventory = async () => (await pool.execute('SELECT COUNT(*) AS n FROM inventory')).rows[0]?.[0];

  it('una SELECT simple funciona igual que antes', async () => {
    const res = await pool.execute('SELECT 1 AS value');
    expect(res.columns).toEqual(['value']);
    expect(res.rows).toEqual([[1]]);
  });

  it('permite CREATE VIEW + SELECT y devuelve el resultado de la última instrucción', async () => {
    const res = await pool.execute(
      "CREATE VIEW v_test AS SELECT country, COUNT(*) AS n FROM customers GROUP BY country;\nSELECT COUNT(*) AS paises FROM v_test;",
    );
    expect(res.columns).toEqual(['paises']);
    expect(Number(res.rows[0]?.[0])).toBeGreaterThan(0);
  });

  it('la vista creada en un envío no existe en el siguiente', async () => {
    await expect(pool.execute('SELECT * FROM v_test')).rejects.toThrow(/no such table/);
  });

  it('DELETE y COMMIT del estudiante no persisten', async () => {
    const before = await countInventory();
    const res = await pool.execute('BEGIN; DELETE FROM inventory; COMMIT; SELECT COUNT(*) AS n FROM inventory;');
    expect(res.rows[0]?.[0]).toBe(0);
    expect(await countInventory()).toBe(before);
  });

  it('ROLLBACK del estudiante deshace solo su transacción', async () => {
    const res = await pool.execute(
      "BEGIN; DELETE FROM inventory; ROLLBACK; SELECT COUNT(*) AS n FROM inventory;",
    );
    expect(res.rows[0]?.[0]).toBe(await countInventory());
  });

  it('si un trigger aborta la transacción, el dataset se recarga intacto', async () => {
    const before = await countInventory();
    await expect(
      pool.execute(`DELETE FROM inventory;
CREATE TRIGGER t_abort BEFORE INSERT ON customers BEGIN SELECT RAISE(ROLLBACK, 'abort'); END;
INSERT INTO customers (customer_id) VALUES (999999);
SELECT 1;`),
    ).rejects.toThrow(/abort/);
    expect(await countInventory()).toBe(before);
  });

  it('bloquea ATTACH y PRAGMA', async () => {
    await expect(pool.execute("ATTACH DATABASE '/tmp/x.db' AS x")).rejects.toThrow(/no está permitida/);
    await expect(pool.execute('PRAGMA query_only = OFF')).rejects.toThrow(/no está permitida/);
  });

  it('EXPLAIN QUERY PLAN funciona', async () => {
    const res = await pool.execute('EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id = 1');
    expect(res.columns).toContain('detail');
  });
});
