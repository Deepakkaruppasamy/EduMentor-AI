import { Router } from 'express';
import { protect } from '../middleware/auth';
import { generateNote, getMyNotes, deleteNote } from '../controllers/notes.controller';

const router = Router();
router.use(protect);

router.post('/generate', generateNote);
router.get('/my', getMyNotes);
router.delete('/:id', deleteNote);

export default router;
