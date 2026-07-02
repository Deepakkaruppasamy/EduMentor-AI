import { Router } from 'express';
import { protect, authorize } from '../middleware/auth';
import { getMyTimeline, getAllTimeline, getModules, exportTimeline } from '../controllers/activity.controller';

const router = Router();

// Protected activity routes
router.get('/', protect, getMyTimeline);
router.get('/modules', protect, getModules);
router.get('/export', protect, exportTimeline);
router.get('/all', protect, authorize('admin'), getAllTimeline);

export default router;
