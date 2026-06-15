"""List N4 exercise queries from PostgreSQL"""
import psycopg2, psycopg2.extras, os

pwd = ''
with open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')) as f:
    for line in f:
        if line.startswith('POSTGRES_PASSWORD='):
            pwd = line.split('=',1)[1].strip().strip('"')
            break

pg = psycopg2.connect(f'postgresql://shopsphere_user:{pwd}@localhost:5432/shopsphere')
cur = pg.cursor(cursor_factory=psycopg2.extras.DictCursor)
cur.execute('SELECT order_index, LEFT(reference_query, 150) as q FROM exercises WHERE level_id=4 ORDER BY order_index')
for r in cur.fetchall():
    print(f'EJ{r["order_index"]:02d}: {repr(r["q"][:100])}')
pg.close()
