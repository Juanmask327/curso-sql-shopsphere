"""
rebuild_dataset.py
Reconstruye data/dataset.db usando el schema canonico del curso
y los tres archivos de seed corregidos.
"""
import sqlite3
import os
import sys
import shutil

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH   = os.path.join(REPO_ROOT, "data", "dataset.db")
PUBLIC_DB_PATH = os.path.join(REPO_ROOT, "frontend", "public", "dataset.db")
DS_DIR    = os.path.join(REPO_ROOT, "dataset")

SEED_FILES = [
    os.path.join(DS_DIR, "shopsphere-seed-base.sql"),
    os.path.join(DS_DIR, "shopsphere-seed-transaccional.sql"),
    os.path.join(DS_DIR, "shopsphere-seed-operacional.sql"),
]

SCHEMA = """
CREATE TABLE customers (
  customer_id  INTEGER PRIMARY KEY,
  first_name   TEXT NOT NULL,
  last_name    TEXT NOT NULL,
  email        TEXT UNIQUE NOT NULL,
  city         TEXT,
  country      TEXT NOT NULL,
  registered_at TEXT NOT NULL
);
CREATE TABLE categories (
  category_id  INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT
);
CREATE TABLE products (
  product_id   INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  category_id  INTEGER REFERENCES categories(category_id),
  price        REAL NOT NULL,
  is_active    INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE marketing_campaigns (
  campaign_id  INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  channel      TEXT NOT NULL,
  started_at   TEXT NOT NULL,
  ended_at     TEXT NOT NULL,
  budget       REAL NOT NULL,
  spent        REAL NOT NULL DEFAULT 0
);
CREATE TABLE orders (
  order_id     INTEGER PRIMARY KEY,
  customer_id  INTEGER NOT NULL REFERENCES customers(customer_id),
  ordered_at   TEXT NOT NULL,
  status       TEXT NOT NULL
);
CREATE TABLE order_items (
  item_id      INTEGER PRIMARY KEY,
  order_id     INTEGER NOT NULL REFERENCES orders(order_id),
  product_id   INTEGER NOT NULL REFERENCES products(product_id),
  quantity     INTEGER NOT NULL,
  unit_price   REAL NOT NULL,
  discount     REAL NOT NULL DEFAULT 0
);
CREATE TABLE returns (
  return_id    INTEGER PRIMARY KEY,
  order_id     INTEGER NOT NULL REFERENCES orders(order_id),
  product_id   INTEGER NOT NULL REFERENCES products(product_id),
  returned_at  TEXT NOT NULL,
  reason       TEXT NOT NULL,
  status       TEXT NOT NULL
);
CREATE TABLE inventory (
  inventory_id INTEGER PRIMARY KEY,
  product_id   INTEGER NOT NULL REFERENCES products(product_id),
  stock        INTEGER NOT NULL DEFAULT 0,
  updated_at   TEXT NOT NULL
);
CREATE TABLE website_sessions (
  session_id   INTEGER PRIMARY KEY,
  customer_id  INTEGER REFERENCES customers(customer_id),
  campaign_id  INTEGER REFERENCES marketing_campaigns(campaign_id),
  started_at   TEXT NOT NULL,
  pages_viewed INTEGER NOT NULL DEFAULT 1,
  converted    INTEGER NOT NULL DEFAULT 0,
  device_type  TEXT NOT NULL DEFAULT 'desktop'
);
CREATE TABLE payments (
  payment_id   INTEGER PRIMARY KEY,
  order_id     INTEGER NOT NULL REFERENCES orders(order_id),
  amount       REAL NOT NULL,
  method       TEXT NOT NULL,
  status       TEXT NOT NULL,
  paid_at      TEXT
);
CREATE TABLE categories_jerarquia (
  category_id  INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  parent_id    INTEGER REFERENCES categories_jerarquia(category_id)
);
INSERT INTO categories_jerarquia VALUES
  (1, 'Tecnología', NULL),
  (2, 'Hogar', NULL),
  (3, 'Ropa', NULL),
  (4, 'Smartphones', 1),
  (5, 'Computadoras', 1),
  (6, 'Audio', 1),
  (7, 'Muebles', 2),
  (8, 'Decoración', 2),
  (9, 'Ropa Hombre', 3),
  (10, 'Ropa Mujer', 3),
  (11, 'Android', 4),
  (12, 'iOS', 4),
  (13, 'Laptops', 5),
  (14, 'Desktops', 5),
  (15, 'Auriculares', 6),
  (16, 'Parlantes', 6);
"""

def main():
    for path in SEED_FILES:
        if not os.path.exists(path):
            print(f"ERROR: seed file not found: {path}")
            sys.exit(1)

    # Borrar DB vieja
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        print(f"DB anterior eliminada: {DB_PATH}")

    conn = sqlite3.connect(DB_PATH)
    # Modo DELETE (no WAL): el archivo queda autocontenido, sin -wal/-shm, y se
    # puede deserializar en memoria (better-sqlite3 no abre buffers en modo WAL).
    conn.execute("PRAGMA journal_mode=DELETE")
    conn.execute("PRAGMA foreign_keys=OFF")  # speed during bulk insert

    print("Creando schema canonico...")
    conn.executescript(SCHEMA)
    conn.commit()

    for seed_path in SEED_FILES:
        name = os.path.basename(seed_path)
        print(f"Aplicando {name}...")
        with open(seed_path, encoding="utf-8") as f:
            sql = f.read()
        try:
            conn.executescript(sql)
            conn.commit()
        except Exception as e:
            print(f"  ERROR en {name}: {e}")
            conn.close()
            os.remove(DB_PATH)
            sys.exit(1)

    # Crear índices para rendimiento de queries
    print("Creando índices...")
    conn.executescript("""
        CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
        CREATE INDEX IF NOT EXISTS idx_orders_ordered_at ON orders(ordered_at);
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
        CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
        CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
        CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
        CREATE INDEX IF NOT EXISTS idx_returns_order_id ON returns(order_id);
        CREATE INDEX IF NOT EXISTS idx_returns_product_id ON returns(product_id);
        CREATE INDEX IF NOT EXISTS idx_website_sessions_customer_id ON website_sessions(customer_id);
        CREATE INDEX IF NOT EXISTS idx_website_sessions_started_at ON website_sessions(started_at);
        CREATE INDEX IF NOT EXISTS idx_website_sessions_campaign_id ON website_sessions(campaign_id);
        CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
        CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);
    """)
    conn.commit()

    # Estadísticas para el planificador: sin ANALYZE algunas queries del curso
    # (p. ej. NOT EXISTS correlacionados) tardan > 5 s y el playground las corta.
    conn.execute("ANALYZE")
    conn.commit()

    # Verificar counts
    print("\nConteo de filas por tabla:")
    tables = ["customers","categories","products","marketing_campaigns",
              "orders","order_items","returns","inventory","website_sessions","payments",
              "categories_jerarquia"]
    for t in tables:
        n = conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
        print(f"  {t:30s} {n:>6}")

    conn.execute("VACUUM")
    conn.close()
    size_kb = os.path.getsize(DB_PATH) // 1024
    print(f"\ndataset.db reconstruido: {DB_PATH} ({size_kb} KB)")

    # El playground del navegador carga /dataset.db desde frontend/public/.
    # Se mantiene una copia idéntica para que backend y frontend usen el mismo dataset.
    shutil.copyfile(DB_PATH, PUBLIC_DB_PATH)
    print(f"Copiado a: {PUBLIC_DB_PATH}")

if __name__ == "__main__":
    main()
