import request from 'supertest'
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'

// Mock DB health so tests don't require a real database
vi.mock('../src/lib/db.js', () => ({
  checkConnection: vi.fn(async () => ({ ok: true, latencyMs: 5 })),
  getPool: vi.fn(),
  query: vi.fn(),
}))

import { app } from '../src/server.js'

describe('App basic endpoints', () => {
  it('GET /health returns ok and expected fields', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('status', 'ok')
    expect(res.body).toHaveProperty('service')
    expect(res.body).toHaveProperty('version')
    expect(res.body).toHaveProperty('uptime')
    expect(res.body).toHaveProperty('db')
    expect(res.body.db).toHaveProperty('status')
  })

  it('GET /docs.json returns dynamic servers using Host header', async () => {
    const res = await request(app)
      .get('/docs.json')
      .set('Host', 'example.com')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('openapi')
    expect(res.body).toHaveProperty('servers')
    expect(res.body.servers?.[0]?.url).toBe('http://example.com')
  })
})
