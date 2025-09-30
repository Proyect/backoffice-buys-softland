import request from 'supertest'
import { app } from '../src/server.js'

async function loginAsAdmin() {
  const res = await request(app)
    .post('/auth/login')
    .send({ email: 'admin@local.test', password: 'Admin1234!' })
    .expect(200)
  return res.body.tokens?.accessToken || res.body.accessToken || res.body.token
}

async function createSupplier(token, data = {}) {
  const payload = {
    name: data.name || `Supplier ${Date.now()}`,
    taxId: data.taxId || null,
    email: data.email || null,
  }
  const res = await request(app)
    .post('/api/suppliers')
    .set('Authorization', `Bearer ${token}`)
    .send(payload)
    .expect(201)
  return res.body
}

async function createPO(token, supplierId) {
  const po = {
    supplierId,
    currency: 'ARS',
    notes: 'PO for approval test',
    items: [
      { description: 'Item A', quantity: 1, unitPrice: 100, taxPercent: 21 },
    ],
  }
  const res = await request(app)
    .post('/api/po')
    .set('Authorization', `Bearer ${token}`)
    .send(po)
    .expect(201)
  return res.body
}

async function getSteps(token, poId) {
  const res = await request(app)
    .get(`/api/po/${poId}/steps`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200)
  return res.body.steps || []
}

describe('PO Approval flow', () => {
  let token

  beforeAll(async () => {
    token = await loginAsAdmin()
  })

  test('submit and approve two-step policy', async () => {
    const supplier = await createSupplier(token)
    const po = await createPO(token, supplier.id)

    // Submit PO
    await request(app)
      .post(`/api/po/${po.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    // Step 1 approve
    let steps = await getSteps(token, po.id)
    const pending1 = steps.find(s => s.status === 'PENDING')
    expect(pending1).toBeTruthy()
    await request(app)
      .post(`/api/po/${po.id}/steps/${pending1.order}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ comment: 'OK step 1' })
      .expect(200)

    // Step 2 approve
    steps = await getSteps(token, po.id)
    const pending2 = steps.find(s => s.status === 'PENDING')
    // In baseline policy, there are two steps
    expect(pending2).toBeTruthy()
    await request(app)
      .post(`/api/po/${po.id}/steps/${pending2.order}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ comment: 'OK step 2' })
      .expect(200)
  })

  test('submit and reject with comment', async () => {
    const supplier = await createSupplier(token)
    const po = await createPO(token, supplier.id)

    // Submit PO
    await request(app)
      .post(`/api/po/${po.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    // Reject first pending step with comment
    const steps = await getSteps(token, po.id)
    const pending = steps.find(s => s.status === 'PENDING')
    expect(pending).toBeTruthy()

    await request(app)
      .post(`/api/po/${po.id}/steps/${pending.order}/reject`)
      .set('Authorization', `Bearer ${token}`)
      .send({ comment: 'No corresponde' })
      .expect(200)
  })

  test('invalid order returns 400', async () => {
    const supplier = await createSupplier(token)
    const po = await createPO(token, supplier.id)

    // Submit PO
    await request(app)
      .post(`/api/po/${po.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    // Try to approve with wrong order (e.g., 999)
    const res = await request(app)
      .post(`/api/po/${po.id}/steps/999/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ comment: 'wrong order' })
      .expect(400)
    expect(res.body?.error).toBeTruthy()
  })
})
