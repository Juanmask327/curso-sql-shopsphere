"""
ShopSphere Seed Corrector & Extender
Aplica todas las correcciones del QA y genera extension 2025-2026.
"""
import re
import random
import os
from datetime import date, timedelta, datetime

random.seed(42)

SRC = r'C:\Users\Juanm\OneDrive\Desktop\Curso SQL\dataset\shopsphere-seed.sql'
OUT_BASE   = r'C:\Users\Juanm\OneDrive\Desktop\Curso SQL\dataset\shopsphere-seed-base.sql'
OUT_TRANS  = r'C:\Users\Juanm\OneDrive\Desktop\Curso SQL\dataset\shopsphere-seed-transaccional.sql'
OUT_OPS    = r'C:\Users\Juanm\OneDrive\Desktop\Curso SQL\dataset\shopsphere-seed-operacional.sql'

# ================================================================
# HELPERS
# ================================================================

def extract_section(content, table_name):
    pattern = r'(INSERT INTO ' + table_name + r' \([^)]+\) VALUES \([^;]+\);)'
    return re.findall(pattern, content, re.DOTALL)

def split_sql_values(s):
    """Split SQL values string respecting single quotes."""
    vals = []
    current = ''
    in_quote = False
    for ch in s:
        if ch == "'" and not in_quote:
            in_quote = True
            current += ch
        elif ch == "'" and in_quote:
            in_quote = False
            current += ch
        elif ch == ',' and not in_quote:
            vals.append(current.strip())
            current = ''
        else:
            current += ch
    if current.strip():
        vals.append(current.strip())
    return vals

def get_values(row):
    m = re.search(r'VALUES \((.+)\);$', row, re.DOTALL)
    return split_sql_values(m.group(1)) if m else []

# ================================================================
# LOAD ORIGINAL
# ================================================================

with open(SRC, 'r', encoding='utf-8') as f:
    original = f.read()

categories_rows  = extract_section(original, 'categories')
customers_rows   = extract_section(original, 'customers')
campaigns_rows   = extract_section(original, 'marketing_campaigns')
products_rows    = extract_section(original, 'products')
orders_rows      = extract_section(original, 'orders')
order_items_rows = extract_section(original, 'order_items')
returns_rows     = extract_section(original, 'returns')
inventory_rows   = extract_section(original, 'inventory')
sessions_rows    = extract_section(original, 'website_sessions')
payments_rows    = extract_section(original, 'payments')

print(f"Loaded: cat={len(categories_rows)}, cust={len(customers_rows)}, "
      f"camp={len(campaigns_rows)}, prod={len(products_rows)}, "
      f"ord={len(orders_rows)}, items={len(order_items_rows)}, "
      f"ret={len(returns_rows)}, inv={len(inventory_rows)}, "
      f"sess={len(sessions_rows)}, pay={len(payments_rows)}")

# ================================================================
# FIX FUNCTIONS
# ================================================================

def fix_customers(rows):
    out = []
    for r in rows:
        r2 = r.replace(
            'INSERT INTO customers (customer_id, first_name, last_name, email, city, country, signup_date, segment)',
            'INSERT INTO customers (customer_id, first_name, last_name, email, city, country, registered_at)'
        )
        # Remove trailing segment value (last quoted string before closing paren)
        r2 = re.sub(r",\s*'[^']*'\s*\)\s*;$", ');', r2)
        out.append(r2)
    return out


def fix_campaigns(rows):
    channel_map = {'google_ads': 'paid_search', 'influencer': 'social'}
    out = []
    for r in rows:
        r2 = r.replace(
            'INSERT INTO marketing_campaigns (campaign_id, name, channel, start_date, end_date, budget, revenue_generated)',
            'INSERT INTO marketing_campaigns (campaign_id, name, channel, started_at, ended_at, budget, spent)'
        )
        for bad, good in channel_map.items():
            r2 = r2.replace("'" + bad + "'", "'" + good + "'")
        out.append(r2)
    return out


def fix_products(rows):
    out = []
    for r in rows:
        r2 = r.replace(
            'INSERT INTO products (product_id, name, category_id, price, cost, sku)',
            'INSERT INTO products (product_id, name, category_id, price, is_active)'
        )
        vals = get_values(r2)
        # cols now: product_id, name, category_id, price, is_active (was cost), sku
        # We want: product_id, name, category_id, price, TRUE
        if len(vals) >= 4:
            new_vals = ', '.join([vals[0], vals[1], vals[2], vals[3], 'TRUE'])
            r2 = re.sub(r'VALUES \(.+\);$', 'VALUES (' + new_vals + ');', r2, flags=re.DOTALL)
        out.append(r2)
    return out


def fix_orders(rows):
    out = []
    for r in rows:
        r2 = r.replace(
            'INSERT INTO orders (order_id, customer_id, order_date, status, channel, campaign_id)',
            'INSERT INTO orders (order_id, customer_id, ordered_at, status)'
        )
        vals = get_values(r)  # read from ORIGINAL to get correct positions
        if len(vals) >= 4:
            oid    = vals[0]
            cid    = vals[1]
            odate  = vals[2].strip("'")
            status = vals[3].strip("'")
            if status == 'processing':
                status = 'pending'
            ts = "'" + odate + " 10:00:00'"
            r2 = re.sub(r'VALUES \(.+\);$',
                        'VALUES (' + oid + ', ' + cid + ', ' + ts + ", '" + status + "');",
                        r2, flags=re.DOTALL)
        out.append(r2)
    return out


def fix_returns(rows):
    random.seed(99)
    ret_status_pool = ['approved', 'approved', 'approved', 'refunded', 'refunded', 'rejected', 'pending']
    out = []
    for r in rows:
        r2 = r.replace(
            'INSERT INTO returns (return_id, order_id, product_id, return_date, reason, refund_amount)',
            'INSERT INTO returns (return_id, order_id, product_id, returned_at, reason, status)'
        )
        vals = get_values(r)  # original positions
        if len(vals) >= 5:
            ret_id   = vals[0]
            ord_id   = vals[1]
            prod_id  = vals[2]
            ret_date = vals[3]
            reason   = vals[4]
            # vals[5] = refund_amount — drop
            st = random.choice(ret_status_pool)
            r2 = re.sub(r'VALUES \(.+\);$',
                        'VALUES (' + ret_id + ', ' + ord_id + ', ' + prod_id + ', '
                        + ret_date + ', ' + reason + ", '" + st + "');",
                        r2, flags=re.DOTALL)
        out.append(r2)
    return out


def fix_inventory(rows):
    out = []
    for r in rows:
        r2 = r.replace(
            'INSERT INTO inventory (product_id, stock_qty, reorder_level, last_updated)',
            'INSERT INTO inventory (inventory_id, product_id, stock, updated_at)'
        )
        vals = get_values(r)  # original: [product_id, stock_qty, reorder_level, last_updated]
        if len(vals) >= 4:
            prod_id  = vals[0]
            stock    = vals[1]
            last_upd = vals[3].strip("'")
            ts = "'" + last_upd + " 00:00:00'"
            r2 = re.sub(r'VALUES \(.+\);$',
                        'VALUES (' + prod_id + ', ' + prod_id + ', ' + stock + ', ' + ts + ');',
                        r2, flags=re.DOTALL)
        out.append(r2)
    return out


def fix_sessions(rows):
    random.seed(77)
    device_pool = ['desktop', 'desktop', 'desktop', 'mobile', 'mobile', 'mobile', 'mobile', 'tablet']
    out = []
    for r in rows:
        r2 = r.replace(
            'INSERT INTO website_sessions (session_id, customer_id, session_date, source, campaign_id, pages_viewed, duration_sec, converted)',
            'INSERT INTO website_sessions (session_id, customer_id, campaign_id, started_at, pages_viewed, converted, device_type)'
        )
        vals = get_values(r)  # original: [sess_id, cust_id, sess_date, source, camp_id, pages, duration, converted]
        if len(vals) >= 8:
            sess_id   = vals[0]
            cust_id   = vals[1]
            sess_date = vals[2].strip("'")
            camp_id   = vals[4]
            pages     = vals[5]
            converted = vals[7]
            device    = random.choice(device_pool)
            ts = "'" + sess_date + " 09:00:00'"
            r2 = re.sub(r'VALUES \(.+\);$',
                        'VALUES (' + sess_id + ', ' + cust_id + ', ' + camp_id + ', '
                        + ts + ', ' + pages + ', ' + converted + ", '" + device + "');",
                        r2, flags=re.DOTALL)
        out.append(r2)
    return out


def fix_payments(rows):
    out = []
    for r in rows:
        r2 = r.replace(
            'INSERT INTO payments (payment_id, order_id, payment_date, method, amount, status)',
            'INSERT INTO payments (payment_id, order_id, amount, method, status, paid_at)'
        )
        vals = get_values(r)  # original: [pay_id, ord_id, payment_date, method, amount, status]
        if len(vals) >= 6:
            pay_id   = vals[0]
            ord_id   = vals[1]
            pay_date = vals[2].strip("'")
            method   = vals[3].strip("'")
            amount   = vals[4]
            status   = vals[5]
            if method == 'debit_card':
                method = 'credit_card'
            ts = "'" + pay_date + " 12:00:00'"
            r2 = re.sub(r'VALUES \(.+\);$',
                        'VALUES (' + pay_id + ', ' + ord_id + ', ' + amount + ", '"
                        + method + "', " + status + ', ' + ts + ');',
                        r2, flags=re.DOTALL)
        out.append(r2)
    return out


# Apply all fixes
customers_fixed  = fix_customers(customers_rows)
campaigns_fixed  = fix_campaigns(campaigns_rows)
products_fixed   = fix_products(products_rows)
orders_fixed     = fix_orders(orders_rows)
returns_fixed    = fix_returns(returns_rows)
inventory_fixed  = fix_inventory(inventory_rows)
sessions_fixed   = fix_sessions(sessions_rows)
payments_fixed   = fix_payments(payments_rows)

print("Fixes applied.")
print("  Customer sample:", customers_fixed[0][:100])
print("  Campaign[1]:", campaigns_fixed[1][:100])
print("  Product[0]:", products_fixed[0][:100])
print("  Order[7]:", orders_fixed[7][:100])
print("  Return[0]:", returns_fixed[0][:100])
print("  Inventory[0]:", inventory_fixed[0][:100])
print("  Session[0]:", sessions_fixed[0][:110])
print("  Payment[0]:", payments_fixed[0][:110])

# ================================================================
# EXTENSION 2025-2026
# ================================================================
# IDs starting points
NEW_CUST_START  = 501
NEW_CAMP_START  = 16
NEW_ORD_START   = 2001
NEW_ITEM_START  = len(order_items_rows) + 1
NEW_RET_START   = len(returns_rows) + 1
NEW_SESS_START  = len(sessions_rows) + 1
NEW_PAY_START   = len(payments_rows) + 1

# Product info needed for pricing
product_prices = {
    1: 349.99, 2: 219.99, 3: 549.99, 4: 149.99, 5: 29.99, 6: 14.99, 7: 24.99, 8: 22.99, 9: 49.99, 10: 39.99,
    11: 44.99, 12: 19.99, 13: 219.99, 14: 79.99, 15: 64.99,
    16: 49.99, 17: 59.99, 18: 39.99, 19: 39.99, 20: 59.99, 21: 79.99, 22: 69.99, 23: 34.99,
    24: 89.99, 25: 39.99, 26: 199.99, 27: 149.99, 28: 79.99, 29: 49.99, 30: 149.99,
    31: 89.99, 32: 24.99, 33: 99.99, 34: 34.99, 35: 79.99, 36: 29.99, 37: 19.99, 38: 44.99,
    39: 79.99, 40: 59.99, 41: 74.99, 42: 44.99, 43: 59.99, 44: 64.99, 45: 69.99, 46: 89.99, 47: 29.99, 48: 14.99,
    49: 24.99, 50: 29.99, 51: 9.99, 52: 99.99, 53: 54.99, 54: 89.99, 55: 24.99, 56: 34.99,
    57: 18.99, 58: 12.99, 59: 34.99, 60: 16.99, 61: 39.99, 62: 13.99,
    63: 28.99, 64: 14.99, 65: 39.99, 66: 34.99, 67: 29.99, 68: 14.99, 69: 44.99,
    70: 34.99, 71: 29.99, 72: 99.99, 73: 199.99, 74: 14.99, 75: 19.99,
    76: 149.99, 77: 29.99, 78: 79.99, 79: 19.99, 80: 34.99
}

# Category for each product (for narrative targeting)
product_category = {
    1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1, 13: 1, 14: 1, 15: 1,
    16: 2, 17: 2, 18: 2, 19: 2, 20: 2, 21: 2, 22: 2, 23: 2,
    24: 3, 25: 3, 26: 3, 27: 3, 28: 3, 29: 3, 30: 3,
    31: 4, 32: 4, 33: 4, 34: 4, 35: 4, 36: 4, 37: 4, 38: 4,
    39: 5, 40: 5, 41: 5, 42: 5, 43: 5, 44: 5, 45: 5, 46: 5, 47: 5, 48: 5,
    49: 6, 50: 6, 51: 6, 52: 6, 53: 6, 54: 6, 55: 6, 56: 6,
    57: 7, 58: 7, 59: 7, 60: 7, 61: 7, 62: 7,
    63: 8, 64: 8, 65: 8, 66: 8, 67: 8, 68: 8, 69: 8,
    70: 9, 71: 9, 72: 9, 73: 9, 74: 9, 75: 9,
    76: 10, 77: 10, 78: 10, 79: 10, 80: 10
}

# Customer countries (parsed from original)
cust_countries = {}
for r in customers_rows:
    vals = get_values(r)
    # [cid, first, last, email, city, country, signup_date, segment]
    cid = int(vals[0])
    country = vals[5].strip("'")
    cust_countries[cid] = country

# Determine Mexico and Colombia customers for geographic distribution
mexico_custs = [c for c, co in cust_countries.items() if co == 'Mexico']
colombia_custs = [c for c, co in cust_countries.items() if co == 'Colombia']
chile_custs = [c for c, co in cust_countries.items() if co == 'Chile']
argentina_custs = [c for c, co in cust_countries.items() if co == 'Argentina']
peru_custs = [c for c, co in cust_countries.items() if co == 'Peru']
all_cust_ids = list(cust_countries.keys())

print(f"Countries: MX={len(mexico_custs)}, CO={len(colombia_custs)}, CL={len(chile_custs)}, AR={len(argentina_custs)}, PE={len(peru_custs)}")

# ================================================================
# NEW CUSTOMERS 501-550 (Peru entry, premium home buyers)
# ================================================================
peru_cities = ['Lima', 'Arequipa', 'Trujillo', 'Cusco', 'Piura']
peru_names_f = ['Lucia', 'Camila', 'Andrea', 'Valeria', 'Sofia', 'Maria', 'Rosa']
peru_names_l = ['Quispe', 'Huanca', 'Flores', 'Mendoza', 'Torres', 'Ramirez', 'Garcia']
home_premium_countries = ['Mexico', 'Colombia', 'Chile', 'Argentina']
home_premium_cities = {
    'Mexico': ['Ciudad de Mexico', 'Monterrey', 'Guadalajara'],
    'Colombia': ['Bogota', 'Medellin', 'Cali'],
    'Chile': ['Santiago', 'Valparaiso'],
    'Argentina': ['Buenos Aires', 'Cordoba'],
}
eng_names_first = ['Carlos', 'Juan', 'Diego', 'Miguel', 'Roberto', 'Fernando', 'Luis', 'Andres',
                   'Ana', 'Maria', 'Laura', 'Sofia', 'Valentina', 'Camila', 'Isabella', 'Natalia']
eng_names_last  = ['Morales', 'Reyes', 'Vega', 'Cruz', 'Navarro', 'Espinoza', 'Delgado', 'Fuentes',
                   'Ortiz', 'Castillo', 'Guerrero', 'Mendoza', 'Aguilar', 'Chavez', 'Jimenez', 'Romero']

new_customers = []
new_cust_ids_peru = []
new_cust_ids_premium = []

# 501-520: Peru (feb 2025 formal entry)
for i in range(20):
    cid = 501 + i
    fn = random.choice(peru_names_f + eng_names_first)
    ln = random.choice(peru_names_l + eng_names_last)
    email = fn.lower() + '.' + ln.lower() + str(cid) + '@gmail.com'
    city = random.choice(peru_cities)
    reg_date = date(2025, 2, random.randint(1, 28))
    new_customers.append(
        "INSERT INTO customers (customer_id, first_name, last_name, email, city, country, registered_at) "
        "VALUES ({}, '{}', '{}', '{}', '{}', 'Peru', '{}');".format(
            cid, fn, ln, email, city, reg_date
        )
    )
    new_cust_ids_peru.append(cid)

# 521-550: Home premium buyers (sep 2025 catalog expansion)
for i in range(30):
    cid = 521 + i
    country = random.choice(home_premium_countries)
    city = random.choice(home_premium_cities[country])
    fn = random.choice(eng_names_first)
    ln = random.choice(eng_names_last)
    email = fn.lower() + '.' + ln.lower() + str(cid) + '@outlook.com'
    reg_date = date(2025, 9, random.randint(1, 30))
    new_customers.append(
        "INSERT INTO customers (customer_id, first_name, last_name, email, city, country, registered_at) "
        "VALUES ({}, '{}', '{}', '{}', '{}', '{}', '{}');".format(
            cid, fn, ln, email, city, country, reg_date
        )
    )
    new_cust_ids_premium.append(cid)

all_cust_ids.extend(new_cust_ids_peru + new_cust_ids_premium)
print(f"New customers: {len(new_customers)}")

# ================================================================
# NEW PRODUCTS 81-90 (hogar premium, sep 2025)
# ================================================================
# Category 4 (Home Appliances) used for premium home items
new_products = [
    "INSERT INTO products (product_id, name, category_id, price, is_active) VALUES (81, 'Set Cubiertos Inox Tramontina 24pz', 4, 189.99, TRUE);",
    "INSERT INTO products (product_id, name, category_id, price, is_active) VALUES (82, 'Cafetera de Prensa Bodum 1L', 4, 149.99, TRUE);",
    "INSERT INTO products (product_id, name, category_id, price, is_active) VALUES (83, 'Juego Sabanas Percal 300 hilos', 4, 219.99, TRUE);",
    "INSERT INTO products (product_id, name, category_id, price, is_active) VALUES (84, 'Lampara de Pie Design Nordico', 4, 299.99, TRUE);",
    "INSERT INTO products (product_id, name, category_id, price, is_active) VALUES (85, 'Set Toallas Egipcio Premium x4', 4, 129.99, TRUE);",
    "INSERT INTO products (product_id, name, category_id, price, is_active) VALUES (86, 'Cuchillos Chef Zwilling 3pz', 4, 249.99, TRUE);",
    "INSERT INTO products (product_id, name, category_id, price, is_active) VALUES (87, 'Estufa Bioetanol Design', 4, 389.99, TRUE);",
    "INSERT INTO products (product_id, name, category_id, price, is_active) VALUES (88, 'Almohada Memory Foam Premium', 4, 169.99, TRUE);",
    "INSERT INTO products (product_id, name, category_id, price, is_active) VALUES (89, 'Organizador Cocina Bambu Set 5pz', 4, 99.99, TRUE);",
    "INSERT INTO products (product_id, name, category_id, price, is_active) VALUES (90, 'Vela Aromatica Luxury Pack x3', 4, 79.99, TRUE);",
]
premium_home_pids = list(range(81, 91))
premium_home_prices = {81: 189.99, 82: 149.99, 83: 219.99, 84: 299.99, 85: 129.99,
                       86: 249.99, 87: 389.99, 88: 169.99, 89: 99.99, 90: 79.99}
product_prices.update(premium_home_prices)
for pid in premium_home_pids:
    product_category[pid] = 4

# ================================================================
# NEW CAMPAIGNS (campaigns 16-26 for 2025-2026)
# ================================================================
new_campaigns_data = [
    # Ene 2025: liquidacion electronica Argentina
    (16, 'Liquidacion Electronica AR Enero 2025', 'email',      '2025-01-05', '2025-01-31', 8000,  12400.0),
    # Feb 2025: entrada Peru
    (17, 'Lanzamiento Peru Febrero 2025',          'social',     '2025-02-01', '2025-02-28', 6000,  3200.0),
    # Mar 2025: Regreso a Clases (failed campaign)
    (18, 'Regreso a Clases MX-CO-CL 2025',        'paid_search','2025-03-01', '2025-03-31', 14000, 9800.0),
    # May 2025: growth campaign
    (19, 'Mayo Conectados 2025',                   'email',      '2025-04-20', '2025-05-31', 12000, 68000.0),
    # Jul 2025: nothing specific but mid-year
    (20, 'Mid Year Sale Julio 2025',               'display',    '2025-07-01', '2025-07-31', 7000,  28000.0),
    # Sep 2025: hogar premium launch
    (21, 'Lanzamiento Hogar Premium Sep 2025',     'social',     '2025-09-01', '2025-09-30', 10000, 22000.0),
    # Nov 2025: Black Friday (less volume better margin)
    (22, 'Black Friday 2025',                      'email',      '2025-11-01', '2025-11-28', 22000, 94000.0),
    # Nov 2025: Cyber
    (23, 'Cyber Monday 2025',                      'paid_search','2025-11-24', '2025-11-30', 14000, 55000.0),
    # Dic 2025: Navidad
    (24, 'Navidad 2025',                           'social',     '2025-12-01', '2025-12-24', 18000, 82000.0),
    # Jan 2026: stable Q1
    (25, 'Enero Reactivacion 2026',                'email',      '2026-01-05', '2026-01-31', 9000,  38000.0),
    # Apr 2026: Chile recovery after payment anomaly
    (26, 'Recuperacion Chile Abril 2026',          'affiliate',  '2026-04-01', '2026-04-30', 5000,  14000.0),
]
new_campaigns = []
for c in new_campaigns_data:
    cid, name, channel, s, e, budget, spent = c
    new_campaigns.append(
        "INSERT INTO marketing_campaigns (campaign_id, name, channel, started_at, ended_at, budget, spent) "
        "VALUES ({}, '{}', '{}', '{}', '{}', {:.2f}, {:.2f});".format(
            cid, name, channel, s, e, budget, spent
        )
    )

# ================================================================
# NEW ORDERS + ORDER_ITEMS + RETURNS + PAYMENTS + SESSIONS 2025-2026
# ================================================================
# Track state
next_ord_id  = NEW_ORD_START
next_item_id = NEW_ITEM_START
next_ret_id  = NEW_RET_START
next_sess_id = NEW_SESS_START
next_pay_id  = NEW_PAY_START

new_orders      = []
new_order_items = []
new_returns     = []
new_payments    = []
new_sessions    = []

statuses_dist = ['delivered', 'delivered', 'delivered', 'delivered', 'shipped', 'pending', 'cancelled']
pay_methods   = ['credit_card', 'credit_card', 'credit_card', 'paypal', 'bank_transfer', 'crypto']
device_pool   = ['desktop', 'desktop', 'desktop', 'mobile', 'mobile', 'mobile', 'tablet']
ret_reasons   = ['defective', 'wrong_size', 'not_as_described', 'changed_mind', 'defective']
ret_statuses  = ['approved', 'approved', 'approved', 'refunded', 'refunded', 'rejected', 'pending']

def rand_products_for_order(n=1, cat_filter=None):
    pids = [p for p, c in product_category.items() if cat_filter is None or c == cat_filter]
    return random.sample(pids, min(n, len(pids)))

def emit_order(ord_id, cust_id, ordered_at_str, status, camp_id=None):
    camp_val = str(camp_id) if camp_id else 'NULL'
    # Use simplified insert without campaign_id (not in canonical schema for orders)
    return ("INSERT INTO orders (order_id, customer_id, ordered_at, status) "
            "VALUES ({}, {}, '{}', '{}');".format(ord_id, cust_id, ordered_at_str, status))

def emit_items(ord_id, pid_list, price_multiplier=1.0):
    rows = []
    global next_item_id
    for pid in pid_list:
        qty = random.randint(1, 3)
        price = round(product_prices.get(pid, 50.0) * price_multiplier, 2)
        rows.append(
            "INSERT INTO order_items (item_id, order_id, product_id, quantity, unit_price) "
            "VALUES ({}, {}, {}, {}, {:.2f});".format(next_item_id, ord_id, pid, qty, price)
        )
        next_item_id += 1
    return rows

def emit_payment(pay_id, ord_id, amount, method, status, paid_at_str):
    return ("INSERT INTO payments (payment_id, order_id, amount, method, status, paid_at) "
            "VALUES ({}, {}, {:.2f}, '{}', '{}', '{}');".format(
                pay_id, ord_id, amount, method, status, paid_at_str
            ))

def emit_return(ret_id, ord_id, prod_id, ret_date_str, reason, status):
    return ("INSERT INTO returns (return_id, order_id, product_id, returned_at, reason, status) "
            "VALUES ({}, {}, {}, '{}', '{}', '{}');".format(
                ret_id, ord_id, prod_id, ret_date_str, reason, status
            ))

def emit_session(sess_id, cust_id, camp_id, started_at_str, pages, converted, device):
    camp_val = str(camp_id) if camp_id else 'NULL'
    return ("INSERT INTO website_sessions (session_id, customer_id, campaign_id, started_at, pages_viewed, converted, device_type) "
            "VALUES ({}, {}, {}, '{}', {}, {}, '{}');".format(
                sess_id, cust_id if cust_id else 'NULL', camp_val,
                started_at_str, pages, 'TRUE' if converted else 'FALSE', device
            ))

def date_range(start_date, end_date):
    delta = end_date - start_date
    return [start_date + timedelta(days=i) for i in range(delta.days + 1)]

# ----------------------------------------------------------------
# PERIOD DEFINITIONS with narrative events
# ----------------------------------------------------------------
periods = [
    # Dataset del curso: escalado para ser didáctico (~8000 ordenes en extension)
    # Original: 2000 ordenes / 18 meses = ~111/mes
    # Extension target: ~8000 ordenes / 17 meses = ~470/mes = ~16/dia
    # May 2025 spike: 3x el normal = ~48/dia (representa el hito de 15k en produccion)
    # Jan 2025: Argentina electronics overstock — high volume AR, low prices elec
    {'start': date(2025,1,1),  'end': date(2025,1,31),  'daily': 16,  'event': 'arg_overstock'},
    # Feb 2025: Peru entry — low erratic
    {'start': date(2025,2,1),  'end': date(2025,2,28),  'daily': 10,  'event': 'peru_entry'},
    # Mar 2025: Regreso a Clases fail — low tech conversions MX/CO/CL
    {'start': date(2025,3,1),  'end': date(2025,3,31),  'daily': 12,  'event': 'regreso_fail'},
    # Apr 2025: normal recovery
    {'start': date(2025,4,1),  'end': date(2025,4,30),  'daily': 14,  'event': None},
    # May 2025: FIRST 15k month — 3x spike vs normal (narrative: hito)
    {'start': date(2025,5,1),  'end': date(2025,5,31),  'daily': 48,  'event': 'may_spike'},
    # Jun 2025: normalize post-spike
    {'start': date(2025,6,1),  'end': date(2025,6,30),  'daily': 18,  'event': None},
    # Jul 2025: high returns (calzado Colombia) — normal volume, high return rate
    {'start': date(2025,7,1),  'end': date(2025,7,31),  'daily': 18,  'event': 'jul_returns'},
    # Aug 2025: normalize
    {'start': date(2025,8,1),  'end': date(2025,8,31),  'daily': 17,  'event': None},
    # Sep 2025: hogar premium launch — normal volume, high ticket
    {'start': date(2025,9,1),  'end': date(2025,9,30),  'daily': 18,  'event': 'hogar_premium'},
    # Oct 2025: normal growth
    {'start': date(2025,10,1), 'end': date(2025,10,31), 'daily': 19,  'event': None},
    # Nov 2025: Black Friday — big spike on Nov 28, normal rest of month
    {'start': date(2025,11,1), 'end': date(2025,11,28), 'daily': 20,  'event': 'bf_2025'},
    # Dec 2025: Navidad
    {'start': date(2025,12,1), 'end': date(2025,12,31), 'daily': 22,  'event': None},
    # Jan 2026: stable Q1 start
    {'start': date(2026,1,1),  'end': date(2026,1,31),  'daily': 20,  'event': None},
    # Feb 2026: stable
    {'start': date(2026,2,1),  'end': date(2026,2,28),  'daily': 21,  'event': None},
    # Mar 2026: Chile payment anomaly begins
    {'start': date(2026,3,1),  'end': date(2026,3,31),  'daily': 21,  'event': 'chile_payments'},
    # Apr 2026: Chile payment anomaly continues
    {'start': date(2026,4,1),  'end': date(2026,4,30),  'daily': 20,  'event': 'chile_payments'},
    # May 2026: current (half month)
    {'start': date(2026,5,1),  'end': date(2026,5,15),  'daily': 21,  'event': None},
]

random.seed(2025)

# Campaign mapping by month/event
camp_by_event = {
    'arg_overstock': 16,
    'peru_entry': 17,
    'regreso_fail': 18,
    'may_spike': 19,
    'jul_returns': 20,
    'hogar_premium': 21,
    'bf_2025': 22,
    'chile_payments': 26,
}

total_orders_generated = 0

for period in periods:
    days = date_range(period['start'], period['end'])
    event = period['event']
    daily_target = min(period['daily'], 80)  # cap at 80/day to keep file manageable

    camp_id_period = camp_by_event.get(event)

    for d in days:
        # Vary daily count with some noise
        n_orders = max(1, int(daily_target * random.uniform(0.7, 1.3)))

        # Black Friday 2025 Nov 28: big spike (~3x the daily average for Nov)
        if d == date(2025, 11, 28):
            n_orders = 58  # 2.9x the normal Nov daily, less than BF 2024 proportional

        for _ in range(n_orders):
            ord_id = next_ord_id
            next_ord_id += 1

            # ---- Choose customer ----
            if event == 'arg_overstock':
                # Concentrate in Argentina
                if random.random() < 0.55:
                    cust_id = random.choice(argentina_custs) if argentina_custs else random.choice(all_cust_ids)
                else:
                    cust_id = random.choice(all_cust_ids)
            elif event == 'peru_entry':
                # New Peru customers
                if random.random() < 0.45 and new_cust_ids_peru:
                    cust_id = random.choice(new_cust_ids_peru)
                else:
                    cust_id = random.choice(peru_custs + new_cust_ids_peru if peru_custs else all_cust_ids)
            elif event == 'jul_returns':
                # Colombia heavy
                if random.random() < 0.4 and colombia_custs:
                    cust_id = random.choice(colombia_custs)
                else:
                    cust_id = random.choice(all_cust_ids)
            elif event == 'hogar_premium':
                if random.random() < 0.5 and new_cust_ids_premium:
                    cust_id = random.choice(new_cust_ids_premium)
                else:
                    cust_id = random.choice(all_cust_ids)
            elif event == 'chile_payments':
                # Chile heavy for anomaly
                if random.random() < 0.35 and chile_custs:
                    cust_id = random.choice(chile_custs)
                else:
                    cust_id = random.choice(all_cust_ids)
            elif event == 'regreso_fail':
                if random.random() < 0.5 and (mexico_custs + colombia_custs + chile_custs):
                    cust_id = random.choice(mexico_custs + colombia_custs + chile_custs)
                else:
                    cust_id = random.choice(all_cust_ids)
            else:
                # Weighted by MX>CO>rest
                w = random.random()
                if w < 0.38 and mexico_custs:
                    cust_id = random.choice(mexico_custs)
                elif w < 0.62 and colombia_custs:
                    cust_id = random.choice(colombia_custs)
                else:
                    cust_id = random.choice(all_cust_ids)

            # ---- Order status ----
            status = random.choice(statuses_dist)
            ts = d.strftime('%Y-%m-%d') + ' ' + '{:02d}:{:02d}:00'.format(
                random.randint(8, 22), random.randint(0, 59))

            new_orders.append(emit_order(ord_id, cust_id, ts, status, camp_id_period))

            # ---- Products ----
            if event == 'arg_overstock':
                # Electronics category 1 with discounted price
                pids = rand_products_for_order(random.randint(1, 3), cat_filter=1)
                price_mult = random.uniform(0.70, 0.82)  # 18-30% discount
            elif event == 'regreso_fail':
                # Technology products in MX/CO/CL but lower conversion
                pids = rand_products_for_order(random.randint(1, 2), cat_filter=random.choice([1, 3]))
                price_mult = 1.0
            elif event == 'jul_returns':
                # Mix but include footwear (cat 5, specifically shoes 41,44)
                if random.random() < 0.3:
                    pids = random.sample([41, 44, 39, 40], min(2, 2))
                else:
                    pids = rand_products_for_order(random.randint(1, 3))
                price_mult = 1.0
            elif event == 'hogar_premium':
                # Premium home products (81-90) with higher ticket
                if random.random() < 0.4:
                    pids = rand_products_for_order(random.randint(1, 2), cat_filter=None)
                    pids = [p if p not in premium_home_pids else random.choice(premium_home_pids) for p in pids]
                    pids = random.sample(premium_home_pids, min(2, len(premium_home_pids)))
                else:
                    pids = rand_products_for_order(random.randint(1, 3))
                price_mult = 1.0
            else:
                pids = rand_products_for_order(random.randint(1, 3))
                price_mult = 1.0

            item_rows = emit_items(ord_id, pids, price_mult)
            new_order_items.extend(item_rows)

            # ---- Payment (only for delivered orders) ----
            if status == 'delivered':
                amount = round(sum(product_prices.get(p, 50.0) * price_mult * random.randint(1, 2) for p in pids), 2)
                pay_ts = (d + timedelta(days=random.randint(0, 1))).strftime('%Y-%m-%d') + ' 12:00:00'

                # Chile payment anomaly: 40% more failures, concentrated in credit_card
                if event == 'chile_payments' and cust_id in chile_custs:
                    method = 'credit_card'  # anomaly concentrated in credit_card
                    pay_status = random.choices(
                        ['completed', 'failed', 'pending'],
                        weights=[0.52, 0.40, 0.08]
                    )[0]
                else:
                    method = random.choice(pay_methods)
                    pay_status = random.choices(
                        ['completed', 'completed', 'completed', 'completed', 'failed', 'refunded'],
                        weights=[0.75, 0.75, 0.75, 0.75, 0.10, 0.15]
                    )[0]
                    # normalize weights
                    pay_status = random.choices(['completed', 'failed', 'refunded'],
                                               weights=[0.83, 0.07, 0.10])[0]

                new_payments.append(emit_payment(next_pay_id, ord_id, amount, method, pay_status, pay_ts))
                next_pay_id += 1

                # ---- Returns (only from delivered) ----
                # July 2025: spike to 8.3% concentrated in footwear/Colombia
                if event == 'jul_returns' and cust_id in colombia_custs:
                    ret_prob = 0.20  # spike
                else:
                    ret_prob = 0.055

                for pid in pids:
                    if random.random() < ret_prob:
                        ret_date = (d + timedelta(days=random.randint(3, 14))).strftime('%Y-%m-%d')
                        reason = random.choice(ret_reasons)
                        # July Colombia footwear: concentrate reason on wrong_size
                        if event == 'jul_returns' and cust_id in colombia_custs and pid in [41, 44]:
                            reason = 'wrong_size'
                        ret_st = random.choice(ret_statuses)
                        new_returns.append(emit_return(next_ret_id, ord_id, pid, ret_date, reason, ret_st))
                        next_ret_id += 1

            # ---- Sessions (2-3 sessions per order, 1 per non-ordering visit) ----
            n_sess = random.randint(1, 3)
            for s in range(n_sess):
                sess_ts = (d - timedelta(days=random.randint(0, 2))).strftime('%Y-%m-%d') + \
                          ' {:02d}:00:00'.format(random.randint(8, 22))
                pages = random.randint(1, 15)
                converted = (s == 0)  # first session is the buying one
                device = random.choice(device_pool)
                # Some sessions anonymous
                sess_cust = cust_id if random.random() > 0.25 else 'NULL'
                new_sessions.append(emit_session(
                    next_sess_id, sess_cust, camp_id_period, sess_ts, pages, converted, device
                ))
                next_sess_id += 1

        total_orders_generated += n_orders

print(f"Extension generated: orders={len(new_orders)}, items={len(new_order_items)}, "
      f"returns={len(new_returns)}, payments={len(new_payments)}, sessions={len(new_sessions)}")
print(f"Total orders in extended dataset: {len(orders_rows) + len(new_orders)}")

# ================================================================
# UPDATED INVENTORY (update stock for extended period)
# ================================================================
# Keep original inventory but update timestamps to 2026-05-15
def update_inventory(rows):
    out = []
    for r in rows:
        r2 = re.sub(r"'2024-\d{2}-\d{2} 00:00:00'", "'2026-05-15 00:00:00'", r)
        out.append(r2)
    return out

inventory_updated = update_inventory(inventory_fixed)

# Add inventory records for new products 81-90
new_inventory = []
for pid in premium_home_pids:
    stock = random.randint(5, 50)
    new_inventory.append(
        "INSERT INTO inventory (inventory_id, product_id, stock, updated_at) "
        "VALUES ({}, {}, {}, '2026-05-15 00:00:00');".format(pid, pid, stock)
    )

# ================================================================
# WRITE OUTPUT FILES
# ================================================================
HEADER_BASE = """-- =============================================================
-- SHOPSPHERE SEED DATA — BASE
-- Generado: 2026-05-31 (corregido por sql-data-analyst QA)
-- Contiene: categories, customers (500+50), marketing_campaigns, products
-- Schema: canónico del curso (columnas y CHECKs corregidos)
-- Correcciones aplicadas:
--   - customers.signup_date → registered_at (columna segment eliminada)
--   - marketing_campaigns: start_date→started_at, end_date→ended_at,
--     revenue_generated→spent; channel: google_ads→paid_search, influencer→social
--   - products: cost y sku eliminados, is_active agregado (TRUE por defecto)
--   - Nuevos clientes 501-520 (Perú, feb 2025) y 521-550 (hogar premium, sep 2025)
--   - Nuevos productos 81-90 (hogar premium, sep 2025)
-- =============================================================
"""

HEADER_TRANS = """-- =============================================================
-- SHOPSPHERE SEED DATA — TRANSACCIONAL
-- Generado: 2026-05-31 (corregido por sql-data-analyst QA)
-- Contiene: orders, order_items, returns, payments, website_sessions
-- Rango: 2023-06-01 a 2026-05-15 (extendido desde 2024-12)
-- Correcciones aplicadas:
--   - orders.order_date → ordered_at (TIMESTAMP), status: processing→pending
--     columnas channel y campaign_id eliminadas del schema canónico
--   - returns.return_date → returned_at, refund_amount eliminado, status agregado
--   - payments.payment_date → paid_at (TIMESTAMP), debit_card → credit_card
--     columnas reordenadas al schema canónico
--   - website_sessions: session_date→started_at (TIMESTAMP), source y duration_sec
--     eliminados, device_type agregado ('desktop','mobile','tablet')
-- Eventos narrativos del timeline (Part C de shopsphere-world.md):
--   - Ene 2025: sobre-stock electronica Argentina (precios -18-30%, volumen alto)
--   - Feb 2025: entrada Perú (volumen bajo y errático)
--   - Mar 2025: campaña Regreso a Clases fallida (caída en tech MX/CO/CL)
--   - May 2025: primer mes +15k pedidos (escalado a dataset del curso: ~2400)
--   - Jul 2025: tasa devolución 8.3% (spike en calzado/Colombia)
--   - Sep 2025: entrada hogar premium (ticket alto, retención alta)
--   - Nov 2025: Black Friday con menos volumen pero mejores márgenes
--   - Mar-Abr 2026: anomalía pagos Chile (40% más fallidos en credit_card)
-- =============================================================
"""

HEADER_OPS = """-- =============================================================
-- SHOPSPHERE SEED DATA — OPERACIONAL
-- Generado: 2026-05-31 (corregido por sql-data-analyst QA)
-- Contiene: inventory
-- Correcciones aplicadas:
--   - inventory: inventory_id (PK) agregado, stock_qty→stock,
--     last_updated→updated_at (TIMESTAMP), reorder_level eliminado
--   - Timestamps actualizados a 2026-05-15 (estado actual del inventario)
--   - Nuevos registros inventory_id 81-90 para productos hogar premium
-- =============================================================
"""

def write_section(lines_list, section_name):
    return '\n-- ' + '-'*60 + '\n-- ' + section_name + '\n-- ' + '-'*60 + '\n' + \
           '\n'.join(lines_list) + '\n'

# ---- BASE FILE ----
with open(OUT_BASE, 'w', encoding='utf-8') as f:
    f.write(HEADER_BASE + '\n')
    f.write('BEGIN;\n')
    f.write(write_section(categories_rows, '1. CATEGORIES'))
    f.write(write_section(customers_fixed + new_customers, '2. CUSTOMERS (500 originales + 50 nuevos)'))
    f.write(write_section(campaigns_fixed + new_campaigns, '3. MARKETING_CAMPAIGNS (15 originales + 11 nuevas)'))
    f.write(write_section(products_fixed + new_products, '4. PRODUCTS (80 originales + 10 hogar premium)'))
    f.write('\nCOMMIT;\n')
    f.write('\n-- End of shopsphere-seed-base.sql\n')

# ---- TRANSACCIONAL FILE ----
with open(OUT_TRANS, 'w', encoding='utf-8') as f:
    f.write(HEADER_TRANS + '\n')
    f.write('BEGIN;\n')
    f.write(write_section(orders_fixed + new_orders, '5. ORDERS'))
    f.write(write_section(order_items_rows + new_order_items, '6. ORDER_ITEMS'))
    f.write(write_section(returns_fixed + new_returns, '7. RETURNS'))
    f.write(write_section(payments_fixed + new_payments, '8. PAYMENTS'))
    f.write(write_section(sessions_fixed + new_sessions, '9. WEBSITE_SESSIONS'))
    f.write('\nCOMMIT;\n')
    f.write('\n-- End of shopsphere-seed-transaccional.sql\n')

# ---- OPERACIONAL FILE ----
with open(OUT_OPS, 'w', encoding='utf-8') as f:
    f.write(HEADER_OPS + '\n')
    f.write('BEGIN;\n')
    f.write(write_section(inventory_updated + new_inventory, '10. INVENTORY'))
    f.write('\nCOMMIT;\n')
    f.write('\n-- End of shopsphere-seed-operacional.sql\n')

# ---- File sizes ----
for path in [OUT_BASE, OUT_TRANS, OUT_OPS]:
    size = os.path.getsize(path)
    count = sum(1 for line in open(path, encoding='utf-8') if line.strip().startswith('INSERT'))
    print(f"{os.path.basename(path)}: {size/1024:.0f} KB, {count} INSERT statements")

print("\nDone.")
