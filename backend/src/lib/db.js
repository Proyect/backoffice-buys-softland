import { Pool } from 'pg';
import { env } from '../config/env.js';

// Pool global usando DATABASE_URL (formato: postgres://user:pass@host:port/db)
const pool = new Pool({ connectionString: env.DATABASE_URL });

export function getPool() {
  return pool;
}

export function query(text, params) {
  return pool.query(text, params);
}

export async function checkConnection() {
  const startedAt = Date.now();
  try {
    await pool.query('SELECT 1');
    const latencyMs = Date.now() - startedAt;
    return { ok: true, latencyMs };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// Cierre ordenado en caso de terminar el proceso
process.on('SIGTERM', async () => {
  try { await pool.end(); } catch (_) {}
  process.exit(0);
});
process.on('SIGINT', async () => {
  try { await pool.end(); } catch (_) {}
  process.exit(0);
});
