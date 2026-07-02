import { Router } from 'express';
import { protect } from '../middleware/auth';
import {
  recordView,
  getViewHistory,
  togglePinItem,
  deleteViewedItem,
  clearViewHistory,
} from '../controllers/recently-viewed.controller';

const router = Router();

router.use(protect);

router.post('/', recordView);
router.get('/', getViewHistory);
router.put('/:id/pin', togglePinItem);
router.delete('/:id', deleteViewedItem);
router.delete('/', clearViewHistory);

export default router;
