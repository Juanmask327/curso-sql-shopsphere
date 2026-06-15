"""Check N4 exercises timing - run each against SQLite directly"""
import psycopg2, psycopg2.extras, sqlite3, types, os, sys, time

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(REPO_ROOT, 'data', 'dataset.db')

pwd = ''
with open(os.path.join(REPO_ROOT, '.env')) as f:
    for line in f:
        if line.startswith('POSTGRES_PASSWORD='):
            pwd = line.split('=',1)[1].strip().strip('"')
            break

# Load translate function
src = open(os.path.join(DATASET_DIR, 'generate_expected.py'), encoding='utf-8').read()
src = src[:src.find('# Run generation')]
src = src.replace('DATASET_DIR = os.path.dirname(os.path.abspath(__file__))', f'DATASET_DIR = r"{DATASET_DIR}"')
src = src.replace('REPO_ROOT = os.path.dirname(DATASET_DIR)', f'REPO_ROOT = r"{REPO_ROOT}"')
src = src.replace('MODULOS_DIR = os.path.join(REPO_ROOT, "modulos")', f'MODULOS_DIR = r"{os.path.join(REPO_ROOT, "modulos")}"')
src = src.replace('DB_PATH = os.path.join(REPO_ROOT, "data", "dataset.db")', f'DB_PATH = r"{DB_PATH}"')
m = types.ModuleType('_gen')
exec(compile(src, 'generate_expected.py', 'exec'), m.__dict__)

pg = psycopg2.connect(f'postgresql://shopsphere_user:{pwd}@localhost:5432/shopsphere')
cur = pg.cursor(cursor_factory=psycopg2.extras.DictCursor)
cur.execute('SELECT order_index, reference_query FROM exercises WHERE level_id=4 ORDER BY order_index')
exercises = cur.fetchall()
pg.close()

conn = sqlite3.connect(DB_PATH, check_same_thread=False)
conn.row_factory = None
conn.isolation_level = None

for ex in exercises:
    oi = ex['order_index']
    rq = ex['reference_query']
    translated = m.translate_pg_to_sqlite(rq, oi)
    t0 = time.time()
    try:
        cols, rows = m.run_query(conn, translated)
        rc = len(rows) if rows else 0
        elapsed = time.time() - t0
        print(f'EJ{oi:02d}: OK {rc} rows in {elapsed:.2f}s')
    except Exception as e:
        elapsed = time.time() - t0
        print(f'EJ{oi:02d}: ERR {str(e)[:80]} ({elapsed:.2f}s)')
        # Show first 200 chars of translated query
        print(f'       Query: {translated[:200].encode("ascii","replace").decode()}')
    sys.stdout.flush()

conn.close()
