import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

const departmentSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().optional().nullable(),
  managerId: z.string().uuid().optional().nullable(),
  budgetLimit: z.coerce.number().nonnegative(),
  isActive: z.coerce.boolean().optional().default(true),
  erpDepartmentId: z.coerce.number().int().optional().nullable(),
})

export async function listDepartments(req, res, next) {
  try {
    const { q = '', take = '20', skip = '0' } = req.query
    const where = q
      ? {
          OR: [
            { name: { contains: String(q), mode: 'insensitive' } },
            { code: { contains: String(q), mode: 'insensitive' } },
          ],
        }
      : {}

    const [items, total] = await Promise.all([
      prisma.department.findMany({
        where,
        orderBy: { name: 'asc' },
        take: Number(take),
        skip: Number(skip),
        include: { manager: { select: { id: true, firstName: true, lastName: true, email: true } } },
      }),
      prisma.department.count({ where }),
    ])

    res.json({ items, total })
  } catch (err) {
    next(err)
  }
}

export async function getDepartment(req, res, next) {
  try {
    const { id } = req.params
    const dep = await prisma.department.findUnique({
      where: { id },
      include: { manager: { select: { id: true, firstName: true, lastName: true, email: true } } },
    })
    if (!dep) return res.status(404).json({ error: 'Not found' })
    res.json(dep)
  } catch (err) {
    next(err)
  }
}

export async function createDepartment(req, res, next) {
  try {
    const input = departmentSchema.parse(req.body)
    const created = await prisma.department.create({ data: input })
    res.status(201).json(created)
  } catch (err) {
    next(err)
  }
}

export async function updateDepartment(req, res, next) {
  try {
    const { id } = req.params
    const input = departmentSchema.partial().parse(req.body)
    const updated = await prisma.department.update({ where: { id }, data: input })
    res.json(updated)
  } catch (err) {
    next(err)
  }
}

export async function deleteDepartment(req, res, next) {
  try {
    const { id } = req.params
    await prisma.department.delete({ where: { id } })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
}

export async function exportDepartmentsCsv(req, res, next) {
  try {
    const { q = '' } = req.query
    const where = q
      ? {
          OR: [
            { name: { contains: String(q), mode: 'insensitive' } },
            { code: { contains: String(q), mode: 'insensitive' } },
          ],
        }
      : {}

    const records = await prisma.department.findMany({ where, orderBy: { name: 'asc' }, include: { manager: true } })

    const columns = [
      'name',
      'code',
      'description',
      'managerName',
      'budgetLimit',
      'isActive',
      'erpDepartmentId',
      'createdAt',
      'updatedAt',
    ]

    res.setHeader('Content-Type', 'text/csv; charset=UTF-8')
    res.setHeader('Content-Disposition', `attachment; filename="departments_${new Date().toISOString().replace(/[:.]/g, '-')}.csv"`)

    res.write(columns.join(';') + '\n')
    for (const r of records) {
      const row = [
        r.name ?? '',
        r.code ?? '',
        r.description ?? '',
        r.manager ? `${r.manager.firstName} ${r.manager.lastName}`.trim() : '',
        typeof r.budgetLimit === 'object' && 'toString' in r.budgetLimit ? r.budgetLimit.toString() : String(r.budgetLimit ?? ''),
        r.isActive ? 'true' : 'false',
        r.erpDepartmentId ?? '',
        r.createdAt?.toISOString?.() ?? '',
        r.updatedAt?.toISOString?.() ?? '',
      ]
      res.write(row.map(v => String(v).replaceAll(';', ',')).join(';') + '\n')
    }
    res.end()
  } catch (err) {
    next(err)
  }
}
