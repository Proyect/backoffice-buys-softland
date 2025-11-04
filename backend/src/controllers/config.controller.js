import { env } from '../config/env.js';

export async function getConfig(req, res) {
  res.json({ app: env.APP_NAME, api: env.APP_NAME, version: env.APP_VERSION });
}
