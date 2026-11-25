/**
 * Utilidades para scripts SQL de varias instrucciones (sin dependencias, para
 * poder usarse dentro del Worker Thread).
 *
 * splitSqlStatements() separa por `;` respetando:
 *   - literales de texto '...' (con '' como escape)
 *   - identificadores "..." , `...` y [...]
 *   - comentarios -- hasta fin de línea y /* ... *\/
 *   - cuerpos BEGIN ... END de CREATE TRIGGER (que llevan `;` adentro)
 * Las instrucciones que solo contienen comentarios o espacios se descartan.
 */

export function splitSqlStatements(script: string): string[] {
  const statements: string[] = [];
  let current = '';
  let i = 0;
  const n = script.length;
  // Profundidad de bloques BEGIN...END dentro de un CREATE TRIGGER
  let triggerDepth = 0;

  const flush = () => {
    if (hasCode(current)) statements.push(current.trim());
    current = '';
    triggerDepth = 0;
  };

  while (i < n) {
    const ch = script[i]!;
    const next = script[i + 1];

    // Comentario de línea
    if (ch === '-' && next === '-') {
      const end = script.indexOf('\n', i);
      const stop = end === -1 ? n : end;
      current += script.slice(i, stop);
      i = stop;
      continue;
    }

    // Comentario de bloque
    if (ch === '/' && next === '*') {
      const end = script.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      current += script.slice(i, stop);
      i = stop;
      continue;
    }

    // Literales y identificadores entre comillas
    if (ch === "'" || ch === '"' || ch === '`' || ch === '[') {
      const close = ch === '[' ? ']' : ch;
      let j = i + 1;
      while (j < n) {
        if (script[j] === close) {
          // Comilla duplicada = escape ('' o "")
          if (close !== ']' && script[j + 1] === close) {
            j += 2;
            continue;
          }
          break;
        }
        j++;
      }
      const stop = Math.min(j + 1, n);
      current += script.slice(i, stop);
      i = stop;
      continue;
    }

    // Palabras: seguir BEGIN/CASE/END dentro de CREATE TRIGGER
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_$]/.test(script[j]!)) j++;
      const word = script.slice(i, j).toUpperCase();
      if (isCreateTrigger(current + word)) {
        if (word === 'BEGIN' || word === 'CASE') triggerDepth++;
        else if (word === 'END' && triggerDepth > 0) triggerDepth--;
      }
      current += script.slice(i, j);
      i = j;
      continue;
    }

    if (ch === ';' && triggerDepth === 0) {
      flush();
      i++;
      continue;
    }

    current += ch;
    i++;
  }

  flush();
  return statements;
}

/** Primera palabra clave de la instrucción (ignorando comentarios), en mayúsculas. */
export function firstKeyword(statement: string): string {
  const code = stripComments(statement).trimStart();
  const match = /^[A-Za-z_]+/.exec(code);
  return match ? match[0].toUpperCase() : '';
}

/**
 * Nombre de la vista si la instrucción es `CREATE [TEMP] VIEW nombre ...`
 * (sin IF NOT EXISTS). Devuelve null en cualquier otro caso.
 */
export function createViewName(statement: string): string | null {
  const code = stripComments(statement).trimStart();
  const match = /^CREATE\s+(?:TEMP(?:ORARY)?\s+)?VIEW\s+(?!IF\s+NOT\s+EXISTS\b)((?:[A-Za-z_][A-Za-z0-9_]*\.)?[A-Za-z_][A-Za-z0-9_]*)/i.exec(
    code,
  );
  return match ? match[1]! : null;
}

function isCreateTrigger(text: string): boolean {
  return /^CREATE\s+(TEMP\s+|TEMPORARY\s+)?TRIGGER\b/i.test(stripComments(text).trimStart());
}

function stripComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, ' ').replace(/\/\*[\s\S]*?(\*\/|$)/g, ' ');
}

function hasCode(sql: string): boolean {
  return stripComments(sql).trim().length > 0;
}
