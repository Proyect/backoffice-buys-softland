import { env } from '../config/env.js';

export async function getConfig(req, res) {
  res.json({ api: env.APP_NAME, version: env.APP_VERSION });
}
