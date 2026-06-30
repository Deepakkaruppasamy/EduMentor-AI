import { Router } from 'express';
import { protect } from '../middleware/auth';
import { analyzeResearch, getResearchHistory, deleteResearchHistory, researchUpload } from '../controllers/research.controller';

const router = Router();
router.use(protect);

router.post('/analyze', researchUpload.array('files'), analyzeResearch);
router.get('/history', getResearchHistory);
router.delete('/history/:id', deleteResearchHistory);

export default router;
