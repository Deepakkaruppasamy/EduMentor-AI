import { Router } from 'express';
import { protect, authorize } from '../middleware/auth';
import {
  submitFeedback,
  getMyFeedback,
  getFacultyFeedback,
  getAllFeedback,
  getFeedbackAnalytics,
  updateFeedbackStatus,
  deleteFeedback,
} from '../controllers/feedback.controller';

const router = Router();

// Apply auth globally
router.use(protect);

// ── Student Routes ────────────────────────────────────────────
router.post('/', authorize('student'), submitFeedback);
router.get('/my', authorize('student'), getMyFeedback);

// ── Faculty Routes ────────────────────────────────────────────
router.get('/faculty/received', authorize('faculty', 'admin'), getFacultyFeedback);

// ── Admin Routes ──────────────────────────────────────────────
router.get('/all', authorize('admin'), getAllFeedback);
router.get('/analytics', authorize('admin'), getFeedbackAnalytics);
router.put('/:id', authorize('admin'), updateFeedbackStatus);
router.delete('/:id', authorize('admin'), deleteFeedback);

export default router;
