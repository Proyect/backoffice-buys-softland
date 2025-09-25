import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { app } from '../src/server.js'

const prisma = new PrismaClient()

async function ensureUserWithRole(email, password, roleName) {
  const existing = await prisma.user.findUnique({ where: { email } })
  let user = existing
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash: bcrypt.hashSync(password, 10),
        firstName: 'Test',
        lastName: roleName,
        isActive: true,
      },
    })
  }
  const role = await prisma.role.findUnique({ where: { name: roleName } })
  if (!role) throw new Error(`Role ${roleName} not found. Did you run seed?`)
  // connect if not connected yet
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    create: { userId: user.id, roleId: role.id },
    update: {},
  })
  return user
}

async function login(email, password) {
  const res = await request(app).post('/auth/login').send({ email, password }).expect(200)
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

async function createAndSubmitPO(token, supplierId) {
  const createRes = await request(app)
    .post('/api/po')
    .set('Authorization', `Bearer ${token}`)
    .send({
      supplierId,
      currency: 'ARS',
      items: [{ description: 'X', quantity: 1, unitPrice: 100 }],
    })
    .expect(201)
  const poId = createRes.body.id
  const submitRes = await request(app)
    .post(`/api/po/${poId}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200)
  expect(submitRes.body.status).toBe('SUBMITTED')
  return poId
}

describe('Permission enforcement on approval endpoints', () => {
  let adminToken = ''
  let consultaToken = ''
  let poId = ''

  beforeAll(async () => {
    // Admin login
    adminToken = await login('admin@local.test', 'Admin1234!')
    // Ensure consulta user exists and login
    await ensureUserWithRole('consulta@local.test', 'Admin1234!', 'Consulta')
    consultaToken = await login('consulta@local.test', 'Admin1234!')

    const supplier = await createSupplier(adminToken)
    poId = await createAndSubmitPO(adminToken, supplier.id)
  })

  it('Consulta user cannot approve step', async () => {
    const steps = await request(app)
      .get(`/api/po/${poId}/steps`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    const pending = steps.body.steps.find((s) => s.status === 'PENDING')
    expect(pending).toBeTruthy()

    await request(app)
      .post(`/api/po/${poId}/steps/${pending.order}/approve`)
      .set('Authorization', `Bearer ${consultaToken}`)
      .send({ comment: 'should be forbidden' })
      .expect(403)
  })

  it('Consulta user cannot reject step', async () => {
    const steps = await request(app)
      .get(`/api/po/${poId}/steps`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    const pending = steps.body.steps.find((s) => s.status === 'PENDING')
    expect(pending).toBeTruthy()

    await request(app)
      .post(`/api/po/${poId}/steps/${pending.order}/reject`)
      .set('Authorization', `Bearer ${consultaToken}`)
      .send({ comment: 'should be forbidden' })
      .expect(403)
  })

  it('Consulta user cannot submit a PO', async () => {
    // Create a PO as admin first (DRAFT)
    const supplier = await createSupplier(adminToken)
    const createRes = await request(app)
      .post('/api/po')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplierId: supplier.id,
        currency: 'ARS',
        items: [{ description: 'X', quantity: 1, unitPrice: 100 }],
      })
      .expect(201)
    const draftId = createRes.body.id

    // Try submit as consulta -> 403
    await request(app)
      .post(`/api/po/${draftId}`)
      .set('Authorization', `Bearer ${consultaToken}`)
      .expect(403)
  })
})
