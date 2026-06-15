"""Test generator for capstone (level 9)"""
import sys, os, re, json, sqlite3

DATASET_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT   = os.path.dirname(DATASET_DIR)
MODULOS_DIR = os.path.join(REPO_ROOT, "modulos")
DB_PATH     = os.path.join(REPO_ROOT, "data", "dataset.db")

src = open(os.path.join(DATASET_DIR, "generate_expected.py"), encoding="utf-8").read()
src = src[:src.find("# Run generation")]
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

capstone_files = [
    os.path.join(MODULOS_DIR, "capstone", "parte-01-exploracion.sql"),
    os.path.join(MODULOS_DIR, "capstone", "parte-02-clientes.sql"),
    os.path.join(MODULOS_DIR, "capstone", "parte-03-marketing.sql"),
    os.path.join(MODULOS_DIR, "capstone", "parte-04-operaciones.sql"),
    os.path.join(MODULOS_DIR, "capstone", "parte-05-dashboard-ejecutivo.sql"),
]
# Filter to only existing files
capstone_files = [f for f in capstone_files if os.path.exists(f)]
print(f"Found {len(capstone_files)} capstone files")

tmpl = os.path.join(DATASET_DIR, "expected-results-capstone-template.json")
out  = os.path.join(DATASET_DIR, "expected-results-capstone.json")

generate_level_results(9, capstone_files, tmpl, out)
