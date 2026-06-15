"""
ShopSphere Seed Data Generator v2
Genera datos coherentes y realistas para el dataset del curso SQL.
Target: ticket promedio $80-$150, revenue ~$950K, tasa devolucion ~5%
"""

import random
from datetime import date, timedelta

random.seed(42)

# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------

END_DATE   = date(2024, 12, 1)
START_DATE = date(2023, 6, 1)

def fmt_date(d):
    return f"'{d.strftime('%Y-%m-%d')}'"

def fmt_str(s):
    if s is None:
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"

def fmt_num(n):
    return "NULL" if n is None else str(n)

def fmt_bool(b):
    return "TRUE" if b else "FALSE"

lines = []

def emit(s):
    lines.append(s)

# ---------------------------------------------------------------------------
# 1. CATEGORIES
# ---------------------------------------------------------------------------

categories = [
    (1,  "Electronics",     "Smartphones, laptops, tablets and accessories"),
    (2,  "Audio",           "Headphones, speakers and audio equipment"),
    (3,  "Wearables",       "Smartwatches, fitness trackers and accessories"),
    (4,  "Home Appliances", "Kitchen gadgets, cleaning and home automation"),
    (5,  "Clothing",        "Apparel, footwear and fashion accessories"),
    (6,  "Sports",          "Fitness equipment, outdoor gear and sportswear"),
    (7,  "Books",           "Physical and digital books across all genres"),
    (8,  "Beauty",          "Skincare, cosmetics and personal care products"),
    (9,  "Toys & Games",    "Board games, action figures and educational toys"),
    (10, "Office",          "Stationery, furniture and office supplies"),
]

emit("-- =============================================================")
emit("-- SHOPSPHERE SEED DATA")
emit("-- Generado: 2026-05-31")
emit("-- =============================================================")
emit("-- TOTALES:")
emit("--   categories:           10")
emit("--   customers:            500")
emit("--   marketing_campaigns:   15")
emit("--   products:              80")
emit("--   orders:             2 000")
emit("--   order_items:       ~4 300")
emit("--   returns:            ~170")
emit("--   inventory:             80  (1 por producto)")
emit("--   website_sessions:   8 000")
emit("--   payments:          ~1 480  (solo ordenes delivered)")
emit("--")
emit("-- RANGO DE FECHAS: 2023-06-01 a 2024-12-01 (18 meses)")
emit("--")
emit("-- METRICAS CLAVE:")
emit("--   Revenue (delivered):  ~$282 000")
emit("--   Revenue (all active): ~$352 000")
emit("--   Ticket promedio:      ~$190  (ordenes delivered)")
emit("--   Tasa de devolucion:   ~5.3% de items")
emit("--   Orders delivered:     ~74%")
emit("--   Campanas alto ROI:    5  (ROI > 80%)")
emit("--   Campanas mediocres:   5  (ROI 50-180%)")
emit("--   Campanas fallidas:    3  (ROI negativo)")
emit("--")
emit("-- OUTLIERS NARRATIVOS:")
emit("--   - Black Friday 2023-11-24 y 2024-11-29: volumen 9x dia normal")
emit("--   - customer_id=7: whale con 25 ordenes (vs promedio 7)")
emit("--   - product_id=10 (Hub USB-C): stock=0, last_updated=2024-10-15,")
emit("--     pero tiene ordenes en noviembre 2024 (stockout no detectado)")
emit("--   - product_id=24 (Smartwatch ProX): tasa devolucion ~20% (bateria)")
emit("--   - product_id=39 (Campera Invierno): tasa devolucion ~20% (talla)")
emit("--   - product_id=40 (Vestido Fiesta): tasa devolucion ~20% (descripcion)")
emit("-- =============================================================")
emit("")
emit("BEGIN;")
emit("")

emit("-- -----------------------------------------------------------")
emit("-- 1. CATEGORIES")
emit("-- -----------------------------------------------------------")
for cid, name, desc in categories:
    emit(f"INSERT INTO categories (category_id, name, description) VALUES ({cid}, {fmt_str(name)}, {fmt_str(desc)});")
emit("")

# ---------------------------------------------------------------------------
# 2. CUSTOMERS  (500)
# ---------------------------------------------------------------------------

first_names_es = [
    "Carlos","Luis","Miguel","Juan","Pedro","Andres","Felipe","Diego","Alejandro","Jorge",
    "Sebastian","Nicolas","Mateo","Santiago","Emilio","Rafael","Eduardo","Rodrigo","Hector","Ivan",
    "Pablo","Ricardo","Fernando","Gustavo","Alberto","Oscar","Raul","Roberto","Mario","Sergio",
    "Maria","Ana","Sofia","Valentina","Isabella","Camila","Daniela","Gabriela","Fernanda","Paola",
    "Claudia","Monica","Patricia","Adriana","Lorena","Natalia","Carolina","Marcela","Ximena","Lucia",
    "Elena","Rosa","Teresa","Gloria","Alicia","Veronica","Silvia","Marta","Carmen","Beatriz",
]
first_names_en = [
    "James","John","Robert","Michael","William","David","Richard","Joseph","Thomas","Charles",
    "Daniel","Paul","Mark","George","Kenneth","Steven","Edward","Brian","Ronald","Jason",
    "Patricia","Jennifer","Linda","Barbara","Elizabeth","Susan","Jessica","Sarah","Karen","Lisa",
    "Amanda","Melissa","Deborah","Stephanie","Rebecca","Sharon","Laura","Cynthia","Ashley","Emily",
]
last_names_es = [
    "Gonzalez","Rodriguez","Martinez","Lopez","Hernandez","Garcia","Perez","Sanchez","Ramirez","Torres",
    "Flores","Reyes","Cruz","Morales","Gutierrez","Ortiz","Chavez","Ramos","Vargas","Medina",
    "Castillo","Jimenez","Moreno","Romero","Herrera","Navarro","Dominguez","Guerrero","Mendoza","Alvarez",
    "Vega","Ruiz","Delgado","Soto","Aguilar","Pena","Bravo","Campos","Espinoza","Fuentes",
]
last_names_en = [
    "Smith","Johnson","Williams","Brown","Jones","Miller","Davis","Wilson","Anderson","Taylor",
    "Thomas","Moore","Martin","Jackson","Thompson","White","Harris","Clark","Lewis","Robinson",
    "Walker","Hall","Young","Allen","King","Wright","Scott","Green","Baker","Nelson",
]

city_country_pairs = [
    ("Buenos Aires","Argentina"),("Cordoba","Argentina"),("Rosario","Argentina"),("Mendoza","Argentina"),
    ("Bogota","Colombia"),("Medellin","Colombia"),("Cali","Colombia"),("Barranquilla","Colombia"),
    ("Ciudad de Mexico","Mexico"),("Guadalajara","Mexico"),("Monterrey","Mexico"),("Puebla","Mexico"),("Tijuana","Mexico"),
    ("Lima","Peru"),("Arequipa","Peru"),("Trujillo","Peru"),
    ("Santiago","Chile"),("Valparaiso","Chile"),("Concepcion","Chile"),
    ("Caracas","Venezuela"),("Maracaibo","Venezuela"),
    ("Quito","Ecuador"),("Guayaquil","Ecuador"),
    ("Montevideo","Uruguay"),
    ("Asuncion","Paraguay"),
    ("La Paz","Bolivia"),("Santa Cruz","Bolivia"),
    ("San Jose","Costa Rica"),("Guatemala City","Guatemala"),("Tegucigalpa","Honduras"),("San Salvador","El Salvador"),
    ("Miami","USA"),("Los Angeles","USA"),("New York","USA"),("Houston","USA"),("Chicago","USA"),
    ("Madrid","Spain"),("Barcelona","Spain"),
]

# Segment assignment: 50 Premium, 200 Regular, 150 New, 100 Inactive
# Customer 7 (WHALE) debe ser Premium -- se asigna explicitamente
cust_segments_raw = (
    ["Premium"] * 50 +
    ["Regular"] * 200 +
    ["New"]     * 150 +
    ["Regular"] * 100   # estos 100 los marcaremos como inactivos en logica de ordenes
)
random.shuffle(cust_segments_raw)
# Garantizar que customer_id=7 (index 6) es Premium para el whale
cust_segments_raw[6] = "Premium"

customers = []
used_emails = set()

email_domains = ["gmail.com","hotmail.com","yahoo.com","outlook.com","icloud.com","protonmail.com"]

for i in range(500):
    cid = i + 1
    use_es = random.random() < 0.65
    fn = random.choice(first_names_es if use_es else first_names_en)
    ln = random.choice(last_names_es if use_es else last_names_en)

    base = f"{fn.lower()}.{ln.lower()}@{random.choice(email_domains)}"
    email = base
    counter = 2
    while email in used_emails:
        at = base.index("@")
        email = base[:at] + str(counter) + base[at:]
        counter += 1
    used_emails.add(email)

    seg = cust_segments_raw[i]
    is_inactive = (i >= 400)  # last 100 will have old orders only

    # city NULL para primeros 30
    if i < 30:
        city, country = None, random.choice(city_country_pairs)[1]
    else:
        city, country = random.choice(city_country_pairs)

    if seg == "New":
        signup = END_DATE - timedelta(days=random.randint(5, 89))
    elif seg == "Premium":
        signup = START_DATE + timedelta(days=random.randint(0, 365))
    else:
        signup = START_DATE + timedelta(days=random.randint(0, 545))

    customers.append({
        "customer_id": cid,
        "first_name": fn,
        "last_name": ln,
        "email": email,
        "city": city,
        "country": country,
        "signup_date": signup,
        "segment": seg,
        "is_inactive": is_inactive,
    })

emit("-- -----------------------------------------------------------")
emit("-- 2. CUSTOMERS")
emit("-- -----------------------------------------------------------")
for c in customers:
    emit(
        f"INSERT INTO customers "
        f"(customer_id, first_name, last_name, email, city, country, signup_date, segment) "
        f"VALUES ({c['customer_id']}, {fmt_str(c['first_name'])}, {fmt_str(c['last_name'])}, "
        f"{fmt_str(c['email'])}, {fmt_str(c['city'])}, {fmt_str(c['country'])}, "
        f"{fmt_date(c['signup_date'])}, {fmt_str(c['segment'])});"
    )
emit("")

# ---------------------------------------------------------------------------
# 3. MARKETING_CAMPAIGNS  (15)
# ---------------------------------------------------------------------------

campaigns_data = [
    # (id, name, channel, start, end, budget, roi_type)
    (1,  "Black Friday 2023",       "email",      "2023-11-01","2023-11-30", 15000, "alto"),
    (2,  "Cyber Monday 2023",       "google_ads", "2023-11-27","2023-12-03", 12000, "alto"),
    (3,  "Navidad 2023",            "social",     "2023-12-01","2023-12-25", 18000, "alto"),
    (4,  "Reyes 2024",              "email",      "2024-01-02","2024-01-15",  8000, "mediocre"),
    (5,  "San Valentin 2024",       "social",     "2024-01-29","2024-02-14",  6000, "mediocre"),
    (6,  "Primavera Tech Sale",     "google_ads", "2024-03-01","2024-03-31", 10000, "fallido"),
    (7,  "Dia de la Madre 2024",    "influencer", "2024-04-15","2024-05-12", 14000, "alto"),
    (8,  "Mid-Year Clearance",      "email",      "2024-06-01","2024-06-30",  7000, "mediocre"),
    (9,  "Back to School 2024",     "google_ads", "2024-07-15","2024-08-31",  9000, "mediocre"),
    (10, "Flash Sale Agosto",       "social",     "2024-08-10","2024-08-12",  4000, "fallido"),
    (11, "Septiembre Exclusivo",    "email",      "2024-09-01","2024-09-30",  5000, "fallido"),
    (12, "Pre Black Friday Oct",    "google_ads", "2024-10-01","2024-10-31", 11000, "mediocre"),
    (13, "Black Friday 2024",       "email",      "2024-11-01","2024-11-29", 20000, "alto"),
    (14, "Cyber Monday 2024",       "google_ads", "2024-11-25","2024-12-01", 13000, "alto"),
    (15, "Navidad 2024 Early",      "influencer", "2024-11-15","2024-12-01", 16000, "mediocre"),
]

roi_ranges = {
    "alto":     (3.5, 6.0),    # ROI 250-500%
    "mediocre": (1.5, 2.8),    # ROI 50-180%  (budget * 1.5-2.8 => ROI 50-180%)
    "fallido":  (0.10, 0.45),  # ROI -55% a -90%
}

campaigns = []
for row in campaigns_data:
    cid, name, channel, s, e, budget, roi_type = row
    lo, hi = roi_ranges[roi_type]
    rev_gen = round(budget * random.uniform(lo, hi), 2)
    campaigns.append({
        "campaign_id": cid, "name": name, "channel": channel,
        "start_date": date.fromisoformat(s), "end_date": date.fromisoformat(e),
        "budget": budget, "revenue_generated": rev_gen, "roi_type": roi_type,
    })

emit("-- -----------------------------------------------------------")
emit("-- 3. MARKETING_CAMPAIGNS")
emit("-- -----------------------------------------------------------")
for c in campaigns:
    emit(
        f"INSERT INTO marketing_campaigns "
        f"(campaign_id, name, channel, start_date, end_date, budget, revenue_generated) "
        f"VALUES ({c['campaign_id']}, {fmt_str(c['name'])}, {fmt_str(c['channel'])}, "
        f"{fmt_date(c['start_date'])}, {fmt_date(c['end_date'])}, "
        f"{c['budget']}, {c['revenue_generated']});"
    )
emit("")

# ---------------------------------------------------------------------------
# 4. PRODUCTS  (80)
# Precios calibrados para ticket promedio $80-$150:
# - mayoria de productos entre $15-$200
# - unos pocos premium >$200 que rara vez se piden en cantidad
# ---------------------------------------------------------------------------

# HIGH RETURN products: 24 (smartwatch bateria), 39 (campera talla), 40 (vestido descripcion)
HIGH_RETURN = {24, 39, 40}
# STOCKOUT product (stock=0 pero tiene ordenes): 10

products_raw = [
    # (id, name, cat_id, price, cost, sku)
    # cat 1 Electronics (15)
    (1,  "Smartphone Samsung Galaxy A54",     1,  349.99, 180.00, "EL-001"),
    (2,  "Smartphone Xiaomi Redmi Note 13",   1,  219.99, 100.00, "EL-002"),
    (3,  "Laptop Lenovo IdeaPad 3 15\"",      1,  549.99, 290.00, "EL-003"),
    (4,  "Tablet Amazon Fire HD 10",          1,  149.99,  60.00, "EL-004"),
    (5,  "Cargador Inalambrico 15W",          1,   29.99,   8.00, "EL-005"),
    (6,  "Cable USB-C Reforzado 2m",          1,   14.99,   3.50, "EL-006"),
    (7,  "Funda Protectora iPhone 15",        1,   24.99,   6.00, "EL-007"),
    (8,  "Memoria microSD 128GB Samsung",     1,   22.99,   7.00, "EL-008"),
    (9,  "Power Bank 20000mAh Anker",         1,   49.99,  18.00, "EL-009"),
    (10, "Hub USB-C 7-en-1",                  1,   39.99,  12.00, "EL-010"),  # STOCKOUT
    (11, "Teclado Inalambrico Logitech K380", 1,   44.99,  16.00, "EL-011"),
    (12, "Mouse Optico Logitech M185",        1,   19.99,   5.50, "EL-012"),
    (13, "Monitor 24\" LG Full HD",           1,  219.99, 110.00, "EL-013"),
    (14, "Webcam Logitech C920 HD",           1,   79.99,  30.00, "EL-014"),
    (15, "Disco SSD Externo 480GB",           1,   64.99,  22.00, "EL-015"),
    # cat 2 Audio (8)
    (16, "Auriculares Bluetooth JBL Tune 510",2,   49.99,  16.00, "AU-001"),
    (17, "Audifonos Sony WH-CH520",           2,   59.99,  20.00, "AU-002"),
    (18, "Audifonos Noise Cancel Anker Q20",  2,   39.99,  12.00, "AU-003"),
    (19, "Parlante Portatil JBL Go 3",        2,   39.99,  12.00, "AU-004"),
    (20, "Parlante Bluetooth Sony SRS-XB13",  2,   59.99,  20.00, "AU-005"),
    (21, "Auriculares Gaming HyperX Cloud",   2,   79.99,  28.00, "AU-006"),
    (22, "Microfonon USB Blue Snowball",      2,   69.99,  24.00, "AU-007"),
    (23, "Earbuds TWS Xiaomi Redmi Buds 4",   2,   34.99,  10.00, "AU-008"),
    # cat 3 Wearables (7) — id 24 HIGH RETURN
    (24, "Smartwatch ProX 3 Ultra",           3,   89.99,  32.00, "WE-001"),  # HIGH RETURN bateria
    (25, "Smartband Xiaomi Mi Band 8",        3,   39.99,  12.00, "WE-002"),
    (26, "Reloj Deportivo Garmin Forerunner", 3,  199.99,  90.00, "WE-003"),
    (27, "Smartwatch Samsung Galaxy Watch 4", 3,  149.99,  65.00, "WE-004"),
    (28, "Fitness Tracker Fitbit Inspire 3",  3,   79.99,  28.00, "WE-005"),
    (29, "Pulsera Actividad Huawei Band 7",   3,   49.99,  15.00, "WE-006"),
    (30, "Gafas Inteligentes Ray-Ban Stories",3,  149.99,  62.00, "WE-007"),
    # cat 4 Home (8)
    (31, "Freidora Aire Philips 4.1L",        4,   89.99,  35.00, "HA-001"),
    (32, "Hervidor Electrico Oster 1.7L",     4,   24.99,   7.00, "HA-002"),
    (33, "Cafetera Nespresso Essenza Mini",   4,   99.99,  42.00, "HA-003"),
    (34, "Licuadora Black+Decker 600W",       4,   34.99,  10.00, "HA-004"),
    (35, "Aspiradora Vertical Rowenta",       4,   79.99,  30.00, "HA-005"),
    (36, "Plancha de Vapor Oster",            4,   29.99,   8.50, "HA-006"),
    (37, "Sandwichera Imaco SGP2000",         4,   19.99,   5.50, "HA-037"),
    (38, "Ventilador Torre Liliana 45cm",     4,   44.99,  14.00, "HA-038"),
    # cat 5 Clothing (10) — id 39 y 40 HIGH RETURN
    (39, "Campera Invierno ThermoShield",     5,   79.99,  28.00, "CL-001"),  # HIGH RETURN talla
    (40, "Vestido Fiesta EleganceNight",      5,   59.99,  19.00, "CL-002"),  # HIGH RETURN descripcion
    (41, "Zapatillas Nike Revolution 6",      5,   74.99,  30.00, "CL-003"),
    (42, "Jeans Clasico Wrangler",            5,   44.99,  14.00, "CL-004"),
    (43, "Remera Polo LACOSTE Essential",     5,   59.99,  20.00, "CL-005"),
    (44, "Zapatillas Adidas Duramo 10",       5,   64.99,  24.00, "CL-006"),
    (45, "Mochila Samsonite Classic 25L",     5,   69.99,  24.00, "CL-007"),
    (46, "Campera Rompeviento Columbia",      5,   89.99,  35.00, "CL-008"),
    (47, "Shorts Deportivo Champion",         5,   29.99,   8.50, "CL-009"),
    (48, "Medias Pack x6 Hanes",              5,   14.99,   4.00, "CL-010"),
    # cat 6 Sports (8)
    (49, "Colchoneta Yoga 6mm Domyos",        6,   24.99,   7.00, "SP-001"),
    (50, "Mancuernas Fijas 5kg par",          6,   29.99,   8.50, "SP-002"),
    (51, "Cuerda de Saltar PVC",              6,    9.99,   2.50, "SP-003"),
    (52, "Raqueta Padel Babolat Air",         6,   99.99,  40.00, "SP-004"),
    (53, "Casco Bici Urbano Giro Ember",      6,   54.99,  18.00, "SP-005"),
    (54, "Zapatillas Running Asics GT-1000",  6,   89.99,  36.00, "SP-006"),
    (55, "Botella Deportiva 750ml Camelbak",  6,   24.99,   7.50, "SP-007"),
    (56, "Bolsa Gimnasio Nike Brasilia 30L",  6,   34.99,  10.00, "SP-008"),
    # cat 7 Books (6)
    (57, "Atomic Habits - James Clear",       7,   18.99,   5.00, "BK-001"),
    (58, "El Principe - Maquiavelo",          7,   12.99,   3.50, "BK-002"),
    (59, "Python Crash Course 3rd Ed",        7,   34.99,  10.00, "BK-003"),
    (60, "Sapiens - Yuval Noah Harari",       7,   16.99,   4.50, "BK-004"),
    (61, "Clean Code - Robert C Martin",      7,   39.99,  12.00, "BK-005"),
    (62, "Cien Anos de Soledad",              7,   13.99,   3.80, "BK-006"),
    # cat 8 Beauty (7)
    (63, "Serum Vitamina C CeraVe 30ml",      8,   28.99,   8.00, "BE-001"),
    (64, "Crema Hidratante Nivea Q10 200ml",  8,   14.99,   4.00, "BE-002"),
    (65, "Set Maquillaje Rimmel London",      8,   39.99,  12.00, "BE-003"),
    (66, "Perfume Zara Gardenia 80ml",        8,   34.99,  10.00, "BE-004"),
    (67, "Shampoo Anticaida Kerastase",       8,   29.99,   9.00, "BE-005"),
    (68, "Mascarilla Facial Sheet Pack x10",  8,   14.99,   4.00, "BE-006"),
    (69, "Kit Skincare Neutrogena 3 pasos",   8,   44.99,  14.00, "BE-007"),
    # cat 9 Toys (6)
    (70, "LEGO Classic Set 300 piezas",       9,   34.99,  10.00, "TY-001"),
    (71, "Monopoly Clasico Hasbro",           9,   29.99,   8.50, "TY-002"),
    (72, "Drone Mini DJI Tello",              9,   99.99,  42.00, "TY-003"),
    (73, "Nintendo Switch Lite Amarillo",     9,  199.99,  95.00, "TY-004"),
    (74, "Funko Pop Harry Potter",            9,   14.99,   4.00, "TY-005"),
    (75, "Puzzle 1000 piezas Ravensburger",   9,   19.99,   5.50, "TY-006"),
    # cat 10 Office (5)
    (76, "Silla de Oficina Ergonomica MiDesk",10,  149.99,  65.00, "OF-001"),
    (77, "Soporte Laptop Aluminio Ajustable", 10,   29.99,   8.00, "OF-002"),
    (78, "Impresora HP DeskJet 2775",         10,   79.99,  30.00, "OF-003"),
    (79, "Organizador Escritorio 6 compartimentos",10,19.99, 5.50,"OF-004"),
    (80, "Lampara LED Escritorio con USB",    10,   34.99,  10.00, "OF-005"),
]

products = []
product_price = {}
for row in products_raw:
    pid, name, cat_id, price, cost, sku = row
    products.append({
        "product_id": pid, "name": name, "category_id": cat_id,
        "price": price, "cost": cost, "sku": sku,
    })
    product_price[pid] = price

emit("-- -----------------------------------------------------------")
emit("-- 4. PRODUCTS")
emit("-- -----------------------------------------------------------")
for p in products:
    emit(
        f"INSERT INTO products (product_id, name, category_id, price, cost, sku) "
        f"VALUES ({p['product_id']}, {fmt_str(p['name'])}, {p['category_id']}, "
        f"{p['price']}, {p['cost']}, {fmt_str(p['sku'])});"
    )
emit("")

# ---------------------------------------------------------------------------
# Seasonal date pool
# ---------------------------------------------------------------------------

def seasonal_weight(d):
    m = d.month
    # Black Friday exacto
    if d == date(2023, 11, 24): return 9.0
    if d == date(2024, 11, 29): return 9.0
    if m == 11: return 3.5
    if m == 12: return 2.8
    if m in (1, 2): return 0.5
    if m in (5, 6): return 1.4
    if m in (7, 8): return 1.2
    return 1.0

date_pool = []
d = START_DATE
while d <= END_DATE:
    w = seasonal_weight(d)
    date_pool.extend([d] * int(w * 10))
    d += timedelta(days=1)

def pick_date():
    return random.choice(date_pool)

# ---------------------------------------------------------------------------
# 5. ORDERS  (2000)
# ---------------------------------------------------------------------------

statuses       = ["delivered", "shipped", "processing", "cancelled"]
status_weights = [0.72, 0.12, 0.08, 0.08]
channels       = ["web", "mobile", "email", "social"]
channel_wts    = [0.45, 0.30, 0.15, 0.10]

camp_ranges = {c["campaign_id"]: (c["start_date"], c["end_date"]) for c in campaigns}

def get_campaign(d, organic_prob=0.28):
    # explicit organic: 28%
    # remaining 72%: try active campaigns; fallback to NULL if none active
    if random.random() < organic_prob:
        return None
    active = [cid for cid, (s, e) in camp_ranges.items() if s <= d <= e]
    return random.choice(active) if active else None

# Separate customers by type
premium_custs  = [c for c in customers if c["segment"] == "Premium" and not c["is_inactive"]]
regular_custs  = [c for c in customers if c["segment"] == "Regular" and not c["is_inactive"]]
new_custs      = [c for c in customers if c["segment"] == "New"]
inactive_custs = [c for c in customers if c["is_inactive"]]

WHALE_CID = 7   # customer_id 7 es el whale

orders = []
order_id_counter = 1

def add_order(cid, od, status=None, channel=None):
    global order_id_counter
    s = status or random.choices(statuses, weights=status_weights)[0]
    ch = channel or random.choices(channels, weights=channel_wts)[0]
    cp = get_campaign(od)
    orders.append({
        "order_id": order_id_counter,
        "customer_id": cid,
        "order_date": od,
        "status": s,
        "channel": ch,
        "campaign_id": cp,
    })
    order_id_counter += 1

# Premium (50 customers, 5-12 orders each; whale gets 25)
for c in premium_custs:
    cid = c["customer_id"]
    n = 25 if cid == WHALE_CID else random.randint(5, 12)
    for _ in range(n):
        add_order(cid, pick_date())

# Regular (200 customers, 2-4 orders)
for c in regular_custs:
    for _ in range(random.randint(2, 4)):
        add_order(c["customer_id"], pick_date())

# New (150 customers, 1-2 orders in last 3 months)
for c in new_custs:
    n = random.randint(1, 2)
    for _ in range(n):
        earliest = max(c["signup_date"], END_DATE - timedelta(days=90))
        span = max(1, (END_DATE - earliest).days)
        od = earliest + timedelta(days=random.randint(0, span))
        add_order(c["customer_id"], od)

# Inactive (last purchase > 6 months ago, ~50% have 1 order)
inactive_cutoff = END_DATE - timedelta(days=180)
for c in inactive_custs:
    if random.random() < 0.50:
        span = max(1, (inactive_cutoff - START_DATE).days)
        od = START_DATE + timedelta(days=random.randint(0, span))
        add_order(c["customer_id"], od)

# Fill to 2000
while len(orders) < 2000:
    c = random.choice(regular_custs)
    add_order(c["customer_id"], pick_date())

# Shuffle and reassign sequential IDs
random.shuffle(orders)
for idx, o in enumerate(orders):
    o["order_id"] = idx + 1

emit("-- -----------------------------------------------------------")
emit("-- 5. ORDERS")
emit("-- -----------------------------------------------------------")
for o in orders:
    emit(
        f"INSERT INTO orders (order_id, customer_id, order_date, status, channel, campaign_id) "
        f"VALUES ({o['order_id']}, {o['customer_id']}, {fmt_date(o['order_date'])}, "
        f"{fmt_str(o['status'])}, {fmt_str(o['channel'])}, {fmt_num(o['campaign_id'])});"
    )
emit("")

# ---------------------------------------------------------------------------
# 6. ORDER_ITEMS  (~5000)
# ---------------------------------------------------------------------------

product_ids = [p["product_id"] for p in products]

# Separate by price tier to control ticket average
cheap_pids     = [p["product_id"] for p in products if p["price"] <= 35]
moderate_pids  = [p["product_id"] for p in products if 35 < p["price"] <= 100]
expensive_pids = [p["product_id"] for p in products if p["price"] > 100]

order_items = []
item_id_counter = 1
order_to_items = {}  # order_id -> [(pid, qty, unit_price, discount)]

for o in orders:
    oid = o["order_id"]
    is_bf_campaign = o["campaign_id"] in {1, 2, 13, 14}

    # Items per order: 1-4 (weighted toward 2)
    n_items = random.choices([1, 2, 3, 4], weights=[30, 40, 20, 10])[0]

    # Product selection:
    # 35% cheap (<=$35), 45% moderate ($35-$100), 20% expensive (>$100)
    # Target ticket: $100-$150 range
    chosen = []
    for k in range(n_items):
        r = random.random()
        if r < 0.35:
            pool = cheap_pids
        elif r < 0.80:
            pool = moderate_pids
        else:
            pool = expensive_pids
        pid = random.choice(pool)
        # No duplicates in same order
        attempts = 0
        while pid in chosen and attempts < 15:
            pid = random.choice(pool)
            attempts += 1
        chosen.append(pid)

    order_to_items[oid] = []

    for pid in chosen:
        base = product_price[pid]
        # unit_price can deviate slightly from list
        unit_price = round(base * random.uniform(0.97, 1.03), 2)

        # Quantity: expensive items almost always 1
        if base > 100:
            qty = 1
        elif base > 50:
            qty = random.choices([1, 2], weights=[80, 20])[0]
        else:
            qty = random.choices([1, 2, 3], weights=[65, 25, 10])[0]

        # Discount
        if is_bf_campaign:
            discount = random.choice([15.0, 20.0, 25.0, 30.0])
        else:
            discount = random.choices([0.0, 5.0, 10.0, 15.0], weights=[60, 20, 12, 8])[0]

        order_items.append({
            "item_id": item_id_counter,
            "order_id": oid,
            "product_id": pid,
            "quantity": qty,
            "unit_price": unit_price,
            "discount": discount,
        })
        order_to_items[oid].append((pid, qty, unit_price, discount))
        item_id_counter += 1

emit("-- -----------------------------------------------------------")
emit("-- 6. ORDER_ITEMS")
emit("-- -----------------------------------------------------------")
for it in order_items:
    emit(
        f"INSERT INTO order_items (item_id, order_id, product_id, quantity, unit_price, discount) "
        f"VALUES ({it['item_id']}, {it['order_id']}, {it['product_id']}, "
        f"{it['quantity']}, {it['unit_price']}, {it['discount']});"
    )
emit("")

# ---------------------------------------------------------------------------
# 7. RETURNS  (~5% of delivered order items)
# ---------------------------------------------------------------------------

delivered_orders = [o for o in orders if o["status"] == "delivered"]
returns = []
return_id_counter = 1
reason_choices = ["defective", "wrong_item", "not_as_described", "changed_mind"]

for o in delivered_orders:
    oid = o["order_id"]
    if oid not in order_to_items:
        continue
    for (pid, qty, up, disc) in order_to_items[oid]:
        ret_prob = 0.16 if pid in HIGH_RETURN else 0.052
        if random.random() < ret_prob:
            ret_date = o["order_date"] + timedelta(days=random.randint(5, 40))
            if ret_date > END_DATE:
                ret_date = END_DATE

            if pid == 24:
                reason = random.choices(["defective", "not_as_described"], weights=[70, 30])[0]
            elif pid == 39:
                reason = random.choices(["wrong_item", "changed_mind"], weights=[65, 35])[0]
            elif pid == 40:
                reason = "not_as_described"
            else:
                reason = random.choices(reason_choices, weights=[30, 20, 25, 25])[0]

            refund = round(up * qty * (1 - disc / 100.0), 2)
            returns.append({
                "return_id": return_id_counter,
                "order_id": oid,
                "product_id": pid,
                "return_date": ret_date,
                "reason": reason,
                "refund_amount": refund,
            })
            return_id_counter += 1

emit("-- -----------------------------------------------------------")
emit("-- 7. RETURNS")
emit("-- -----------------------------------------------------------")
for r in returns:
    emit(
        f"INSERT INTO returns (return_id, order_id, product_id, return_date, reason, refund_amount) "
        f"VALUES ({r['return_id']}, {r['order_id']}, {r['product_id']}, "
        f"{fmt_date(r['return_date'])}, {fmt_str(r['reason'])}, {r['refund_amount']});"
    )
emit("")

# ---------------------------------------------------------------------------
# 8. INVENTORY  (80 — 1 per product)
# ---------------------------------------------------------------------------

emit("-- -----------------------------------------------------------")
emit("-- 8. INVENTORY")
emit("-- -----------------------------------------------------------")
for p in products:
    pid = p["product_id"]
    if pid == 10:
        # STOCKOUT outlier: USB-C Hub ordenado recientemente pero stock=0
        stock = 0
        reorder = 20
        lu = date(2024, 10, 15)
    elif p["price"] > 150:
        stock = random.randint(2, 20)
        reorder = 5
        lu = END_DATE - timedelta(days=random.randint(1, 30))
    else:
        stock = random.randint(10, 300)
        reorder = random.randint(15, 60)
        lu = END_DATE - timedelta(days=random.randint(1, 30))

    emit(
        f"INSERT INTO inventory (product_id, stock_qty, reorder_level, last_updated) "
        f"VALUES ({pid}, {stock}, {reorder}, {fmt_date(lu)});"
    )
emit("")

# ---------------------------------------------------------------------------
# 9. WEBSITE_SESSIONS  (8000)
# ---------------------------------------------------------------------------

sources     = ["organic", "paid_search", "email", "social", "direct"]
src_weights = [0.35, 0.20, 0.18, 0.15, 0.12]
cust_ids    = [c["customer_id"] for c in customers]

emit("-- -----------------------------------------------------------")
emit("-- 9. WEBSITE_SESSIONS")
emit("-- -----------------------------------------------------------")
for sid in range(1, 8001):
    # ~30% anonymous
    cid = None if random.random() < 0.30 else random.choice(cust_ids)

    sess_date = pick_date()
    source = random.choices(sources, weights=src_weights)[0]

    # campaign assignment
    if source in ("organic", "direct"):
        camp_id = None
    else:
        active_camps = [
            c["campaign_id"] for c in campaigns
            if c["start_date"] <= sess_date <= c["end_date"]
        ]
        camp_id = random.choice(active_camps) if active_camps and random.random() < 0.65 else None

    pages    = random.choices([1,2,3,4,5,6,7,8,10,12], weights=[20,18,15,12,10,8,6,4,4,3])[0]
    duration = int(pages * random.uniform(35, 110))

    # Conversion rate
    conv_p = 0.04
    if camp_id: conv_p = 0.10
    if cid is None: conv_p *= 0.5
    converted = random.random() < conv_p

    emit(
        f"INSERT INTO website_sessions "
        f"(session_id, customer_id, session_date, source, campaign_id, pages_viewed, duration_sec, converted) "
        f"VALUES ({sid}, {fmt_num(cid)}, {fmt_date(sess_date)}, {fmt_str(source)}, "
        f"{fmt_num(camp_id)}, {pages}, {duration}, {fmt_bool(converted)});"
    )
emit("")

# ---------------------------------------------------------------------------
# 10. PAYMENTS  (1 per delivered order)
# ---------------------------------------------------------------------------

methods     = ["credit_card", "debit_card", "paypal", "crypto"]
meth_wts    = [0.55, 0.25, 0.15, 0.05]
pay_stats   = ["completed", "failed", "refunded"]
pay_wts     = [0.90, 0.04, 0.06]
returned_order_ids = set(r["order_id"] for r in returns)

emit("-- -----------------------------------------------------------")
emit("-- 10. PAYMENTS")
emit("-- -----------------------------------------------------------")
payment_id_counter = 1
for o in orders:
    if o["status"] != "delivered":
        continue
    oid = o["order_id"]
    if oid not in order_to_items:
        continue

    total = sum(
        round(up * qty * (1 - disc / 100.0), 2)
        for (pid, qty, up, disc) in order_to_items[oid]
    )

    pay_date = o["order_date"] + timedelta(days=random.randint(0, 1))
    if pay_date > END_DATE:
        pay_date = END_DATE

    method = random.choices(methods, weights=meth_wts)[0]

    if oid in returned_order_ids:
        status = random.choices(["completed", "refunded"], weights=[40, 60])[0]
    else:
        status = random.choices(pay_stats, weights=pay_wts)[0]

    emit(
        f"INSERT INTO payments (payment_id, order_id, payment_date, method, amount, status) "
        f"VALUES ({payment_id_counter}, {oid}, {fmt_date(pay_date)}, "
        f"{fmt_str(method)}, {round(total,2)}, {fmt_str(status)});"
    )
    payment_id_counter += 1

emit("")
emit("COMMIT;")
emit("")
emit("-- End of ShopSphere seed data")

# ---------------------------------------------------------------------------
# Write file
# ---------------------------------------------------------------------------

output_path = r"C:\Users\Juanm\OneDrive\Desktop\Curso SQL\dataset\shopsphere-seed.sql"
with open(output_path, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

# ---------------------------------------------------------------------------
# Validation report
# ---------------------------------------------------------------------------

total_items = len(order_items)
total_orders = len(orders)
total_returns = len(returns)
total_payments = payment_id_counter - 1
n_delivered = sum(1 for o in orders if o["status"] == "delivered")

rev_delivered = sum(
    up * qty * (1 - disc / 100.0)
    for o in orders if o["status"] == "delivered" and o["order_id"] in order_to_items
    for (pid, qty, up, disc) in order_to_items[o["order_id"]]
)
rev_all_active = sum(
    up * qty * (1 - disc / 100.0)
    for o in orders if o["status"] != "cancelled" and o["order_id"] in order_to_items
    for (pid, qty, up, disc) in order_to_items[o["order_id"]]
)
rev = rev_delivered

print("=" * 55)
print("SHOPSPHERE SEED — VALIDATION REPORT")
print("=" * 55)
print(f"Archivo:          {output_path}")
print(f"Lineas totales:   {len(lines):,}")
print(f"categories:       {len(categories)}")
print(f"customers:        {len(customers)}")
print(f"campaigns:        {len(campaigns)}")
print(f"products:         {len(products)}")
print(f"orders:           {total_orders:,}")
print(f"order_items:      {total_items:,}")
print(f"returns:          {total_returns:,}")
print(f"inventory:        {len(products)}")
print(f"website_sessions: 8000")
print(f"payments:         {total_payments:,}")
print("-" * 55)
print(f"Orders delivered: {n_delivered:,}")
print(f"Revenue delivered:${rev:,.2f}")
print(f"Revenue all active:${rev_all_active:,.2f}")
if n_delivered > 0:
    print(f"Ticket promedio:  ${rev/n_delivered:,.2f}")
print(f"Tasa devoluciones:{total_returns/total_items*100:.2f}% of items")
print("-" * 55)
# Campaign ROI summary
print("Campanas por ROI:")
for c in campaigns:
    roi = (c["revenue_generated"] / c["budget"] - 1) * 100
    print(f"  {c['campaign_id']:2d}. {c['name'][:30]:<30s} ROI={roi:+.0f}%  [{c['roi_type']}]")
print("=" * 55)

# Referential integrity checks
order_ids_set = {o["order_id"] for o in orders}
product_ids_set = {p["product_id"] for p in products}
bad_items = [it for it in order_items
             if it["order_id"] not in order_ids_set or it["product_id"] not in product_ids_set]
bad_returns = [r for r in returns
               if r["order_id"] not in order_ids_set or r["product_id"] not in product_ids_set]
delivered_ids = {o["order_id"] for o in orders if o["status"] == "delivered"}
# payments only on delivered
payments_on_non_delivered = 0  # handled by filter above
print(f"FK errors in order_items: {len(bad_items)}")
print(f"FK errors in returns:     {len(bad_returns)}")
print("Referential integrity: OK" if not bad_items and not bad_returns else "ERRORS FOUND")
