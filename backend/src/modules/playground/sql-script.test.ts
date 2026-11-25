import { describe, it, expect } from 'vitest';
import { splitSqlStatements, firstKeyword, createViewName } from './sql-script.js';

describe('splitSqlStatements', () => {
  it('una sola query sin punto y coma', () => {
    expect(splitSqlStatements('SELECT 1')).toEqual(['SELECT 1']);
  });

  it('separa varias instrucciones e ignora las vacías', () => {
    expect(splitSqlStatements('SELECT 1;  ;\nSELECT 2;\n')).toEqual(['SELECT 1', 'SELECT 2']);
  });

  it('no corta dentro de textos, identificadores ni comentarios', () => {
    const sql = `SELECT 'a;b', "c;d", [e;f] -- comentario; con punto y coma
/* bloque; */ FROM t; SELECT 'it''s; ok'`;
    const parts = splitSqlStatements(sql);
    expect(parts).toHaveLength(2);
    expect(parts[1]).toBe("SELECT 'it''s; ok'");
  });

  it('descarta instrucciones que solo tienen comentarios', () => {
    expect(splitSqlStatements('SELECT 1;\n-- Si retorna 0 filas, todo bien.\n')).toEqual(['SELECT 1']);
  });

  it('mantiene completo el cuerpo BEGIN...END de un trigger', () => {
    const sql = `CREATE TRIGGER trg AFTER INSERT ON t BEGIN
  UPDATE x SET n = CASE WHEN n > 0 THEN n ELSE 0 END;
  INSERT INTO log VALUES (1);
END;
SELECT 1;`;
    const parts = splitSqlStatements(sql);
    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatch(/^CREATE TRIGGER[\s\S]*END$/);
  });

  it('BEGIN de una transacción no se confunde con un trigger', () => {
    expect(splitSqlStatements('BEGIN; SELECT 1; COMMIT;')).toEqual(['BEGIN', 'SELECT 1', 'COMMIT']);
  });
});

describe('firstKeyword', () => {
  it('ignora comentarios iniciales y normaliza a mayúsculas', () => {
    expect(firstKeyword('-- hola\n/* x */  attach database')).toBe('ATTACH');
    expect(firstKeyword('with x as (select 1) select * from x')).toBe('WITH');
  });
});

describe('createViewName', () => {
  it('detecta CREATE VIEW y CREATE TEMP VIEW', () => {
    expect(createViewName('CREATE VIEW v_x AS SELECT 1')).toBe('v_x');
    expect(createViewName('-- c\ncreate temporary view main.v_y as select 1')).toBe('main.v_y');
  });
  it('ignora IF NOT EXISTS y otras instrucciones', () => {
    expect(createViewName('CREATE VIEW IF NOT EXISTS v_x AS SELECT 1')).toBeNull();
    expect(createViewName('SELECT * FROM v_x')).toBeNull();
  });
});
