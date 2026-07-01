import { Router } from 'express';
import { protect, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';
import {
  analyzeDocument,
  getReports,
  getAnalytics,
  getReportById,
  deleteReport,
} from '../controllers/plagiarism.controller';

const router = Router();

// Analyze a document for plagiarism (all authenticated users)
router.post('/analyze', protect, upload.single('file'), analyzeDocument);

// Get all reports (students see own, faculty/admin see all)
router.get('/', protect, getReports);

// Analytics — admin only
router.get('/analytics', protect, authorize('admin'), getAnalytics);

// Get specific report by ID
router.get('/:id', protect, getReportById);

// Delete a report — admin only
router.delete('/:id', protect, authorize('admin'), deleteReport);

export default router;
