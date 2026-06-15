---
name: project-shopsphere-infra
description: Stack Docker Compose, sandboxing del playground, archivos creados y variables de entorno
metadata:
  type: project
---

Entorno de desarrollo local configurado con Docker Compose. El proyecto vive en `C:\Users\Juanm\OneDrive\Desktop\Curso SQL`.

**Why:** Decisiones tomadas en `arquitectura/decisiones.md` (2026-05-31) y aprobadas para MVP de 100 ejercicios, niveles 0-3.

**How to apply:** Cualquier decision futura de infraestructura debe ser consistente con este stack. Si se cambia el cloud provider o el metodo de sandboxing, actualizar esta memoria.

---

## Stack decidido (actualizado 2026-05-31)

- **Backend:** Node.js 22 + Fastify + TypeScript — directorio /backend, puerto 3001
- **Frontend:** Next.js 15 + Tailwind CSS — directorio /frontend, puerto 3000
- **DB plataforma:** PostgreSQL 16 Alpine — schema publico — puerto local 5432
- **Cache/sesiones:** Redis 7 Alpine — puerto local 6379
- **DB Admin (dev):** Adminer 4 — puerto 8080

## Metodo de sandboxing del Playground

**Decision final: sql.js (WebAssembly) en el navegador del estudiante.**

No hay playground-db ni servicio de ejecucion separado. El aislamiento es por arquitectura: el codigo del estudiante corre en su proceso de browser, nunca en un servidor compartido. El backend solo recibe llamadas al hacer "submit" (validacion via Worker Thread de Node.js con SQLite efimero en memoria).

El docker-compose.yml anterior tenia un servicio "playground-db" que fue eliminado porque contradice la Decision 1 del documento de arquitectura.

**Why:** Aislamiento maximo sin infraestructura especial, latencia sub-50ms para exploracion, costo de computo cero en el backend bajo cualquier cantidad de estudiantes explorando.

## Redes Docker (simplificadas en v2)

- `shopsphere-backend`: db + redis + backend
- `shopsphere-frontend`: frontend + backend
- (se elimino la red playground — ya no hay playground-db)

## Schema de la plataforma (scripts/init.sql — version 2)

Tablas en PostgreSQL (schema publico):
- `users` — id UUID, email, username, password_hash, role, xp_total, current_level
- `sessions` — token_hash (SHA-256), ip_address, revoked_at (NULL=activa)
- `levels` — id SMALLINT (0-3), seed inicial con 4 niveles (0-2 publicados)
- `exercises` — reference_query, expected_result_json (JSONB), hints (JSONB array)
- `user_exercise_progress` — UNIQUE(user_id, exercise_id), last_query draft
- `exercise_attempts` — append-only log, result_snapshot JSONB
- `certificates` — UNIQUE(user_id, level_id), certificate_uid publico verificable

Extensiones: pgcrypto (gen_random_uuid), pg_trgm (busqueda futura).
Trigger update_updated_at_column() aplicado a: users, exercises, user_exercise_progress.

**El dataset del e-commerce ShopSphere (categorias, productos, ordenes) NO esta en esta DB.**
Vive en `data/dataset.db` (SQLite binario para el Playground WASM, generado en build time).

## Archivos creados / modificados (sesion 2026-05-31)

- `docker-compose.yml` — reescrito: servicios backend, frontend, db, redis, adminer
- `docker-compose.override.yml` — simplificado: adminer con puerto + env de debug
- `backend/Dockerfile` — nuevo multistage: base, dev (tsx watch), build (tsc), prod
- `frontend/Dockerfile` — nuevo multistage: base, dev (next dev), build, prod (standalone)
- `scripts/init.sql` — reemplazado: schema completo de plataforma (7 tablas)
- `scripts/setup.sh` — nuevo: setup automatico Linux/macOS/WSL con health checks
- `scripts/setup.ps1` — nuevo: setup automatico Windows PowerShell
- `.github/workflows/ci.yml` — nuevo: lint→typecheck→test→deploy-staging
- `.env.example` — actualizado: variables organizadas en grupos con comentarios
- `.gitignore` — ampliado: data/*.db, drizzle artifacts, certs SSL locales
- `README.md` — Getting Started completo con setup automatico y manual
- `data/.gitkeep` — placeholder para directorio del dataset SQLite

## Variables de entorno criticas (el proceso no arranca sin ellas)

- `POSTGRES_PASSWORD` — contrasena de PostgreSQL
- `JWT_SECRET` — minimo 64 chars hex (openssl rand -hex 64)
- `SESSION_COOKIE_SECRET` — minimo 32 chars hex (openssl rand -hex 32)
- `DATABASE_URL` — construida desde POSTGRES_* en el compose
- `REDIS_URL` — apunta al servicio redis en Docker

Variables con defaults razonables para dev: NODE_ENV, PORT, BCRYPT_ROUNDS=12, PLAYGROUND_*.

## CI/CD (.github/workflows/ci.yml)

1. `lint-backend` — ESLint + tsc --noEmit en /backend
2. `lint-frontend` — ESLint + tsc --noEmit en /frontend (paralelo a 1)
3. `test-backend` — vitest con Postgres 16 + Redis 7 reales como servicios de Actions
4. `deploy-staging` — placeholder (pendiente elegir proveedor)

BCRYPT_ROUNDS=4 en CI para velocidad de tests. Deploy a staging solo desde rama main.

## Archivos creados / modificados (sesion Fase 1 — Tarea 2-4, 2026-05-31)

- `scripts/init.sql` — corregido: seed de levels ampliado a 10 niveles (0-8 + capstone id=9). Niveles 0-2 publicados; 3-9 is_published=false para desarrollo futuro.
- `scripts/validate-env.sh` — nuevo: valida JWT_SECRET (>=64 chars), DATABASE_URL (formato postgresql://), BCRYPT_ROUNDS (>=10), PLAYGROUND_QUERY_TIMEOUT_MS (<=10000), SESSION_COOKIE_SECRET (>=32 chars), POSTGRES_* y REDIS_URL. Sale con exit code 1 en error.
- `scripts/validate-env.ps1` — nuevo: equivalente PowerShell de validate-env.sh.
- `scripts/setup.sh` — modificado: llama a validate-env.sh en el paso 4 (antes de docker-compose up). Pasos renumerados.
- `scripts/setup.ps1` — modificado: llama a validate-env.ps1 en el paso 4.
- `scripts/prometheus.yml` — nuevo: configuracion de scraping de Prometheus. Scrapea backend:3001/metrics cada 15s.
- `docker-compose.monitoring.yml` — nuevo: servicios Prometheus (puerto 9090) y Grafana (puerto 3002) con perfil "monitoring". Red externa shopsphere-backend. Datasource Prometheus pre-configurado via provisioning.
- `monitoring/grafana/provisioning/datasources/prometheus.yml` — nuevo: datasource Prometheus auto-configurado para Grafana.
- `monitoring/grafana/provisioning/dashboards/dashboard.yml` — nuevo: provider de dashboards Grafana.
- `docs/runbook.md` — nuevo: runbook operacional completo (8 secciones).
- `README.md` — ampliado: sección de Observabilidad y Monitoring con instrucciones de activación.

## Niveles del curso (seed en scripts/init.sql)

Seed de 10 niveles (id 0-9):
- 0: Fundamentos SELECT (publicado)
- 1: Filtrado y Texto (publicado)
- 2: Agregaciones (publicado)
- 3: JOINs (no publicado)
- 4: Subqueries (no publicado)
- 5: Window Functions (no publicado)
- 6: CTEs y Recursion (no publicado)
- 7: Optimizacion (no publicado)
- 8: Diseno de Esquemas (no publicado)
- 9: Capstone — ShopSphere (no publicado)

XP requerido: 0 / 500 / 1500 / 3000 / 5000 / 7500 / 10500 / 14000 / 18000 / 22500

## Stack de monitoring

- Prometheus: prom/prometheus:latest, puerto 9090, config en scripts/prometheus.yml
- Grafana: grafana/grafana:latest, puerto 3002, credenciales: admin/shopsphere_grafana
- Activacion: --profile monitoring con docker-compose.monitoring.yml
- Datasource Prometheus pre-configurado (provisioning automatico en arranque)

## Proveedor cloud — pendiente de decision

Opciones en decisiones.md: Railway (backend, $10-25/mes), Vercel (frontend, gratis/pro),
Neon (PostgreSQL serverless, $19/mes), Upstash Redis (~$0-3/mes), Cloudflare R2 (dataset.db).
Total MVP estimado: $29-68/mes para hasta 500 usuarios concurrentes.

## Cambios en sesion 2026-06-03

- `docker-compose.yml` — agregado mount `./modulos:/modulos` en servicio backend. Permite que seed-exercises.ts lea los .sql de ejercicios sin docker cp.
- `docker-compose.yml` — corregido healthcheck del servicio backend: reemplazado `wget` (no disponible en stage dev Alpine) por `node -e "require('http').get(...)"`.
- `backend/src/modules/playground/worker-dev-loader.mjs` — eliminado (archivo temporal de debugging).

## Seed de ejercicios (2026-06-03)

Estado actual de ejercicios en DB tras ejecutar `docker exec shopsphere-backend npm run seed:exercises`:
- Nivel 1 (exploracion): 20 ejercicios, publicados
- Nivel 2 (metricas): 24 ejercicios, publicados
- Nivel 3 (joins): 24 ejercicios, publicados
- Nivel 4 (clientes): 22 ejercicios, NO publicados
- Nivel 5 (avanzado): 24 ejercicios, NO publicados
- Total: 114 ejercicios insertados

El script es idempotente: borra y reinserta los niveles procesados. Rutas: /modulos (SQL) y /dataset (JSON expected-results).

## Nota sobre healthcheck del backend (dev)

El stage `dev` del Dockerfile no instala wget (Alpine). El healthcheck en docker-compose.yml usa `node` para hacer el HTTP GET interno. El stage `prod` del Dockerfile tiene su propio HEALTHCHECK con wget (correcto porque prod instala los binarios necesarios).
