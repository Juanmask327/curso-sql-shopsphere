"""
Construye data/dataset.db a partir de dataset/shopsphere-seed.sql
usando el módulo sqlite3 estándar de Python (no requiere sqlite3 CLI).

Uso: python dataset/build_db.py
"""

import os
import sqlite3

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

sql_path = os.path.join(SCRIPT_DIR, "shopsphere-seed.sql")
db_path = os.path.join(PROJECT_ROOT, "data", "dataset.db")

SCHEMA = """
CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY, first_name TEXT, last_name TEXT,
  email TEXT UNIQUE, city TEXT, country TEXT, signup_date TEXT, segment TEXT
);
CREATE TABLE categories (
  category_id INTEGER PRIMARY KEY, name TEXT, description TEXT
);
CREATE TABLE products (
  product_id INTEGER PRIMARY KEY, name TEXT, category_id INTEGER,
  price REAL, cost REAL, sku TEXT UNIQUE
);
CREATE TABLE marketing_campaigns (
  campaign_id INTEGER PRIMARY KEY, name TEXT, channel TEXT,
  start_date TEXT, end_date TEXT, budget REAL, revenue_generated REAL
);
CREATE TABLE orders (
  order_id INTEGER PRIMARY KEY, customer_id INTEGER,
  order_date TEXT, status TEXT, channel TEXT, campaign_id INTEGER
);
CREATE TABLE order_items (
  item_id INTEGER PRIMARY KEY, order_id INTEGER, product_id INTEGER,
  quantity INTEGER, unit_price REAL, discount REAL
);
CREATE TABLE returns (
  return_id INTEGER PRIMARY KEY, order_id INTEGER, product_id INTEGER,
  return_date TEXT, reason TEXT, refund_amount REAL
);
CREATE TABLE inventory (
  product_id INTEGER PRIMARY KEY, stock_qty INTEGER,
  reorder_level INTEGER, last_updated TEXT
);
CREATE TABLE website_sessions (
  session_id INTEGER PRIMARY KEY, customer_id INTEGER, session_date TEXT,
  source TEXT, campaign_id INTEGER, pages_viewed INTEGER,
  duration_sec INTEGER, converted INTEGER
);
CREATE TABLE payments (
  payment_id INTEGER PRIMARY KEY, order_id INTEGER, payment_date TEXT,
  method TEXT, amount REAL, status TEXT
);
"""

if not os.path.exists(sql_path):
    raise FileNotFoundError(
        f"No se encontró {sql_path}\n"
        "Ejecutá primero: python dataset/generate_seed.py"
    )

# Leer y decodificar el seed (maneja UTF-16 LE de PowerShell y UTF-8 normal)
with open(sql_path, "rb") as f:
    raw = f.read()
if raw.startswith(b'\xff\xfe') or raw.startswith(b'\xfe\xff'):
    sql = raw.decode("utf-16")
elif raw.startswith(b'\xef\xbb\xbf'):
    sql = raw[3:].decode("utf-8")
else:
    sql = raw.decode("utf-8")

os.makedirs(os.path.dirname(db_path), exist_ok=True)

if os.path.exists(db_path):
    os.remove(db_path)

conn = sqlite3.connect(db_path)
try:
    conn.executescript(SCHEMA)
    conn.executescript(sql)
    conn.commit()

    counts = {}
    for table in ["categories", "customers", "marketing_campaigns", "products",
                  "orders", "order_items", "returns", "inventory",
                  "website_sessions", "payments"]:
        counts[table] = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
finally:
    conn.close()

print(f"Dataset creado: {db_path}")
print()
for table, n in counts.items():
    print(f"  {table:<25s}: {n:>6,}")
