---
name: project-shopsphere
description: ShopSphere — plataforma educativa SQL Playground, stack y decisiones de arquitectura del MVP
metadata:
  type: project
---

Plataforma educativa interactiva para aprender SQL con un Playground de ejecución de queries contra dataset de e-commerce ficticio.

**Working directory:** `C:\Users\Juanm\OneDrive\Desktop\Curso SQL`

**Backend directory:** `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\backend\`

**MVP scope:** Niveles 0-3, 100 ejercicios, 3 proyectos

**Why:** Producto educativo con RNF crítico de latencia < 2s en el Playground y escalabilidad a miles de usuarios.

**How to apply:** Al retomar trabajo en este proyecto, tener en cuenta las decisiones de arquitectura en `arquitectura/decisiones.md` como fuente de verdad.

## Estado del Backend (2026-06-04 — Seeder, Dashboard + Serialization Fix)

### Seeder de ejercicios (backend/src/scripts/seed-exercises.ts)

Script `seed-exercises.ts` que pobla la tabla `exercises` desde archivos fuente:
- Lee SQLs de `modulos/nivel-0N-*/ejercicios-nivel-0N.sql` (enunciados + soluciones)
- Lee JSON de `dataset/expected-results-nivel-0N.json` (3 formatos distintos detectados automáticamente)
- Mapeo de campos: títulos desde JSON (descriptivos), enunciados+criterio del SQL, reference_query del bloque soluciones
- Idempotente: DELETE nivel_ids + INSERT en cada ejecución
- Resultado: 114 ejercicios insertados (niveles 1-5), niveles 1/2/3 is_published=true, 4/5 false
- Omite ejercicios sin solución canónica (nivel 2: ej 25; nivel 3: ej 25; nivel 4: ej 12, 19; nivel 5: ej 25)

**Nivel 0 — parseNivel00File (2026-06-03):** Reemplazó a `parseNivel00Statements` + `parseNivel00Solutions` por una función unificada. El archivo nivel-00 tiene formato diferente: soluciones inline en el mismo bloque de cada ejercicio (después de `-- SOLUCIÓN:`), no en un bloque `/* ... */` al final. La extracción usa posiciones de header via regex, no split por separadores — esto evita pérdida de asociación entre header y solución cuando hay doble separador `-- ===`. La extracción de solución usa índice explícito (no regex non-greedy) para capturar correctamente queries que empiezan con comentarios SQL (ej. ejercicio 20). Resultado: 20/20 ejercicios con solución limpia.

**Publicar Nivel 3:** `scripts/publish-nivel-3.sql` — UPDATE exercises + levels. Ejecutar con:
`docker exec shopsphere-db psql -U shopsphere_user -d shopsphere -f /scripts/publish-nivel-3.sql`

### Corrección de Serialización en Detalle de Ejercicio (2026-06-04)

- **Issue:** El schema de respuesta 200 de Fastify para la ruta `GET /exercises/:id` (definido en `exercises.routes.ts`) no incluía los campos `level_id` y `order_index`. Como resultado, Fastify filtraba estos valores en la respuesta serializada, dejándolos como `undefined` en el frontend.
- **Solución:** Se modificó el esquema de respuesta 200 en `exercises.routes.ts` para registrar explícitamente `level_id: { type: 'number' }` y `order_index: { type: 'number' }`.
- **Impacto:** Permite al frontend determinar dinámicamente a qué nivel pertenece un ejercicio para habilitar Breadcrumbs funcionales y enrutamiento SPA entre unidades adyacentes.

### Dashboard API — GET /users/me/dashboard

Endpoint completamente implementado y funcional:
- Route: `users.routes.ts` — GET /users/me/dashboard con authGuard
- Handler: `getDashboardHandler` en `users.controller.ts`
- Service: `getDashboard()` en `users.service.ts` — queries paralelas para level_progress, stats, recent_activity, level_completion
- Response shape: `DashboardResponse` con { user, level_progress, stats, recent_activity, level_completion }
- El frontend llama `api.users.getDashboard()` → `GET /users/me/dashboard` (correcto)

**Deuda técnica identificada (no bloqueante):** El cliente `api-client.ts` llama `PATCH /users/me` para updateProfile, pero el route en el backend es `PATCH /users/me/profile`. Discrepancia a corregir en sprint futuro.

**Cómo ejecutar en Docker:**
1. `docker cp modulos/nivel-0N-*/ejercicios-nivel-0N.sql shopsphere-backend:/modulos/nivel-0N-*/` (si no montado)
2. `docker exec shopsphere-backend npm run seed:exercises`

**Rutas dentro del contenedor:**
- `/modulos` → archivos SQL de ejercicios (copiados via docker cp)
- `/dataset` → JSONs de expected-results (montado en docker-compose)

**Script NPM agregado:** `"seed:exercises": "tsx src/scripts/seed-exercises.ts"` en backend/package.json

**Estado actual de exercises:**
- level_id 1: 20 ejercicios, 20 publicados (easy, 10 XP)
- level_id 2: 24 ejercicios, 24 publicados (medium, 25 XP)
- level_id 3: 24 ejercicios, 24 publicados (medium, 25 XP)
- level_id 4: 22 ejercicios, 0 publicados (hard, 50 XP)
- level_id 5: 24 ejercicios, 0 publicados (hard, 50 XP)

## Estado del Backend (2026-06-01 — Fase Final completa)

Backend con Fase 1 (auth), Fase 2 (exercises + playground), Fase 3 (users + levels + certificates) y Fase Final (diagnostic + swagger + health enriquecido + métricas Prometheus) completas. TypeScript strict: sin errores de compilación. `tsc --noEmit` pasa limpio.

### Nuevos módulos Fase Final

**modules/diagnostic/** — Evaluación diagnóstica inicial de nivel
- `diagnostic.schemas.ts` — Zod: SubmitDiagnosticSchema, SaveResultSchema, SubmitQuerySchema. Interfaces: DiagnosticBlock, DiagnosticQuestion, DiagnosticResponse, SubmitDiagnosticResponse, QuestionDetail.
- `diagnostic.service.ts` — getDiagnostic() (retorna 24 preguntas en 6 bloques sin respuestas correctas), submitDiagnostic() (evalúa múltiple opción + mini_editor en WorkerPool), saveResult() (persiste nivel recomendado en DB). Las respuestas correctas y criterios de mini_editor son constantes hardcodeadas (no en DB). Algoritmo de nivel recomendado secuencial por umbral (80%/60%/40%).
- `diagnostic.controller.ts` — handlers Fastify: getDiagnosticHandler, submitDiagnosticHandler, saveResultHandler.
- `diagnostic.routes.ts` — GET /diagnostic (público, rate 60/min), POST /diagnostic/submit (público, rate 5/min — limita uso del WorkerPool), POST /diagnostic/save-result (auth required). Con schemas OpenAPI completos.

**shared/metrics/index.ts** — Métricas Prometheus con prom-client
- Registry aislado (no global, evita conflictos en tests)
- Gauges: playground_workers_busy, playground_workers_idle, playground_workers_queue_depth, playground_workers_total
- Counter: http_requests_total {method, route, status}; diagnostic_submissions_total
- Gauge: http_request_duration_ms {method, route}
- Helper recordHttpRequest() normaliza rutas (reemplaza UUIDs por :id)
- Métricas de proceso estándar via collectDefaultMetrics()

**app.ts — cambios Fase Final:**
- Importa fastifySwagger + fastifySwaggerUi
- Swagger en /docs/json (OpenAPI JSON), Swagger UI en /docs (solo non-production)
- SecurityScheme: BearerAuth (http, bearer, JWT)
- Tags documentados: auth, exercises, playground, users, levels, certificates, diagnostic, system
- Hook onResponse que llama recordHttpRequest() para todas las rutas
- GET /health enriquecido: verifica DB (pool.connect + SELECT 1), Redis (ping), WorkerPool metrics. Timeout 2s por servicio. Status: ok/degraded. Actualiza Prometheus gauges.
- GET /metrics en formato Prometheus text (prom-client). Actualiza worker gauges antes de responder.
- diagnosticRoutes registrado bajo /

**playground.service.ts — bugfix:**
- `hintLevelShown: validationResult.hint_level ?? null` → `?? undefined` (type fix para PersistAttemptOptions)

### Archivos actualizados con schemas OpenAPI

Todos los route files tienen schema: { tags, summary, description, security?, body?, querystring?, params?, response: {} }:
- auth.routes.ts — 5 rutas documentadas
- exercises.routes.ts — 8 rutas documentadas (student + admin)
- playground.routes.ts — 1 ruta documentada
- users.routes.ts — 8 rutas documentadas (student + public + admin)
- levels.routes.ts — 3 rutas documentadas
- certificates.routes.ts — 3 rutas documentadas
- diagnostic.routes.ts — 3 rutas documentadas

### Paquetes nuevos agregados

```
@fastify/swagger@^9.7.0
@fastify/swagger-ui@^5.2.6
prom-client@^15.1.3
```
Instalados con --ignore-scripts (evita recompilación de better-sqlite3 que requiere MSVC).

---

### Decisiones de implementación — Módulo Diagnostic

- Las 24 preguntas con sus respuestas correctas son constantes TypeScript en diagnostic.service.ts — no configurables en runtime. Son "contenido del curso", no "configuración de negocio".
- Las preguntas mini_editor (12, 15, 20) se evalúan por criterios estructurales (keywords en query + columnas resultantes + row_count mínimo) con puntuación parcial. No exact match de filas — el dataset puede variar y hay múltiples queries correctas.
- POST /diagnostic/submit tiene rate limit 5/min por IP para proteger el WorkerPool de abuso.
- Si el body incluye user_id (usuario autenticado), el resultado se guarda automáticamente en background (fire-and-forget). El endpoint POST /diagnostic/save-result existe para guardar desde el frontend sin re-evaluar.
- El algoritmo de nivel es secuencial: evalúa nivel 0→8, entra en el primer nivel donde score < 80%. Si score nivel X >= 80% pero score nivel X+1 < 60%, entra en nivel X (no salta).

### Decisiones de implementación — Health Check y Métricas

- checkWithTimeout() usa Promise.race entre la promesa del check y un timeout de 2s. Si cualquier servicio falla o tarda más de 2s, status='error' pero la respuesta del /health sigue siendo HTTP 200 (el estado está en el body).
- El GET /health siempre responde HTTP 200 — los sistemas de monitoring leen el campo status del body. Esto evita falsos 503 que podrían matar el servidor prematuramente.
- /metrics actualiza los worker gauges en cada request para tener datos frescos.
- Registry aislado (no default de prom-client) para permitir múltiples instancias en tests.

---

### Módulos previos (sin cambios)

**shared/db/**, **shared/cache/**, **shared/errors/**, **shared/middleware/** — sin cambios.
**modules/auth/**, **modules/exercises/**, **modules/playground/**, **modules/users/**, **modules/levels/**, **modules/certificates/** — rutas actualizadas con schemas OpenAPI, lógica de negocio sin cambios.

---

## Stack Decidido

- **Backend:** Node.js 22 LTS + TypeScript strict + Fastify v4
- **ORM:** Drizzle ORM (schema en TypeScript, migraciones como SQL versionado)
- **DB principal:** PostgreSQL 16 en Neon (serverless, branching para staging)
- **Cache:** Redis en Upstash (rate limiting, cache de ejercicios, sesiones)
- **Frontend:** Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui + Monaco Editor
- **Playground Engine:** sql.js (WebAssembly en browser) + Worker Threads Node.js para validación server-side
- **Docs:** @fastify/swagger + @fastify/swagger-ui (Swagger UI solo non-production)
- **Observabilidad:** prom-client (Prometheus), pino (logs estructurados JSON en prod)

## Decisiones Arquitectónicas Clave

1. **Sandboxing:** Worker Thread aislado por query. No PostgreSQL/DuckDB en servidor para playground.
2. **Validación:** Comparación de resultados (no texto SQL). Tres modos. Expected results pre-calculados.
3. **Arquitectura:** Monolito modular. Sin microservicios en MVP.
4. **Auth:** JWT con refresh token rotation + tabla sessions. Token hash (SHA-256) en DB, nunca raw.

## Schema Tablas

- `users` — UUID PK, email, username, password_hash (bcrypt), role, xp_total, current_level
- `sessions` — token_hash (SHA-256), expires_at, revoked_at (nullable)
- `levels`, `exercises` — reference_query, expected_result_json (JSONB), validation_mode, hints (JSONB array)
- `user_exercise_progress` — UNIQUE(user_id, exercise_id), status, attempts_count, hints_used
- `exercise_attempts` — log append-only, result_snapshot (JSONB)
- `certificates` — certificate_uid público verificable, UNIQUE(user_id, level_id)

## Variables de Entorno Críticas

- `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` (min 64 chars), `BCRYPT_ROUNDS=12`
- `PLAYGROUND_WORKER_POOL_SIZE`, `PLAYGROUND_QUERY_TIMEOUT_MS=5000`, `PLAYGROUND_RATE_LIMIT_RPM=60`
- `PLAYGROUND_DATASET_PATH` — ruta al dataset.db del curso
- `API_BASE_URL` — URL pública de la API (para Swagger servers en producción)
- `NEXT_PUBLIC_API_URL` — consumida por el frontend (api-client.ts)

## Frontend — Cliente y Auth Store (2026-06-01)

- `frontend/lib/api-client.ts` — cliente tipado completo. Tokens: `ss_access_token` / `ss_refresh_token` en localStorage. Auto-refresh en 401. ApiError tipado con { message, code, status }.
- `frontend/lib/auth-store.ts` — AuthProvider + useAuth() + useAuthUser(). Sin Zustand, solo React Context + useState. Hidrata desde /auth/me al montar.
- El placeholder anterior de api-client.ts usaba claves de token distintas (`shopsphere_token`) — ya reemplazado.
