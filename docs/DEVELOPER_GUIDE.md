# Guía de Desarrollador

## Arquitectura
- Monorepo: `backend/` (Express + Prisma), `frontend/` (React + Vite), `db` (PostgreSQL en Docker) + `pgAdmin` (opcional).
- Prisma models: RBAC (Users/Roles/Permissions), Suppliers, POs, PurchaseItems, ApprovalPolicy/Steps, PurchaseApprovalStep, ApprovalLog, Attachment.
- Semillas (seed): permisos, roles, admin y política de aprobación base (2 pasos).

## Variables de entorno (raíz .env)
- DB: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`.
- Backend: `BACKEND_PORT`, `DATABASE_URL`, `ALLOWED_ORIGINS`, `JWT_SECRET`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`, `PUBLIC_BASE_URL` (opc).
- Frontend: `FRONTEND_PORT`, `VITE_API_URL`.

## Docker Compose (desarrollo)
- Servicios: `db`, `backend`, `frontend` (perfil `all-in-docker`), `pgadmin` (perfil `db-tools`).
- Mejores prácticas:
  - `depends_on` con `condition: service_healthy` (backend espera DB).
  - `restart: unless-stopped` en servicios clave.
  - Volúmenes para hot-reload; `node_modules` dentro del contenedor.

### Comandos
```bash
# Arranque mínimo
docker compose up -d db backend

# Frontend en Docker (opcional)
docker compose --profile all-in-docker up -d frontend

# pgAdmin (opcional)
docker compose --profile db-tools up -d pgadmin

# Logs
docker compose logs -f backend
docker compose logs -f db
```

## Backend
- Express middlewares: `pino-http`, `helmet`, `cors`, `express-rate-limit`, `error-handler`.
- Env validation: `backend/src/config/env.js` con `envalid`.
- Base de datos: `backend/src/lib/prisma.js` (Prisma) y `backend/src/lib/db.js` (Pool `pg` para health/otros).
- Endpoints:
  - `/health`, `/api/config`, `/auth/*` (login/refresh/logout/me), `/api/suppliers`, `/api/po` (listar/crear), flujo de aprobación (`submit`, `steps`, `approve`, `reject`, `cancel`) y `logs`.

### Tests (Vitest + Supertest)
```bash
# Preparar DB (migraciones + seed)
docker compose exec backend npm run test:setup

# Ejecutar suite completa
docker compose exec backend npm run test

# En watch
docker compose exec backend npm run test:watch

# Filtrar por nombre
docker compose exec backend npm run test -- -t "Role-based permissions"
```

Suite incluida:
- `test/smoke.spec.js`: health, login, suppliers, flujo PO (crear/submit/steps/aprobar/logs).
- `test/permissions.spec.js`: `Consulta` sin aprobar/rechazar/submit.
- `test/role-permissions.spec.js`: `Comprador` (crear/submit, sin aprobar/rechazar) y `Aprobador` (aprobar, sin submit).
- `test/po-negative.spec.js`: order incorrecto y sin pendientes.
- `test/validation.spec.js`: validaciones de `createPO`.

## Métricas y logging
- `backend/src/middlewares/logger.js`: `pino`/`pino-http`.
- `backend/src/controllers/po.controller.js`:
  - `po.submit`: `poId`, `userId`, `elapsedMs`.
  - `po.approve`: `poId`, `stepOrder`, `userId`, `nextPendingOrder`, `elapsedMs`.
  - `po.reject` (errores): `poId`, `stepOrder`, `userId` y `error`.

## Troubleshooting
- Si `exec bos_backend` falla (“no running”), usa el nombre de servicio `backend`.
- Frontend sin backend: verifica `VITE_API_URL` y `ALLOWED_ORIGINS`.
- DB: ejecutar `npm run prisma:migrate:deploy` y `npm run prisma:seed` dentro del contenedor backend.

## Roadmap (sugerencias)
- Añadir `requestId` a logs para correlación.
- Exportar métricas a Prometheus.
- Tests de cancelación con pasos pendientes (`SKIPPED`).
- Frontend: búsqueda por texto y skeletons adicionales.

## Ejemplos cURL del flujo de aprobación

> Reemplaza `<ACCESS_TOKEN>` y `<PO_ID>` según corresponda.

### Login

```bash
curl -sS -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@local.test","password":"Admin1234!"}'
```

### Submit PO

```bash
curl -sS -X POST http://localhost:4000/api/po/<PO_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### Listar pasos

```bash
curl -sS http://localhost:4000/api/po/<PO_ID>/steps \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### Aprobar paso pendiente (order N)

```bash
curl -sS -X POST http://localhost:4000/api/po/<PO_ID>/steps/1/approve \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"comment":"Aprobado via curl"}'
```

### Rechazar paso pendiente (order N)

```bash
curl -sS -X POST http://localhost:4000/api/po/<PO_ID>/steps/1/reject \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"comment":"Rechazado via curl"}'
```

### Cancelar PO

```bash
curl -sS -X POST http://localhost:4000/api/po/<PO_ID>/cancel \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### Auditoría

```bash
curl -sS http://localhost:4000/api/po/<PO_ID>/logs \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

## Postman Collection (snippet)

Guarda esto como `postman_collection.json` e impórtalo en Postman. Ajusta el host si es necesario.

```json
{
  "info": {
    "name": "Backoffice Buys Softland",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Login",
      "request": {
        "method": "POST",
        "header": [ { "key": "Content-Type", "value": "application/json" } ],
        "url": { "raw": "http://localhost:4000/auth/login", "protocol": "http", "host": ["localhost"], "port": "4000", "path": ["auth","login"] },
        "body": { "mode": "raw", "raw": "{\n  \"email\": \"admin@local.test\",\n  \"password\": \"Admin1234!\"\n}" }
      }
    },
    {
      "name": "Submit PO",
      "request": {
        "method": "POST",
        "header": [ { "key": "Authorization", "value": "Bearer {{accessToken}}" } ],
        "url": { "raw": "http://localhost:4000/api/po/{{poId}}", "protocol": "http", "host": ["localhost"], "port": "4000", "path": ["api","po","{{poId}}"] }
      }
    },
    {
      "name": "Steps",
      "request": {
        "method": "GET",
        "header": [ { "key": "Authorization", "value": "Bearer {{accessToken}}" } ],
        "url": { "raw": "http://localhost:4000/api/po/{{poId}}/steps", "protocol": "http", "host": ["localhost"], "port": "4000", "path": ["api","po","{{poId}}","steps"] }
      }
    },
    {
      "name": "Approve Step",
      "request": {
        "method": "POST",
        "header": [ { "key": "Content-Type", "value": "application/json" }, { "key": "Authorization", "value": "Bearer {{accessToken}}" } ],
        "url": { "raw": "http://localhost:4000/api/po/{{poId}}/steps/{{order}}/approve", "protocol": "http", "host": ["localhost"], "port": "4000", "path": ["api","po","{{poId}}","steps","{{order}}","approve"] },
        "body": { "mode": "raw", "raw": "{\n  \"comment\": \"Aprobado desde Postman\"\n}" }
      }
    },
    {
      "name": "Reject Step",
      "request": {
        "method": "POST",
        "header": [ { "key": "Content-Type", "value": "application/json" }, { "key": "Authorization", "value": "Bearer {{accessToken}}" } ],
        "url": { "raw": "http://localhost:4000/api/po/{{poId}}/steps/{{order}}/reject", "protocol": "http", "host": ["localhost"], "port": "4000", "path": ["api","po","{{poId}}","steps","{{order}}","reject"] },
        "body": { "mode": "raw", "raw": "{\n  \"comment\": \"Rechazado desde Postman\"\n}" }
      }
    },
    {
      "name": "Cancel PO",
      "request": {
        "method": "POST",
        "header": [ { "key": "Authorization", "value": "Bearer {{accessToken}}" } ],
        "url": { "raw": "http://localhost:4000/api/po/{{poId}}/cancel", "protocol": "http", "host": ["localhost"], "port": "4000", "path": ["api","po","{{poId}}","cancel"] }
      }
    },
    {
      "name": "Logs",
      "request": {
        "method": "GET",
        "header": [ { "key": "Authorization", "value": "Bearer {{accessToken}}" } ],
        "url": { "raw": "http://localhost:4000/api/po/{{poId}}/logs", "protocol": "http", "host": ["localhost"], "port": "4000", "path": ["api","po","{{poId}}","logs"] }
      }
    }
  ],
  "variable": [
    { "key": "accessToken", "value": "" },
    { "key": "poId", "value": "" },
    { "key": "order", "value": "1" }
  ]
}
```
