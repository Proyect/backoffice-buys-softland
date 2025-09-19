import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';
import { getConfig } from '../controllers/config.controller.js';

const router = Router();

router.get('/health', getHealth);
router.get('/api/config', getConfig);

export default router;
