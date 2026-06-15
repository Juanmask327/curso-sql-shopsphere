# ============================================================
# ShopSphere — Validacion de variables de entorno (Windows)
#
# Uso: .\scripts\validate-env.ps1
#   O con archivo especifico: .\scripts\validate-env.ps1 -EnvFile ".env.staging"
#
# Sale con codigo 0 si todo esta correcto.
# Sale con codigo 1 si hay alguna variable faltante o invalida.
#
# Llamado automaticamente por setup.ps1 antes de levantar
# los servicios con docker-compose.
# ============================================================

param(
    [string]$EnvFile = ".env"
)

$ErrorActionPreference = "Continue"

# ── Funciones de logging ──────────────────────────────────────
function Write-Ok    { param($msg) Write-Host "[OK]    $msg" -ForegroundColor Green }
function Write-Err   { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }
function Write-Warn  { param($msg) Write-Host "[WARN]  $msg" -ForegroundColor Yellow }

# ── Cargar .env si existe ─────────────────────────────────────
if (-not (Test-Path $EnvFile)) {
    Write-Err "Archivo '$EnvFile' no encontrado."
    Write-Err "Crea uno copiando .env.example:"
    Write-Err "  copy .env.example .env"
    exit 1
}

# Parsear el archivo .env e importar variables al scope actual
$envVars = @{}
Get-Content $EnvFile | ForEach-Object {
    $line = $_.Trim()
    # Ignorar comentarios y lineas vacias
    if ($line -and -not $line.StartsWith('#')) {
        $parts = $line -split '=', 2
        if ($parts.Length -eq 2) {
            $key   = $parts[0].Trim()
            $value = $parts[1].Trim()
            # Remover comillas simples o dobles envolventes
            $value = $value -replace "^['""]|['""]$", ""
            $envVars[$key] = $value
            # Tambien setear en el entorno del proceso actual
            [System.Environment]::SetEnvironmentVariable($key, $value, 'Process')
        }
    }
}

$errors = 0

Write-Host ""
Write-Host "============================================================" -ForegroundColor DarkCyan
Write-Host "  ShopSphere - Validando variables de entorno" -ForegroundColor DarkCyan
Write-Host "============================================================" -ForegroundColor DarkCyan
Write-Host ""

# ── Funcion helper: obtener valor del env cargado ─────────────
function Get-EnvValue {
    param([string]$Name)
    if ($envVars.ContainsKey($Name)) {
        return $envVars[$Name]
    }
    return $null
}

# ── 1. JWT_SECRET: minimo 64 caracteres ──────────────────────
Write-Host "Verificando JWT_SECRET..."
$jwtSecret = Get-EnvValue "JWT_SECRET"
if ([string]::IsNullOrWhiteSpace($jwtSecret)) {
    Write-Err "JWT_SECRET no esta definido."
    Write-Err "Genera uno con PowerShell:"
    Write-Err "  -join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })"
    $errors++
} else {
    $jwtLen = $jwtSecret.Length
    if ($jwtLen -lt 64) {
        Write-Err "JWT_SECRET tiene $jwtLen caracteres. Minimo requerido: 64."
        Write-Err "Genera uno mas seguro con PowerShell:"
        Write-Err "  -join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })"
        $errors++
    } else {
        Write-Ok "JWT_SECRET definido ($jwtLen caracteres)."
    }
}

# ── 2. DATABASE_URL: debe comenzar con postgresql:// ─────────
Write-Host "Verificando DATABASE_URL..."
$dbUrl = Get-EnvValue "DATABASE_URL"
if ([string]::IsNullOrWhiteSpace($dbUrl)) {
    Write-Err "DATABASE_URL no esta definida."
    Write-Err "Formato esperado: postgresql://usuario:password@host:5432/dbname"
    $errors++
} else {
    if (-not ($dbUrl -match '^(postgresql|postgres)://')) {
        Write-Err "DATABASE_URL no tiene formato valido."
        Write-Err "  Actual:   $dbUrl"
        Write-Err "  Esperado: postgresql://usuario:password@host:5432/dbname"
        $errors++
    } else {
        # Enmascarar contrasena en el log
        $masked = $dbUrl -replace ':[^:@]+@', ':*****@'
        Write-Ok "DATABASE_URL definida: $masked"
    }
}

# ── 3. BCRYPT_ROUNDS: debe ser >= 10 ─────────────────────────
Write-Host "Verificando BCRYPT_ROUNDS..."
$bcryptRoundsStr = Get-EnvValue "BCRYPT_ROUNDS"
if ([string]::IsNullOrWhiteSpace($bcryptRoundsStr)) {
    Write-Err "BCRYPT_ROUNDS no esta definido."
    Write-Err "Valor minimo requerido: 10. Recomendado para produccion: 12."
    $errors++
} else {
    $bcryptRounds = 0
    if (-not [int]::TryParse($bcryptRoundsStr, [ref]$bcryptRounds)) {
        Write-Err "BCRYPT_ROUNDS debe ser un numero entero. Valor actual: '$bcryptRoundsStr'"
        $errors++
    } elseif ($bcryptRounds -lt 10) {
        Write-Err "BCRYPT_ROUNDS=$bcryptRounds es inseguro. Minimo requerido: 10."
        Write-Err "Valores bajos de bcrypt son vulnerables a ataques de fuerza bruta."
        $errors++
    } else {
        Write-Ok "BCRYPT_ROUNDS=$bcryptRounds."
        if ($bcryptRounds -lt 12) {
            Write-Warn "BCRYPT_ROUNDS=$bcryptRounds es funcional pero se recomienda 12 para produccion."
        }
    }
}

# ── 4. PLAYGROUND_QUERY_TIMEOUT_MS: debe ser <= 10000 ────────
Write-Host "Verificando PLAYGROUND_QUERY_TIMEOUT_MS..."
$timeoutStr = Get-EnvValue "PLAYGROUND_QUERY_TIMEOUT_MS"
if ([string]::IsNullOrWhiteSpace($timeoutStr)) {
    Write-Err "PLAYGROUND_QUERY_TIMEOUT_MS no esta definido."
    Write-Err "Valor recomendado: 5000 (5 segundos). Maximo permitido: 10000."
    $errors++
} else {
    $timeoutMs = 0
    if (-not [int]::TryParse($timeoutStr, [ref]$timeoutMs)) {
        Write-Err "PLAYGROUND_QUERY_TIMEOUT_MS debe ser un numero entero. Valor actual: '$timeoutStr'"
        $errors++
    } elseif ($timeoutMs -gt 10000) {
        Write-Err "PLAYGROUND_QUERY_TIMEOUT_MS=${timeoutMs}ms excede el maximo permitido de 10000ms."
        Write-Err "Un timeout tan alto permite que queries lentas saturen el Worker pool."
        $errors++
    } elseif ($timeoutMs -lt 1000) {
        Write-Warn "PLAYGROUND_QUERY_TIMEOUT_MS=${timeoutMs}ms es muy bajo. Puede rechazar queries legitimas."
        Write-Ok "PLAYGROUND_QUERY_TIMEOUT_MS=${timeoutMs}ms (advertencia: valor muy bajo)."
    } else {
        Write-Ok "PLAYGROUND_QUERY_TIMEOUT_MS=${timeoutMs}ms."
    }
}

# ── 5. Variables adicionales requeridas ───────────────────────
Write-Host "Verificando variables adicionales..."

$requiredVars = @("POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD", "REDIS_URL")
foreach ($varName in $requiredVars) {
    $val = Get-EnvValue $varName
    if ([string]::IsNullOrWhiteSpace($val)) {
        Write-Err "${varName} no esta definida."
        $errors++
    } else {
        if ($varName -eq "POSTGRES_PASSWORD") {
            $passLen = $val.Length
            Write-Ok "POSTGRES_PASSWORD definido ($passLen caracteres)."
            if ($passLen -lt 8) {
                Write-Warn "POSTGRES_PASSWORD tiene menos de 8 caracteres. Considera una contrasena mas segura."
            }
        } elseif ($varName -eq "DATABASE_URL") {
            # Ya validado arriba
        } else {
            Write-Ok "${varName}=${val}"
        }
    }
}

# ── SESSION_COOKIE_SECRET: minimo 32 caracteres ──────────────
Write-Host "Verificando SESSION_COOKIE_SECRET..."
$sessionSecret = Get-EnvValue "SESSION_COOKIE_SECRET"
if ([string]::IsNullOrWhiteSpace($sessionSecret)) {
    Write-Warn "SESSION_COOKIE_SECRET no esta definido. Requerido si se usan cookies de sesion."
    Write-Warn "Genera uno con PowerShell:"
    Write-Warn "  -join ((1..32) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })"
} else {
    $sessionLen = $sessionSecret.Length
    if ($sessionLen -lt 32) {
        Write-Err "SESSION_COOKIE_SECRET tiene $sessionLen caracteres. Minimo recomendado: 32."
        $errors++
    } else {
        Write-Ok "SESSION_COOKIE_SECRET definido ($sessionLen caracteres)."
    }
}

# ── Resumen final ─────────────────────────────────────────────
Write-Host ""
Write-Host "============================================================" -ForegroundColor DarkCyan

if ($errors -gt 0) {
    Write-Host "  Validacion FALLIDA -- $errors error(es) encontrado(s)." -ForegroundColor Red
    Write-Host "  Corrige los errores en tu archivo .env antes de continuar." -ForegroundColor Red
    Write-Host "============================================================" -ForegroundColor DarkCyan
    Write-Host ""
    exit 1
} else {
    Write-Host "  Validacion OK -- Todas las variables estan correctamente configuradas." -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor DarkCyan
    Write-Host ""
    exit 0
}
