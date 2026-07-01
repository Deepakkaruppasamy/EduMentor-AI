import { Router } from 'express';
import { protect, authorize } from '../middleware/auth';
import {
  getMaintenanceStatus,
  getMaintenanceSettings,
  updateMaintenance
} from '../controllers/maintenance.controller';

const router = Router();

// Publicly accessible status check endpoint
router.get('/status', getMaintenanceStatus);

// Admin-only management endpoints
router.get('/', protect, authorize('admin'), getMaintenanceSettings);
router.put('/', protect, authorize('admin'), updateMaintenance);

export default router;
