import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { app } from '../src/server.js'

// Helper to login and get bearer token
async function loginAndGetToken(email = 'admin@local.test', password = 'Admin1234!') {
  const res = await request(app)
    .post('/auth/login')
    .send({ email, password })
    .expect(200)
  expect(res.body).toHaveProperty('tokens.accessToken')
  return res.body.tokens.accessToken
}

describe('Backend smoke tests', () => {
  let token = ''

  beforeAll(async () => {
    // Health should be OK before anything
    await request(app).get('/health').expect(200)
    // Login using seeded admin user
    token = await loginAndGetToken()
    expect(typeof token).toBe('string')
  })

  it('GET /api/config returns config', async () => {
    const res = await request(app).get('/api/config').expect(200)
    expect(res.body).toHaveProperty('app')
  })

  it('Suppliers: list and create', async () => {
    // List
    const listRes = await request(app)
      .get('/api/suppliers?take=1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(listRes.body).toHaveProperty('items')

    // Create
    const name = `Test Supplier ${Date.now()}`
    const createRes = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name })
      .expect(201)
    expect(createRes.body).toHaveProperty('id')
  })

  it('PO: create, submit, steps, approve first step (if any)', async () => {
    // Ensure there is at least one supplier
    const suppliersRes = await request(app)
      .get('/api/suppliers?take=1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    const supplierId = suppliersRes.body.items[0]?.id
    expect(supplierId, 'Need at least one supplier to create PO').toBeTruthy()

    // Create PO
    const createPoRes = await request(app)
      .post('/api/po')
      .set('Authorization', `Bearer ${token}`)
      .send({
        supplierId,
        currency: 'ARS',
        notes: 'PO creada por test',
        items: [{ description: 'Item test', quantity: 1, unitPrice: 100, taxPercent: 21 }],
      })
      .expect(201)
    const poId = createPoRes.body.id
    expect(poId).toBeTruthy()

    // Submit
    const submitRes = await request(app)
      .post(`/api/po/${poId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(submitRes.body).toHaveProperty('status', 'SUBMITTED')

    // Steps
    const stepsRes = await request(app)
      .get(`/api/po/${poId}/steps`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(Array.isArray(stepsRes.body.steps)).toBe(true)

    // Approve first pending step if any
    const pending = stepsRes.body.steps.find((s) => s.status === 'PENDING')
    if (pending) {
      const approveRes = await request(app)
        .post(`/api/po/${poId}/steps/${pending.order}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .send({ comment: 'Aprobado por test' })
        .expect(200)
      expect(approveRes.body).toHaveProperty('ok', true)
    }

    // Logs should exist
    const logsRes = await request(app)
      .get(`/api/po/${poId}/logs`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(Array.isArray(logsRes.body.logs)).toBe(true)
    expect(logsRes.body.logs.length).toBeGreaterThan(0)
  })
})
