import { Router } from 'express'
import { requireAuth, requirePermission } from '../middlewares/auth.js'
import { listPO, getPO, createPO, submitPO, listSteps, approveStep, rejectStep, cancelPO } from '../controllers/po.controller.js'

const router = Router()

// Listar órdenes de compra
router.get('/', requireAuth, requirePermission('po.read'), listPO)

// Obtener una orden de compra
router.get('/:id', requireAuth, requirePermission('po.read'), getPO)

// Crear una orden de compra
router.post('/', requireAuth, requirePermission('po.create'), createPO)

// Enviar a aprobación (instanciar pasos)
router.post('/:id', requireAuth, requirePermission('po.submit'), submitPO)

// Listar pasos de aprobación de una OC
router.get('/:id/steps', requireAuth, requirePermission('po.read'), listSteps)

// Aprobar o rechazar un paso específico
router.post('/:id/steps/:order/approve', requireAuth, requirePermission('po.approve'), approveStep)
router.post('/:id/steps/:order/reject', requireAuth, requirePermission('po.reject'), rejectStep)

// Cancelar una OC
router.post('/:id/cancel', requireAuth, requirePermission('po.cancel'), cancelPO)

export default router
