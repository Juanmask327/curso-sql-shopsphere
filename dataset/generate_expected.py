import os
import re
import json
import sqlite3

# Context paths
DATASET_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(DATASET_DIR)
MODULOS_DIR = os.path.join(REPO_ROOT, "modulos")
DB_PATH = os.path.join(REPO_ROOT, "data", "dataset.db")

print("=== ShopSphere Expected Results Generator ===")
print(f"Dataset path: {DB_PATH}")
print(f"Modulos path: {MODULOS_DIR}")

def translate_pg_to_sqlite(query, exercise_num):
    q = query
    
    # 0. Special case for Cohort Retention (Nivel 6 Exercise 8) — complex CROSS JOIN + VALUES
    if exercise_num == 8 and "VALUES" in query and "cohorte_sep" in query:
        q = """
        WITH cohorte_sep AS (
            SELECT customer_id
            FROM orders
            WHERE status <> 'cancelled'
            GROUP BY customer_id
            HAVING strftime('%Y-%m-01', MIN(ordered_at)) = '2025-09-01'
        ),
        seguimiento AS (
            SELECT
                gs.mes_seguimiento,
                COUNT(DISTINCT cs.customer_id)                   AS total_cohorte,
                COUNT(DISTINCT CASE
                    WHEN strftime('%Y-%m-01', o.ordered_at) = gs.mes_seguimiento
                    THEN o.customer_id
                END)                                             AS compraron_ese_mes
            FROM cohorte_sep cs
            CROSS JOIN (
                SELECT '2025-10-01' AS mes_seguimiento
                UNION ALL SELECT '2025-11-01'
                UNION ALL SELECT '2025-12-01'
            ) AS gs
            LEFT JOIN orders o ON o.customer_id = cs.customer_id
                               AND o.status     <> 'cancelled'
            GROUP BY gs.mes_seguimiento
        )
        SELECT
            mes_seguimiento,
            total_cohorte,
            compraron_ese_mes,
            ROUND(
                compraron_ese_mes * 100.0
                / NULLIF(total_cohorte, 0),
                1
            ) AS tasa_retencion_pct
        FROM seguimiento
        ORDER BY mes_seguimiento;
        """
        return q

    # 1. Special case for LTV Median in Nivel 6 Exercise 9
    if exercise_num == 9 and "PERCENTILE_CONT" in query:
        q = """
        WITH ltv_por_cliente AS (
            SELECT
                o.customer_id,
                c.country,
                ROUND(SUM(oi.quantity * oi.unit_price), 2)  AS ltv_total
            FROM orders o
            INNER JOIN order_items oi ON oi.order_id   = o.order_id
            INNER JOIN customers   c  ON c.customer_id = o.customer_id
            WHERE o.status <> 'cancelled'
            GROUP BY o.customer_id, c.country
        ),
        ranked AS (
            SELECT
                customer_id,
                country,
                ltv_total,
                ROW_NUMBER() OVER (PARTITION BY country ORDER BY ltv_total) AS rn,
                COUNT(*) OVER (PARTITION BY country) AS cnt
            FROM ltv_por_cliente
        ),
        medianas AS (
            SELECT
                country,
                ROUND(AVG(ltv_total), 2) AS ltv_mediana
            FROM ranked
            WHERE rn IN (cnt / 2 + 1, (cnt - 1) / 2 + 1)
            GROUP BY country
        ),
        promedios AS (
            SELECT
                country,
                COUNT(DISTINCT customer_id) AS clientes_activos,
                ROUND(AVG(ltv_total), 2) AS ltv_promedio
            FROM ltv_por_cliente
            GROUP BY country
        )
        SELECT
            p.country AS country,
            p.clientes_activos,
            p.ltv_promedio,
            m.ltv_mediana,
            (SELECT MAX(ltv_total) FROM ltv_por_cliente l3 WHERE l3.country = p.country) AS ltv_maximo
        FROM promedios p
        INNER JOIN medianas m ON m.country = p.country
        ORDER BY p.ltv_promedio DESC;
        """
        return q

    # Column translations REMOVED — dataset.db now uses canonical schema names:
    # ordered_at, registered_at, paid_at, returned_at, started_at, ended_at,
    # spent (marketing_campaigns), stock (inventory), updated_at (inventory)
    # returns.status column now exists in the dataset.

    # 4. TO_CHAR(col, 'TMMonth') -> CASE statement
    def translate_to_char(match):
        col = match.group(1)
        return f"CASE strftime('%m', {col}) WHEN '01' THEN 'Enero' WHEN '02' THEN 'Febrero' WHEN '03' THEN 'Marzo' WHEN '04' THEN 'Abril' WHEN '05' THEN 'Mayo' WHEN '06' THEN 'Junio' WHEN '07' THEN 'Julio' WHEN '08' THEN 'Agosto' WHEN '09' THEN 'Septiembre' WHEN '10' THEN 'Octubre' WHEN '11' THEN 'Noviembre' WHEN '12' THEN 'Diciembre' END"
    q = re.sub(r"TO_CHAR\(([^,]+),\s*'TMMonth'\)", translate_to_char, q, flags=re.IGNORECASE)
    
    # 5. DATE_TRUNC('month', col)::DATE -> strftime('%Y-%m-01', col)
    q = re.sub(r"DATE_TRUNC\('month',\s*([^)]+)\)::DATE", r"strftime('%Y-%m-01', \1)", q, flags=re.IGNORECASE)
    # 6. DATE_TRUNC('month', col) -> strftime('%Y-%m-01', col)
    q = re.sub(r"DATE_TRUNC\('month',\s*([^)]+)\)", r"strftime('%Y-%m-01', \1)", q, flags=re.IGNORECASE)
    # 6b. DATE_TRUNC('day', col) -> date(col)
    q = re.sub(r"DATE_TRUNC\('day',\s*([^)]+)\)", r"date(\1)", q, flags=re.IGNORECASE)
    # 6c. DATE_TRUNC('week', col) -> Monday of the week (ISO)
    q = re.sub(r"DATE_TRUNC\('week',\s*([^)]+)\)", r"date(\1, '-' || ((cast(strftime('%w', \1) as integer) + 6) % 7) || ' days')", q, flags=re.IGNORECASE)
    
    # 7. DATE_TRUNC('quarter', col)::DATE -> printf('%04d-%02d-01', strftime('%Y', col), ((strftime('%m', col) - 1) / 3) * 3 + 1)
    q = re.sub(r"DATE_TRUNC\('quarter',\s*([^)]+)\)::DATE", r"printf('%04d-%02d-01', strftime('%Y', \1), ((strftime('%m', \1) - 1) / 3) * 3 + 1)", q, flags=re.IGNORECASE)
    q = re.sub(r"DATE_TRUNC\('quarter',\s*([^)]+)\)", r"printf('%04d-%02d-01', strftime('%Y', \1), ((strftime('%m', \1) - 1) / 3) * 3 + 1)", q, flags=re.IGNORECASE)
    
    # 8. EXTRACT(YEAR FROM col) -> cast(strftime('%Y', col) as integer)
    q = re.sub(r"EXTRACT\(YEAR\s+FROM\s+([^)]+)\)", r"cast(strftime('%Y', \1) as integer)", q, flags=re.IGNORECASE)
    # 9. EXTRACT(MONTH FROM col) -> cast(strftime('%m', col) as integer)
    q = re.sub(r"EXTRACT\(MONTH\s+FROM\s+([^)]+)\)", r"cast(strftime('%m', \1) as integer)", q, flags=re.IGNORECASE)
    # 9b. EXTRACT(QUARTER FROM col) -> ((cast(strftime('%m', col) as integer) - 1) / 3) + 1
    q = re.sub(r"EXTRACT\(QUARTER\s+FROM\s+([^)]+)\)", r"((cast(strftime('%m', \1) as integer) - 1) / 3) + 1", q, flags=re.IGNORECASE)
    # 9c. EXTRACT(DAY FROM col) -> cast(strftime('%d', col) as integer)
    q = re.sub(r"EXTRACT\(DAY\s+FROM\s+([^)]+)\)", r"cast(strftime('%d', \1) as integer)", q, flags=re.IGNORECASE)
    # 9d. EXTRACT(DOW FROM col) -> cast(strftime('%w', col) as integer) (0=Sun, 6=Sat)
    q = re.sub(r"EXTRACT\(DOW\s+FROM\s+([^)]+)\)", r"cast(strftime('%w', \1) as integer)", q, flags=re.IGNORECASE)

    # 10. (pp.cohorte + INTERVAL '1 month')::DATE -> date(pp.cohorte, '+1 month')
    q = re.sub(r"\(([^)]+)\s*\+\s*INTERVAL\s+'([^']+)'\)::DATE", r"date(\1, '+\2')", q, flags=re.IGNORECASE)
    # 11. X + INTERVAL 'Y month' -> date(X, '+Y month')
    q = re.sub(r"([^)\s]+)\s*\+\s*INTERVAL\s+'([^']+)'", r"date(\1, '+\2')", q, flags=re.IGNORECASE)
    # 11b. X - INTERVAL 'Y days' -> date(X, '-Y days')
    q = re.sub(r"([^)\s]+)\s*-\s*INTERVAL\s+'([^']+)'", r"date(\1, '-\2')", q, flags=re.IGNORECASE)
    
    # 12. X::DATE -> date(X)
    q = re.sub(r"('[^']+'|[a-zA-Z0-9._()]+)::DATE", r"date(\1)", q, flags=re.IGNORECASE)
    
    # 13. ::INT / ::INTEGER cast removal
    q = re.sub(r"::(INT|INTEGER)", "", q, flags=re.IGNORECASE)
    
    # 14. CURRENT_DATE -> '2026-06-01'
    q = re.sub(r"\bCURRENT_DATE\b", "'2026-06-01'", q, flags=re.IGNORECASE)

    # 15. VALUES list translation to SELECT UNION ALL (special case for Nivel 6 Ejercicio 8)
    q = re.sub(
        r"VALUES\s*\(\s*date\('2025-10-01'\)\s*\)\s*,\s*\(\s*date\('2025-11-01'\)\s*\)\s*,\s*\(\s*date\('2025-12-01'\)\s*\)\s*\)\s*AS\s*gs\(\s*mes_seguimiento\s*\)",
        r"(SELECT date('2025-10-01') AS mes_seguimiento UNION ALL SELECT date('2025-11-01') UNION ALL SELECT date('2025-12-01')) AS gs",
        q,
        flags=re.IGNORECASE
    )
    
    # 16. NULLS LAST / NULLS FIRST removal (SQLite doesn't support these)
    q = re.sub(r"\s+NULLS\s+(LAST|FIRST)", "", q, flags=re.IGNORECASE)
    
    return q

def parse_sql_file(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Parse statements
    stmt_regex = r"^--\s*(Ejercicio|EJ)\s*(\d+)"
    lines = content.split("\n")
    exercises = []
    
    current_ex = None
    for line in lines:
        match = re.match(stmt_regex, line, re.IGNORECASE)
        if match:
            num = int(match.group(2))
            if current_ex:
                exercises.append(current_ex)
            current_ex = {
                "number": num,
                "lines": [line],
                "title": line.replace("--", "").strip()
            }
        elif current_ex:
            if "-- Tu query aquí:" in line or "-- Tu query aquí" in line:
                exercises.append(current_ex)
                current_ex = None
            else:
                current_ex["lines"].append(line)
                
    if current_ex:
        exercises.append(current_ex)
        
    parsed_exercises = {}
    for ex in exercises:
        num = ex["number"]
        comment_lines = []
        for line in ex["lines"]:
            trimmed = line.strip()
            if trimmed.startswith("--"):
                comment_lines.append(trimmed.replace("--", "", 1).strip())
        
        description = " ".join(comment_lines).strip()
        title = ex["title"]
        if "—" in title:
            title = title.split("—", 1)[1].strip()
            
        parsed_exercises[num] = {
            "number": num,
            "title": title,
            "description": description
        }

    # Unified solutions parser
    solutions = {}
    # Handle nivel-00 format: -- EJERCICIO N: ... -- SOLUCIÓN: <query>
    # Distinguish from niveles 1-8 which use --- Solución N --- numbered markers
    if re.search(r"--\s*SOLUCI[OÓ]N\s*:", content, re.IGNORECASE):
        ex_blocks = re.split(r"(?=--\s*EJERCICIO\s+\d+)", content, flags=re.IGNORECASE)
        for block in ex_blocks:
            ex_m = re.match(r"--\s*EJERCICIO\s+(\d+)", block, re.IGNORECASE)
            if not ex_m:
                continue
            num = int(ex_m.group(1))
            sol_m = re.search(r"--\s*SOLUCIÓN\s*:\s*\n([\s\S]+?)(?=\n\n--\s*={5,}|\Z)", block, re.IGNORECASE)
            if sol_m:
                q = sol_m.group(1).strip()
                q = re.sub(r"\n*--\s*={10,}\s*$", "", q).strip()
                if q:
                    solutions[num] = q
        return parsed_exercises, solutions

    sol_matches = list(re.finditer(r"(---\s*Solución\s*(\d+)[^\n]*|--\s*Solución\s*EJ(\d+)\s*:?)", content, re.IGNORECASE))

    for i, m in enumerate(sol_matches):
        num = int(m.group(2) or m.group(3))
        start_pos = m.end()
        end_pos = sol_matches[i+1].start() if i+1 < len(sol_matches) else len(content)
        chunk = content[start_pos:end_pos].strip()
        
        # Check if chunk contains /*
        query = chunk
        if "/*" in query:
            c_start = query.find("/*")
            c_end = query.find("*/", c_start)
            if c_end != -1:
                query = query[c_start+2:c_end].strip()
            else:
                query = query[c_start+2:].strip()
                
        # Strip trailing */ if present
        if query.endswith("*/"):
            query = query[:-2].strip()
            
        # Clean up any trailing comments like -- ===...
        query = re.sub(r"\n*--\s*={10,}\s*$", "", query).strip()
        
        if query:
            solutions[num] = query

    return parsed_exercises, solutions

def run_query(conn, query):
    # Strip comment lines from the entire query FIRST to avoid semicolons 
    # inside comments (e.g. "-- transacción sigue abierta)") from breaking the split
    lines = query.split("\n")
    clean_lines = [l for l in lines if not l.strip().startswith("--")]
    clean_query = "\n".join(clean_lines)
    
    # Split into statements
    statements = clean_query.split(";")
    last_res = None
    last_cols = []
    
    for stmt in statements:
        stmt_clean = stmt.strip()
        if not stmt_clean:
            continue
            
        cursor = conn.cursor()
        cursor.execute(stmt_clean)
        
        # If it is a SELECT or EXPLAIN statement, fetch results
        if cursor.description:
            cols = [col[0] for col in cursor.description]
            rows = cursor.fetchall()
            last_res = rows
            last_cols = cols
            
    return last_cols, last_res

def generate_level_results(level_id, sql_files, template_path, output_path):
    print(f"\nProcessing Level {level_id}...")
    
    # Read templates if exists
    templates = {}
    if os.path.exists(template_path):
        with open(template_path, "r", encoding="utf-8") as f:
            template_list = json.load(f)
            # Template can be array or object format
            if isinstance(template_list, list):
                for t in template_list:
                    templates[t.get("exercise_number", 0)] = t
            elif isinstance(template_list, dict) and "exercises" in template_list:
                # Nivel 4/5 style dict
                exercises_dict = template_list["exercises"]
                if isinstance(exercises_dict, dict):
                    for k, v in exercises_dict.items():
                        num_match = re.search(r"\d+", k)
                        if num_match:
                            templates[int(num_match.group(0))] = v
                elif isinstance(exercises_dict, list):
                    for t in exercises_dict:
                        num = t.get("id") or t.get("exercise_number")
                        if num:
                            try:
                                templates[int(str(num))] = t
                            except ValueError:
                                pass  # skip sub-exercise IDs like '25a', '25b'
                            
    # Concatenate SQL files content if multiple
    statements = {}
    solutions = {}
    for f_path in sql_files:
        print(f"  Parsing SQL file: {os.path.basename(f_path)}")
        st, sol = parse_sql_file(f_path)
        statements.update(st)
        solutions.update(sol)
        
    print(f"  Parsed {len(statements)} statements and {len(solutions)} solutions.")
    
    # Run solutions on SQLite to get actual results
    conn = sqlite3.connect(DB_PATH)
    # Enable views drop/create
    conn.isolation_level = None
    
    results = []
    for num in sorted(solutions.keys()):
        raw_query = solutions[num]
        sqlite_query = translate_pg_to_sqlite(raw_query, num)
        
        print(f"  Executing Exercise {num}...")
        try:
            cols, rows = run_query(conn, sqlite_query)
            row_count = len(rows) if rows else 0
            
            # Use columns and rows
            # Limit sample rows to first 50 to keep file lightweight
            sample_rows = []
            if rows:
                sample_rows = [list(r) for r in rows[:50]]
                
            # Default validation mode
            validation_mode = "exact_ordered" if "order by" in raw_query.lower() else "exact_unordered"
            
            # Check template metadata if available
            tmpl = templates.get(num, {})
            title = tmpl.get("title") or statements.get(num, {}).get("title") or f"Ejercicio {num:02d}"
            briefing_ref = tmpl.get("briefing_ref") or f"Briefing {level_id}.{num}"
            lesson_ref = tmpl.get("lesson_ref") or f"Lección {num}"
            notes = tmpl.get("notes") or "Resultados reales precalculados desde el dataset SQLite."
            
            results.append({
                "exercise_number": num,
                "title": title,
                "briefing_ref": briefing_ref,
                "lesson_ref": lesson_ref,
                "reference_query": raw_query,
                "tables_used": tmpl.get("tables_used", []),
                "join_types": tmpl.get("join_types", []),
                "validation_mode": tmpl.get("validation_mode") or validation_mode,
                "expected_columns": cols,
                "sample_rows": sample_rows,
                "expected_row_count_approx": row_count,
                "notes": notes
            })
            print(f"    Success: {row_count} rows, {len(cols)} columns.")
        except Exception as e:
            print(f"    [ERROR] Failed to run Exercise {num} query:")
            print(f"    Query: {sqlite_query.encode('ascii', 'replace').decode('ascii')}")
            print(f"    Error: {str(e).encode('ascii', 'replace').decode('ascii')}")
            # Raise to fail fast and let us fix
            raise e
            
    conn.close()
    
    # Save output as JSON array
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
        
    print(f"Saved {len(results)} results to {output_path}")

# Run generation for levels 6, 7, 8 and Capstone
try:
    # Level 0
    generate_level_results(
        level_id=0,
        sql_files=[os.path.join(MODULOS_DIR, "nivel-00-fundamentos", "ejercicios-nivel-00.sql")],
        template_path=os.path.join(DATASET_DIR, "expected-results-nivel-00.json"),
        output_path=os.path.join(DATASET_DIR, "expected-results-nivel-00.json")
    )

    # Level 1
    generate_level_results(
        level_id=1,
        sql_files=[os.path.join(MODULOS_DIR, "nivel-01-exploracion", "ejercicios-nivel-01.sql")],
        template_path=os.path.join(DATASET_DIR, "expected-results-nivel-01.json"),
        output_path=os.path.join(DATASET_DIR, "expected-results-nivel-01.json")
    )

    # Level 2
    generate_level_results(
        level_id=2,
        sql_files=[os.path.join(MODULOS_DIR, "nivel-02-metricas", "ejercicios-nivel-02.sql")],
        template_path=os.path.join(DATASET_DIR, "expected-results-nivel-02.json"),
        output_path=os.path.join(DATASET_DIR, "expected-results-nivel-02.json")
    )

    # Level 3
    generate_level_results(
        level_id=3,
        sql_files=[os.path.join(MODULOS_DIR, "nivel-03-joins", "ejercicios-nivel-03.sql")],
        template_path=os.path.join(DATASET_DIR, "expected-results-nivel-03.json"),
        output_path=os.path.join(DATASET_DIR, "expected-results-nivel-03.json")
    )

    # Level 4
    generate_level_results(
        level_id=4,
        sql_files=[os.path.join(MODULOS_DIR, "nivel-04-clientes", "ejercicios-nivel-04.sql")],
        template_path=os.path.join(DATASET_DIR, "expected-results-nivel-04.json"),
        output_path=os.path.join(DATASET_DIR, "expected-results-nivel-04.json")
    )

    # Level 5
    generate_level_results(
        level_id=5,
        sql_files=[os.path.join(MODULOS_DIR, "nivel-05-avanzado", "ejercicios-nivel-05.sql")],
        template_path=os.path.join(DATASET_DIR, "expected-results-nivel-05.json"),
        output_path=os.path.join(DATASET_DIR, "expected-results-nivel-05.json")
    )

    # Level 6
    generate_level_results(
        level_id=6,
        sql_files=[os.path.join(MODULOS_DIR, "nivel-06-analitica", "ejercicios-nivel-06.sql")],
        template_path=os.path.join(DATASET_DIR, "expected-results-nivel-06-template.json"),
        output_path=os.path.join(DATASET_DIR, "expected-results-nivel-06.json")
    )
    
    # Level 7
    generate_level_results(
        level_id=7,
        sql_files=[os.path.join(MODULOS_DIR, "nivel-07-bi", "ejercicios-nivel-07.sql")],
        template_path=os.path.join(DATASET_DIR, "expected-results-nivel-07-template.json"),
        output_path=os.path.join(DATASET_DIR, "expected-results-nivel-07.json")
    )
    
    # Level 8
    generate_level_results(
        level_id=8,
        sql_files=[os.path.join(MODULOS_DIR, "nivel-08-profesional", "ejercicios-nivel-08.sql")],
        template_path=os.path.join(DATASET_DIR, "expected-results-nivel-08-template.json"),
        output_path=os.path.join(DATASET_DIR, "expected-results-nivel-08.json")
    )
    
    # Capstone
    generate_level_results(
        level_id=9,
        sql_files=[
            os.path.join(MODULOS_DIR, "capstone", "parte-01-exploracion.sql"),
            os.path.join(MODULOS_DIR, "capstone", "parte-02-clientes.sql"),
            os.path.join(MODULOS_DIR, "capstone", "parte-03-marketing.sql"),
            os.path.join(MODULOS_DIR, "capstone", "parte-04-operaciones.sql"),
            os.path.join(MODULOS_DIR, "capstone", "parte-05-dashboard-ejecutivo.sql")
        ],
        template_path=os.path.join(DATASET_DIR, "expected-results-capstone-template.json"),
        output_path=os.path.join(DATASET_DIR, "expected-results-capstone.json")
    )
    
    print("\nAll expected results JSON files generated successfully!")
except Exception as e:
    print(f"\n[FATAL ERROR] Generation failed: {str(e)}")
    exit(1)
