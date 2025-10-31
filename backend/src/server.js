import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes/index.js';
import { httpLogger, setRequestIdHeader } from './middlewares/logger.js';
import { notFound, errorHandler } from './middlewares/error-handler.js';
import { env, getAllowedOrigins } from './config/env.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { openapiSpec } from './docs/openapi.js';
import compression from 'compression';

// Cargar variables de entorno desde .env (útil en desarrollo/CLI). En Docker ya vienen inyectadas.
dotenv.config();

export const app = express();

// Logging HTTP (pino)
app.use(httpLogger);
app.use(setRequestIdHeader);

// CORS por orígenes permitidos
const allowed = new Set(getAllowedOrigins());
const allowAnyInDev = allowed.size === 0 && env.NODE_ENV !== 'production';
app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (curl, same-origin) para no romper herramientas
    if (!origin) return callback(null, true);
    if (allowAnyInDev) return callback(null, true);
    if (allowed.has(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Seguridad HTTP
app.use(helmet());
app.use(compression());

// Rate limiting básico
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Rate limit más estricto para endpoints de autenticación
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // más bajo en rutas sensibles
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/auth', authLimiter);

// Parsing JSON
app.use(express.json({ limit: '1mb' }));

// Respetar X-Forwarded-* para construir URLs correctas detrás de proxies
app.set('trust proxy', 1);

// Documentación OpenAPI JSON dinámico
app.get('/docs.json', (req, res) => {
  try {
    const base = env.PUBLIC_BASE_URL && env.PUBLIC_BASE_URL.trim()
      ? env.PUBLIC_BASE_URL.trim()
      : `${req.protocol}://${req.get('host')}`;

    // Clonar y ajustar metadata sin mutar el spec importado
    const spec = {
      ...openapiSpec,
      info: {
        ...openapiSpec.info,
        title: env.APP_NAME || openapiSpec.info?.title,
        version: env.APP_VERSION || openapiSpec.info?.version,
      },
      servers: [{ url: base, description: env.NODE_ENV }],
    };

    res.set('Cache-Control', 'no-cache');
    res.json(spec);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to serve /docs.json', err);
    res.status(500).json({ error: 'Failed to build OpenAPI spec' });
  }
});

// Documentación OpenAPI/Swagger
// Cargar UI apuntando a /docs.json para mantenerlo dinámico por ambiente
app.use('/docs', swaggerUi.serve, swaggerUi.setup(null, { swaggerOptions: { url: '/docs.json' } }));

// Redirigir raíz a documentación
app.get('/', (req, res) => res.redirect('/docs'));

// Rutas
app.use(routes);

// 404 y errores
app.use(notFound);
app.use(errorHandler);
