import sqlite3, re, sys

DB_PATH = "data/dataset.db"
conn = sqlite3.connect(DB_PATH)
conn.isolation_level = None

# Read the actual SQL file and extract solution 13
with open("modulos/nivel-08-profesional/ejercicios-nivel-08.sql", "r", encoding="utf-8") as f:
    content = f.read()

# Find solution 13 and 14 markers
sol_matches = list(re.finditer(r"(---\s*Solución\s*(\d+)[^\n]*|--\s*Solución\s*EJ(\d+)\s*:?)", content, re.IGNORECASE))
sol13_chunk = None
for i, m in enumerate(sol_matches):
    num = int(m.group(2) or m.group(3))
    if num == 13:
        start_pos = m.end()
        end_pos = sol_matches[i+1].start() if i+1 < len(sol_matches) else len(content)
        sol13_chunk = content[start_pos:end_pos].strip()
        break

print(f"=== Raw chunk (first 200 chars) ===")
print(repr(sol13_chunk[:200]))
print()

# Check if /* */ block comment
query = sol13_chunk
if "/*" in query:
    c_start = query.find("/*")
    c_end = query.find("*/", c_start)
    if c_end != -1:
        query = query[c_start+2:c_end].strip()

print(f"=== After block comment check (first 200 chars) ===")
print(repr(query[:200]))
print()

# Now split by ; and strip comments
statements = query.split(";")
for i, stmt in enumerate(statements):
    lines = stmt.split("\n")
    clean_lines = [l for l in lines if not l.strip().startswith("--")]
    stmt_clean = "\n".join(clean_lines).strip()
    print(f"=== Statement {i} ===")
    print(f"  Clean: {repr(stmt_clean[:150])}")
    if not stmt_clean:
        print("  [SKIP]")
        continue
    try:
        cursor = conn.cursor()
        cursor.execute(stmt_clean)
        print(f"  [OK]")
    except Exception as e:
        print(f"  [ERROR] {e}")

conn.close()
