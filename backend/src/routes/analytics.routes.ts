import { Router } from 'express';
import { getDashboardStats, getStudentProgress, getFacultyGradebook, getLeaderboard } from '../controllers/analytics.controller';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.get('/dashboard', protect, authorize('admin', 'faculty'), getDashboardStats);
router.get('/progress', protect, getStudentProgress);
router.get('/faculty/gradebook', protect, authorize('admin', 'faculty'), getFacultyGradebook);
router.get('/leaderboard', protect, getLeaderboard);

export default router;
