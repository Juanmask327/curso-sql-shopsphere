#!/bin/bash
# ============================================================
# ShopSphere — Validación de variables de entorno
#
# Uso: bash scripts/validate-env.sh
#
# Sale con código 0 si todo está correcto.
# Sale con código 1 si hay alguna variable faltante o inválida.
#
# Llamado automáticamente por setup.sh antes de levantar
# los servicios con docker-compose.
# ============================================================

set -euo pipefail

# ── Colores ──────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }

# ── Cargar .env si existe ─────────────────────────────────────
ENV_FILE="${1:-.env}"

if [ ! -f "$ENV_FILE" ]; then
  log_error "Archivo '$ENV_FILE' no encontrado."
  log_error "Crea uno copiando .env.example:"
  log_error "  cp .env.example .env"
  exit 1
fi

# Exportar variables del .env (ignora comentarios y líneas vacías)
set -o allexport
# shellcheck source=/dev/null
source "$ENV_FILE"
set +o allexport

ERRORS=0

# ── Helper: variable requerida ────────────────────────────────
require_var() {
  local var_name="$1"
  local value="${!var_name:-}"
  if [ -z "$value" ]; then
    log_error "Variable requerida no definida: ${var_name}"
    ERRORS=$((ERRORS + 1))
    return 1
  fi
  return 0
}

echo ""
echo "============================================================"
echo "  ShopSphere — Validando variables de entorno"
echo "============================================================"
echo ""

# ── 1. JWT_SECRET: mínimo 64 caracteres ──────────────────────
echo "Verificando JWT_SECRET..."
JWT_SECRET_VAL="${JWT_SECRET:-}"
if [ -z "$JWT_SECRET_VAL" ]; then
  log_error "JWT_SECRET no está definido."
  log_error "Genera uno con: openssl rand -hex 64"
  ERRORS=$((ERRORS + 1))
else
  JWT_LEN=${#JWT_SECRET_VAL}
  if [ "$JWT_LEN" -lt 64 ]; then
    log_error "JWT_SECRET tiene ${JWT_LEN} caracteres. Mínimo requerido: 64."
    log_error "Genera uno más seguro con: openssl rand -hex 64"
    ERRORS=$((ERRORS + 1))
  else
    log_ok "JWT_SECRET definido (${JWT_LEN} caracteres)."
  fi
fi

# ── 2. DATABASE_URL: debe comenzar con postgresql:// ─────────
echo "Verificando DATABASE_URL..."
DATABASE_URL_VAL="${DATABASE_URL:-}"
if [ -z "$DATABASE_URL_VAL" ]; then
  log_error "DATABASE_URL no está definida."
  log_error "Formato esperado: postgresql://usuario:password@host:5432/dbname"
  ERRORS=$((ERRORS + 1))
else
  if [[ "$DATABASE_URL_VAL" != postgresql://* ]] && [[ "$DATABASE_URL_VAL" != postgres://* ]]; then
    log_error "DATABASE_URL no tiene formato válido."
    log_error "  Actual:   ${DATABASE_URL_VAL}"
    log_error "  Esperado: postgresql://usuario:password@host:5432/dbname"
    ERRORS=$((ERRORS + 1))
  else
    # Enmascarar la contraseña para el log
    MASKED=$(echo "$DATABASE_URL_VAL" | sed 's/:[^:@]*@/:*****@/')
    log_ok "DATABASE_URL definida: ${MASKED}"
  fi
fi

# ── 3. BCRYPT_ROUNDS: debe ser >= 10 ─────────────────────────
echo "Verificando BCRYPT_ROUNDS..."
BCRYPT_ROUNDS_VAL="${BCRYPT_ROUNDS:-}"
if [ -z "$BCRYPT_ROUNDS_VAL" ]; then
  log_error "BCRYPT_ROUNDS no está definido."
  log_error "Valor mínimo requerido: 10. Recomendado para producción: 12."
  ERRORS=$((ERRORS + 1))
else
  # Verificar que es un número entero
  if ! [[ "$BCRYPT_ROUNDS_VAL" =~ ^[0-9]+$ ]]; then
    log_error "BCRYPT_ROUNDS debe ser un número entero. Valor actual: '${BCRYPT_ROUNDS_VAL}'"
    ERRORS=$((ERRORS + 1))
  elif [ "$BCRYPT_ROUNDS_VAL" -lt 10 ]; then
    log_error "BCRYPT_ROUNDS=${BCRYPT_ROUNDS_VAL} es inseguro. Mínimo requerido: 10."
    log_error "Valores bajos de bcrypt son vulnerables a ataques de fuerza bruta."
    ERRORS=$((ERRORS + 1))
  else
    log_ok "BCRYPT_ROUNDS=${BCRYPT_ROUNDS_VAL}."
    if [ "$BCRYPT_ROUNDS_VAL" -lt 12 ]; then
      log_warn "BCRYPT_ROUNDS=${BCRYPT_ROUNDS_VAL} es funcional pero se recomienda 12 para producción."
    fi
  fi
fi

# ── 4. PLAYGROUND_QUERY_TIMEOUT_MS: debe ser <= 10000 ────────
echo "Verificando PLAYGROUND_QUERY_TIMEOUT_MS..."
TIMEOUT_VAL="${PLAYGROUND_QUERY_TIMEOUT_MS:-}"
if [ -z "$TIMEOUT_VAL" ]; then
  log_error "PLAYGROUND_QUERY_TIMEOUT_MS no está definido."
  log_error "Valor recomendado: 5000 (5 segundos). Máximo permitido: 10000."
  ERRORS=$((ERRORS + 1))
else
  if ! [[ "$TIMEOUT_VAL" =~ ^[0-9]+$ ]]; then
    log_error "PLAYGROUND_QUERY_TIMEOUT_MS debe ser un número entero. Valor actual: '${TIMEOUT_VAL}'"
    ERRORS=$((ERRORS + 1))
  elif [ "$TIMEOUT_VAL" -gt 10000 ]; then
    log_error "PLAYGROUND_QUERY_TIMEOUT_MS=${TIMEOUT_VAL}ms excede el máximo permitido de 10000ms."
    log_error "Un timeout tan alto permite que queries lentas saturen el Worker pool."
    ERRORS=$((ERRORS + 1))
  elif [ "$TIMEOUT_VAL" -lt 1000 ]; then
    log_warn "PLAYGROUND_QUERY_TIMEOUT_MS=${TIMEOUT_VAL}ms es muy bajo. Puede rechazar queries legítimas."
    log_ok "PLAYGROUND_QUERY_TIMEOUT_MS=${TIMEOUT_VAL}ms (advertencia: valor muy bajo)."
  else
    log_ok "PLAYGROUND_QUERY_TIMEOUT_MS=${TIMEOUT_VAL}ms."
  fi
fi

# ── 5. Variables adicionales requeridas ───────────────────────
echo "Verificando variables adicionales..."

require_var "POSTGRES_DB"       || true
require_var "POSTGRES_USER"     || true
require_var "POSTGRES_PASSWORD" || true
require_var "REDIS_URL"         || true

if [ "${POSTGRES_DB:-}" ]; then   log_ok "POSTGRES_DB=${POSTGRES_DB}"; fi
if [ "${POSTGRES_USER:-}" ]; then log_ok "POSTGRES_USER=${POSTGRES_USER}"; fi
if [ "${POSTGRES_PASSWORD:-}" ]; then
  PASS_LEN=${#POSTGRES_PASSWORD}
  log_ok "POSTGRES_PASSWORD definido (${PASS_LEN} caracteres)."
  if [ "$PASS_LEN" -lt 8 ]; then
    log_warn "POSTGRES_PASSWORD tiene menos de 8 caracteres. Considera una contraseña más segura."
  fi
fi
if [ "${REDIS_URL:-}" ]; then log_ok "REDIS_URL=${REDIS_URL}"; fi

# ── SESSION_COOKIE_SECRET: mínimo 32 caracteres ──────────────
echo "Verificando SESSION_COOKIE_SECRET..."
SESSION_SECRET_VAL="${SESSION_COOKIE_SECRET:-}"
if [ -z "$SESSION_SECRET_VAL" ]; then
  log_warn "SESSION_COOKIE_SECRET no está definido. Requerido si se usan cookies de sesión."
  log_warn "Genera uno con: openssl rand -hex 32"
else
  SESSION_LEN=${#SESSION_SECRET_VAL}
  if [ "$SESSION_LEN" -lt 32 ]; then
    log_error "SESSION_COOKIE_SECRET tiene ${SESSION_LEN} caracteres. Mínimo recomendado: 32."
    ERRORS=$((ERRORS + 1))
  else
    log_ok "SESSION_COOKIE_SECRET definido (${SESSION_LEN} caracteres)."
  fi
fi

# ── Resumen final ─────────────────────────────────────────────
echo ""
echo "============================================================"

if [ "$ERRORS" -gt 0 ]; then
  echo -e "${RED}  Validación FALLIDA — ${ERRORS} error(es) encontrado(s).${NC}" >&2
  echo -e "${RED}  Corrige los errores en tu archivo .env antes de continuar.${NC}" >&2
  echo "============================================================"
  echo ""
  exit 1
else
  echo -e "${GREEN}  Validación OK — Todas las variables están correctamente configuradas.${NC}"
  echo "============================================================"
  echo ""
  exit 0
fi
