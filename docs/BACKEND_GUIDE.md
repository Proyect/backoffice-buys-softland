# Backend Guide

## Overview
- Stack: Node.js + Express, Prisma (PostgreSQL), Vitest + Supertest.
- Entry points:
  - `backend/src/index.js`: starts HTTP server on `env.PORT` (default 4000).
  - `backend/src/server.js`: Express app, middlewares, routes, Swagger UI.
- Configuration: `backend/src/config/env.js` (validated with `envalid`).
- ORM: `backend/src/lib/prisma.js` (single PrismaClient instance).
- Auth/Permissions: `backend/src/lib/auth.js`, `backend/src/middlewares/auth.js`.

## Project Structure
```
backend/
  src/
    config/env.js
    controllers/
      auth.controller.js
      config.controller.js
      health.controller.js
      po.controller.js
      suppliers.controller.js
    docs/openapi.js
    lib/
      auth.js
      prisma.js
      db.js
    middlewares/
      auth.js
      error-handler.js
      logger.js
    routes/
      index.js
      po.routes.js
      suppliers.routes.js
    server.js
    index.js
  prisma/
    schema.prisma
    seed.js
  vitest.config.js
```

## Environment Variables
Configured at repo root `.env` (template in `/.env.example`). Validated in `env.js`.
- Database: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`, `DATABASE_URL`.
- Backend: `BACKEND_PORT`, `ALLOWED_ORIGINS`, `JWT_SECRET`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`, `PUBLIC_BASE_URL`.

## Running (Docker)
```bash
# From repo root
docker compose up -d db backend
# Follow logs
docker compose logs -f backend
```

## Running (Local)
```powershell
# Windows PowerShell example for test/dev database
$env:DATABASE_URL_TEST = "postgres://user:pass@localhost:5432/backoffice_db_dev"
```
```bash
cd backend
DATABASE_URL=$DATABASE_URL_TEST npm run prisma:migrate:deploy
DATABASE_URL=$DATABASE_URL_TEST npm run prisma:seed
npm run dev
```

## Database & Prisma
- Schema: `backend/prisma/schema.prisma` (RBAC, Suppliers, PO, approval policy templates, runtime steps, logs, attachments).
- Seed: `backend/prisma/seed.js` creates permissions, roles, admin user `admin@local.test`/`Admin1234!`, and baseline 2-step policy (Comprador → Aprobador).
- Migrations:
```bash
cd backend
npm run prisma:generate
npm run prisma:migrate         # dev
npm run prisma:migrate:deploy  # CI/prod
npm run prisma:seed
npm run db:reset               # reset + seed
```

## Middlewares & Security
- `helmet()`, `cors` (origins from `ALLOWED_ORIGINS`), `express-rate-limit` (global + auth limiter), `pino-http` logging.
- `requireAuth`: verifies JWT access token and loads `req.user` + `req.permissions`.
- `requirePermission('perm.key')`: enforces RBAC on routes.

## API Routes
- `src/routes/index.js` mounts:
  - `GET /health` → `health.controller.getHealth`
  - `GET /api/config` → `config.controller.getConfig`
  - Auth: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`
  - Suppliers: `GET/POST/PUT/DELETE /api/suppliers/*` with `supplier.*` permissions
  - Purchase Orders: `GET/POST /api/po`, `POST /api/po/:id` (submit), `GET /api/po/:id/steps`, `POST /api/po/:id/steps/:order/(approve|reject)`, `POST /api/po/:id/cancel`, logs and files endpoints

## Approval Flow (PO)
- `submitPO()` selects active policy (`ApprovalPolicy` with ordered `ApprovalStepTemplate`), instantiates runtime `PurchaseApprovalStep` as PENDING.
- `approveStep()` and `rejectStep()` ensure the current pending step matches `:order` and check eligibility (permission or matching role).
- Final status transitions: APPROVED when no pending steps remain; REJECTED upon rejection.

## OpenAPI/Swagger
- `GET /docs` (UI) and `GET /docs.json` (dynamic spec built from `openapiSpec` and env).
- Adjust `PUBLIC_BASE_URL` to influence servers in the spec.

## Logging & Metrics
- Business logs in `po.controller.js` include action, PO/step IDs, user, elapsedMs.
- Extend with request IDs or Prometheus integration as needed.

## Troubleshooting
- Ports busy: adjust `POSTGRES_PORT`/`BACKEND_PORT` in `.env`.
- CORS issues: review `ALLOWED_ORIGINS`.
- DB not reachable: ensure `DATABASE_URL` uses host `db` when using Docker, not `localhost`.
- Auth 401: verify `JWT_SECRET` consistency, token TTLs.
