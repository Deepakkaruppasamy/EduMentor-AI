import { Router } from 'express';
import { getRecommendations, generatePlan } from '../controllers/recommendation.controller';
import { protect } from '../middleware/auth';

const router = Router();

router.get('/', protect, getRecommendations);
router.post('/generate-plan', protect, generatePlan);

export default router;
