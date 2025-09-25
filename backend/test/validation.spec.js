import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { app } from '../src/server.js'

let token = ''

async function login() {
  const res = await request(app)
    .post('/auth/login')
    .send({ email: 'admin@local.test', password: 'Admin1234!' })
    .expect(200)
  return res.body.tokens.accessToken
}

describe('Validation errors for createPO', () => {
  beforeAll(async () => {
    token = await login()
  })

  it('rejects missing supplierId', async () => {
    const res = await request(app)
      .post('/api/po')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ description: 'X', quantity: 1, unitPrice: 100 }] })
      .expect(400)
    expect(res.body.error).toBeDefined()
  })

  it('rejects empty items array', async () => {
    const res = await request(app)
      .post('/api/po')
      .set('Authorization', `Bearer ${token}`)
      .send({ supplierId: '00000000-0000-0000-0000-000000000000', items: [] })
      .expect(400)
    expect(res.body.error).toBeDefined()
  })

  it('rejects invalid quantity and unitPrice', async () => {
    const res = await request(app)
      .post('/api/po')
      .set('Authorization', `Bearer ${token}`)
      .send({
        supplierId: '00000000-0000-0000-0000-000000000000',
        items: [{ description: 'X', quantity: 0, unitPrice: -5 }],
      })
      .expect(400)
    expect(res.body.error).toBeDefined()
  })
})
