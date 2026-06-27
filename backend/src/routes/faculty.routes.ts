import { Router } from 'express';
import { generateFacultyMaterial } from '../controllers/faculty.controller';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.post('/assistant/generate', protect, authorize('faculty', 'admin'), generateFacultyMaterial);

export default router;
