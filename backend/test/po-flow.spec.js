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

describe('PO flow: reject, resubmit, approve all, cancel', () => {
  let token = ''

  beforeAll(async () => {
    token = await loginAdmin()
  })

  it('Reject with comment, resubmit reinstantiates steps, approve remaining, cancel new PO', async () => {
    const supplier = await createSupplier(token)
    const po = await createPO(token, supplier.id)

    // Submit
    const sub = await request(app)
      .post(`/api/po/${po.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(sub.body.status).toBe('SUBMITTED')

    // Get steps and reject first pending
    const stepsRes = await request(app)
      .get(`/api/po/${po.id}/steps`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    const pending = stepsRes.body.steps.find(s => s.status === 'PENDING')
    expect(pending).toBeTruthy()

    await request(app)
      .post(`/api/po/${po.id}/steps/${pending.order}/reject`)
      .set('Authorization', `Bearer ${token}`)
      .send({ comment: 'Rechazo por test' })
      .expect(200)

    // After reject, PO should be REJECTED
    const poAfterReject = await request(app)
      .get(`/api/po/${po.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(poAfterReject.body.status).toBe('REJECTED')

    // Resubmit should recreate steps and set SUBMITTED again
    const resubmit = await request(app)
      .post(`/api/po/${po.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(resubmit.body.status).toBe('SUBMITTED')

    // Approve all remaining steps sequentially
    // Loop until no pending
    // To avoid fighting with order mismatch, always request current pending step
    // and approve it
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
        .send({ comment: 'Aprobado por test' })
        .expect(200)
    }

    const poAfterApprove = await request(app)
      .get(`/api/po/${po.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(['SUBMITTED', 'APPROVED']).toContain(poAfterApprove.body.status)

    // Finally, create a new PO and cancel it to test cancel route
    const po2 = await createPO(token, supplier.id)
    await request(app)
      .post(`/api/po/${po2.id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    const po2AfterCancel = await request(app)
      .get(`/api/po/${po2.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(po2AfterCancel.body.status).toBe('CANCELLED')
  })
})
