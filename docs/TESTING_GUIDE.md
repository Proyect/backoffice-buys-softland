# Testing Guide

## Overview
- Test runner: Vitest
- HTTP testing: Supertest (against in-memory Express app from `backend/src/server.js`)
- Setup: `backend/vitest.config.js` with `backend/test/setup.js`

## Types of tests
- Unit-style tests (fast): mock/stub DB or target pure functions.
- Integration tests (recommended): use real Postgres DB with Prisma migrations + seed.

## Pre-requisites
- Database available (Docker DB service or local Postgres).
- Migrations applied and seed executed to create admin user, roles, permissions, and baseline approval policy.

## Commands
```bash
# From backend/
# 1) Ensure DB is migrated and seeded
npm run prisma:migrate:deploy
npm run prisma:seed

# 2) Run full test suite
npm test

# Or run with setup included (integration)
npm run test:integration

# Watch mode
npm run test:watch

# Filter by name
npm test -- -t "approval"
```

## Using Docker
```bash
# Start DB + API
docker compose up -d db backend
# Run tests inside backend container
docker compose exec backend npm run test:integration
```

## Using local Postgres
- Define a dedicated test DB and export `DATABASE_URL_TEST`.
- `backend/test/setup.js` will override `DATABASE_URL` during tests if `DATABASE_URL_TEST` is present.

Windows PowerShell example:
```powershell
$env:DATABASE_URL_TEST = "postgres://user:pass@localhost:5432/backoffice_db_test"
```
Then migrate/seed against that URL:
```bash
cd backend
DATABASE_URL=$DATABASE_URL_TEST npm run prisma:migrate:deploy
DATABASE_URL=$DATABASE_URL_TEST npm run prisma:seed
npm test
```

## DB Reset
- To fully reset the DB:
```bash
cd backend
npm run db:reset  # migrate reset --force + seed
```

## Test directories and discovery
- Vitest detects `**/*.spec.js` by default.
- Tests live in:
  - `backend/test/` (main suite)
  - `backend/tests/` (additional suite, e.g., `po-approval.spec.js`)

## Tips
- Seed user: `admin@local.test` / `Admin1234!`.
- Avoid hardcoding ports in tests; use the Express app from `server.js` and Supertest.
- For approval flow, verify pending step order and expected 400/403 codes on invalid actions.
- Keep tests idempotent by creating fresh suppliers/POs per test.
