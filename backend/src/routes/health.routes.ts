import { Router } from 'express';
import { protect, authorize } from '../middleware/auth';
import { getSystemHealth } from '../controllers/health.controller';

const router = Router();

// System health check routes (admin-only)
router.get('/system', protect, authorize('admin'), getSystemHealth);

export default router;
