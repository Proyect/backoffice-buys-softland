import { Router } from 'express'
import { requireAuth, requirePermission } from '../middlewares/auth.js'
import { listDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment, exportDepartmentsCsv } from '../controllers/departments.controller.js'

const router = Router()

// Lista / búsqueda / paginación
router.get('/', requireAuth, requirePermission('department.read'), listDepartments)

// Export CSV
router.get('/export/csv', requireAuth, requirePermission('department.export'), exportDepartmentsCsv)

// Obtener uno
router.get('/:id', requireAuth, requirePermission('department.read'), getDepartment)

// Crear
router.post('/', requireAuth, requirePermission('department.create'), createDepartment)

// Actualizar
router.put('/:id', requireAuth, requirePermission('department.update'), updateDepartment)

// Eliminar
router.delete('/:id', requireAuth, requirePermission('department.delete'), deleteDepartment)

export default router
