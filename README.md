# Backoffice Buys Softland (Docker Dev Setup)

Este repo contiene un monorepo simple con `backend` (Node + Express), `frontend` (React + Vite) y `PostgreSQL`, todo orquestado con Docker.

## Requisitos previos
- Docker Desktop actualizado.
- Puertos libres: 4000 (backend), 5173 (frontend), 5432 (Postgres), 5050 (pgAdmin opcional).

## Primeros pasos
1. Copia el archivo `.env.example` a `.env` y ajusta valores si es necesario.
2. Levanta los servicios:
   ```bash
   docker compose up -d --build
   ```
3. Accede a:
   - Frontend: http://localhost:5173
   - Backend (health): http://localhost:4000/health
   - pgAdmin (opcional): http://localhost:5050

## Variables de entorno (raíz .env)
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`
- `BACKEND_PORT` (host), `DATABASE_URL`
- `FRONTEND_PORT` (host), `VITE_API_URL`
- `PGADMIN_DEFAULT_EMAIL`, `PGADMIN_DEFAULT_PASSWORD`, `PGADMIN_PORT`

> Nota: El backend escucha internamente en el puerto 4000 (ver `backend/src/index.js`). El mapeo hacia el host se controla con `BACKEND_PORT` en `docker-compose.yml`.

## Desarrollo con hot-reload
- Volúmenes montados en `backend` y `frontend` permiten cambios en vivo con `nodemon` y Vite.
- Los `node_modules` permanecen dentro del contenedor para evitar inconsistencias en Windows.

## Flujo típico de trabajo
- `docker compose up -d --build`: construir e iniciar.
- `docker compose logs -f backend`: ver logs backend.
- `docker compose logs -f frontend`: ver logs frontend.
- `docker compose down`: detener todo.

## Notas futuras
- Integraremos Softland mediante un módulo dedicado en el backend.
- Añadiremos migraciones/ORM (Prisma/Knex) para el esquema de la base de datos.
- Añadiremos tests, lint y CI/CD.
