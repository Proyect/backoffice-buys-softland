import { Router } from 'express'
import { requireAuth, requirePermission } from '../middlewares/auth.js'
import { listSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier } from '../controllers/suppliers.controller.js'

const router = Router()

// Lista y búsqueda
router.get('/', requireAuth, requirePermission('supplier.read'), listSuppliers)

// Obtener uno
router.get('/:id', requireAuth, requirePermission('supplier.read'), getSupplier)

// Crear
router.post('/', requireAuth, requirePermission('supplier.create'), createSupplier)

// Actualizar
router.put('/:id', requireAuth, requirePermission('supplier.update'), updateSupplier)

// Eliminar
router.delete('/:id', requireAuth, requirePermission('supplier.delete'), deleteSupplier)

export default router
