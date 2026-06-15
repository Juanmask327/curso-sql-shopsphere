"""
Add is_active column to products in the SQLite dataset.
All products are active (1) by default.
"""
import sqlite3

DB_PATH = "data/dataset.db"

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Check if column already exists
cols = [r[1] for r in cursor.execute("PRAGMA table_info(products)").fetchall()]
if "is_active" in cols:
    print("is_active column already exists. Skipping.")
    conn.close()
    exit(0)

print("Adding is_active column to products...")
cursor.execute("ALTER TABLE products ADD COLUMN is_active INTEGER DEFAULT 1")

# All products active by default
cursor.execute("UPDATE products SET is_active = 1")

conn.commit()

# Verify
result = cursor.execute("SELECT is_active, COUNT(*) FROM products GROUP BY is_active").fetchall()
print(f"Distribution: {result}")

conn.close()
print("Done! is_active column added successfully.")
