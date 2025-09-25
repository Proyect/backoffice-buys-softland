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
  if (!role) throw new Error(`Role ${roleName} not found. Seed required.`)
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

describe('Role-based permissions: Comprador and Aprobador', () => {
  let compradorToken = ''
  let aprobadorToken = ''

  beforeAll(async () => {
    await ensureUserWithRole('comprador@local.test', 'Admin1234!', 'Comprador')
    await ensureUserWithRole('aprobador@local.test', 'Admin1234!', 'Aprobador')
    compradorToken = await login('comprador@local.test', 'Admin1234!')
    aprobadorToken = await login('aprobador@local.test', 'Admin1234!')
  })

  it('Comprador can create and submit a PO but cannot approve/reject', async () => {
    const supplier = await createSupplier(compradorToken)
    const po = await createPO(compradorToken, supplier.id)

    // Submit OK
    const sub = await request(app)
      .post(`/api/po/${po.id}`)
      .set('Authorization', `Bearer ${compradorToken}`)
      .expect(200)
    expect(sub.body.status).toBe('SUBMITTED')

    // Get current pending step
    const stepsRes = await request(app)
      .get(`/api/po/${po.id}/steps`)
      .set('Authorization', `Bearer ${compradorToken}`)
      .expect(200)
    const pending = stepsRes.body.steps.find(s => s.status === 'PENDING')
    expect(pending).toBeTruthy()

    // Approve forbidden
    await request(app)
      .post(`/api/po/${po.id}/steps/${pending.order}/approve`)
      .set('Authorization', `Bearer ${compradorToken}`)
      .send({ comment: 'comprador cannot approve' })
      .expect(403)

    // Reject forbidden
    await request(app)
      .post(`/api/po/${po.id}/steps/${pending.order}/reject`)
      .set('Authorization', `Bearer ${compradorToken}`)
      .send({ comment: 'comprador cannot reject' })
      .expect(403)
  })

  it('Aprobador cannot submit but can approve steps (permission override)', async () => {
    // Create a PO using Comprador so it is DRAFT
    const supplier = await createSupplier(compradorToken)
    const po = await createPO(compradorToken, supplier.id)

    // Try submit as Aprobador -> 403
    await request(app)
      .post(`/api/po/${po.id}`)
      .set('Authorization', `Bearer ${aprobadorToken}`)
      .expect(403)

    // Submit as Comprador to create pending steps
    await request(app)
      .post(`/api/po/${po.id}`)
      .set('Authorization', `Bearer ${compradorToken}`)
      .expect(200)

    // Aprobador approves first pending step (has po.approve permission)
    const stepsRes = await request(app)
      .get(`/api/po/${po.id}/steps`)
      .set('Authorization', `Bearer ${aprobadorToken}`)
      .expect(200)
    const pending = stepsRes.body.steps.find(s => s.status === 'PENDING')
    expect(pending).toBeTruthy()

    await request(app)
      .post(`/api/po/${po.id}/steps/${pending.order}/approve`)
      .set('Authorization', `Bearer ${aprobadorToken}`)
      .send({ comment: 'aprobador can approve any step' })
      .expect(200)
  })
})
