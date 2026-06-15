# ============================================================
# ShopSphere Frontend — Dockerfile multistage
# Next.js 15 en Node.js 22 Alpine
#
# Stages:
#   base   — imagen común con dependencias de producción
#   dev    — next dev con hot-reload (usado en docker-compose)
#   build  — next build (standalone output)
#   prod   — imagen mínima con standalone output de Next.js
# ============================================================

# ── Stage: base ─────────────────────────────────────────────
# Tag fijo para reproducibilidad: actualizar deliberadamente, nunca con :latest
FROM node:22.15-alpine3.21 AS base

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json* ./

# ── Stage: dev ──────────────────────────────────────────────
FROM base AS dev

# Instalar todas las dependencias (incluyendo devDependencies)
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

# ── Stage: build ────────────────────────────────────────────
FROM base AS build

RUN npm ci

COPY . .

# Variables de entorno necesarias en build time
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# Next.js standalone output — imagen de producción mínima
RUN npm run build

# ── Stage: prod ─────────────────────────────────────────────
FROM node:22.15-alpine3.21 AS prod

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Archivos estáticos y standalone de Next.js
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

# Usuario no-root por seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 && \
    chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
