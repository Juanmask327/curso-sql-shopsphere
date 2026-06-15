# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

ShopSphere es una plataforma educativa para aprender SQL usando un dataset de e-commerce ficticio. El componente crítico es el **SQL Playground**: ejecución de queries via WebAssembly (sql.js) en el browser, < 50ms, sin servidor dedicado.

La fuente de verdad de arquitectura es `arquitectura/decisiones.md`. Leerlo antes de cualquier cambio arquitectónico.

---

## Documentos Fundacionales (LEER ANTES DE CREAR CONTENIDO)

Dos documentos definen la visión y los límites del proyecto. Son la fuente de verdad para cualquier decisión sobre contenido, pedagogía o funcionalidad:

| Documento | Ubicación | Propósito |
|---|---|---|
| `PRD_Plataforma_SQL_ShopSphere.docx` | `C:\Users\Juanm\Downloads\` | Alcance, requerimientos funcionales, roadmap, MVP |
| `Descripcion_Contexto_Objetivos_Curso_SQL.docx` | `C:\Users\Juanm\Downloads\` | Filosofía pedagógica, objetivos, audiencia, diferenciadores |

### Nombre oficial del curso
**SQL para Análisis de Datos: De Principiante a Analista Profesional**
Duración: 55–60 horas · Metodología: 20% teoría / 60% práctica guiada / 20% retos abiertos

### Público objetivo
Principiantes absolutos, estudiantes universitarios, analistas de Excel, profesionales de marketing/negocio, aspirantes a Data Analyst y personas preparando entrevistas técnicas.

### Preguntas de negocio que el curso debe capacitar al estudiante a responder
- ¿Por qué disminuyeron las ventas?
- ¿Qué clientes generan más ingresos?
- ¿Qué campañas de marketing producen mejores resultados?
- ¿Qué productos deberían eliminarse del catálogo?
- ¿Cómo mejorar la retención de clientes?

---

## Estructura Obligatoria de Cada Lección

TODAS las lecciones del curso (sin excepción) deben seguir esta secuencia de 7 pasos. Cualquier lección que no siga esta estructura debe ser corregida:

1. 💼 **Problema de negocio** — contexto empresarial real de ShopSphere
2. 📚 **Concepto SQL** — explicación mínima necesaria del concepto
3. 💻 **Ejemplos guiados** — queries comentadas paso a paso
4. 🎮 **Práctica interactiva** — ejercicios en el SQL Playground
5. 🎯 **Reto abierto** — problema sin solución prescrita
6. 📈 **Interpretación de resultados** — qué significan los datos
7. 💡 **Insights empresariales** — recomendación basada en evidencia

---

## Requerimientos Funcionales del PRD (referencia rápida)

| RF | Descripción | Estado |
|---|---|---|
| RF-01 | Registro e inicio de sesión | ✅ Implementado |
| RF-02 | Gestión de progreso | ✅ Implementado |
| RF-03 | Evaluación diagnóstica | ✅ Implementado |
| RF-04 | Editor SQL (Monaco) | ✅ Implementado |
| RF-05 | Ejecución segura de queries (WASM) | ✅ Implementado |
| RF-06 | Corrección automática | ✅ Implementado |
| RF-07 | Sistema de pistas (hints) | ✅ Implementado |
| RF-08 | Gestión de proyectos por nivel | 🔧 Parcial |
| RF-09 | Certificados | ✅ Implementado |
| RF-10 | Dashboard de progreso | ✅ Implementado |

### Requerimientos No Funcionales críticos
- **RNF-01**: Tiempo respuesta < 2s (Playground < 50ms en cliente via WASM)
- **RNF-02**: Responsive mobile + desktop
- **RNF-03**: Disponibilidad 99.5%
- **RNF-05**: Aislamiento total de queries de estudiantes

---

## Setup inicial

**Opción rápida (recomendada):** los scripts de setup crean el `.env`, levantan los servicios y esperan a que estén listos:

```powershell
# Windows PowerShell
.\scripts\setup.ps1
```
```bash
# Linux / macOS / WSL
bash scripts/setup.sh
```

**Manual:** copiar `.env.example` a `.env` y completar `POSTGRES_PASSWORD`, `JWT_SECRET` (min 64 chars), `SESSION_COOKIE_SECRET` (min 32 chars). Los demás valores tienen defaults para desarrollo local.

El frontend lee variables adicionales de `frontend/.env.local` (no del `.env` raíz). Ver `arquitectura/decisiones.md` — Variables de Entorno para la lista completa.

En PowerShell, generar secretos aleatorios:
```powershell
scripts/generate-secrets.ps1
```

---

## Levantar el entorno local

```bash
docker-compose up -d
```

La primera vez descarga imágenes y ejecuta `scripts/init.sql`. Esperar ~1-2 min.

| Servicio    | URL                          |
|-------------|------------------------------|
| Frontend    | http://localhost:3000        |
| Backend API | http://localhost:3001/health |
| Adminer     | http://localhost:8080        |
| PostgreSQL  | localhost:5432               |

Stack de monitoring (opcional):
```bash
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml --profile monitoring up -d
# Prometheus: http://localhost:9090 — Grafana: http://localhost:3002
```

Reset completo (borra todos los datos):
```bash
docker-compose down -v && docker-compose up -d
```

---

## Arquitectura de dos bases de datos

Este proyecto usa **dos bases de datos distintas** — es la confusión más común:

| Base de datos | Motor | Contenido | Quién la usa |
|---|---|---|---|
| **Plataforma** | PostgreSQL 16 | users, sessions, levels, exercises, progress, certificates | Backend (Drizzle ORM) |
| **Dataset e-commerce** | SQLite (`data/dataset.db`) | customers, products, orders, order_items, returns, inventory, payments, website_sessions, marketing_campaigns | Playground WASM (cliente) + Worker de validación (backend) |

El schema Drizzle en `backend/src/shared/db/schema.ts` cubre **solo PostgreSQL**. El schema SQLite del dataset vive en `dataset/validate_seed.py`.

### Generar el dataset SQLite

```bash
# 1. Generar SQL de seed (inserts)
python dataset/generate_seed.py > dataset/shopsphere-seed.sql

# 2. Validar el seed antes de compilar
python dataset/validate_seed.py

# 3. Compilar a archivo .db (requiere sqlite3 CLI)
sqlite3 data/dataset.db < dataset/shopsphere-seed.sql
```

`data/dataset.db` está en `.gitignore` — se genera en build time. El frontend lo carga una vez desde CDN con `Cache-Control: immutable`.

### Pipeline de seed de ejercicios

`npm run seed:exercises` lee dos fuentes y las inserta en PostgreSQL (es idempotente — borra y reinsertar los niveles procesados):

| Fuente | Contenido |
|---|---|
| `modulos/nivel-XX/ejercicios-nivel-XX.sql` | Definiciones de ejercicios con metadatos en comentarios SQL |
| `dataset/expected-results-nivel-XX.json` | Resultados esperados pre-calculados para `expected_result_json` |

Los archivos `dataset/expected-results-*.json` se generan con `python dataset/generate_expected.py` y se versionan en el repo (son determinísticos y derivados del dataset).

Para crear una cuenta de desarrollo local (sin pasar por registro):
```bash
docker exec shopsphere-backend npx tsx src/scripts/seed-dev-account.ts
# Crea usuario dev@shopsphere.local / password: devpassword123
```

---

## Backend — Node.js 22 + Fastify + Drizzle

Directorio: `backend/`

```bash
npm run dev          # tsx watch — hot reload
npm run typecheck    # tsc --noEmit
npm run lint         # eslint, 0 warnings permitidos
npm run test         # vitest run (todos los tests)
npm run test:watch   # vitest en modo watch
npm run test:coverage

# Correr un test específico:
npx vitest run src/modules/playground/playground.service.test.ts

# Base de datos
npm run db:generate  # genera archivos de migración desde el schema Drizzle
npm run db:migrate   # aplica migraciones a PostgreSQL
npm run db:studio    # Drizzle Studio UI

# O vía Docker:
docker-compose exec backend npm run db:migrate
docker exec shopsphere-backend npm run seed:exercises
```

*Nota para Windows:* Si la política de ejecución de scripts de PowerShell bloquea los scripts `.ps1`, ejecute los comandos usando `cmd /c` (ejemplo: `cmd /c npm run test`).

*Nota de Tests:* Los tests unitarios (de servicios) están aislados mediante mocks de DB y Redis. Los tests de integración (carpeta `src/integration/`) requieren que Docker esté activo y que los contenedores de PostgreSQL y Redis estén corriendo en los puertos `5432` y `6379`. En caso contrario, los tests de integración fallarán por timeout de conexión.

**Tests usan servicios reales.** No hay mocks de base de datos. Localmente necesitás tener los servicios corriendo (`docker-compose up -d db redis`) y las variables de entorno seteadas. `BCRYPT_ROUNDS=4` en test para velocidad.

El alias `@` en imports apunta a `src/` (configurado en `vitest.config.ts` y `tsconfig.json`).

### Estructura de módulos

```
src/
  modules/
    auth/           — registro, login, JWT + sesiones (incluye Google OAuth via `google-auth-library`)
    users/          — perfil, XP, progreso
    levels/         — niveles del curso
    exercises/      — CRUD ejercicios, hints, expected_result
    playground/     — PlaygroundEngine: worker-pool.ts, worker.ts, validation.service.ts
    certificates/   — generación y verificación
    diagnostic/     — health checks internos
  shared/
    db/             — cliente Drizzle + schema PostgreSQL
    cache/          — cliente Redis (ioredis), rate limiting helpers
    email/          — nodemailer wrapper (verificación de cuenta, SMTP config)
    errors/         — clases de error tipadas
    metrics/        — prom-client (endpoint GET /metrics)
    middleware/     — auth guard, request logger
  app.ts            — setup Fastify, registro de plugins
  server.ts         — entry point, graceful shutdown
```

### Playground Engine

El módulo `playground/` gestiona un pool de Worker Threads de Node.js. Cada worker tiene una instancia SQLite efímera en memoria con el dataset cargado. Flujo de validación:

```
POST /playground/validate
  -> Auth middleware
  -> Rate limit Redis (60 req/min por usuario)
  -> PlaygroundEngine.validate(query, exercise_id)
      -> Adquirir worker del pool (timeout 3s)
      -> worker.executeQuery(query, timeout=5s)
      -> Comparar resultado vs expected_result_json (Redis/DB)
      -> Liberar worker
  -> { valid, hint, ... }
```

Pool size: `Math.ceil(os.cpus() * 1.5)`, configurable via `PLAYGROUND_WORKER_POOL_SIZE`.

---

## Frontend — Next.js 15 + Tailwind CSS

Directorio: `frontend/`

```bash
npm run dev          # next dev --port 3000
npm run build        # next build
npm run lint         # next lint
npm run type-check   # tsc --noEmit  (con guion, distinto al backend)
```

`frontend/lib/types.ts` es la fuente de verdad de tipos TypeScript del frontend: `Exercise`, `QueryResult`, `ValidationResult`, `Hint`, etc. Modificar ahí antes de cambiar interfaces en componentes.

`frontend/lib/mock-data.ts` contiene datos de prueba para desarrollo sin backend.

### Estructura de rutas y componentes

```
app/
  (auth)/           — páginas de login/registro
  (course)/         — rutas protegidas del curso
  dashboard/        — progreso del estudiante
  niveles/          — listado de niveles
  certificados/     — certificados generados
  diagnostic/       — diagnóstico de salud
layout.tsx          — layout raíz
page.tsx            — landing/home

components/
  ui/               — primitivos shadcn/ui (Button, Table, Badge, etc.)
  playground/       — SQLEditor (Monaco), ResultsTable, HintPanel
  exercises/        — ExerciseCard, ExerciseList
  gamification/     — XPCounter, ProgressBar
  auth/             — formularios de auth
  layout/           — Navbar, Sidebar
```

### SQL Playground en el cliente

Usa `sql.js` (WebAssembly) en un Web Worker. El dataset se carga una vez por sesión desde CDN. Las queries corren localmente — no hay llamada al backend durante exploración interactiva.

La llamada al backend solo ocurre en `POST /playground/validate` al hacer submit de respuesta.

---

## Contenido del curso

El material educativo vive en tres directorios separados del código:

- `contenido/` — Narrativa y contexto: intros de niveles (`intro-nivel-XX.md`), briefings de ejercicios (`briefings-nivel-XX.md`), proyectos (`proyecto-nivel-XX.md`), worldbuilding (`shopsphere-world.md`), bienvenida, capstone brief.
- `modulos/` — Lecciones técnicas y ejercicios SQL por nivel. Convención de nombres dentro de cada nivel:
  - `leccion-NN.md` — lección con estructura de 7 pasos
  - `ejercicios-nivel-XX.sql` — ejercicios en SQL con metadatos en comentarios, consumidos por `seed:exercises`
- `evaluaciones/` — Evaluación diagnóstica de entrada del estudiante (`diagnostico.md`) que determina el nivel de inicio personalizado (RF-03). No lo edita ningún agente; es contenido estático de la UI.

Los niveles van de `nivel-00-fundamentos` a `nivel-08-profesional` más `capstone/`.

Estos archivos los editan principalmente los agentes `sql-teacher` y `content-writer`.

Documentación operacional del entorno en `docs/runbook.md` (mantenido por el `devops-engineer`).

### QA de contenido

Los informes de QA por nivel viven en `qa/`:
- `qa/informe-nivel-XX.md` — resultado de revisión de lección/ejercicios por `sql-data-analyst`
- `qa/correcciones-pendientes-sql-teacher.md` — backlog de correcciones detectadas
- `qa/informe-seed-validacion-final.md` — validación del seed del dataset

Leer los informes antes de modificar ejercicios de un nivel ya revisado.

---

## Modelo de datos (PostgreSQL)

Tablas principales: `users`, `sessions`, `levels`, `exercises`, `user_exercise_progress`, `exercise_attempts` (append-only), `certificates`.

La columna `exercises.expected_result_json` (JSONB) se pre-calcula en build time — no recalcular en runtime. La columna `exercises.validation_mode` define el algoritmo de comparación: `exact_ordered` | `exact_unordered` | `schema_match`.

Schema completo: `scripts/init.sql`. Migraciones Drizzle en `backend/src/shared/db/`.

---

## Variables de entorno críticas

Ver `.env.example` para la lista completa. Las indispensables para arrancar:

| Variable | Descripción |
|---|---|
| `POSTGRES_PASSWORD` | Contraseña PostgreSQL |
| `JWT_SECRET` | Mínimo 64 chars — `openssl rand -hex 64` |
| `SESSION_COOKIE_SECRET` | Mínimo 32 chars — `openssl rand -hex 32` |
| `DATABASE_URL` | Connection string PostgreSQL |
| `REDIS_URL` | Connection string Redis |

En PowerShell: `-join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })` genera un secreto aleatorio.

---

## CI/CD

Pipeline en `.github/workflows/ci.yml`:
- `lint-backend` y `lint-frontend` corren en paralelo
- `test-backend` corre después de lint, con PostgreSQL 16 y Redis 7 reales como servicios de GitHub Actions
- `deploy-staging` corre solo desde `main` — pendiente de configurar proveedor (ver `arquitectura/decisiones.md` — Estimación de Costos)

El dataset `data/dataset.db` no va al repo (está en `.gitignore`). Se genera en build time.

---

## Directrices de Desarrollo y Gotchas Críticos

### 1. Validación de Parámetros en el Backend (Fastify + Zod)
Fastify procesa y convierte los parámetros numéricos de ruta definidos en sus esquemas Ajv a tipo `number` antes de pasarlos al controlador. Cualquier esquema Zod que valide parámetros numéricos (como `id` o `level_id`) debe:
* Usar coerción: `z.coerce.number()` en lugar de `z.string()`.
* Permitir números no negativos: `.nonnegative()` en vez de `.positive()`, para soportar el **Nivel 0**.

### 2. Componentes de UI con `asChild` (Radix UI Slot)
Al usar la propiedad `asChild` en el componente `Button` (que delega el renderizado al `Slot` de Radix UI):
* El componente debe recibir **un único elemento hijo** directo.
* Evita condicionar hermanos lógicos (por ejemplo, `{loading && <svg />}`) junto al `children` principal en el árbol que recibe `Slot`. Esto causa el error de React: `React.Children.only expected to receive a single React element child`. Aísla el condicional según si `asChild` es activo o no.

### 3. Validación Exacta No Ordenada (`exact_unordered`) con Muestra de Filas
Para mantener los archivos de resultados esperados en JSON livianos, la propiedad `sample_rows` puede contener solo un subconjunto representativo de los datos. En este caso, el validador automático (`validation.service.ts`) verifica que la cantidad total de filas coincida (`row_count_got === row_count_expected`) y comprueba que las filas de muestra del JSON existan como un subconjunto dentro de los resultados del estudiante (`isSubsetOnly = expected.rows.length < expected.row_count`). Esto previene fallos falsos positivos.

### 4. Navegación en Next.js (Frontend) y ESLint
* Usar siempre el componente `<Link>` de `next/link` para la navegación interna en lugar de etiquetas HTML `<a>` nativas. Esto evita recargas completas de página y cumple con la regla de ESLint `no-html-link-for-pages`.
* Para evitar fallos en el linter del frontend, asegúrate de escapar caracteres especiales como comillas dobles en textos de componentes JSX (por ejemplo, usar `&quot;` o `{"..."}`).

### 5. Control de Promesas Flotantes en Controladores (Fastify)
* Retornar o awaitar siempre los métodos de respuesta asíncronos en Fastify (como `reply.redirect(...)` o `reply.send(...)`) para evitar advertencias de promesas flotantes del linter (`@typescript-eslint/no-floating-promises`), y adecuar la firma de los handlers para admitir `Promise<FastifyReply | void>`.

### 6. Hot-reload no funciona en Windows (Docker)
`docker-compose.override.yml` incluye `WATCHPACK_POLLING=true` para el frontend. Si el hot-reload del frontend no detecta cambios en Windows, verificar que este override esté activo (`docker-compose up -d` lo aplica automáticamente).

### 7. Conflictos de puerto
Si los puertos 3000, 3001, 5432 o 6379 están ocupados, cambiar las variables `*_PORT_EXPOSED` en `.env` (e.g., `FRONTEND_PORT_EXPOSED=3100`). No editar `docker-compose.yml` directamente.


---

## Sub-agentes especializados

En `.claude/agents/` hay agentes especializados para distintos roles del proyecto. Usarlos para tareas específicas:

| Agente | Responsabilidad |
|---|---|
| `backend-engineer` | APIs, schema Drizzle, PlaygroundEngine, auth, tests |
| `frontend-design` | Componentes React, UI/UX, Tailwind |
| `sql-teacher` | Lecciones de SQL, ejercicios, estructura pedagógica |
| `content-writer` | Narrativa ShopSphere, briefings, worldbuilding |
| `sql-data-analyst` | Análisis del dataset, QA de lecciones y queries |
| `devops-engineer` | Docker, CI/CD, infraestructura |
