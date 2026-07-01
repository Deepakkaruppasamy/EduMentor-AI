import { Router } from 'express';
import { protect, authorize } from '../middleware/auth';
import {
  getMySessions,
  revokeSession,
  revokeAllOtherSessions,
  getAdminSessions
} from '../controllers/sessions.controller';

const router = Router();

// Protected session management routes
router.get('/', protect, getMySessions);
router.delete('/all-other', protect, revokeAllOtherSessions);
router.delete('/:id', protect, revokeSession);

// Admin-only session overview
router.get('/admin', protect, authorize('admin'), getAdminSessions);

export default router;
