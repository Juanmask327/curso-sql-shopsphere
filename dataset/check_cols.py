import sqlite3
import re

# Get all SQLite column names
conn = sqlite3.connect('data/dataset.db')
tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
all_sqlite_cols = set()
table_cols = {}
for t in tables:
    cols = [r[1] for r in conn.execute(f"PRAGMA table_info({t[0]})").fetchall()]
    table_cols[t[0]] = set(cols)
    all_sqlite_cols.update(cols)
conn.close()

print("=== SQLite Column Names ===")
for table, cols in sorted(table_cols.items()):
    print(f"  {table}: {sorted(cols)}")

# Now scan SQL files for column references that might be missing
import os
sql_files = [
    "modulos/nivel-07-bi/ejercicios-nivel-07.sql",
    "modulos/nivel-08-profesional/ejercicios-nivel-08.sql",
    "modulos/capstone/parte-01-exploracion.sql",
    "modulos/capstone/parte-02-clientes.sql",
    "modulos/capstone/parte-03-marketing.sql",
    "modulos/capstone/parte-04-operaciones.sql",
    "modulos/capstone/parte-05-dashboard-ejecutivo.sql",
]

# Common SQL keywords to ignore
sql_keywords = {
    'select', 'from', 'where', 'and', 'or', 'not', 'in', 'as', 'on', 'join',
    'inner', 'left', 'right', 'full', 'outer', 'cross', 'group', 'by', 'order',
    'having', 'limit', 'offset', 'union', 'all', 'distinct', 'case', 'when',
    'then', 'else', 'end', 'is', 'null', 'true', 'false', 'between', 'like',
    'exists', 'with', 'create', 'view', 'table', 'insert', 'update', 'delete',
    'drop', 'alter', 'index', 'values', 'set', 'into', 'primary', 'key',
    'foreign', 'references', 'cascade', 'default', 'check', 'unique',
    'constraint', 'asc', 'desc', 'nulls', 'last', 'first', 'over', 'partition',
    'rows', 'range', 'preceding', 'following', 'current', 'row', 'unbounded',
    'count', 'sum', 'avg', 'min', 'max', 'round', 'coalesce', 'nullif',
    'cast', 'integer', 'text', 'real', 'date', 'strftime', 'printf',
    'interval', 'extract', 'year', 'month', 'day', 'hour', 'minute', 'second',
    'lag', 'lead', 'rank', 'dense_rank', 'row_number', 'ntile', 'percent_rank',
    'cume_dist', 'first_value', 'last_value', 'nth_value',
    'trim', 'lower', 'upper', 'length', 'substr', 'replace', 'instr',
    'abs', 'mod', 'power', 'sqrt', 'log', 'ln', 'exp', 'ceil', 'floor',
    'boolean', 'varchar', 'int', 'bigint', 'decimal', 'numeric', 'float', 'double',
    'if', 'iif', 'typeof', 'total', 'group_concat', 'random',
}

# Known PG->SQLite mapped columns (already handled in translate function)
pg_mapped = {
    'ordered_at': 'order_date', 'returned_at': 'return_date', 'paid_at': 'payment_date',
    'registered_at': 'signup_date', 'started_at': 'session_date', 'ended_at': 'end_date',
    'stock': 'stock_qty', 'spent': 'budget',
}

# Aggregate names of all known columns
all_known = all_sqlite_cols | set(pg_mapped.keys()) | set(pg_mapped.values())

print("\n=== Potentially Missing Columns in SQL Files ===")
for fpath in sql_files:
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all word-like tokens after dots (table.column patterns)
    dot_cols = set(re.findall(r'\.(\w+)', content))
    
    # Filter out known columns, keywords, table names, aliases, numbers
    unknown_cols = set()
    for col in dot_cols:
        col_lower = col.lower()
        if col_lower in sql_keywords:
            continue
        if col_lower in {t[0].lower() for t in tables}:
            continue
        if col_lower in all_known:
            continue
        if col_lower.startswith('ejercicio') or col_lower.startswith('soluci'):
            continue
        if re.match(r'^\d+$', col):
            continue
        unknown_cols.add(col)
    
    if unknown_cols:
        print(f"\n  {os.path.basename(fpath)}:")
        for col in sorted(unknown_cols):
            print(f"    - {col}")
