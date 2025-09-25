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

async function createPO(token, supplierId) {
  const res = await request(app)
    .post('/api/po')
    .set('Authorization', `Bearer ${token}`)
    .send({
      supplierId,
      currency: 'ARS',
      items: [{ description: 'Item', quantity: 1, unitPrice: 100 }],
    })
    .expect(201)
  return res.body
}

describe('Negative scenarios: wrong order and no pending', () => {
  let token = ''

  beforeAll(async () => {
    token = await loginAdmin()
  })

  it('Approve with wrong order returns 400; Reject with wrong order returns 400', async () => {
    const supplier = await createSupplier(token)
    const po = await createPO(token, supplier.id)

    // Submit to instantiate steps
    await request(app)
      .post(`/api/po/${po.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    // Fetch steps to know valid pending order
    const stepsRes = await request(app)
      .get(`/api/po/${po.id}/steps`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    const pending = stepsRes.body.steps.find(s => s.status === 'PENDING')
    expect(pending).toBeTruthy()

    // Choose a wrong order (e.g., pending.order + 1 if exists, else a big number)
    const wrongOrder = pending.order + 5

    await request(app)
      .post(`/api/po/${po.id}/steps/${wrongOrder}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ comment: 'should be 400 wrong order' })
      .expect(400)

    await request(app)
      .post(`/api/po/${po.id}/steps/${wrongOrder}/reject`)
      .set('Authorization', `Bearer ${token}`)
      .send({ comment: 'should be 400 wrong order' })
      .expect(400)
  })

  it('Approve when no pending steps returns 400', async () => {
    const supplier = await createSupplier(token)
    const po = await createPO(token, supplier.id)

    // Submit
    await request(app)
      .post(`/api/po/${po.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    // Approve pending steps until none left (up to a safe loop bound)
    for (let i = 0; i < 5; i++) {
      const steps = await request(app)
        .get(`/api/po/${po.id}/steps`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
      const p = steps.body.steps.find(s => s.status === 'PENDING')
      if (!p) break
      await request(app)
        .post(`/api/po/${po.id}/steps/${p.order}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .send({ comment: 'auto approve for test' })
        .expect(200)
    }

    // There should be no pending now; trying to approve any order should 400
    await request(app)
      .post(`/api/po/${po.id}/steps/1/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ comment: 'no pending, should be 400' })
      .expect(400)
  })
})
