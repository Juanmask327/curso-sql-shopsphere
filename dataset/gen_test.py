"""Test generator for a single level - run as: python gen_test.py <level>"""
import sys, os, re, json, sqlite3

DATASET_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT   = os.path.dirname(DATASET_DIR)
MODULOS_DIR = os.path.join(REPO_ROOT, "modulos")
DB_PATH     = os.path.join(REPO_ROOT, "data", "dataset.db")

level = int(sys.argv[1]) if len(sys.argv) > 1 else 5

level_dirs = {
    0:"nivel-00-fundamentos", 1:"nivel-01-exploracion", 2:"nivel-02-metricas",
    3:"nivel-03-joins",       4:"nivel-04-clientes",    5:"nivel-05-avanzado",
    6:"nivel-06-analitica",   7:"nivel-07-bi",          8:"nivel-08-profesional",
}

# Load helper functions from generate_expected (everything before "# Run generation")
src = open(os.path.join(DATASET_DIR, "generate_expected.py"), encoding="utf-8").read()
src = src[:src.find("# Run generation")]
# Patch module-level paths
src = src.replace(
    "DATASET_DIR = os.path.dirname(os.path.abspath(__file__))",
    f"DATASET_DIR = r'{DATASET_DIR}'"
).replace(
    "REPO_ROOT = os.path.dirname(DATASET_DIR)",
    f"REPO_ROOT = r'{REPO_ROOT}'"
).replace(
    "MODULOS_DIR = os.path.join(REPO_ROOT, \"modulos\")",
    f"MODULOS_DIR = r'{MODULOS_DIR}'"
).replace(
    "DB_PATH = os.path.join(REPO_ROOT, \"data\", \"dataset.db\")",
    f"DB_PATH = r'{DB_PATH}'"
)
exec(compile(src, "generate_expected.py", "exec"), globals())

# Now run the level
d    = level_dirs[level]
sql  = [os.path.join(MODULOS_DIR, d, f"ejercicios-nivel-{level:02d}.sql")]
tmpl = os.path.join(DATASET_DIR, f"expected-results-nivel-{level:02d}.json")
if not os.path.exists(tmpl):
    tmpl = os.path.join(DATASET_DIR, f"expected-results-nivel-{level:02d}-template.json")
out  = os.path.join(DATASET_DIR, f"expected-results-nivel-{level:02d}.json")

generate_level_results(level, sql, tmpl, out)
