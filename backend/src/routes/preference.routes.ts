import { Router } from 'express';
import { protect } from '../middleware/auth';
import {
  getPreferences,
  updatePreferences,
  resetDashboardLayout,
} from '../controllers/preference.controller';

const router = Router();

router.use(protect);

router.get('/', getPreferences);
router.put('/', updatePreferences);
router.post('/reset-dashboard', resetDashboardLayout);

export default router;
