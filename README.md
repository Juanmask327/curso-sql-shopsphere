# ShopSphere — Plataforma Educativa de SQL

ShopSphere es una plataforma interactiva para aprender SQL usando un dataset realista de e-commerce. El componente central es el **SQL Playground**: un editor que ejecuta queries en tiempo real directamente en el navegador via WebAssembly (sql.js), con latencia sub-50ms y aislamiento de seguridad por diseño.

---

## Getting Started

### Requisitos previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y corriendo
- Git
- Node.js 22+ (solo si quieres desarrollar fuera de Docker)

### Opcion rapida (recomendada) — script de setup automatico

**Linux / macOS / WSL:**
```bash
git clone https://github.com/Juanmask327/curso-sql-shopsphere.git
cd curso-sql-shopsphere
bash scripts/setup.sh
```

**Windows (PowerShell):**
```powershell
git clone https://github.com/Juanmask327/curso-sql-shopsphere.git
cd curso-sql-shopsphere
.\scripts\setup.ps1
```

El script verifica las dependencias, crea el `.env`, levanta los servicios y espera a que todo este listo antes de imprimir las URLs de acceso.

---

### Setup manual paso a paso

#### 1. Clonar el repositorio

```bash
git clone https://github.com/Juanmask327/curso-sql-shopsphere.git
cd curso-sql-shopsphere
```

#### 2. Configurar variables de entorno

```bash
# Linux / macOS / WSL
cp .env.example .env

# Windows
copy .env.example .env
```

Abre `.env` y completa los valores vacios. Los criticos son:

| Variable | Descripcion | Como generarla |
|---|---|---|
| `POSTGRES_PASSWORD` | Contrasena de PostgreSQL | Cualquier string seguro |
| `JWT_SECRET` | Firma de tokens JWT | `openssl rand -hex 64` |
| `SESSION_COOKIE_SECRET` | Firma de cookies de sesion | `openssl rand -hex 32` |

El resto de variables tienen defaults razonables para desarrollo local.

#### 3. Levantar el entorno

```bash
docker-compose up -d
```

La primera vez descarga las imagenes y ejecuta `scripts/init.sql` para crear el schema. Puede tardar 1-2 minutos.

#### 4. Verificar que todo esta corriendo

```bash
docker-compose ps
```

Todos los servicios deben mostrar `healthy` o `running`.

#### 5. Acceder a los servicios

| Servicio | URL | Notas |
|---|---|---|
| Frontend | http://localhost:3000 | Next.js 15 |
| Backend API | http://localhost:3001/health | Fastify — retorna `{"status":"ok"}` |
| DB Admin | http://localhost:8080 | Adminer — usuario en `.env` |
| PostgreSQL | localhost:5432 | Para DBeaver / TablePlus / psql |

Para conectarse desde Adminer:
- Sistema: `PostgreSQL`
- Servidor: `db`
- Usuario: valor de `POSTGRES_USER` en `.env`
- Contrasena: valor de `POSTGRES_PASSWORD` en `.env`
- Base de datos: valor de `POSTGRES_DB` en `.env`

---

## Comandos esenciales

### Iniciar el entorno

```bash
docker-compose up -d
```

### Detener el entorno (preserva los datos)

```bash
docker-compose down
```

### Detener y eliminar todos los datos (reset completo)

```bash
docker-compose down -v
```

Esto elimina los volumenes de datos. Util para empezar desde cero o cuando cambias el schema.

### Ver logs de todos los servicios

```bash
docker-compose logs -f
```

### Ver logs de un servicio especifico

```bash
docker-compose logs -f backend
docker-compose logs -f db
docker-compose logs -f redis
```

### Reconstruir imagenes (necesario al cambiar Dockerfile o package.json)

```bash
docker-compose up -d --build
```

### Entrar al shell de un contenedor

```bash
# Shell del backend
docker-compose exec backend sh

# psql directo a la DB
docker-compose exec db psql -U shopsphere_user -d shopsphere
```

### Ejecutar migraciones de Drizzle

```bash
docker-compose exec backend npm run db:migrate
```

---

## Estructura del proyecto

```
Curso SQL/
├── docker-compose.yml           # Servicios: backend, frontend, db, redis, adminer
├── docker-compose.override.yml  # Overrides de desarrollo (adminer con puerto, debug logs)
├── .env.example                 # Plantilla de variables de entorno
├── .env                         # Variables reales (NO commiteado — en .gitignore)
├── .gitignore
├── .github/
│   └── workflows/
│       └── ci.yml               # Pipeline CI: lint → typecheck → test → deploy staging
├── arquitectura/
│   └── decisiones.md            # Decisiones de arquitectura tecnica (fuente de verdad)
├── backend/                     # Node.js 22 + Fastify + TypeScript + Drizzle ORM
│   ├── Dockerfile               # Multistage: dev (tsx watch) + prod (node dist/)
│   ├── package.json
│   ├── src/
│   │   └── modules/             # auth, users, exercises, playground, certificates
│   └── drizzle.config.ts
├── frontend/                    # Next.js 15 + TypeScript + Tailwind + shadcn/ui
│   ├── Dockerfile               # Multistage: dev (next dev) + prod (standalone)
│   └── ...
├── data/                        # dataset.db — SQLite binario para el Playground WASM
│   └── .gitkeep                 # El .db no va al repo (generado en build time)
└── scripts/
    ├── init.sql                 # Schema de PostgreSQL (plataforma: users, sessions, etc.)
    ├── setup.sh                 # Setup automatico Linux/macOS/WSL
    └── setup.ps1                # Setup automatico Windows (PowerShell)
```

---

## Observabilidad y Monitoring (opcional)

El stack de monitoring incluye **Prometheus** (recolección de métricas) y **Grafana** (dashboards). Se activa con un perfil de Docker Compose separado para no consumir recursos en desarrollo normal.

### Activar el stack de monitoring

```bash
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml --profile monitoring up -d
```

### URLs de monitoring

| Servicio    | URL                      | Credenciales          |
|-------------|--------------------------|-----------------------|
| Prometheus  | http://localhost:9090    | Sin auth              |
| Grafana     | http://localhost:3002    | admin / shopsphere_grafana |

Grafana tiene Prometheus pre-configurado como datasource. Al abrir por primera vez, el datasource ya está disponible sin configuración manual.

### Detener el stack de monitoring

```bash
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml --profile monitoring down
```

### Métricas clave del Playground

El backend expone métricas en `GET /metrics` (formato Prometheus). Las métricas críticas a monitorear:

| Métrica | Descripción | Alerta |
|---|---|---|
| `playground_query_duration_ms` | Latencia de validación (histogram) | P95 > 1500ms |
| `playground_worker_pool_utilization` | % de workers en uso (gauge) | > 80% sostenido |
| `http_requests_total` | Requests por ruta/método/status | Tasa de errores 5xx > 1% |
| `playground_rate_limit_blocked_total` | Requests bloqueados por rate limiting | Picos inesperados |

---

## Arquitectura del SQL Playground

El Playground usa **WebAssembly en el navegador** (sql.js) — no hay servidor dedicado de ejecucion de queries. Esto garantiza:

- **Aislamiento maximo**: el codigo del estudiante corre en su propio proceso de browser, nunca en un servidor compartido
- **Latencia < 50ms**: sin round-trip de red para la exploracion interactiva
- **Costo cero de cómputo en el backend**: 1000 estudiantes ejecutando queries simultaneamente no genera carga de servidor

El backend solo recibe una llamada al hacer "submit" de respuesta correcta (validacion server-side via Worker Thread de Node.js con SQLite efimero).

Ver `arquitectura/decisiones.md` para la justificacion completa.

---

## Arquitectura del entorno local

```
                  Tu navegador
                       |
         +-------------+-------------+
         |             |             |
      :3000         :3001         :8080
  +---------+   +---------+   +---------+
  | Frontend|   | Backend |   | Adminer |
  | Next.js |   | Fastify |   | (DB UI) |
  +---------+   +---------+   +---------+
                  |       |
             +----+       +----+
             |                 |
          :5432             :6379
      +-----------+     +---------+
      | PostgreSQL|     |  Redis  |
      | (platform)|     |         |
      +-----------+     +---------+

  Red "backend":  backend <-> db <-> redis
  Red "frontend": backend <-> frontend
```

---

## Troubleshooting

**Los contenedores no arrancan — error de variable de entorno**
Asegurate de que `.env` existe y tiene todos los valores requeridos completados. Copia `.env.example` y editalo.

**JWT_SECRET vacio — el backend no arranca**
El backend valida que `JWT_SECRET` no este vacio al iniciar. Generalo con:
```bash
openssl rand -hex 64
# O en PowerShell:
-join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })
```

**La base de datos no inicializo correctamente**
`init.sql` solo se ejecuta si el volumen de datos no existe. Para forzar re-inicializacion:
```bash
docker-compose down -v
docker-compose up -d
```

**Puerto ya en uso**
Si el puerto 5432, 3000, 3001 o 6379 esta ocupado, cambia las variables `*_PORT_EXPOSED` en `.env`.

**Hot-reload no funciona en Windows**
Verifica que `WATCHPACK_POLLING=true` este en `docker-compose.override.yml` (ya incluido por defecto).

**El contenedor de backend reinicia en loop**
Revisa los logs: `docker-compose logs -f backend`. Lo mas probable es una variable de entorno faltante (JWT_SECRET, DATABASE_URL, etc.).
