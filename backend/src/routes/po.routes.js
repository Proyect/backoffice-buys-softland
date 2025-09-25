import { Router } from 'express'
import { requireAuth, requirePermission } from '../middlewares/auth.js'
import { listPO, getPO, createPO, submitPO, listSteps, approveStep, rejectStep, cancelPO, listLogs, stats, pendingForMe, statsTimeseries, listFiles, uploadFile, downloadFile, deleteFile } from '../controllers/po.controller.js'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

const router = Router()

// Configure multer storage under uploads/po/<poId>
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const poId = req.params.id
    const dir = path.resolve(process.cwd(), 'uploads', 'po', poId)
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_')
    cb(null, `${Date.now()}_${safe}`)
  }
})
const allowed = new Set(['application/pdf','image/jpeg','image/png','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    // Accept by MIME, and also accept by extension fallback
    const okMime = allowed.has(file.mimetype)
    const name = (file.originalname || '').toLowerCase()
    const okExt = name.endsWith('.pdf') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.docx') || name.endsWith('.xlsx')
    if (okMime || okExt) return cb(null, true)
    return cb(new Error('Tipo de archivo no permitido'))
  }
})

// Listar órdenes de compra
router.get('/', requireAuth, requirePermission('po.read'), listPO)

// KPIs y actividad reciente
router.get('/stats', requireAuth, requirePermission('po.read'), stats)
router.get('/stats/timeseries', requireAuth, requirePermission('po.read'), statsTimeseries)
router.get('/pending-for-me', requireAuth, requirePermission('po.read'), pendingForMe)

// Obtener una orden de compra
router.get('/:id', requireAuth, requirePermission('po.read'), getPO)

// Crear una orden de compra
router.post('/', requireAuth, requirePermission('po.create'), createPO)

// Enviar a aprobación (instanciar pasos)
router.post('/:id', requireAuth, requirePermission('po.submit'), submitPO)

// Listar pasos de aprobación de una OC
router.get('/:id/steps', requireAuth, requirePermission('po.read'), listSteps)

// Listar logs de aprobación de una OC
router.get('/:id/logs', requireAuth, requirePermission('po.read'), listLogs)

// Archivos de una OC
router.get('/:id/files', requireAuth, requirePermission('po.read'), listFiles)
router.post('/:id/files', requireAuth, requirePermission('po.attach'), upload.single('file'), uploadFile)
router.get('/:id/files/:fileId', requireAuth, requirePermission('po.read'), downloadFile)
router.delete('/:id/files/:fileId', requireAuth, requirePermission('po.attach'), deleteFile)

// Aprobar o rechazar un paso específico
router.post('/:id/steps/:order/approve', requireAuth, requirePermission('po.approve'), approveStep)
router.post('/:id/steps/:order/reject', requireAuth, requirePermission('po.reject'), rejectStep)

// Cancelar una OC
router.post('/:id/cancel', requireAuth, requirePermission('po.cancel'), cancelPO)

export default router

