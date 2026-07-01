import { Router } from 'express';
import { protect } from '../middleware/auth';
import { assistantChat } from '../controllers/assistant.controller';

const router = Router();

// Platform-wide AI assistant chat (all authenticated users)
router.post('/chat', protect, assistantChat);

export default router;
