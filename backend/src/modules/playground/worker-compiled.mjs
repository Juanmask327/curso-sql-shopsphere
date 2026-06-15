import { parentPort, workerData } from "worker_threads";
import Database from "better-sqlite3";
let db = null;
function initializeDatabase(datasetPath) {
  try {
    db = new Database(datasetPath, { readonly: true });
    db.pragma("query_only = ON");
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
function executeQuery(requestId, query) {
  if (!db) {
    return {
      type: "error",
      requestId,
      error: "Database not initialized",
      error_type: "initialization_error"
    };
  }
  const start = performance.now();
  try {
    const stmt = db.prepare(query);
    if (stmt.readonly === false) {
      return {
        type: "error",
        requestId,
        error: "Only SELECT queries are allowed in the playground. Mutations (INSERT, UPDATE, DELETE, DROP, etc.) are not permitted.",
        error_type: "execution_error"
      };
    }
    const MAX_RESPONSE_ROWS = 1e3;
    const MAX_SCAN_ROWS = 5e4;
    const columns = stmt.columns().map((c) => c.name);
    const serializedRows = [];
    let scanned = 0;
    for (const row of stmt.iterate()) {
      scanned++;
      if (serializedRows.length < MAX_RESPONSE_ROWS) {
        serializedRows.push(columns.map((col) => row[col] ?? null));
      }
      if (scanned >= MAX_SCAN_ROWS)
        break;
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
  }
}
if (!parentPort) {
  throw new Error("This file must be run as a Worker Thread, not directly.");
}
const initData = workerData;
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
  if (msg.type !== "query")
    return;
  const result = executeQuery(msg.requestId, msg.query);
  parentPort.postMessage(result);
});
