---
name: security-controls-baseline
description: Security controls hardened in the ShopSphere backend and CI, and the conventions they follow — check these before re-auditing.
metadata:
  type: project
---

Security hardening pass completed 2026-06-10 across CI, Fastify app, playground, and Redis. Controls now in place:

- **CORS** (`backend/src/app.ts`): fail-closed. Reads `ALLOWED_ORIGINS` (comma list) with `CORS_ORIGIN` as single-origin fallback. Production with no allowlist => `origin: false` (denies all). Dev/test with no allowlist => `true`.
- **Swagger UI** (`app.ts`): gated behind `ENABLE_SWAGGER=true`, OFF by default. The OpenAPI spec (`fastifySwagger`) is still always registered; only the `/docs` UI (`fastifySwaggerUi`) is gated.
- **trustProxy** (`app.ts`): only enabled when `TRUST_PROXY=true`. Rate-limit `keyGenerator` uses `request.ip` (respects trustProxy) — does NOT read raw `x-forwarded-for`.
- **LOG_LEVEL** (`app.ts`): in production only `info|warn|error` allowed; verbose levels override to `info` with a console.warn.
- **Redis** (`backend/src/shared/cache/redis.ts`): reads `REDIS_PASSWORD`; warns at startup if unset and `NODE_ENV !== development` and URL has no inline creds.
- **Playground query size** (`playground.service.ts`): rejects queries > 4096 bytes (UTF-8) with `ValidationError` code `QUERY_TOO_LARGE` (400), checked before rate limit / worker pool.
- **Worker pool backpressure** (`worker-pool.ts`): `maxQueue = poolSize * 10`. Over-limit throws `QueueFullError`; service maps it to `ServiceUnavailableError` (503, code `PLAYGROUND_AT_CAPACITY`).
- **Error classes** (`shared/errors/index.ts`): added `ServiceUnavailableError` (503).

**Why:** prioritized hardening request — fail-closed defaults, DoS backpressure, secret hygiene.

**How to apply:** Before flagging any of the above as a finding in a future audit, confirm they're still wired (grep the flag/class names). The auth module's `x-forwarded-for` read in `auth.routes.ts` is intentional test-only scaffolding gated by `NODE_ENV==='test'`, not a prod vector.

**CI** (`.github/workflows/ci.yml`): CI secrets moved to GitHub Secrets — `CI_POSTGRES_PASSWORD`, `CI_JWT_SECRET`, `CI_SESSION_COOKIE_SECRET` (must be configured in repo Settings → Secrets). Jobs added: `audit-dependencies` (npm audit --audit-level=high for backend+frontend), `codeql` (JS/TS), `docker-image-scan` (Trivy: reports HIGH+CRITICAL, fails only on CRITICAL).

## Second hardening pass — 2026-06-10 (full audit)

- **IDOR fixed (was CRITICAL)** (`diagnostic.service.ts` / `diagnostic.schemas.ts` / `diagnostic.routes.ts`): `POST /diagnostic/submit` is public and previously accepted `user_id` in the body, then called `saveResult(user_id, ...)` — letting anyone mutate any user's level/XP/certificates by UUID. Removed `user_id` from schema + route + service; submit now never persists. Persistence only via authenticated `POST /diagnostic/save-result` (uses `req.user.sub`). Do NOT reintroduce client-supplied `user_id` on any public endpoint.
- **Security headers** (`app.ts`): added an `onSend` hook setting `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Cross-Origin-Resource-Policy: same-site`, restrictive CSP (`default-src 'none'`...), `Permissions-Policy`, HSTS (prod only), and `removeHeader('X-Powered-By')`. The hook SKIPS the `/docs` prefix so `@fastify/swagger-ui`'s own `staticCSP` is not clobbered. No new dependency (helmet) was added — deliberate, to keep the diff minimal.
- **Certificate UID CSPRNG** (`certificates.service.ts`): `generateCertificateUid` was using `Math.random()` despite a comment claiming CSPRNG. Now uses `crypto.randomInt(chars.length)`.
- **Worker memory DoS** (`playground/worker.ts`): replaced `stmt.all()` (materialized every row before truncating) with `stmt.iterate()` + a hard scan cap (`MAX_SCAN_ROWS = 50_000`, response still capped at 1000 rows). Bounds worker memory against massive CROSS JOINs that could OOM before the 5s timeout fires. `row_count` now reports rows scanned up to the cap.

**Sandbox note:** the playground worker opens SQLite `readonly:true` + `pragma query_only=ON`, rejects non-readonly statements via `stmt.readonly === false`, and better-sqlite3 disables extension loading and multi-statement prepare by default — so ATTACH/load_extension/readfile/stacked-queries are not reachable. Escape risk is low; the real risk was memory/CPU DoS (now bounded). `API_INTERNAL_SECRET` exists in `.env` but is currently unused in source (dormant, not a vuln).
