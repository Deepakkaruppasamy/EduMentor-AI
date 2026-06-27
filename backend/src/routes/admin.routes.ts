import { Router } from 'express';
import {
  createUser,
  bulkCreateUsers,
  editUser,
  toggleUserStatus,
  forceResetPassword,
  deleteUser,
  getUsersList,
  getAuditLogs,
  getAdminAnalytics
} from '../controllers/admin.controller';
import { protect, authorize } from '../middleware/auth';

const router = Router();

// Apply protection and authorization to all routes in this router
router.use(protect);
router.use(authorize('admin'));

router.post('/users', createUser);
router.post('/users/bulk', bulkCreateUsers);
router.get('/users', getUsersList);
router.put('/users/:id', editUser);
router.put('/users/:id/status', toggleUserStatus);
router.post('/users/:id/reset-password', forceResetPassword);
router.delete('/users/:id', deleteUser);

router.get('/audit-logs', getAuditLogs);
router.get('/analytics', getAdminAnalytics);

export default router;
