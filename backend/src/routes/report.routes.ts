import { Router } from 'express';
import { generateAIReport } from '../controllers/report.controller';
import { protect } from '../middleware/auth';

const router = Router();

router.post('/generate', protect, generateAIReport);

export default router;
