import sqlite3, re

DB_PATH = "data/dataset.db"
conn = sqlite3.connect(DB_PATH)
conn.isolation_level = None

query = """-- Transacción atómica con SAVEPOINT
-- Diego Morales → Briefing 8.8

BEGIN;

-- Paso 1: registrar el pedido
INSERT INTO orders (order_id, customer_id, order_date, status)
VALUES (99001, 42, '2026-06-01 10:00:00', 'pending');

-- Punto de restauración: permite rollback parcial del descuento de stock_qty
SAVEPOINT antes_del_descuento;

-- Paso 2: descontar 2 unidades del producto 1
UPDATE inventory
SET    stock_qty      = stock_qty - 2,
       last_updated = '2026-06-01 10:00:00'
WHERE  product_id = 1
  AND  stock_qty >= 2;

ROLLBACK;
"""

statements = query.split(";")
for i, stmt in enumerate(statements):
    lines = stmt.split("\n")
    clean_lines = [l for l in lines if not l.strip().startswith("--")]
    stmt_clean = "\n".join(clean_lines).strip()
    print(f"=== Statement {i} ===")
    print(f"  Clean: {repr(stmt_clean[:100])}")
    if not stmt_clean:
        print("  [SKIP - empty]")
        continue
    try:
        cursor = conn.cursor()
        cursor.execute(stmt_clean)
        print(f"  [OK] description={cursor.description}")
    except Exception as e:
        print(f"  [ERROR] {e}")

conn.close()
