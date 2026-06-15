# ============================================================
# ShopSphere — Script de setup del entorno local (Windows)
# Uso: .\scripts\setup.ps1
#
# Lo que hace:
#   1. Verifica dependencias (Docker, Docker Compose)
#   2. Crea .env desde .env.example si no existe
#   3. Levanta los servicios con docker-compose up -d
#   4. Espera a que PostgreSQL y Redis esten saludables
#   5. Imprime las URLs de acceso
# ============================================================

$ErrorActionPreference = "Stop"

# ── Funciones de logging ──────────────────────────────────────
function Write-Info    { param($msg) Write-Host "[INFO]  $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "[OK]    $msg" -ForegroundColor Green }
function Write-Warn    { param($msg) Write-Host "[WARN]  $msg" -ForegroundColor Yellow }
function Write-Err     { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }

# ── Verificar que corremos desde la raiz del proyecto ────────
if (-not (Test-Path "docker-compose.yml")) {
    Write-Err "Ejecuta este script desde la raiz del proyecto."
    Write-Err "Ejemplo: cd 'Curso SQL'; .\scripts\setup.ps1"
    exit 1
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor DarkCyan
Write-Host "  ShopSphere - Setup del entorno local" -ForegroundColor DarkCyan
Write-Host "============================================================" -ForegroundColor DarkCyan
Write-Host ""

# ── 1. Verificar Docker ──────────────────────────────────────
Write-Info "Verificando Docker..."

try {
    $dockerVersion = docker --version 2>&1
    Write-Success "Docker encontrado: $dockerVersion"
} catch {
    Write-Err "Docker no esta instalado o no esta en el PATH."
    Write-Err "Descargalo desde: https://www.docker.com/products/docker-desktop/"
    exit 1
}

# Verificar que el daemon de Docker esta corriendo
try {
    docker info 2>&1 | Out-Null
    Write-Success "Docker daemon activo."
} catch {
    Write-Err "El daemon de Docker no esta corriendo."
    Write-Err "Inicia Docker Desktop y vuelve a ejecutar este script."
    exit 1
}

# ── 2. Verificar Docker Compose ──────────────────────────────
Write-Info "Verificando Docker Compose..."

$composeCmd = $null
try {
    $composeVersion = docker compose version 2>&1
    $composeCmd = "docker compose"
    Write-Success "Docker Compose (plugin) encontrado: $composeVersion"
} catch {
    try {
        $composeVersion = docker-compose --version 2>&1
        $composeCmd = "docker-compose"
        Write-Success "docker-compose encontrado: $composeVersion"
    } catch {
        Write-Err "Docker Compose no esta disponible."
        Write-Err "Con Docker Desktop moderno ya viene incluido."
        Write-Err "O instalalo desde: https://docs.docker.com/compose/install/"
        exit 1
    }
}

# ── 3. Crear .env desde .env.example ────────────────────────
Write-Info "Verificando archivo .env..."

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Success "Creado .env desde .env.example."
    Write-Host ""
    Write-Warn "ACCION REQUERIDA: Abre .env y ajusta los valores antes de continuar."
    Write-Warn "Variables criticas a revisar:"
    Write-Warn "  - POSTGRES_PASSWORD"
    Write-Warn "  - JWT_SECRET        (genera con PowerShell: -join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) }))"
    Write-Warn "  - SESSION_COOKIE_SECRET"
    Write-Host ""
    Read-Host "Presiona ENTER cuando hayas editado .env para continuar"
} else {
    Write-Success ".env ya existe."
}

# Verificar que JWT_SECRET no esta vacio
if (Test-Path ".env") {
    $envContent = Get-Content ".env" | Where-Object { $_ -match "^JWT_SECRET=" }
    if ($envContent) {
        $jwtVal = ($envContent -split "=", 2)[1]
        if ([string]::IsNullOrWhiteSpace($jwtVal)) {
            Write-Err "JWT_SECRET esta vacio en .env."
            Write-Err "Genera uno con PowerShell:"
            Write-Err "  -join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })"
            exit 1
        }
    }
}

# ── 4. Validar variables de entorno ─────────────────────────
Write-Info "Validando variables de entorno..."

try {
    & powershell -ExecutionPolicy Bypass -File "scripts\validate-env.ps1"
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Fallo la validacion de variables. Corrige los errores en .env antes de continuar."
        exit 1
    }
    Write-Success "Variables de entorno validadas."
} catch {
    Write-Err "Error ejecutando validate-env.ps1: $_"
    exit 1
}

# ── 5. Levantar servicios ────────────────────────────────────
Write-Info "Levantando servicios con Docker Compose..."

if ($composeCmd -eq "docker compose") {
    docker compose up -d --build
} else {
    docker-compose up -d --build
}

Write-Success "Servicios iniciados."

# ── 6. Esperar a que PostgreSQL este healthy ─────────────────
Write-Info "Esperando a que PostgreSQL este listo (timeout: 60s)..."

$timeout  = 60
$elapsed  = 0
$interval = 3
$ready    = $false

while ($elapsed -lt $timeout) {
    try {
        $pgResult = if ($composeCmd -eq "docker compose") {
            docker compose exec -T db pg_isready -U shopsphere_user -d shopsphere 2>&1
        } else {
            docker-compose exec -T db pg_isready -U shopsphere_user -d shopsphere 2>&1
        }
        if ($LASTEXITCODE -eq 0) {
            $ready = $true
            break
        }
    } catch { }

    Write-Host -NoNewline "."
    Start-Sleep -Seconds $interval
    $elapsed += $interval
}

Write-Host ""

if (-not $ready) {
    Write-Err "PostgreSQL no respondio en ${timeout}s."
    Write-Err "Revisa los logs con: $composeCmd logs db"
    exit 1
}
Write-Success "PostgreSQL esta listo."

# ── 7. Esperar a que Redis este healthy ──────────────────────
Write-Info "Esperando a que Redis este listo (timeout: 30s)..."

$timeout = 30
$elapsed = 0
$ready   = $false

while ($elapsed -lt $timeout) {
    try {
        $redisResult = if ($composeCmd -eq "docker compose") {
            docker compose exec -T redis redis-cli ping 2>&1
        } else {
            docker-compose exec -T redis redis-cli ping 2>&1
        }
        if ($redisResult -match "PONG") {
            $ready = $true
            break
        }
    } catch { }

    Write-Host -NoNewline "."
    Start-Sleep -Seconds $interval
    $elapsed += $interval
}

Write-Host ""

if (-not $ready) {
    Write-Err "Redis no respondio en ${timeout}s."
    Write-Err "Revisa los logs con: $composeCmd logs redis"
    exit 1
}
Write-Success "Redis esta listo."

# ── 8. Resumen de acceso ─────────────────────────────────────
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  ShopSphere esta corriendo:" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend:   " -NoNewline; Write-Host "http://localhost:3000"         -ForegroundColor Cyan
Write-Host "  Backend:    " -NoNewline; Write-Host "http://localhost:3001/health"  -ForegroundColor Cyan
Write-Host "  DB Admin:   " -NoNewline; Write-Host "http://localhost:8080"         -ForegroundColor Cyan
Write-Host "  PostgreSQL: " -NoNewline; Write-Host "postgresql://localhost:5432/shopsphere" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Comandos utiles:"
Write-Host "    Ver logs:      $composeCmd logs -f"
Write-Host "    Detener:       $composeCmd down"
Write-Host "    Reset total:   $composeCmd down -v"
Write-Host "    Reconstruir:   $composeCmd up -d --build"
Write-Host "============================================================" -ForegroundColor DarkCyan
Write-Host ""
