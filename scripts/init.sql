-- ============================================================
-- ShopSphere — Schema de la plataforma educativa
--
-- Ejecutado UNA SOLA VEZ cuando el contenedor PostgreSQL
-- arranca por primera vez (docker-entrypoint-initdb.d/).
--
-- Base de datos: shopsphere (la DB principal de la plataforma).
-- Contiene: users, sessions, levels, exercises,
--           user_exercise_progress, exercise_attempts, certificates.
--
-- El SQL Playground corre en el navegador vía sql.js/WASM.
-- El dataset de ShopSphere (e-commerce) es un archivo SQLite
-- binario separado (data/dataset.db), no tablas en esta DB.
-- ============================================================

\c shopsphere

-- ============================================================
-- EXTENSIONES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid(), crypt()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- búsqueda full-text futura en ejercicios


-- ============================================================
-- FUNCIÓN: updated_at automático
-- Se define primero porque los triggers la referencian.
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT          NOT NULL UNIQUE,
  username        TEXT          NOT NULL UNIQUE,
  password_hash   TEXT          NOT NULL,
  -- bcrypt hash. Nunca se almacena texto plano.
  role            TEXT          NOT NULL DEFAULT 'student'
                                CHECK (role IN ('student', 'admin', 'instructor')),
  xp_total        INTEGER       NOT NULL DEFAULT 0 CHECK (xp_total >= 0),
  current_level   SMALLINT      NOT NULL DEFAULT 0 CHECK (current_level BETWEEN 0 AND 10),
  avatar_url      TEXT,
  is_active       BOOLEAN       NOT NULL DEFAULT true,
  email_verified  BOOLEAN       NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email    ON users (email);
CREATE INDEX idx_users_username ON users (username);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- SESSIONS
-- Permite revocación de sesiones activas (logout en todos
-- los dispositivos) y auditoría de accesos.
-- ============================================================
CREATE TABLE sessions (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash      TEXT          NOT NULL UNIQUE,
  -- SHA-256 del token JWT. El token raw nunca se almacena.
  user_agent      TEXT,
  ip_address      INET,
  expires_at      TIMESTAMPTZ   NOT NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  last_seen_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  revoked_at      TIMESTAMPTZ
  -- NULL = sesión activa. NOT NULL = sesión revocada (logout).
);

CREATE INDEX idx_sessions_user_id    ON sessions (user_id);
CREATE INDEX idx_sessions_token_hash ON sessions (token_hash);
-- Index parcial: solo sesiones activas (el 99% de los lookups)
CREATE INDEX idx_sessions_expires_at ON sessions (expires_at)
  WHERE revoked_at IS NULL;


-- ============================================================
-- LEVELS
-- Configura los niveles del curso (0-3 para el MVP).
-- ============================================================
CREATE TABLE levels (
  id              SMALLINT      PRIMARY KEY,
  -- 0 = Fundamentos, 1 = Filtrado, 2 = Agregaciones, 3 = JOINs
  name            TEXT          NOT NULL,
  description     TEXT          NOT NULL,
  xp_required     INTEGER       NOT NULL DEFAULT 0 CHECK (xp_required >= 0),
  order_index     SMALLINT      NOT NULL,
  is_published    BOOLEAN       NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Seed inicial de niveles (0 a 9 — todos publicados)
INSERT INTO levels (id, name, description, xp_required, order_index, is_published) VALUES
  (0, 'Fundamentos SELECT',            'Consultas básicas: SELECT, FROM, WHERE, LIMIT, ORDER BY',                                              0,     0, true),
  (1, 'Filtrado y Texto',              'Operadores de comparación, LIKE, IN, BETWEEN, NULL',                                                   500,   1, true),
  (2, 'Agregaciones',                  'GROUP BY, HAVING, COUNT, SUM, AVG, MIN, MAX',                                                          1500,  2, true),
  (3, 'JOINs',                         'INNER JOIN, LEFT JOIN, RIGHT JOIN, self-joins',                                                         3000,  3, true),
  (4, 'Análisis de Clientes',          'Subqueries, análisis de devoluciones, comportamiento de clientes con CTEs básicas',                    5000,  4, true),
  (5, 'CTEs y Window Functions',       'WITH clause, ROW_NUMBER, RANK, LAG, LEAD, particiones analíticas',                                     7500,  5, true),
  (6, 'Analítica de Negocio',          'Series de tiempo, cohortes, tendencias YoY, métricas de retención',                                    10500, 6, true),
  (7, 'SQL para Business Intelligence','Vistas, dashboards en SQL, atribución de marketing, modelos de datos analíticos',                      14000, 7, true),
  (8, 'SQL Profesional',               'Optimización de queries, calidad de datos, transacciones, índices, producción',                        18000, 8, true),
  (9, 'Capstone — ShopSphere',         'Proyecto final integrador: análisis completo del dataset de ShopSphere',                               22500, 9, true)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- EXERCISES
-- Ejercicios del curso. La query de referencia y el resultado
-- esperado se calculan en build time y se almacenan aquí.
-- ============================================================
CREATE TABLE exercises (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id              SMALLINT      NOT NULL REFERENCES levels(id),
  title                 TEXT          NOT NULL,
  description           TEXT          NOT NULL,
  instructions          TEXT          NOT NULL,
  difficulty            TEXT          NOT NULL
                                      CHECK (difficulty IN ('easy', 'medium', 'hard')),
  xp_reward             SMALLINT      NOT NULL DEFAULT 10 CHECK (xp_reward > 0),
  reference_query       TEXT          NOT NULL,
  -- Query canónica del instructor — nunca se expone al estudiante.
  expected_result_json  JSONB         NOT NULL,
  -- Pre-calculado en seed: { columns: string[], rows: any[][], row_count: number }
  validation_mode       TEXT          NOT NULL DEFAULT 'exact_unordered'
                                      CHECK (validation_mode IN (
                                        'exact_ordered',
                                        'exact_unordered',
                                        'schema_match'
                                      )),
  hints                 JSONB         NOT NULL DEFAULT '[]'::jsonb,
  -- Array de strings ordenados por nivel de dificultad.
  order_index           SMALLINT      NOT NULL,
  is_published          BOOLEAN       NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_exercises_level_id ON exercises (level_id);
-- Index parcial: solo ejercicios publicados (los que se sirven a estudiantes)
CREATE INDEX idx_exercises_order    ON exercises (level_id, order_index)
  WHERE is_published = true;

CREATE TRIGGER trg_exercises_updated_at
  BEFORE UPDATE ON exercises
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- USER_EXERCISE_PROGRESS
-- Estado actual de cada usuario en cada ejercicio.
-- Tabla mutable: se actualiza a medida que el estudiante avanza.
-- ============================================================
CREATE TABLE user_exercise_progress (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id       UUID          NOT NULL REFERENCES exercises(id),
  status            TEXT          NOT NULL DEFAULT 'not_started'
                                  CHECK (status IN (
                                    'not_started',
                                    'in_progress',
                                    'completed'
                                  )),
  attempts_count    SMALLINT      NOT NULL DEFAULT 0,
  hints_used        SMALLINT      NOT NULL DEFAULT 0,
  xp_earned         SMALLINT      NOT NULL DEFAULT 0,
  first_attempt_at  TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  last_query        TEXT,
  -- Último borrador guardado del estudiante (no necesariamente correcto).
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),

  UNIQUE (user_id, exercise_id)
);

CREATE INDEX idx_uep_user   ON user_exercise_progress (user_id);
CREATE INDEX idx_uep_status ON user_exercise_progress (user_id, status);

CREATE TRIGGER trg_progress_updated_at
  BEFORE UPDATE ON user_exercise_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- EXERCISE_ATTEMPTS
-- Log append-only de cada intento. No se modifica, solo se inserta.
-- Fuente de verdad para analytics y debugging.
-- ============================================================
CREATE TABLE exercise_attempts (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id      UUID          NOT NULL REFERENCES exercises(id),
  query_submitted  TEXT          NOT NULL,
  is_correct       BOOLEAN       NOT NULL,
  error_message    TEXT,
  -- Mensaje de error de SQLite si la query falló en ejecución.
  hint_level_shown SMALLINT,
  -- Qué hint se mostró junto con este feedback (si aplica).
  execution_ms     SMALLINT,
  -- Tiempo de ejecución en el Worker Thread del backend (ms).
  result_snapshot  JSONB,
  -- Primeras 50 filas del resultado para debugging y soporte.
  attempted_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
  -- Sin columna updated_at: este es un log append-only.
);

CREATE INDEX idx_attempts_user_exercise ON exercise_attempts (user_id, exercise_id);
CREATE INDEX idx_attempts_user_recent   ON exercise_attempts (user_id, attempted_at DESC);
-- Particionamiento futuro por attempted_at cuando supere 10M filas.


-- ============================================================
-- CERTIFICATES
-- Un certificado por nivel por usuario. ID público verificable.
-- ============================================================
CREATE TABLE certificates (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level_id        SMALLINT      NOT NULL REFERENCES levels(id),
  certificate_uid TEXT          NOT NULL UNIQUE,
  -- ID público verificable. Formato: "SHOP-L{level_id}-{6_chars_aleatorios}"
  -- Ejemplo: "SHOP-L2-A1B2C3"
  issued_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  metadata        JSONB         NOT NULL DEFAULT '{}'::jsonb,
  -- Snapshot del estado en el momento de emisión:
  -- { xp_total, exercises_completed, avg_attempts, time_spent_minutes }

  UNIQUE (user_id, level_id)
  -- Un usuario no puede tener dos certificados del mismo nivel.
);

CREATE INDEX idx_certificates_uid  ON certificates (certificate_uid);
CREATE INDEX idx_certificates_user ON certificates (user_id);


-- ============================================================
-- Fin del script de inicialización
-- ============================================================
