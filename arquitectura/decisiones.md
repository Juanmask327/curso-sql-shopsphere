# ShopSphere — Decisiones de Arquitectura Técnica

**Fecha:** 2026-05-31
**Autor:** Backend Engineer
**Estado:** Aprobado para MVP (Niveles 0-3, 100 ejercicios, 3 proyectos)

---

## Resumen Ejecutivo

ShopSphere es una plataforma educativa donde el componente más crítico es el SQL Playground: un entorno de ejecución de queries en tiempo real contra un dataset de e-commerce ficticio. Las decisiones de arquitectura priorizan en este orden: **seguridad del aislamiento de queries > latencia < 2s del Playground > costo operacional del MVP > simplicidad de mantenimiento**.

---

## Decisión 1 — Sandboxing del SQL Playground

### Decision: WebAssembly (sql.js) en el navegador para el Playground principal, con validación server-side via SQLite efímero en Worker threads

### Evaluación de opciones

| Opción | Seguridad | Latencia | Costo | Complejidad |
|---|---|---|---|---|
| PostgreSQL con RLS | Alta (si está bien configurada) | ~150-400ms (round-trip + query) | Alto (instancia dedicada o connection pool bajo carga) | Alta (RLS policies, rol management, surface de escape) |
| SQLite por sesión (servidor) | Media (proceso aislado necesario) | ~80-200ms | Medio (CPU por query, manejo de archivos) | Media |
| DuckDB (servidor) | Media-Alta | ~50-100ms | Medio (buen para analytics, overkill para e-commerce OLTP simple) | Media |
| **sql.js / WebAssembly (cliente)** | **Muy alta (aislamiento por diseño)** | **~10-50ms** | **Muy bajo (cómputo en el cliente)** | **Baja** |

### Arquitectura elegida: Client-side WASM + Server-side Validation

**Ejecución interactiva (feedback inmediato):** sql.js corre en un Web Worker dentro del navegador del estudiante. El dataset de e-commerce (~500KB serializado) se carga una vez por sesión desde un CDN. Las queries se ejecutan localmente en < 50ms sin round-trip de red.

**Validación oficial de respuestas (para registrar progreso):** Cuando el estudiante envía una respuesta como "correcta", el backend la valida ejecutándola contra una instancia SQLite efímera en un Worker Thread de Node.js (isolated, sin acceso a filesystem, sin módulos nativos). Este path tiene un SLA de 2s pero es menos frecuente que la ejecución exploratoria.

### Justificación de la decisión

1. **Seguridad máxima sin infraestructura especial:** El código malicioso del estudiante (DROP TABLE, infinite loops, etc.) corre en su propio proceso de browser y no puede afectar ningún servidor ni a otros estudiantes. Es aislamiento por arquitectura, no por configuración.

2. **Latencia sub-50ms:** Elimina el round-trip de red para el loop de exploración. El estudiante experimenta el playground como una herramienta local.

3. **Costo escalable a cero:** 1000 usuarios ejecutando queries simultáneamente no genera carga adicional en el backend. El cómputo es distribuido en los clientes.

4. **Consistencia del dataset:** El mismo archivo SQLite binario (compilado y versionado en el repo) se sirve a todos los estudiantes, garantizando resultados determinísticos para la validación.

### Limitaciones y mitigaciones

- **Dataset ~500KB por sesión:** Aceptable. Se sirve con headers `Cache-Control: immutable` desde CDN. Después de la primera carga, es 0ms.
- **No soporta queries pesadas de analytics:** No es el objetivo del MVP. Los ejercicios son SELECT con JOINs, agregaciones simples, subqueries — todos ejecutan en < 100ms en WASM.
- **Validación server-side agrega ~200-500ms:** Solo ocurre al momento de "submit", no durante exploración. Aceptable.

### Reset del dataset

El reset es trivial: recargar el archivo SQLite inicial desde memoria (ya está en el Worker). No hay estado servidor que resetear.

---

## Decisión 2 — Validación Automática de Respuestas

### Decisión: Comparación canónica de resultados, no comparación de texto SQL

### Algoritmo de Validación

La query del estudiante es correcta si y solo si produce el mismo resultado que la query de referencia definida por el creador del ejercicio, bajo las reglas de comparación apropiadas al tipo de ejercicio.

```
VALIDATION ALGORITHM

Input:
  - student_query: string
  - exercise_id: string
  - expected_result_mode: "exact_ordered" | "exact_unordered" | "schema_match"

Step 1 — Ejecución segura
  Ejecutar student_query en SQLite Worker aislado con timeout de 5 segundos.
  Si timeout o error de sintaxis: retornar { valid: false, error_type: "execution_error", message: <sqlite_error> }

Step 2 — Obtener resultado de referencia
  Leer expected_result desde cache (pre-calculado en el seed del ejercicio).
  Estructura: { columns: string[], rows: any[][], row_count: number }

Step 3 — Comparación según modo

  Modo "exact_ordered" (para ejercicios con ORDER BY explícito):
    - Mismo número de columnas
    - Mismos nombres de columnas (case-insensitive)
    - Mismas filas en el mismo orden (comparación celda a celda con coerción de tipos)

  Modo "exact_unordered" (para la mayoría de ejercicios SELECT):
    - Mismo número de columnas y nombres
    - Mismo multiset de filas (orden irrelevante)
    - Implementación: serializar cada fila como JSON ordenado, crear Set, comparar Sets

  Modo "schema_match" (para ejercicios CREATE TABLE / DDL):
    - Solo comparar estructura de columnas resultante, no datos

Step 4 — Feedback diferenciado
  Si inválido, retornar hint_level basado en:
    - Columnas correctas pero filas incorrectas -> "Revisa tu condición WHERE o los JOINs"
    - Más filas de las esperadas -> "Puede que tengas filas duplicadas. Considera DISTINCT o revisa tus JOINs"
    - Menos filas de las esperadas -> "Te faltan filas. Verifica que no estás filtrando datos válidos"
    - Tipos de columna diferentes -> "Los tipos de dato no coinciden"
    - Error de ejecución -> mostrar mensaje de SQLite directamente

Output:
  { valid: boolean, hint?: string, hint_level?: 1|2|3, row_count_got?: number, row_count_expected?: number }
```

### Pre-cálculo de resultados esperados

Los resultados de referencia se calculan **en build time** (no en runtime) y se almacenan en la tabla `exercises.expected_result_json`. Esto evita re-ejecutar la query de referencia en cada validación y garantiza determinismo.

### Coerción de tipos en comparación

SQLite es loosely typed. Para comparaciones robustas:
- Números: comparar con `==` después de `Number()`, no `===`
- Fechas: normalizar a ISO 8601 antes de comparar
- Strings: trim + lowercase para comparaciones case-insensitive cuando el ejercicio lo indica
- NULL: dos NULLs se consideran iguales en este contexto (distinto al comportamiento SQL estándar)

---

## Decisión 3 — Stack Técnico

### Backend: Node.js con TypeScript + Fastify

**Motor:** Node.js 22 LTS con TypeScript strict mode.
**Framework:** Fastify (no Express).

Justificación de Fastify sobre Express:
- 40-60% más throughput en benchmarks de JSON serialization (crítico para retornar resultados de queries en tablas)
- Schema validation nativo con JSON Schema + Zod integration (input validation en la capa correcta sin dependencias extra)
- Plugin system con encapsulación real (no middleware global)
- TypeScript-first desde el diseño

**ORM / Query Builder:** Drizzle ORM.

Justificación de Drizzle:
- Schema definido en TypeScript puro, sin DSL propio ni decoradores
- Genera SQL predecible y legible — puedes ver el SQL que ejecuta sin magia
- Migraciones como archivos SQL versionados (fácil de auditar y hacer rollback)
- Soporte nativo PostgreSQL + SQLite (útil para tests locales con SQLite en lugar de Postgres)
- Alternativa rechazada — Prisma: genera un query engine binario externo, cold starts lentos en serverless, abstracciones que ocultan el SQL real (problema en una plataforma que enseña SQL)

### Base de Datos Principal: PostgreSQL 16

**Uso:** Usuarios, sesiones, progreso, intentos de ejercicios, certificados.

Justificación:
- ACID compliance para datos de progreso educativo (no podemos perder XP o intentos)
- JSONB para almacenar `expected_result` de ejercicios y `result_snapshot` de intentos sin schema rígido
- `pg_trgm` extension para búsqueda en contenido de ejercicios en el futuro
- Disponible en managed en todas las plataformas cloud relevantes (Supabase, Railway, Neon, RDS)
- Para el MVP: **Neon** (PostgreSQL serverless) — branching de DB para staging, escala a cero cuando no hay tráfico, free tier generoso

### Cache: Redis (Upstash)

**Cuándo y para qué:**

Redis se usa en tres casos específicos — no como cache de "todo":

1. **Rate limiting del Playground** (crítico desde día 1)
   - Sliding window counter por `user_id`: máximo 60 queries/minuto
   - Evita que un estudiante sature el Worker pool con queries pesadas en loop
   - Implementación: `INCR playground:ratelimit:{user_id}:{minute_bucket}` con TTL de 60s

2. **Cache de resultados esperados de ejercicios** (TTL: 1 hora)
   - Key: `exercise:expected:{exercise_id}`
   - Evita ir a PostgreSQL en cada validación para leer el `expected_result_json`
   - Invalidación explícita cuando un admin edita un ejercicio

3. **Sesiones de usuario** (alternativa a JWT stateless)
   - Key: `session:{token}` → `{ user_id, email, role }` con TTL de 7 días
   - Permite revocación inmediata (logout en todos los dispositivos)

**Plataforma:** Upstash Redis (serverless, pago por request, sin servidor idle). Perfecto para el volumen del MVP.

**Lo que NO se cachea:** Progreso del usuario (necesita consistencia), resultados de queries del estudiante (efímeros por diseño).

### Frontend: Next.js 15 con TypeScript + Tailwind CSS

Justificación:
- App Router con Server Components para páginas de ejercicios (SEO, first load rápido)
- API Routes / Server Actions para formularios (auth, submit de ejercicios)
- El diseñador puede trabajar con componentes React puros en `/components` sin necesidad de entender la infraestructura backend
- Tailwind permite iterar UI sin escribir CSS custom (crítico para MVP con equipo pequeño)
- **shadcn/ui** como librería de componentes base (no una dependencia, es código copiado — sin lock-in)
- Monaco Editor para el SQL editor (el mismo editor de VS Code, con syntax highlighting de SQL nativo)

**El frontend-designer arrancar con:**
```
/app              — rutas y layouts (Next.js App Router)
/components       — componentes React reutilizables
  /ui             — primitivos (Button, Table, Badge, etc.) de shadcn
  /playground     — SQLEditor, ResultsTable, HintPanel
  /dashboard      — ProgressBar, XPCounter, ExerciseCard
/lib              — utils, API client, tipos compartidos
```

---

## Decisión 4 — Arquitectura de Servicios

### Decisión: Monolito Modular con el Playground Engine como módulo interno aislado

**No microservicios para el MVP.** Esta es una decisión deliberada y no negociable para el MVP.

### Justificación

El argumento principal contra microservicios en este punto:

1. **Complejidad operacional desproporcionada:** Dos servicios = dos deploys, dos health checks, comunicación HTTP inter-servicio, distributed tracing, potencial split-brain en errores. Para un equipo pequeño en MVP, esto es deuda operacional que no genera valor al usuario.

2. **El Playground Engine no tiene un SLA diferente al resto del backend.** Si el backend está caído, el playground no funciona de todas formas. No hay razón técnica para separarlos hoy.

3. **Separación lógica dentro del monolito es suficiente:** El módulo `PlaygroundEngine` tiene su propio directorio, sus propias interfaces TypeScript, y su propia lógica de Worker threads. Puede extraerse a un servicio separado en el futuro sin reescritura si la carga lo justifica.

### Estructura del Monolito

```
src/
  modules/
    auth/           — registro, login, JWT/sessions
    users/          — perfil, progreso, XP
    exercises/      — CRUD de ejercicios, niveles, hints
    playground/     — PlaygroundEngine: Worker pool, validación, rate limiting
    certificates/   — generación y verificación
  shared/
    db/             — cliente Drizzle, schema, migraciones
    cache/          — cliente Redis, helpers de rate limiting
    errors/         — clases de error tipadas
    middleware/     — auth guard, request logger
  app.ts            — setup de Fastify, registro de plugins
  server.ts         — entry point, graceful shutdown
```

### El Playground Engine en detalle

El módulo `playground` gestiona un pool de Worker Threads de Node.js. Cada worker tiene una instancia SQLite efímera en memoria con el dataset cargado. El flujo es:

```
Request de validación
  -> Auth middleware (verifica JWT)
  -> Rate limit check (Redis)
  -> PlaygroundEngine.validate(query, exercise_id)
      -> Adquirir worker del pool (timeout 3s si todos ocupados)
      -> worker.executeQuery(query, timeout=5s)
      -> Comparar resultado con expected_result (desde Redis/DB)
      -> Liberar worker al pool
  -> Persistir attempt en PostgreSQL (async, no bloquea respuesta)
  -> Retornar { valid, hint, ... }
```

Pool sizing inicial: `Math.ceil(os.cpus().length * 1.5)` workers. Ajustable via variable de entorno.

### Cuándo extraer el Playground a un servicio separado

Criterio objetivo: cuando el P95 de latencia del endpoint `/playground/validate` supere 1.5s bajo carga normal, O cuando el CPU del servidor supere 70% de uso sostenido por queries de playground. En ese punto, el módulo ya tiene las interfaces definidas para ser extraído.

---

## Decisión 5 — Modelo de Datos

### Schema de la plataforma (PostgreSQL)

```sql
-- ================================================================
-- EXTENSIONES
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- búsqueda full-text futuro


-- ================================================================
-- USERS
-- ================================================================
CREATE TABLE users (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT          NOT NULL UNIQUE,
  username        TEXT          NOT NULL UNIQUE,
  password_hash   TEXT          NOT NULL,           -- bcrypt, nunca plain text
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

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_username ON users (username);


-- ================================================================
-- SESSIONS (para revocación de sesiones activas)
-- ================================================================
CREATE TABLE sessions (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash      TEXT          NOT NULL UNIQUE,    -- SHA-256 del token, nunca el token raw
  user_agent      TEXT,
  ip_address      INET,
  expires_at      TIMESTAMPTZ   NOT NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  last_seen_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  revoked_at      TIMESTAMPTZ                       -- NULL = activa, NOT NULL = revocada
);

CREATE INDEX idx_sessions_user_id ON sessions (user_id);
CREATE INDEX idx_sessions_token_hash ON sessions (token_hash);
CREATE INDEX idx_sessions_expires_at ON sessions (expires_at)
  WHERE revoked_at IS NULL;  -- index parcial, solo sesiones activas


-- ================================================================
-- LEVELS (configuración de niveles del curso)
-- ================================================================
CREATE TABLE levels (
  id              SMALLINT      PRIMARY KEY,         -- 0, 1, 2, 3
  name            TEXT          NOT NULL,            -- "Fundamentos SELECT", etc.
  description     TEXT          NOT NULL,
  xp_required     INTEGER       NOT NULL DEFAULT 0,
  order_index     SMALLINT      NOT NULL,
  is_published    BOOLEAN       NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);


-- ================================================================
-- EXERCISES
-- ================================================================
CREATE TABLE exercises (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id              SMALLINT      NOT NULL REFERENCES levels(id),
  title                 TEXT          NOT NULL,
  description           TEXT          NOT NULL,
  instructions          TEXT          NOT NULL,
  difficulty            TEXT          NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  xp_reward             SMALLINT      NOT NULL DEFAULT 10 CHECK (xp_reward > 0),
  reference_query       TEXT          NOT NULL,      -- query canónica del instructor
  expected_result_json  JSONB         NOT NULL,      -- pre-calculado en seed: {columns, rows, row_count}
  validation_mode       TEXT          NOT NULL DEFAULT 'exact_unordered'
                                      CHECK (validation_mode IN ('exact_ordered', 'exact_unordered', 'schema_match')),
  hints                 JSONB         NOT NULL DEFAULT '[]'::jsonb,  -- array de strings, ordenados por nivel
  order_index           SMALLINT      NOT NULL,
  is_published          BOOLEAN       NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_exercises_level_id ON exercises (level_id);
CREATE INDEX idx_exercises_order ON exercises (level_id, order_index)
  WHERE is_published = true;


-- ================================================================
-- USER PROGRESS POR EJERCICIO
-- ================================================================
CREATE TABLE user_exercise_progress (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id       UUID          NOT NULL REFERENCES exercises(id),
  status            TEXT          NOT NULL DEFAULT 'not_started'
                                  CHECK (status IN ('not_started', 'in_progress', 'completed')),
  attempts_count    SMALLINT      NOT NULL DEFAULT 0,
  hints_used        SMALLINT      NOT NULL DEFAULT 0,
  xp_earned        SMALLINT      NOT NULL DEFAULT 0,
  first_attempt_at  TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  last_query        TEXT,                            -- última query guardada del usuario (draft)
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),

  UNIQUE (user_id, exercise_id)
);

CREATE INDEX idx_user_exercise_progress_user ON user_exercise_progress (user_id);
CREATE INDEX idx_user_exercise_progress_status ON user_exercise_progress (user_id, status);


-- ================================================================
-- EXERCISE ATTEMPTS (log inmutable de cada intento)
-- ================================================================
CREATE TABLE exercise_attempts (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id     UUID          NOT NULL REFERENCES exercises(id),
  query_submitted TEXT          NOT NULL,
  is_correct      BOOLEAN       NOT NULL,
  error_message   TEXT,                             -- si hubo error de ejecución SQL
  hint_level_shown SMALLINT,                        -- qué hint se mostró con esta respuesta
  execution_ms    SMALLINT,                         -- tiempo de ejecución de la query en ms
  result_snapshot JSONB,                            -- snapshot del resultado (primeras 50 filas) para debugging
  attempted_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
  -- Sin UPDATE: este es un log append-only
);

CREATE INDEX idx_attempts_user_exercise ON exercise_attempts (user_id, exercise_id);
CREATE INDEX idx_attempts_user_recent ON exercise_attempts (user_id, attempted_at DESC);
-- Particionamiento futuro por attempted_at cuando supere 10M filas


-- ================================================================
-- CERTIFICATES
-- ================================================================
CREATE TABLE certificates (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level_id        SMALLINT      NOT NULL REFERENCES levels(id),
  certificate_uid TEXT          NOT NULL UNIQUE,    -- ID público verificable, e.g. "SHOP-L2-A1B2C3"
  issued_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  metadata        JSONB         NOT NULL DEFAULT '{}'::jsonb,  -- XP total, tiempo, estadísticas

  UNIQUE (user_id, level_id)  -- un certificado por nivel por usuario
);

CREATE INDEX idx_certificates_uid ON certificates (certificate_uid);
CREATE INDEX idx_certificates_user ON certificates (user_id);


-- ================================================================
-- TRIGGER: updated_at automático
-- ================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_exercises_updated_at
  BEFORE UPDATE ON exercises
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_progress_updated_at
  BEFORE UPDATE ON user_exercise_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Diagrama ASCII de Componentes

```
                          ┌─────────────────────────────────────────────────────┐
                          │                   CLIENTE (Browser)                  │
                          │                                                       │
                          │  ┌──────────────────┐     ┌─────────────────────┐   │
                          │  │   Next.js 15 App  │     │   Web Worker        │   │
                          │  │   (React + TWCSS) │     │   sql.js (WASM)     │   │
                          │  │                   │     │                     │   │
                          │  │  Monaco Editor    │────>│  dataset.db (~500KB)│   │
                          │  │  ResultsTable     │     │  Ejecución local    │   │
                          │  │  ProgressDashboard│     │  < 50ms             │   │
                          │  └────────┬──────────┘     └─────────────────────┘   │
                          └──────────┼──────────────────────────────────────────┘
                                     │ HTTPS / REST JSON
                                     │ (solo para: auth, submit, progress)
                          ┌──────────┼──────────────────────────────────────────┐
                          │          │          CDN (Cloudflare)                 │
                          │          │          dataset.db (immutable, cached)   │
                          └──────────┼──────────────────────────────────────────┘
                                     │
                          ┌──────────▼──────────────────────────────────────────┐
                          │              BACKEND — Node.js + Fastify             │
                          │                                                       │
                          │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
                          │  │  auth/      │  │  users/     │  │  exercises/ │ │
                          │  │  module     │  │  module     │  │  module     │ │
                          │  └─────────────┘  └─────────────┘  └─────────────┘ │
                          │                                                       │
                          │  ┌──────────────────────────────────────────────┐   │
                          │  │          playground/ module                   │   │
                          │  │                                               │   │
                          │  │   ┌──────────────┐    ┌──────────────────┐  │   │
                          │  │   │ Rate Limiter  │    │  Worker Pool     │  │   │
                          │  │   │ (Redis)       │    │  (Node Workers)  │  │   │
                          │  │   └──────────────┘    │  ┌────────────┐  │  │   │
                          │  │                        │  │ Worker 1   │  │  │   │
                          │  │                        │  │ SQLite +   │  │  │   │
                          │  │                        │  │ dataset    │  │  │   │
                          │  │                        │  └────────────┘  │  │   │
                          │  │                        │  ┌────────────┐  │  │   │
                          │  │                        │  │ Worker N   │  │  │   │
                          │  │                        │  └────────────┘  │  │   │
                          │  │                        └──────────────────┘  │   │
                          │  └──────────────────────────────────────────────┘   │
                          │                                                       │
                          │  ┌─────────────┐  ┌─────────────┐                  │
                          │  │  shared/db  │  │ shared/cache│                  │
                          │  │  (Drizzle)  │  │  (Redis)    │                  │
                          │  └──────┬──────┘  └──────┬──────┘                  │
                          └─────────┼────────────────┼─────────────────────────┘
                                    │                 │
               ┌────────────────────┘                 └───────────────────────┐
               │                                                               │
  ┌────────────▼────────────┐                              ┌──────────────────▼──┐
  │   PostgreSQL 16 (Neon)   │                              │  Redis (Upstash)    │
  │                          │                              │                     │
  │  users                   │                              │  rate_limit:*       │
  │  sessions                │                              │  exercise:expected:*│
  │  levels                  │                              │  session:*          │
  │  exercises               │                              │                     │
  │  user_exercise_progress  │                              └─────────────────────┘
  │  exercise_attempts       │
  │  certificates            │
  └──────────────────────────┘
```

---

## Variables de Entorno

El proyecto sigue la metodología 12-factor. Todas las variables de entorno van en `.env` (nunca en el repo, ignorado por `.gitignore`). El repositorio incluye `.env.example` con todas las claves sin valores.

### Backend (`/backend/.env`)

```bash
# ── Servidor ──────────────────────────────────────────────────────────────────
NODE_ENV=production                          # development | test | production
PORT=3001
HOST=0.0.0.0
LOG_LEVEL=info                               # trace | debug | info | warn | error

# ── Base de datos principal (PostgreSQL / Neon) ───────────────────────────────
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
DATABASE_MAX_CONNECTIONS=20                  # ajustar según instancia
DATABASE_CONNECTION_TIMEOUT_MS=5000

# ── Redis (Upstash) ───────────────────────────────────────────────────────────
REDIS_URL=rediss://user:pass@host:6380
REDIS_TLS=true

# ── Auth ──────────────────────────────────────────────────────────────────────
JWT_SECRET=<min 64 chars random, generado con: openssl rand -hex 64>
JWT_EXPIRY_ACCESS=15m
JWT_EXPIRY_REFRESH=7d
SESSION_COOKIE_SECRET=<min 32 chars random>
BCRYPT_ROUNDS=12                             # no bajar de 10 en producción

# ── Playground Engine ─────────────────────────────────────────────────────────
PLAYGROUND_WORKER_POOL_SIZE=8               # default: cpus * 1.5
PLAYGROUND_QUERY_TIMEOUT_MS=5000
PLAYGROUND_RATE_LIMIT_RPM=60               # requests por minuto por usuario
PLAYGROUND_DATASET_PATH=./data/dataset.db  # ruta al SQLite del curso

# ── CORS ─────────────────────────────────────────────────────────────────────
CORS_ORIGIN=https://shopsphere.app         # en dev: http://localhost:3000

# ── Opcional: email para verificación de cuenta ──────────────────────────────
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=<api_key>
SMTP_FROM=noreply@shopsphere.app
```

### Frontend (`/frontend/.env.local`)

```bash
# Next.js prefija con NEXT_PUBLIC_ lo que va al cliente
NEXT_PUBLIC_API_URL=https://api.shopsphere.app
NEXT_PUBLIC_APP_URL=https://shopsphere.app

# Solo disponible en el servidor de Next.js (Server Actions, API Routes)
API_INTERNAL_SECRET=<secret compartido con backend para Server Actions>
```

---

## Estimación de Costos de Infraestructura (MVP — hasta 500 usuarios concurrentes)

**Supuestos:** 500 usuarios concurrentes, promedio 2 queries exploratorias/min en el Playground (cómputo en cliente, no genera carga backend), 1 submit de validación cada 3 minutos. Uptime 99.5%.

| Componente | Proveedor | Tier / Config | Costo Mensual (USD) |
|---|---|---|---|
| Backend (Node.js) | Railway | Starter — 2 vCPU, 2GB RAM, autoscale | $10 – $25 |
| Base de datos principal | Neon | Launch — 0.25 vCPU, 1GB RAM, 10GB storage | $19 |
| Redis / Cache | Upstash | Pay-per-request (~500k req/mes) | $0 – $3 |
| Frontend (Next.js) | Vercel | Hobby → Pro si supera límites | $0 – $20 |
| CDN / dataset.db | Cloudflare R2 | < 1GB storage, ~50GB egress/mes | $0 – $1 |
| Domain + SSL | Cloudflare | Proxy + cert automático | $0 (SSL gratis) |
| Monitoring | Better Stack (Logtail) | Free tier (1GB/mes logs) | $0 |
| **Total estimado** | | | **$29 – $68 / mes** |

**Proyección a 2,000 usuarios concurrentes (post-MVP):**

| Componente | Config | Costo Mensual |
|---|---|---|
| Backend | Railway Pro — 4 vCPU, 8GB + autoscale | $50 – $100 |
| Base de datos | Neon Scale — 4 vCPU, 16GB | $69 |
| Redis | Upstash Pro (~5M req/mes) | $10 |
| Frontend | Vercel Pro | $20 |
| **Total** | | **~$150 – $200 / mes** |

La arquitectura WASM-first para el Playground mantiene el costo de cómputo backend prácticamente constante independientemente de cuántos usuarios estén ejecutando queries exploratorias. El backend solo escala por submits de validación, logins y carga de progreso — operaciones mucho menos frecuentes.

---

## Riesgos y Decisiones Pendientes

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| sql.js no disponible en browser muy viejo | Baja | Medio | Fallback a validación server-side con Worker Node.js |
| dataset.db crece y afecta tiempo de carga inicial | Media | Bajo | Mantener dataset < 1MB; comprimir con gzip; CDN con cache inmutable |
| Worker pool exhausto bajo carga pico | Baja | Alto | Rate limiting Redis previene esto; monitorear cola de espera |
| Neon cold start en tier free (~500ms primer query del día) | Media | Bajo | Migrar a tier pago antes del lanzamiento público |
| Estudiante intenta XSS en query SQL | Alta | Bajo | Toda ejecución es en WASM cliente o Worker aislado; la query nunca se inyecta en HTML |

---

*Este documento es la fuente de verdad de arquitectura para el MVP. Cualquier cambio a las decisiones aquí documentadas requiere una PR con justificación técnica y aprobación del tech lead.*
