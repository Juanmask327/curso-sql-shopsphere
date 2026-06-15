# ============================================================
# generate-secrets.ps1
# Genera todos los secrets necesarios para el archivo .env
# Version PowerShell — equivalente a generate-secrets.sh
#
# Uso:
#   .\scripts\generate-secrets.ps1
#   .\scripts\generate-secrets.ps1 | Out-File .env.secrets -Encoding utf8
#
# ADVERTENCIA: NUNCA subas este output a git.
#              Guarda los valores en un gestor de passwords
#              (1Password, Bitwarden, AWS Secrets Manager, etc.)
# ============================================================

#Requires -Version 5.1

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Funcion para generar bytes aleatorios seguros ─────────────
function New-RandomHex {
  param([int]$Bytes)
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $buffer = New-Object byte[] $Bytes
  $rng.GetBytes($buffer)
  $rng.Dispose()
  return ($buffer | ForEach-Object { $_.ToString("x2") }) -join ""
}

function New-RandomAlphanumeric {
  param([int]$Length)
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  $result = ""
  $buffer = New-Object byte[] 1
  while ($result.Length -lt $Length) {
    $rng.GetBytes($buffer)
    $idx = $buffer[0] % $chars.Length
    # Descarta valores que crearian sesgo (rejection sampling)
    if ($buffer[0] -lt [Math]::Floor(256 / $chars.Length) * $chars.Length) {
      $result += $chars[$idx]
    }
  }
  $rng.Dispose()
  return $result
}

# ── Generar valores ───────────────────────────────────────────
$JwtSecret            = New-RandomHex -Bytes 64      # 128 chars hex
$SessionCookieSecret  = New-RandomHex -Bytes 32      # 64 chars hex
$ApiInternalSecret    = New-RandomHex -Bytes 32      # 64 chars hex
$RedisPassword        = New-RandomHex -Bytes 16      # 32 chars hex
$PostgresPassword     = New-RandomAlphanumeric -Length 32

$Timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss UTC")

# ── Mostrar advertencia ───────────────────────────────────────
Write-Host ""
Write-Host "================================================================" -ForegroundColor Yellow
Write-Host "  ADVERTENCIA DE SEGURIDAD" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Yellow
Write-Host "  Los valores generados abajo son secretos de produccion."
Write-Host ""
Write-Host "  - NUNCA los subas a git (ni en .env, ni en commits, ni en PRs)"
Write-Host "  - NUNCA los compartas por Slack, email o canal sin cifrar"
Write-Host "  - Guardalos en un gestor de passwords:"
Write-Host "      Personal:  1Password, Bitwarden, KeePass"
Write-Host "      Equipo:    1Password Teams, HashiCorp Vault"
Write-Host "      Cloud:     AWS Secrets Manager, GCP Secret Manager"
Write-Host "  - Si un secret se expone, regenera este script y rota los"
Write-Host "    valores en todos los servicios que lo usan"
Write-Host "================================================================" -ForegroundColor Yellow
Write-Host ""

# ── Output en formato .env (stdout) ──────────────────────────
$output = @"
# ============================================================
# Secrets generados el $Timestamp
# Copia los valores que necesites a tu .env o .env.staging
# NUNCA subas este output a git
# ============================================================

# JWT -- firma de tokens de acceso y refresh
# Longitud: 128 chars hex (64 bytes de entropia)
JWT_SECRET=$JwtSecret

# Sesiones de usuario en cookies firmadas
# Longitud: 64 chars hex (32 bytes de entropia)
SESSION_COOKIE_SECRET=$SessionCookieSecret

# Secreto compartido entre frontend server-side y backend
# Longitud: 64 chars hex (32 bytes de entropia)
API_INTERNAL_SECRET=$ApiInternalSecret

# Password de Redis local (staging simulado)
# Longitud: 32 chars hex (16 bytes de entropia)
REDIS_PASSWORD=$RedisPassword

# Password de PostgreSQL local (desarrollo)
# Longitud: 32 chars alphanumericos (seguro para URLs de conexion)
POSTGRES_PASSWORD=$PostgresPassword

# DATABASE_URL completa para desarrollo local (ajustar usuario y DB si cambiaron)
DATABASE_URL=postgresql://shopsphere_user:${PostgresPassword}@db:5432/shopsphere
"@

Write-Output $output

Write-Host ""
Write-Host "  Secrets generados correctamente." -ForegroundColor Green
Write-Host "  Copia los valores a tu gestor de passwords antes de cerrar esta ventana." -ForegroundColor Green
Write-Host ""
