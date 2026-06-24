import { Router } from 'express';
import { uploadDocument, getDocuments, deleteDocument } from '../controllers/document.controller';
import { protect, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.post('/upload', protect, authorize('faculty', 'admin'), upload.single('file'), uploadDocument);
router.get('/all', protect, getDocuments);
router.delete('/:id', protect, authorize('faculty', 'admin'), deleteDocument);

export default router;
