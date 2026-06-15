#!/usr/bin/env bash
# ============================================================
# generate-secrets.sh
# Genera todos los secrets necesarios para el archivo .env
#
# Uso:
#   chmod +x scripts/generate-secrets.sh
#   ./scripts/generate-secrets.sh
#   ./scripts/generate-secrets.sh > .env.secrets  # guardar en archivo
#
# ADVERTENCIA: NUNCA subas este output a git.
#              Guarda los valores en un gestor de passwords
#              (1Password, Bitwarden, AWS Secrets Manager, etc.)
# ============================================================

set -euo pipefail

# ── Verificar dependencias ────────────────────────────────────
if ! command -v openssl &>/dev/null; then
  echo "[ERROR] openssl no encontrado. Instalalo con tu gestor de paquetes." >&2
  echo "  Ubuntu/Debian: sudo apt install openssl" >&2
  echo "  macOS:         brew install openssl" >&2
  echo "  Alpine:        apk add openssl" >&2
  exit 1
fi

# ── Generar valores ───────────────────────────────────────────
JWT_SECRET=$(openssl rand -hex 64)
SESSION_COOKIE_SECRET=$(openssl rand -hex 32)
API_INTERNAL_SECRET=$(openssl rand -hex 32)
REDIS_PASSWORD=$(openssl rand -hex 16)
POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)

# ── Mostrar advertencia en stderr (no contamina el output de .env) ──
cat >&2 <<'WARNING'

================================================================
  ADVERTENCIA DE SEGURIDAD
================================================================
  Los valores generados abajo son secretos de produccion.

  - NUNCA los subas a git (ni en .env, ni en commits, ni en PRs)
  - NUNCA los compartas por Slack, email o cualquier canal sin cifrar
  - Guardalos en un gestor de passwords:
      Personal:     1Password, Bitwarden, KeePass
      Equipo:       1Password Teams, HashiCorp Vault
      Cloud:        AWS Secrets Manager, GCP Secret Manager
  - Si un secret se expone, regenera este script y rota los valores
    en todos los servicios que lo usan
================================================================

WARNING

# ── Output en formato .env (va a stdout) ─────────────────────
cat <<ENV
# ============================================================
# Secrets generados el $(date -u '+%Y-%m-%d %H:%M:%S UTC')
# Copia los valores que necesites a tu .env o .env.staging
# NUNCA subas este output a git
# ============================================================

# JWT — firma de tokens de acceso y refresh
# Longitud: 128 chars hex (64 bytes de entropia)
JWT_SECRET=${JWT_SECRET}

# Sesiones de usuario en cookies firmadas
# Longitud: 64 chars hex (32 bytes de entropia)
SESSION_COOKIE_SECRET=${SESSION_COOKIE_SECRET}

# Secreto compartido entre frontend server-side y backend
# Longitud: 64 chars hex (32 bytes de entropia)
API_INTERNAL_SECRET=${API_INTERNAL_SECRET}

# Password de Redis local (staging simulado)
# Longitud: 32 chars hex (16 bytes de entropia)
REDIS_PASSWORD=${REDIS_PASSWORD}

# Password de PostgreSQL local (desarrollo)
# Longitud: 32 chars alphanumericos (seguro para URLs de conexion)
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# DATABASE_URL completa para desarrollo local (ajustar usuario y DB si cambiaron)
DATABASE_URL=postgresql://shopsphere_user:${POSTGRES_PASSWORD}@db:5432/shopsphere
ENV

echo >&2 ""
echo >&2 "  Secrets generados correctamente. Copia los valores a tu gestor de passwords."
echo >&2 ""
