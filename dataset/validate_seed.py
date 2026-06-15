import sqlite3

sql_path = r"C:\Users\Juanm\OneDrive\Desktop\Curso SQL\dataset\shopsphere-seed.sql"
with open(sql_path, "r", encoding="utf-8") as f:
    sql = f.read()

schema = """
CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY, first_name TEXT, last_name TEXT,
  email TEXT UNIQUE, city TEXT, country TEXT, signup_date TEXT, segment TEXT
);
CREATE TABLE categories (
  category_id INTEGER PRIMARY KEY, name TEXT, description TEXT
);
CREATE TABLE products (
  product_id INTEGER PRIMARY KEY, name TEXT, category_id INTEGER,
  price REAL, cost REAL, sku TEXT UNIQUE
);
CREATE TABLE marketing_campaigns (
  campaign_id INTEGER PRIMARY KEY, name TEXT, channel TEXT,
  start_date TEXT, end_date TEXT, budget REAL, revenue_generated REAL
);
CREATE TABLE orders (
  order_id INTEGER PRIMARY KEY, customer_id INTEGER,
  order_date TEXT, status TEXT, channel TEXT, campaign_id INTEGER
);
CREATE TABLE order_items (
  item_id INTEGER PRIMARY KEY, order_id INTEGER, product_id INTEGER,
  quantity INTEGER, unit_price REAL, discount REAL
);
CREATE TABLE returns (
  return_id INTEGER PRIMARY KEY, order_id INTEGER, product_id INTEGER,
  return_date TEXT, reason TEXT, refund_amount REAL
);
CREATE TABLE inventory (
  product_id INTEGER PRIMARY KEY, stock_qty INTEGER,
  reorder_level INTEGER, last_updated TEXT
);
CREATE TABLE website_sessions (
  session_id INTEGER PRIMARY KEY, customer_id INTEGER, session_date TEXT,
  source TEXT, campaign_id INTEGER, pages_viewed INTEGER,
  duration_sec INTEGER, converted INTEGER
);
CREATE TABLE payments (
  payment_id INTEGER PRIMARY KEY, order_id INTEGER, payment_date TEXT,
  method TEXT, amount REAL, status TEXT
);
"""

conn = sqlite3.connect(":memory:")
conn.executescript(schema)
try:
    conn.executescript(sql)
    print("SQL load: OK")
except Exception as e:
    print(f"SQL load ERROR: {e}")
    conn.close()
    exit(1)

# Fixed counts
fixed_tables = [
    ("categories", 10), ("customers", 500), ("marketing_campaigns", 15),
    ("products", 80), ("orders", 2000), ("inventory", 80), ("website_sessions", 8000),
]
# Range counts (stochastic)
range_tables = [
    ("order_items", 4000, 5000),
    ("returns", 100, 350),
    ("payments", 1300, 1600),
]

print("\nRow counts (fixed):")
fixed_ok = True
for tbl, exp in fixed_tables:
    n = conn.execute(f"SELECT COUNT(*) FROM {tbl}").fetchone()[0]
    ok = "OK" if n == exp else f"FAIL (expected {exp})"
    if n != exp: fixed_ok = False
    print(f"  {tbl:<25s}: {n:>5d}  {ok}")

print("\nRow counts (range):")
for tbl, lo, hi in range_tables:
    n = conn.execute(f"SELECT COUNT(*) FROM {tbl}").fetchone()[0]
    ok = "OK" if lo <= n <= hi else f"FAIL (expected {lo}-{hi})"
    print(f"  {tbl:<25s}: {n:>5d}  {ok}  (range {lo}-{hi})")

print("\nBusiness checks:")
nc = conn.execute("SELECT COUNT(*) FROM customers WHERE city IS NULL").fetchone()[0]
print(f"  NULL cities:                {nc}  ({'OK' if nc == 30 else 'FAIL'}, expect exactly 30)")

no = conn.execute("SELECT COUNT(*) FROM orders WHERE campaign_id IS NULL").fetchone()[0]
pct_organic = no / 20
print(f"  Organic orders (NULL camp): {no} ({pct_organic:.1f}%)  (target 35-50%)")

anon = conn.execute("SELECT COUNT(*) FROM website_sessions WHERE customer_id IS NULL").fetchone()[0]
print(f"  Anon sessions:              {anon} ({anon/80:.1f}%)  (target 25-35%)")

bp = conn.execute("""SELECT COUNT(*) FROM payments p JOIN orders o ON p.order_id=o.order_id WHERE o.status!='delivered'""").fetchone()[0]
print(f"  Payments on non-delivered:  {bp}  ({'OK' if bp==0 else 'FAIL'}, expect 0)")

br = conn.execute("""SELECT COUNT(*) FROM returns r JOIN orders o ON r.order_id=o.order_id WHERE o.status!='delivered'""").fetchone()[0]
print(f"  Returns on non-delivered:   {br}  ({'OK' if br==0 else 'FAIL'}, expect 0)")

s10 = conn.execute("SELECT stock_qty FROM inventory WHERE product_id=10").fetchone()[0]
print(f"  Stockout product_id=10:     stock={s10}  ({'OK' if s10==0 else 'FAIL'}, expect 0)")

w = conn.execute("SELECT COUNT(*) FROM orders WHERE customer_id=7").fetchone()[0]
print(f"  Whale (cid=7) orders:       {w}  ({'OK' if w==25 else 'FAIL'}, expect 25)")

rev = conn.execute("""
    SELECT SUM(oi.unit_price*oi.quantity*(1-oi.discount/100.0))
    FROM order_items oi JOIN orders o ON oi.order_id=o.order_id
    WHERE o.status='delivered'
""").fetchone()[0]
nd = conn.execute("SELECT COUNT(*) FROM orders WHERE status='delivered'").fetchone()[0]
ticket = rev / nd
print(f"  Revenue (delivered):        ${rev:,.2f}")
print(f"  Ticket promedio:            ${ticket:,.2f}  ({'OK' if 100<=ticket<=300 else 'CHECK'}, target $100-$300)")

rr_num = conn.execute("SELECT COUNT(*) FROM returns").fetchone()[0]
rr_den = conn.execute("""SELECT COUNT(*) FROM order_items oi JOIN orders o ON oi.order_id=o.order_id WHERE o.status='delivered'""").fetchone()[0]
rr = rr_num/rr_den*100
print(f"  Return rate:                {rr:.2f}%  ({'OK' if 3<=rr<=8 else 'CHECK'}, target 3-8%)")

print("\nHigh-return product rates:")
for pid in [24,39,40]:
    nm = conn.execute("SELECT name FROM products WHERE product_id=?", (pid,)).fetchone()[0]
    sold = conn.execute("""SELECT COUNT(*) FROM order_items oi JOIN orders o ON oi.order_id=o.order_id WHERE oi.product_id=? AND o.status='delivered'""",(pid,)).fetchone()[0]
    ret = conn.execute("SELECT COUNT(*) FROM returns WHERE product_id=?",(pid,)).fetchone()[0]
    rate = ret/sold*100 if sold>0 else 0
    ok = "OK" if rate >= 8 else "LOW"
    print(f"  pid={pid} ({nm[:22]}): {ret}/{sold} = {rate:.1f}%  ({ok}, target >10%)")

print("\nSeasonality check (orders by month):")
rows = conn.execute("""
    SELECT substr(order_date,1,7) as mo, COUNT(*) as n
    FROM orders GROUP BY mo ORDER BY mo
""").fetchall()
for mo, n in rows:
    bar = "#" * (n // 5)
    print(f"  {mo}: {n:>4d}  {bar}")

conn.close()
print("\nValidation complete.")
