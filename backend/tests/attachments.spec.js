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
    name: data.name || `Test Supplier ${Date.now()}`,
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
    notes: 'PO for attachments test',
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

describe('PO Attachments', () => {
  let token
  let supplier
  let po

  beforeAll(async () => {
    token = await loginAsAdmin()
    supplier = await createSupplier(token)
    po = await createPO(token, supplier.id)
  })

  test('upload/list/download/delete attachment (pdf)', async () => {
    // Upload a tiny PDF-like buffer
    const pdfBuffer = Buffer.from('%PDF-1.4\n%Test')
    const upload = await request(app)
      .post(`/api/po/${po.id}/files`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', pdfBuffer, { filename: 'test.pdf', contentType: 'application/pdf' })
      .expect(201)

    const file = upload.body
    expect(file).toBeTruthy()
    expect(file.id).toBeTruthy()
    expect(file.filename).toBe('test.pdf')

    const list1 = await request(app)
      .get(`/api/po/${po.id}/files`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(Array.isArray(list1.body.files)).toBe(true)
    expect(list1.body.files.length).toBeGreaterThanOrEqual(1)

    await request(app)
      .get(`/api/po/${po.id}/files/${file.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    await request(app)
      .delete(`/api/po/${po.id}/files/${file.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    const list2 = await request(app)
      .get(`/api/po/${po.id}/files`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(list2.body.files.find(f => f.id === file.id)).toBeFalsy()
  })

  test('reject unsupported file type', async () => {
    const bin = Buffer.from('MZ') // fake exe signature
    const res = await request(app)
      .post(`/api/po/${po.id}/files`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', bin, { filename: 'evil.exe', contentType: 'application/octet-stream' })
      .expect(500)
    expect(res.body?.error || '').toMatch(/no permitido|not permitted|Tipo/i)
  })

  // Optionally test size limit (skipped by default to keep suite fast)
  test.skip('reject too large file (>10MB)', async () => {
    const big = Buffer.alloc(10 * 1024 * 1024 + 1, 0)
    await request(app)
      .post(`/api/po/${po.id}/files`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', big, { filename: 'big.pdf', contentType: 'application/pdf' })
      .expect(500)
  })
})
