"""debug_level.py - run a single level through generate_expected and show errors"""
import sys, os

# Set up paths before importing
DATASET_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT   = os.path.dirname(DATASET_DIR)

# Patch generate_expected to only run the requested level
level = int(sys.argv[1]) if len(sys.argv) > 1 else 4

import importlib.util, types

# Load generate_expected as a module (suppress the top-level execution)
src = open(os.path.join(DATASET_DIR, "generate_expected.py"), encoding="utf-8").read()
# Strip the "Run generation" block at the bottom
src = src[:src.find("# Run generation")]

mod = types.ModuleType("generate_expected")
mod.__file__ = os.path.join(DATASET_DIR, "generate_expected.py")
exec(compile(src, mod.__file__, "exec"), mod.__dict__)

# Patch paths
mod.REPO_ROOT   = REPO_ROOT
mod.DATASET_DIR = DATASET_DIR
mod.DB_PATH     = os.path.join(REPO_ROOT, "data", "dataset.db")
mod.MODULOS_DIR = os.path.join(REPO_ROOT, "modulos")

level_dirs = {
    0: "nivel-00-fundamentos",
    1: "nivel-01-exploracion",
    2: "nivel-02-metricas",
    3: "nivel-03-joins",
    4: "nivel-04-clientes",
    5: "nivel-05-avanzado",
    6: "nivel-06-analitica",
    7: "nivel-07-bi",
    8: "nivel-08-profesional",
}

d = level_dirs[level]
sql_file = os.path.join(mod.MODULOS_DIR, d, f"ejercicios-nivel-{level:02d}.sql")

st, sol = mod.parse_sql_file(sql_file)
print(f"Level {level}: {len(st)} statements, {len(sol)} solutions")

import sqlite3
conn = sqlite3.connect(mod.DB_PATH)
conn.isolation_level = None

for num in sorted(sol.keys()):
    raw  = sol[num]
    q    = mod.translate_pg_to_sqlite(raw, num)
    try:
        cols, rows = mod.run_query(conn, q)
        rc = len(rows) if rows else 0
        print(f"  EJ{num:02d}: OK  {rc} rows, {len(cols)} cols")
    except Exception as e:
        print(f"  EJ{num:02d}: ERR {e}")
        print(f"         Query preview: {q[:200].encode('ascii','replace').decode()}")

conn.close()
