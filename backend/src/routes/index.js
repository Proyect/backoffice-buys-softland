import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';
import { getConfig } from '../controllers/config.controller.js';
import { login, refreshToken, logout, me } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import suppliersRoutes from './suppliers.routes.js';
import poRoutes from './po.routes.js';

const router = Router();

router.get('/health', getHealth);
router.get('/api/config', getConfig);

// Auth
router.post('/auth/login', login);
router.post('/auth/refresh', refreshToken);
router.post('/auth/logout', logout);
router.get('/auth/me', requireAuth, me);

// API domain routes
router.use('/api/suppliers', suppliersRoutes);
router.use('/api/po', poRoutes);

export default router;
