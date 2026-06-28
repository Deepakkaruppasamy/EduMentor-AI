import { Router } from 'express';
import { protect } from '../middleware/auth';
import { globalSearch } from '../controllers/search.controller';

const router = Router();
router.use(protect);

router.get('/', globalSearch);

export default router;
