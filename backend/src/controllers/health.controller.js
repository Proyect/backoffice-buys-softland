import { env } from '../config/env.js';
import { checkConnection } from '../lib/db.js';

export async function getHealth(req, res) {
  // Si no hay DATABASE_URL configurada, no intentamos chequear DB
  const db = env.DATABASE_URL
    ? await checkConnection()
    : { ok: false, skipped: true, error: 'DATABASE_URL not configured' };
  res.json({
    status: 'ok',
    service: env.APP_NAME,
    version: env.APP_VERSION,
    uptime: process.uptime(),
    db: db.ok
      ? { status: 'ok', latencyMs: db.latencyMs }
      : (db.skipped ? { status: 'skipped', error: db.error } : { status: 'error', error: db.error }),
  });
}
