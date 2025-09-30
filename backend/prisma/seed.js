/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function upsertPermissions() {
  const permissionKeys = [
    // Users / Roles
    'user.read',
    'user.manage',
    'role.read',
    'role.manage',
    'permission.read',

    // Suppliers
    'supplier.read',
    'supplier.create',
    'supplier.update',
    'supplier.delete',

    // Purchase Orders
    'po.read',
    'po.create',
    'po.update',
    'po.submit',
    'po.approve',
    'po.reject',
    'po.cancel',
    'po.attach',
    // 'po.attach.delete', // habilitar si se requiere permiso separado para borrar

    // Audit
    'audit.read',
  ]

  for (const key of permissionKeys) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key, description: key },
    })
  }

  return prisma.permission.findMany()
}

async function upsertRoles(permissions) {
  const idByKey = Object.fromEntries(permissions.map((p) => [p.key, p.id]))
  const makePermCreates = (keys) => ({
    create: keys.map((k) => ({ permission: { connect: { id: idByKey[k] } } })),
  })

  const admin = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: {
      name: 'Admin',
      description: 'Administrador del sistema',
      permissions: makePermCreates(permissions.map((p) => p.key)),
    },
  })

  const comprador = await prisma.role.upsert({
    where: { name: 'Comprador' },
    update: {},
    create: {
      name: 'Comprador',
      description: 'Crea y edita órdenes de compra',
      permissions: makePermCreates([
        'supplier.read', 'po.read', 'po.create', 'po.update', 'po.submit', 'po.attach',
      ]),
    },
  })

  const aprobador = await prisma.role.upsert({
    where: { name: 'Aprobador' },
    update: {},
    create: {
      name: 'Aprobador',
      description: 'Aprueba o rechaza órdenes de compra',
      permissions: makePermCreates(['po.read', 'po.approve', 'po.reject']),
    },
  })

  const consulta = await prisma.role.upsert({
    where: { name: 'Consulta' },
    update: {},
    create: {
      name: 'Consulta',
      description: 'Solo lectura',
      permissions: makePermCreates(['supplier.read', 'po.read', 'audit.read']),
    },
  })

  return { admin, comprador, aprobador, consulta }
}

async function upsertAdminUser(roles) {
  const email = 'admin@local.test'
  const passwordHash = bcrypt.hashSync('Admin1234!', 10)

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      firstName: 'System',
      lastName: 'Admin',
      roles: {
        create: [
          { role: { connect: { id: roles.admin.id } } },
        ],
      },
    },
  })

  return admin
}

async function createDefaultApprovalPolicy(roles) {
  // A simple two-step policy: Comprador -> Aprobador
  const policy = await prisma.approvalPolicy.upsert({
    where: { name: 'Baseline 2-step' },
    update: {},
    create: {
      name: 'Baseline 2-step',
      description: 'Comprador prepara, Aprobador aprueba',
      isActive: true,
      steps: {
        create: [
          { order: 1, role: { connect: { id: roles.comprador.id } } },
          { order: 2, role: { connect: { id: roles.aprobador.id } } },
        ],
      },
    },
    include: { steps: true },
  })
  return policy
}

async function main() {
  console.log('Seeding database...')
  const permissions = await upsertPermissions()
  const roles = await upsertRoles(permissions)
  const admin = await upsertAdminUser(roles)
  const policy = await createDefaultApprovalPolicy(roles)

  console.log('Seed completed:')
  console.log({
    permissions: permissions.length,
    roles: Object.keys(roles),
    admin: { email: admin.email },
    policy: { name: policy.name, steps: policy.steps.length },
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
