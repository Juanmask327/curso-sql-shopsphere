#!/bin/bash
# ============================================================
# ShopSphere — Script de setup del entorno local
# Uso: bash scripts/setup.sh
#
# Lo que hace:
#   1. Verifica dependencias (Docker, Docker Compose)
#   2. Crea .env desde .env.example si no existe
#   3. Levanta los servicios con docker-compose up -d
#   4. Espera a que PostgreSQL y Redis estén saludables
#   5. Imprime las URLs de acceso
# ============================================================

set -e  # salir inmediatamente si cualquier comando falla

# ── Colores ──────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'  # No Color

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC}   $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1" >&2; }

# ── Verificar que corremos desde la raíz del proyecto ────────
if [ ! -f "docker-compose.yml" ]; then
  log_error "Ejecuta este script desde la raíz del proyecto."
  log_error "Ejemplo: cd 'Curso SQL' && bash scripts/setup.sh"
  exit 1
fi

echo ""
echo "============================================================"
echo "  ShopSphere — Setup del entorno local"
echo "============================================================"
echo ""

# ── 1. Verificar Docker ──────────────────────────────────────
log_info "Verificando Docker..."
if ! command -v docker &> /dev/null; then
  log_error "Docker no está instalado o no está en el PATH."
  log_error "Descárgalo desde: https://www.docker.com/products/docker-desktop/"
  exit 1
fi

DOCKER_VERSION=$(docker --version 2>&1)
log_success "Docker encontrado: ${DOCKER_VERSION}"

# Verificar que el daemon de Docker está corriendo
if ! docker info &> /dev/null; then
  log_error "El daemon de Docker no está corriendo."
  log_error "Inicia Docker Desktop y vuelve a ejecutar este script."
  exit 1
fi
log_success "Docker daemon activo."

# ── 2. Verificar Docker Compose ──────────────────────────────
log_info "Verificando Docker Compose..."
if docker compose version &> /dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
  COMPOSE_VERSION=$(docker compose version 2>&1)
  log_success "Docker Compose (plugin) encontrado: ${COMPOSE_VERSION}"
elif command -v docker-compose &> /dev/null; then
  COMPOSE_CMD="docker-compose"
  COMPOSE_VERSION=$(docker-compose --version 2>&1)
  log_success "docker-compose encontrado: ${COMPOSE_VERSION}"
else
  log_error "Docker Compose no está disponible."
  log_error "Con Docker Desktop moderno ya viene incluido."
  log_error "O instálalo desde: https://docs.docker.com/compose/install/"
  exit 1
fi

# ── 3. Crear .env desde .env.example ────────────────────────
log_info "Verificando archivo .env..."
if [ ! -f ".env" ]; then
  cp .env.example .env
  log_success "Creado .env desde .env.example."
  echo ""
  log_warn "ACCION REQUERIDA: Abre .env y ajusta los valores antes de continuar."
  log_warn "Variables críticas a revisar:"
  log_warn "  - POSTGRES_PASSWORD"
  log_warn "  - JWT_SECRET        (genera con: openssl rand -hex 64)"
  log_warn "  - SESSION_COOKIE_SECRET (genera con: openssl rand -hex 32)"
  echo ""
  read -p "Presiona ENTER cuando hayas editado .env para continuar..."
else
  log_success ".env ya existe."
fi

# Verificar que JWT_SECRET no está vacío (error común)
if [ -f ".env" ]; then
  JWT_SECRET_VAL=$(grep '^JWT_SECRET=' .env | cut -d'=' -f2)
  if [ -z "$JWT_SECRET_VAL" ]; then
    log_error "JWT_SECRET está vacío en .env."
    log_error "Genera uno con: openssl rand -hex 64"
    log_error "Y agrégalo a .env: JWT_SECRET=<valor generado>"
    exit 1
  fi
fi

# ── 4. Validar variables de entorno ─────────────────────────
log_info "Validando variables de entorno..."
if bash scripts/validate-env.sh; then
  log_success "Variables de entorno validadas."
else
  log_error "Falló la validación de variables. Corrige los errores en .env antes de continuar."
  exit 1
fi

# ── 5. Levantar servicios ────────────────────────────────────
log_info "Levantando servicios con Docker Compose..."
$COMPOSE_CMD up -d --build
log_success "Servicios iniciados."

# ── 6. Esperar a que PostgreSQL esté healthy ─────────────────
log_info "Esperando a que PostgreSQL esté listo (timeout: 60s)..."
TIMEOUT=60
ELAPSED=0
INTERVAL=3

while [ $ELAPSED -lt $TIMEOUT ]; do
  if $COMPOSE_CMD exec -T db pg_isready -U "${POSTGRES_USER:-shopsphere_user}" -d "${POSTGRES_DB:-shopsphere}" &> /dev/null; then
    log_success "PostgreSQL está listo."
    break
  fi
  echo -n "."
  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
  log_error "PostgreSQL no respondió en ${TIMEOUT}s."
  log_error "Revisa los logs con: $COMPOSE_CMD logs db"
  exit 1
fi

# ── 7. Esperar a que Redis esté healthy ──────────────────────
log_info "Esperando a que Redis esté listo (timeout: 30s)..."
TIMEOUT=30
ELAPSED=0

while [ $ELAPSED -lt $TIMEOUT ]; do
  if $COMPOSE_CMD exec -T redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
    log_success "Redis está listo."
    break
  fi
  echo -n "."
  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
  log_error "Redis no respondió en ${TIMEOUT}s."
  log_error "Revisa los logs con: $COMPOSE_CMD logs redis"
  exit 1
fi

# ── 8. Resumen de acceso ─────────────────────────────────────
echo ""
echo "============================================================"
echo -e "  ${GREEN}ShopSphere esta corriendo:${NC}"
echo "============================================================"
echo ""
echo -e "  ${GREEN}Frontend:${NC}   http://localhost:3000"
echo -e "  ${GREEN}Backend:${NC}    http://localhost:3001/health"
echo -e "  ${GREEN}DB Admin:${NC}   http://localhost:8080"
echo -e "  ${GREEN}PostgreSQL:${NC} postgresql://localhost:5432/shopsphere"
echo ""
echo "  Comandos utiles:"
echo "    Ver logs:      $COMPOSE_CMD logs -f"
echo "    Detener:       $COMPOSE_CMD down"
echo "    Reset total:   $COMPOSE_CMD down -v"
echo "    Reconstruir:   $COMPOSE_CMD up -d --build"
echo "============================================================"
echo ""
