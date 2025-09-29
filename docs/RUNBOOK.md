# Operations Runbook

## Services
- Database: PostgreSQL (`docker-compose` service `db`).
- Backend API: Node/Express (`backend` service).
- Frontend: Vite dev server (`frontend` service, optional in Docker profile `all-in-docker`).
- pgAdmin: optional (`pgadmin` profile `db-tools`).

## Start / Stop
```bash
# Start DB + API
docker compose up -d db backend

# Start frontend (optional)
docker compose --profile all-in-docker up -d frontend

# Stop all
docker compose down
```

## Health & Status
- Backend health: `GET http://localhost:${BACKEND_PORT}/health` (default 4000)
  - Shows `status`, `service`, `version`, `uptime`, and DB status.
- OpenAPI UI: `http://localhost:${BACKEND_PORT}/docs`
- Frontend: `http://localhost:${FRONTEND_PORT}` (default 5173)
- Logs:
```bash
docker compose logs -f backend
docker compose logs -f db
```

## Environment
- Root `.env` (copy from `.env.example`) provides:
  - Database: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`, `DATABASE_URL`
  - Backend: `BACKEND_PORT`, `ALLOWED_ORIGINS`, `JWT_SECRET`, TTLs, `PUBLIC_BASE_URL`
  - Frontend: `FRONTEND_PORT`, `VITE_API_URL`

## Database Ops
```bash
# Apply migrations & seed (inside backend project)
cd backend
npm run prisma:migrate:deploy
npm run prisma:seed

# Full reset (danger: destructive)
npm run db:reset
```
- Seed creates admin user `admin@local.test` / `Admin1234!`, roles/permissions, and baseline 2-step approval policy.

## Common Operations
- Login (admin): POST `/auth/login` with `{ email, password }`.
- Approvals: submit PO, list steps, approve/reject, cancel via `/api/po/*` endpoints.
- Suppliers: CRUD via `/api/suppliers`.

## Troubleshooting
- Ports in use:
  - Change `POSTGRES_PORT` or `BACKEND_PORT` in `.env` and restart.
- Backend cannot reach DB in Docker:
  - Ensure `DATABASE_URL` host is `db`, not `localhost`.
  - Wait for DB health to be `healthy` before starting backend.
- CORS errors:
  - Set `ALLOWED_ORIGINS` to include the frontend origin (e.g. `http://localhost:5173`).
- Auth failures (401):
  - Confirm `JWT_SECRET` is set and the same across environments.
  - Check token TTLs (`ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`).

## Backups & Data Safety (recommendations)
- Use volume `db_data` (already configured) for persistence.
- For backups, snapshot the volume or run `pg_dump` from a sidecar/host.

## Security Hardening (production)
- Rotate `JWT_SECRET`, use strong values.
- Restrict CORS, rate limits, and expose API via reverse proxy (TLS).
- Move file attachments to object storage (S3/GCS) with signed URLs.

## Monitoring (suggested)
- Add request ID in logs, centralized log aggregation.
- Export app metrics to Prometheus and dashboards in Grafana.
