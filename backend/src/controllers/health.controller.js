import { env } from '../config/env.js';
import { checkConnection } from '../lib/db.js';

export async function getHealth(req, res) {
  const db = await checkConnection();
  res.json({
    status: 'ok',
    service: env.APP_NAME,
    version: env.APP_VERSION,
    uptime: process.uptime(),
    db: db.ok ? { status: 'ok', latencyMs: db.latencyMs } : { status: 'error', error: db.error },
  });
}
