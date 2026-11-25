# ============================================================
# ShopSphere Backend — Dockerfile multistage
# Node.js 22 Alpine
#
# Stages:
#   base   — imagen común con dependencias de producción
#   dev    — hot-reload con tsx watch (usado en docker-compose)
#   build  — compila TypeScript a JS
#   prod   — imagen mínima para producción
# ============================================================

# ── Stage: base ─────────────────────────────────────────────
# Tag fijo para reproducibilidad: actualizar deliberadamente, nunca con :latest
FROM node:22.23.4-alpine3.24 AS base

WORKDIR /app

# Instalar dependencias del sistema necesarias para módulos nativos
# python3 + make + g++ son requeridos por better-sqlite3 (node-gyp) en Alpine/musl
RUN apk add --no-cache libc6-compat python3 make g++

# Copiar manifiestos de dependencias primero (aprovecha cache de capas)
COPY package.json package-lock.json* ./

# ── Stage: dev ──────────────────────────────────────────────
FROM base AS dev

# Instalar TODAS las dependencias (incluyendo devDependencies para tsx, tsc, etc.)
RUN npm ci

COPY . .

# tsx watch — hot-reload sin compilar
CMD ["npm", "run", "dev"]

# ── Stage: build ────────────────────────────────────────────
FROM base AS build

# Instalar todas las dependencias para poder compilar
RUN npm ci

COPY . .

# Compilar TypeScript → JavaScript
RUN npm run build

# ── Stage: prod ─────────────────────────────────────────────
FROM node:22.23.4-alpine3.24 AS prod

WORKDIR /app

# apk upgrade: aplica los parches de seguridad del sistema (p. ej. OpenSSL).
# python3/make/g++ solo hacen falta para compilar better-sqlite3 durante
# `npm ci`; se instalan como paquete virtual y se borran después.
RUN apk upgrade --no-cache && apk add --no-cache libc6-compat

# Solo dependencias de producción
COPY package.json package-lock.json* ./
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
    && npm ci --omit=dev \
    && npm cache clean --force \
    && apk del .build-deps

# El runtime solo usa `node`: se eliminan npm, yarn y corepack de la imagen final.
# Traen dependencias propias (p. ej. tar) con CVEs críticos que Trivy reporta
# aunque la app no las use.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
      /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
      /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-*

# Copiar build compilado
COPY --from=build /app/dist ./dist

# El dataset del playground (data/dataset.db) NO va dentro de la imagen: se monta
# como volumen (ver docker-compose.yml: ./data:/app/data) o se indica su ruta con
# PLAYGROUND_DATASET_PATH. Si falta, el backend arranca con el playground deshabilitado.

# Usuario no-root por seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3001

# Health check interno al contenedor
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "dist/server.js"]
