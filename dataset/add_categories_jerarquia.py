"""Add categories_jerarquia table to existing dataset.db"""
import sqlite3, os

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH   = os.path.join(REPO_ROOT, "data", "dataset.db")

conn = sqlite3.connect(DB_PATH, timeout=10)

exists = conn.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='categories_jerarquia'"
).fetchone()

if not exists:
    conn.executescript("""
CREATE TABLE categories_jerarquia (
  category_id  INTEGER PRIMARY KEY,
  name         TEXT    NOT NULL,
  parent_id    INTEGER REFERENCES categories_jerarquia(category_id)
);
INSERT INTO categories_jerarquia VALUES
  (1,  'Tecnolog\xeda',  NULL),
  (2,  'Hogar',          NULL),
  (3,  'Ropa',           NULL),
  (4,  'Smartphones',    1),
  (5,  'Computadoras',   1),
  (6,  'Audio',          1),
  (7,  'Muebles',        2),
  (8,  'Decoraci\xf3n', 2),
  (9,  'Ropa Hombre',    3),
  (10, 'Ropa Mujer',     3),
  (11, 'Android',        4),
  (12, 'iOS',            4),
  (13, 'Laptops',        5),
  (14, 'Desktops',       5),
  (15, 'Auriculares',    6),
  (16, 'Parlantes',      6);
""")
    print("Table categories_jerarquia created with 16 rows")
else:
    print("Table categories_jerarquia already exists")

n = conn.execute("SELECT COUNT(*) FROM categories_jerarquia").fetchone()[0]
print(f"Row count: {n}")
conn.close()
