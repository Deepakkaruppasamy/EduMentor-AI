import { Router } from 'express';
import { protect } from '../middleware/auth';
import { generateStudyPlan, getMyPlans, deleteStudyPlan } from '../controllers/studyPlanner.controller';

const router = Router();
router.use(protect);

router.post('/generate', generateStudyPlan);
router.get('/my', getMyPlans);
router.delete('/:id', deleteStudyPlan);

export default router;
