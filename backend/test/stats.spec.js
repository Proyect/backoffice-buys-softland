import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { app } from '../src/server.js'

async function loginAdmin() {
  const res = await request(app)
    .post('/auth/login')
    .send({ email: 'admin@local.test', password: 'Admin1234!' })
    .expect(200)
  return res.body.tokens.accessToken
}

async function createSupplier(token) {
  const res = await request(app)
    .post('/api/suppliers')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: `Supplier ${Date.now()}` })
    .expect(201)
  return res.body
}

async function createPO(token, supplierId, currency = 'ARS') {
  const res = await request(app)
    .post('/api/po')
    .set('Authorization', `Bearer ${token}`)
    .send({
      supplierId,
      currency,
      items: [{ description: 'Item', quantity: 1, unitPrice: 100 }],
    })
    .expect(201)
  return res.body
}

async function submitPO(token, id) {
  const res = await request(app)
    .post(`/api/po/${id}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200)
  return res.body
}

async function approveFirstPending(token, poId) {
  const steps = await request(app)
    .get(`/api/po/${poId}/steps`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200)
  const p = steps.body.steps.find(s => s.status === 'PENDING')
  if (!p) return null
  await request(app)
    .post(`/api/po/${poId}/steps/${p.order}/approve`)
    .set('Authorization', `Bearer ${token}`)
    .send({ comment: 'ok' })
    .expect(200)
  return p.order
}

describe('PO Stats endpoints', () => {
  let token = ''

  beforeAll(async () => {
    token = await loginAdmin()
  })

  it('GET /api/po/stats returns counts and recent', async () => {
    const supplier = await createSupplier(token)
    const po = await createPO(token, supplier.id)
    await submitPO(token, po.id)

    const res = await request(app)
      .get('/api/po/stats')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body).toHaveProperty('counts')
    expect(res.body.counts).toHaveProperty('draft')
    expect(res.body).toHaveProperty('recent')
    expect(Array.isArray(res.body.recent)).toBe(true)
  })

  it('GET /api/po/stats/timeseries returns a series of days', async () => {
    const res = await request(app)
      .get('/api/po/stats/timeseries?days=7')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body).toHaveProperty('days')
    expect(res.body.days).toBe(7)
    expect(res.body).toHaveProperty('series')
    expect(Array.isArray(res.body.series)).toBe(true)
    // series entries have date and counters
    if (res.body.series.length) {
      const row = res.body.series[0]
      expect(row).toHaveProperty('date')
      expect(row).toHaveProperty('submitted')
      expect(row).toHaveProperty('approved')
      expect(row).toHaveProperty('rejected')
      expect(row).toHaveProperty('cancelled')
    }
  })

  it('GET /api/po/pending-for-me lists current pending steps for approver', async () => {
    // Create a fresh PO and submit to ensure at least one pending
    const supplier = await createSupplier(token)
    const po = await createPO(token, supplier.id)
    await submitPO(token, po.id)

    const res = await request(app)
      .get('/api/po/pending-for-me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body).toHaveProperty('items')
    expect(Array.isArray(res.body.items)).toBe(true)
    if (res.body.items.length) {
      const it = res.body.items[0]
      expect(it).toHaveProperty('step')
      expect(it).toHaveProperty('po')
      expect(it.po).toHaveProperty('id')
      expect(it.step).toHaveProperty('order')
    }
  })
})
