// src/modules/playground/worker.ts
import { parentPort, workerData } from "worker_threads";
import { readFileSync } from "node:fs";
import Database from "better-sqlite3";

// src/modules/playground/sql-script.ts
function splitSqlStatements(script) {
  const statements = [];
  let current = "";
  let i = 0;
  const n = script.length;
  let triggerDepth = 0;
  const flush = () => {
    if (hasCode(current)) statements.push(current.trim());
    current = "";
    triggerDepth = 0;
  };
  while (i < n) {
    const ch = script[i];
    const next = script[i + 1];
    if (ch === "-" && next === "-") {
      const end = script.indexOf("\n", i);
      const stop = end === -1 ? n : end;
      current += script.slice(i, stop);
      i = stop;
      continue;
    }
    if (ch === "/" && next === "*") {
      const end = script.indexOf("*/", i + 2);
      const stop = end === -1 ? n : end + 2;
      current += script.slice(i, stop);
      i = stop;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`" || ch === "[") {
      const close = ch === "[" ? "]" : ch;
      let j = i + 1;
      while (j < n) {
        if (script[j] === close) {
          if (close !== "]" && script[j + 1] === close) {
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
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_$]/.test(script[j])) j++;
      const word = script.slice(i, j).toUpperCase();
      if (isCreateTrigger(current + word)) {
        if (word === "BEGIN" || word === "CASE") triggerDepth++;
        else if (word === "END" && triggerDepth > 0) triggerDepth--;
      }
      current += script.slice(i, j);
      i = j;
      continue;
    }
    if (ch === ";" && triggerDepth === 0) {
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
function firstKeyword(statement) {
  const code = stripComments(statement).trimStart();
  const match = /^[A-Za-z_]+/.exec(code);
  return match ? match[0].toUpperCase() : "";
}
function createViewName(statement) {
  const code = stripComments(statement).trimStart();
  const match = /^CREATE\s+(?:TEMP(?:ORARY)?\s+)?VIEW\s+(?!IF\s+NOT\s+EXISTS\b)((?:[A-Za-z_][A-Za-z0-9_]*\.)?[A-Za-z_][A-Za-z0-9_]*)/i.exec(
    code
  );
  return match ? match[1] : null;
}
function isCreateTrigger(text) {
  return /^CREATE\s+(TEMP\s+|TEMPORARY\s+)?TRIGGER\b/i.test(stripComments(text).trimStart());
}
function stripComments(sql) {
  return sql.replace(/--[^\n]*/g, " ").replace(/\/\*[\s\S]*?(\*\/|$)/g, " ");
}
function hasCode(sql) {
  return stripComments(sql).trim().length > 0;
}

// src/modules/playground/worker.ts
var db = null;
var datasetBuffer = null;
var SQLITE_HEAP_LIMIT_BYTES = 256 * 1024 * 1024;
var MAX_STATEMENTS = 30;
var BLOCKED_KEYWORDS = /* @__PURE__ */ new Set(["ATTACH", "DETACH", "VACUUM", "PRAGMA"]);
function openInMemory() {
  if (!datasetBuffer) throw new Error("Dataset buffer not loaded");
  const memDb = new Database(datasetBuffer);
  memDb.pragma(`hard_heap_limit = ${SQLITE_HEAP_LIMIT_BYTES}`);
  return memDb;
}
function initializeDatabase(datasetPath) {
  try {
    const buf = readFileSync(datasetPath);
    if (buf.length > 19 && buf[18] === 2 && buf[19] === 2) {
      buf[18] = 1;
      buf[19] = 1;
    }
    datasetBuffer = buf;
    db = openInMemory();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    parentPort?.postMessage({
      type: "error",
      requestId: "init",
      error: `Failed to initialize SQLite dataset: ${msg}`,
      error_type: "initialization_error"
    });
    process.exit(1);
  }
}
function resetDatabase() {
  try {
    db?.close();
  } catch {
  }
  db = openInMemory();
}
var SandboxError = class extends Error {
};
function translateTransactionControl(keyword, statement, stack) {
  const normalized = statement.trim().replace(/\s+/g, " ").toUpperCase();
  if (keyword === "BEGIN") {
    const name = `user_tx_${stack.length}`;
    stack.push(name);
    return `SAVEPOINT ${name}`;
  }
  if (keyword === "COMMIT" || keyword === "END") {
    const name = stack.pop();
    return name ? `RELEASE ${name}` : null;
  }
  if (keyword === "ROLLBACK" && !/^ROLLBACK( TRANSACTION)? TO /.test(normalized)) {
    const name = stack.pop();
    return name ? `ROLLBACK TO ${name}; RELEASE ${name}` : null;
  }
  return void 0;
}
function executeQuery(requestId, query, maxRows) {
  if (!db) {
    return {
      type: "error",
      requestId,
      error: "Database not initialized",
      error_type: "initialization_error"
    };
  }
  const start = performance.now();
  const MAX_SCAN_ROWS = 5e4;
  const MAX_RESPONSE_ROWS = Math.min(maxRows ?? 1e3, MAX_SCAN_ROWS);
  const statements = splitSqlStatements(query);
  if (statements.length === 0) {
    return { type: "error", requestId, error: "La consulta est\xE1 vac\xEDa.", error_type: "execution_error" };
  }
  if (statements.length > MAX_STATEMENTS) {
    return {
      type: "error",
      requestId,
      error: `Demasiadas instrucciones (${statements.length}). El m\xE1ximo es ${MAX_STATEMENTS}.`,
      error_type: "execution_error"
    };
  }
  const database = db;
  database.exec("BEGIN");
  const txStack = [];
  try {
    let columns = [];
    let serializedRows = [];
    let scanned = 0;
    for (let i = 0; i < statements.length; i++) {
      if (!database.inTransaction) {
        throw new SandboxError("La sesi\xF3n de ejecuci\xF3n se cerr\xF3 inesperadamente. Intenta de nuevo.");
      }
      const sqlText = statements[i];
      const keyword = firstKeyword(sqlText);
      const isLast = i === statements.length - 1;
      if (BLOCKED_KEYWORDS.has(keyword)) {
        throw new SandboxError(`La instrucci\xF3n ${keyword} no est\xE1 permitida en el playground.`);
      }
      const translated = translateTransactionControl(keyword, sqlText, txStack);
      if (translated !== void 0) {
        if (translated) database.exec(translated);
        if (isLast) {
          columns = [];
          serializedRows = [];
          scanned = 0;
        }
        continue;
      }
      const viewName = createViewName(sqlText);
      if (viewName) database.exec(`DROP VIEW IF EXISTS ${viewName}`);
      const stmt = database.prepare(sqlText);
      if (!stmt.reader) {
        stmt.run();
        if (isLast) {
          columns = [];
          serializedRows = [];
          scanned = 0;
        }
        continue;
      }
      const stmtColumns = stmt.columns().map((c) => c.name);
      const rows = [];
      let count = 0;
      for (const row of stmt.iterate()) {
        count++;
        if (isLast && rows.length < MAX_RESPONSE_ROWS) {
          rows.push(stmtColumns.map((col) => row[col] ?? null));
        }
        if (count >= MAX_SCAN_ROWS) break;
      }
      if (isLast) {
        columns = stmtColumns;
        serializedRows = rows;
        scanned = count;
      }
    }
    const execution_ms = Math.round(performance.now() - start);
    return {
      type: "result",
      requestId,
      columns,
      rows: serializedRows,
      row_count: scanned,
      execution_ms
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      type: "error",
      requestId,
      error: msg,
      error_type: "execution_error"
    };
  } finally {
    if (database.inTransaction) {
      try {
        database.exec("ROLLBACK");
      } catch {
        resetDatabase();
      }
    } else {
      resetDatabase();
    }
  }
}
if (!parentPort) {
  throw new Error("This file must be run as a Worker Thread, not directly.");
}
var initData = workerData;
if (!initData?.datasetPath) {
  parentPort.postMessage({
    type: "error",
    requestId: "init",
    error: "Worker started without datasetPath in workerData",
    error_type: "initialization_error"
  });
  process.exit(1);
}
initializeDatabase(initData.datasetPath);
parentPort.postMessage({ type: "ready" });
parentPort.on("message", (msg) => {
  if (msg.type !== "query") return;
  const result = executeQuery(msg.requestId, msg.query, msg.maxRows);
  parentPort.postMessage(result);
});
