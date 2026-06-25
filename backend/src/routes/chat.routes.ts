import { Router } from 'express';
import { queryChat, queryChatStream, getChatHistory, getChatById, deleteChat, renameChat } from '../controllers/chat.controller';
import { protect } from '../middleware/auth';

const router = Router();

router.post('/query', protect, queryChat);
router.post('/query-stream', protect, queryChatStream);
router.get('/history', protect, getChatHistory);
router.get('/:id', protect, getChatById);
router.put('/:id/rename', protect, renameChat);
router.delete('/:id', protect, deleteChat);

export default router;
