import { Router } from 'express';
import { protect, authorize } from '../middleware/auth';
import {
  getSecurityOverview,
  getPrivacySettings,
  updatePrivacySettings,
  requestDataDownload,
  requestAccountDeletion,
  getAdminSecurityStats
} from '../controllers/privacy.controller';

const router = Router();

// Protected user-specific privacy & security routes
router.get('/security', protect, getSecurityOverview);
router.get('/settings', protect, getPrivacySettings);
router.put('/settings', protect, updatePrivacySettings);
router.post('/data-download', protect, requestDataDownload);
router.post('/delete-account', protect, requestAccountDeletion);

// Admin-only global security overview
router.get('/admin-stats', protect, authorize('admin'), getAdminSecurityStats);

export default router;
