import { Router } from 'express';
import { protect, authorize } from '../middleware/auth';
import { getSystemHealth, getHealthAlerts, getHealthHistory } from '../controllers/health.controller';
import { startBackgroundMetricsPolling } from '../controllers/health.controller';

const router = Router();

// Start the background 30s metrics polling when this router is first loaded
startBackgroundMetricsPolling();

// System health check routes (admin-only)
router.get('/system', protect, authorize('admin'), getSystemHealth);
router.get('/alerts', protect, authorize('admin'), getHealthAlerts);
router.get('/history', protect, authorize('admin'), getHealthHistory);

export default router;
