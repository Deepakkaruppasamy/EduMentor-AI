import { Router } from 'express';
import { protect } from '../middleware/auth';
import { analyzeResearch, getResearchHistory, deleteResearchHistory } from '../controllers/research.controller';

const router = Router();
router.use(protect);

router.post('/analyze', analyzeResearch);
router.get('/history', getResearchHistory);
router.delete('/history/:id', deleteResearchHistory);

export default router;
