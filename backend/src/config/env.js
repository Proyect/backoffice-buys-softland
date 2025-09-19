import { cleanEnv, str, port, json } from 'envalid';

// Validación de variables de entorno para el backend
export const env = cleanEnv(process.env, {
  NODE_ENV:        str({ choices: ['development', 'test', 'production'], default: 'development' }),
  PORT:            port({ default: 4000 }), // Puerto interno del contenedor
  DATABASE_URL:    str({ default: '' }),
  // Coma separada. Ej: "http://localhost:5173,http://127.0.0.1:5173"
  ALLOWED_ORIGINS: str({ default: '' }),
  // Campo opcional para exponer versión/app
  APP_NAME:        str({ default: 'backoffice-buys-softland' }),
  APP_VERSION:     str({ default: '0.1.0' }),
});

export function getAllowedOrigins() {
  if (!env.ALLOWED_ORIGINS) return [];
  return env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
}
