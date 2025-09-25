import { prisma } from '../lib/prisma.js'
import { z } from 'zod'
import logger from '../middlewares/logger.js'

const money = z.preprocess(
  (v) => (typeof v === 'string' || typeof v === 'number' ? Number(v) : v),
  z.number().nonnegative()
)

const poItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: money,
  taxPercent: z.number().min(0).max(100).optional().nullable(),
})

const createPOSchema = z.object({
  supplierId: z.string().uuid(),
  currency: z.enum(['ARS', 'USD', 'EUR']).optional(),
  notes: z.string().max(1000).optional().nullable(),
  items: z.array(poItemSchema).min(1),
})

export async function listPO(req, res) {
  try {
    const { supplierId, status, skip = '0', take = '20' } = req.query
    const where = {
      ...(supplierId ? { supplierId: String(supplierId) } : {}),
      ...(status ? { status: String(status) } : {}),
    }
    const [items, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: { supplier: true },
        orderBy: { createdAt: 'desc' },
        skip: Number(skip),
        take: Math.min(Number(take), 100),
      }),
      prisma.purchaseOrder.count({ where }),
    ])
    res.json({ items, total })
  } catch (err) {
    res.status(500).json({ error: 'Failed to list purchase orders' })
  }
}

export async function getPO(req, res) {
  try {
    const { id } = req.params
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { supplier: true, items: true, approvals: true, files: true },
    })
    if (!po) return res.status(404).json({ error: 'Purchase order not found' })
    res.json(po)
  } catch (err) {
    res.status(500).json({ error: 'Failed to get purchase order' })
  }
}

function computeTotals(items) {
  let total = 0
  const computed = items.map((it) => {
    const base = Number(it.quantity) * Number(it.unitPrice)
    const taxPercent = it.taxPercent ?? null
    const lineTotal = taxPercent == null ? base : base * (1 + Number(taxPercent) / 100)
    total += lineTotal
    return { ...it, total: Number(lineTotal.toFixed(2)) }
  })
  return { items: computed, total: Number(total.toFixed(2)) }
}

export async function createPO(req, res) {
  try {
    // requireAuth pobló req.user
    const parsed = createPOSchema.parse(req.body || {})
    const { items, total } = computeTotals(parsed.items)

    const created = await prisma.purchaseOrder.create({
      data: {
        supplierId: parsed.supplierId,
        createdByUserId: req.user.id,
        currency: parsed.currency || 'ARS',
        notes: parsed.notes || null,
        total,
        items: {
          create: items.map((it) => ({
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            taxPercent: it.taxPercent ?? null,
            total: it.total,
          })),
        },
      },
      include: { items: true },
    })

    res.status(201).json(created)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.flatten() })
    }
    if (err?.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid supplierId' })
    }
    res.status(500).json({ error: 'Failed to create purchase order' })
  }
}

// =====================
// Multi-level approvals
// =====================

async function userHasRole(userId, roleId) {
  const count = await prisma.userRole.count({ where: { userId, roleId } })
  return count > 0
}

async function selectPolicyForPO(po) {
  const policies = await prisma.approvalPolicy.findMany({
    where: { isActive: true },
    include: { steps: { orderBy: { order: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  })
  const candidates = policies.filter((p) =>
    (p.currency == null || p.currency === po.currency) &&
    (p.costCenter == null || p.costCenter === null /* placeholder if using */) &&
    (p.maxAmount == null || po.total <= p.maxAmount)
  )
  return candidates[0] || null
}

export async function submitPO(req, res) {
  try {
    const startedAt = Date.now()
    const { id } = req.params
    const po = await prisma.purchaseOrder.findUnique({ where: { id } })
    if (!po) return res.status(404).json({ error: 'Purchase order not found' })
    if (!['DRAFT', 'REJECTED'].includes(po.status)) return res.status(400).json({ error: 'PO cannot be submitted' })

    const policy = await selectPolicyForPO(po)
    if (!policy) return res.status(400).json({ error: 'No approval policy matches this PO' })

    await prisma.$transaction(async (tx) => {
      // Clean previous runtime steps if resubmitting
      await tx.purchaseApprovalStep.deleteMany({ where: { purchaseOrderId: po.id } })

      // Instantiate steps
      if (policy.steps.length > 0) {
        await tx.purchaseApprovalStep.createMany({
          data: policy.steps.map((s) => ({
            purchaseOrderId: po.id,
            order: s.order,
            roleId: s.roleId,
            status: 'PENDING',
          })),
        })
      }

      await tx.purchaseOrder.update({ where: { id: po.id }, data: { status: 'SUBMITTED' } })
      await tx.approvalLog.create({ data: { purchaseOrderId: po.id, userId: req.user.id, action: 'submitted' } })
    })

    const withSteps = await prisma.purchaseOrder.findUnique({ where: { id: po.id }, include: { approvals: true } })
    logger.info({ action: 'po.submit', poId: id, userId: req.user?.id, elapsedMs: Date.now() - startedAt }, 'PO submitted')
    res.json(withSteps)
  } catch (err) {
    logger.error({ action: 'po.submit', poId: req.params?.id, userId: req.user?.id, error: err?.message }, 'Failed to submit PO')
    res.status(500).json({ error: 'Failed to submit purchase order' })
  }
}

export async function listSteps(req, res) {
  try {
    const { id } = req.params
    const steps = await prisma.purchaseApprovalStep.findMany({
      where: { purchaseOrderId: id },
      orderBy: { order: 'asc' },
      include: { role: true, approver: true },
    })
    res.json({ steps })
  } catch (err) {
    res.status(500).json({ error: 'Failed to list steps' })
  }
}

const decisionSchema = z.object({ comment: z.string().max(1000).optional().nullable() })

export async function approveStep(req, res) {
  try {
    const startedAt = Date.now()
    const { id, order } = req.params
    const { comment } = decisionSchema.parse(req.body || {})
    // find current pending step
    const current = await prisma.purchaseApprovalStep.findFirst({
      where: { purchaseOrderId: id, status: 'PENDING' },
      orderBy: { order: 'asc' },
    })
    if (!current || current.order !== Number(order)) {
      return res.status(400).json({ error: 'This step is not pending or order mismatch' })
    }

    // eligibility: role match OR permission override
    const canByPermission = (req.permissions || []).includes('po.approve')
    const canByRole = current.roleId ? await userHasRole(req.user.id, current.roleId) : false
    if (!canByPermission && !canByRole) {
      return res.status(403).json({ error: 'Not allowed to approve this step' })
    }

    await prisma.$transaction(async (tx) => {
      // Update step if still pending (guard)
      const updated = await tx.purchaseApprovalStep.updateMany({
        where: { id: current.id, status: 'PENDING' },
        data: { status: 'APPROVED', decidedAt: new Date(), approverUserId: req.user.id, comment: comment || null },
      })
      if (updated.count === 0) throw new Error('Step already decided')

      // If no more pending steps -> mark PO approved
      const remaining = await tx.purchaseApprovalStep.count({ where: { purchaseOrderId: id, status: 'PENDING' } })
      if (remaining === 0) {
        await tx.purchaseOrder.update({ where: { id }, data: { status: 'APPROVED' } })
      }

      await tx.approvalLog.create({ data: { purchaseOrderId: id, userId: req.user.id, action: 'approved', comment: comment || null } })
    })

    const next = await prisma.purchaseApprovalStep.findFirst({ where: { purchaseOrderId: id, status: 'PENDING' }, orderBy: { order: 'asc' } })
    logger.info({ action: 'po.approve', poId: id, stepOrder: Number(order), userId: req.user?.id, nextPendingOrder: next?.order ?? null, elapsedMs: Date.now() - startedAt }, 'Step approved')
    res.json({ ok: true, nextPendingOrder: next?.order ?? null })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.flatten() })
    }
    logger.error({ action: 'po.approve', poId: req.params?.id, stepOrder: Number(req.params?.order), userId: req.user?.id, error: err?.message }, 'Failed to approve step')
    return res.status(500).json({ error: 'Failed to approve step' })
  }
}

export async function rejectStep(req, res) {
  try {
    const startedAt = Date.now()
    const { id, order } = req.params
    const { comment } = decisionSchema.parse(req.body || {})

    const current = await prisma.purchaseApprovalStep.findFirst({
      where: { purchaseOrderId: id, status: 'PENDING' },
      orderBy: { order: 'asc' },
    })
    if (!current || current.order !== Number(order)) {
      return res.status(400).json({ error: 'This step is not pending or order mismatch' })
    }

    const canByPermission = (req.permissions || []).includes('po.reject')
    const canByRole = current.roleId ? await userHasRole(req.user.id, current.roleId) : false
    if (!canByPermission && !canByRole) {
      return res.status(403).json({ error: 'Not allowed to reject this step' })
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.purchaseApprovalStep.updateMany({
        where: { id: current.id, status: 'PENDING' },
        data: { status: 'REJECTED', decidedAt: new Date(), approverUserId: req.user.id, comment: comment || null },
      })
      if (updated.count === 0) throw new Error('Step already decided')

      await tx.purchaseOrder.update({ where: { id }, data: { status: 'REJECTED' } })
      await tx.approvalLog.create({ data: { purchaseOrderId: id, userId: req.user.id, action: 'rejected', comment: comment || null } })
    })

    res.json({ ok: true })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.flatten() })
    }
    logger.error({ action: 'po.reject', poId: req.params?.id, stepOrder: Number(req.params?.order), userId: req.user?.id, error: err?.message }, 'Failed to reject step')
    return res.status(500).json({ error: 'Failed to reject step' })
  }
}

export async function cancelPO(req, res) {
  try {
    const { id } = req.params
    await prisma.$transaction(async (tx) => {
      await tx.purchaseOrder.update({ where: { id }, data: { status: 'CANCELLED' } })
      // Optionally skip pending steps
      await tx.purchaseApprovalStep.updateMany({ where: { purchaseOrderId: id, status: 'PENDING' }, data: { status: 'SKIPPED', decidedAt: new Date() } })
      await tx.approvalLog.create({ data: { purchaseOrderId: id, userId: req.user.id, action: 'cancelled' } })
    })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel purchase order' })
  }
}

export async function listLogs(req, res) {
  try {
    const { id } = req.params
    const logs = await prisma.approvalLog.findMany({
      where: { purchaseOrderId: id },
      orderBy: { createdAt: 'asc' },
      include: { user: true },
    })
    res.json({ logs })
  } catch (err) {
    res.status(500).json({ error: 'Failed to list approval logs' })
  }
}

export async function stats(req, res) {
  try {
    const [draft, submitted, approved, rejected, cancelled] = await Promise.all([
      prisma.purchaseOrder.count({ where: { status: 'DRAFT' } }),
      prisma.purchaseOrder.count({ where: { status: 'SUBMITTED' } }),
      prisma.purchaseOrder.count({ where: { status: 'APPROVED' } }),
      prisma.purchaseOrder.count({ where: { status: 'REJECTED' } }),
      prisma.purchaseOrder.count({ where: { status: 'CANCELLED' } }),
    ])

    const recent = await prisma.approvalLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: true,
        purchaseOrder: { select: { id: true, status: true, total: true, currency: true } },
      },
    })

    res.json({
      counts: { draft, submitted, approved, rejected, cancelled },
      recent,
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to get PO stats' })
  }
}

export async function pendingForMe(req, res) {
  try {
    const canApproveAny = (req.permissions || []).includes('po.approve')
    // Get all pending steps ordered by PO then order
    const steps = await prisma.purchaseApprovalStep.findMany({
      where: { status: 'PENDING' },
      orderBy: [{ purchaseOrderId: 'asc' }, { order: 'asc' }],
      include: { role: true, purchaseOrder: true },
    })

    // Keep only the first pending per PO (current step)
    const firstByPO = new Map()
    for (const s of steps) {
      if (!firstByPO.has(s.purchaseOrderId)) firstByPO.set(s.purchaseOrderId, s)
    }

    // If user cannot approve any by permission, filter by matching user roles
    let filtered = Array.from(firstByPO.values())
    if (!canApproveAny) {
      const myRoles = await prisma.userRole.findMany({ where: { userId: req.user.id } })
      const roleSet = new Set(myRoles.map((r) => r.roleId))
      filtered = filtered.filter((s) => (s.roleId ? roleSet.has(s.roleId) : false))
    }

    // Map to concise payload
    const items = filtered.map((s) => ({
      step: { id: s.id, order: s.order, roleId: s.roleId, roleName: s.role?.name || null },
      po: {
        id: s.purchaseOrder.id,
        status: s.purchaseOrder.status,
        total: s.purchaseOrder.total,
        currency: s.purchaseOrder.currency,
        supplierId: s.purchaseOrder.supplierId,
      },
    }))

    res.json({ items, total: items.length })
  } catch (err) {
    res.status(500).json({ error: 'Failed to get pending approvals for user' })
  }
}

export async function statsTimeseries(req, res) {
  try {
    const days = Number(req.query.days || 14)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const logs = await prisma.approvalLog.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
    })

    // Initialize buckets per day
    const buckets = {}
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000)
      const key = d.toISOString().slice(0, 10)
      buckets[key] = { date: key, submitted: 0, approved: 0, rejected: 0, cancelled: 0 }
    }

    for (const l of logs) {
      const key = l.createdAt.toISOString().slice(0, 10)
      if (!buckets[key]) continue
      if (l.action === 'submitted') buckets[key].submitted++
      else if (l.action === 'approved') buckets[key].approved++
      else if (l.action === 'rejected') buckets[key].rejected++
      else if (l.action === 'cancelled') buckets[key].cancelled++
    }

    const series = Object.values(buckets)
    res.json({ days, series })
  } catch (err) {
    res.status(500).json({ error: 'Failed to get timeseries stats' })
  }
}
