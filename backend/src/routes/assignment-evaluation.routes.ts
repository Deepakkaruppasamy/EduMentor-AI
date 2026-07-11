import { Router } from 'express';
import { upload } from '../middleware/upload';
import { protect } from '../middleware/auth';
import {
  evaluateAssignment,
  getHistory,
  getById,
} from '../controllers/assignment-evaluation.controller';

const router = Router();

// Evaluate an assignment document (Requires file upload)
router.post('/evaluate', protect, upload.single('file'), evaluateAssignment);

// Get list of assignment evaluation histories (Filterable by courseId)
router.get('/', protect, getHistory);
router.get('/history', protect, getHistory);

// Get details of a specific evaluation
router.get('/:id', protect, getById);

export default router;
