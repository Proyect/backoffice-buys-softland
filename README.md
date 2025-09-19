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
 - `ALLOWED_ORIGINS`: Lista separada por comas de orígenes permitidos para CORS (p. ej. `http://localhost:5173`).

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

---

## Backend – estructura y CORS (implementado)

- Estructura del backend (`backend/src/`):
  - `config/env.js`: validación de variables con `envalid` y helper `getAllowedOrigins()`.
  - `middlewares/logger.js`: logger HTTP con `pino`/`pino-http`.
  - `middlewares/error-handler.js`: 404 y manejador de errores unificado.
  - `controllers/` y `routes/`: endpoints `/health` y `/api/config` organizados.

- CORS por orígenes permitidos
  - Configurar `ALLOWED_ORIGINS` en `.env` (ej: `ALLOWED_ORIGINS=http://localhost:5173`).
  - `docker-compose.yml` pasa la variable al servicio `backend`.

### Probar rápidamente

1) Asegúrate de tener `.env` actualizado (al menos `ALLOWED_ORIGINS` y `VITE_API_URL`).

2) Reconstruye y levanta contenedores:
```bash
docker compose up -d --build
```

3) Visita:
- Frontend: `http://localhost:5173` (debe mostrar el estado del backend)
- Backend health: `http://localhost:4000/health`

---

# Guía de Desarrollo (Developer Guide)

## Arquitectura general

- Monorepo con dos apps y servicios auxiliares:
  - `backend/`: API Node.js + Express.
  - `frontend/`: React + Vite.
  - `db`: PostgreSQL (contenedor) y `pgAdmin` opcional.
- Orquestado con Docker Compose para desarrollo.
- Comunicación interna por red de Docker: el backend usa `DATABASE_URL` apuntando al host `db` (no `localhost`).

## Estructura del proyecto

```
.
├─ backend/
│  ├─ Dockerfile
│  ├─ package.json
│  └─ src/
│     ├─ config/
│     │  └─ env.js           # Validación de variables (envalid)
│     ├─ controllers/
│     │  ├─ config.controller.js
│     │  └─ health.controller.js
│     ├─ lib/
│     │  └─ db.js            # Pool de pg y helpers
│     ├─ middlewares/
│     │  ├─ error-handler.js # 404 + manejador de errores
│     │  └─ logger.js        # pino + pino-http
│     ├─ routes/
│     │  └─ index.js         # Rutas /health y /api/config
│     └─ index.js            # Bootstrapping del servidor
├─ frontend/
│  ├─ Dockerfile
│  ├─ index.html
│  ├─ package.json
│  └─ src/
│     ├─ App.jsx
│     └─ main.jsx
├─ docker-compose.yml
├─ .env.example
└─ README.md
```

## Configuración de entorno

- Variables en `.env` (raíz). Las más relevantes en dev:
  - `POSTGRES_PORT`: puerto del host para exponer Postgres (ej. 5433 si 5432 está ocupado).
  - `DATABASE_URL`: `postgres://user:pass@db:5432/dbname` (nota: host `db`).
  - `BACKEND_PORT`: puerto del host para exponer el backend (map a 4000 del contenedor).
  - `FRONTEND_PORT`: puerto del host para Vite (map a 5173 del contenedor).
  - `VITE_API_URL`: URL que usa el frontend para llamar al backend (ej. `http://localhost:4000`).
  - `ALLOWED_ORIGINS`: lista de orígenes permitidos para CORS (ej. `http://localhost:5173`).

## Flujo de desarrollo local

1. Duplicar `.env.example` a `.env` y ajustar valores.
2. Arrancar con hot-reload:
   ```bash
   docker compose up -d --build
   ```
3. Ver logs:
   ```bash
   docker compose logs -f backend
   docker compose logs -f frontend
   docker compose logs -f db
   ```
4. Editar código en `backend/src/` o `frontend/src/`; los contenedores recargan automáticamente (nodemon/Vite).

## Comandos Docker útiles

- Subir y reconstruir: `docker compose up -d --build`
- Ver logs: `docker compose logs -f <service>` (backend, frontend, db)
- Detener todo: `docker compose down`
- Re-crear solo un servicio: `docker compose up -d --build backend`

## Backend – detalles técnicos

- Express con middlewares:
  - `pino-http` para logging de peticiones.
  - `cors` configurado por `ALLOWED_ORIGINS`.
  - `error-handler` unificado y 404.
- Validación de entorno: `src/config/env.js` con `envalid`.
- DB: `src/lib/db.js` crea un `pg.Pool` con `DATABASE_URL` y expone `checkConnection()` usado por `/health`.

### Endpoints actuales

- `GET /health`
  - Respuesta ejemplo:
    ```json
    {
      "status": "ok",
      "service": "backoffice-buys-softland",
      "version": "0.1.0",
      "uptime": 12.34,
      "db": { "status": "ok", "latencyMs": 3 }
    }
    ```

- `GET /api/config`
  - Respuesta ejemplo:
    ```json
    { "api": "backoffice-buys-softland", "version": "0.1.0" }
    ```

## Testing y calidad (ruta sugerida)

- Backend: Jest + Supertest (tests para `/health`).
- Frontend: Vitest + React Testing Library.
- ESLint + Prettier + EditorConfig en ambos paquetes.

## Problemas comunes (Troubleshooting)

- Puerto 5432 ocupado
  - Síntoma: `Bind for 0.0.0.0:5432 failed: port is already allocated`.
  - Solución rápida: en `.env` usa `POSTGRES_PORT=5433` y vuelve a levantar con `up -d --build`.
  - Alternativa: identificar proceso que ocupa 5432 y detenerlo.

- CORS bloquea solicitudes desde el navegador
  - Revisa `ALLOWED_ORIGINS` en `.env` (por ejemplo `http://localhost:5173`).
  - Vuelve a levantar el backend.

- El frontend no llega al backend
  - Verifica que `VITE_API_URL` apunte a `http://localhost:4000` (o el puerto configurado) y que el backend esté arriba.

## Roadmap (siguientes pasos)

- Integrar Prisma para migraciones y acceso a datos.
- Agregar healthchecks de Docker y políticas de reinicio.
- Configurar CI/CD (GitHub Actions) para lint, tests y build de imágenes.
- Dockerfiles multi-stage y `docker-compose.prod.yml` con Nginx sirviendo el build del frontend.

---

# Manual de Usuario

## Acceso a la aplicación

- Frontend: abre `http://localhost:5173` en tu navegador.
- Requisito: el backend debe estar corriendo en `http://localhost:4000` (Compose lo levanta).

## Pantalla principal

- Muestra el estado del backend (endpoint `/health`).
- Si todo está bien, verás un JSON con `status: ok` y un bloque `db` indicando el estado de la base de datos.

## Errores comunes para el usuario

- Si ves un error CORS en el navegador: solicita al administrador que agregue tu origen a `ALLOWED_ORIGINS`.
- Si la página muestra error al obtener el estado: verifica que el backend esté disponible en `http://localhost:4000/health`.

## Soporte

- Para problemas de infraestructura (puertos, Docker), sigue la sección de Troubleshooting.
- Para incidencias funcionales, comparte los pasos para reproducir y los logs de `backend`.
