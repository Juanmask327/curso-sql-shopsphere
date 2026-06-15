-- ================================================================
-- ShopSphere — Migración inicial
-- Versión: 0001
-- Fecha: 2026-05-31
-- ================================================================

-- ── Extensiones ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- búsqueda full-text futuro


-- ── Función trigger updated_at ────────────────────────────────────────────────
-- Debe crearse antes de los triggers que la usan
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ================================================================
-- USERS
-- ================================================================
CREATE TABLE IF NOT EXISTS users (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT          NOT NULL UNIQUE,
  username        TEXT          NOT NULL UNIQUE,
  password_hash   TEXT          NOT NULL,
  role            TEXT          NOT NULL DEFAULT 'student'
                                CHECK (role IN ('student', 'admin', 'instructor')),
  xp_total        INTEGER       NOT NULL DEFAULT 0
                                CHECK (xp_total >= 0),
  current_level   SMALLINT      NOT NULL DEFAULT 0
                                CHECK (current_level BETWEEN 0 AND 10),
  avatar_url      TEXT,
  is_active       BOOLEAN       NOT NULL DEFAULT true,
  email_verified  BOOLEAN       NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email    ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ================================================================
-- SESSIONS
-- ================================================================
CREATE TABLE IF NOT EXISTS sessions (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash      TEXT          NOT NULL UNIQUE,
  user_agent      TEXT,
  ip_address      TEXT,
  expires_at      TIMESTAMPTZ   NOT NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  last_seen_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  revoked_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON sessions (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions (token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at)
  WHERE revoked_at IS NULL;


-- ================================================================
-- LEVELS
-- ================================================================
CREATE TABLE IF NOT EXISTS levels (
  id              SMALLINT      PRIMARY KEY,
  name            TEXT          NOT NULL,
  description     TEXT          NOT NULL,
  xp_required     INTEGER       NOT NULL DEFAULT 0,
  order_index     SMALLINT      NOT NULL,
  is_published    BOOLEAN       NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);


-- ================================================================
-- EXERCISES
-- ================================================================
CREATE TABLE IF NOT EXISTS exercises (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id              SMALLINT      NOT NULL REFERENCES levels(id),
  title                 TEXT          NOT NULL,
  description           TEXT          NOT NULL,
  instructions          TEXT          NOT NULL,
  difficulty            TEXT          NOT NULL
                                      CHECK (difficulty IN ('easy', 'medium', 'hard')),
  xp_reward             SMALLINT      NOT NULL DEFAULT 10
                                      CHECK (xp_reward > 0),
  reference_query       TEXT          NOT NULL,
  expected_result_json  JSONB         NOT NULL,
  validation_mode       TEXT          NOT NULL DEFAULT 'exact_unordered'
                                      CHECK (validation_mode IN (
                                        'exact_ordered',
                                        'exact_unordered',
                                        'schema_match'
                                      )),
  hints                 JSONB         NOT NULL DEFAULT '[]'::jsonb,
  order_index           SMALLINT      NOT NULL,
  is_published          BOOLEAN       NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercises_level_id ON exercises (level_id);
CREATE INDEX IF NOT EXISTS idx_exercises_order    ON exercises (level_id, order_index)
  WHERE is_published = true;

CREATE TRIGGER trg_exercises_updated_at
  BEFORE UPDATE ON exercises
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ================================================================
-- USER EXERCISE PROGRESS
-- ================================================================
CREATE TABLE IF NOT EXISTS user_exercise_progress (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id       UUID          NOT NULL REFERENCES exercises(id),
  status            TEXT          NOT NULL DEFAULT 'not_started'
                                  CHECK (status IN ('not_started', 'in_progress', 'completed')),
  attempts_count    SMALLINT      NOT NULL DEFAULT 0,
  hints_used        SMALLINT      NOT NULL DEFAULT 0,
  xp_earned         SMALLINT      NOT NULL DEFAULT 0,
  first_attempt_at  TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  last_query        TEXT,
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),

  UNIQUE (user_id, exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_user_exercise_progress_user
  ON user_exercise_progress (user_id);

CREATE INDEX IF NOT EXISTS idx_user_exercise_progress_status
  ON user_exercise_progress (user_id, status);

CREATE TRIGGER trg_progress_updated_at
  BEFORE UPDATE ON user_exercise_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ================================================================
-- EXERCISE ATTEMPTS (append-only, sin updated_at)
-- ================================================================
CREATE TABLE IF NOT EXISTS exercise_attempts (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id      UUID          NOT NULL REFERENCES exercises(id),
  query_submitted  TEXT          NOT NULL,
  is_correct       BOOLEAN       NOT NULL,
  error_message    TEXT,
  hint_level_shown SMALLINT,
  execution_ms     SMALLINT,
  result_snapshot  JSONB,
  attempted_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attempts_user_exercise
  ON exercise_attempts (user_id, exercise_id);

CREATE INDEX IF NOT EXISTS idx_attempts_user_recent
  ON exercise_attempts (user_id, attempted_at DESC);


-- ================================================================
-- CERTIFICATES
-- ================================================================
CREATE TABLE IF NOT EXISTS certificates (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level_id        SMALLINT      NOT NULL REFERENCES levels(id),
  certificate_uid TEXT          NOT NULL UNIQUE,
  issued_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  metadata        JSONB         NOT NULL DEFAULT '{}'::jsonb,

  UNIQUE (user_id, level_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_uid
  ON certificates (certificate_uid);

CREATE INDEX IF NOT EXISTS idx_certificates_user
  ON certificates (user_id);
