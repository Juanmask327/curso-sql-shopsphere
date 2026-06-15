"""
validate_exercises.py
Verifica que la reference_query de cada ejercicio publicado produzca exactamente
el resultado almacenado en expected_result_json, usando el dataset SQLite local.

Modos de validación replicados del backend (validation.service.ts):
  exact_ordered    → mismas filas en el mismo orden
  exact_unordered  → mismo multiset de filas (orden irrelevante)
                     si expected.rows < row_count → subset check (sample_rows)
  schema_match     → solo columnas, ignora datos

Uso:
  python dataset/validate_exercises.py
  python dataset/validate_exercises.py --level 3
  python dataset/validate_exercises.py --fail-only
"""

import sqlite3
import json
import sys
import os
import argparse
import re
import types
from typing import Any

import psycopg2
import psycopg2.extras

# ── Configuración ─────────────────────────────────────────────────────────────

def _load_db_url() -> str:
    # 1. Env var explícita
    if os.environ.get("DATABASE_URL"):
        return os.environ["DATABASE_URL"]
    # 2. Leer .env en la raíz del repo
    env_path = os.path.join(REPO_ROOT, ".env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line.startswith("POSTGRES_PASSWORD="):
                    pwd = line.split("=", 1)[1].strip().strip('"')
                    return f"postgresql://shopsphere_user:{pwd}@localhost:5432/shopsphere"
    return "postgresql://shopsphere_user:shopsphere_pass@localhost:5432/shopsphere"

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_PATH = os.path.join(REPO_ROOT, "data", "dataset.db")
DB_URL = _load_db_url()

# ── Load translate_pg_to_sqlite and run_query from generate_expected.py ────────

def _load_gen_module():
    src_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "generate_expected.py")
    src = open(src_path, encoding="utf-8").read()
    src = src[:src.find("# Run generation")]
    src = src.replace("DATASET_DIR = os.path.dirname(os.path.abspath(__file__))",
                      f"DATASET_DIR = r'{os.path.dirname(src_path)}'")
    src = src.replace("REPO_ROOT = os.path.dirname(DATASET_DIR)",
                      f"REPO_ROOT = r'{REPO_ROOT}'")
    src = src.replace("MODULOS_DIR = os.path.join(REPO_ROOT, \"modulos\")",
                      f"MODULOS_DIR = r'{os.path.join(REPO_ROOT, 'modulos')}'")
    src = src.replace("DB_PATH = os.path.join(REPO_ROOT, \"data\", \"dataset.db\")",
                      f"DB_PATH = r'{DATASET_PATH}'")
    m = types.ModuleType("_gen")
    exec(compile(src, src_path, "exec"), m.__dict__)
    return m

_gen = _load_gen_module()
translate_pg_to_sqlite = _gen.translate_pg_to_sqlite
_run_query = _gen.run_query

# ── Comparación de valores individuales ───────────────────────────────────────

def normalize(v: Any) -> Any:
    """Normaliza un valor para comparación robusta (NULL, número, string)."""
    if v is None:
        return None
    if isinstance(v, float) and v == int(v):
        return int(v)
    if isinstance(v, str):
        stripped = v.strip()
        try:
            f = float(stripped)
            return int(f) if f == int(f) else round(f, 6)
        except (ValueError, OverflowError):
            return stripped.lower()
    return v

def row_key(row: list) -> str:
    return json.dumps([normalize(c) for c in row], sort_keys=True, default=str)

# ── Lógica de validación ───────────────────────────────────────────────────────

def validate(got_cols, got_rows, expected: dict, mode: str) -> tuple[bool, str]:
    exp_cols  = [c.lower() for c in expected["columns"]]
    exp_rows  = expected["rows"]
    exp_count = expected["row_count"]
    got_cols_lower = [c.lower() for c in got_cols]

    # Columnas
    if got_cols_lower != exp_cols:
        return False, f"columnas esperadas {exp_cols} | obtenidas {got_cols_lower}"

    # schema_match: solo columnas
    if mode == "schema_match":
        return True, "ok"

    got_count = len(got_rows)

    if mode == "exact_ordered":
        if got_count != exp_count:
            return False, f"filas esperadas {exp_count} | obtenidas {got_count}"
        for i, (g, e) in enumerate(zip(got_rows, exp_rows)):
            gn = [normalize(x) for x in g]
            en = [normalize(x) for x in e]
            if gn != en:
                return False, f"fila {i} difiere | esperado {en} | obtenido {gn}"
        return True, "ok"

    # exact_unordered
    if got_count != exp_count:
        return False, f"filas esperadas {exp_count} | obtenidas {got_count}"

    is_subset = len(exp_rows) < exp_count  # sample_rows mode

    if is_subset:
        got_keys = {row_key(list(r)) for r in got_rows}
        for e in exp_rows:
            k = row_key(e)
            if k not in got_keys:
                return False, f"fila de muestra no encontrada en resultados: {e}"
        return True, "ok"
    else:
        got_keys  = sorted(row_key(list(r)) for r in got_rows)
        exp_keys  = sorted(row_key(e) for e in exp_rows)
        if got_keys != exp_keys:
            for g, e in zip(got_keys, exp_keys):
                if g != e:
                    return False, f"multiset difiere | primera diferencia esperado={e} | obtenido={g}"
            return False, "multiset difiere (conteos distintos)"
        return True, "ok"

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--level", type=int, help="Validar solo este nivel")
    parser.add_argument("--fail-only", action="store_true", help="Mostrar solo fallos")
    args = parser.parse_args()

    if not os.path.exists(DATASET_PATH):
        print(f"ERROR: dataset.db no encontrado en {DATASET_PATH}")
        sys.exit(1)

    # Conectar a PostgreSQL y obtener ejercicios
    try:
        pg = psycopg2.connect(DB_URL)
    except Exception as e:
        print(f"ERROR conectando a PostgreSQL: {e}")
        print("Asegúrate de que Docker esté corriendo y el port 5432 esté expuesto.")
        sys.exit(1)

    cur = pg.cursor(cursor_factory=psycopg2.extras.DictCursor)

    if args.level is not None:
        cur.execute("""
            SELECT e.id, e.level_id, e.order_index, e.title,
                   e.reference_query, e.expected_result_json, e.validation_mode,
                   l.name as level_name
            FROM exercises e
            JOIN levels l ON l.id = e.level_id
            WHERE e.is_published = true AND e.level_id = %s
            ORDER BY e.level_id, e.order_index
        """, (args.level,))
    else:
        cur.execute("""
            SELECT e.id, e.level_id, e.order_index, e.title,
                   e.reference_query, e.expected_result_json, e.validation_mode,
                   l.name as level_name
            FROM exercises e
            JOIN levels l ON l.id = e.level_id
            WHERE e.is_published = true
            ORDER BY e.level_id, e.order_index
        """)

    exercises = cur.fetchall()
    pg.close()

    # Conectar a SQLite
    sqlite = sqlite3.connect(DATASET_PATH)
    sqlite.row_factory = None  # filas como tuplas

    total  = len(exercises)
    passed = 0
    failed = 0
    errors = 0
    failures = []

    current_level = None

    for ex in exercises:
        level_id    = ex["level_id"]
        level_name  = ex["level_name"]
        order_index = ex["order_index"]
        title       = ex["title"]
        query       = ex["reference_query"]
        expected    = ex["expected_result_json"]
        mode        = ex["validation_mode"]

        if level_id != current_level:
            current_level = level_id
            if not args.fail_only:
                print(f"\n{'='*60}")
                print(f"  Nivel {level_id} — {level_name}")
                print(f"{'='*60}")

        label = f"N{level_id} EJ{order_index:02d} {title[:45]}"

        # Traducir a SQLite y ejecutar
        exercise_num = order_index  # used for special-case translations
        sqlite_query = translate_pg_to_sqlite(query, exercise_num)
        try:
            got_cols, got_rows = _run_query(sqlite, sqlite_query)
            got_rows = got_rows or []
        except Exception as e:
            msg = f"ERROR EJECUCION: {e}"
            errors += 1
            failures.append((label, msg))
            print(f"  ERR  {label}")
            print(f"       {msg}")
            continue

        # Validar resultado
        ok, reason = validate(got_cols, got_rows, expected, mode)

        if ok:
            passed += 1
            if not args.fail_only:
                print(f"  OK  {label}")
        else:
            failed += 1
            failures.append((label, reason))
            print(f"  FAIL {label}")
            print(f"       {reason}")

    sqlite.close()

    # Resumen
    print(f"\n{'='*60}")
    print(f"RESUMEN: {total} ejercicios | ✓ {passed} ok | ✗ {failed} fallos | ⚠ {errors} errores")
    print(f"{'='*60}")

    if failures:
        print(f"\nEJERCICIOS CON PROBLEMAS ({len(failures)}):")
        for label, reason in failures:
            print(f"  FAIL {label}")
            print(f"       -> {reason}")
    else:
        print("\nTodos los ejercicios pasan validacion.")

    sys.exit(0 if (failed + errors) == 0 else 1)

if __name__ in ("__main__", "__builtin__", "builtins"):
    import io as _io
    _log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "validate_result.txt")
    _orig_stdout = sys.stdout
    _orig_stderr = sys.stderr
    sys.stdout = sys.stderr = open(_log_path, "w", encoding="utf-8", buffering=1)
    try:
        main()
    except SystemExit as _e:
        sys.stdout.write(f"\n[exit {_e.code}]\n")
        sys.stdout.flush()
    except Exception as _ex:
        sys.stdout.write(f"\n[EXCEPTION] {_ex}\n")
        sys.stdout.flush()
    finally:
        sys.stdout.flush()
        sys.stdout.close()
        sys.stdout = _orig_stdout
        sys.stderr = _orig_stderr
    print(f"Validation complete. Results in {_log_path}")
