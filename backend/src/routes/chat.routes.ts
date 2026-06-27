import { Router } from 'express';
import { queryChat, queryChatStream, getChatHistory, getChatById, deleteChat, renameChat, explainMessage } from '../controllers/chat.controller';
import { queryChatMultilingual, queryChatStreamMultilingual } from '../controllers/chat-multilingual.controller';
import { protect } from '../middleware/auth';

const router = Router();

router.post('/query', protect, queryChat);
router.post('/query-stream', protect, queryChatStream);
router.post('/query-multilingual', protect, queryChatMultilingual);
router.post('/query-stream-multilingual', protect, queryChatStreamMultilingual);
router.get('/history', protect, getChatHistory);
router.get('/:id', protect, getChatById);
router.put('/:id/rename', protect, renameChat);
router.delete('/:id', protect, deleteChat);
router.post('/:id/message/:messageIndex/explain', protect, explainMessage);

export default router;
