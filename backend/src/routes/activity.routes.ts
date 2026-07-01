import { Router } from 'express';
import { protect, authorize } from '../middleware/auth';
import { getMyTimeline, getAllTimeline, getModules } from '../controllers/activity.controller';

const router = Router();

// Protected activity routes
router.get('/', protect, getMyTimeline);
router.get('/modules', protect, getModules);
router.get('/all', protect, authorize('admin'), getAllTimeline);

export default router;
