import { Router } from 'express';
import {
  getDashboardStats,
  getStudentProgress,
  getFacultyGradebook,
  getLeaderboard,
  getStudentsAtRisk,
  sendIntervention,
  getWeeklyDigest,
} from '../controllers/analytics.controller';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.get('/dashboard', protect, authorize('admin', 'faculty'), getDashboardStats);
router.get('/progress', protect, getStudentProgress);
router.get('/weekly-digest', protect, getWeeklyDigest);
router.get('/faculty/gradebook', protect, authorize('admin', 'faculty'), getFacultyGradebook);
router.get('/leaderboard', protect, getLeaderboard);

// At-risk intervention routes
router.get('/faculty/at-risk', protect, authorize('admin', 'faculty'), getStudentsAtRisk);
router.post('/faculty/intervene', protect, authorize('admin', 'faculty'), sendIntervention);

export default router;
