"""
Add device_type column to website_sessions in the SQLite dataset.
Values are: 'desktop', 'mobile', 'tablet' with realistic distribution.
"""
import sqlite3
import random

DB_PATH = "data/dataset.db"

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Check if column already exists
cols = [r[1] for r in cursor.execute("PRAGMA table_info(website_sessions)").fetchall()]
if "device_type" in cols:
    print("device_type column already exists. Skipping.")
    conn.close()
    exit(0)

print("Adding device_type column to website_sessions...")
cursor.execute("ALTER TABLE website_sessions ADD COLUMN device_type TEXT")

# Populate with realistic distribution
# Desktop: 45%, Mobile: 40%, Tablet: 15%
devices = ['desktop'] * 45 + ['mobile'] * 40 + ['tablet'] * 15

session_ids = [r[0] for r in cursor.execute("SELECT session_id FROM website_sessions").fetchall()]
print(f"Populating {len(session_ids)} sessions with device_type...")

random.seed(42)  # Deterministic
for sid in session_ids:
    device = random.choice(devices)
    cursor.execute("UPDATE website_sessions SET device_type = ? WHERE session_id = ?", (device, sid))

conn.commit()

# Verify
result = cursor.execute("SELECT device_type, COUNT(*) FROM website_sessions GROUP BY device_type").fetchall()
print("\nDistribution:")
for row in result:
    print(f"  {row[0]}: {row[1]}")

conn.close()
print("\nDone! device_type column added successfully.")
