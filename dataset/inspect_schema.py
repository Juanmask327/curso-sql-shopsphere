import sqlite3
conn = sqlite3.connect('data/dataset.db')
tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
for t in tables:
    cols = [r[1] for r in conn.execute(f"PRAGMA table_info({t[0]})").fetchall()]
    print(f"{t[0]}: {cols}")
conn.close()
