import request from 'supertest'
import { describe, it, expect } from 'vitest'
import { app } from '../src/server.js'

const IT = process.env.INTEGRATION_TEST === '1'

// These tests require a real DB with seed executed.
// They will be skipped unless INTEGRATION_TEST=1 and DATABASE_URL is defined.
const maybeDescribe = IT && process.env.DATABASE_URL ? describe : describe.skip

maybeDescribe('[integration] Auth flow', () => {
  it('login and access /auth/me with Bearer token', async () => {
    const loginRes = await request(app)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: 'admin@local.test', password: 'Admin1234!' })

    expect(loginRes.status).toBe(200)
    const accessToken = loginRes.body?.tokens?.accessToken
    expect(accessToken).toBeTruthy()

    const meRes = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(meRes.status).toBe(200)
    expect(meRes.body?.user?.email).toBe('admin@local.test')
    expect(Array.isArray(meRes.body?.permissions)).toBe(true)
  })
})
