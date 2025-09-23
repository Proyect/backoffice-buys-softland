import { prisma } from '../lib/prisma.js'
import { z } from 'zod'

const supplierSchema = z.object({
  name: z.string().min(1),
  taxId: z.string().min(5).max(30).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(5).max(30).optional().nullable(),
  address: z.string().min(3).max(200).optional().nullable(),
  isActive: z.boolean().optional(),
})

export async function listSuppliers(req, res) {
  try {
    const { q, skip = '0', take = '20' } = req.query
    const where = q ? { name: { contains: String(q), mode: 'insensitive' } } : {}
    const [items, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: Number(skip),
        take: Math.min(Number(take), 100),
      }),
      prisma.supplier.count({ where }),
    ])
    res.json({ items, total })
  } catch (err) {
    res.status(500).json({ error: 'Failed to list suppliers' })
  }
}

export async function getSupplier(req, res) {
  try {
    const { id } = req.params
    const supplier = await prisma.supplier.findUnique({ where: { id } })
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' })
    res.json(supplier)
  } catch (err) {
    res.status(500).json({ error: 'Failed to get supplier' })
  }
}

export async function createSupplier(req, res) {
  try {
    const data = supplierSchema.parse(req.body || {})
    const created = await prisma.supplier.create({ data })
    res.status(201).json(created)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.flatten() })
    }
    res.status(500).json({ error: 'Failed to create supplier' })
  }
}

export async function updateSupplier(req, res) {
  try {
    const { id } = req.params
    const data = supplierSchema.partial().parse(req.body || {})
    const updated = await prisma.supplier.update({ where: { id }, data })
    res.json(updated)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.flatten() })
    }
    if (err?.code === 'P2025') {
      return res.status(404).json({ error: 'Supplier not found' })
    }
    res.status(500).json({ error: 'Failed to update supplier' })
  }
}

export async function deleteSupplier(req, res) {
  try {
    const { id } = req.params
    await prisma.supplier.delete({ where: { id } })
    res.json({ ok: true })
  } catch (err) {
    if (err?.code === 'P2025') {
      return res.status(404).json({ error: 'Supplier not found' })
    }
    res.status(500).json({ error: 'Failed to delete supplier' })
  }
}
