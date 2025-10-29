# Operaciones y Testing – 2025-10-28

## Objetivo
- Acceder a la base de datos (Docker + pgAdmin/HeidiSQL).
- Migrar y sembrar datos con Prisma.
- Habilitar creación de proveedores (permisos).
- Ejecutar la suite de tests del backend y relevar estado.

## Entorno
- Proyecto: `backoffice-buys-softland`
- Orquestador: `docker compose`
- Servicios relevantes: `db` (PostgreSQL), `backend`, `pgadmin` (perfil `db-tools`)
- Variables ejemplo (`.env.example`):
  - `POSTGRES_USER=appuser`
  - `POSTGRES_PASSWORD=apppassword`
  - `POSTGRES_DB=backoffice_db`
  - `POSTGRES_PORT=5432`
  - `DATABASE_URL=postgres://appuser:apppassword@db:5432/backoffice_db`
  - `PGADMIN_DEFAULT_EMAIL=admin@example.com`
  - `PGADMIN_DEFAULT_PASSWORD=admin123`
  - `PGADMIN_PORT=5050`

## Procedimiento realizado

### 1) Levantar contenedores
```powershell
# En la raíz del repo
docker compose up -d db backend
# opcional: incluir pgadmin
# docker compose --profile db-tools up -d pgadmin
```

### 2) Migraciones + seed (Prisma)
```powershell
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run prisma:seed
```
- Esquema Prisma: `backend/prisma/schema.prisma`
- Seed: `backend/prisma/seed.js`

### 3) Ajuste de permisos (creación de proveedor)
- Cambio aplicado en `backend/prisma/seed.js`:
  - Se agregó `supplier.create` al rol `Comprador`.
  - Se añadió `ensureRolePermissions()` para crear vínculos rol-permiso faltantes aunque el rol ya exista.
- Reaplicado seed:
```powershell
docker compose exec backend npm run prisma:seed
```

### 4) Verificaciones rápidas de DB
```powershell
# Listado de tablas desde host (ejecutar dentro del contenedor DB si se desea)
# docker exec -it bos_db psql -U appuser -d backoffice_db
# > SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1;
```

### 5) Testing del backend (Vitest)
```powershell
# Suite completa
docker compose exec backend npm test --silent

# Test de permisos
docker compose exec backend npx vitest run test/role-permissions.spec.js --silent
```

## Resultados de testing
- Suite completa: 11 archivos, 26 tests.
  - 21 passed, 3 failed, 2 skipped.
- Fails actuales:
  1) `test/app.spec.js` → `GET /docs.json` no refleja `Host` → devuelve `http://localhost:4000` en lugar de `http://example.com`.
  2) `test/smoke.spec.js` → `GET /api/config` no devuelve propiedad `app`.
  3) `tests/attachments.spec.js` → Mensaje de error genérico ("Error"); el test espera texto que coincida con `/no permitido|not permitted|Tipo/i` al subir tipo no permitido.

## Cómo reproducir creación de proveedor (API)
```http
POST http://localhost:4000/api/suppliers
Authorization: Bearer <token-de-usuario-con-rol-Comprador>
Content-Type: application/json

{
  "name": "Proveedor Demo SA"
}
```
- Respuesta esperada: `201 Created` con el proveedor.
- Middleware de permisos: `backend/src/middlewares/auth.js`.
- Rutas: `backend/src/routes/suppliers.routes.js` (usa `supplier.create`).

## Troubleshooting
- Si pgAdmin no permite acceder: usar `PGADMIN_DEFAULT_*` del `.env` (esto es distinto a credenciales de Postgres).
- Si no hay tablas: ejecutar migraciones/seed (paso 2).
- Si `Comprador` recibe 403 al crear proveedor: volver a correr seed tras el cambio aplicado.

## Pendientes propuestos (para cerrar la suite al 100%)
- `docs.json`: en `backend/src/docs/openapi.js` y su endpoint en `server.js`, construir `servers` usando `req.get('host')` o `PUBLIC_BASE_URL`.
- `GET /api/config`: exponer `{ app: { name, version }, ... }` desde `backend/src/server.js`/controlador de config.
- Adjuntos: devolver 400/415 con mensaje más descriptivo al tipo no permitido para pasar el regex del test.

## Comandos de referencia
```powershell
# Levantar servicios
docker compose up -d db backend

# Migraciones + seed
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run prisma:seed

# Tests
docker compose exec backend npm test --silent
```
