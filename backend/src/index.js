import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes/index.js';
import { httpLogger } from './middlewares/logger.js';
import { notFound, errorHandler } from './middlewares/error-handler.js';
import { env, getAllowedOrigins } from './config/env.js';

// Cargar variables de entorno desde .env (útil en desarrollo/CLI). En Docker ya vienen inyectadas.
dotenv.config();

const app = express();

// Logging HTTP (pino)
app.use(httpLogger);

// CORS por orígenes permitidos
const allowed = new Set(getAllowedOrigins());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // requests como curl o same-origin
    if (allowed.size === 0 || allowed.has(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Parsing JSON
app.use(express.json());

// Rutas
app.use(routes);

// 404 y errores
app.use(notFound);
app.use(errorHandler);

// Arranque
const PORT = env.PORT; // puerto interno del contenedor
app.listen(PORT, () => {
  // El logger HTTP cubre requests; aquí un log simple de arranque
  // eslint-disable-next-line no-console
  console.log(`Backend listening on port ${PORT}`);
});
